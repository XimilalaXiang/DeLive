import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, NativeImage, globalShortcut, desktopCapturer, session, dialog, screen } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import AdmZip from 'adm-zip'
import { autoUpdater } from 'electron-updater'
import { createServer, IncomingMessage } from 'http'
import { WebSocket as NodeWebSocket, WebSocketServer } from 'ws'
import { URL } from 'url'
import * as pako from 'pako'

// 禁用 GPU 加速以避免某些系统上的问题
// app.disableHardwareAcceleration()

// ============ 跨平台音频捕获支持 ============
// 启用各平台的系统音频 loopback 支持
if (process.platform === 'darwin') {
  // macOS 13+: 启用 ScreenCaptureKit 音频捕获
  app.commandLine.appendSwitch('enable-features', 'ScreenCaptureKitAudio,ScreenCaptureKitStreamPickerSonoma')
}
if (process.platform === 'linux') {
  // Linux: 启用 PulseAudio loopback 系统音频捕获
  app.commandLine.appendSwitch('enable-features', 'PulseaudioLoopbackForScreenShare')
}

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pendingDisplayMediaCallback: ((result: any) => void) | null = null
let lastSelectedSourceId: string | null = null

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
  fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
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

// `forward` option for setIgnoreMouseEvents is only supported on Windows and macOS.
// On Linux the polling-based startMousePositionCheck() handles hover detection instead.
const SUPPORTS_MOUSE_FORWARD = process.platform !== 'linux'

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

function isAutoUpdateSupported(): boolean {
  // electron-updater 在 Linux 上仅对 AppImage 具备稳定支持
  if (process.platform !== 'linux') return true
  return Boolean(process.env.APPIMAGE)
}

function isAutoLaunchSupported(): boolean {
  return process.platform === 'win32' || process.platform === 'darwin'
}

type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

interface LocalRuntimeDefinition {
  id: string
  displayName: string
  modelsSubdir: string
  binariesSubdir: string
  binaryFileNames: string[]
}

interface LocalRuntimeSnapshot {
  runtimeId: string
  displayName: string
  status: LocalRuntimeStatus
  available: boolean
  modelsPath: string
  binaryPath: string | null
  baseUrl: string
  message?: string
}

interface LocalRuntimeState {
  status: LocalRuntimeStatus
  process?: ChildProcess
  launchConfigHash?: string
  binaryPath?: string | null
  baseUrl?: string
  lastError?: string
  lastLogs?: string[]
}

interface LocalRuntimeLaunchOptions {
  binaryPath?: string
  modelPath?: string
  port?: number
}

interface ResolvedLocalRuntimeLaunchOptions {
  binaryPath: string | null
  modelPath: string
  port: number
  baseUrl: string
}

function getRuntimeBinaryFileNames(): string[] {
  if (process.platform === 'win32') {
    return ['whisper-server.exe', 'server.exe']
  }
  return ['whisper-server', 'server']
}

const localRuntimeDefinitions: Record<string, LocalRuntimeDefinition> = {
  whisper_cpp: {
    id: 'whisper_cpp',
    displayName: 'whisper.cpp',
    modelsSubdir: path.join('local-runtimes', 'whisper_cpp', 'models'),
    binariesSubdir: path.join('local-runtimes', 'whisper_cpp', 'bin'),
    binaryFileNames: getRuntimeBinaryFileNames(),
  },
}

const localRuntimeStates = new Map<string, LocalRuntimeState>()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fileExists(targetPath: string | undefined | null): boolean {
  if (!targetPath) return false
  try {
    return fs.existsSync(targetPath)
  } catch {
    return false
  }
}

function getLocalRuntimeDefinition(runtimeId: string): LocalRuntimeDefinition | null {
  return localRuntimeDefinitions[runtimeId] || null
}

function getLocalRuntimeModelsPath(runtimeId: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const modelsPath = path.join(app.getPath('userData'), definition.modelsSubdir)
  fs.mkdirSync(modelsPath, { recursive: true })
  return modelsPath
}

function getLocalRuntimeBinariesPath(runtimeId: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const binariesPath = path.join(app.getPath('userData'), definition.binariesSubdir)
  fs.mkdirSync(binariesPath, { recursive: true })
  return binariesPath
}

function getLocalRuntimeModelFiles(runtimeId: string): string[] {
  const modelsPath = getLocalRuntimeModelsPath(runtimeId)

  try {
    const entries = fs.readdirSync(modelsPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(modelsPath, entry.name))
      .filter((filePath) => {
        const ext = path.extname(filePath).toLowerCase()
        return ext === '.bin' || ext === '.gguf'
      })
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.warn('[LocalRuntime] 读取模型目录失败:', modelsPath, error)
    return []
  }
}

function resolveUniqueFilePath(directory: string, fileName: string): string {
  const parsed = path.parse(fileName)
  let candidate = path.join(directory, fileName)
  let counter = 1

  while (fileExists(candidate)) {
    candidate = path.join(directory, `${parsed.name} (${counter})${parsed.ext}`)
    counter += 1
  }

  return candidate
}

