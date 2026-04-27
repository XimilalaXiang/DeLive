import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import { createBundledRuntimeManager } from '../../utils/localRuntimeManager'
import { getPcmChunkDurationMs, isPcm16Silent } from '../../utils/rollingAudioBuffer'
import { buildPcmWavBlob } from '../../utils/pcmWav'
import type { TimestampedWord } from '../../utils/hypothesisBuffer'

const WHISPER_CPP_RUNTIME_ID = 'whisper_cpp'
const WHISPER_CPP_DEFAULT_PORT = 8177
const WHISPER_CPP_SAMPLE_RATE = 16000
const WHISPER_CPP_CHANNELS = 1
const WHISPER_CPP_BITS_PER_SAMPLE = 16
const WHISPER_CPP_TRANSCRIBE_INTERVAL_MS = 1500
const WHISPER_CPP_MAX_WINDOW_MS = 45000

export class WhisperCppRuntimeProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  readonly id: ASRVendor = 'local_whisper_cpp' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'local_whisper_cpp' as ASRVendor,
    name: '本地 whisper.cpp',
    description: '通过 Electron 启动本地 whisper.cpp server，直接使用本地模型进行转录',
    type: 'local',
    supportsStreaming: false,
    capabilities: {
      audioInputMode: 'pcm16',
      audioProfile: {
        payloadFormat: 'pcm16',
        sampleRateHz: 16000,
        channels: 1,
        preferredChunkMs: 1500,
      },
      transport: {
        type: 'local-runtime',
        captureRestartStrategy: 'reuse-session',
      },
      prompting: {
        supportsLanguageHints: true,
      },
      workloads: {
        liveCapture: {
          availability: 'implemented',
          executionMode: 'local-runtime',
          inputSources: ['system-audio'],
          acceptedFileKinds: ['audio'],
        },
        fileTranscription: {
          availability: 'compatible',
          executionMode: 'local-runtime',
          inputSources: ['file'],
          acceptedFileKinds: ['audio', 'video'],
        },
      },
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

  constructor() {
    super({
      maxWindowMs: WHISPER_CPP_MAX_WINDOW_MS,
      transcribeIntervalMs: WHISPER_CPP_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'interval',
    })
  }

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
      this.beginWindowedSession({
        ...config,
        baseUrl: snapshot.baseUrl.replace(/\/+$/, ''),
        modelPath,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '本地 whisper.cpp runtime 启动失败'
      this.emitError(this.createError('RUNTIME_START_FAILED', message))
    }
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure(): boolean {
    return false
  }

  protected shouldRetryAfterNonFinalTranscriptionFailure(): boolean {
    return true
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data
    if (isPcm16Silent(buffer)) return null
    return {
      chunk: buffer,
      durationMs: getPcmChunkDurationMs(
        buffer,
        WHISPER_CPP_SAMPLE_RATE,
        WHISPER_CPP_CHANNELS,
        WHISPER_CPP_BITS_PER_SAMPLE,
      ),
    }
  }

  protected isWindowSilent(chunks: ArrayBuffer[]): boolean {
    return chunks.every(chunk => isPcm16Silent(chunk))
  }

  protected async transcribeWindow(chunks: ArrayBuffer[], config: ProviderConfig, prompt?: string): Promise<TimestampedWord[]> {
    const baseUrl = typeof config.baseUrl === 'string'
      ? config.baseUrl.replace(/\/+$/, '')
      : ''
    if (!baseUrl) {
      throw new Error('本地 whisper.cpp runtime 地址无效')
    }

    const fileBlob = buildPcmWavBlob(chunks, {
      sampleRate: WHISPER_CPP_SAMPLE_RATE,
      channels: WHISPER_CPP_CHANNELS,
      bitsPerSample: WHISPER_CPP_BITS_PER_SAMPLE,
    })
    const formData = new FormData()
    formData.append('file', fileBlob, this.getAudioFileName(fileBlob))
    formData.append('response_format', 'json')

    const language = this.getLanguageHint(config)
    if (language) {
      formData.append('language', language)
    }

    if (prompt) {
      formData.append('prompt', prompt)
    }

    const response = await fetch(`${baseUrl}/inference`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const result = await response.json() as { text?: string }
    const text = typeof result.text === 'string' ? result.text.trim() : ''
    if (!text) return []
    return [{ start: 0, end: 0, text }]
  }

  private getAudioFileName(blob: Blob): string {
    if (blob.type.includes('mp4')) return 'audio.mp4'
    if (blob.type.includes('wav')) return 'audio.wav'
    return 'audio.webm'
  }

  private getLanguageHint(config: ProviderConfig): string | undefined {
    if (Array.isArray(config.languageHints)) {
      const first = config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
      if (first) return first.trim()
    }

    return undefined
  }

  private normalizeOptional(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
