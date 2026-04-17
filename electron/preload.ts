import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiRecordingStatus,
  ApiTagData,
  ApiTopicData,
  CaptionStyle,
  ElectronAPI,
  SessionDetail,
  SessionSummary,
} from '../shared/electronApi'

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  windowMinimize: (source?: string) => ipcRenderer.invoke('window-minimize', source),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,

  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('set-auto-launch', enable) as Promise<boolean>,
  pickFilePath: (options) => ipcRenderer.invoke('pick-file-path', options) as Promise<string | null>,
  pathExists: (targetPath: string) => ipcRenderer.invoke('path-exists', targetPath) as Promise<boolean>,

  localRuntimeGetStatus: (runtimeId: string, options) =>
    ipcRenderer.invoke('local-runtime-get-status', runtimeId, options),
  localRuntimeOpenModelsPath: (runtimeId: string) =>
    ipcRenderer.invoke('local-runtime-open-models-path', runtimeId),
  localRuntimeListModels: (runtimeId: string) =>
    ipcRenderer.invoke('local-runtime-list-models', runtimeId),
  localRuntimeImportModel: (runtimeId: string, sourcePath: string) =>
    ipcRenderer.invoke('local-runtime-import-model', runtimeId, sourcePath),
  localRuntimeImportBinary: (runtimeId: string, sourcePath: string) =>
    ipcRenderer.invoke('local-runtime-import-binary', runtimeId, sourcePath),
  localRuntimeDownloadModel: (runtimeId: string, urlString: string) =>
    ipcRenderer.invoke('local-runtime-download-model', runtimeId, urlString),
  localRuntimeDownloadBinary: (runtimeId: string, urlString: string) =>
    ipcRenderer.invoke('local-runtime-download-binary', runtimeId, urlString),
  localRuntimeStart: (runtimeId: string, options) =>
    ipcRenderer.invoke('local-runtime-start', runtimeId, options),
  localRuntimeStop: (runtimeId: string, options) =>
    ipcRenderer.invoke('local-runtime-stop', runtimeId, options),

  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  selectSource: (sourceId: string) => ipcRenderer.invoke('select-source', sourceId),
  cancelSourceSelection: () => ipcRenderer.invoke('cancel-source-selection'),
  onShowSourcePicker: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('show-source-picker', listener)
    return () => ipcRenderer.removeListener('show-source-picker', listener)
  },

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onCheckingForUpdate: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('checking-for-update', listener)
    return () => ipcRenderer.removeListener('checking-for-update', listener)
  },
  onUpdateAvailable: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string; releaseDate?: string; releaseNotes?: string }) => callback(info)
    ipcRenderer.on('update-available', listener)
    return () => ipcRenderer.removeListener('update-available', listener)
  },
  onUpdateNotAvailable: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('update-not-available', listener)
    return () => ipcRenderer.removeListener('update-not-available', listener)
  },
  onDownloadProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(progress)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('update-downloaded', listener)
    return () => ipcRenderer.removeListener('update-downloaded', listener)
  },
  onUpdateError: (callback: (error: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('update-error', listener)
    return () => ipcRenderer.removeListener('update-error', listener)
  },

  captionToggle: (enable?: boolean, source?: string) =>
    ipcRenderer.invoke('caption-toggle', enable, source) as Promise<boolean>,
  captionGetStatus: () => ipcRenderer.invoke('caption-get-status'),
  captionUpdateText: (
    stableText: string,
    activeText: string,
    isFinal: boolean,
    translatedStableText = '',
    translatedActiveText = '',
  ) => ipcRenderer.invoke(
    'caption-update-text',
    stableText,
    activeText,
    isFinal,
    translatedStableText,
    translatedActiveText,
  ),
  captionUpdateStyle: (style) => ipcRenderer.invoke('caption-update-style', style),
  captionToggleDraggable: (draggable?: boolean) =>
    ipcRenderer.invoke('caption-toggle-draggable', draggable) as Promise<boolean>,
  captionSetInteractive: (interactive: boolean) =>
    ipcRenderer.invoke('caption-set-interactive', interactive) as Promise<boolean>,
  captionGetBounds: () => ipcRenderer.invoke('caption-get-bounds'),
  captionSetBounds: (bounds) => ipcRenderer.invoke('caption-set-bounds', bounds) as Promise<boolean>,
  captionResetPosition: () => ipcRenderer.invoke('caption-reset-position') as Promise<boolean>,
  onCaptionStatusChanged: (callback: (enabled: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled)
    ipcRenderer.on('caption-status-changed', listener)
    return () => ipcRenderer.removeListener('caption-status-changed', listener)
  },
  onCaptionTextUpdate: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: {
        stableText: string
        activeText: string
        translatedStableText: string
        translatedActiveText: string
        text: string
        translatedText: string
        isFinal: boolean
      },
    ) => callback(data)
    ipcRenderer.on('caption-text-update', listener)
    return () => ipcRenderer.removeListener('caption-text-update', listener)
  },
  onCaptionStyleUpdate: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, style: CaptionStyle) => callback(style)
    ipcRenderer.on('caption-style-update', listener)
    return () => ipcRenderer.removeListener('caption-style-update', listener)
  },
  onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, draggable: boolean) => callback(draggable)
    ipcRenderer.on('caption-draggable-changed', listener)
    return () => ipcRenderer.removeListener('caption-draggable-changed', listener)
  },
  onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, interactive: boolean) => callback(interactive)
    ipcRenderer.on('caption-interactive-changed', listener)
    return () => ipcRenderer.removeListener('caption-interactive-changed', listener)
  },
  captionOpenSettings: () => ipcRenderer.invoke('caption-open-settings'),
  onOpenCaptionSettings: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('open-caption-settings', listener)
    return () => ipcRenderer.removeListener('open-caption-settings', listener)
  },

  onToggleRecording: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('toggle-recording', listener)
    return () => ipcRenderer.removeListener('toggle-recording', listener)
  },

  apiNotifySessionStart: (sessionId: string) => {
    ipcRenderer.send('api-notify-session-start', sessionId)
  },
  apiNotifySessionEnd: (sessionId: string) => {
    ipcRenderer.send('api-notify-session-end', sessionId)
  },

  onApiGetSessions: (callback: (event: unknown) => void) => {
    const listener = (event: Electron.IpcRendererEvent) => callback(event)
    ipcRenderer.on('api-get-sessions', listener)
    return () => ipcRenderer.removeListener('api-get-sessions', listener)
  },
  apiRespondSessions: (sessions: SessionSummary[]) => {
    ipcRenderer.send('api-respond-sessions', sessions)
  },
  onApiGetSessionDetail: (callback: (event: unknown, sessionId: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, sessionId: string) => callback(_event, sessionId)
    ipcRenderer.on('api-get-session-detail', listener)
    return () => ipcRenderer.removeListener('api-get-session-detail', listener)
  },
  apiRespondSessionDetail: (session: SessionDetail | null) => {
    ipcRenderer.send('api-respond-session-detail', session)
  },
  onApiSearchSessions: (callback: (event: unknown, query: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, query: string) => callback(_event, query)
    ipcRenderer.on('api-search-sessions', listener)
    return () => ipcRenderer.removeListener('api-search-sessions', listener)
  },
  apiRespondSearchSessions: (sessions: SessionSummary[]) => {
    ipcRenderer.send('api-respond-search-sessions', sessions)
  },
  onApiGetTopics: (callback: (event: unknown) => void) => {
    const listener = (event: Electron.IpcRendererEvent) => callback(event)
    ipcRenderer.on('api-get-topics', listener)
    return () => ipcRenderer.removeListener('api-get-topics', listener)
  },
  apiRespondTopics: (topics: ApiTopicData[]) => {
    ipcRenderer.send('api-respond-topics', topics)
  },
  onApiGetTags: (callback: (event: unknown) => void) => {
    const listener = (event: Electron.IpcRendererEvent) => callback(event)
    ipcRenderer.on('api-get-tags', listener)
    return () => ipcRenderer.removeListener('api-get-tags', listener)
  },
  apiRespondTags: (tags: ApiTagData[]) => {
    ipcRenderer.send('api-respond-tags', tags)
  },
  onApiGetRecordingStatus: (callback: (event: unknown) => void) => {
    const listener = (event: Electron.IpcRendererEvent) => callback(event)
    ipcRenderer.on('api-get-recording-status', listener)
    return () => ipcRenderer.removeListener('api-get-recording-status', listener)
  },
  apiRespondRecordingStatus: (status: ApiRecordingStatus) => {
    ipcRenderer.send('api-respond-recording-status', status)
  },

  apiUpdateOpenApiConfig: (config: { enabled: boolean; token: string }) => {
    ipcRenderer.send('api-update-open-api-config', config)
  },

  isElectron: true,
  platform: process.platform as 'win32' | 'darwin' | 'linux',

  exportDiagnostics: (payload) => ipcRenderer.invoke('export-diagnostics', payload),

  safeStorageSet: (key: string, value: string) => ipcRenderer.invoke('safe-storage-set', key, value) as Promise<boolean>,
  safeStorageGet: (key: string) => ipcRenderer.invoke('safe-storage-get', key) as Promise<string | null>,
  safeStorageDelete: (key: string) => ipcRenderer.invoke('safe-storage-delete', key) as Promise<boolean>,
  safeStorageAvailable: () => ipcRenderer.invoke('safe-storage-available') as Promise<boolean>,

  supportsAutoLaunch: process.platform === 'win32' || process.platform === 'darwin',
  supportsAutoUpdate: process.platform !== 'linux' || Boolean(process.env.APPIMAGE),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
