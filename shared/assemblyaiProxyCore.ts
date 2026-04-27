/**
 * AssemblyAI Streaming ASR 代理核心
 *
 * 浏览器 WebSocket 无法设置自定义 HTTP Headers，
 * 而 AssemblyAI API 需要 Authorization header 认证，
 * 因此通过本地代理转发连接。
 *
 * AssemblyAI v3 协议：
 *   客户端 → 代理：二进制 PCM16 音频 | JSON 控制消息
 *   代理 → 客户端：JSON（ready / partial / final / error）
 *   代理 → AssemblyAI：二进制 PCM16 音频 | JSON 控制消息
 *   AssemblyAI → 代理：JSON（Begin / Turn / Termination）
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const ASSEMBLYAI_WS_BASE = 'wss://streaming.assemblyai.com'
const DEFAULT_MODEL = 'u3-rt-pro'

interface AssemblyAIProxyConfig {
  apiKey: string
  model?: string
  language?: string
}

function parseProxyConfig(req: IncomingMessage): AssemblyAIProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    model: url.searchParams.get('model') || DEFAULT_MODEL,
    language: url.searchParams.get('language') || '',
  }
}

function buildAssemblyAIUrl(config: AssemblyAIProxyConfig): string {
  const params = new URLSearchParams({
    speech_model: config.model || DEFAULT_MODEL,
    sample_rate: '16000',
  })

  return `${ASSEMBLYAI_WS_BASE}/v3/ws?${params.toString()}`
}

function handleAssemblyAIConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[AssemblyAIProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[AssemblyAIProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const wsUrl = buildAssemblyAIUrl(config)
  console.log(`[AssemblyAIProxy] 连接到 AssemblyAI: model=${config.model}`)

  const agent = getWsProxyAgent()
  const aaiWs = new NodeWebSocket(wsUrl, {
    headers: {
      Authorization: config.apiKey,
      'User-Agent': 'DeLive/1.0',
    },
    agent,
  })

  let aaiReady = false
  let clientClosed = false

  const MIN_CHUNK_BYTES = 1600 // 50ms @ 16kHz PCM16 (minimum required by AssemblyAI)
  let audioBuffer = Buffer.alloc(0)

  aaiWs.on('open', () => {
    console.log('[AssemblyAIProxy] AssemblyAI WebSocket 已连接，等待 Begin 事件...')
  })

  aaiWs.on('message', (data: Buffer) => {
    if (clientClosed) return

    try {
      const msg = JSON.parse(data.toString())

      switch (msg.type) {
        case 'Begin': {
          console.log(`[AssemblyAIProxy] Session 开始: id=${msg.id}`)
          aaiReady = true
          clientWs.send(JSON.stringify({ type: 'ready', sessionId: msg.id }))
          break
        }

        case 'Turn': {
          const transcript = msg.transcript || ''
          const endOfTurn = msg.end_of_turn === true

          if (transcript) {
            console.log(`[AssemblyAIProxy] ${endOfTurn ? '最终' : '中间'}结果: ${transcript.substring(0, 60)}`)
            clientWs.send(JSON.stringify({
              type: endOfTurn ? 'final' : 'partial',
              text: transcript,
              raw: msg,
            }))
          }
          break
        }

        case 'Termination': {
          console.log(`[AssemblyAIProxy] Session 结束: audio=${msg.audio_duration_seconds}s`)
          break
        }

        default:
          console.log(`[AssemblyAIProxy] 未知事件: ${msg.type}`)
      }
    } catch (error) {
      console.error('[AssemblyAIProxy] 解析 AssemblyAI 消息失败:', error)
    }
  })

  aaiWs.on('error', (error) => {
    console.error('[AssemblyAIProxy] AssemblyAI WebSocket 错误:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatAssemblyAIConnectionError(error),
      }))
      clientWs.close(4002, 'AssemblyAI WebSocket error')
    }
  })

  aaiWs.on('close', (code, reason) => {
    console.log(`[AssemblyAIProxy] AssemblyAI WebSocket 关闭: ${code} ${reason}`)
    if (!clientClosed) {
      clientWs.close(code, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!aaiReady) {
      console.warn('[AssemblyAIProxy] AssemblyAI 未就绪，忽略数据')
      return
    }

    try {
      const text = data.toString('utf-8')
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        if (message.type === 'audio_end' || message.type === 'terminate') {
          if (audioBuffer.length > 0) {
            aaiWs.send(audioBuffer)
            audioBuffer = Buffer.alloc(0)
          }
          aaiWs.send(JSON.stringify({ type: 'Terminate' }))
          console.log('[AssemblyAIProxy] 发送 Terminate')
          return
        }
      }
    } catch {
      // non-JSON → treat as binary audio
    }

    audioBuffer = Buffer.concat([audioBuffer, Buffer.from(data)])
    if (audioBuffer.length >= MIN_CHUNK_BYTES) {
      aaiWs.send(audioBuffer)
      audioBuffer = Buffer.alloc(0)
    }
  })

  clientWs.on('close', () => {
    console.log('[AssemblyAIProxy] 客户端断开连接')
    clientClosed = true
    if (aaiWs.readyState === NodeWebSocket.OPEN) {
      try {
        if (audioBuffer.length > 0) {
          aaiWs.send(audioBuffer)
          audioBuffer = Buffer.alloc(0)
        }
        aaiWs.send(JSON.stringify({ type: 'Terminate' }))
      } catch (error) {
        console.error('[AssemblyAIProxy] 发送 Terminate 失败:', error)
      }
      aaiWs.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[AssemblyAIProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    aaiWs.close(1000, 'Client error')
  })
}

function formatAssemblyAIConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'AssemblyAI API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'AssemblyAI API Key 无权限，请检查账户权限'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 AssemblyAI 服务地址 streaming.assemblyai.com，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 AssemblyAI 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'AssemblyAI 连接被重置，请稍后重试'
  }

  return msg
}

export function attachAssemblyAIProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleAssemblyAIConnection)
}
