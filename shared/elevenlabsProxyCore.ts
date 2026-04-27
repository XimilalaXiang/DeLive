/**
 * ElevenLabs Scribe v2 Realtime ASR 代理核心
 *
 * 浏览器 WebSocket 无法设置自定义 HTTP Headers，
 * 而 ElevenLabs API 需要 xi-api-key header 认证，
 * 因此通过本地代理转发连接。
 *
 * ElevenLabs Realtime STT 协议：
 *   客户端 → 代理：二进制 PCM16 音频 | JSON 控制消息
 *   代理 → 客户端：JSON（ready / partial / final / error）
 *   代理 → ElevenLabs：JSON { message_type: "input_audio_chunk", audio_base_64: base64, commit, sample_rate }
 *   ElevenLabs → 代理：JSON（session_started / partial_transcript / committed_transcript / ...）
 */

import type { IncomingMessage } from 'http'
import { URL } from 'url'
import { WebSocket as NodeWebSocket, type WebSocketServer } from 'ws'
import { getWsProxyAgent } from './proxyAgent'

const ELEVENLABS_WS_BASE = 'wss://api.elevenlabs.io'
const DEFAULT_MODEL = 'scribe_v2_realtime'

interface ElevenLabsProxyConfig {
  apiKey: string
  model?: string
  language?: string
}

function parseProxyConfig(req: IncomingMessage): ElevenLabsProxyConfig {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  return {
    apiKey: url.searchParams.get('apiKey') || '',
    model: url.searchParams.get('model') || DEFAULT_MODEL,
    language: url.searchParams.get('language') || '',
  }
}

function buildElevenLabsUrl(config: ElevenLabsProxyConfig): string {
  const params = new URLSearchParams({
    model_id: config.model || DEFAULT_MODEL,
    encoding: 'pcm_16000',
    include_timestamps: 'true',
  })

  if (config.language) {
    params.set('language_code', config.language)
  }

  return `${ELEVENLABS_WS_BASE}/v1/speech-to-text/realtime?${params.toString()}`
}

function handleElevenLabsConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[ElevenLabsProxy] 新客户端连接')

  const config = parseProxyConfig(req)
  if (!config.apiKey) {
    console.error('[ElevenLabsProxy] 缺少 apiKey')
    clientWs.close(4001, 'Missing apiKey')
    return
  }

  const wsUrl = buildElevenLabsUrl(config)
  console.log(`[ElevenLabsProxy] 连接到 ElevenLabs: model=${config.model}`)

  const agent = getWsProxyAgent()
  const elWs = new NodeWebSocket(wsUrl, {
    headers: {
      'xi-api-key': config.apiKey,
      'User-Agent': 'DeLive/1.0',
    },
    agent,
  })

  let elReady = false
  let clientClosed = false

  elWs.on('open', () => {
    console.log('[ElevenLabsProxy] ElevenLabs WebSocket 已连接，等待 session_started...')
  })

  elWs.on('message', (data: Buffer) => {
    if (clientClosed) return

    try {
      const msg = JSON.parse(data.toString())
      const msgType = msg.message_type || msg.type

      switch (msgType) {
        case 'session_started': {
          console.log(`[ElevenLabsProxy] Session 开始: id=${msg.session_id}`)
          elReady = true
          clientWs.send(JSON.stringify({ type: 'ready' }))
          break
        }

        case 'partial_transcript': {
          const text = msg.text || ''
          if (text) {
            console.log(`[ElevenLabsProxy] 中间结果: ${text.substring(0, 60)}`)
            clientWs.send(JSON.stringify({
              type: 'partial',
              text,
              raw: msg,
            }))
          }
          break
        }

        case 'committed_transcript':
        case 'committed_transcript_with_timestamps': {
          const text = msg.text || ''
          if (text) {
            console.log(`[ElevenLabsProxy] 最终结果: ${text.substring(0, 60)}`)
            clientWs.send(JSON.stringify({
              type: 'final',
              text,
              raw: msg,
            }))
          }
          break
        }

        case 'error': {
          const errorCode = msg.error_code || msg.code || 'unknown'
          const errorMsg = msg.error_message || msg.message || 'Unknown error'
          console.error(`[ElevenLabsProxy] 服务器错误: ${errorCode} - ${errorMsg}`)
          clientWs.send(JSON.stringify({
            type: 'error',
            message: `ElevenLabs 错误: ${errorCode} - ${errorMsg}`,
          }))
          break
        }

        default:
          console.log(`[ElevenLabsProxy] 未知事件: ${msgType}`, JSON.stringify(msg).substring(0, 200))
      }
    } catch (error) {
      console.error('[ElevenLabsProxy] 解析 ElevenLabs 消息失败:', error)
    }
  })

  elWs.on('error', (error) => {
    console.error('[ElevenLabsProxy] ElevenLabs WebSocket 错误:', error.message)
    if (!clientClosed) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: formatElevenLabsConnectionError(error),
      }))
      clientWs.close(4002, 'ElevenLabs WebSocket error')
    }
  })

  elWs.on('close', (code, reason) => {
    console.log(`[ElevenLabsProxy] ElevenLabs WebSocket 关闭: ${code} ${reason}`)
    if (!clientClosed) {
      clientWs.close(code, reason.toString())
    }
  })

  clientWs.on('message', (data: Buffer) => {
    if (!elReady) {
      console.warn('[ElevenLabsProxy] ElevenLabs 未就绪，忽略数据')
      return
    }

    let isBinary = true
    try {
      const text = data.toString('utf-8')
      if (text.startsWith('{')) {
        const message = JSON.parse(text)
        isBinary = false
        if (message.type === 'audio_end' || message.type === 'terminate') {
          elWs.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: '',
            commit: true,
            sample_rate: 16000,
          }))
          console.log('[ElevenLabsProxy] 发送 commit (最终提交)')
          return
        }
      }
    } catch {
      // non-JSON → binary audio
    }

    if (isBinary) {
      const base64Audio = Buffer.from(data).toString('base64')
      elWs.send(JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: base64Audio,
        commit: false,
        sample_rate: 16000,
      }))
    }
  })

  clientWs.on('close', () => {
    console.log('[ElevenLabsProxy] 客户端断开连接')
    clientClosed = true
    if (elWs.readyState === NodeWebSocket.OPEN) {
      elWs.close(1000, 'Client disconnected')
    }
  })

  clientWs.on('error', (error) => {
    console.error('[ElevenLabsProxy] 客户端 WebSocket 错误:', error)
    clientClosed = true
    elWs.close(1000, 'Client error')
  })
}

function formatElevenLabsConnectionError(error: Error): string {
  const msg = error.message || 'WebSocket connection error'
  const lower = msg.toLowerCase()

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'ElevenLabs API Key 无效或已过期，请检查 API Key 设置'
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'ElevenLabs API Key 无权限，请检查账户权限'
  }
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
    return '无法解析 ElevenLabs 服务地址 api.elevenlabs.io，请检查网络连接'
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return '连接 ElevenLabs 超时，请检查网络连通性'
  }
  if (lower.includes('econnreset') || lower.includes('socket hang up')) {
    return 'ElevenLabs 连接被重置，请稍后重试'
  }

  return msg
}

export function attachElevenLabsProxyServer(wss: WebSocketServer): void {
  wss.on('connection', handleElevenLabsConnection)
}
