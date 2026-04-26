/**
 * ElevenLabs Scribe v2 Realtime ASR Provider 实现
 *
 * 通过本地代理连接 ElevenLabs Realtime STT API，
 * 代理负责 xi-api-key header 认证（浏览器 WebSocket 不支持自定义 Headers）。
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'
import {
  ELEVENLABS_DEFAULT_MODEL,
  ELEVENLABS_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/elevenlabs'

const PROXY_WS_URL = 'ws://localhost:23456/ws/elevenlabs'

export class ElevenLabsProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'elevenlabs' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'elevenlabs' as ASRVendor,
    name: 'ElevenLabs',
    description: 'ElevenLabs Scribe v2 Realtime 实时语音转录，支持 90+ 种语言（含中文），150ms 超低延迟',
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
          availability: 'unsupported',
        },
      },
      supportsConfigTest: true,
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: [...ELEVENLABS_SUPPORTED_LANGUAGES],
    website: 'https://elevenlabs.io/app/speech-to-text',
    docsUrl: 'https://elevenlabs.io/docs/overview/capabilities/speech-to-text',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入你的 ElevenLabs API Key',
        description: '从 elevenlabs.io/app/settings/api-keys 获取 API Key',
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
      this.emitError(this.createError('MISSING_API_KEY', '请提供 ElevenLabs API Key'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          model: ELEVENLABS_DEFAULT_MODEL,
          language: (config.language as string) || '',
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[ElevenLabsProvider] 连接到代理服务器...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[ElevenLabsProvider] 代理连接已建立，等待 ElevenLabs 就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[ElevenLabsProvider] ElevenLabs 已就绪')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[ElevenLabsProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[ElevenLabsProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'error':
                console.error('[ElevenLabsProvider] 服务器错误:', msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[ElevenLabsProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[ElevenLabsProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保应用代理已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[ElevenLabsProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[ElevenLabsProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[ElevenLabsProvider] 断开连接...')

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
      console.warn('[ElevenLabsProvider] WebSocket 未就绪，无法发送音频')
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
