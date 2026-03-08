import { app, BrowserWindow, screen, type Tray } from 'electron'
import fs from 'fs'
import path from 'path'

export interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
}

interface CaptionStatus {
  enabled: boolean
  draggable: boolean
  style: CaptionStyle
  stableText: string
  activeText: string
  text: string
  isFinal: boolean
}

interface CaptionControllerOptions {
  getMainWindow: () => BrowserWindow | null
  getTray: () => Tray | null
  isQuitting: () => boolean
  isDev: boolean
}

const SUPPORTS_MOUSE_FORWARD = process.platform !== 'linux'

function computeCaptionHeight(style: CaptionStyle): number {
  const lineHeight = style.fontSize * 1.5
  const contentPadding = 24
  const containerPadding = 20
  const controlSpace = 20
  const height = Math.round(lineHeight * style.maxLines + contentPadding + containerPadding + controlSpace)
  return Math.max(height, 60)
}

function computeCaptionWidth(style: CaptionStyle, workAreaWidth: number): number {
  const minWidth = 300
  const maxWidth = Math.max(minWidth, workAreaWidth - 20)
  const target = Math.round(style.width || 800)
  return Math.min(Math.max(target, minWidth), maxWidth)
}

export function createCaptionWindowController(options: CaptionControllerOptions) {
  let captionWindow: BrowserWindow | null = null
  let captionEnabled = false
  let captionDraggable = false
  let captionStableText = ''
  let captionActiveText = ''
  let captionTextIsFinal = false
  let mouseCheckInterval: NodeJS.Timeout | null = null
  let lastMouseInside = false
  let currentInteractiveMode = false

  let captionStyle: CaptionStyle = {
    fontSize: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textShadow: true,
    maxLines: 2,
    width: 800,
  }

  function getCaptionDebugLogPath(): string {
    const logDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    return path.join(logDir, 'caption-debug.log')
  }

  function getWindowDebugSnapshot(window: BrowserWindow | null): Record<string, unknown> {
    if (!window) {
      return { exists: false }
    }

    if (window.isDestroyed()) {
      return { exists: false, destroyed: true }
    }

    let bounds: Electron.Rectangle | null = null
    try {
      bounds = window.getBounds()
    } catch {
      bounds = null
    }

    return {
      exists: true,
      destroyed: false,
      visible: window.isVisible(),
      focused: window.isFocused(),
      minimized: window.isMinimized(),
      bounds,
    }
  }

  function debug(message: string, extra: Record<string, unknown> = {}): void {
    const mainWindow = options.getMainWindow()
    const tray = options.getTray()
    const payload = {
      isQuitting: options.isQuitting(),
      trayReady: tray !== null && !tray.isDestroyed(),
      captionEnabled,
      captionDraggable,
      currentInteractiveMode,
      captionStableTextLength: captionStableText.length,
      captionActiveTextLength: captionActiveText.length,
      mainWindow: getWindowDebugSnapshot(mainWindow),
      captionWindow: getWindowDebugSnapshot(captionWindow),
      ...extra,
    }

    console.log(`[CaptionDebug] ${message}`, payload)

    try {
      fs.appendFileSync(
        getCaptionDebugLogPath(),
        `${new Date().toISOString()} ${message} ${JSON.stringify(payload)}\n`
      )
    } catch (error) {
      console.warn('[CaptionDebug] 写入日志文件失败:', error)
    }
  }

  function isEnabled(): boolean {
    return captionEnabled
  }

  function getPreferredCaptionDisplay(): Electron.Display {
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      return screen.getDisplayMatching(mainWindow.getBounds())
    }
    return screen.getPrimaryDisplay()
  }

  function isMainWindowVisibleForCaption(): boolean {
    const mainWindow = options.getMainWindow()
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible())
  }

  function reinforceCaptionWindowTopmost(window: BrowserWindow, reason: string): void {
    if (window.isDestroyed()) return

    try {
      window.setAlwaysOnTop(true, 'screen-saver')
      window.moveTop()
      debug('reinforceCaptionWindowTopmost', { reason })
    } catch (error) {
      debug('reinforceCaptionWindowTopmost.error', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function showCaptionWindow(window: BrowserWindow, reason = 'unspecified'): void {
    if (window.isDestroyed()) return

    if (process.platform === 'linux') {
      window.show()
    } else {
      window.showInactive()
    }

    reinforceCaptionWindowTopmost(window, reason)
    debug('showCaptionWindow', { reason })
  }

  function syncCaptionWindowState(): void {
    if (!captionWindow || captionWindow.isDestroyed()) return

    captionWindow.webContents.send('caption-style-update', captionStyle)
    captionWindow.webContents.send('caption-draggable-changed', captionDraggable)
    captionWindow.webContents.send('caption-text-update', {
      stableText: captionStableText,
      activeText: captionActiveText,
      text: captionStableText + captionActiveText,
      isFinal: captionTextIsFinal,
    })
  }

  function syncCaptionWindowInputMode(reason: string): void {
    if (!captionWindow || captionWindow.isDestroyed()) return

    const mainWindowVisible = isMainWindowVisibleForCaption()
    const interactive = captionDraggable || currentInteractiveMode
    const ignoreMouseEvents = !interactive && !mainWindowVisible
    const focusable = interactive

    captionWindow.setIgnoreMouseEvents(
      ignoreMouseEvents,
      ignoreMouseEvents && SUPPORTS_MOUSE_FORWARD ? { forward: true } : undefined
    )
    captionWindow.setFocusable(focusable)
    captionWindow.setSkipTaskbar(true)
    debug('syncCaptionWindowInputMode', {
      reason,
      mainWindowVisible,
      interactive,
      ignoreMouseEvents,
      focusable,
    })
  }

  function applyCaptionPassiveWindowState(): void {
    currentInteractiveMode = false
    syncCaptionWindowInputMode('applyCaptionPassiveWindowState')
  }

  function setCaptionInteractive(interactive: boolean): void {
    if (!captionWindow || captionWindow.isDestroyed()) return

    if (captionDraggable) {
      debug('setCaptionInteractive.skipped-dragging', { interactive })
      return
    }

    if (interactive === currentInteractiveMode) return

    try {
      currentInteractiveMode = interactive
      syncCaptionWindowInputMode('setCaptionInteractive')
      captionWindow.webContents.send('caption-interactive-changed', interactive)
      console.log(`[Caption] 交互模式已设置: ${interactive ? '开启' : '关闭'}`)
      debug('setCaptionInteractive', { interactive })
    } catch (error) {
      console.error('[Caption] 设置交互模式失败:', error)
      debug('setCaptionInteractive.error', {
        interactive,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function stopMousePositionCheck(): void {
    if (mouseCheckInterval) {
      clearInterval(mouseCheckInterval)
      mouseCheckInterval = null
    }
  }

  function startMousePositionCheck(): void {
    if (mouseCheckInterval) {
      console.log('[Caption] 鼠标检测已在运行')
      return
    }

    lastMouseInside = false
    currentInteractiveMode = false

    console.log('[Caption] 启动鼠标位置检测')

    mouseCheckInterval = setInterval(() => {
      if (!captionWindow || captionWindow.isDestroyed()) {
        console.log('[Caption] 字幕窗口不存在，停止检测')
        stopMousePositionCheck()
        return
      }

      if (captionDraggable) return

      try {
        const mousePos = screen.getCursorScreenPoint()
        const bounds = captionWindow.getBounds()
        const isInside =
          mousePos.x >= bounds.x &&
          mousePos.x <= bounds.x + bounds.width &&
          mousePos.y >= bounds.y &&
          mousePos.y <= bounds.y + bounds.height

        if (isInside !== lastMouseInside) {
          console.log(`[Caption] 鼠标状态变化: ${lastMouseInside} -> ${isInside}, 位置: (${mousePos.x}, ${mousePos.y}), 窗口: (${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height})`)
          lastMouseInside = isInside
          setCaptionInteractive(isInside)
        }
      } catch (error) {
        console.error('[Caption] 鼠标位置检测错误:', error)
      }
    }, 100)
  }

  function isCursorInsideCaptionWindow(): boolean {
    if (!captionWindow || captionWindow.isDestroyed()) {
      return false
    }

    const cursor = screen.getCursorScreenPoint()
    const bounds = captionWindow.getBounds()
    return (
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height
    )
  }

  function notifyStatusChanged(enabled: boolean): void {
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('caption-status-changed', enabled)
    }
  }

  function createWindow(): void {
    if (captionWindow) {
      debug('createCaptionWindow.reuse-existing')
      showCaptionWindow(captionWindow, 'createCaptionWindow.reuse-existing')
      return
    }

    captionDraggable = false

    const targetDisplay = getPreferredCaptionDisplay()
    const { x: workX, y: workY, width: screenWidth, height: screenHeight } = targetDisplay.workArea
    const windowWidth = computeCaptionWidth(captionStyle, screenWidth)
    const windowHeight = computeCaptionHeight(captionStyle)
    const windowX = Math.round(workX + (screenWidth - windowWidth) / 2)
    const windowY = workY + screenHeight - windowHeight - 30

    captionWindow = new BrowserWindow({
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
      transparent: process.platform !== 'linux',
      ...(process.platform === 'linux'
        ? { backgroundColor: '#000000CC' }
        : process.platform === 'win32'
          ? { backgroundColor: '#01000001' }
          : {}),
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      minWidth: 300,
      minHeight: 60,
      title: 'DeLive Caption',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      focusable: true,
      show: false,
    })

    debug('createCaptionWindow.created', {
      targetDisplay: targetDisplay.id,
      initialBounds: { x: windowX, y: windowY, width: windowWidth, height: windowHeight },
    })

    captionWindow.on('show', () => {
      debug('captionWindow.show')
    })

    captionWindow.on('hide', () => {
      debug('captionWindow.hide')
    })

    captionWindow.on('focus', () => {
      debug('captionWindow.focus')
    })

    captionWindow.on('blur', () => {
      debug('captionWindow.blur')
    })

    captionWindow.on('closed', () => {
      debug('captionWindow.closed')
      captionWindow = null
      captionEnabled = false
      notifyStatusChanged(false)
    })

    captionWindow.webContents.on('did-finish-load', () => {
      debug('captionWindow.did-finish-load')
      syncCaptionWindowState()
    })

    captionWindow.once('ready-to-show', () => {
      if (!captionWindow) return
      debug('captionWindow.ready-to-show')
      showCaptionWindow(captionWindow, 'captionWindow.ready-to-show')
      applyCaptionPassiveWindowState()
      syncCaptionWindowState()
    })

    if (options.isDev) {
      void captionWindow.loadURL('http://localhost:5173/caption.html')
    } else {
      void captionWindow.loadFile(path.join(__dirname, '../../frontend/dist/caption.html'))
    }

    captionEnabled = true
    notifyStatusChanged(true)
    console.log('[Caption] 字幕窗口已创建')
    startMousePositionCheck()
  }

  function closeWindow(): void {
    if (captionWindow) {
      debug('closeCaptionWindow.invoke')
      stopMousePositionCheck()
      captionWindow.close()
      captionWindow = null
      captionEnabled = false
      captionDraggable = false
      console.log('[Caption] 字幕窗口已关闭')
    }
  }

  function toggleDraggable(draggable?: boolean): boolean {
    const nextValue = draggable !== undefined ? draggable : !captionDraggable
    captionDraggable = nextValue
    if (captionWindow && !captionWindow.isDestroyed()) {
      currentInteractiveMode = nextValue
      syncCaptionWindowInputMode('toggleCaptionDraggable')
      captionWindow.webContents.send('caption-interactive-changed', nextValue)
      captionWindow.webContents.send('caption-draggable-changed', nextValue)
      console.log(`[Caption] 拖拽模式: ${nextValue ? '开启' : '关闭'}`)
      debug('toggleCaptionDraggable', { draggable: nextValue })
    }
    return captionDraggable
  }

  function refreshForMainWindowState(reason: string): void {
    if (!captionWindow || captionWindow.isDestroyed() || !captionEnabled) return

    showCaptionWindow(captionWindow, reason)
    syncCaptionWindowInputMode(reason)

    setTimeout(() => {
      if (!captionWindow || captionWindow.isDestroyed() || !captionEnabled) return
      showCaptionWindow(captionWindow, `${reason}.deferred`)
      syncCaptionWindowInputMode(`${reason}.deferred`)
    }, 80)
  }

  function toggleWindow(enable?: boolean, source?: string): boolean {
    const shouldEnable = enable !== undefined ? enable : !captionEnabled
    const normalizedSource = source || 'unknown'

    if (
      normalizedSource === 'main-caption-controls-toggle' &&
      captionEnabled &&
      isCursorInsideCaptionWindow()
    ) {
      debug('ipc.caption-toggle.ignored-clickthrough', {
        enable,
        shouldEnable,
        source: normalizedSource,
      })
      return captionEnabled
    }

    debug('ipc.caption-toggle', {
      enable,
      shouldEnable,
      source: normalizedSource,
    })

    if (shouldEnable) {
      createWindow()
    } else {
      closeWindow()
    }

    return captionEnabled
  }

  function getStatus(): CaptionStatus {
    return {
      enabled: captionEnabled,
      draggable: captionDraggable,
      style: captionStyle,
      stableText: captionStableText,
      activeText: captionActiveText,
      text: captionStableText + captionActiveText,
      isFinal: captionTextIsFinal,
    }
  }

  function updateText(stableText: string, activeText: string, isFinal: boolean): void {
    captionStableText = stableText
    captionActiveText = activeText
    captionTextIsFinal = isFinal

    if (captionWindow && !captionWindow.isDestroyed() && captionEnabled) {
      if (!captionWindow.isVisible()) {
        debug('caption-update-text.window-not-visible', {
          stableTextLength: stableText.length,
          activeTextLength: activeText.length,
          isFinal,
        })
      }
      showCaptionWindow(captionWindow, 'caption-update-text')
      captionWindow.webContents.send('caption-text-update', {
        stableText,
        activeText,
        text: stableText + activeText,
        isFinal,
      })
    } else {
      debug('caption-update-text.no-window', {
        stableTextLength: stableText.length,
        activeTextLength: activeText.length,
        isFinal,
      })
    }
  }

  function updateStyle(newStyle: Partial<CaptionStyle>): CaptionStyle {
    captionStyle = { ...captionStyle, ...newStyle }
    if (captionWindow && !captionWindow.isDestroyed()) {
      captionWindow.webContents.send('caption-style-update', captionStyle)

      try {
        const targetHeight = computeCaptionHeight(captionStyle)
        const bounds = captionWindow.getBounds()
        const display = screen.getDisplayMatching(bounds)
        const workArea = display.workArea
        const targetWidth = computeCaptionWidth(captionStyle, workArea.width)
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
  }

  function openSettings(): boolean {
    debug('ipc.caption-open-settings')
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-caption-settings')
    }
    return true
  }

  function getBounds(): Electron.Rectangle | null {
    if (captionWindow) {
      return captionWindow.getBounds()
    }
    return null
  }

  function setBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): boolean {
    if (!captionWindow) {
      return false
    }

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

  function resetPosition(): boolean {
    if (!captionWindow) {
      return false
    }

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

  function dispose(): void {
    stopMousePositionCheck()
  }

  return {
    debug,
    isEnabled,
    getWindow: () => captionWindow,
    createWindow,
    closeWindow,
    toggleWindow,
    getStatus,
    updateText,
    updateStyle,
    toggleDraggable,
    setInteractive: setCaptionInteractive,
    openSettings,
    getBounds,
    setBounds,
    resetPosition,
    refreshForMainWindowState,
    dispose,
  }
}
