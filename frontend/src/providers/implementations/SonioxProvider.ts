/**
 * Soniox ASR Provider 实现
 * 基于 WebSocket 的实时流式语音识别
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  TranscriptToken,
  ASRVendor,
} from '../../types/asr'
import {
  SONIOX_WEBSOCKET_URL,
  SONIOX_DEFAULT_MODEL,
  type SonioxConfig,
  type SonioxResponse,
  type SonioxToken,
  type SonioxTranslationConfig,
} from '../../types/asr/vendors/soniox'

export class SonioxProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'soniox' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'soniox' as ASRVendor,
    name: 'Soniox V5',
    description: '高精度实时语音识别，支持 60+ 种语言，可选单向/双向实时翻译',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder',
      audioProfile: {
        payloadFormat: 'webm-opus',
        preferredChunkMs: 100,
      },
      transport: {
        type: 'realtime',
        captureRestartStrategy: 'reconnect-session',
      },
      prompting: {
        supportsLanguageHints: true,
      },
      timestamps: {
        supportsTokenTimestamps: true,
        supportsSegmentTimestamps: true,
      },
      workloads: {
        liveCapture: {
          availability: 'implemented',
          executionMode: 'realtime-stream',
          inputSources: ['system-audio'],
          acceptedFileKinds: ['audio'],
        },
        fileTranscription: {
          availability: 'compatible',
          executionMode: 'native-job',
          inputSources: ['file'],
          acceptedFileKinds: ['audio', 'video'],
        },
      },
      prefersTokenEvents: true,
      supportsConfigTest: true,
      supportsTranslation: true,
      supportsSpeakerDiarization: true,
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
    website: 'https://soniox.com',
    docsUrl: 'https://soniox.com/docs',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入你的 Soniox API Key',
        description: '从 console.soniox.com 获取',
      },
      {
        key: 'languageHints',
        label: '语言提示',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'zh', label: '中文' },
          { value: 'en', label: '英文' },
          { value: 'ja', label: '日语' },
          { value: 'ko', label: '韩语' },
          { value: 'es', label: '西班牙语' },
          { value: 'fr', label: '法语' },
          { value: 'de', label: '德语' },
        ],
        defaultValue: ['zh', 'en'],
        description: '提示可能使用的语言，提高识别准确率',
      },
      {
        key: 'endpointSensitivity',
        label: '端点检测灵敏度',
        type: 'select',
        required: false,
        defaultValue: '0',
        options: [
          { value: '-1', label: '最低（等待更久再断句）' },
          { value: '-0.5', label: '较低' },
          { value: '0', label: '默认' },
          { value: '0.5', label: '较高' },
          { value: '1', label: '最高（更快断句）' },
        ],
        description: 'V5 新功能：控制语音端点检测的灵敏度。值越高断句越快，适合语音指令；值越低等待越久，适合长对话。',
      },
      {
        key: 'translationEnabled',
        label: '启用实时翻译',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: '开启后，Soniox 将返回实时翻译文本。',
      },
      {
        key: 'translationMode',
        label: '翻译模式',
        type: 'select',
        required: false,
        defaultValue: 'one_way',
        options: [
          { value: 'one_way', label: '单向翻译' },
          { value: 'two_way', label: '双向翻译（V5 新功能）' },
        ],
        description: '单向翻译将所有语音翻译为目标语言；双向翻译在两种语言间互译。',
      },
      {
        key: 'translationTargetLanguage',
        label: '单向翻译目标语言',
        type: 'select',
        required: false,
        defaultValue: 'en',
        options: [
          { value: 'en', label: 'English' },
          { value: 'zh', label: '中文' },
          { value: 'ja', label: '日本語' },
          { value: 'ko', label: '한국어' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' },
          { value: 'de', label: 'Deutsch' },
          { value: 'it', label: 'Italiano' },
          { value: 'pt', label: 'Português' },
          { value: 'ru', label: 'Русский' },
          { value: 'vi', label: 'Tiếng Việt' },
        ],
        description: '仅在单向翻译模式下生效。',
      },
      {
        key: 'translationLanguageA',
        label: '双向翻译语言 A',
        type: 'select',
        required: false,
        defaultValue: 'zh',
        options: [
          { value: 'zh', label: '中文' },
          { value: 'en', label: 'English' },
          { value: 'ja', label: '日本語' },
          { value: 'ko', label: '한국어' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' },
          { value: 'de', label: 'Deutsch' },
        ],
        description: '仅在双向翻译模式下生效。',
      },
      {
        key: 'translationLanguageB',
        label: '双向翻译语言 B',
        type: 'select',
        required: false,
        defaultValue: 'en',
        options: [
          { value: 'en', label: 'English' },
          { value: 'zh', label: '中文' },
          { value: 'ja', label: '日本語' },
          { value: 'ko', label: '한국어' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' },
          { value: 'de', label: 'Deutsch' },
        ],
        description: '仅在双向翻译模式下生效。',
      },
      {
        key: 'enableSpeakerDiarization',
        label: '启用多发言人识别',
        type: 'boolean',
        required: false,
        defaultValue: false,
        description: '开启后，Soniox 会返回按说话人区分的转录结果。',
      },
    ],
  }

  private ws: WebSocket | null = null
  private finalTokens: TranscriptToken[] = []

  async connect(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Soniox API Key'))
      return
    }
    const apiKey = config.apiKey

    this._config = config
    this.setState('connecting')
    this.finalTokens = []

    return new Promise((resolve, reject) => {
      try {
        console.log('[SonioxProvider] 建立 WebSocket 连接...')
        this.ws = new WebSocket(SONIOX_WEBSOCKET_URL)

        this.ws.onopen = () => {
          console.log('[SonioxProvider] WebSocket 已连接')
          
          const sonioxConfig: SonioxConfig = {
            api_key: apiKey,
            model: (config.model as string) || SONIOX_DEFAULT_MODEL,
            audio_format: 'auto',
            language_hints: (config.languageHints as string[]) || ['zh', 'en'],
            enable_language_identification: true,
            enable_speaker_diarization: Boolean(config.enableSpeakerDiarization),
            enable_endpoint_detection: true,
          }

          const sensitivity = Number(config.endpointSensitivity)
          if (!isNaN(sensitivity) && sensitivity !== 0) {
            sonioxConfig.endpoint_sensitivity = Math.max(-1, Math.min(1, sensitivity))
          }

          if (config.translationEnabled) {
            sonioxConfig.translation = this.buildTranslationConfig(config)
          }
          
          console.log('[SonioxProvider] 发送配置:', { ...sonioxConfig, api_key: '***' })
          this.ws!.send(JSON.stringify(sonioxConfig))
          
          this.setState('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[SonioxProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误'))
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('[SonioxProvider] WebSocket 关闭:', event.code, event.reason)
          this.setState('idle')
        }
      } catch (error) {
        console.error('[SonioxProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[SonioxProvider] 断开连接...')
    
    if (this.ws) {
      const ws = this.ws
      this.ws = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
    }

    this.setState('idle')
    this.finalTokens = []
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[SonioxProvider] WebSocket 未就绪，无法发送音频')
      return
    }

    this.setState('recording')
    this.ws.send(data)
  }

  private handleMessage(data: string): void {
    try {
      const response: SonioxResponse = JSON.parse(data)
      console.log('[SonioxProvider] 收到消息:', response)

      // 错误处理
      if (response.error_code) {
        console.error('[SonioxProvider] API 错误:', response.error_code, response.error_message)
        this.emitError(this.createError(
          response.error_code,
          response.error_message || 'Soniox API 错误'
        ))
        return
      }

      // 处理 tokens
      if (response.tokens && response.tokens.length > 0) {
        const { finalText, partialText, tokens } = this.processTokens(response.tokens)
        
        // 发送 tokens
        if (tokens.length > 0) {
          this.emitTokens(tokens)
        }

        // 发送部分结果
        const fullText = finalText + partialText
        if (fullText) {
          this.emitPartial(fullText)
        }
      }

      // 处理完成状态
      if (response.finished) {
        console.log('[SonioxProvider] 转录完成')
        const finalText = this.finalTokens.map(t => t.text).join('')
        this.emitFinal(finalText)
        this.emitFinished()
        this.setState('idle')
      }
    } catch (error) {
      console.error('[SonioxProvider] 解析消息失败:', error)
    }
  }

  private processTokens(sonioxTokens: SonioxToken[]): {
    finalText: string
    partialText: string
    tokens: TranscriptToken[]
  } {
    const tokens: TranscriptToken[] = []
    let partialText = ''

    // Soniox 特殊标记列表，这些不应该显示给用户
    const specialMarkers = ['<end>', '<END>', '<unk>', '<UNK>', '<silence>', '<SILENCE>']

    for (const st of sonioxTokens) {
      if (!st.text) continue
      
      // 过滤掉特殊标记
      if (specialMarkers.includes(st.text.trim())) {
        console.log('[SonioxProvider] 过滤特殊标记:', st.text)
        continue
      }

      const token = this.normalizeToken(st)
      tokens.push(token)

      if (st.is_final && st.translation_status !== 'translation') {
        this.finalTokens.push(token)
      } else if (!st.is_final && st.translation_status !== 'translation') {
        partialText += st.text
      }
    }

    const finalText = this.finalTokens.map(t => t.text).join('')
    return { finalText, partialText, tokens }
  }

  private buildTranslationConfig(config: ProviderConfig): SonioxTranslationConfig {
    const mode = config.translationMode as string
    if (mode === 'two_way') {
      const langA = (config.translationLanguageA as string) || 'zh'
      const langB = (config.translationLanguageB as string) || 'en'
      return { type: 'two_way', language_a: langA, language_b: langB }
    }
    return {
      type: 'one_way',
      target_language: (config.translationTargetLanguage as string) || 'en',
    }
  }

  private normalizeToken(sonioxToken: SonioxToken): TranscriptToken {
    return {
      text: sonioxToken.text,
      isFinal: sonioxToken.is_final,
      startMs: sonioxToken.start_ms,
      endMs: sonioxToken.end_ms,
      confidence: sonioxToken.confidence,
      language: sonioxToken.language,
      speaker: sonioxToken.speaker,
      translationStatus: sonioxToken.translation_status ?? 'none',
      sourceLanguage: sonioxToken.source_language,
    }
  }
}
