export interface SiliconFlowProviderConfig {
  apiKey: string
  model?: string
  languageHints?: string[]
}

export interface SiliconFlowTranscriptionResponse {
  text?: string
}

export interface SiliconFlowChatMessageContentPart {
  type?: string
  text?: string
}

export interface SiliconFlowChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | SiliconFlowChatMessageContentPart[]
    }
  }>
}

export const SILICONFLOW_DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1'
export const SILICONFLOW_DEFAULT_MODEL = 'FunAudioLLM/SenseVoiceSmall'

export const SILICONFLOW_CHAT_COMPLETION_MODELS = [
  {
    value: 'Qwen/Qwen3-Omni-30B-A3B-Instruct',
    label: 'Qwen/Qwen3-Omni-30B-A3B-Instruct',
  },
  {
    value: 'Qwen/Qwen3-Omni-30B-A3B-Thinking',
    label: 'Qwen/Qwen3-Omni-30B-A3B-Thinking',
  },
] as const

export const SILICONFLOW_AUDIO_TRANSCRIPTION_MODELS = [
  {
    value: 'TeleAI/TeleSpeechASR',
    label: 'TeleAI/TeleSpeechASR',
  },
  {
    value: 'FunAudioLLM/SenseVoiceSmall',
    label: 'FunAudioLLM/SenseVoiceSmall',
  },
] as const

export const SILICONFLOW_TRANSCRIPTION_MODELS = [
  ...SILICONFLOW_CHAT_COMPLETION_MODELS,
  ...SILICONFLOW_AUDIO_TRANSCRIPTION_MODELS,
] as const

export function isSiliconFlowChatCompletionModel(model: string): boolean {
  const normalizedModel = model.trim()
  return SILICONFLOW_CHAT_COMPLETION_MODELS.some((item) => item.value === normalizedModel)
}