function getFileNameFromUrl(urlString: string, fallback: string): string {
  try {
    const parsed = new URL(urlString)
    const pathname = parsed.pathname.split('/').filter(Boolean)
    const candidate = pathname[pathname.length - 1]
    return candidate || fallback
  } catch {
    return fallback
  }
}

async function downloadFileToPath(urlString: string, targetPath: string): Promise<void> {
  const response = await fetch(urlString)
  if (!response.ok || !response.body) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `下载失败: HTTP ${response.status}`)
  }

  await pipeline(
    Readable.fromWeb(response.body as any),
    fs.createWriteStream(targetPath)
  )
}

function installRuntimeBinaryFile(runtimeId: string, sourcePath: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const binariesPath = getLocalRuntimeBinariesPath(runtimeId)
  const canonicalBinaryName = definition.binaryFileNames[0]
  const targetPath = path.join(binariesPath, canonicalBinaryName)
  const sourceExt = path.extname(sourcePath).toLowerCase()

  if (sourceExt === '.zip') {
    const zip = new AdmZip(sourcePath)
    const entries = zip.getEntries()
    const binaryEntry = entries.find((entry) => {
      if (entry.isDirectory) return false
      const normalized = entry.entryName.replace(/\\/g, '/')
      return definition.binaryFileNames.some((fileName) => normalized.endsWith(fileName))
    })

    if (!binaryEntry) {
      throw new Error(`压缩包中未找到 ${canonicalBinaryName}`)
    }

    fs.writeFileSync(targetPath, binaryEntry.getData())
  } else {
    fs.copyFileSync(sourcePath, targetPath)
  }

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(targetPath, 0o755)
    } catch (error) {
      console.warn('[LocalRuntime] 设置 binary 可执行权限失败:', targetPath, error)
    }
  }

  return targetPath
}

function resolveLocalRuntimeBinary(runtimeId: string, options?: LocalRuntimeLaunchOptions): string | null {
  const userBinaryPath = options?.binaryPath?.trim()
  if (userBinaryPath && fileExists(userBinaryPath)) {
    return userBinaryPath
  }

  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    return null
  }

  const candidates: string[] = []

  const managedBinariesPath = getLocalRuntimeBinariesPath(runtimeId)
  for (const fileName of definition.binaryFileNames) {
    candidates.push(path.join(managedBinariesPath, fileName))
  }

  for (const fileName of definition.binaryFileNames) {
    const relativePath = path.join('local-runtimes', definition.id, fileName)
    candidates.push(path.join(process.resourcesPath, relativePath))
    candidates.push(path.join(app.getAppPath(), relativePath))
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch (error) {
      console.warn('[LocalRuntime] 检查二进制失败:', candidate, error)
    }
  }

  return null
}

function getLocalRuntimeMessage(runtimeId: string, state: LocalRuntimeState, available: boolean): string {
  if (state.lastError) {
    return state.lastError
  }

  if (!available) {
    return '未找到本地 runtime 二进制。你可以导入 binary 到应用目录，或手动填写 binaryPath。'
  }

  switch (state.status) {
    case 'running':
      return '本地 runtime 正在运行'
    case 'starting':
      return '本地 runtime 正在启动'
    case 'error':
      return '本地 runtime 启动失败'
    default:
      return '本地 runtime 已就绪，后续可接入真实二进制启动流程。'
  }
}

function normalizeLocalRuntimeLaunchOptions(
  runtimeId: string,
  options: LocalRuntimeLaunchOptions = {}
): ResolvedLocalRuntimeLaunchOptions {
  const binaryPath = resolveLocalRuntimeBinary(runtimeId, options)
  const modelPath = options.modelPath?.trim() || ''
  const portValue = typeof options.port === 'number' ? options.port : Number(options.port)
  const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : 8177
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    binaryPath,
    modelPath,
    port,
    baseUrl,
  }
}

function getLocalRuntimeSnapshot(
  runtimeId: string,
  options: LocalRuntimeLaunchOptions = {}
): LocalRuntimeSnapshot {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const state = localRuntimeStates.get(runtimeId) || { status: 'stopped' as LocalRuntimeStatus }
  const resolved = normalizeLocalRuntimeLaunchOptions(runtimeId, options)
  const binaryPath = state.binaryPath || resolved.binaryPath
  const available = Boolean(binaryPath)
  const modelsPath = getLocalRuntimeModelsPath(runtimeId)

  return {
    runtimeId,
    displayName: definition.displayName,
    status: state.status,
    available,
    modelsPath,
    binaryPath,
    baseUrl: state.baseUrl || resolved.baseUrl,
    message: getLocalRuntimeMessage(runtimeId, state, available),
  }
}

