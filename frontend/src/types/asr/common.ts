export enum ASRVendor {
  Soniox = 'soniox',
  Volc = 'volc',
  Groq = 'groq',
  SiliconFlow = 'siliconflow',
  LocalOpenAI = 'local_openai',
  LocalWhisperCpp = 'local_whisper_cpp',
}

export type ProviderType = 'cloud' | 'local'

export type AudioInputMode = 'media-recorder' | 'pcm16'
export type AudioPayloadFormat = 'webm-opus' | 'pcm16' | 'wav' | 'auto'
export type ASRWorkloadKind = 'live-capture' | 'file-transcription' | 'post-process'
export type ASRWorkloadAvailability = 'implemented' | 'compatible' | 'unsupported'
export type ASRWorkloadExecutionMode =
  | 'realtime-stream'
  | 'windowed-batch'
  | 'single-request'
  | 'local-runtime'
  | 'native-job'

export type ASRTransportType =
  | 'realtime'
  | 'chunked-upload'
  | 'full-session-retranscription'
  | 'local-runtime'

export type CaptureRestartStrategy = 'reuse-session' | 'reconnect-session'

export interface ASRTransportCapabilities {
  type: ASRTransportType
  captureRestartStrategy?: CaptureRestartStrategy
}

export interface ASRAudioProfileCapabilities {
  payloadFormat: AudioPayloadFormat
  sampleRateHz?: number
  channels?: number
  preferredChunkMs?: number
}

export interface ASRPromptingCapabilities {
  supportsLanguageHints?: boolean
  supportsPromptText?: boolean
  supportsKeyterms?: boolean
  supportsGlossary?: boolean
}

export interface ASRTimestampCapabilities {
  supportsTokenTimestamps?: boolean
  supportsWordTimestamps?: boolean
  supportsSegmentTimestamps?: boolean
}

export interface ASRWorkloadCapability {
  availability: ASRWorkloadAvailability
  executionMode?: ASRWorkloadExecutionMode
  inputSources?: Array<'system-audio' | 'microphone' | 'file'>
  acceptedFileKinds?: Array<'audio' | 'video'>
}

export interface ASRProviderWorkloadCapabilities {
  liveCapture: ASRWorkloadCapability
  fileTranscription?: ASRWorkloadCapability
  postProcess?: ASRWorkloadCapability
}

export type LocalProviderConnectionMode = 'service' | 'runtime'

export interface LocalProviderCapabilities {
  connectionMode: LocalProviderConnectionMode
  supportsServiceDiscovery?: boolean
  supportsModelDiscovery?: boolean
  supportsModelInstall?: boolean
  supportsManualModelImport?: boolean
  supportsPreload?: boolean
  runtimeId?: string
}

export interface ASRProviderCapabilities {
  audioInputMode: AudioInputMode
  audioProfile?: ASRAudioProfileCapabilities
  transport: ASRTransportCapabilities
  prompting?: ASRPromptingCapabilities
  timestamps?: ASRTimestampCapabilities
  workloads?: ASRProviderWorkloadCapabilities
  prefersTokenEvents?: boolean
  supportsConfigTest?: boolean
  supportsTranslation?: boolean
  supportsSpeakerDiarization?: boolean
  local?: LocalProviderCapabilities
}

export interface ASRProviderInfo {
  id: ASRVendor
  name: string
  description: string
  type: ProviderType
  supportsStreaming: boolean
  capabilities: ASRProviderCapabilities
  requiredConfigKeys: string[]
  supportedLanguages: string[]
  website: string
  docsUrl?: string
  configFields: ProviderConfigField[]
}

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

export interface TranscriptToken {
  text: string
  isFinal: boolean
  startMs?: number
  endMs?: number
  confidence?: number
  language?: string
  speaker?: string
  translationStatus?: 'none' | 'original' | 'translation'
  sourceLanguage?: string
}

export interface TranscriptResponse {
  tokens: TranscriptToken[]
  finished: boolean
  totalAudioMs?: number
  error?: ASRError
}

export interface ASRError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface BaseProviderConfig {
  apiKey?: string
  languageHints?: string[]
}

export type ProviderState = 'idle' | 'connecting' | 'connected' | 'recording' | 'processing' | 'error'

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

export function getDefaultProviderWorkloads(capabilities: ASRProviderCapabilities): ASRProviderWorkloadCapabilities {
  const executionMode: ASRWorkloadExecutionMode =
    capabilities.transport.type === 'realtime'
      ? 'realtime-stream'
      : capabilities.transport.type === 'local-runtime'
        ? 'local-runtime'
        : 'windowed-batch'

  return {
    liveCapture: {
      availability: 'implemented',
      executionMode,
      inputSources: ['system-audio'],
      acceptedFileKinds: ['audio'],
    },
    fileTranscription: {
      availability: 'unsupported',
    },
  }
}

export function getResolvedProviderWorkloads(capabilities: ASRProviderCapabilities): ASRProviderWorkloadCapabilities {
  return {
    ...getDefaultProviderWorkloads(capabilities),
    ...capabilities.workloads,
  }
}

export function supportsProviderWorkload(
  capabilities: ASRProviderCapabilities,
  workload: ASRWorkloadKind,
): boolean {
  const resolved = getResolvedProviderWorkloads(capabilities)
  const capability = workload === 'live-capture'
    ? resolved.liveCapture
    : workload === 'file-transcription'
      ? resolved.fileTranscription
      : resolved.postProcess

  return capability?.availability === 'implemented' || capability?.availability === 'compatible'
}
