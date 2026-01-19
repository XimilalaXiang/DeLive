import { contextBridge, ipcRenderer } from 'electron'

// 桌面源类型
interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon: string | null
  isScreen: boolean
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
      isElectron: boolean
    }
  }
}