function appendRuntimeLog(runtimeId: string, line: string): void {
  const existingState = localRuntimeStates.get(runtimeId) || { status: 'stopped' as LocalRuntimeStatus }
  const lastLogs = [...(existingState.lastLogs || []), line].slice(-20)
  localRuntimeStates.set(runtimeId, {
    ...existingState,
    lastLogs,
  })
}

async function waitForRuntimeReady(baseUrl: string, timeoutMs = 20000): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    for (const endpoint of ['/', '/inference']) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 1000)
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: endpoint === '/' ? 'GET' : 'OPTIONS',
            signal: controller.signal,
          })

          if (response.status < 500) {
            return
          }
        } finally {
          clearTimeout(timeout)
        }
      } catch {
        // try next endpoint
      }
    }

    await delay(300)
  }

  throw new Error('本地 runtime 启动超时')
}

function getWhisperCppLaunchArgs(resolved: ResolvedLocalRuntimeLaunchOptions): string[] {
  return [
    '--host', '127.0.0.1',
    '--port', String(resolved.port),
    '-m', resolved.modelPath,
  ]
}

async function stopLocalRuntimeProcess(runtimeId: string): Promise<void> {
  const currentState = localRuntimeStates.get(runtimeId)
  const processRef = currentState?.process
  if (!processRef) {
    localRuntimeStates.set(runtimeId, {
      ...(currentState || { status: 'stopped' as LocalRuntimeStatus }),
      status: 'stopped',
      process: undefined,
    })
    return
  }

  localRuntimeStates.set(runtimeId, {
    ...(currentState || { status: 'stopped' as LocalRuntimeStatus }),
    status: 'stopped',
    process: processRef,
  })

  await new Promise<void>((resolve) => {
    const exitHandler = () => resolve()
    processRef.once('exit', exitHandler)
    try {
      processRef.kill()
    } catch {
      resolve()
      return
    }

    setTimeout(() => {
      processRef.removeListener('exit', exitHandler)
      resolve()
    }, 3000)
  })

  const nextState = localRuntimeStates.get(runtimeId) || currentState
  localRuntimeStates.set(runtimeId, {
    ...(nextState || { status: 'stopped' as LocalRuntimeStatus }),
    status: 'stopped',
    process: undefined,
  })
}

