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
}

declare interface Window {
  electronAPI?: ElectronAPI
}
