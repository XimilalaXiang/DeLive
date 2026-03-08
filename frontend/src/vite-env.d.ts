/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

// Electron API 类型声明
declare interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon: string | null
  isScreen: boolean
}

// 更新相关类型
declare interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

declare interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

declare type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

declare interface LocalRuntimeLaunchOptions {
  binaryPath?: string
  modelPath?: string
  port?: number
}

declare interface LocalRuntimeSnapshot {
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
declare interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
}

// 字幕状态类型
declare interface CaptionStatus {
  enabled: boolean
  draggable: boolean
  style: CaptionStyle
  stableText: string
  activeText: string
  text: string
  isFinal: boolean
}

// 字幕窗口边界类型
declare interface CaptionBounds {
  x: number
  y: number
  width: number
  height: number
}

declare interface ElectronAPI {
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
  isElectron: boolean
  platform: 'win32' | 'darwin' | 'linux'
  supportsAutoLaunch: boolean
  supportsAutoUpdate: boolean
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
}

declare interface Window {
  electronAPI?: ElectronAPI
}