async function startLocalRuntimeProcess(
  runtimeId: string,
  options: LocalRuntimeLaunchOptions = {}
): Promise<LocalRuntimeSnapshot> {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const resolved = normalizeLocalRuntimeLaunchOptions(runtimeId, options)
  if (!resolved.binaryPath) {
    localRuntimeStates.set(runtimeId, {
      status: 'error',
      lastError: '未找到 runtime 二进制，请填写 binaryPath 或放置已打包二进制。',
      baseUrl: resolved.baseUrl,
      binaryPath: null,
    })
    return getLocalRuntimeSnapshot(runtimeId, options)
  }

  if (!resolved.modelPath) {
    localRuntimeStates.set(runtimeId, {
      status: 'error',
      lastError: '请先填写模型文件路径',
      baseUrl: resolved.baseUrl,
      binaryPath: resolved.binaryPath,
    })
    return getLocalRuntimeSnapshot(runtimeId, options)
  }

  if (!fileExists(resolved.modelPath)) {
    localRuntimeStates.set(runtimeId, {
      status: 'error',
      lastError: `模型文件不存在: ${resolved.modelPath}`,
      baseUrl: resolved.baseUrl,
      binaryPath: resolved.binaryPath,
    })
    return getLocalRuntimeSnapshot(runtimeId, options)
  }

  const configHash = JSON.stringify({
    binaryPath: resolved.binaryPath,
    modelPath: resolved.modelPath,
    port: resolved.port,
  })
  const existingState = localRuntimeStates.get(runtimeId)
  if (existingState?.process && !existingState.process.killed && existingState.launchConfigHash === configHash && existingState.status === 'running') {
    return getLocalRuntimeSnapshot(runtimeId, options)
  }

  if (existingState?.process) {
    await stopLocalRuntimeProcess(runtimeId)
  }

  localRuntimeStates.set(runtimeId, {
    status: 'starting',
    launchConfigHash: configHash,
    binaryPath: resolved.binaryPath,
    baseUrl: resolved.baseUrl,
    lastLogs: [],
  })

  const child = spawn(resolved.binaryPath, getWhisperCppLaunchArgs(resolved), {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  child.stdout.on('data', (data: Buffer) => {
    const text = data.toString().trim()
    if (text) {
      appendRuntimeLog(runtimeId, `[stdout] ${text}`)
    }
  })

  child.stderr.on('data', (data: Buffer) => {
    const text = data.toString().trim()
    if (text) {
      appendRuntimeLog(runtimeId, `[stderr] ${text}`)
    }
  })

  child.on('exit', (code, signal) => {
    const previousState = localRuntimeStates.get(runtimeId) || { status: 'stopped' as LocalRuntimeStatus }
    const lastLogs = previousState.lastLogs || []
    const latestLog = lastLogs[lastLogs.length - 1]
    localRuntimeStates.set(runtimeId, {
      ...previousState,
      status: previousState.status === 'stopped' ? 'stopped' : 'error',
      process: undefined,
      lastError: code === 0 && previousState.status === 'stopped'
        ? undefined
        : `runtime 进程已退出 (code=${code ?? 'null'}, signal=${signal ?? 'null'})${latestLog ? `；最近日志: ${latestLog}` : ''}`,
    })
  })

  localRuntimeStates.set(runtimeId, {
    status: 'starting',
    process: child,
    launchConfigHash: configHash,
    binaryPath: resolved.binaryPath,
    baseUrl: resolved.baseUrl,
    lastLogs: [],
  })

  try {
    await waitForRuntimeReady(resolved.baseUrl)
    const currentState = localRuntimeStates.get(runtimeId) || { status: 'starting' as LocalRuntimeStatus }
    localRuntimeStates.set(runtimeId, {
      ...currentState,
      status: 'running',
      process: child,
      launchConfigHash: configHash,
      binaryPath: resolved.binaryPath,
      baseUrl: resolved.baseUrl,
      lastError: undefined,
    })
  } catch (error) {
    await stopLocalRuntimeProcess(runtimeId)
    const currentState = localRuntimeStates.get(runtimeId) || { status: 'error' as LocalRuntimeStatus }
    localRuntimeStates.set(runtimeId, {
      ...currentState,
      status: 'error',
      process: undefined,
      launchConfigHash: configHash,
      binaryPath: resolved.binaryPath,
      baseUrl: resolved.baseUrl,
      lastError: error instanceof Error ? error.message : 'runtime 启动失败',
    })
  }

  return getLocalRuntimeSnapshot(runtimeId, options)
}

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
    const isNoReleaseError =
      error.message.includes('404') ||
      /latest(?:-[a-z]+)?\.yml/i.test(error.message)
    if (isNoReleaseError) {
      console.log('未找到发布版本，跳过更新检查')
      return
    }
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', error.message)
  })

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('checking-for-update')
  })

  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-not-available', {
      version: info.version,
    })
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    console.log(`下载进度: ${progress.percent.toFixed(2)}%`)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', {
      version: info.version,
    })

    const msgBoxOptions = {
      type: 'info' as const,
      title: '更新已就绪',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '点击"立即安装"将关闭应用并安装更新，点击"稍后"将在下次启动时自动安装。',
      buttons: ['立即安装', '稍后'],
      defaultId: 0,
      cancelId: 1,
    }
    const msgBoxPromise = mainWindow && !mainWindow.isDestroyed()
      ? dialog.showMessageBox(mainWindow, msgBoxOptions)
      : dialog.showMessageBox(msgBoxOptions)
    msgBoxPromise.then((result) => {
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

    // 透明和无边框（Linux 无合成器时透明可能不生效，使用半透明背景 fallback）
    transparent: process.platform !== 'linux',
    ...(process.platform === 'linux' ? { backgroundColor: '#000000CC' } : {}),
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
  captionWindow.setIgnoreMouseEvents(true, SUPPORTS_MOUSE_FORWARD ? { forward: true } : undefined)

  // 窗口关闭时清理
  captionWindow.on('closed', () => {
    captionWindow = null
    captionEnabled = false
    // 通知主窗口字幕已关闭
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('caption-status-changed', false)
  })

  // 发送初始样式
  captionWindow.webContents.on('did-finish-load', () => {
    if (captionWindow && !captionWindow.isDestroyed()) captionWindow.webContents.send('caption-style-update', captionStyle)
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
  if (captionWindow && !captionWindow.isDestroyed()) {
    // 切换鼠标穿透状态
    captionWindow.setIgnoreMouseEvents(!draggable, SUPPORTS_MOUSE_FORWARD ? { forward: true } : undefined)
    // 切换可聚焦状态
    captionWindow.setFocusable(draggable)
    // 确保始终不在任务栏显示
    captionWindow.setSkipTaskbar(true)
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
    captionWindow.setIgnoreMouseEvents(!interactive, SUPPORTS_MOUSE_FORWARD ? { forward: true } : undefined)
    captionWindow.setFocusable(interactive)
    // 确保始终不在任务栏显示
    captionWindow.setSkipTaskbar(true)
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

function isTrayReady(): boolean {
  return tray !== null && !tray.isDestroyed()
}

function createWindow() {
  // Windows 任务栏应用 ID
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.delive.app')
  }

  // 窗口/任务栏图标路径
  const windowIconPath = findIconPath()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DeLive - 桌面音频实时转录',
    icon: windowIconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 允许使用 getDisplayMedia API
      backgroundThrottling: false,
    },
    // 无边框窗口 - 自定义标题栏
    frame: false,
    // macOS: 使用 hiddenInset 获得更好的红绿灯位置；其他平台使用 hidden
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // macOS: 设置红绿灯位置，避免与自定义标题栏重叠
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 10 } } : {}),
    backgroundColor: '#0c0a09',
    show: false, // 先隐藏，等加载完成后显示
  })

  // 设置 displayMediaRequestHandler 以支持 getDisplayMedia
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    // 如果有上次选择的源，尝试自动复用（音频设备切换时的自动重连）
    if (lastSelectedSourceId) {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
        const savedSource = sources.find(s => s.id === lastSelectedSourceId)
        if (savedSource) {
          console.log('[DisplayMedia] 自动复用上次选择的源:', lastSelectedSourceId)
          // 所有平台都使用 loopback 音频
          // Windows: 原生支持
          // macOS 13+: 通过 ScreenCaptureKit (已启用 feature flag)
          // Linux: 通过 PulseAudio loopback (已启用 feature flag)
          callback({ video: savedSource, audio: 'loopback' as const })
          return
        }
        console.log('[DisplayMedia] 上次选择的源已不可用，显示选择器')
      } catch (error) {
        console.error('[DisplayMedia] 自动复用源失败:', error)
      }
    }

    // 首次选择或上次的源不可用，显示选择器
    pendingDisplayMediaCallback = callback
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('show-source-picker')
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
    if (!isQuitting && isTrayReady()) {
      event.preventDefault()
      mainWindow?.hide()
      // macOS: 隐藏窗口时同时隐藏 Dock 图标
      if (process.platform === 'darwin') {
        app.dock?.hide()
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 处理用户选择的源（放在 createWindow 外，避免 macOS 重新创建窗口时重复注册 handler）
ipcMain.removeHandler('select-source')
ipcMain.handle('select-source', async (_event, sourceId: string) => {
  if (!pendingDisplayMediaCallback) return false

  try {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
    const selectedSource = sources.find(s => s.id === sourceId)

    if (selectedSource) {
      // 记住选择的源
      lastSelectedSourceId = sourceId
      // 使用正确的类型：'loopback' 是系统音频回环
      // 所有平台都使用 loopback 音频
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
ipcMain.removeHandler('cancel-source-selection')
ipcMain.handle('cancel-source-selection', () => {
  if (pendingDisplayMediaCallback) {
    pendingDisplayMediaCallback({})
    pendingDisplayMediaCallback = null
  }
})

// 内嵌 32x32 PNG 图标（base64），作为最终 fallback
// 确保在任何安装/更新场景下托盘图标都能正常显示
const EMBEDDED_ICON_32_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAADjklEQVR4nNWXS08TURSAB6addjrT4NrgFqOJaX0sNMaKGx8b97ox+ke6FApSikIf9EEBQetajY+EqPggdkAoInTaTumUlxtjtLpAPeZOO7etdF5aFp7kLun3zTnn3nMgiP8uEkDaw8X9bLjgYoaFy+iw4ZzLHsp2EG5o3R0oQIttRLzARMUwE139yERXgYmgkwcmnAdmWADbcA7oUG6LDmbCtgB/Hv1NU9j2ePEEExNfsDER2GgBlOC2EDpZsAWzQAczYA3wMxY/3/n35CkwsSPiLQlsEE4HMkD7eaD9abAOpn2Ee8pkiN0WE/awMfHJv8LpoTRYh1bAOrj8mAhm2/TRE0CyseKD5sElAbDe+vBYVybYJqS9ARysNz+A5eaSTwNecBmBH7snwtF7Bb1wsAwsgcWXOtOYDtDCRAuvjHz51rcf0tENH3gPlv7UTMMrahsRLxhNe2n7l3RkuD2QhtvLn+Ha0/XGcN8iWPoXweJNndshwMTEiBq8LSxA+2i+ruZYoPLljgkBULxYKynCqf4UUH0LoXq6G1rZaGFT7cvv8F8k2L64gGsuC8hpd07kJIHptZIy3JsCs3dhi0gkSMy3x4sdWmmf3vgu/fjhuwVccyxQqbnzdrYqoACnvAsoA0D1zB6sSb/QqVVzLHBnFde8KlBuOOd4rYAy3Nw3D1Tv/MWqAJpqGg03vS4L5HHNywI/ccM5agVU4OYb78DcM3ulKhARLmk9MtPr38oCk3lccwSXBCoNVyegBu/9Q4CN5E5rvXCygHNSwDWXBeSGc4xnygLFkjq8dw6oXq5aAnso26H1vGKBCQHXHAtUGs4xxpevYfGrKtzcMwdUF3eg7hrSoeyG2ts+mf4s1bw9yuOaVwXKDecYrRVQhps83OaO7YlGm4zKYLH707A3UoWjtGOBSsMdiqclgedIQAneMwukhwvufIoD/HkDU01KOxaoNBzjW4TxpU9w9WFBEW7ycEB6kmcbziPan3lpZLBslbalo9Vw9XDuteK+aB1aOaV7qvkW4cgYD4fHeN3w8nl7siFcDrTD6YFr3vMGcLIr2UdoRgJI6+Dy/WbDTd1JfSuZFMFsG9rhmgbvSj4iupI6l1I53FMmtMM1Je21o9do0L6l45Qv9cwonOzm3piucy6iKQHQgtYotMmY++Y3VeAbZDcXUrznTQk3tFLe1AE0z9FEQwcNFult37V/TncxfgMkp/kkbDW+hQAAAABJRU5ErkJggg=='

// 构建图标候选路径（兼容开发模式和打包后的 asar/unpacked/resources）
function getIconCandidates(): string[] {
  const appPath = app.getAppPath()
  const resourcesPath = process.resourcesPath
  const candidates: string[] = []

  // 按平台优先顺序选择图标格式，避免 Linux 误用 ICO、macOS 误用非 ICNS
  const preferredIconFiles = process.platform === 'darwin'
    ? ['icon.icns', 'icon.png', 'icon.ico']
    : process.platform === 'linux'
      ? ['icon.png', 'icon.ico']
      : ['icon.ico', 'icon.png']

  for (const iconFile of preferredIconFiles) {
    // 1. extraResources 放置的路径
    candidates.push(path.join(resourcesPath, 'build', iconFile))
    // 2. asarUnpack 解压的路径
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'build', iconFile))
    // 3. resources 根目录
    candidates.push(path.join(resourcesPath, iconFile))
  }

  // 4. asar 内部（仅 fs.readFileSync 可读，nativeImage.createFromPath 不可读）
  for (const iconFile of preferredIconFiles) {
    candidates.push(path.join(appPath, 'build', iconFile))
  }

  return candidates
}

function findIconPath(): string | null {
  const candidates = getIconCandidates()
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p
      }
    } catch (error) {
      console.warn('[Icon] 检查图标路径失败:', p, error)
    }
  }
  return null
}

// 从文件路径加载图标，优先 createFromPath（支持 ICO），PNG 则用 buffer 方式兼容 asar
function loadIconFromPath(filePath: string): NativeImage | null {
  try {
    if (!fs.existsSync(filePath)) return null

    // 对于 asar 内的路径，createFromPath 不支持，改用 buffer
    if (filePath.includes('.asar') && !filePath.includes('.asar.unpacked')) {
      const buffer = fs.readFileSync(filePath)
      const img = nativeImage.createFromBuffer(buffer)
      if (!img.isEmpty()) return img
      return null
    }

    // 文件系统上的真实文件，用 createFromPath（正确支持 ICO）
    const img = nativeImage.createFromPath(filePath)
    if (!img.isEmpty()) return img
    return null
  } catch {
    return null
  }
}

// 读取托盘图标
function loadTrayIcon(): NativeImage {
  const candidates = getIconCandidates()
  console.log('[Tray] 尝试加载图标，候选路径:', candidates)

  // 依次尝试文件系统路径
  for (const p of candidates) {
    const img = loadIconFromPath(p)
    if (img) {
      console.log('[Tray] 图标加载成功:', p)
      return img
    }
  }

  // 所有路径都失败，使用内嵌的 base64 图标
  console.log('[Tray] 文件路径均不可用，使用内嵌图标')
  const fallback = nativeImage.createFromDataURL(`data:image/png;base64,${EMBEDDED_ICON_32_BASE64}`)
  if (!fallback.isEmpty()) {
    return fallback
  }

  console.warn('[Tray] 内嵌图标也失败，使用空图标')
  return nativeImage.createEmpty()
}

function createTray() {
  try {
    const trayIcon = loadTrayIcon()

    tray = new Tray(trayIcon)
    tray.setToolTip('DeLive - 桌面音频实时转录')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          if (process.platform === 'darwin') app.dock?.show()
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
        if (process.platform === 'darwin') app.dock?.show()
        mainWindow?.show()
      }
    })
  } catch (error) {
    tray = null
    console.warn('[Tray] 初始化失败，当前环境可能不支持系统托盘:', error)
  }
}

