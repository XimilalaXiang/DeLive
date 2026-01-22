import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, NativeImage, globalShortcut, desktopCapturer, session, dialog, screen } from 'electron'
import fs from 'fs'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import { createServer, IncomingMessage } from 'http'
import { WebSocket as NodeWebSocket, WebSocketServer } from 'ws'
import { URL } from 'url'
import * as pako from 'pako'

// 禁用 GPU 加速以避免某些系统上的问题
// app.disableHardwareAcceleration()

// ============ 火山引擎 WebSocket 代理 ============
// 由于浏览器原生 WebSocket API 不支持设置自定义 HTTP Headers，
// 而火山引擎需要通过 Headers 传递认证信息，因此需要内置代理服务器

// 火山引擎常量
const VOLC_WS_ENDPOINT_BIDI = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'
const VOLC_WS_ENDPOINT_NOSTREAM = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream'
const VOLC_RESOURCE_V1 = 'volc.bigasr.sauc.duration'
const VOLC_RESOURCE_V2 = 'volc.seedasr.sauc.duration'

// 协议常量
const PROTOCOL_VERSION = 0x1
const HEADER_SIZE_UNITS = 0x1
const MSG_TYPE_FULL_CLIENT_REQ = 0x1
const MSG_TYPE_AUDIO_ONLY_CLIENT_REQ = 0x2
const MSG_TYPE_FULL_SERVER_RESP = 0x9
const MSG_TYPE_ERROR_SERVER = 0xF
const SERIALIZE_NONE = 0x0
const SERIALIZE_JSON = 0x1
const COMPRESS_GZIP = 0x1
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
    enable_ddc: config.enableDdc !== false,
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

