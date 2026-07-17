/**
 * FunASR / SenseVoice 本地 ASR Provider 实现
 *
 * 通过 OpenAI 兼容的 /v1/audio/transcriptions 接口连接本地 funasr-server，
 * 支持 SenseVoice（情感+音频事件检测）、Paraformer（中文生产级）等多种模型。
 *
 * 启动：pip install funasr && funasr-server --device cuda --port 8000
 */

import { WindowedBatchTranscriptionProvider } from '../windowedBatch'
import type { ASRProviderInfo, ProviderConfig } from '../../types/asr'
import { ASRVendor } from '../../types/asr'
import type { SenseVoiceTranscriptionResponse } from '../../types/asr/vendors/sensevoice'
import {
  SENSEVOICE_DEFAULT_BASE_URL,
  SENSEVOICE_DEFAULT_MODEL,
  SENSEVOICE_MODEL_OPTIONS,
  SENSEVOICE_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/sensevoice'
import { getMediaRecorderChunkDurationMs } from '../../utils/rollingAudioBuffer'
import type { TimestampedWord } from '../../utils/hypothesisBuffer'

const SENSEVOICE_TRANSCRIBE_INTERVAL_MS = 1200
const SENSEVOICE_MAX_WINDOW_MS = 45000
const SENSEVOICE_MEDIA_CHUNK_MS = 100

export class SenseVoiceProvider extends WindowedBatchTranscriptionProvider<Blob> {
  readonly id = ASRVendor.SenseVoice

  readonly info: ASRProviderInfo = {
    id: ASRVendor.SenseVoice,
    name: 'FunASR / SenseVoice',
    description:
      '本地 FunASR 语音转录，支持 SenseVoice（情感+音频事件检测）、Paraformer（中文生产级）等多种模型，无需 API 费用',
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
      },
    },
    requiredConfigKeys: ['baseUrl'],
    supportedLanguages: [...SENSEVOICE_SUPPORTED_LANGUAGES],
    website: 'https://github.com/modelscope/FunASR',
    docsUrl: 'https://github.com/FunAudioLLM/SenseVoice',
    configFields: [
      {
        key: 'baseUrl',
        label: '服务地址',
        type: 'text',
        required: true,
        placeholder: 'http://127.0.0.1:8000',
        defaultValue: SENSEVOICE_DEFAULT_BASE_URL,
        description: 'funasr-server 服务地址。启动命令：funasr-server --device cuda --port 8000',
      },
      {
        key: 'model',
        label: '模型',
        type: 'select',
        required: false,
        defaultValue: SENSEVOICE_DEFAULT_MODEL,
        description: '选择 ASR 模型',
        options: SENSEVOICE_MODEL_OPTIONS.map(m => ({ value: m.value, label: m.label })),
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
      maxWindowMs: SENSEVOICE_MAX_WINDOW_MS,
      transcribeIntervalMs: SENSEVOICE_TRANSCRIBE_INTERVAL_MS,
      scheduleMode: 'debounce',
    })
  }

  async connect(config: ProviderConfig): Promise<void> {
    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const model = this.normalizeModel(config.model)

    if (!baseUrl) {
      this.emitError(this.createError('MISSING_CONFIG', '请提供 funasr-server 服务地址'))
      return
    }

    try {
      new URL(baseUrl)
    } catch {
      this.emitError(this.createError('INVALID_BASE_URL', '服务地址格式不正确'))
      return
    }

    try {
      const healthRes = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!healthRes.ok) {
        throw new Error(`HTTP ${healthRes.status}`)
      }
      const health = await healthRes.json()
      console.log('[SenseVoiceProvider] 健康检查通过:', health)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.emitError(this.createError(
        'SERVICE_UNAVAILABLE',
        `无法连接 funasr-server (${baseUrl})：${msg}。请确认服务已启动。`,
      ))
      return
    }

    this.beginWindowedSession({
      ...config,
      baseUrl,
      model,
    })
  }

  protected shouldEmitErrorOnNonFinalTranscriptionFailure(): boolean {
    return false
  }

  protected async resolveAudioChunk(data: Blob | ArrayBuffer) {
    return {
      chunk: data instanceof Blob ? data : new Blob([data], { type: 'audio/webm' }),
      durationMs: getMediaRecorderChunkDurationMs(SENSEVOICE_MEDIA_CHUNK_MS),
    }
  }

  protected async transcribeWindow(chunks: Blob[], config: ProviderConfig, prompt?: string): Promise<TimestampedWord[]> {
    const baseUrl = this.normalizeBaseUrl(config.baseUrl)
    const model = this.normalizeModel(config.model)

    const endpoint = `${baseUrl}/v1/audio/transcriptions`
    const fileBlob = this.buildAudioBlob(chunks)
    const formData = new FormData()
    formData.append('file', fileBlob, this.getAudioFileName(fileBlob))
    formData.append('model', model)
    formData.append('response_format', 'verbose_json')

    const language = this.getLanguageHint(config)
    if (language) {
      formData.append('language', language)
    }

    if (prompt) {
      formData.append('prompt', prompt)
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const result = await response.json() as SenseVoiceTranscriptionResponse
    const text = typeof result.text === 'string' ? result.text.trim() : ''
    if (!text) return []
    return [{ start: 0, end: 0, text }]
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
    if (typeof value !== 'string') return SENSEVOICE_DEFAULT_BASE_URL
    const trimmed = value.trim() || SENSEVOICE_DEFAULT_BASE_URL
    return trimmed.replace(/\/+$/, '')
  }

  private normalizeModel(value: unknown): string {
    if (typeof value !== 'string') return SENSEVOICE_DEFAULT_MODEL
    return value.trim() || SENSEVOICE_DEFAULT_MODEL
  }
}
