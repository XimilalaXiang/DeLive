/**
 * Mistral AI Realtime ASR Provider 实现
 *
 * 通过本地代理连接 Mistral Realtime Transcription API，
 * 代理负责 Authorization header 认证（浏览器 WebSocket 不支持自定义 Headers）。
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'
import {
  MISTRAL_REALTIME_MODEL,
  MISTRAL_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/mistral'

const PROXY_WS_URL = 'ws://localhost:23456/ws/mistral'

export class MistralProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'mistral' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'mistral' as ASRVendor,
    name: 'Mistral AI',
    description: 'Mistral Voxtral 实时语音转录，支持 13 种语言',
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
    supportedLanguages: [...MISTRAL_SUPPORTED_LANGUAGES],
    website: 'https://console.mistral.ai/api-keys',
    docsUrl: 'https://docs.mistral.ai/capabilities/audio/speech_to_text/realtime_transcription',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入你的 Mistral API Key',
        description: '从 console.mistral.ai 获取 API Key',
      },
      {
        key: 'languageHints',
        label: '语言提示',
        type: 'text',
        required: false,
        placeholder: 'zh, en',
        description: '可选，支持: en, zh, hi, es, ar, fr, pt, ru, de, ja, ko, it, nl',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey as string

    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 Mistral API Key'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          model: MISTRAL_REALTIME_MODEL,
          language: (config.language as string) || '',
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[MistralProvider] 连接到代理服务器...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[MistralProvider] 代理连接已建立，等待 Mistral 就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[MistralProvider] Mistral 已就绪')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[MistralProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[MistralProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'error':
                console.error('[MistralProvider] 服务器错误:', msg.code, msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[MistralProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[MistralProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保应用代理已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[MistralProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[MistralProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[MistralProvider] 断开连接...')

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
      console.warn('[MistralProvider] WebSocket 未就绪，无法发送音频')
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