function handleVolcConnection(clientWs: NodeWebSocket, req: IncomingMessage): void {
  console.log('[VolcProxy] 新客户端连接')
  
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const config: VolcProxyConfig = {
    appKey: url.searchParams.get('appKey') || '',
    accessKey: url.searchParams.get('accessKey') || '',
    language: url.searchParams.get('language') || '',
    modelV2: url.searchParams.get('modelV2') === 'true',
    bidiStreaming: url.searchParams.get('bidiStreaming') !== 'false',
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
    
    clientWs.send(JSON.stringify({ type: 'ready' }))
  })

  volcWs.on('message', (data: Buffer) => {
    if (clientClosed) return
    
    try {
      const arr = new Uint8Array(data)
      if (arr.length < 8) return

      const headerSizeBytes = (arr[0] & 0x0F) * 4
      const msgType = (arr[1] >> 4) & 0x0F
      const flags = arr[1] & 0x0F
      const serialization = (arr[2] >> 4) & 0x0F
      const compression = arr[2] & 0x0F

      if (msgType === MSG_TYPE_FULL_SERVER_RESP) {
        let offset = headerSizeBytes + 4
        if (arr.length < offset + 4) return

        const payloadSize = data.readUInt32BE(offset)
        offset += 4

        if (arr.length < offset + payloadSize) return

        const payloadSlice = arr.slice(offset, offset + payloadSize)
        const payload = compression === COMPRESS_GZIP ? gunzip(payloadSlice) : payloadSlice

        if (serialization === SERIALIZE_JSON) {
          const json = new TextDecoder().decode(payload)
          const result = JSON.parse(json)
          const text = result?.result?.text || ''
          const isFinal = (flags & FLAG_SERVER_FINAL_MASK) === FLAG_SERVER_FINAL_MASK

          console.log(`[VolcProxy] 收到结果 (final=${isFinal}): ${text.substring(0, 50)}...`)

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

  clientWs.on('message', (data: Buffer) => {
    if (!volcReady) {
      console.warn('[VolcProxy] 火山引擎未就绪，忽略音频数据')
      return
    }

    try {
      const str = data.toString()
      if (str.startsWith('{')) {
        const msg = JSON.parse(str)
        if (msg.type === 'audio_end') {
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
}

// 启动内置代理服务器
function startProxyServer(): void {
  const PORT = 3001
  const server = createServer()
  
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/volc'
  })
  
  wss.on('connection', handleVolcConnection)
  
  server.listen(PORT, () => {
    console.log(`🚀 内置代理服务器已启动: http://localhost:${PORT}`)
    console.log(`🔌 火山引擎 WebSocket 代理: ws://localhost:${PORT}/ws/volc`)
  })
  
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`[VolcProxy] 端口 ${PORT} 已被占用，代理服务器可能已在运行`)
    } else {
      console.error('[VolcProxy] 服务器错误:', error)
    }
  })
}

let mainWindow: BrowserWindow | null = null
let captionWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// 字幕窗口状态
let captionEnabled = false
let captionDraggable = false

// 字幕样式配置
interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
}

let captionStyle: CaptionStyle = {
  fontSize: 24,
  fontFamily: 'Microsoft YaHei, sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
  width: 800,
}

// 根据样式计算窗口高度，确保足够容纳指定行数
function computeCaptionHeight(style: CaptionStyle): number {
  const lineHeight = style.fontSize * 1.5
  const contentPadding = 24 // px-? -> py-3 ≈ 12px*2
  const containerPadding = 20 // 容器 padding: 10px * 2
  const controlSpace = 20 // 顶部锁按钮/提示预留
  const height = Math.round(lineHeight * style.maxLines + contentPadding + containerPadding + controlSpace)
  return Math.max(height, 60)
}

// 根据样式和工作区宽度计算窗口宽度
function computeCaptionWidth(style: CaptionStyle, workAreaWidth: number): number {
  const minWidth = 300
  const maxWidth = Math.max(minWidth, workAreaWidth - 20) // 预留边距
  const target = Math.round(style.width || 800)
  return Math.min(Math.max(target, minWidth), maxWidth)
}

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

// ============ 自动更新配置 ============
// 配置自动更新
autoUpdater.autoDownload = false // 不自动下载，让用户确认
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

// 自动更新事件处理
function setupAutoUpdater() {
  // 检查更新出错
  autoUpdater.on('error', (error) => {
    console.error('自动更新错误:', error)
    // 如果是 404 错误（没有发布版本），静默处理，不通知用户
    if (error.message.includes('404') || error.message.includes('latest.yml')) {
      console.log('未找到发布版本，跳过更新检查')
      return
    }
    mainWindow?.webContents.send('update-error', error.message)
  })

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
    mainWindow?.webContents.send('checking-for-update')
  })

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本:', info.version)
    mainWindow?.webContents.send('update-not-available', {
      version: info.version,
    })
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    console.log(`下载进度: ${progress.percent.toFixed(2)}%`)
    mainWindow?.webContents.send('download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    })
    
    // 显示对话框询问用户是否立即安装
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: '更新已就绪',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '点击"立即安装"将关闭应用并安装更新，点击"稍后"将在下次启动时自动安装。',
      buttons: ['立即安装', '稍后'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        // 用户选择立即安装
        isQuitting = true
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })
}

