/**
 * 60db STT Realtime ASR proxy core.
 *
 * Architectural parity with elevenlabsProxyCore.ts. 60db authenticates via
 * `?apiKey=` in the URL — the proxy is largely a passthrough but still gives:
 *   - api key never appears in browser DevTools network tab
 *   - centralized logging
 *   - consistent cancellation + error handling with the other 12 providers
 *
 * 60db STT WS protocol (wss://api.60db.ai/ws/stt):
 *   server → client: connection_established → connected → session_started →
 *                    speech_started → transcription (interim/final) → session_stopped
 *   client → server: { type: "start", languages, config: { encoding, sample_rate, ... } }
 *                    raw binary PCM16 frames (no JSON wrapping needed)
 *                    { type: "stop" }
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const SIXTYDB_WS_BASE = 'wss://api.60db.ai/ws/stt'

interface SixtydbProxyConfig {
  apiKey: string
  language?: string
  diarize?: boolean
}

function parseProxyConfig(req: IncomingMessage): SixtydbProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    language: url.searchParams.get('language') || '',
    diarize: url.searchParams.get('diarize') === 'true',
  }
}

function handleSixtydbConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[SixtydbProxy] new client connection')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[SixtydbProxy] missing apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const wsUrl = `${SIXTYDB_WS_BASE}?apiKey=${encodeURIComponent(config.apiKey)}`
  console.log(`[SixtydbProxy] dialing upstream: language=${config.language || 'auto'} diarize=${config.diarize}`)

  const agent = getWsProxyAgent()
  const upstream = new NodeWebSocket(wsUrl, { agent })

  let sessionReady = false
  let clientClosed = false

  upstream.on('open', () => {
    console.log('[SixtydbProxy] upstream connected, waiting for session_started...')
  })

  upstream.on('message', (data: Buffer) => {
    if (clientClosed) return

    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(data.toString())
    } catch (err) {
      console.error('[SixtydbProxy] failed to parse upstream message:', err)
      return
    }

    // Handshake: connection_established (outer-key) → send start.
    if (msg.connection_established) {
      const languages = config.language ? [config.language] : null
      const startMsg = {
        type: 'start',
        languages,
        config: {
          encoding: 'linear',
          sample_rate: 16000,
          continuous_mode: true,
          utterance_end_ms: 500,
          interim_results_frequency: 300,
          diarize: !!config.diarize,
          audio_enhancement: 'adaptive',
        },
      }
      upstream.send(JSON.stringify(startMsg))
      return
    }

    if (msg.type === 'connected') {
      // Proxy ready notice; we wait for session_started before announcing to client.
      return
    }

    if (msg.type === 'session_started') {
      console.log(`[SixtydbProxy] session_started: id=${(msg as { session_id?: string }).session_id}`)
      sessionReady = true
      clientWs.send(JSON.stringify({ type: 'ready' }))
      return
    }

    if (msg.type === 'transcription') {
      const text = (msg as { text?: string }).text || ''
      if (!text) return
      // 60db two-phase: is_final=true + speech_final=false is the fast first emit;
      // speech_final=true is the canonical answer. We mirror Deepgram-style by
      // treating only speech_final as the "final" event, everything else as partial.
      const speechFinal = !!(msg as { speech_final?: boolean }).speech_final
      if (speechFinal) {
        console.log(`[SixtydbProxy] final: ${text.substring(0, 60)}`)
        clientWs.send(JSON.stringify({ type: 'final', text, raw: msg }))
      } else {
        clientWs.send(JSON.stringify({ type: 'partial', text, raw: msg }))
      }
      return
    }

    if (msg.type === 'error') {
      const errorMsg = (msg as { error?: string }).error || 'Unknown error'
      const errorCode = (msg as { error_code?: string }).error_code || 'unknown'
      console.error(`[SixtydbProxy] upstream error: ${errorCode} - ${errorMsg}`)
      clientWs.send(JSON.stringify({
        type: 'error',
        message: `60db: ${errorCode} - ${errorMsg}`,
      }))
      return
    }

    if (msg.type === 'session_stopped') {
      console.log('[SixtydbProxy] session_stopped')
    }
  })

  upstream.on('error', (error) => {
    console.error('[SixtydbProxy] upstream WebSocket error:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatSixtydbConnectionError(error),
      }))
      clientWs.close(4002, '60db WebSocket error')
    }
  })

  upstream.on('close', (code, reason) => {
    console.log(`[SixtydbProxy] upstream closed: ${code} ${reason}`)
    if (!clientClosed) {
      const safeCode = (code === 1000 || (code >= 3000 && code <= 4999)) ? code : 1000
      clientWs.close(safeCode, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!sessionReady) {
      console.warn('[SixtydbProxy] session not ready, dropping data')
      return
    }

    // Browser sends raw PCM16 binary frames OR a JSON control message.
    // 60db accepts raw binary frames natively (auto-detect on first binary
    // frame per docs) — pass them straight through.
    let isBinary = true
    try {
      const text = data.toString('utf-8')
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        isBinary = false
        if (message.type === 'audio_end' || message.type === 'terminate') {
          // Tell 60db to wrap up; it will reply with session_stopped + billing summary.
          upstream.send(JSON.stringify({ type: 'stop' }))
          console.log('[SixtydbProxy] forwarded stop to upstream')
          return
        }
      }
    } catch {
      // non-JSON → binary audio
    }

    if (isBinary) {
      upstream.send(data, { binary: true })
    }
  })

  clientWs.on('close', () => {
    console.log('[SixtydbProxy] client disconnected')
    clientClosed = true
    if (upstream.readyState === NodeWebSocket.OPEN) {
      try { upstream.send(JSON.stringify({ type: 'stop' })) } catch { /* ignore */ }
      upstream.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[SixtydbProxy] client WebSocket error:', error)
    clientClosed = true
    upstream.close(1000, 'Client error')
  })
}

function formatSixtydbConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return '60db API key is invalid or expired — check your API key setting.'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return '60db API key lacks permission — check your workspace access.'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return 'Could not resolve api.60db.ai — check your network connection.'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return 'Connection to 60db timed out — check your network.'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return '60db connection was reset — please retry.'
  }
  return msg
}

export function attachSixtydbProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleSixtydbConnection)
}