function registerShortcuts() {
  const shortcut = 'CommandOrControl+Shift+D'

  const toggleWindow = () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
      if (process.platform === 'darwin' && isTrayReady()) app.dock?.hide()
    } else {
      if (process.platform === 'darwin') app.dock?.show()
      mainWindow?.show()
      mainWindow?.focus()
    }
  }

  try {
    const registered = globalShortcut.register(shortcut, toggleWindow)

    if (registered) {
      console.log(`全局快捷键 ${shortcut} 注册成功`)
    } else {
      console.warn(`全局快捷键 ${shortcut} 注册失败，可能被其他程序占用`)

      const backupShortcut = 'CommandOrControl+Alt+D'
      const backupRegistered = globalShortcut.register(backupShortcut, toggleWindow)

      if (backupRegistered) {
        console.log(`备用快捷键 ${backupShortcut} 注册成功`)
      } else {
        console.warn(`备用快捷键 ${backupShortcut} 也注册失败`)
      }
    }

    console.log(`快捷键 ${shortcut} 已注册: ${globalShortcut.isRegistered(shortcut)}`)
  } catch (error) {
    console.warn('[Shortcuts] 全局快捷键注册失败，当前环境可能不支持:', error)
  }
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
      if (process.platform === 'darwin') app.dock?.show()
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

    // 设置自动更新（仅在生产模式 + 支持的平台/安装方式下）
    if (!isDev && isAutoUpdateSupported()) {
      setupAutoUpdater()
      // 注意：自动检查更新现在由前端控制，根据用户设置决定
      // 应用会在窗口加载完成后通过 IPC 请求检查更新
    } else if (!isDev && process.platform === 'linux') {
      console.log('[Updater] 当前 Linux 安装方式不支持自动更新（仅 AppImage 支持）')
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
  for (const runtimeId of localRuntimeStates.keys()) {
    void stopLocalRuntimeProcess(runtimeId)
  }
})

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('minimize-to-tray', () => {
  if (isTrayReady()) {
    mainWindow?.hide()
    if (process.platform === 'darwin') {
      app.dock?.hide()
    }
    return
  }

  // 无托盘环境退化为最小化，避免“隐藏后无法找回”
  mainWindow?.minimize()
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
function getAutoLaunchEnabled(): boolean {
  if (!isAutoLaunchSupported()) return false

  try {
    const settings = app.getLoginItemSettings()

    if (process.platform === 'win32') {
      const hasEnabledLaunchItem = (settings.launchItems || []).some((item) => item.enabled)
      return settings.openAtLogin || hasEnabledLaunchItem
    }

    return settings.openAtLogin
  } catch (error) {
    console.warn('[AutoLaunch] 读取开机启动状态失败:', error)
    return false
  }
}

function clearWindowsAutoLaunchEntries(): void {
  if (process.platform !== 'win32') return

  const settings = app.getLoginItemSettings()
  const launchItems = settings.launchItems || []

  for (const item of launchItems) {
    if (!item.enabled) continue
    try {
      app.setLoginItemSettings({
        openAtLogin: false,
        path: item.path,
        args: item.args,
      })
    } catch (error) {
      console.warn('[AutoLaunch] 清理启动项失败:', item.path, item.args, error)
    }
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
      args: [],
    })
  } catch (error) {
    console.warn('[AutoLaunch] 清理当前进程启动项失败:', error)
  }
}

