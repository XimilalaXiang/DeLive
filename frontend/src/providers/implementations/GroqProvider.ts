import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import type { GroqTranscriptionResponse } from '../../types/asr/vendors/groq'
import {
  GROQ_DEFAULT_BASE_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_TRANSCRIPTION_MODELS,
} from '../../types/asr/vendors/groq'

const GROQ_SAMPLE_RATE = 16000
const GROQ_CHANNELS = 1
const GROQ_BITS_PER_SAMPLE = 16
const GROQ_TRANSCRIBE_INTERVAL_MS = 1500

export class GroqProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'groq' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'groq' as ASRVendor,
    name: 'Groq',
    description: 'Groq 云端语音转录，使用 Whisper 模型进行低延迟识别',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'pcm16',
      supportsConfigTest: true,
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
    website: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs/speech-to-text',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'gsk_...',
        description: '从 console.groq.com 获取 API Key。',
      },
      {
        key: 'model',
        label: '模型',
        type: 'select',
        required: false,
        defaultValue: GROQ_DEFAULT_MODEL,
        options: GROQ_TRANSCRIPTION_MODELS.map((item) => ({ value: item.value, label: item.label })),
        description: 'Groq 当前支持的语音转录模型。',
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
    const apiKey = this.normalizeOptional(config.apiKey)
    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Groq API Key'))
      return
    }

    this._config = {
      ...config,
      apiKey,
      model: this.normalizeModel(config.model),
      baseUrl: GROQ_DEFAULT_BASE_URL,
    }
    this.resetSession()
    this.setState('connected')
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
      console.warn('[GroqProvider] 未连接，忽略音频数据')
      return
    }

    this.setState('recording')
    if (data instanceof Blob) {
      void data.arrayBuffer().then((buffer) => {
        this.chunks.push(buffer)
        this.hasPendingAudio = true
        this.ensureTranscribeLoop()
      }).catch((error) => {
        console.error('[GroqProvider] 读取 Blob 音频失败:', error)
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
    }, GROQ_TRANSCRIBE_INTERVAL_MS)
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
      const apiKey = this.normalizeOptional(this._config.apiKey)
      if (!apiKey) {
        throw new Error('Groq API Key 缺失')
      }

      const formData = new FormData()
      const fileBlob = this.buildWavBlob()
      formData.append('file', fileBlob, 'audio.wav')
      formData.append('model', this.normalizeModel(this._config.model))

      const language = this.getLanguageHint()
      if (language) {
        formData.append('language', language)
      }

      const response = await fetch(`${GROQ_DEFAULT_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || `HTTP ${response.status}`)
      }

      const result = await response.json() as GroqTranscriptionResponse
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
      console.error('[GroqProvider] 转录失败:', error)
      const message = error instanceof Error ? error.message : 'Groq 转录失败'
      this.emitError(this.createError('TRANSCRIPTION_ERROR', message))
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

    const byteRate = GROQ_SAMPLE_RATE * GROQ_CHANNELS * (GROQ_BITS_PER_SAMPLE / 8)
    const blockAlign = GROQ_CHANNELS * (GROQ_BITS_PER_SAMPLE / 8)

    this.writeAscii(view, 0, 'RIFF')
    view.setUint32(4, 36 + pcmSize, true)
    this.writeAscii(view, 8, 'WAVE')
    this.writeAscii(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, GROQ_CHANNELS, true)
    view.setUint32(24, GROQ_SAMPLE_RATE, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, GROQ_BITS_PER_SAMPLE, true)
    this.writeAscii(view, 36, 'data')
    view.setUint32(40, pcmSize, true)

    return new Blob([wavHeader, ...this.chunks], { type: 'audio/wav' })
  }

  private getLanguageHint(): string | undefined {
    if (!this._config) return undefined

    if (Array.isArray(this._config.languageHints)) {
      const first = this._config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
      if (first) return first.trim()
    }

    return undefined
  }

  private normalizeModel(value: unknown): string {
    if (typeof value !== 'string') return GROQ_DEFAULT_MODEL
    return value.trim() || GROQ_DEFAULT_MODEL
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
