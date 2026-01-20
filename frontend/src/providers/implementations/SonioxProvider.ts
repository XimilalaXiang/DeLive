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
} from '../../types/asr/vendors/soniox'

export class SonioxProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'soniox' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'soniox' as ASRVendor,
    name: 'Soniox V3',
    description: '高精度实时语音识别，支持 60+ 种语言',
    type: 'cloud',
    supportsStreaming: true,
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
    ],
  }

  private ws: WebSocket | null = null
  private finalTokens: TranscriptToken[] = []

  async connect(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Soniox API Key'))
      return
    }

    this._config = config
    this.setState('connecting')
    this.finalTokens = []

    return new Promise((resolve, reject) => {
      try {
        console.log('[SonioxProvider] 建立 WebSocket 连接...')
        this.ws = new WebSocket(SONIOX_WEBSOCKET_URL)

        this.ws.onopen = () => {
          console.log('[SonioxProvider] WebSocket 已连接')
          
          // 发送配置
          const sonioxConfig: SonioxConfig = {
            api_key: config.apiKey,
            model: (config.model as string) || SONIOX_DEFAULT_MODEL,
            audio_format: 'auto',
            language_hints: config.languageHints as string[] || ['zh', 'en'],
            enable_language_identification: true,
            enable_endpoint_detection: true,
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
      if (this.ws.readyState === WebSocket.OPEN) {
        // 发送空消息表示结束
        this.ws.send('')
      }
      this.ws.close()
      this.ws = null
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

    for (const st of sonioxTokens) {
      if (!st.text) continue

      const token = this.normalizeToken(st)
      tokens.push(token)

      if (st.is_final) {
        this.finalTokens.push(token)
      } else {
        partialText += st.text
      }
    }

    const finalText = this.finalTokens.map(t => t.text).join('')
    return { finalText, partialText, tokens }
  }

  // 将 Soniox Token 转换为通用 Token 格式
  private normalizeToken(sonioxToken: SonioxToken): TranscriptToken {
    return {
      text: sonioxToken.text,
      isFinal: sonioxToken.is_final,
      startMs: sonioxToken.start_ms,
      endMs: sonioxToken.end_ms,
      confidence: sonioxToken.confidence,
      language: sonioxToken.language,
      speaker: sonioxToken.speaker,
    }
  }
}
