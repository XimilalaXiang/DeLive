import { app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'
import AdmZip from 'adm-zip'
import * as httpModule from 'http'
import * as httpsModule from 'https'
import { URL } from 'url'

export type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

interface LocalRuntimeDefinition {
  id: string
  displayName: string
  modelsSubdir: string
  binariesSubdir: string
  binaryFileNames: string[]
}

export interface LocalRuntimeSnapshot {
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

export interface LocalRuntimeLaunchOptions {
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

export interface LocalRuntimeController {
  getStatus: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => LocalRuntimeSnapshot
  openModelsPath: (runtimeId: string) => Promise<{ success: boolean; path: string; error?: string }>
  listModels: (runtimeId: string) => string[]
  importModel: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
  importBinary: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
  downloadModel: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
  downloadBinary: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
  start: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
  stop: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
  stopAll: () => Promise<void>
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

function getLocalRuntimeBinaryFiles(runtimeId: string): string[] {
  const binariesPath = getLocalRuntimeBinariesPath(runtimeId)

  try {
    const entries = fs.readdirSync(binariesPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(binariesPath, entry.name))
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.warn('[LocalRuntime] 读取 binary 目录失败:', binariesPath, error)
    return []
  }
}

function isLikelyIncompleteManagedWhisperCppBinary(runtimeId: string, binaryPath: string | null): boolean {
  if (runtimeId !== 'whisper_cpp' || !binaryPath) {
    return false
  }

  const managedPath = getLocalRuntimeBinariesPath(runtimeId)
  const normalizedBinaryPath = path.resolve(binaryPath)
  const normalizedManagedPath = path.resolve(managedPath)

  if (!normalizedBinaryPath.startsWith(normalizedManagedPath)) {
    return false
  }

  const files = getLocalRuntimeBinaryFiles(runtimeId)
  if (process.platform === 'win32' && files.length <= 1) {
    return true
  }

  return false
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

async function requestRemoteResource(
  urlString: string,
  targetPath: string,
  redirectDepth = 5
): Promise<void> {
  const parsed = new URL(urlString)
  const client = parsed.protocol === 'https:' ? httpsModule : httpModule

  await new Promise<void>((resolve, reject) => {
    const request = client.request(urlString, {
      method: 'GET',
      headers: {
        'User-Agent': 'DeLive-Downloader',
        Accept: '*/*',
      },
    }, (response) => {
      const statusCode = response.statusCode || 0

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectDepth <= 0) {
          response.resume()
          reject(new Error('下载失败：重定向次数过多'))
          return
        }

        const nextUrl = new URL(response.headers.location, parsed).toString()
        response.resume()
        void requestRemoteResource(nextUrl, targetPath, redirectDepth - 1)
          .then(resolve)
          .catch(reject)
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const details = Buffer.concat(chunks).toString('utf8').trim()
          reject(new Error(details || `下载失败：HTTP ${statusCode}`))
        })
        return
      }

      const fileStream = fs.createWriteStream(targetPath)
      response.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', (error) => {
        response.resume()
        reject(error)
      })
      response.on('error', reject)
    })

    request.setTimeout(120000, () => {
      request.destroy(new Error('下载超时，请检查网络或稍后重试'))
    })
    request.on('error', reject)
    request.end()
  })
}

function shouldUseWindowsDownloadFallback(error: unknown): boolean {
  if (process.platform !== 'win32') {
    return false
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('econnreset') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnaborted') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('socket hang up') ||
    message.includes('client network socket disconnected') ||
    message.includes('tls') ||
    message.includes('fetch failed')
  )
}

async function downloadFileToPathWithPowerShell(urlString: string, targetPath: string): Promise<void> {
  const powershellPath = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  )

  const script = [
    '$ProgressPreference = "SilentlyContinue"',
    '$ErrorActionPreference = "Stop"',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
    `$url = '${urlString.replace(/'/g, "''")}'`,
    `$out = '${targetPath.replace(/'/g, "''")}'`,
    'Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing',
  ].join('; ')

  const encoded = Buffer.from(script, 'utf16le').toString('base64')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(powershellPath, [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded,
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `PowerShell 下载失败 (exit code ${code ?? 'unknown'})`))
    })
  })
}

