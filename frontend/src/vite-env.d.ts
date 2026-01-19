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
}

declare interface Window {
  electronAPI?: ElectronAPI
}
