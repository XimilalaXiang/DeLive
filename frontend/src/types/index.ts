// 重新导出 ASR 相关类型
export * from './asr'

// 兼容旧代码：保留 Soniox 类型别名
export type { SonioxToken, SonioxResponse, SonioxConfig } from './asr/vendors/soniox'

// 主题类型
export interface Topic {
  id: string
  name: string
  emoji: string
  description?: string
  createdAt: number
  updatedAt: number
}

// 标签类型
export interface Tag {
  id: string
  name: string
  color: string // 标签颜色 (tailwind color class)
}

// 预设标签颜色
export const TAG_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
] as const

// 转录 Token 类型（用于会话持久化和导出）
export interface TranscriptTokenData {
  text: string
  isFinal?: boolean
  startMs?: number
  endMs?: number
  speaker?: string
  language?: string
  confidence?: number
}

export interface TranscriptSpeaker {
  id: string
  label: string
  displayName?: string
}

export interface TranscriptSegment {
  text: string
  translatedText?: string
  startMs?: number
  endMs?: number
  speakerId?: string
  language?: string
  isFinal?: boolean
}

export interface TranscriptTranslationData {
  text: string
  targetLanguage?: string
  mode?: 'inline' | 'dual-line' | 'output-only'
  updatedAt?: number
}

export interface TranscriptChapter {
  title: string
  startMs?: number
  endMs?: number
  summary?: string
}

export type TranscriptPostProcessStatus = 'pending' | 'success' | 'error'
export type TranscriptAskTurnStatus = 'pending' | 'success' | 'error'
export type TranscriptMindMapStatus = 'pending' | 'success' | 'error'

export interface TranscriptQaCitation {
  quote: string
  speakerLabel?: string
}

export interface TranscriptAskTurn {
  id: string
  conversationId?: string
  question: string
  answer?: string
  citations?: TranscriptQaCitation[]
  createdAt: number
  answeredAt?: number
  model?: string
  status: TranscriptAskTurnStatus
  error?: string
}

export interface TranscriptMindMap {
  markdown: string
  title?: string
  generatedAt?: number
  requestedAt?: number
  updatedAt?: number
  model?: string
  status?: TranscriptMindMapStatus
  error?: string
}

export interface TranscriptPostProcess {
  summary?: string
  actionItems?: string[]
  keywords?: string[]
  chapters?: TranscriptChapter[]
  titleSuggestion?: string
  tagSuggestions?: string[]
  generatedAt?: number
  requestedAt?: number
  model?: string
  status?: TranscriptPostProcessStatus
  error?: string
}

export interface TranscriptSourceMeta {
  captureMode?: 'system-audio' | 'file' | 'mixed' | 'unknown'
  sourceId?: string
  sourceLabel?: string
  platform?: 'win32' | 'darwin' | 'linux' | 'unknown'
  providerMode?: 'realtime' | 'full-session-retranscription' | 'local-runtime' | 'unknown'
}

export type TranscriptSessionStatus = 'recording' | 'interrupted' | 'completed'
export type CaptionDisplayMode = 'source' | 'translated' | 'dual'

// 字幕样式
export interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
  width: number
  displayMode?: CaptionDisplayMode
}

// 转录会话类型
export interface TranscriptSession {
  id: string
  schemaVersion?: number
  title: string
  date: string // YYYY-MM-DD 格式
  time: string // HH:mm 格式
  createdAt: number // 时间戳
  updatedAt: number
  transcript: string
  translatedTranscript?: TranscriptTranslationData
  duration?: number // 毫秒
  topicId?: string // 归属的主题ID
  tagIds?: string[] // 关联的标签ID列表
  tokens?: TranscriptTokenData[] // 带时间戳的 tokens（用于 SRT 导出）
  speakers?: TranscriptSpeaker[]
  segments?: TranscriptSegment[]
  sourceMeta?: TranscriptSourceMeta
  postProcess?: TranscriptPostProcess
  askHistory?: TranscriptAskTurn[]
  mindMap?: TranscriptMindMap
  providerId?: string
  status?: TranscriptSessionStatus
  lastPersistedAt?: number
  wasInterrupted?: boolean
}

// 应用状态类型
export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'switching'

// 提供商配置类型
export interface ProviderConfigData {
  apiKey?: string
  languageHints?: string[]
  [key: string]: unknown
}

export type AiFeatureKey = 'briefing' | 'chat' | 'mindmap' | 'correction'

export interface AiPostProcessConfig {
  enabled?: boolean
  provider?: 'openai-compatible'
  baseUrl?: string
  apiKey?: string
  promptLanguage?: 'zh' | 'en'

  /** @deprecated Use defaultModel instead */
  model?: string

  availableModels?: string[]
  selectedModels?: string[]
  defaultModel?: string
  modelAssignment?: Partial<Record<AiFeatureKey, string>>
}

export interface OpenApiConfig {
  enabled?: boolean
  token?: string
}

export type CloudBackupProviderType = 's3' | 'webdav'

export interface S3BackupConfig {
  endpoint: string
  region: string
  bucket: string
  prefix: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

export interface WebDAVBackupConfig {
  url: string
  username: string
  password: string
  basePath: string
}

export interface CloudBackupConfig {
  enabled?: boolean
  provider?: CloudBackupProviderType
  autoBackupOnComplete?: boolean
  s3?: S3BackupConfig
  webdav?: WebDAVBackupConfig
}

export interface CloudBackupFileInfo {
  key: string
  lastModified: string
  size: number
}

// 应用设置（支持多提供商）
export interface AppSettings {
  // 兼容旧版：保留单一 API Key（用于 Soniox）
  apiKey: string
  languageHints: string[]
  // 新增：当前选择的提供商
  currentVendor?: string
  // 新增：各提供商的配置
  providerConfigs?: Record<string, ProviderConfigData>
  // 自动更新设置
  autoCheckUpdate?: boolean
  // 字幕样式
  captionStyle?: CaptionStyle
  // 配色主题
  colorTheme?: string
  // AI 后处理
  aiPostProcess?: AiPostProcessConfig
  // Open API
  openApi?: OpenApiConfig
  // Cloud Backup
  cloudBackup?: CloudBackupConfig
}
