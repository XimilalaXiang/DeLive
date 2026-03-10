export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon: string | null
  isScreen: boolean
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

export interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface LocalRuntimeLaunchOptions {
  binaryPath?: string
  modelPath?: string
  port?: number
}

export interface LocalRuntimeSnapshot {
  runtimeId: string
  displayName: string
  status: LocalRuntimeStatus
  available: boolean
  modelsPath: string
  binaryPath: string | null
  baseUrl: string
  message?: string
}

export interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
  displayMode?: 'source' | 'translated' | 'dual'
}

export interface CaptionStatus {
  enabled: boolean
  draggable: boolean
  style: CaptionStyle
  stableText: string
  activeText: string
  translatedStableText: string
  translatedActiveText: string
  translatedText: string
  text: string
  isFinal: boolean
}

export interface CaptionBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface FilePickerOptions {
  title?: string
  filters?: Array<{
    name: string
    extensions: string[]
  }>
}

export interface PathOperationResult {
  success: boolean
  path: string
  error?: string
}

export interface RuntimeCommandResult {
  success: boolean
  status: LocalRuntimeSnapshot
  error?: string
}

export interface UpdateCheckResult {
  success?: boolean
  version?: string
  error?: string
}

export interface DownloadUpdateResult {
  success?: boolean
  error?: string
}

export interface CaptionTextUpdatePayload {
  stableText: string
  activeText: string
  translatedStableText: string
  translatedActiveText: string
  text: string
  translatedText: string
  isFinal: boolean
}

export interface DiagnosticsExportResult {
  success: boolean
  path?: string
  reason?: string
}

export interface DiagnosticsExportPayload {
  settings: Record<string, unknown>
  localStorageKeys: string[]
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  minimizeToTray: () => Promise<void>
  windowMinimize: (source?: string) => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enable: boolean) => Promise<boolean>
  pickFilePath: (options?: FilePickerOptions) => Promise<string | null>
  pathExists: (targetPath: string) => Promise<boolean>
  localRuntimeGetStatus: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<LocalRuntimeSnapshot>
  localRuntimeOpenModelsPath: (runtimeId: string) => Promise<PathOperationResult>
  localRuntimeListModels: (runtimeId: string) => Promise<string[]>
  localRuntimeImportModel: (runtimeId: string, sourcePath: string) => Promise<PathOperationResult>
  localRuntimeImportBinary: (runtimeId: string, sourcePath: string) => Promise<PathOperationResult>
  localRuntimeDownloadModel: (runtimeId: string, urlString: string) => Promise<PathOperationResult>
  localRuntimeDownloadBinary: (runtimeId: string, urlString: string) => Promise<PathOperationResult>
  localRuntimeStart: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<RuntimeCommandResult>
  localRuntimeStop: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<RuntimeCommandResult>
  getDesktopSources: () => Promise<DesktopSource[]>
  selectSource: (sourceId: string) => Promise<boolean>
  cancelSourceSelection: () => Promise<void>
  onShowSourcePicker: (callback: () => void) => () => void
  checkForUpdates: () => Promise<UpdateCheckResult>
  downloadUpdate: () => Promise<DownloadUpdateResult>
  installUpdate: () => void
  onCheckingForUpdate: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
  onUpdateError: (callback: (error: string) => void) => () => void
  captionToggle: (enable?: boolean, source?: string) => Promise<boolean>
  captionGetStatus: () => Promise<CaptionStatus>
  captionUpdateText: (
    stableText: string,
    activeText: string,
    isFinal: boolean,
    translatedStableText?: string,
    translatedActiveText?: string,
  ) => Promise<void>
  captionUpdateStyle: (style: Partial<CaptionStyle>) => Promise<CaptionStyle>
  captionToggleDraggable: (draggable?: boolean) => Promise<boolean>
  captionSetInteractive: (interactive: boolean) => Promise<boolean>
  captionGetBounds: () => Promise<CaptionBounds | null>
  captionSetBounds: (bounds: Partial<CaptionBounds>) => Promise<boolean>
  captionResetPosition: () => Promise<boolean>
  onCaptionStatusChanged: (callback: (enabled: boolean) => void) => () => void
  onCaptionTextUpdate: (callback: (data: CaptionTextUpdatePayload) => void) => () => void
  onCaptionStyleUpdate: (callback: (style: CaptionStyle) => void) => () => void
  onCaptionDraggableChanged: (callback: (draggable: boolean) => void) => () => void
  onCaptionInteractiveChanged: (callback: (interactive: boolean) => void) => () => void
  captionOpenSettings: () => Promise<boolean>
  onOpenCaptionSettings: (callback: () => void) => () => void
  exportDiagnostics: (payload: DiagnosticsExportPayload) => Promise<DiagnosticsExportResult>
  safeStorageSet: (key: string, value: string) => Promise<boolean>
  safeStorageGet: (key: string) => Promise<string | null>
  safeStorageDelete: (key: string) => Promise<boolean>
  safeStorageAvailable: () => Promise<boolean>
  isElectron: boolean
  platform: 'win32' | 'darwin' | 'linux'
  supportsAutoLaunch: boolean
  supportsAutoUpdate: boolean
}
