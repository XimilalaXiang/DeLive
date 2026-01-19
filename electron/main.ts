import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, session } from 'electron'
import path from 'path'

// 禁用 GPU 加速以避免某些系统上的问题
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// 开发模式判断
const isDev = process.env.NODE_ENV === 'development'

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

function createTray() {
  // 创建托盘图标
  const iconPath = path.join(__dirname, '../build/icon.ico')
  let trayIcon = nativeImage.createFromPath(iconPath)
  
  // 如果 ICO 加载失败，尝试加载 PNG
  if (trayIcon.isEmpty()) {
    const pngPath = path.join(__dirname, '../build/icon.png')
    trayIcon = nativeImage.createFromPath(pngPath)
  }
  
  // 如果都失败了，使用空图标
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty()
  }

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
    createWindow()
    createTray()
    registerShortcuts()

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
