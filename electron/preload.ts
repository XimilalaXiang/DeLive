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

type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

interface LocalRuntimeLaunchOptions {
  binaryPath?: string
  modelPath?: string
  port?: number
}

interface LocalRuntimeSnapshot {
  runtimeId: string
  displayName: string
  status: LocalRuntimeStatus
  available: boolean
  modelsPath: string
  binaryPath: string | null
  baseUrl: string
  message?: string
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
  stableText: string
  activeText: string
  text: string
  isFinal: boolean
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
  windowMinimize: (source?: string) => ipcRenderer.invoke('window-minimize', source),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,

  // 开机自启动
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('set-auto-launch', enable) as Promise<boolean>,
  pickFilePath: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => ipcRenderer.invoke('pick-file-path', options) as Promise<string | null>,
  pathExists: (targetPath: string) => ipcRenderer.invoke('path-exists', targetPath) as Promise<boolean>,

  // 本地 runtime 脚手架 API
  localRuntimeGetStatus: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => ipcRenderer.invoke('local-runtime-get-status', runtimeId, options) as Promise<LocalRuntimeSnapshot>,
  localRuntimeOpenModelsPath: (runtimeId: string) => ipcRenderer.invoke('local-runtime-open-models-path', runtimeId) as Promise<{ success: boolean; path: string; error?: string }>,
  localRuntimeListModels: (runtimeId: string) => ipcRenderer.invoke('local-runtime-list-models', runtimeId) as Promise<string[]>,
  localRuntimeImportModel: (runtimeId: string, sourcePath: string) => ipcRenderer.invoke('local-runtime-import-model', runtimeId, sourcePath) as Promise<{ success: boolean; path: string; error?: string }>,
  localRuntimeImportBinary: (runtimeId: string, sourcePath: string) => ipcRenderer.invoke('local-runtime-import-binary', runtimeId, sourcePath) as Promise<{ success: boolean; path: string; error?: string }>,
  localRuntimeDownloadModel: (runtimeId: string, urlString: string) => ipcRenderer.invoke('local-runtime-download-model', runtimeId, urlString) as Promise<{ success: boolean; path: string; error?: string }>,
  localRuntimeDownloadBinary: (runtimeId: string, urlString: string) => ipcRenderer.invoke('local-runtime-download-binary', runtimeId, urlString) as Promise<{ success: boolean; path: string; error?: string }>,
  localRuntimeStart: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => ipcRenderer.invoke('local-runtime-start', runtimeId, options) as Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>,
  localRuntimeStop: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => ipcRenderer.invoke('local-runtime-stop', runtimeId, options) as Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>,

  // 获取桌面源列表（屏幕和窗口）
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources') as Promise<DesktopSource[]>,

  // 选择桌面源
  selectSource: (sourceId: string) => ipcRenderer.invoke('select-source', sourceId),

  // 取消源选择
  cancelSourceSelection: () => ipcRenderer.invoke('cancel-source-selection'),