// ============ 字幕窗口 ============
function createCaptionWindow() {
  if (captionWindow) {
    captionWindow.show()
    return
  }

  // 每次创建窗口时重置拖拽状态，避免上一轮解锁状态残留导致新窗口一直不可点
  captionDraggable = false

  // 获取主显示器信息
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: screenWidth, height: screenHeight } = primaryDisplay.workArea

  // 字幕窗口默认位置：屏幕底部中央
  // 根据 maxLines=2 和默认字体大小 24px 计算高度
  // 高度 = (字体大小 * 行高 * 行数) + padding
  // 高度 = (24 * 1.5 * 2) + 20 + 24 = 72 + 44 ≈ 120
  const windowWidth = computeCaptionWidth(captionStyle, screenWidth)
  const windowHeight = computeCaptionHeight(captionStyle)
  const windowX = Math.round(workX + (screenWidth - windowWidth) / 2)
  const windowY = workY + screenHeight - windowHeight - 30 // 距离底部 30px

  captionWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    
    // 透明和无边框
    transparent: true,
    frame: false,
    
    // 始终置顶
    alwaysOnTop: true,
    
    // 不在任务栏显示
    skipTaskbar: true,
    
    // 允许调整大小
    resizable: false,
    
    // 最小尺寸
    minWidth: 300,
    minHeight: 60,
    
    // 无标题
    title: 'DeLive Caption',
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    
    // 不显示在任务切换器中
    focusable: false,
  })

  // 加载字幕页面
  if (isDev) {
    captionWindow.loadURL('http://localhost:5173/caption.html')
  } else {
    captionWindow.loadFile(path.join(__dirname, '../frontend/dist/caption.html'))
  }

  // 默认鼠标穿透
  captionWindow.setIgnoreMouseEvents(true, { forward: true })

  // 窗口关闭时清理
  captionWindow.on('closed', () => {
    captionWindow = null
    captionEnabled = false
    // 通知主窗口字幕已关闭
    mainWindow?.webContents.send('caption-status-changed', false)
  })

  // 发送初始样式
  captionWindow.webContents.on('did-finish-load', () => {
    captionWindow?.webContents.send('caption-style-update', captionStyle)
  })

  captionEnabled = true
  console.log('[Caption] 字幕窗口已创建')
  
  // 启动鼠标位置检测
  startMousePositionCheck()
}

function closeCaptionWindow() {
  if (captionWindow) {
    stopMousePositionCheck()
    captionWindow.close()
    captionWindow = null
    captionEnabled = false
    captionDraggable = false
    console.log('[Caption] 字幕窗口已关闭')
  }
}

function toggleCaptionDraggable(draggable: boolean) {
  captionDraggable = draggable
  if (captionWindow) {
    // 切换鼠标穿透状态
    captionWindow.setIgnoreMouseEvents(!draggable, { forward: true })
    // 切换可聚焦状态
    captionWindow.setFocusable(draggable)
    // 同步交互状态缓存并通知渲染层（上锁时交互应为 false，解锁时为 true）
    currentInteractiveMode = draggable
    captionWindow.webContents.send('caption-interactive-changed', draggable)
    // 通知字幕窗口更新拖拽状态
    captionWindow.webContents.send('caption-draggable-changed', draggable)
    console.log(`[Caption] 拖拽模式: ${draggable ? '开启' : '关闭'}`)
  }
}

// 设置字幕窗口是否可交互（用于悬停时显示设置按钮）
function setCaptionInteractive(interactive: boolean) {
  if (!captionWindow || captionWindow.isDestroyed()) return

  // 如果处于拖拽模式，保持可交互
  if (captionDraggable) return

  // 状态未变化时直接返回，避免重复切换导致抖动
  if (interactive === currentInteractiveMode) return

  try {
    currentInteractiveMode = interactive
    captionWindow.setIgnoreMouseEvents(!interactive, { forward: true })
    captionWindow.setFocusable(interactive)
    // 通知字幕窗口交互状态变化
    captionWindow.webContents.send('caption-interactive-changed', interactive)
    console.log(`[Caption] 交互模式已设置: ${interactive ? '开启' : '关闭'}`)
  } catch (error) {
    console.error('[Caption] 设置交互模式失败:', error)
  }
}

// 鼠标位置检测定时器
let mouseCheckInterval: NodeJS.Timeout | null = null
// 上一次的鼠标是否在区域内的状态
let lastMouseInside = false
// 当前是否处于交互模式（用于避免重复设置）
let currentInteractiveMode = false

