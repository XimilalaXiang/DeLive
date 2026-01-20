/**
 * 火山引擎 WebSocket 代理
 * 
 * 由于浏览器原生 WebSocket API 不支持设置自定义 HTTP Headers，
 * 而火山引擎需要通过 Headers 传递认证信息（X-Api-App-Key, X-Api-Access-Key 等），
 * 因此需要通过服务器端代理来实现。
 * 
 * 工作流程：
 * 1. 前端连接到本地代理 WebSocket
 * 2. 代理服务器使用 Node.js ws 库连接到火山引擎，设置必要的 Headers
 * 3. 代理双向转发消息
 */

import { WebSocket as NodeWebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { URL } from 'url'
import * as pako from 'pako'

// 火山引擎 WebSocket 端点
const VOLC_WS_ENDPOINT_BIDI = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'
const VOLC_WS_ENDPOINT_NOSTREAM = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream'

// 资源 ID
const VOLC_RESOURCE_V1 = 'volc.bigasr.sauc.duration'
const VOLC_RESOURCE_V2 = 'volc.seedasr.sauc.duration'

// 协议常量
const PROTOCOL_VERSION = 0x1
const HEADER_SIZE_UNITS = 0x1

// 消息类型
const MSG_TYPE_FULL_CLIENT_REQ = 0x1
const MSG_TYPE_AUDIO_ONLY_CLIENT_REQ = 0x2
const MSG_TYPE_FULL_SERVER_RESP = 0x9
const MSG_TYPE_ERROR_SERVER = 0xF

// 序列化方式
const SERIALIZE_NONE = 0x0
const SERIALIZE_JSON = 0x1

// 压缩方式
const COMPRESS_NONE = 0x0
const COMPRESS_GZIP = 0x1

// 标志位
const FLAG_AUDIO_LAST = 0x2
const FLAG_SERVER_FINAL_MASK = 0x3

interface VolcProxyConfig {
  appKey: string
  accessKey: string
  language?: string
  modelV2?: boolean
  bidiStreaming?: boolean
  enableDdc?: boolean
  enableVad?: boolean
  enableNonstream?: boolean
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function gzip(data: Uint8Array): Uint8Array {
  return pako.gzip(data)
}

function gunzip(data: Uint8Array): Uint8Array {
  try {
    return pako.ungzip(data)
  } catch (e) {
    console.error('[VolcProxy] gunzip failed:', e)
    return data
  }
}

function buildClientFrame(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
  payload: Uint8Array
): Buffer {
  const header = Buffer.alloc(4)
  header[0] = ((PROTOCOL_VERSION & 0x0F) << 4) | (HEADER_SIZE_UNITS & 0x0F)
  header[1] = ((messageType & 0x0F) << 4) | (flags & 0x0F)
  header[2] = ((serialization & 0x0F) << 4) | (compression & 0x0F)
  header[3] = 0

  const size = Buffer.alloc(4)
  size.writeUInt32BE(payload.length, 0)

  return Buffer.concat([header, size, Buffer.from(payload)])
}

function buildFullClientRequestJson(config: VolcProxyConfig): string {
  const user = { uid: config.appKey }
  const audio: Record<string, unknown> = {
    format: 'pcm',
    rate: 16000,
    bits: 16,
    channel: 1,
  }
  
  if (config.language) {
    audio.language = config.language
  }

  const request: Record<string, unknown> = {
    model_name: 'bigmodel',
    enable_itn: true,
    enable_punc: true,
    enable_ddc: config.enableDdc !== false, // 默认开启语义顺滑
  }

  if (config.enableNonstream) {
    request.enable_nonstream = true
  }

  if (config.enableVad) {
    request.show_utterances = true
    request.end_window_size = 800
    request.force_to_speech_time = 1000
  }

  return JSON.stringify({ user, audio, request })
}

export function createVolcProxyServer(wss: WebSocketServer): void {
  wss.on('connection', (clientWs: NodeWebSocket, req: IncomingMessage) => {
    console.log('[VolcProxy] 新客户端连接')
    
    // 从 URL 参数获取配置
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const config: VolcProxyConfig = {
      appKey: url.searchParams.get('appKey') || '',
      accessKey: url.searchParams.get('accessKey') || '',
      language: url.searchParams.get('language') || '',
      modelV2: url.searchParams.get('modelV2') === 'true',
      bidiStreaming: url.searchParams.get('bidiStreaming') !== 'false', // 默认开启
      enableDdc: url.searchParams.get('enableDdc') !== 'false',
      enableVad: url.searchParams.get('enableVad') === 'true',
      enableNonstream: url.searchParams.get('enableNonstream') === 'true',
    }

    if (!config.appKey || !config.accessKey) {
      console.error('[VolcProxy] 缺少 appKey 或 accessKey')
      clientWs.close(4001, 'Missing appKey or accessKey')
      return
    }

    const connectId = generateUUID()
    const resourceId = config.modelV2 ? VOLC_RESOURCE_V2 : VOLC_RESOURCE_V1
    const wsUrl = config.bidiStreaming ? VOLC_WS_ENDPOINT_BIDI : VOLC_WS_ENDPOINT_NOSTREAM

    console.log(`[VolcProxy] 连接到火山引擎: ${wsUrl}`)
    console.log(`[VolcProxy] Resource ID: ${resourceId}`)
    console.log(`[VolcProxy] Connect ID: ${connectId}`)

    // 创建到火山引擎的 WebSocket 连接，设置必要的 Headers
    const volcWs = new NodeWebSocket(wsUrl, {
      headers: {
        'X-Api-App-Key': config.appKey,
        'X-Api-Access-Key': config.accessKey,
        'X-Api-Resource-Id': resourceId,
        'X-Api-Connect-Id': connectId,
      },
    })

    let volcReady = false
    let clientClosed = false

    volcWs.on('open', () => {
      console.log('[VolcProxy] 火山引擎 WebSocket 已连接')
      
      // 发送初始配置请求
      const fullRequest = buildFullClientRequestJson(config)
      console.log('[VolcProxy] 发送初始配置:', fullRequest)
      
      const payload = gzip(new TextEncoder().encode(fullRequest))
      const frame = buildClientFrame(
        MSG_TYPE_FULL_CLIENT_REQ,
        0,
        SERIALIZE_JSON,
        COMPRESS_GZIP,
        payload
      )
      
      volcWs.send(frame)
      volcReady = true
      
      // 通知客户端已就绪
      clientWs.send(JSON.stringify({ type: 'ready' }))
    })

    volcWs.on('message', (data: Buffer) => {
      if (clientClosed) return
      
      try {
        // 解析火山引擎响应
        const arr = new Uint8Array(data)
        if (arr.length < 8) return

        const headerSizeBytes = (arr[0] & 0x0F) * 4
        const msgType = (arr[1] >> 4) & 0x0F
        const flags = arr[1] & 0x0F
        const serialization = (arr[2] >> 4) & 0x0F
        const compression = arr[2] & 0x0F

        if (msgType === MSG_TYPE_FULL_SERVER_RESP) {
          let offset = headerSizeBytes + 4 // 跳过 sequence
          if (arr.length < offset + 4) return

          const payloadSize = data.readUInt32BE(offset)
          offset += 4

          if (arr.length < offset + payloadSize) return

          let payload = arr.slice(offset, offset + payloadSize)
          if (compression === COMPRESS_GZIP) {
            payload = gunzip(payload)
          }

          if (serialization === SERIALIZE_JSON) {
            const json = new TextDecoder().decode(payload)
            const result = JSON.parse(json)
            const text = result?.result?.text || ''
            const isFinal = (flags & FLAG_SERVER_FINAL_MASK) === FLAG_SERVER_FINAL_MASK

            console.log(`[VolcProxy] 收到结果 (final=${isFinal}): ${text.substring(0, 50)}...`)

            // 转发给客户端
            clientWs.send(JSON.stringify({
              type: isFinal ? 'final' : 'partial',
              text,
              raw: result,
            }))
          }
        } else if (msgType === MSG_TYPE_ERROR_SERVER) {
          let offset = headerSizeBytes
          if (arr.length < offset + 8) return

          const code = data.readUInt32BE(offset)
          const size = data.readUInt32BE(offset + 4)
          const start = offset + 8
          const end = Math.min(start + size, arr.length)
          const msg = new TextDecoder().decode(arr.slice(start, end))

          console.error(`[VolcProxy] 服务器错误: ${code} - ${msg}`)
          
          clientWs.send(JSON.stringify({
            type: 'error',
            code,
            message: msg,
          }))
        }
      } catch (e) {
        console.error('[VolcProxy] 解析消息失败:', e)
      }
    })

    volcWs.on('error', (error) => {
      console.error('[VolcProxy] 火山引擎 WebSocket 错误:', error)
      if (!clientClosed) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: error.message || 'WebSocket connection error',
        }))
        clientWs.close(4002, 'Volc WebSocket error')
      }
    })

    volcWs.on('close', (code, reason) => {
      console.log(`[VolcProxy] 火山引擎 WebSocket 关闭: ${code} ${reason}`)
      if (!clientClosed) {
        clientWs.close(code, reason.toString())
      }
    })

    // 处理客户端消息
    clientWs.on('message', (data: Buffer) => {
      if (!volcReady) {
        console.warn('[VolcProxy] 火山引擎未就绪，忽略音频数据')
        return
      }

      try {
        // 检查是否是 JSON 控制消息
        const str = data.toString()
        if (str.startsWith('{')) {
          const msg = JSON.parse(str)
          if (msg.type === 'audio_end') {
            // 发送最后一帧标记
            const emptyPayload = gzip(new Uint8Array(0))
            const frame = buildClientFrame(
              MSG_TYPE_AUDIO_ONLY_CLIENT_REQ,
              FLAG_AUDIO_LAST,
              SERIALIZE_NONE,
              COMPRESS_GZIP,
              emptyPayload
            )
            volcWs.send(frame)
            console.log('[VolcProxy] 发送音频结束标记')
            return
          }
        }
      } catch {
        // 不是 JSON，当作二进制音频数据处理
      }

      // 转发音频数据到火山引擎
      const audioData = new Uint8Array(data)
      const payload = gzip(audioData)
      const frame = buildClientFrame(
        MSG_TYPE_AUDIO_ONLY_CLIENT_REQ,
        0,
        SERIALIZE_NONE,
        COMPRESS_GZIP,
        payload
      )
      volcWs.send(frame)
    })

    clientWs.on('close', () => {
      console.log('[VolcProxy] 客户端断开连接')
      clientClosed = true
      if (volcWs.readyState === NodeWebSocket.OPEN) {
        // 发送最后一帧然后关闭
        try {
          const emptyPayload = gzip(new Uint8Array(0))
          const frame = buildClientFrame(
            MSG_TYPE_AUDIO_ONLY_CLIENT_REQ,
            FLAG_AUDIO_LAST,
            SERIALIZE_NONE,
            COMPRESS_GZIP,
            emptyPayload
          )
          volcWs.send(frame)
        } catch (e) {
          console.error('[VolcProxy] 发送结束帧失败:', e)
        }
        volcWs.close(1000, 'Client disconnected')
      }
    })

    clientWs.on('error', (error) => {
      console.error('[VolcProxy] 客户端 WebSocket 错误:', error)
      clientClosed = true
      volcWs.close(1000, 'Client error')
    })
  })
}
