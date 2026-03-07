import { app, BrowserWindow, shell, type BrowserWindowConstructorOptions } from 'electron'
import path from 'path'

interface CreateMainWindowOptions {
  isDev: boolean
  windowIconPath?: string
  shouldHideToTray: () => boolean
  onShow?: () => void
  onHide?: () => void
  onMinimize?: () => void
  onRestore?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onCloseToTray?: () => void
  onClosed?: () => void
}

export function createMainWindow(options: CreateMainWindowOptions): BrowserWindow {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.delive.app')
  }

  const windowOptions: BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DeLive - 桌面音频实时转录',
    icon: options.windowIconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 12, y: 10 } } : {}),
    backgroundColor: '#0c0a09',
    show: false,
  }

  const mainWindow = new BrowserWindow(windowOptions)

  mainWindow.on('show', () => {
    options.onShow?.()
  })

  mainWindow.on('hide', () => {
    options.onHide?.()
  })

  mainWindow.on('minimize', () => {
    options.onMinimize?.()
  })

  mainWindow.on('restore', () => {
    options.onRestore?.()
  })

  mainWindow.on('focus', () => {
    options.onFocus?.()
  })

  mainWindow.on('blur', () => {
    options.onBlur?.()
  })

  if (options.isDev) {
    void mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (options.shouldHideToTray()) {
      event.preventDefault()
      mainWindow.hide()
      if (process.platform === 'darwin') {
        app.dock?.hide()
      }
      options.onCloseToTray?.()
    }
  })

  mainWindow.on('closed', () => {
    options.onClosed?.()
  })

  return mainWindow
}