// 启动鼠标位置检测
function startMousePositionCheck() {
  if (mouseCheckInterval) {
    console.log('[Caption] 鼠标检测已在运行')
    return
  }
  
  // 重置状态
  lastMouseInside = false
  currentInteractiveMode = false
  
  console.log('[Caption] 启动鼠标位置检测')
  
  mouseCheckInterval = setInterval(() => {
    if (!captionWindow || captionWindow.isDestroyed()) {
      console.log('[Caption] 字幕窗口不存在，停止检测')
      stopMousePositionCheck()
      return
    }
    
    // 拖拽模式下不检测
    if (captionDraggable) return
    
    try {
      const mousePos = screen.getCursorScreenPoint()
      const bounds = captionWindow.getBounds()
      
      // 检查鼠标是否在字幕窗口区域内
      const isInside = 
        mousePos.x >= bounds.x && 
        mousePos.x <= bounds.x + bounds.width &&
        mousePos.y >= bounds.y && 
        mousePos.y <= bounds.y + bounds.height
      
      // 只在状态变化时更新
      if (isInside !== lastMouseInside) {
        console.log(`[Caption] 鼠标状态变化: ${lastMouseInside} -> ${isInside}, 位置: (${mousePos.x}, ${mousePos.y}), 窗口: (${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height})`)
        lastMouseInside = isInside
        setCaptionInteractive(isInside)
      }
    } catch (error) {
      // 窗口可能已关闭
      console.error('[Caption] 鼠标位置检测错误:', error)
    }
  }, 100) // 每 100ms 检查一次
}

// 停止鼠标位置检测
function stopMousePositionCheck() {
  if (mouseCheckInterval) {
    clearInterval(mouseCheckInterval)
    mouseCheckInterval = null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DeLive - 桌面音频实时转录',
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许使用 getDisplayMedia API
      backgroundThrottling: false,
    },
    // 无边框窗口 - 自定义标题栏
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0c0a09',
    show: false, // 先隐藏，等加载完成后显示
  })

  // 存储待处理的 displayMedia 请求回调
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pendingDisplayMediaCallback: ((result: any) => void) | null = null

  // 设置 displayMediaRequestHandler 以支持 getDisplayMedia
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    // 保存回调，等待用户选择
    pendingDisplayMediaCallback = callback
    // 通知渲染进程显示源选择器
    mainWindow?.webContents.send('show-source-picker')
  })

  // 处理用户选择的源
  ipcMain.handle('select-source', async (_event, sourceId: string) => {
    if (!pendingDisplayMediaCallback) return false
    
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
      const selectedSource = sources.find(s => s.id === sourceId)
      
      if (selectedSource) {
        // 使用正确的类型：'loopback' 是系统音频回环
        pendingDisplayMediaCallback({ video: selectedSource, audio: 'loopback' as const })
        pendingDisplayMediaCallback = null
        return true
      } else {
        pendingDisplayMediaCallback({})
        pendingDisplayMediaCallback = null
        return false
      }
    } catch (error) {
      console.error('选择源失败:', error)
      pendingDisplayMediaCallback?.({})
      pendingDisplayMediaCallback = null
      return false
    }
  })

  // 处理取消选择
  ipcMain.handle('cancel-source-selection', () => {
    if (pendingDisplayMediaCallback) {
      pendingDisplayMediaCallback({})
      pendingDisplayMediaCallback = null
    }
  })

  // 加载应用
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 点击关闭按钮时最小化到托盘而不是退出
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 读取托盘图标（兼容 asar 内路径）
function loadTrayIcon(): NativeImage {
  const appPath = app.getAppPath() // dev: 项目根；prod: app.asar
  const candidates = [
    path.join(appPath, 'build', 'icon.ico'),
    path.join(appPath, 'build', 'icon.png'),
  ]

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const buffer = fs.readFileSync(p)
        const img = nativeImage.createFromBuffer(buffer)
        if (!img.isEmpty()) return img
      }
    } catch (error) {
      console.warn('[Tray] 加载图标失败:', p, error)
    }
  }

  console.warn('[Tray] 使用空图标（未找到可用图标文件）')
  return nativeImage.createEmpty()
}