ipcMain.handle('get-auto-launch', () => {
  return getAutoLaunchEnabled()
})

ipcMain.handle('set-auto-launch', (_event, enable: boolean) => {
  if (!isAutoLaunchSupported()) {
    return false
  }

  try {
    if (enable) {
      app.setLoginItemSettings({
        openAtLogin: true,
        ...(process.platform === 'darwin' ? { openAsHidden: true } : {}),
      })
    } else {
      app.setLoginItemSettings({
        openAtLogin: false,
      })
      clearWindowsAutoLaunchEntries()
    }
  } catch (error) {
    console.error('[AutoLaunch] 设置开机启动失败:', error)
  }

  return getAutoLaunchEnabled()
})

// 本地 runtime 脚手架 API
ipcMain.handle('local-runtime-get-status', (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
  try {
    return getLocalRuntimeSnapshot(runtimeId, options)
  } catch (error) {
    return {
      runtimeId,
      displayName: runtimeId,
      status: 'error' as LocalRuntimeStatus,
      available: false,
      modelsPath: '',
      binaryPath: null,
      baseUrl: options?.port ? `http://127.0.0.1:${options.port}` : 'http://127.0.0.1:8177',
      message: error instanceof Error ? error.message : '获取 runtime 状态失败',
    }
  }
})

