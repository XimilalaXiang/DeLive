import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import { createBundledRuntimeManager } from '../../utils/localRuntimeManager'

const WHISPER_CPP_RUNTIME_ID = 'whisper_cpp'
const WHISPER_CPP_DEFAULT_PORT = 8177
const WHISPER_CPP_SAMPLE_RATE = 16000
const WHISPER_CPP_CHANNELS = 1
const WHISPER_CPP_BITS_PER_SAMPLE = 16
const WHISPER_CPP_TRANSCRIBE_INTERVAL_MS = 1500

export class WhisperCppRuntimeProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'local_whisper_cpp' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'local_whisper_cpp' as ASRVendor,
    name: '本地 whisper.cpp',
    description: '通过 Electron 启动本地 whisper.cpp server，直接使用本地模型进行转录',
    type: 'local',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'pcm16',
      supportsConfigTest: true,
      local: {
        connectionMode: 'runtime',
        runtimeId: WHISPER_CPP_RUNTIME_ID,
        supportsModelDiscovery: true,
        supportsManualModelImport: true,
      },
    },
    requiredConfigKeys: ['modelPath'],
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
    website: 'https://github.com/ggml-org/whisper.cpp',
    docsUrl: 'https://github.com/ggml-org/whisper.cpp/tree/master/examples/server',
    configFields: [
      {
        key: 'binaryPath',
        label: 'Runtime Binary Path',
        type: 'text',
        required: false,
        placeholder: '可选：whisper-server 可执行文件路径',
        description: '如未打包内置 binary，可手动填写 whisper-server 可执行文件路径。',
      },
      {
        key: 'modelPath',
        label: '模型文件路径',
        type: 'text',
        required: true,
        placeholder: '例如：C:\\models\\ggml-base.bin',
        description: 'whisper.cpp 使用的本地模型文件绝对路径。',
      },
      {
        key: 'port',
        label: 'Runtime Port',
        type: 'number',
        required: false,
        placeholder: String(WHISPER_CPP_DEFAULT_PORT),
        defaultValue: WHISPER_CPP_DEFAULT_PORT,
        description: '本地 runtime 服务端口，默认 8177。',
      },
      {
        key: 'languageHints',
        label: '语言提示',
        type: 'text',
        required: false,
        placeholder: 'zh, en',
        description: '可选，使用逗号分隔。',
      },
    ],
  }

  private chunks: ArrayBuffer[] = []
  private transcribeLoop: ReturnType<typeof setInterval> | null = null
  private inFlight = false
  private pendingFinal = false
  private hasPendingAudio = false
  private lastTranscript = ''

  async connect(config: ProviderConfig): Promise<void> {
    if (!window.electronAPI?.localRuntimeStart) {
      this.emitError(this.createError('RUNTIME_UNAVAILABLE', '当前不在 Electron 环境中，无法启动本地 whisper.cpp runtime'))
      return
    }

    const modelPath = this.normalizeOptional(config.modelPath)
    if (!modelPath) {
      this.emitError(this.createError('MISSING_MODEL_PATH', '请提供 whisper.cpp 模型文件路径'))
      return
    }

    try {
      const runtimeManager = createBundledRuntimeManager(WHISPER_CPP_RUNTIME_ID)
      const snapshot = await runtimeManager.start(config as ProviderConfig)
      this._config = {
        ...config,
        baseUrl: snapshot.baseUrl.replace(/\/+$/, ''),
        modelPath,
      }
      this.resetSession()
      this.setState('connected')
    } catch (error) {
      const message = error instanceof Error ? error.message : '本地 whisper.cpp runtime 启动失败'
      this.emitError(this.createError('RUNTIME_START_FAILED', message))
    }
  }

  async disconnect(): Promise<void> {
    this.clearLoop()

    if (this.chunks.length > 0) {
      this.pendingFinal = true
      await this.transcribe(true)
    } else {
      this.setState('idle')
      this.resetSession()
    }
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    if (!this._config) {
      console.warn('[WhisperCppRuntimeProvider] 未连接，忽略音频数据')
      return
    }

    this.setState('recording')
    if (data instanceof Blob) {
      void data.arrayBuffer().then((buffer) => {
        this.chunks.push(buffer)
        this.hasPendingAudio = true
        this.ensureTranscribeLoop()
      }).catch((error) => {
        console.error('[WhisperCppRuntimeProvider] 读取 Blob 音频失败:', error)
      })
      return
    }

    this.chunks.push(data)
    this.hasPendingAudio = true
    this.ensureTranscribeLoop()
  }

  private ensureTranscribeLoop(): void {
    if (this.transcribeLoop) {
      return
    }

    this.transcribeLoop = setInterval(() => {
      if (this.inFlight || !this.hasPendingAudio || this.pendingFinal) {
        return
      }
      void this.transcribe(false)
    }, WHISPER_CPP_TRANSCRIBE_INTERVAL_MS)
  }

  private clearLoop(): void {
    if (this.transcribeLoop) {
      clearInterval(this.transcribeLoop)
      this.transcribeLoop = null
    }
  }

  private async transcribe(isFinal: boolean): Promise<void> {
    if (!this._config || this.chunks.length === 0) {
      return
    }

    if (this.inFlight) {
      if (isFinal) this.pendingFinal = true
      return
    }

    this.inFlight = true
    this.hasPendingAudio = false
    try {
      const baseUrl = typeof this._config.baseUrl === 'string' ? this._config.baseUrl.replace(/\/+$/, '') : ''
      if (!baseUrl) {
        throw new Error('本地 whisper.cpp runtime 地址无效')
      }

      const endpoint = `${baseUrl}/inference`
      const formData = new FormData()
      const fileBlob = this.buildWavBlob()
      formData.append('file', fileBlob, this.getAudioFileName(fileBlob))
      formData.append('response_format', 'json')

      const language = this.getLanguageHint()
      if (language) {
        formData.append('language', language)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      const result = await response.json() as { text?: string }
      const transcriptText = typeof result.text === 'string' ? result.text : ''

      if (transcriptText && transcriptText !== this.lastTranscript) {
        this.lastTranscript = transcriptText
        this.emitPartial(transcriptText)
      }

      if (isFinal) {
        this.emitFinal(this.lastTranscript || transcriptText)
        this.emitFinished()
      }
    } catch (error) {
      console.error('[WhisperCppRuntimeProvider] 转录失败:', error)
      const message = error instanceof Error ? error.message : '本地 whisper.cpp 转录失败'
      if (isFinal) {
        this.emitError(this.createError('TRANSCRIPTION_ERROR', message))
      } else {
        this.hasPendingAudio = true
      }
    } finally {
      this.inFlight = false
      if (this.pendingFinal && !isFinal) {
        this.pendingFinal = false
        await this.transcribe(true)
        return
      }

      if (isFinal) {
        this.setState('idle')
        this.resetSession()
      }
    }
  }

  private buildWavBlob(): Blob {
    const pcmSize = this.chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
    const wavHeader = new ArrayBuffer(44)
    const view = new DataView(wavHeader)

    const byteRate = WHISPER_CPP_SAMPLE_RATE * WHISPER_CPP_CHANNELS * (WHISPER_CPP_BITS_PER_SAMPLE / 8)
    const blockAlign = WHISPER_CPP_CHANNELS * (WHISPER_CPP_BITS_PER_SAMPLE / 8)

    this.writeAscii(view, 0, 'RIFF')
    view.setUint32(4, 36 + pcmSize, true)
    this.writeAscii(view, 8, 'WAVE')
    this.writeAscii(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, WHISPER_CPP_CHANNELS, true)
    view.setUint32(24, WHISPER_CPP_SAMPLE_RATE, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, WHISPER_CPP_BITS_PER_SAMPLE, true)
    this.writeAscii(view, 36, 'data')
    view.setUint32(40, pcmSize, true)

    return new Blob([wavHeader, ...this.chunks], { type: 'audio/wav' })
  }

  private getAudioFileName(blob: Blob): string {
    if (blob.type.includes('mp4')) return 'audio.mp4'
    if (blob.type.includes('wav')) return 'audio.wav'
    return 'audio.webm'
  }

  private getLanguageHint(): string | undefined {
    if (!this._config) return undefined

    if (Array.isArray(this._config.languageHints)) {
      const first = this._config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
      if (first) return first.trim()
    }

    return undefined
  }

  private normalizeOptional(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private writeAscii(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  private resetSession(): void {
    this.clearLoop()
    this.chunks = []
    this.inFlight = false
    this.pendingFinal = false
    this.hasPendingAudio = false
    this.lastTranscript = ''
  }
}
