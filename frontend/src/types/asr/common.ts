/**
 * 通用 ASR 类型定义
 * 定义了所有 ASR 提供商共享的基础类型
 */

// ASR 提供商枚举
export enum ASRVendor {
  Soniox = 'soniox',
  Volc = 'volc',
  Groq = 'groq',
  SiliconFlow = 'siliconflow',
  LocalOpenAI = 'local_openai',
  LocalWhisperCpp = 'local_whisper_cpp',
}

// 提供商类型：云端或本地
export type ProviderType = 'cloud' | 'local'

// 音频输入模式
export type AudioInputMode = 'media-recorder' | 'pcm16'

// 传输层类型
export type ASRTransportType =
  | 'realtime'
  | 'chunked-upload'
  | 'full-session-retranscription'
  | 'local-runtime'

// 采集重启时的会话策略
export type CaptureRestartStrategy = 'reuse-session' | 'reconnect-session'

// 传输能力定义
export interface ASRTransportCapabilities {
  type: ASRTransportType
  captureRestartStrategy?: CaptureRestartStrategy
}

// 本地 Provider 连接模式
export type LocalProviderConnectionMode = 'service' | 'runtime'

// 本地 Provider 管理能力
export interface LocalProviderCapabilities {
  // 连接到已有本地服务，或连接到随应用打包的本地运行时
  connectionMode: LocalProviderConnectionMode
  // 是否支持探测本地服务
  supportsServiceDiscovery?: boolean
  // 是否支持发现已安装模型
  supportsModelDiscovery?: boolean
  // 是否支持通过服务侧安装/拉取模型
  supportsModelInstall?: boolean
  // 是否支持手动导入模型
  supportsManualModelImport?: boolean
  // 是否支持预加载本地模型
  supportsPreload?: boolean
  // bundled runtime 场景可选的 runtime 标识
  runtimeId?: string
}

// 提供商能力定义
export interface ASRProviderCapabilities {
  // 需要的音频输入格式
  audioInputMode: AudioInputMode
  // Provider 在网络/进程层面的传输模型
  transport: ASRTransportCapabilities
  // 是否主要通过 onTokens 产出中间结果
  prefersTokenEvents?: boolean
  // 是否支持在设置页进行连通性测试
  supportsConfigTest?: boolean
  // 本地 Provider 的运行时/模型管理能力
  local?: LocalProviderCapabilities
}

// 提供商信息
export interface ASRProviderInfo {
  id: ASRVendor
  name: string
  description: string
  type: ProviderType
  // 兼容旧 UI / 旧逻辑的粗粒度字段；新代码优先读 capabilities.transport
  supportsStreaming: boolean
  capabilities: ASRProviderCapabilities
  // 必填配置字段（对应 configFields.key）
  requiredConfigKeys: string[]
  supportedLanguages: string[]
  website: string
  docsUrl?: string
  // 配置字段定义
  configFields: ProviderConfigField[]
}

// 配置字段类型
export interface ProviderConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'select' | 'multiselect' | 'number' | 'boolean'
  required: boolean
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean | string[]
}

// 通用转录 Token（统一格式）
export interface TranscriptToken {
  text: string
  isFinal: boolean
  startMs?: number
  endMs?: number
  confidence?: number
  language?: string
  speaker?: string
}

// 通用转录响应
export interface TranscriptResponse {
  tokens: TranscriptToken[]
  finished: boolean
  totalAudioMs?: number
  error?: ASRError
}

// ASR 错误类型
export interface ASRError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// 提供商配置（通用基础）
export interface BaseProviderConfig {
  apiKey?: string
  languageHints?: string[]
}

// 提供商状态
export type ProviderState = 'idle' | 'connecting' | 'connected' | 'recording' | 'processing' | 'error'

// ASR 事件回调
export interface ASREventCallbacks {
  onToken?: (token: TranscriptToken) => void
  onTokens?: (tokens: TranscriptToken[]) => void
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (error: ASRError) => void
  onStateChange?: (state: ProviderState) => void
  onFinished?: () => void
}

export function getCaptureRestartStrategy(capabilities: ASRProviderCapabilities): CaptureRestartStrategy {
  return capabilities.transport.captureRestartStrategy ?? 'reuse-session'
}

export function isRealtimeTransport(transport: ASRTransportCapabilities | ASRTransportType): boolean {
  const transportType = typeof transport === 'string' ? transport : transport.type
  return transportType === 'realtime'
}
