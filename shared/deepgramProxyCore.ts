/**
 * Deepgram Streaming ASR 代理核心
 *
 * 浏览器 WebSocket 无法设置自定义 HTTP Headers，
 * 而 Deepgram API 需要 Authorization: Token header 认证，
 * 因此通过本地代理转发连接。
 *
 * 协议：
 *   客户端 → 代理：二进制 PCM16 音频 | JSON 控制消息
 *   代理 → 客户端：JSON（ready / partial / final / error）
 *   代理 → Deepgram：二进制 PCM16 音频 | JSON 控制消息
 *   Deepgram → 代理：JSON（Results / Metadata / UtteranceEnd / SpeechStarted）
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const DEEPGRAM_WS_BASE = 'wss://api.deepgram.com'
const DEEPGRAM_LISTEN_PATH = '/v1/listen'
const DEFAULT_MODEL = 'nova-3'

interface DeepgramProxyConfig {
  apiKey: string
  model?: string
  language?: string
}

function parseProxyConfig(req: IncomingMessage): DeepgramProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    model: url.searchParams.get('model') || DEFAULT_MODEL,
    language: url.searchParams.get('language') || '',
  }
}

function buildDeepgramUrl(config: DeepgramProxyConfig): string {
  const params = new URLSearchParams({
    model: config.model || DEFAULT_MODEL,
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
    interim_results: 'true',
    punctuate: 'true',
    smart_format: 'true',
    endpointing: '300',
    utterance_end_ms: '1000',
  })

  if (config.language) {
    params.set('language', config.language)
  }

  return `${DEEPGRAM_WS_BASE}${DEEPGRAM_LISTEN_PATH}?${params.toString()}`
}

function handleDeepgramConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[DeepgramProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[DeepgramProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const wsUrl = buildDeepgramUrl(config)
  console.log(`[DeepgramProxy] 连接到 Deepgram: ${DEEPGRAM_LISTEN_PATH}?model=${config.model}`)

  const agent = getWsProxyAgent()
  const deepgramWs = new NodeWebSocket(wsUrl, {
    headers: {
      Authorization: `Token ${config.apiKey}`,
      'User-Agent': 'DeLive/1.0',
    },
    agent,
  })

  let deepgramReady = false
  let clientClosed = false

  deepgramWs.on('open', () => {
    console.log('[DeepgramProxy] Deepgram WebSocket 已连接')
    deepgramReady = true
    clientWs.send(JSON.stringify({ type: 'ready' }))
  })

  deepgramWs.on('message', (data: Buffer) => {
    if (clientClosed) return

    try {
      const msg = JSON.parse(data.toString())

      switch (msg.type) {
        case 'Results': {
          const alt = msg.channel?.alternatives?.[0]
          const transcript = alt?.transcript || ''
          const isFinal = msg.is_final === true

          if (transcript) {
            console.log(`[DeepgramProxy] ${isFinal ? '最终' : '中间'}结果: ${transcript.substring(0, 60)}`)
            clientWs.send(JSON.stringify({
              type: isFinal ? 'final' : 'partial',
              text: transcript,
              raw: msg,
            }))
          }
          break
        }

        case 'Metadata':
          console.log(`[DeepgramProxy] Metadata: request_id=${msg.request_id}`)
          break

        case 'UtteranceEnd':
          console.log('[DeepgramProxy] UtteranceEnd')
          break

        case 'SpeechStarted':
          console.log('[DeepgramProxy] SpeechStarted')
          break

        default:
          console.log(`[DeepgramProxy] 未知事件: ${msg.type}`)
      }
    } catch (error) {
      console.error('[DeepgramProxy] 解析 Deepgram 消息失败:', error)
    }
  })

  deepgramWs.on('error', (error) => {
    console.error('[DeepgramProxy] Deepgram WebSocket 错误:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatDeepgramConnectionError(error),
      }))
      clientWs.close(4002, 'Deepgram WebSocket error')
    }
  })

  deepgramWs.on('close', (code, reason) => {
    console.log(`[DeepgramProxy] Deepgram WebSocket 关闭: ${code} ${reason}`)
    if (!clientClosed) {
      clientWs.close(code, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!deepgramReady) {
      console.warn('[DeepgramProxy] Deepgram 未就绪，忽略数据')
      return
    }

    try {
      const text = data.toString()
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        if (message.type === 'audio_end') {
          deepgramWs.send(JSON.stringify({ type: 'CloseStream' }))
          console.log('[DeepgramProxy] 发送 CloseStream')
          return
        }
        if (message.type === 'finalize') {
          deepgramWs.send(JSON.stringify({ type: 'Finalize' }))
          console.log('[DeepgramProxy] 发送 Finalize')
          return
        }
        if (message.type === 'keep_alive') {
          deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }))
          return
        }
      }
    } catch {
      // non-JSON → treat as binary audio
    }

    deepgramWs.send(data)
  })

  clientWs.on('close', () => {
    console.log('[DeepgramProxy] 客户端断开连接')
    clientClosed = true
    if (deepgramWs.readyState === NodeWebSocket.OPEN) {
      try {
        deepgramWs.send(JSON.stringify({ type: 'CloseStream' }))
      } catch (error) {
        console.error('[DeepgramProxy] 发送 CloseStream 失败:', error)
      }
      deepgramWs.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[DeepgramProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    deepgramWs.close(1000, 'Client error')
  })
}

function formatDeepgramConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Deepgram API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Deepgram API Key 无权限，请检查账户权限'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 Deepgram 服务地址 api.deepgram.com，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 Deepgram 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'Deepgram 连接被重置，请稍后重试'
  }

  return msg
}

export function attachDeepgramProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleDeepgramConnection)
}
