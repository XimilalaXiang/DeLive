/**
 * 本地 OpenAI-compatible ASR Provider
 * 基于 /v1/audio/transcriptions 接口实现渐进式转录
 */

import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'
import type { OpenAITranscriptionResponse } from '../../types/asr/vendors/localOpenAI'
import {
  LOCAL_OPENAI_DEFAULT_BASE_URL,
  LOCAL_OPENAI_DEFAULT_MODEL,
} from '../../types/asr/vendors/localOpenAI'

export class LocalOpenAIProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'local_openai' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'local_openai' as ASRVendor,
    name: '本地 OpenAI 兼容',
    description: '连接本地 OpenAI-compatible ASR 服务（如 Ollama/Whisper 兼容接口）',
    type: 'local',
    supportsStreaming: false,
    capabilities: {
      audioInputMode: 'media-recorder',
      transport: {
        type: 'full-session-retranscription',
        captureRestartStrategy: 'reuse-session',
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

  private chunks: Blob[] = []
  private transcribeTimer: ReturnType<typeof setTimeout> | null = null
  private inFlight = false
  private pendingFinal = false
  private lastTranscript = ''

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

    this._config = {
      ...config,
      baseUrl,
      model,
      apiKey: this.normalizeOptional(config.apiKey),
    }
    this.resetSession()
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    this.clearTimer()

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
      console.warn('[LocalOpenAIProvider] 未连接，忽略音频数据')
      return
    }

    this.setState('recording')
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/webm' })
    this.chunks.push(blob)
    this.scheduleTranscribe()
  }

  private scheduleTranscribe(): void {
    this.clearTimer()
    this.transcribeTimer = setTimeout(() => {
      void this.transcribe(false)
    }, 1200)
  }

  private clearTimer(): void {
    if (this.transcribeTimer) {
      clearTimeout(this.transcribeTimer)
      this.transcribeTimer = null
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
    let shouldRunFinalPass = false
    try {
      const baseUrl = this.normalizeBaseUrl(this._config.baseUrl)
      const model = this.normalizeModel(this._config.model)
      const apiKey = this.normalizeOptional(this._config.apiKey)

      const endpoint = `${baseUrl}/v1/audio/transcriptions`
      const formData = new FormData()
      const fileBlob = this.buildAudioBlob()
      formData.append('file', fileBlob, this.getAudioFileName(fileBlob))
      formData.append('model', model)

      const language = this.getLanguageHint()
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
      console.error('[LocalOpenAIProvider] 转录失败:', error)
      const message = error instanceof Error ? error.message : '本地转录失败'
      if (isFinal) {
        this.emitError(this.createError('TRANSCRIPTION_ERROR', message))
      }
    } finally {
      this.inFlight = false
      if (this.pendingFinal && !isFinal) {
        this.pendingFinal = false
        shouldRunFinalPass = true
      } else if (isFinal) {
        this.setState('idle')
        this.resetSession()
      }
    }

    if (shouldRunFinalPass) {
      await this.transcribe(true)
    }
  }

  private buildAudioBlob(): Blob {
    const mimeType = this.chunks.find(chunk => !!chunk.type)?.type || 'audio/webm'
    return new Blob(this.chunks, { type: mimeType })
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

  private resetSession(): void {
    this.clearTimer()
    this.chunks = []
    this.inFlight = false
    this.pendingFinal = false
    this.lastTranscript = ''
  }
}