function createTray() {
  const trayIcon = loadTrayIcon()

  tray = new Tray(trayIcon)
  tray.setToolTip('DeLive - 桌面音频实时转录')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      type: 'separator',
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // 点击托盘图标显示窗口
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
    }
  })
}

function registerShortcuts() {
  // 注册全局快捷键 - 显示/隐藏窗口
  const shortcut = 'CommandOrControl+Shift+D'
  
  const toggleWindow = () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  }
  
  // 尝试注册快捷键
  const registered = globalShortcut.register(shortcut, toggleWindow)
  
  if (registered) {
    console.log(`全局快捷键 ${shortcut} 注册成功`)
  } else {
    console.warn(`全局快捷键 ${shortcut} 注册失败，可能被其他程序占用`)
    
    // 尝试备用快捷键
    const backupShortcut = 'CommandOrControl+Alt+D'
    const backupRegistered = globalShortcut.register(backupShortcut, toggleWindow)
    
    if (backupRegistered) {
      console.log(`备用快捷键 ${backupShortcut} 注册成功`)
    } else {
      console.warn(`备用快捷键 ${backupShortcut} 也注册失败`)
    }
  }
  
  // 检查快捷键是否已注册
  console.log(`快捷键 ${shortcut} 已注册: ${globalShortcut.isRegistered(shortcut)}`)
}

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 当尝试运行第二个实例时，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 应用准备就绪
  app.whenReady().then(() => {
    // 启动内置代理服务器（用于火山引擎）
    startProxyServer()
    
    createWindow()
    createTray()
    registerShortcuts()
    
    // 设置自动更新（仅在生产模式下）
    if (!isDev) {
      setupAutoUpdater()
      // 注意：自动检查更新现在由前端控制，根据用户设置决定
      // 应用会在窗口加载完成后通过 IPC 请求检查更新
    }

    app.on('activate', () => {
      // macOS: 点击 dock 图标时重新创建窗口
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前清理
app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
})

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide()
})

// 窗口控制 - 用于自定义标题栏
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

// 开机自启动相关
ipcMain.handle('get-auto-launch', () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set-auto-launch', (_event, enable: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true, // 启动时隐藏窗口（最小化到托盘）
  })
  return app.getLoginItemSettings().openAtLogin
})

// 获取可用的桌面源（屏幕和窗口）
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    })
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || null,
      isScreen: source.id.startsWith('screen:')
    }))
  } catch (error) {
    console.error('获取桌面源失败:', error)
    return []
  }
})

// ============ 自动更新 IPC 处理 ============
// 手动检查更新
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return { error: '开发模式下不支持自动更新' }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { 
      success: true, 
      version: result?.updateInfo.version 
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return { 
      error: error instanceof Error ? error.message : '检查更新失败' 
    }
  }
})

// 下载更新
ipcMain.handle('download-update', async () => {
  if (isDev) {
    return { error: '开发模式下不支持自动更新' }
  }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    console.error('下载更新失败:', error)
    return { 
      error: error instanceof Error ? error.message : '下载更新失败' 
    }
  }
})

// 立即安装更新
ipcMain.handle('install-update', () => {
  isQuitting = true
  autoUpdater.quitAndInstall(false, true)
})

// ============ 字幕窗口 IPC 处理 ============
// 切换字幕窗口显示
ipcMain.handle('caption-toggle', (_event, enable?: boolean) => {
  const shouldEnable = enable !== undefined ? enable : !captionEnabled
  
  if (shouldEnable) {
    createCaptionWindow()
  } else {
    closeCaptionWindow()
  }
  
  return captionEnabled
})

// 获取字幕状态
ipcMain.handle('caption-get-status', () => {
  return {
    enabled: captionEnabled,
    draggable: captionDraggable,
    style: captionStyle,
  }
})

// 更新字幕文字
ipcMain.handle('caption-update-text', (_event, text: string, isFinal: boolean) => {
  if (captionWindow && captionEnabled) {
    captionWindow.webContents.send('caption-text-update', { text, isFinal })
  }
})

