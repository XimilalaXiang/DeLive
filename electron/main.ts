import { app, BrowserWindow, ipcMain, Tray, globalShortcut } from 'electron'
import { registerAppIpc } from './appIpc'
import { setupAutoUpdater } from './autoUpdater'
import { registerCaptionIpc } from './captionIpc'
import { createCaptionWindowController } from './captionWindow'
import { createDesktopSourceController, registerDesktopSourceIpc } from './desktopSource'
import { createLocalRuntimeController } from './localRuntime'
import { registerLocalRuntimeIpc } from './localRuntimeIpc'
import { createMainWindow } from './mainWindow'
import { registerAppShortcuts } from './shortcuts'
import { createAppTray, findIconPath } from './tray'
import { registerUpdaterIpc } from './updaterIpc'
import { installLogInterceptor, registerDiagnosticsIpc } from './diagnosticsIpc'
import { registerTrustedWindow } from './ipcSecurity'
import { registerSafeStorageIpc } from './safeStorageIpc'
import { startVolcProxyServer } from './volcProxy'
import { registerApiIpc } from './apiIpc'
import { attachApiServer } from './apiServer'
import { registerCloudBackupIpc } from './cloudBackup/cloudBackupIpc'

installLogInterceptor()

if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-features', 'ScreenCaptureKitAudio,ScreenCaptureKitStreamPickerSonoma')
}

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'PulseaudioLoopbackForScreenShare')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const isDev = process.env.NODE_ENV === 'development'

const captionController = createCaptionWindowController({
  getMainWindow: () => mainWindow,
  getTray: () => tray,
  isQuitting: () => isQuitting,
  isDev,
})

registerTrustedWindow(() => mainWindow)
registerTrustedWindow(() => captionController.getWindow())

const desktopSourceController = createDesktopSourceController({
  getMainWindow: () => mainWindow,
})

const localRuntimeController = createLocalRuntimeController()

function isAutoUpdateSupported(): boolean {
  if (process.platform !== 'linux') return true
  return Boolean(process.env.APPIMAGE)
}

function isTrayReady(): boolean {
  return tray !== null && !tray.isDestroyed()
}

function createWindow(): void {
  const windowIconPath = findIconPath()
  desktopSourceController.attachDisplayMediaHandler()
  mainWindow = createMainWindow({
    isDev,
    windowIconPath: windowIconPath || undefined,
    shouldHideToTray: () => !isQuitting && isTrayReady(),
    onShow: () => {
      captionController.debug('mainWindow.show')
      captionController.refreshForMainWindowState('mainWindow.show')
    },
    onHide: () => {
      captionController.debug('mainWindow.hide')
      captionController.refreshForMainWindowState('mainWindow.hide')
    },
    onMinimize: () => {
      captionController.debug('mainWindow.minimize')
      captionController.refreshForMainWindowState('mainWindow.minimize')
    },
    onRestore: () => {
      captionController.debug('mainWindow.restore')
      captionController.refreshForMainWindowState('mainWindow.restore')
    },
    onFocus: () => {
      captionController.debug('mainWindow.focus')
    },
    onBlur: () => {
      captionController.debug('mainWindow.blur')
    },
    onCloseToTray: () => {
      captionController.debug('mainWindow.close', {
        willHideToTray: true,
      })
    },
    onClosed: () => {
      captionController.debug('mainWindow.closed')
      mainWindow = null
    },
  })
  captionController.debug('mainWindow.created')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (process.platform === 'darwin') app.dock?.show()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    let httpServer: ReturnType<typeof startVolcProxyServer> | undefined
    try {
      httpServer = startVolcProxyServer()
    } catch (err) {
      console.error('[Main] 代理服务器启动失败:', err)
    }
    if (httpServer) {
      attachApiServer({ server: httpServer })
    }

    createWindow()
    tray = createAppTray({
      getMainWindow: () => mainWindow,
      onQuit: () => {
        isQuitting = true
        app.quit()
      },
      debug: (message, extra) => captionController.debug(message, extra),
    })

    registerAppShortcuts({
      getMainWindow: () => mainWindow,
      isTrayReady,
    })

    if (!isDev && isAutoUpdateSupported()) {
      setupAutoUpdater({
        getMainWindow: () => mainWindow,
        markQuitting: () => {
          isQuitting = true
        },
      })
    } else if (!isDev && process.platform === 'linux') {
      console.log('[Updater] 当前 Linux 安装方式不支持自动更新（仅 AppImage 支持）')
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  captionController.debug('app.window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  captionController.debug('app.before-quit')
  isQuitting = true
  captionController.dispose()
  globalShortcut.unregisterAll()
  void localRuntimeController.stopAll()
})

registerLocalRuntimeIpc({
  ipcMain,
  controller: localRuntimeController,
})

registerDesktopSourceIpc({
  ipcMain,
  controller: desktopSourceController,
})

registerAppIpc({
  ipcMain,
  getMainWindow: () => mainWindow,
  isTrayReady,
  hideMainWindow: () => {
    mainWindow?.hide()
  },
  minimizeMainWindow: () => {
    mainWindow?.minimize()
  },
  maximizeMainWindow: () => {
    mainWindow?.maximize()
  },
  unmaximizeMainWindow: () => {
    mainWindow?.unmaximize()
  },
  closeMainWindow: () => {
    mainWindow?.close()
  },
  isMainWindowMaximized: () => mainWindow?.isMaximized() ?? false,
  onWindowMinimize: (source) => {
    captionController.debug('ipc.window-minimize', { source: source || 'unknown' })
  },
  onWindowClose: () => {
    captionController.debug('ipc.window-close')
  },
})

registerUpdaterIpc({
  ipcMain,
  isDev,
  isAutoUpdateSupported,
  getMainWindow: () => mainWindow,
  markQuitting: () => {
    isQuitting = true
  },
})

registerCaptionIpc({
  ipcMain,
  controller: captionController,
})

registerDiagnosticsIpc({
  ipcMain,
  getMainWindow: () => mainWindow,
})

registerSafeStorageIpc(ipcMain)
registerCloudBackupIpc(ipcMain)

registerApiIpc({
  ipcMain,
  getMainWindow: () => mainWindow,
})
