import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, session, dialog, screen } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'

// 禁用 GPU 加速以避免某些系统上的问题
// app.disableHardwareAcceleration()

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
}

let captionStyle: CaptionStyle = {
  fontSize: 24,
  fontFamily: 'Microsoft YaHei, sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
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

  // 获取主显示器信息
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  // 字幕窗口默认位置：屏幕底部中央
  // 根据 maxLines=2 和默认字体大小 24px 计算高度
  // 高度 = (字体大小 * 行高 * 行数) + padding
  // 高度 = (24 * 1.5 * 2) + 20 + 24 = 72 + 44 ≈ 120
  const windowWidth = 800
  const windowHeight = 120 // 增加高度以显示完整圆角
  const windowX = Math.round((screenWidth - windowWidth) / 2)
  const windowY = screenHeight - windowHeight - 30 // 距离底部 30px

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
    resizable: true,
    
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
  
  // 避免重复设置
  if (currentInteractiveMode === interactive) {
    console.log(`[Caption] 交互模式未变化，跳过: ${interactive}`)
    return
  }
  
  currentInteractiveMode = interactive
  
  try {
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
    captionWindow.setBounds({
      x: bounds.x ?? currentBounds.x,
      y: bounds.y ?? currentBounds.y,
      width: bounds.width ?? currentBounds.width,
      height: bounds.height ?? currentBounds.height,
    })
    return true
  }
  return false
})

// 重置字幕窗口位置到默认
ipcMain.handle('caption-reset-position', () => {
  if (captionWindow) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    const windowWidth = 800
    const windowHeight = 120 // 增加高度以显示完整圆角
    const windowX = Math.round((screenWidth - windowWidth) / 2)
    const windowY = screenHeight - windowHeight - 30
    
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