async function downloadFileToPath(urlString: string, targetPath: string): Promise<void> {
  try {
    await requestRemoteResource(urlString, targetPath)
  } catch (error) {
    if (shouldUseWindowsDownloadFallback(error)) {
      try {
        await downloadFileToPathWithPowerShell(urlString, targetPath)
        return
      } catch (fallbackError) {
        if (fileExists(targetPath)) {
          try {
            fs.unlinkSync(targetPath)
          } catch {
            // ignore cleanup failure
          }
        }

        const primaryMessage = error instanceof Error ? error.message : String(error)
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        throw new Error(`下载失败：主下载通道错误：${primaryMessage}；Windows 回退下载也失败：${fallbackMessage}`)
      }
    }

    if (fileExists(targetPath)) {
      try {
        fs.unlinkSync(targetPath)
      } catch {
        // ignore cleanup failure
      }
    }
    throw error
  }
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
      throw new Error('压缩包中未找到 ' + canonicalBinaryName)
    }

    fs.rmSync(binariesPath, { recursive: true, force: true })
    fs.mkdirSync(binariesPath, { recursive: true })

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const relativeName = entry.entryName.replace(/\\/g, '/')
      const fileName = relativeName.split('/').pop()
      if (!fileName) continue
      const outputPath = path.join(binariesPath, fileName)
      fs.writeFileSync(outputPath, entry.getData())
    }

    if (!fileExists(targetPath)) {
      const fallbackBinary = fs.readdirSync(binariesPath)
        .map((fileName) => path.join(binariesPath, fileName))
        .find((filePath) => definition.binaryFileNames.includes(path.basename(filePath)))

      if (!fallbackBinary) {
        throw new Error('解压完成，但未找到 ' + canonicalBinaryName)
      }
    }
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
  const incompleteManagedBinary = isLikelyIncompleteManagedWhisperCppBinary(runtimeId, binaryPath)
  const available = Boolean(binaryPath) && !incompleteManagedBinary
  const modelsPath = getLocalRuntimeModelsPath(runtimeId)
  const binaryFiles = getLocalRuntimeBinaryFiles(runtimeId)

  return {
    runtimeId,
    displayName: definition.displayName,
    status: state.status,
    available,
    modelsPath,
    binaryPath,
    baseUrl: state.baseUrl || resolved.baseUrl,
    message: incompleteManagedBinary
      ? `检测到旧版不完整 binary 安装（当前目录仅有 ${binaryFiles.map(file => path.basename(file)).join(', ')}）。请重新下载 / 导入官方 zip 包。`
      : getLocalRuntimeMessage(runtimeId, state, available),
  }
}

export function createRuntimeErrorSnapshot(
  runtimeId: string,
  options: LocalRuntimeLaunchOptions | undefined,
  message: string
): LocalRuntimeSnapshot {
  return {
    runtimeId,
    displayName: runtimeId,
    status: 'error',
    available: false,
    modelsPath: '',
    binaryPath: null,
    baseUrl: options?.port ? `http://127.0.0.1:${options.port}` : 'http://127.0.0.1:8177',
    message,
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

function formatRuntimeExitError(code: number | null, signal: NodeJS.Signals | null, latestLog?: string): string {
  if (code === -1073741515 || code === 3221225781) {
    return '本地 runtime 启动失败：缺少 DLL 或依赖文件。当前更像是 binary 没有完整解压，请重新下载 / 导入官方 zip 包，而不是只放一个 exe。'
  }

  const base = 'runtime 进程已退出 (code=' + (code ?? 'null') + ', signal=' + (signal ?? 'null') + ')'
  return latestLog ? base + '；最近日志: ' + latestLog : base
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
  if (
    existingState?.process &&
    !existingState.process.killed &&
    existingState.launchConfigHash === configHash &&
    existingState.status === 'running'
  ) {
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
        : formatRuntimeExitError(code, signal, latestLog),
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
      lastError: currentState.lastError || (error instanceof Error ? error.message : 'runtime 启动失败'),
    })
  }

  return getLocalRuntimeSnapshot(runtimeId, options)
}

export function createLocalRuntimeController(): LocalRuntimeController {
  return {
    getStatus(runtimeId, options) {
      return getLocalRuntimeSnapshot(runtimeId, options)
    },
    async openModelsPath(runtimeId) {
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
    },
    listModels(runtimeId) {
      return getLocalRuntimeModelFiles(runtimeId)
    },
    async importModel(runtimeId, sourcePath) {
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
    },
    async importBinary(runtimeId, sourcePath) {
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
    },
    async downloadModel(runtimeId, urlString) {
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
    },
    async downloadBinary(runtimeId, urlString) {
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
    },
    async start(runtimeId, options) {
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
          status: createRuntimeErrorSnapshot(runtimeId, options, error instanceof Error ? error.message : '启动 runtime 失败'),
          error: error instanceof Error ? error.message : '启动 runtime 失败',
        }
      }
    },
    async stop(runtimeId, options) {
      try {
        await stopLocalRuntimeProcess(runtimeId)
        return {
          success: true,
          status: getLocalRuntimeSnapshot(runtimeId, options),
        }
      } catch (error) {
        return {
          success: false,
          status: createRuntimeErrorSnapshot(runtimeId, options, error instanceof Error ? error.message : '停止 runtime 失败'),
          error: error instanceof Error ? error.message : '停止 runtime 失败',
        }
      }
    },
    async stopAll() {
      for (const runtimeId of localRuntimeStates.keys()) {
        await stopLocalRuntimeProcess(runtimeId)
      }
    },
  }
}