// 更新字幕样式
ipcMain.handle('caption-update-style', (_event, newStyle: Partial<CaptionStyle>) => {
  captionStyle = { ...captionStyle, ...newStyle }
  if (captionWindow) {
    captionWindow.webContents.send('caption-style-update', captionStyle)

    // 样式变化后调整窗口高度，防止行数/字体过大被裁剪
    try {
      const targetHeight = computeCaptionHeight(captionStyle)
      const bounds = captionWindow.getBounds()
      const display = screen.getDisplayMatching(bounds)
      const workArea = display.workArea
      const targetWidth = computeCaptionWidth(captionStyle, workArea.width)

      // 保持窗口中心不变，重新计算 x（并做屏幕边界夹取）
      const currentCenterX = bounds.x + bounds.width / 2
      let newX = Math.round(currentCenterX - targetWidth / 2)
      let newY = bounds.y

      const minX = workArea.x
      const minY = workArea.y
      const maxX = workArea.x + Math.max(0, workArea.width - targetWidth - 10)
      const maxY = workArea.y + Math.max(0, workArea.height - targetHeight - 10)

      if (newY > maxY) newY = maxY
      if (newY < minY) newY = minY
      if (newX > maxX) newX = maxX
      if (newX < minX) newX = minX

      captionWindow.setBounds({
        width: targetWidth,
        height: targetHeight,
        x: newX,
        y: newY,
      })
    } catch (error) {
      console.error('[Caption] 调整窗口高度失败:', error)
    }
  }
  return captionStyle
})

// 切换字幕拖拽模式
ipcMain.handle('caption-toggle-draggable', (_event, draggable?: boolean) => {
  const shouldDrag = draggable !== undefined ? draggable : !captionDraggable
  toggleCaptionDraggable(shouldDrag)
  return captionDraggable
})

// 设置字幕窗口是否可交互（用于悬停时显示设置按钮）
ipcMain.handle('caption-set-interactive', (_event, interactive: boolean) => {
  setCaptionInteractive(interactive)
  return true
})

// 从字幕窗口打开主应用设置
ipcMain.handle('caption-open-settings', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    // 通知主窗口打开字幕设置
    mainWindow.webContents.send('open-caption-settings')
  }
  return true
})

// 获取字幕窗口位置和大小
ipcMain.handle('caption-get-bounds', () => {
  if (captionWindow) {
    return captionWindow.getBounds()
  }
  return null
})

// 设置字幕窗口位置和大小
ipcMain.handle('caption-set-bounds', (_event, bounds: { x?: number; y?: number; width?: number; height?: number }) => {
  if (captionWindow) {
    const currentBounds = captionWindow.getBounds()
    const display = screen.getDisplayMatching(currentBounds)
    const workArea = display.workArea

    const targetWidth = bounds.width ?? currentBounds.width
    const targetHeight = bounds.height ?? currentBounds.height

    const maxX = workArea.x + Math.max(0, workArea.width - targetWidth)
    const maxY = workArea.y + Math.max(0, workArea.height - targetHeight)
    const targetX = Math.min(Math.max(workArea.x, bounds.x ?? currentBounds.x), maxX)
    const targetY = Math.min(Math.max(workArea.y, bounds.y ?? currentBounds.y), maxY)

    captionWindow.setBounds({
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
    })
    return true
  }
  return false
})

// 重置字幕窗口位置到默认
ipcMain.handle('caption-reset-position', () => {
  if (captionWindow) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { x: workX, y: workY, width: screenWidth, height: screenHeight } = primaryDisplay.workArea
    const windowWidth = computeCaptionWidth(captionStyle, screenWidth)
    const windowHeight = computeCaptionHeight(captionStyle)
    const windowX = Math.round(workX + (screenWidth - windowWidth) / 2)
    const windowY = workY + screenHeight - windowHeight - 30

    captionWindow.setBounds({
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
    })
    return true
  }
  return false
})
