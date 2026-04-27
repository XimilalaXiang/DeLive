import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import type { CloudflareTranscriptionResponse } from '../../types/asr/vendors/cloudflare'
import {
  CLOUDFLARE_DEFAULT_MODEL,
  CLOUDFLARE_TRANSCRIPTION_MODELS,
} from '../../types/asr/vendors/cloudflare'
import { getPcmChunkDurationMs, isPcm16Silent } from '../../utils/rollingAudioBuffer'
import { buildPcmWavBlob } from '../../utils/pcmWav'
import type { TimestampedWord } from '../../utils/hypothesisBuffer'

const CF_SAMPLE_RATE = 16000
const CF_CHANNELS = 1
const CF_BITS_PER_SAMPLE = 16
const CF_TRANSCRIBE_INTERVAL_MS = 1500
const CF_MAX_WINDOW_MS = 45000

export class CloudflareProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  readonly id: ASRVendor = 'cloudflare' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'cloudflare' as ASRVendor,
    name: 'Cloudflare Workers AI',
    description: 'Cloudflare Workers AI 云端语音转录，基于 Whisper 模型，价格低廉且有免费额度',
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
      supportsTranslation: true,
    },
    requiredConfigKeys: ['apiToken', 'accountId'],
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
    website: 'https://dash.cloudflare.com',
    docsUrl: 'https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/',
    configFields: [
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: '',
        description: '从 Cloudflare Dashboard > Workers AI 页面创建 API Token。',
      },
      {
        key: 'accountId',
        label: 'Account ID',
        type: 'password',
        required: true,
        placeholder: '',
        description: '在 Cloudflare Dashboard > Workers AI 页面获取 Account ID。',
      },
      {
        key: 'model',
        label: '模型',
        type: 'select',
        required: false,
        defaultValue: CLOUDFLARE_DEFAULT_MODEL,
        options: CLOUDFLARE_TRANSCRIPTION_MODELS.map((item) => ({ value: item.value, label: item.label })),
        description: 'Cloudflare Workers AI 支持的语音转录模型。',
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
      maxWindowMs: CF_MAX_WINDOW_MS,
      transcribeIntervalMs: CF_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'interval',
    })
  }

  async connect(config: ProviderConfig): Promise<void> {
    const apiToken = this.normalizeOptional(config.apiToken as string)
    const accountId = this.normalizeOptional(config.accountId as string)
    if (!apiToken) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Cloudflare API Token'))
      return
    }
    if (!accountId) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Cloudflare Account ID'))
      return
    }

    this.beginWindowedSession({
      ...config,
      apiToken,
      accountId,
      model: this.normalizeModel(config.model),
    })
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data
    return {
      chunk: buffer,
      durationMs: getPcmChunkDurationMs(
        buffer,
        CF_SAMPLE_RATE,
        CF_CHANNELS,
        CF_BITS_PER_SAMPLE,
      ),
    }
  }

  protected isWindowSilent(chunks: ArrayBuffer[]): boolean {
    return chunks.every(chunk => isPcm16Silent(chunk))
  }

  protected async transcribeWindow(chunks: ArrayBuffer[], config: ProviderConfig, prompt?: string): Promise<TimestampedWord[]> {
    const apiToken = this.normalizeOptional(config.apiToken as string)
    const accountId = this.normalizeOptional(config.accountId as string)
    if (!apiToken || !accountId) {
      throw new Error('Cloudflare API Token 或 Account ID 缺失')
    }

    const model = this.normalizeModel(config.model)
    const wavBlob = buildPcmWavBlob(chunks, {
      sampleRate: CF_SAMPLE_RATE,
      channels: CF_CHANNELS,
      bitsPerSample: CF_BITS_PER_SAMPLE,
    })

    const arrayBuffer = await wavBlob.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
    )

    const body: Record<string, unknown> = { audio: base64, word_timestamps: true }

    const language = this.getLanguageHint(config)
    if (language) {
      body.language = language
    }

    if (prompt) {
      body.initial_prompt = prompt
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const result = await response.json() as CloudflareTranscriptionResponse
    if (!result.success) {
      const errorMsg = Array.isArray(result.errors) && result.errors.length > 0
        ? JSON.stringify(result.errors[0])
        : 'Unknown Cloudflare API error'
      throw new Error(errorMsg)
    }

    if (result.result?.words && result.result.words.length > 0) {
      return result.result.words.map(w => ({ start: w.start, end: w.end, text: w.word }))
    }
    if (typeof result.result?.text === 'string' && result.result.text.trim()) {
      return [{ start: 0, end: 0, text: result.result.text }]
    }
    return []
  }

  private getLanguageHint(config: ProviderConfig): string | undefined {
    if (Array.isArray(config.languageHints)) {
      const first = config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
      if (first) return first.trim()
    }
    return undefined
  }

  private normalizeModel(value: unknown): string {
    if (typeof value !== 'string') return CLOUDFLARE_DEFAULT_MODEL
    return value.trim() || CLOUDFLARE_DEFAULT_MODEL
  }

  private normalizeOptional(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
