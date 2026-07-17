/**
 * 60db STT Realtime ASR 代理核心
 *
 * 架构对齐 elevenlabsProxyCore.ts。60db 通过 URL 参数 `?apiKey=` 认证，
 * 代理主要作为透传层，但提供以下价值：
 *   - API Key 不会出现在浏览器 DevTools 网络面板中
 *   - 集中式日志
 *   - 与其他 provider 一致的取消和错误处理
 *
 * 60db STT WS 协议 (wss://api.60db.ai/ws/stt)：
 *   服务端 → 客户端：connection_established → connected → session_started →
 *                    speech_started → transcription (interim/final) → session_stopped
 *   客户端 → 服务端：{ type: "start", languages, config: { encoding, sample_rate, ... } }
 *                    原始二进制 PCM16 帧（无需 JSON 包装）
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
  languageHints?: string[]
  diarize?: boolean
}

function parseProxyConfig(req: IncomingMessage): SixtydbProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const hintsRaw = url.searchParams.get('languageHints') || ''
  const hints = hintsRaw ? hintsRaw.split(',').map(s => s.trim()).filter(Boolean) : []
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    language: url.searchParams.get('language') || '',
    languageHints: hints,
    diarize: url.searchParams.get('diarize') === 'true',
  }
}

function handleSixtydbConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[SixtydbProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[SixtydbProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const wsUrl = `${SIXTYDB_WS_BASE}?apiKey=${encodeURIComponent(config.apiKey)}`
  console.log(`[SixtydbProxy] 连接到 60db: language=${config.language || 'auto'} diarize=${config.diarize}`)

  const agent = getWsProxyAgent()
  const upstream = new NodeWebSocket(wsUrl, { agent })

  let sessionReady = false
  let clientClosed = false

  upstream.on('open', () => {
    console.log('[SixtydbProxy] 60db WebSocket 已连接，等待 session_started...')
  })

  upstream.on('message', (data: Buffer) => {
    if (clientClosed) return

    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(data.toString())
    } catch (err) {
      console.error('[SixtydbProxy] 解析上游消息失败:', err)
      return
    }

    if (msg.connection_established) {
      const languages = config.languageHints?.length
        ? config.languageHints
        : config.language ? [config.language] : null
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
      return
    }

    if (msg.type === 'session_started') {
      console.log(`[SixtydbProxy] Session 开始: id=${(msg as { session_id?: string }).session_id}`)
      sessionReady = true
      clientWs.send(JSON.stringify({ type: 'ready' }))
      return
    }

    if (msg.type === 'transcription') {
      const text = (msg as { text?: string }).text || ''
      if (!text) return
      // 60db 两阶段 finals：is_final=true + speech_final=false 是快速首次输出；
      // speech_final=true 是最终确认结果。我们按 Deepgram 风格，
      // 仅将 speech_final 作为 "final" 事件，其余均为 partial。
      const speechFinal = !!(msg as { speech_final?: boolean }).speech_final
      if (speechFinal) {
        console.log(`[SixtydbProxy] 最终结果: ${text.substring(0, 60)}`)
        clientWs.send(JSON.stringify({ type: 'final', text, raw: msg }))
      } else {
        clientWs.send(JSON.stringify({ type: 'partial', text, raw: msg }))
      }
      return
    }

    if (msg.type === 'error') {
      const errorMsg = (msg as { error?: string }).error || 'Unknown error'
      const errorCode = (msg as { error_code?: string }).error_code || 'unknown'
      console.error(`[SixtydbProxy] 上游错误: ${errorCode} - ${errorMsg}`)
      clientWs.send(JSON.stringify({
        type: 'error',
        message: `60db 错误: ${errorCode} - ${errorMsg}`,
      }))
      return
    }

    if (msg.type === 'session_stopped') {
      console.log('[SixtydbProxy] 会话已停止')
      sessionReady = false
      clientWs.send(JSON.stringify({ type: 'session_stopped' }))
      return
    }
  })

  upstream.on('error', (error) => {
    console.error('[SixtydbProxy] 60db WebSocket 错误:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatSixtydbConnectionError(error),
      }))
      clientWs.close(4002, '60db WebSocket error')
    }
  })

  upstream.on('close', (code, reason) => {
    console.log(`[SixtydbProxy] 60db WebSocket 关闭: ${code} ${reason}`)
    if (!clientClosed) {
      const safeCode = (code === 1000 || (code >= 3000 && code <= 4999)) ? code : 1000
      clientWs.close(safeCode, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!sessionReady) {
      console.warn('[SixtydbProxy] 60db 未就绪，忽略数据')
      return
    }

    let isBinary = true
    try {
      const text = data.toString('utf-8')
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        isBinary = false
        if (message.type === 'audio_end' || message.type === 'terminate') {
          upstream.send(JSON.stringify({ type: 'stop' }))
          console.log('[SixtydbProxy] 发送 stop 到上游')
          return
        }
      }
    } catch {
      // 非 JSON → 二进制音频
    }

    if (isBinary) {
      upstream.send(data, { binary: true })
    }
  })

  clientWs.on('close', () => {
    console.log('[SixtydbProxy] 客户端断开连接')
    clientClosed = true
    if (upstream.readyState === NodeWebSocket.OPEN) {
      try { upstream.send(JSON.stringify({ type: 'stop' })) } catch { /* ignore */ }
      upstream.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[SixtydbProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    if (upstream.readyState === NodeWebSocket.OPEN) {
      try { upstream.send(JSON.stringify({ type: 'stop' })) } catch { /* ignore */ }
      upstream.close(1000, 'Client error')
    }
  })
}

function formatSixtydbConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return '60db API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return '60db API Key 无权限，请检查账户权限'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 60db 服务地址 api.60db.ai，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 60db 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return '60db 连接被重置，请稍后重试'
  }
  return msg
}

export function attachSixtydbProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleSixtydbConnection)
}
