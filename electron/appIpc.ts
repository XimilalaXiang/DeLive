import { app, dialog, type BrowserWindow, type IpcMain } from 'electron'
import fs from 'fs'

interface RegisterAppIpcOptions {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
  isTrayReady: () => boolean
  hideMainWindow: () => void
  minimizeMainWindow: () => void
  maximizeMainWindow: () => void
  unmaximizeMainWindow: () => void
  closeMainWindow: () => void
  isMainWindowMaximized: () => boolean
  onWindowMinimize?: (source?: string) => void
  onWindowClose?: () => void
}

function isAutoLaunchSupported(): boolean {
  return process.platform === 'win32' || process.platform === 'darwin'
}

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

export function registerAppIpc(options: RegisterAppIpcOptions): void {
  options.ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  options.ipcMain.handle('minimize-to-tray', () => {
    if (options.isTrayReady()) {
      options.hideMainWindow()
      if (process.platform === 'darwin') {
        app.dock?.hide()
      }
      return
    }

    options.minimizeMainWindow()
  })

  options.ipcMain.handle('window-minimize', (_event, source?: string) => {
    options.onWindowMinimize?.(source)
    options.minimizeMainWindow()
  })

  options.ipcMain.handle('window-maximize', () => {
    if (options.isMainWindowMaximized()) {
      options.unmaximizeMainWindow()
    } else {
      options.maximizeMainWindow()
    }
  })

  options.ipcMain.handle('window-close', () => {
    options.onWindowClose?.()
    options.closeMainWindow()
  })

  options.ipcMain.handle('window-is-maximized', () => {
    return options.isMainWindowMaximized()
  })

  options.ipcMain.handle('get-auto-launch', () => {
    return getAutoLaunchEnabled()
  })

  options.ipcMain.handle('set-auto-launch', (_event, enable: boolean) => {
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

  options.ipcMain.handle('pick-file-path', async (_event, dialogOptions?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }) => {
    const openDialogOptions = {
      title: dialogOptions?.title,
      properties: ['openFile'] as Electron.OpenDialogOptions['properties'],
      filters: dialogOptions?.filters,
    }
    const mainWindow = options.getMainWindow()
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  options.ipcMain.handle('path-exists', (_event, targetPath: string) => {
    if (!targetPath || !targetPath.trim()) {
      return false
    }

    try {
      return fs.existsSync(targetPath)
    } catch {
      return false
    }
  })
}
