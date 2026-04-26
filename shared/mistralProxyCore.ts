/**
 * Mistral AI Realtime ASR 代理核心
 *
 * 浏览器 WebSocket 无法设置自定义 HTTP Headers，
 * 而 Mistral Realtime API 需要 Authorization header 认证，
 * 因此通过本地代理转发连接。
 *
 * 协议：
 *   客户端 → 代理：二进制 PCM16 音频 | JSON 控制消息
 *   代理 → 客户端：JSON（ready / partial / final / error）
 *   代理 → Mistral：JSON（input_audio.append base64 / input_audio.end）
 *   Mistral → 代理：JSON（session.created / transcription.text.delta / transcription.done / error）
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const MISTRAL_WS_BASE = 'wss://api.mistral.ai'
const MISTRAL_REALTIME_PATH = '/v1/audio/transcriptions/realtime'
const DEFAULT_MODEL = 'voxtral-mini-transcribe-realtime-2602'

interface MistralProxyConfig {
  apiKey: string
  model?: string
  language?: string
}

function parseProxyConfig(req: IncomingMessage): MistralProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    model: url.searchParams.get('model') || DEFAULT_MODEL,
    language: url.searchParams.get('language') || '',
  }
}

function handleMistralConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[MistralProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[MistralProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const model = config.model || DEFAULT_MODEL
  const wsUrl = `${MISTRAL_WS_BASE}${MISTRAL_REALTIME_PATH}?model=${encodeURIComponent(model)}`

  console.log(`[MistralProxy] 连接到 Mistral: ${MISTRAL_REALTIME_PATH}?model=${model}`)

  const agent = getWsProxyAgent()
  const mistralWs = new NodeWebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'User-Agent': 'DeLive/1.0',
    },
    agent,
  })

  let mistralReady = false
  let clientClosed = false
  let accumulatedText = ''

  mistralWs.on('open', () => {
    console.log('[MistralProxy] Mistral WebSocket 已连接，等待 session.created...')
  })

  mistralWs.on('message', (data: Buffer) => {
    if (clientClosed) return

    try {
      const msg = JSON.parse(data.toString())

      switch (msg.type) {
        case 'session.created':
          console.log('[MistralProxy] Mistral session 已创建')
          mistralReady = true
          accumulatedText = ''
          clientWs.send(JSON.stringify({ type: 'ready' }))
          break

        case 'session.updated':
          console.log('[MistralProxy] Mistral session 已更新')
          break

        case 'transcription.text.delta': {
          const delta = msg.text || ''
          accumulatedText += delta
          clientWs.send(JSON.stringify({
            type: 'partial',
            text: accumulatedText,
          }))
          break
        }

        case 'transcription.segment': {
          const segText = msg.text || ''
          if (segText) {
            console.log(`[MistralProxy] segment: ${segText.substring(0, 60)}`)
          }
          break
        }

        case 'transcription.done': {
          const finalText = accumulatedText
          console.log(`[MistralProxy] 转录完成: ${finalText.substring(0, 60)}`)
          clientWs.send(JSON.stringify({
            type: 'final',
            text: finalText,
          }))
          accumulatedText = ''
          break
        }

        case 'transcription.language':
          console.log(`[MistralProxy] 检测到语言: ${msg.language || 'unknown'}`)
          break

        case 'error': {
          const errMsg = msg.error?.message || msg.message || '未知错误'
          const errCode = msg.error?.code || 'MISTRAL_ERROR'
          console.error(`[MistralProxy] Mistral 错误: ${errCode} - ${errMsg}`)
          clientWs.send(JSON.stringify({
            type: 'error',
            code: errCode,
            message: errMsg,
          }))
          break
        }

        default:
          console.log(`[MistralProxy] 未知事件: ${msg.type}`)
      }
    } catch (error) {
      console.error('[MistralProxy] 解析 Mistral 消息失败:', error)
    }
  })

  mistralWs.on('error', (error) => {
    console.error('[MistralProxy] Mistral WebSocket 错误:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatMistralConnectionError(error),
      }))
      clientWs.close(4002, 'Mistral WebSocket error')
    }
  })

  mistralWs.on('close', (code, reason) => {
    console.log(`[MistralProxy] Mistral WebSocket 关闭: ${code} ${reason}`)
    if (!clientClosed) {
      clientWs.close(code, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!mistralReady) {
      console.warn('[MistralProxy] Mistral 未就绪，忽略数据')
      return
    }

    try {
      const text = data.toString()
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        if (message.type === 'audio_end') {
          mistralWs.send(JSON.stringify({ type: 'input_audio.end' }))
          console.log('[MistralProxy] 发送 input_audio.end')
          return
        }
        if (message.type === 'flush') {
          mistralWs.send(JSON.stringify({ type: 'input_audio.flush' }))
          console.log('[MistralProxy] 发送 input_audio.flush')
          return
        }
      }
    } catch {
      // non-JSON → treat as binary audio
    }

    const audioBytes = new Uint8Array(data)
    const base64Audio = Buffer.from(audioBytes).toString('base64')
    mistralWs.send(JSON.stringify({
      type: 'input_audio.append',
      audio: base64Audio,
    }))
  })

  clientWs.on('close', () => {
    console.log('[MistralProxy] 客户端断开连接')
    clientClosed = true
    if (mistralWs.readyState === NodeWebSocket.OPEN) {
      try {
        mistralWs.send(JSON.stringify({ type: 'input_audio.end' }))
      } catch (error) {
        console.error('[MistralProxy] 发送结束帧失败:', error)
      }
      mistralWs.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[MistralProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    mistralWs.close(1000, 'Client error')
  })
}

function formatMistralConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Mistral API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Mistral API Key 无权限访问实时转录服务，请检查账户权限'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 Mistral 服务地址 api.mistral.ai，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 Mistral 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'Mistral 连接被重置，请稍后重试'
  }

  return msg
}

export function attachMistralProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleMistralConnection)
}
