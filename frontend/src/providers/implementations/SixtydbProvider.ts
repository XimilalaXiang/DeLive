/**
 * 60db STT Realtime ASR Provider 实现
 *
 * 通过本地代理连接 60db Realtime STT API，
 * 代理负责 API Key 隐藏和协议归一化（两阶段 finals → 统一 partial/final）。
 *
 * Docs: https://docs.60db.ai/api-reference/websocket/stt
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
} from '../../types/asr'
import { ASRVendor } from '../../types/asr'
import {
  SIXTYDB_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/sixtydb'

const PROXY_WS_URL = 'ws://localhost:23456/ws/sixtydb'

export class SixtydbProvider extends BaseASRProvider {
  readonly id = ASRVendor.Sixtydb

  readonly info: ASRProviderInfo = {
    id: ASRVendor.Sixtydb,
    name: '60db',
    description:
      '60db 实时语音转录，支持 ~40 种语言（含印度语系 + 英语混合切换），基于句子的连续模式，可选说话人分离',
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
    supportedLanguages: [...SIXTYDB_SUPPORTED_LANGUAGES],
    website: 'https://60db.ai',
    docsUrl: 'https://docs.60db.ai/api-reference/websocket/stt',
    configFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk_live_...',
        description: '从 docs.60db.ai 获取 API Key',
      },
      {
        key: 'languageHints',
        label: '语言提示 (Language Hints)',
        type: 'text',
        required: false,
        placeholder: 'en, hi',
        description: '用逗号分隔的 ISO 639-1 语言代码（最多 5 个）。留空则自动检测语言。',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey as string

    if (!apiKey) {
      const error = this.createError('MISSING_API_KEY', '请提供 60db API Key')
      this.emitError(error)
      throw new Error(error.message)
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          language: (config.language as string) || '',
        })

        const hints = config.languageHints as string[] | string | undefined
        if (hints) {
          const hintsStr = Array.isArray(hints) ? hints.join(',') : hints
          if (hintsStr) params.set('languageHints', hintsStr)
        }

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[SixtydbProvider] 连接到代理服务器...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[SixtydbProvider] 代理连接已建立，等待 60db 就绪...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[SixtydbProvider] 60db 已就绪')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[SixtydbProvider] 中间结果:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[SixtydbProvider] 最终结果:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'session_stopped':
                console.log('[SixtydbProvider] 会话已停止')
                this.wsReady = false
                this.setState('idle')
                break

              case 'error':
                console.error('[SixtydbProvider] 服务器错误:', msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || '服务器错误'))
                break
            }
          } catch (e) {
            console.error('[SixtydbProvider] 解析消息失败:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[SixtydbProvider] WebSocket 错误:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket 连接错误，请确保应用代理已启动'))
          reject(new Error('WebSocket 连接错误'))
        }

        this.ws.onclose = (event) => {
          console.log('[SixtydbProvider] WebSocket 关闭:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[SixtydbProvider] 连接失败:', error)
        this.emitError(this.createError('CONNECTION_ERROR', '连接失败'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[SixtydbProvider] 断开连接...')

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
      console.warn('[SixtydbProvider] WebSocket 未就绪，无法发送音频')
      return
    }

    this.setState('recording')

    if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => {
        if (this.ws && this.wsReady) {
          this.ws.send(buffer)
        }
      })
    } else {
      this.ws.send(data)
    }
  }
}
