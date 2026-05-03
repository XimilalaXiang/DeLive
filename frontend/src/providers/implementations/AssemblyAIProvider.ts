/**
 * AssemblyAI Streaming ASR Provider 实现
 *
 * 通过本地代理连接 AssemblyAI Streaming v3 API，
 * 代理负责 Authorization header 认证（浏览器 WebSocket 不支持自定义 Headers）。
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'
import {
  ASSEMBLYAI_DEFAULT_MODEL,
  ASSEMBLYAI_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/assemblyai'

const PROXY_WS_URL = 'ws://localhost:23456/ws/assemblyai'

export class AssemblyAIProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'assemblyai' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'assemblyai' as ASRVendor,
    name: 'AssemblyAI',
    description: 'AssemblyAI 实时语音转录 + 文件转录，支持 99+ 种语言、说话人分离',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'pcm16',
      audioProfile: {
        payloadFormat: 'pcm16',
        sampleRateHz: 16000,
        channels: 1,
        preferredChunkMs: 50,
      },
      transport: {
        type: 'realtime',
        captureRestartStrategy: 'reuse-session',
      },
      prompting: {
        supportsLanguageHints: false,
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
      supportsConfigTest: true,
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: [...ASSEMBLYAI_SUPPORTED_LANGUAGES],
    website: 'https://www.assemblyai.com/dashboard',
    docsUrl: 'https://www.assemblyai.com/docs/speech-to-text/streaming',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入你的 AssemblyAI API Key',
        description: '从 assemblyai.com/dashboard 获取 API Key',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey as string

    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '请提供 AssemblyAI API Key'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          model: ASSEMBLYAI_DEFAULT_MODEL,
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[AssemblyAIProvider] 连接到代理服务器...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[AssemblyAIProvider] 代理连接已建立，等待 AssemblyAI 就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[AssemblyAIProvider] AssemblyAI 已就绪, session:', msg.sessionId)
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[AssemblyAIProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[AssemblyAIProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'error':
                console.error('[AssemblyAIProvider] 服务器错误:', msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[AssemblyAIProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[AssemblyAIProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保应用代理已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[AssemblyAIProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[AssemblyAIProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[AssemblyAIProvider] 断开连接...')

    if (this.ws && this.wsReady) {
      this.ws.send(JSON.stringify({ type: 'terminate' }))
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
      console.warn('[AssemblyAIProvider] WebSocket 未就绪，无法发送音频')
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