ipcMain.handle('local-runtime-open-models-path', async (_event, runtimeId: string) => {
  try {
    const modelsPath = getLocalRuntimeModelsPath(runtimeId)
    const result = await shell.openPath(modelsPath)
    return {
      success: result.length === 0,
      path: modelsPath,
      error: result || undefined,
    }
  } catch (error) {
    return {
      success: false,
      path: '',
      error: error instanceof Error ? error.message : '打开模型目录失败',
    }
  }
})

ipcMain.handle('local-runtime-list-models', (_event, runtimeId: string) => {
  try {
    return getLocalRuntimeModelFiles(runtimeId)
  } catch (error) {
    console.error('[LocalRuntime] 列出模型失败:', error)
    return []
  }
})

ipcMain.handle('local-runtime-import-model', async (_event, runtimeId: string, sourcePath: string) => {
  try {
    if (!sourcePath || !fileExists(sourcePath)) {
      return {
        success: false,
        path: '',
        error: '待导入的模型文件不存在',
      }
    }

    const modelsPath = getLocalRuntimeModelsPath(runtimeId)
    const fileName = path.basename(sourcePath)
    const targetPath = resolveUniqueFilePath(modelsPath, fileName)
    fs.copyFileSync(sourcePath, targetPath)

    return {
      success: true,
      path: targetPath,
    }
  } catch (error) {
    return {
      success: false,
      path: '',
      error: error instanceof Error ? error.message : '导入模型失败',
    }
  }
})

