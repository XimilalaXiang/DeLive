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

// ─── Open API types ───

export interface SessionSummary {
  id: string
  title: string
  date: string
  time: string
  createdAt: number
  updatedAt: number
  duration?: number
  status?: string
  topicId?: string
  tagIds?: string[]
  providerId?: string
  hasSummary: boolean
  hasMindMap: boolean
  transcriptLength: number
}

export interface SessionDetail {
  id: string
  title: string
  date: string
  time: string
  createdAt: number
  updatedAt: number
  duration?: number
  status?: string
  topicId?: string
  tagIds?: string[]
  providerId?: string
  transcript: string
  translatedTranscript?: {
    text: string
    targetLanguage?: string
  }
  tokens?: Array<{
    text: string
    isFinal?: boolean
    startMs?: number
    endMs?: number
    speaker?: string
  }>
  speakers?: Array<{
    id: string
    label: string
    displayName?: string
  }>
  segments?: Array<{
    text: string
    translatedText?: string
    startMs?: number
    endMs?: number
    speakerId?: string
  }>
  postProcess?: {
    summary?: string
    actionItems?: string[]
    keywords?: string[]
    titleSuggestion?: string
    tagSuggestions?: string[]
    generatedAt?: number
    status?: string
  }
  mindMap?: {
    markdown: string
    title?: string
    generatedAt?: number
    status?: string
  }
  askHistory?: Array<{
    id: string
    question: string
    answer?: string
    createdAt: number
    status: string
  }>
  correction?: {
    correctedText?: string
    status: string
    mode: string
  }
}

export interface ApiRecordingStatus {
  isRecording: boolean
  currentSessionId: string | null
  recordingState: string
}

export interface ApiTopicData {
  id: string
  name: string
  emoji: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface ApiTagData {
  id: string
  name: string
  color: string
}

// ─── Cloud Backup types ───

export interface CloudBackupIpcConfig {
  provider: 's3' | 'webdav'
  s3?: {
    endpoint: string
    region: string
    bucket: string
    prefix: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle?: boolean
  }
  webdav?: {
    url: string
    username: string
    password: string
    basePath: string
  }
}

export interface CloudBackupIpcFileInfo {
  key: string
  lastModified: string
  size: number
}

// ─── Core types ───

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
  onToggleRecording: (callback: () => void) => () => void
  apiNotifySessionStart: (sessionId: string) => void
  apiNotifySessionEnd: (sessionId: string) => void

  onApiGetSessions: (callback: (event: unknown) => void) => () => void
  apiRespondSessions: (sessions: SessionSummary[]) => void
  onApiGetSessionDetail: (callback: (event: unknown, sessionId: string) => void) => () => void
  apiRespondSessionDetail: (session: SessionDetail | null) => void
  onApiSearchSessions: (callback: (event: unknown, query: string) => void) => () => void
  apiRespondSearchSessions: (sessions: SessionSummary[]) => void
  onApiGetTopics: (callback: (event: unknown) => void) => () => void
  apiRespondTopics: (topics: ApiTopicData[]) => void
  onApiGetTags: (callback: (event: unknown) => void) => () => void
  apiRespondTags: (tags: ApiTagData[]) => void
  onApiGetRecordingStatus: (callback: (event: unknown) => void) => () => void
  apiRespondRecordingStatus: (status: ApiRecordingStatus) => void

  apiUpdateOpenApiConfig: (config: { enabled: boolean; token: string }) => void

  cloudBackupTest: (config: CloudBackupIpcConfig) => Promise<{ ok: boolean; error?: string }>
  cloudBackupUpload: (config: CloudBackupIpcConfig, jsonData: string) => Promise<{ ok: boolean; key?: string; error?: string }>
  cloudBackupList: (config: CloudBackupIpcConfig) => Promise<{ ok: boolean; files?: CloudBackupIpcFileInfo[]; error?: string }>
  cloudBackupDownload: (config: CloudBackupIpcConfig, key: string) => Promise<{ ok: boolean; data?: string; error?: string }>
  cloudBackupDelete: (config: CloudBackupIpcConfig, key: string) => Promise<{ ok: boolean; error?: string }>

  isElectron: boolean
  platform: 'win32' | 'darwin' | 'linux'
  supportsAutoLaunch: boolean
  supportsAutoUpdate: boolean
}
