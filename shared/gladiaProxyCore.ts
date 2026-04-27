/**
 * Gladia Streaming ASR 代理核心
 *
 * Gladia 使用两步流程：
 *   1. HTTP POST /v2/live 初始化 session，返回临时 WebSocket URL
 *   2. WebSocket 连接到返回的 URL 发送音频
 *
 * 浏览器无法设置 x-gladia-key header，因此通过本地代理转发。
 *
 *   客户端 → 代理：二进制 PCM16 音频 | JSON 控制消息
 *   代理 → 客户端：JSON（ready / partial / final / error）
 *   代理 → Gladia：HTTP POST 初始化 + WebSocket 二进制音频
 *   Gladia → 代理：JSON（transcript 事件）
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const GLADIA_API_BASE = 'https://api.gladia.io'
const DEFAULT_MODEL = 'solaria-1'

interface GladiaProxyConfig {
  apiKey: string
  model?: string
  language?: string
}

function parseProxyConfig(req: IncomingMessage): GladiaProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    model: url.searchParams.get('model') || DEFAULT_MODEL,
    language: url.searchParams.get('language') || '',
  }
}

async function initGladiaSession(config: GladiaProxyConfig): Promise<string> {
  const body: Record<string, unknown> = {
    encoding: 'wav/pcm',
    bit_depth: 16,
    sample_rate: 16000,
    channels: 1,
    model: config.model || DEFAULT_MODEL,
    endpointing: 0.05,
    maximum_duration_without_endpointing: 5,
    language_config: {
      languages: config.language ? [config.language] : [],
      code_switching: !config.language,
    },
    messages_config: {
      receive_partial_transcripts: true,
      receive_final_transcripts: true,
      receive_speech_events: false,
      receive_pre_processing_events: false,
      receive_realtime_processing_events: false,
      receive_post_processing_events: false,
      receive_acknowledgments: false,
      receive_errors: true,
      receive_lifecycle_events: true,
    },
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  const fetchOptions: RequestInit & { agent?: unknown } = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gladia-key': config.apiKey,
    },
    body: JSON.stringify(body),
  }

  if (proxyUrl) {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent')
      fetchOptions.agent = new HttpsProxyAgent<string>(proxyUrl)
    } catch {
      console.warn('[GladiaProxy] https-proxy-agent not available, connecting directly')
    }
  }

  const response = await fetch(`${GLADIA_API_BASE}/v2/live`, fetchOptions as RequestInit)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Gladia session init failed: ${response.status} ${response.statusText} ${text}`)
  }

  const data = await response.json() as { url: string; id: string }
  console.log(`[GladiaProxy] Session created: id=${data.id}`)
  return data.url
}

function handleGladiaConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[GladiaProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[GladiaProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  let gladiaWs: NodeWebSocket | null = null
  let gladiaReady = false
  let clientClosed = false

  void (async () => {
    try {
      const wsUrl = await initGladiaSession(config)
      console.log(`[GladiaProxy] 连接到 Gladia WebSocket`)

      const agent = getWsProxyAgent()
      gladiaWs = new NodeWebSocket(wsUrl, { agent })

      gladiaWs.on('open', () => {
        console.log('[GladiaProxy] Gladia WebSocket 已连接')
        gladiaReady = true
        if (!clientClosed) {
          clientWs.send(JSON.stringify({ type: 'ready' }))
        }
      })

      gladiaWs.on('message', (data: Buffer) => {
        if (clientClosed) return

        try {
          const msg = JSON.parse(data.toString())

          if (msg.type === 'transcript') {
            const text = msg.transcription || msg.data?.transcription || ''
            if (!text) return

            const isFinal = msg.is_final === true
            console.log(`[GladiaProxy] ${isFinal ? '最终' : '中间'}结果: ${text.substring(0, 60)}`)
            clientWs.send(JSON.stringify({
              type: isFinal ? 'final' : 'partial',
              text,
              raw: msg,
            }))
            return
          }

          if (msg.type === 'error') {
            const errorMsg = msg.data?.message || msg.message || 'Unknown error'
            console.error(`[GladiaProxy] 服务器错误: ${errorMsg}`)
            clientWs.send(JSON.stringify({
              type: 'error',
              message: `Gladia 错误: ${errorMsg}`,
            }))
            return
          }

          if (msg.type === 'lifecycle' || msg.event === 'lifecycle') {
            console.log(`[GladiaProxy] 生命周期事件: ${JSON.stringify(msg).substring(0, 100)}`)
            return
          }

          console.log(`[GladiaProxy] 未知事件: ${msg.type || 'unknown'}`, JSON.stringify(msg).substring(0, 200))
        } catch (error) {
          console.error('[GladiaProxy] 解析 Gladia 消息失败:', error)
        }
      })

      gladiaWs.on('error', (error) => {
        console.error('[GladiaProxy] Gladia WebSocket 错误:', error.message)
        if (!clientClosed) {
          clientWs.send(JSON.stringify({
            type: 'error',
            message: formatGladiaConnectionError(error),
          }))
          clientWs.close(4002, 'Gladia WebSocket error')
        }
      })

      gladiaWs.on('close', (code, reason) => {
        console.log(`[GladiaProxy] Gladia WebSocket 关闭: ${code} ${reason}`)
        if (!clientClosed) {
          clientWs.close(code, reason.toString())
        }
      })
    } catch (error) {
      console.error('[GladiaProxy] Session 初始化失败:', error)
      if (!clientClosed) {
        const err = error as Error
        clientWs.send(JSON.stringify({
          type: 'error',
          message: formatGladiaConnectionError(err),
        }))
        clientWs.close(4003, 'Session init failed')
      }
    }
  })()

  clientWs.on('message', (data: Buffer) => {
    if (!gladiaReady || !gladiaWs) {
      console.warn('[GladiaProxy] Gladia 未就绪，忽略数据')
      return
    }

    try {
      const text = data.toString('utf-8')
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        if (message.type === 'audio_end' || message.type === 'terminate') {
          gladiaWs.send(JSON.stringify({ event: 'stop' }))
          console.log('[GladiaProxy] 发送 stop')
          return
        }
      }
    } catch {
      // non-JSON → binary audio
    }

    gladiaWs.send(data)
  })

  clientWs.on('close', () => {
    console.log('[GladiaProxy] 客户端断开连接')
    clientClosed = true
    if (gladiaWs && gladiaWs.readyState === NodeWebSocket.OPEN) {
      try {
        gladiaWs.send(JSON.stringify({ event: 'stop' }))
      } catch (error) {
        console.error('[GladiaProxy] 发送 stop 失败:', error)
      }
      gladiaWs.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[GladiaProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    if (gladiaWs) {
      gladiaWs.close(1000, 'Client error')
    }
  })
}

function formatGladiaConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key')) {
    return 'Gladia API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Gladia API Key 无权限，请检查账户权限'
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    return 'Gladia API 请求过于频繁，请稍后重试'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 Gladia 服务地址 api.gladia.io，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 Gladia 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'Gladia 连接被重置，请稍后重试'
  }

  return msg
}

export function attachGladiaProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleGladiaConnection)
}
