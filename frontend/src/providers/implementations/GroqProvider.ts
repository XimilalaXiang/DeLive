import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import type { GroqTranscriptionResponse } from '../../types/asr/vendors/groq'
import {
  GROQ_DEFAULT_BASE_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_TRANSCRIPTION_MODELS,
} from '../../types/asr/vendors/groq'
import { getPcmChunkDurationMs } from '../../utils/rollingAudioBuffer'
import { buildPcmWavBlob } from '../../utils/pcmWav'

const GROQ_SAMPLE_RATE = 16000
const GROQ_CHANNELS = 1
const GROQ_BITS_PER_SAMPLE = 16
const GROQ_TRANSCRIBE_INTERVAL_MS = 1500
const GROQ_MAX_WINDOW_MS = 45000

export class GroqProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  readonly id: ASRVendor = 'groq' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'groq' as ASRVendor,
    name: 'Groq',
    description: 'Groq 云端语音转录，当前在应用内以分段重转写方式实现准实时字幕',
    type: 'cloud',
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
        type: 'full-session-retranscription',
        captureRestartStrategy: 'reuse-session',
      },
      prompting: {
        supportsLanguageHints: true,
      },
      workloads: {
        liveCapture: {
          availability: 'implemented',
          executionMode: 'windowed-batch',
          inputSources: ['system-audio'],
          acceptedFileKinds: ['audio'],
        },
        fileTranscription: {
          availability: 'compatible',
          executionMode: 'single-request',
          inputSources: ['file'],
          acceptedFileKinds: ['audio', 'video'],
        },
      },
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

  constructor() {
    super({
      maxWindowMs: GROQ_MAX_WINDOW_MS,
      transcribeIntervalMs: GROQ_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'interval',
    })
  }

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = this.normalizeOptional(config.apiKey)
    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Groq API Key'))
      return
    }

    this.beginWindowedSession({
      ...config,
      apiKey,
      model: this.normalizeModel(config.model),
      baseUrl: GROQ_DEFAULT_BASE_URL,
    })
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data
    return {
      chunk: buffer,
      durationMs: getPcmChunkDurationMs(
        buffer,
        GROQ_SAMPLE_RATE,
        GROQ_CHANNELS,
        GROQ_BITS_PER_SAMPLE,
      ),
    }
  }

  protected async transcribeWindow(chunks: ArrayBuffer[], config: ProviderConfig): Promise<string> {
    const apiKey = this.normalizeOptional(config.apiKey)
    if (!apiKey) {
      throw new Error('Groq API Key 缺失')
    }

    const formData = new FormData()
    formData.append(
      'file',
      buildPcmWavBlob(chunks, {
        sampleRate: GROQ_SAMPLE_RATE,
        channels: GROQ_CHANNELS,
        bitsPerSample: GROQ_BITS_PER_SAMPLE,
      }),
      'audio.wav',
    )
    formData.append('model', this.normalizeModel(config.model))

    const language = this.getLanguageHint(config)
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
    return typeof result.text === 'string' ? result.text : ''
  }

  private getLanguageHint(config: ProviderConfig): string | undefined {
    if (Array.isArray(config.languageHints)) {
      const first = config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
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
}
