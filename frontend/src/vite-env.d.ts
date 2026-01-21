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
  isElectron: boolean
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
  captionSetInteractive: (interactive: boolean) => Promise<boolean>
  captionGetBounds: () => Promise<CaptionBounds | null>
  captionSetBounds: (bounds: Partial<CaptionBounds>) => Promise<boolean>
  captionResetPosition: () => Promise<boolean>
  onCaptionStatusChanged: (callback: (enabled: boolean) => void) => () => void
  onCaptionTextUpdate: (callback: (data: { text: string; isFinal: boolean }) => void) => () => void
  onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => () => void
  onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => () => void
  onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => () => void
  captionOpenSettings: () => Promise<boolean>
  onOpenCaptionSettings: (callback: () => void) => () => void
}

declare interface Window {
  electronAPI?: ElectronAPI
}
