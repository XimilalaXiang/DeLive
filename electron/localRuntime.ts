import { app, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'
import {
  downloadFileToPath,
  fileExists,
  getFileNameFromUrl,
  getLocalRuntimeBinariesPath,
  getLocalRuntimeBinaryFiles,
  getLocalRuntimeModelFiles,
  getLocalRuntimeModelsPath,
  installRuntimeBinaryFile,
  isLikelyIncompleteManagedWhisperCppBinary,
  resolveLocalRuntimeBinary,
  resolveUniqueFilePath,
} from './localRuntimeFiles'
import {
  getLocalRuntimeDefinition,
  type LocalRuntimeController,
  type LocalRuntimeLaunchOptions,
  type LocalRuntimeSnapshot,
  type LocalRuntimeState,
  type LocalRuntimeStatus,
  type ResolvedLocalRuntimeLaunchOptions,
} from './localRuntimeShared'

export type {
  LocalRuntimeController,
  LocalRuntimeLaunchOptions,
  LocalRuntimeSnapshot,
  LocalRuntimeStatus,
} from './localRuntimeShared'

const localRuntimeStates = new Map<string, LocalRuntimeState>()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
