import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import {
  SILICONFLOW_DEFAULT_BASE_URL,
  SILICONFLOW_DEFAULT_MODEL,
  SILICONFLOW_TRANSCRIPTION_MODELS,
} from '../../types/asr/vendors/siliconflow'
import { getPcmChunkDurationMs, isPcm16Silent } from '../../utils/rollingAudioBuffer'
import { buildPcmWavBlob } from '../../utils/pcmWav'
import { transcribeSiliconFlowAudio } from '../../utils/siliconflow'
import type { TimestampedWord } from '../../utils/hypothesisBuffer'

const SILICONFLOW_SAMPLE_RATE = 16000
const SILICONFLOW_CHANNELS = 1
const SILICONFLOW_BITS_PER_SAMPLE = 16
const SILICONFLOW_TRANSCRIBE_INTERVAL_MS = 1500
const SILICONFLOW_MAX_WINDOW_MS = 45000

export class SiliconFlowProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  readonly id: ASRVendor = 'siliconflow' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'siliconflow' as ASRVendor,
    name: '硅基流动',
    description: '硅基流动云端语音转录；SenseVoice / TeleSpeech 为专用 ASR，Qwen Omni 为多模态转写',
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
    website: 'https://cloud.siliconflow.cn',
    docsUrl: 'https://docs.siliconflow.cn/cn/api-reference/audio/create-audio-transcriptions',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: '从硅基流动控制台获取 API Key。',
      },
      {
        key: 'model',
        label: '模型',
        type: 'select',
        required: false,
        defaultValue: SILICONFLOW_DEFAULT_MODEL,
        options: SILICONFLOW_TRANSCRIPTION_MODELS.map((item) => ({
          value: item.value,
          label: item.label,
        })),
        description: 'Qwen Omni 走多模态 chat/completions，SenseVoice / TeleSpeech 走专用 ASR 接口。',
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
      maxWindowMs: SILICONFLOW_MAX_WINDOW_MS,
      transcribeIntervalMs: SILICONFLOW_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'interval',
    })
  }

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = this.normalizeOptional(config.apiKey)
    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供硅基流动 API Key'))
      return
    }

    this.beginWindowedSession({
      ...config,
      apiKey,
      model: this.normalizeModel(config.model),
      baseUrl: SILICONFLOW_DEFAULT_BASE_URL,
    })
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data
    return {
      chunk: buffer,
      durationMs: getPcmChunkDurationMs(
        buffer,
        SILICONFLOW_SAMPLE_RATE,
        SILICONFLOW_CHANNELS,
        SILICONFLOW_BITS_PER_SAMPLE,
      ),
    }
  }

  protected isWindowSilent(chunks: ArrayBuffer[]): boolean {
    return chunks.every(chunk => isPcm16Silent(chunk))
  }

  protected async transcribeWindow(chunks: ArrayBuffer[], config: ProviderConfig, _prompt?: string): Promise<TimestampedWord[]> {
    const apiKey = this.normalizeOptional(config.apiKey)
    if (!apiKey) {
      throw new Error('硅基流动 API Key 缺失')
    }

    const text = await transcribeSiliconFlowAudio({
      apiKey,
      model: this.normalizeModel(config.model),
      wavBlob: buildPcmWavBlob(chunks, {
        sampleRate: SILICONFLOW_SAMPLE_RATE,
        channels: SILICONFLOW_CHANNELS,
        bitsPerSample: SILICONFLOW_BITS_PER_SAMPLE,
      }),
      language: this.getLanguageHint(config),
    })
    if (!text.trim()) return []
    return [{ start: 0, end: 0, text: text.trim() }]
  }

  private getLanguageHint(config: ProviderConfig): string | undefined {
    if (Array.isArray(config.languageHints)) {
      const first = config.languageHints.find(item => typeof item === 'string' && item.trim().length > 0)
      if (first) return first.trim()
    }

    return undefined
  }

  private normalizeModel(value: unknown): string {
    if (typeof value !== 'string') return SILICONFLOW_DEFAULT_MODEL
    return value.trim() || SILICONFLOW_DEFAULT_MODEL
  }

  private normalizeOptional(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
