/**
 * Deepgram Streaming ASR Provider 实现
 *
 * 通过本地代理连接 Deepgram Streaming API，
 * 代理负责 Authorization header 认证（浏览器 WebSocket 不支持自定义 Headers）。
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'
import {
  DEEPGRAM_DEFAULT_MODEL,
  DEEPGRAM_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/deepgram'

const PROXY_WS_URL = 'ws://localhost:23456/ws/deepgram'

export class DeepgramProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'deepgram' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'deepgram' as ASRVendor,
    name: 'Deepgram',
    description: 'Deepgram Nova-3 实时语音转录，支持 45+ 种语言（含中文普通话/粤语）',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'pcm16',
      audioProfile: {
        payloadFormat: 'pcm16',
        sampleRateHz: 16000,
        channels: 1,
        preferredChunkMs: 100,
      },
      transport: {
        type: 'realtime',
        captureRestartStrategy: 'reuse-session',
      },
      prompting: {
        supportsLanguageHints: true,
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
          executionMode: 'single-request',
          inputSources: ['file'],
          acceptedFileKinds: ['audio', 'video'],
        },
      },
      supportsConfigTest: true,
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: [...DEEPGRAM_SUPPORTED_LANGUAGES],
    website: 'https://console.deepgram.com/',
    docsUrl: 'https://developers.deepgram.com/docs/live-streaming-audio',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入你的 Deepgram API Key',
        description: '从 console.deepgram.com 获取 API Key',
      },
      {
        key: 'languageHints',
        label: '语言提示 (Language Hints)',
        type: 'text',
        required: false,
        placeholder: 'zh, en',
        description: '用逗号分隔的语言代码。例如: zh, en, ja, ko',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey as string

    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Deepgram API Key'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          model: DEEPGRAM_DEFAULT_MODEL,
          language: (config.language as string) || '',
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[DeepgramProvider] 连接到代理服务器...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[DeepgramProvider] 代理连接已建立，等待 Deepgram 就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[DeepgramProvider] Deepgram 已就绪')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[DeepgramProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[DeepgramProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'error':
                console.error('[DeepgramProvider] 服务器错误:', msg.code, msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[DeepgramProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[DeepgramProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保应用代理已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[DeepgramProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[DeepgramProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[DeepgramProvider] 断开连接...')

    if (this.ws && this.wsReady) {
      this.ws.send(JSON.stringify({ type: 'audio_end' }))
    }

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
      console.warn('[DeepgramProvider] WebSocket 未就绪，无法发送音频')
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
