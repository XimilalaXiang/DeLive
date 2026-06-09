/**
 * 60db STT Realtime ASR Provider.
 *
 * Connects through the local proxy at ws://localhost:23456/ws/sixtydb
 * (parity with ElevenLabsProvider). The proxy hides the api key from
 * the browser DevTools and normalizes 60db's two-phase finals into the
 * standard partial/final contract.
 *
 * Docs: https://docs.60db.ai/api-reference/websocket/stt
 */

import { BaseASRProvider } from '../base'
import type {
  ASRProviderInfo,
  ProviderConfig,
  ASRVendor,
} from '../../types/asr'
import {
  SIXTYDB_SUPPORTED_LANGUAGES,
} from '../../types/asr/vendors/sixtydb'

const PROXY_WS_URL = 'ws://localhost:23456/ws/sixtydb'

export class SixtydbProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'sixtydb' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: 'sixtydb' as ASRVendor,
    name: '60db',
    description:
      '60db real-time speech-to-text. ~40 languages including Indic + English code-switching, sentence-based continuous mode, optional speaker diarization.',
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
        description: 'Get your 60db API key from docs.60db.ai',
      },
      {
        key: 'languageHints',
        label: 'Language Hints',
        type: 'text',
        required: false,
        placeholder: 'en, hi',
        description: 'Comma-separated ISO 639-1 codes (max 5). Omit for auto-detect.',
      },
    ],
  }

  private ws: WebSocket | null = null
  private wsReady = false

  async connect(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey as string

    if (!apiKey) {
      this.emitError(this.createError('MISSING_API_KEY', '60db API key is required'))
      return
    }

    this._config = config
    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          apiKey,
          language: (config.language as string) || '',
        })

        const proxyUrl = `${PROXY_WS_URL}?${params.toString()}`
        console.log('[SixtydbProvider] connecting to proxy...')

        this.ws = new WebSocket(proxyUrl)

        this.ws.onopen = () => {
          console.log('[SixtydbProvider] proxy connected, awaiting 60db session_started...')
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'ready':
                console.log('[SixtydbProvider] 60db session ready')
                this.wsReady = true
                this.setState('connected')
                resolve()
                break

              case 'partial':
                if (msg.text) {
                  console.log('[SixtydbProvider] partial:', msg.text.substring(0, 50))
                  this.emitPartial(msg.text)
                }
                break

              case 'final':
                console.log('[SixtydbProvider] final:', msg.text)
                this.emitFinal(msg.text || '')
                this.emitFinished()
                break

              case 'error':
                console.error('[SixtydbProvider] server error:', msg.message)
                this.emitError(this.createError('SERVER_ERROR', msg.message || 'Server error'))
                break
            }
          } catch (e) {
            console.error('[SixtydbProvider] failed to parse message:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[SixtydbProvider] WebSocket error:', error)
          this.emitError(this.createError('WEBSOCKET_ERROR', 'WebSocket connection error — make sure the local proxy is running'))
          reject(new Error('WebSocket connection error'))
        }

        this.ws.onclose = (event) => {
          console.log('[SixtydbProvider] WebSocket closed:', event.code, event.reason)
          this.wsReady = false
          this.setState('idle')
        }
      } catch (error) {
        console.error('[SixtydbProvider] connect failed:', error)
        this.emitError(this.createError('CONNECTION_ERROR', 'Connection failed'))
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    console.log('[SixtydbProvider] disconnecting...')

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
      console.warn('[SixtydbProvider] WebSocket not ready, dropping audio')
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
