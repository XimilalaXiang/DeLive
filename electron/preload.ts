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
      isElectron: boolean
    }
  }
}
