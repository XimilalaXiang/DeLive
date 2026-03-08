import { app, dialog, type BrowserWindow, type IpcMain } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'

interface DiagnosticData {
  generatedAt: string
  app: {
    name: string
    version: string
    electronVersion: string
    chromeVersion: string
    nodeVersion: string
    platform: string
    arch: string
    locale: string
  }
  system: {
    os: string
    osRelease: string
    totalMemoryMB: number
    freeMemoryMB: number
    cpuModel: string
    cpuCores: number
    uptime: number
  }
  settings: Record<string, unknown>
  storage: {
    userDataPath: string
    localStorageKeySummary: string[]
  }
  logs: string[]
}

const LOG_RING_BUFFER_SIZE = 500
const logRingBuffer: string[] = []

function pushLog(level: string, ...args: unknown[]): void {
  const ts = new Date().toISOString()
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  logRingBuffer.push(`[${ts}] [${level}] ${msg}`)
  if (logRingBuffer.length > LOG_RING_BUFFER_SIZE) {
    logRingBuffer.shift()
  }
}

export function installLogInterceptor(): void {
  const origLog = console.log.bind(console)
  const origWarn = console.warn.bind(console)
  const origError = console.error.bind(console)

  console.log = (...args: unknown[]) => {
    pushLog('LOG', ...args)
    origLog(...args)
  }
  console.warn = (...args: unknown[]) => {
    pushLog('WARN', ...args)
    origWarn(...args)
  }
  console.error = (...args: unknown[]) => {
    pushLog('ERROR', ...args)
    origError(...args)
  }
}

function redactSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(redactSecrets)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
      result[key] = typeof value === 'string' && value.length > 0 ? `***${value.slice(-4)}` : '(empty)'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSecrets(value)
    } else {
      result[key] = value
    }
  }
  return result
}

function collectDiagnostics(rendererPayload: { settings: Record<string, unknown>; localStorageKeys: string[] }): DiagnosticData {
  const cpus = os.cpus()
  return {
    generatedAt: new Date().toISOString(),
    app: {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      locale: app.getLocale(),
    },
    system: {
      os: `${os.type()} ${os.release()}`,
      osRelease: os.version(),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      cpuModel: cpus[0]?.model || 'unknown',
      cpuCores: cpus.length,
      uptime: Math.round(os.uptime()),
    },
    settings: redactSecrets(rendererPayload.settings) as Record<string, unknown>,
    storage: {
      userDataPath: app.getPath('userData'),
      localStorageKeySummary: rendererPayload.localStorageKeys,
    },
    logs: [...logRingBuffer],
  }
}

interface RegisterDiagnosticsIpcOptions {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
}

export function registerDiagnosticsIpc(options: RegisterDiagnosticsIpcOptions): void {
  options.ipcMain.handle('export-diagnostics', async (
    _event,
    rendererPayload: { settings: Record<string, unknown>; localStorageKeys: string[] }
  ) => {
    const mainWindow = options.getMainWindow()
    const diagnostics = collectDiagnostics(rendererPayload)

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const defaultName = `DeLive-diagnostics-${date}.json`

    const dialogOptions: Electron.SaveDialogOptions = {
      title: 'Export Diagnostics',
      defaultPath: path.join(app.getPath('desktop'), defaultName),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    }

    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)

    if (result.canceled || !result.filePath) {
      return { success: false, reason: 'cancelled' }
    }

    try {
      fs.writeFileSync(result.filePath, JSON.stringify(diagnostics, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, reason: message }
    }
  })
}