  // 监听显示源选择器事件
  onShowSourcePicker: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('show-source-picker', listener)
    return () => ipcRenderer.removeListener('show-source-picker', listener)
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
    const listener = () => callback()
    ipcRenderer.on('checking-for-update', listener)
    return () => ipcRenderer.removeListener('checking-for-update', listener)
  },

  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on('update-available', listener)
    return () => ipcRenderer.removeListener('update-available', listener)
  },

  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('update-not-available', listener)
    return () => ipcRenderer.removeListener('update-not-available', listener)
  },

  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => callback(progress)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },

  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('update-downloaded', listener)
    return () => ipcRenderer.removeListener('update-downloaded', listener)
  },

  onUpdateError: (callback: (error: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('update-error', listener)
    return () => ipcRenderer.removeListener('update-error', listener)
  },

  // ============ 字幕窗口 API ============
  // 切换字幕窗口
  captionToggle: (enable?: boolean, source?: string) => ipcRenderer.invoke('caption-toggle', enable, source) as Promise<boolean>,

  // 获取字幕状态
  captionGetStatus: () => ipcRenderer.invoke('caption-get-status') as Promise<CaptionStatus>,

  // 更新字幕文字
  captionUpdateText: (stableText: string, activeText: string, isFinal: boolean) =>
    ipcRenderer.invoke('caption-update-text', stableText, activeText, isFinal),

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
    const listener = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled)
    ipcRenderer.on('caption-status-changed', listener)
    return () => ipcRenderer.removeListener('caption-status-changed', listener)
  },

  // 监听字幕文字更新（用于字幕窗口）
  onCaptionTextUpdate: (callback: (data: { stableText: string; activeText: string; text: string; isFinal: boolean }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { stableText: string; activeText: string; text: string; isFinal: boolean },
    ) => callback(data)
    ipcRenderer.on('caption-text-update', listener)
    return () => ipcRenderer.removeListener('caption-text-update', listener)
  },

  // 监听字幕样式更新（用于字幕窗口）
  onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, style: CaptionStyle) => callback(style)
    ipcRenderer.on('caption-style-update', listener)
    return () => ipcRenderer.removeListener('caption-style-update', listener)
  },

  // 监听字幕拖拽状态变化（用于字幕窗口）
  onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, draggable: boolean) => callback(draggable)
    ipcRenderer.on('caption-draggable-changed', listener)
    return () => ipcRenderer.removeListener('caption-draggable-changed', listener)
  },

  // 监听字幕交互状态变化（用于显示/隐藏设置按钮）
  onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, interactive: boolean) => callback(interactive)
    ipcRenderer.on('caption-interactive-changed', listener)
    return () => ipcRenderer.removeListener('caption-interactive-changed', listener)
  },

  // 从字幕窗口打开主应用设置
  captionOpenSettings: () => ipcRenderer.invoke('caption-open-settings'),

  // 监听打开字幕设置事件（主窗口使用）
  onOpenCaptionSettings: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('open-caption-settings', listener)
    return () => ipcRenderer.removeListener('open-caption-settings', listener)
  },

  // 检测是否在 Electron 环境中运行
  isElectron: true,

  // 当前运行平台
  platform: process.platform as 'win32' | 'darwin' | 'linux',

  // 诊断信息导出
  exportDiagnostics: (payload: { settings: Record<string, unknown>; localStorageKeys: string[] }) =>
    ipcRenderer.invoke('export-diagnostics', payload) as Promise<{ success: boolean; path?: string; reason?: string }>,

  // 安全存储（加密 API Key 等敏感数据）
  safeStorageSet: (key: string, value: string) => ipcRenderer.invoke('safe-storage-set', key, value) as Promise<boolean>,
  safeStorageGet: (key: string) => ipcRenderer.invoke('safe-storage-get', key) as Promise<string | null>,
  safeStorageDelete: (key: string) => ipcRenderer.invoke('safe-storage-delete', key) as Promise<boolean>,
  safeStorageAvailable: () => ipcRenderer.invoke('safe-storage-available') as Promise<boolean>,

  // 平台能力探测（用于前端做跨平台降级）
  supportsAutoLaunch: process.platform === 'win32' || process.platform === 'darwin',
  supportsAutoUpdate: process.platform !== 'linux' || Boolean(process.env.APPIMAGE),
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

  type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

  interface LocalRuntimeLaunchOptions {
    binaryPath?: string
    modelPath?: string
    port?: number
  }

  interface LocalRuntimeSnapshot {
    runtimeId: string
    displayName: string
    status: LocalRuntimeStatus
    available: boolean
    modelsPath: string
    binaryPath: string | null
    baseUrl: string
    message?: string
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
    stableText: string
    activeText: string
    text: string
    isFinal: boolean
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
      windowMinimize: (source?: string) => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowIsMaximized: () => Promise<boolean>
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enable: boolean) => Promise<boolean>
      pickFilePath: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>
      pathExists: (targetPath: string) => Promise<boolean>
      localRuntimeGetStatus: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<LocalRuntimeSnapshot>
      localRuntimeOpenModelsPath: (runtimeId: string) => Promise<{ success: boolean; path: string; error?: string }>
      localRuntimeListModels: (runtimeId: string) => Promise<string[]>
      localRuntimeImportModel: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
      localRuntimeImportBinary: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
      localRuntimeDownloadModel: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
      localRuntimeDownloadBinary: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
      localRuntimeStart: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
      localRuntimeStop: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
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
      captionToggle: (enable?: boolean, source?: string) => Promise<boolean>
      captionGetStatus: () => Promise<CaptionStatus>
      captionUpdateText: (stableText: string, activeText: string, isFinal: boolean) => Promise<void>
      captionUpdateStyle: (style: Partial<CaptionStyle>) => Promise<CaptionStyle>
      captionToggleDraggable: (draggable?: boolean) => Promise<boolean>
      captionSetInteractive: (interactive: boolean) => Promise<boolean>
      captionGetBounds: () => Promise<CaptionBounds | null>
      captionSetBounds: (bounds: Partial<CaptionBounds>) => Promise<boolean>
      captionResetPosition: () => Promise<boolean>
      onCaptionStatusChanged: (callback: (enabled: boolean) => void) => () => void
      onCaptionTextUpdate: (callback: (data: { stableText: string; activeText: string; text: string; isFinal: boolean }) => void) => () => void
      onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => () => void
      onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => () => void
      onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => () => void
      captionOpenSettings: () => Promise<boolean>
      onOpenCaptionSettings: (callback: () => void) => () => void
      exportDiagnostics: (payload: { settings: Record<string, unknown>; localStorageKeys: string[] }) => Promise<{ success: boolean; path?: string; reason?: string }>
      safeStorageSet: (key: string, value: string) => Promise<boolean>
      safeStorageGet: (key: string) => Promise<string | null>
      safeStorageDelete: (key: string) => Promise<boolean>
      safeStorageAvailable: () => Promise<boolean>
      isElectron: boolean
      platform: 'win32' | 'darwin' | 'linux'
      supportsAutoLaunch: boolean
      supportsAutoUpdate: boolean
    }
  }
}
