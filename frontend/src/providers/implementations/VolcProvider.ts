/**
 * 火山引擎 ASR Provider 实现
 * 
 * 由于浏览器原生 WebSocket 不支持自定义 HTTP Headers，
 * 而火山引擎需要通过 Headers 传递认证信息，
 * 因此通过本地代理服务器转发 WebSocket 连接。
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'

// 本地代理服务器地址
const PROXY_WS_URL = 'ws://localhost:3001/ws/volc'

export class VolcProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'volc' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'volc' as ASRVendor,
    name: '火山引擎',
    description: '字节跳动旗下语音识别服务，支持中文优化',
    type: 'cloud',
    supportsStreaming: true,
    supportedLanguages: ['zh', 'en', 'ja', 'ko'],
    website: 'https://www.volcengine.com/product/speech',
    docsUrl: 'https://www.volcengine.com/docs/6561/80818',
    configFields: [
      {
        key: 'appKey',
        label: 'APP ID',
        type: 'password',
        required: true,
        placeholder: '输入你的 APP ID',
        description: '从火山引擎控制台获取',
      },
      {
        key: 'accessKey',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: '输入你的 Access Token',
        description: '从火山引擎控制台获取',
      },
      {
        key: 'languageHints',
        label: '语言提示',
        type: 'text',
        required: false,
        placeholder: 'zh, en',
        description: '用逗号分隔的语言代码',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const appKey = config.appKey as string
    const accessKey = config.accessKey as string

    if (!appKey || !accessKey) {
      this.emitError(this.createError('MISSING_CREDENTIALS', '请提供 App Key 和 Access Key'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        // 构建代理 URL，通过 URL 参数传递配置
        const params = new URLSearchParams({
          appKey,
          accessKey,
          language: (config.language as string) || '',
          modelV2: 'true', // 使用 V2 模型
          bidiStreaming: 'true',
          enableDdc: 'true', // 语义顺滑
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[VolcProvider] 连接到代理服务器...')
        
        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[VolcProvider] 代理连接已建立，等待火山引擎就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            
            switch (msg.type) {
              case 'ready':
                console.log('[VolcProvider] 火山引擎已就绪')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break
                
              case 'partial':
                if (msg.text) {
                  console.log('[VolcProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break
                
              case 'final':
                console.log('[VolcProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break
                
              case 'error':
                console.error('[VolcProvider] 服务器错误:', msg.code, msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[VolcProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[VolcProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保服务器已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[VolcProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[VolcProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[VolcProvider] 断开连接...')
    
    if (this.ws && this.wsReady) {
      // 发送音频结束标记
      this.ws.send(JSON.stringify({ type: 'audio_end' }))
    }

    // 等待一小段时间让最终结果返回
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (this.ws) {
      this.ws.close(1000, 'disconnect')
      this.ws = null
    }

    this.wsReady = false
    this.setState('idle')
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    if (!this.ws || !this.wsReady) {
      console.warn('[VolcProvider] WebSocket 未就绪，无法发送音频')
      return
    }

    this.setState('recording')

    if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => {
        this.ws?.send(buffer)
      })
    } else {
      this.ws.send(data)
    }
  }
}
