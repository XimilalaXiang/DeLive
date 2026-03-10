/**
 * 本地 OpenAI-compatible ASR Provider
 * 基于 /v1/audio/transcriptions 接口实现渐进式转录
 */

import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import type { OpenAITranscriptionResponse } from '../../types/asr/vendors/localOpenAI'
import {
  LOCAL_OPENAI_DEFAULT_BASE_URL,
  LOCAL_OPENAI_DEFAULT_MODEL,
} from '../../types/asr/vendors/localOpenAI'
import { getMediaRecorderChunkDurationMs } from '../../utils/rollingAudioBuffer'

const LOCAL_OPENAI_TRANSCRIBE_INTERVAL_MS = 1200
const LOCAL_OPENAI_MAX_WINDOW_MS = 45000
const LOCAL_OPENAI_MEDIA_CHUNK_MS = 100

export class LocalOpenAIProvider extends WindowedBatchTranscriptionProvider<Blob> {
  readonly id: ASRVendor = 'local_openai' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'local_openai' as ASRVendor,
    name: '本地 OpenAI 兼容',
    description: '连接本地 OpenAI-compatible ASR 服务（如 Ollama/Whisper 兼容接口）',
    type: 'local',
    supportsStreaming: false,
    capabilities: {
      audioInputMode: 'media-recorder',
      audioProfile: {
        payloadFormat: 'webm-opus',
        preferredChunkMs: 100,
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
      local: {
        connectionMode: 'service',
        supportsServiceDiscovery: true,
        supportsModelDiscovery: true,
        supportsModelInstall: true,
      },
    },
    requiredConfigKeys: ['baseUrl', 'model'],
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
    website: 'https://platform.openai.com/docs/api-reference/audio',
    docsUrl: 'https://platform.openai.com/docs/api-reference/audio/createTranscription',
    configFields: [
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'http://127.0.0.1:11434',
        defaultValue: LOCAL_OPENAI_DEFAULT_BASE_URL,
        description: '本地 OpenAI-compatible 服务地址',
      },
      {
        key: 'model',
        label: '模型',
        type: 'text',
        required: true,
        placeholder: 'whisper',
        defaultValue: LOCAL_OPENAI_DEFAULT_MODEL,
        description: '用于转录的模型名称',
      },
      {
        key: 'apiKey',
        label: 'API Key (可选)',
        type: 'password',
        required: false,
        placeholder: '本地服务无需可留空',
      },
      {
        key: 'languageHints',
        label: '语言提示',
        type: 'text',
        required: false,
        placeholder: 'zh, en',
        description: '可选，使用逗号分隔',
      },
    ],
  }

  constructor() {
    super({
      maxWindowMs: LOCAL_OPENAI_MAX_WINDOW_MS,
      transcribeIntervalMs: LOCAL_OPENAI_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'debounce',
    })
  }

  async connect(config: ProviderConfig): Promise<void> {
    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const model = this.normalizeModel(config.model)

    if (!baseUrl || !model) {
      this.emitError(this.createError('MISSING_CONFIG', '请提供 Base URL 和模型名称'))
      return
    }

    try {
      new URL(baseUrl)
    } catch {
      this.emitError(this.createError('INVALID_BASE_URL', 'Base URL 格式不正确'))
      return
    }

    this.beginWindowedSession({
      ...config,
      baseUrl,
      model,
      apiKey: this.normalizeOptional(config.apiKey),
    })
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure(): boolean {
    return false
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    return {
      chunk: data instanceof Blob ? data : new Blob([data], { type: 'audio/webm' }),
      durationMs: getMediaRecorderChunkDurationMs(LOCAL_OPENAI_MEDIA_CHUNK_MS),
    }
  }

  protected async transcribeWindow(chunks: Blob[], config: ProviderConfig): Promise<string> {
    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const model = this.normalizeModel(config.model)
    const apiKey = this.normalizeOptional(config.apiKey)

    const endpoint = `${baseUrl}/v1/audio/transcriptions`
    const fileBlob = this.buildAudioBlob(chunks)
    const formData = new FormData()
    formData.append('file', fileBlob, this.getAudioFileName(fileBlob))
    formData.append('model', model)

    const language = this.getLanguageHint(config)
    if (language) {
      formData.append('language', language)
    }

    const headers: HeadersInit = {}
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const result = await response.json() as OpenAITranscriptionResponse
    return typeof result.text === 'string' ? result.text : ''
  }

  private buildAudioBlob(chunks: Blob[]): Blob {
    const mimeType = chunks.find(chunk => !!chunk.type)?.type || 'audio/webm'
    return new Blob(chunks, { type: mimeType })
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

  private normalizeBaseUrl(value: unknown): string {
    if (typeof value !== 'string') return LOCAL_OPENAI_DEFAULT_BASE_URL
    const trimmed = value.trim() || LOCAL_OPENAI_DEFAULT_BASE_URL
    return trimmed.replace(/\/+$/, '')
  }

  private normalizeModel(value: unknown): string {
    if (typeof value !== 'string') return LOCAL_OPENAI_DEFAULT_MODEL
    return value.trim() || LOCAL_OPENAI_DEFAULT_MODEL
  }

  private normalizeOptional(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