ipcMain.handle('local-runtime-import-binary', async (_event, runtimeId: string, sourcePath: string) => {
  try {
    if (!sourcePath || !fileExists(sourcePath)) {
      return {
        success: false,
        path: '',
        error: '待导入的 runtime binary 不存在',
      }
    }

    const targetPath = installRuntimeBinaryFile(runtimeId, sourcePath)

    return {
      success: true,
      path: targetPath,
    }
  } catch (error) {
    return {
      success: false,
      path: '',
      error: error instanceof Error ? error.message : '导入 runtime binary 失败',
    }
  }
})

ipcMain.handle('local-runtime-download-model', async (_event, runtimeId: string, urlString: string) => {
  try {
    if (!urlString.trim()) {
      return {
        success: false,
        path: '',
        error: '模型下载 URL 不能为空',
      }
    }

    const modelsPath = getLocalRuntimeModelsPath(runtimeId)
    const fileName = getFileNameFromUrl(urlString, 'model.bin')
    const targetPath = resolveUniqueFilePath(modelsPath, fileName)
    await downloadFileToPath(urlString, targetPath)

    return {
      success: true,
      path: targetPath,
    }
  } catch (error) {
    return {
      success: false,
      path: '',
      error: error instanceof Error ? error.message : '下载模型失败',
    }
  }
})

ipcMain.handle('local-runtime-download-binary', async (_event, runtimeId: string, urlString: string) => {
  try {
    if (!urlString.trim()) {
      return {
        success: false,
        path: '',
        error: 'runtime binary 下载 URL 不能为空',
      }
    }

    const binariesPath = getLocalRuntimeBinariesPath(runtimeId)
    const tempFilePath = resolveUniqueFilePath(
      binariesPath,
      getFileNameFromUrl(urlString, process.platform === 'win32' ? 'runtime.zip' : 'runtime')
    )
    await downloadFileToPath(urlString, tempFilePath)
    const targetPath = installRuntimeBinaryFile(runtimeId, tempFilePath)
    if (tempFilePath !== targetPath && fileExists(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }

    return {
      success: true,
      path: targetPath,
    }
  } catch (error) {
    return {
      success: false,
      path: '',
      error: error instanceof Error ? error.message : '下载 runtime binary 失败',
    }
  }
})

ipcMain.handle('pick-file-path', async (_event, options?: {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
}) => {
  const dialogOptions = {
    title: options?.title,
    properties: ['openFile'] as Electron.OpenDialogOptions['properties'],
    filters: options?.filters,
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('local-runtime-start', async (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
  try {
    const status = await startLocalRuntimeProcess(runtimeId, options)
    return {
      success: status.status === 'running',
      status,
      error: status.status === 'running' ? undefined : status.message,
    }
  } catch (error) {
    return {
      success: false,
      status: getLocalRuntimeSnapshot(runtimeId, options),
      error: error instanceof Error ? error.message : '启动 runtime 失败',
    }
  }
})

ipcMain.handle('local-runtime-stop', async (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
  try {
    await stopLocalRuntimeProcess(runtimeId)
    return {
      success: true,
      status: getLocalRuntimeSnapshot(runtimeId, options),
    }
  } catch (error) {
    return {
      success: false,
      status: {
        runtimeId,
        displayName: runtimeId,
        status: 'error' as LocalRuntimeStatus,
        available: false,
        modelsPath: '',
        binaryPath: null,
        baseUrl: options?.port ? `http://127.0.0.1:${options.port}` : 'http://127.0.0.1:8177',
        message: error instanceof Error ? error.message : '停止 runtime 失败',
      },
      error: error instanceof Error ? error.message : '停止 runtime 失败',
    }
  }
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
  if (!isAutoUpdateSupported()) {
    return { error: '当前安装方式不支持自动更新（Linux 仅 AppImage 支持）' }
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
  if (!isAutoUpdateSupported()) {
    return { error: '当前安装方式不支持自动更新（Linux 仅 AppImage 支持）' }
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
  if (!isAutoUpdateSupported()) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', '当前安装方式不支持自动更新（Linux 仅 AppImage 支持）')
    return
  }
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
  if (captionWindow && !captionWindow.isDestroyed() && captionEnabled) {
    captionWindow.webContents.send('caption-text-update', { text, isFinal })
  }
})

// 更新字幕样式
ipcMain.handle('caption-update-style', (_event, newStyle: Partial<CaptionStyle>) => {
  captionStyle = { ...captionStyle, ...newStyle }
  if (captionWindow && !captionWindow.isDestroyed()) {
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
  if (mainWindow && !mainWindow.isDestroyed()) {
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
