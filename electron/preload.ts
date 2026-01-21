import { contextBridge, ipcRenderer } from 'electron'

// 桌面源类型
interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon: string | null
  isScreen: boolean
}

// 更新信息类型
interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

// 字幕样式类型
interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
}

// 字幕状态类型
interface CaptionStatus {
  enabled: boolean
  draggable: boolean
  style: CaptionStyle
}

// 字幕窗口边界类型
interface CaptionBounds {
  x: number
  y: number
  width: number
  height: number
}

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 最小化到托盘
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  
  // 窗口控制 - 用于自定义标题栏
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  
  // 开机自启动
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('set-auto-launch', enable) as Promise<boolean>,
  
  // 获取桌面源列表（屏幕和窗口）
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources') as Promise<DesktopSource[]>,
  
  // 选择桌面源
  selectSource: (sourceId: string) => ipcRenderer.invoke('select-source', sourceId),
  
  // 取消源选择
  cancelSourceSelection: () => ipcRenderer.invoke('cancel-source-selection'),
  
  // 监听显示源选择器事件
  onShowSourcePicker: (callback: () => void) => {
    ipcRenderer.on('show-source-picker', callback)
    return () => ipcRenderer.removeListener('show-source-picker', callback)
  },
  
  // ============ 自动更新 API ============
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 下载更新
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  
  // 安装更新
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // 更新事件监听
  onCheckingForUpdate: (callback: () => void) => {
    ipcRenderer.on('checking-for-update', callback)
    return () => ipcRenderer.removeListener('checking-for-update', callback)
  },
  
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('update-available')
  },
  
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update-not-available', (_event, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('update-not-available')
  },
  
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('download-progress')
  },
  
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
    return () => ipcRenderer.removeAllListeners('update-downloaded')
  },
  
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_event, error) => callback(error))
    return () => ipcRenderer.removeAllListeners('update-error')
  },
  
  // ============ 字幕窗口 API ============
  // 切换字幕窗口
  captionToggle: (enable?: boolean) => ipcRenderer.invoke('caption-toggle', enable) as Promise<boolean>,
  
  // 获取字幕状态
  captionGetStatus: () => ipcRenderer.invoke('caption-get-status') as Promise<CaptionStatus>,
  
  // 更新字幕文字
  captionUpdateText: (text: string, isFinal: boolean) => ipcRenderer.invoke('caption-update-text', text, isFinal),
  
  // 更新字幕样式
  captionUpdateStyle: (style: Partial<CaptionStyle>) => ipcRenderer.invoke('caption-update-style', style) as Promise<CaptionStyle>,
  
  // 切换字幕拖拽模式
  captionToggleDraggable: (draggable?: boolean) => ipcRenderer.invoke('caption-toggle-draggable', draggable) as Promise<boolean>,
  
  // 设置字幕窗口是否可交互（用于悬停时显示设置按钮）
  captionSetInteractive: (interactive: boolean) => ipcRenderer.invoke('caption-set-interactive', interactive) as Promise<boolean>,
  
  // 获取字幕窗口边界
  captionGetBounds: () => ipcRenderer.invoke('caption-get-bounds') as Promise<CaptionBounds | null>,
  
  // 设置字幕窗口边界
  captionSetBounds: (bounds: Partial<CaptionBounds>) => ipcRenderer.invoke('caption-set-bounds', bounds) as Promise<boolean>,
  
  // 重置字幕位置
  captionResetPosition: () => ipcRenderer.invoke('caption-reset-position') as Promise<boolean>,
  
  // 监听字幕状态变化
  onCaptionStatusChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('caption-status-changed', (_event, enabled) => callback(enabled))
    return () => ipcRenderer.removeAllListeners('caption-status-changed')
  },
  
  // 监听字幕文字更新（用于字幕窗口）
  onCaptionTextUpdate: (callback: (data: { text: string; isFinal: boolean }) => void) => {
    ipcRenderer.on('caption-text-update', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('caption-text-update')
  },
  
  // 监听字幕样式更新（用于字幕窗口）
  onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => {
    ipcRenderer.on('caption-style-update', (_event, style) => callback(style))
    return () => ipcRenderer.removeAllListeners('caption-style-update')
  },
  
  // 监听字幕拖拽状态变化（用于字幕窗口）
  onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => {
    ipcRenderer.on('caption-draggable-changed', (_event, draggable) => callback(draggable))
    return () => ipcRenderer.removeAllListeners('caption-draggable-changed')
  },
  
  // 监听字幕交互状态变化（用于显示/隐藏设置按钮）
  onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => {
    ipcRenderer.on('caption-interactive-changed', (_event, interactive) => callback(interactive))
    return () => ipcRenderer.removeAllListeners('caption-interactive-changed')
  },
  
  // 从字幕窗口打开主应用设置
  captionOpenSettings: () => ipcRenderer.invoke('caption-open-settings'),
  
  // 监听打开字幕设置事件（主窗口使用）
  onOpenCaptionSettings: (callback: () => void) => {
    ipcRenderer.on('open-caption-settings', callback)
    return () => ipcRenderer.removeAllListeners('open-caption-settings')
  },
  
  // 检测是否在 Electron 环境中运行
  isElectron: true,
})

// 类型声明（供 TypeScript 使用）
declare global {
  interface DesktopSource {
    id: string
    name: string
    thumbnail: string
    appIcon: string | null
    isScreen: boolean
  }
  
  interface UpdateInfo {
    version: string
    releaseDate?: string
    releaseNotes?: string
  }
  
  interface DownloadProgress {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  }
  
  interface CaptionStyle {
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
  }
  
  interface CaptionBounds {
    x: number
    y: number
    width: number
    height: number
  }
  
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      minimizeToTray: () => Promise<void>
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowIsMaximized: () => Promise<boolean>
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enable: boolean) => Promise<boolean>
      getDesktopSources: () => Promise<DesktopSource[]>
      selectSource: (sourceId: string) => Promise<boolean>
      cancelSourceSelection: () => Promise<void>
      onShowSourcePicker: (callback: () => void) => () => void
      // 自动更新 API
      checkForUpdates: () => Promise<{ success?: boolean; version?: string; error?: string }>
      downloadUpdate: () => Promise<{ success?: boolean; error?: string }>
      installUpdate: () => void
      onCheckingForUpdate: (callback: () => void) => () => void
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
      onUpdateError: (callback: (error: string) => void) => () => void
      // 字幕窗口 API
      captionToggle: (enable?: boolean) => Promise<boolean>
      captionGetStatus: () => Promise<CaptionStatus>
      captionUpdateText: (text: string, isFinal: boolean) => Promise<void>
      captionUpdateStyle: (style: Partial<CaptionStyle>) => Promise<CaptionStyle>
      captionToggleDraggable: (draggable?: boolean) => Promise<boolean>
      captionGetBounds: () => Promise<CaptionBounds | null>
      captionSetBounds: (bounds: Partial<CaptionBounds>) => Promise<boolean>
      captionResetPosition: () => Promise<boolean>
      onCaptionStatusChanged: (callback: (enabled: boolean) => void) => () => void
      onCaptionTextUpdate: (callback: (data: { text: string; isFinal: boolean }) => void) => () => void
      onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => () => void
      onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => () => void
      isElectron: boolean
    }
  }
}
