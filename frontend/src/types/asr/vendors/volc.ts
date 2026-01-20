/**
 * 火山引擎 ASR 特定类型定义
 */

// 火山引擎 API 响应格式
export interface VolcResponse {
  result?: {
    text: string
    utterances?: VolcUtterance[]
  }
  code?: number
  message?: string
}

export interface VolcUtterance {
  text: string
  start_time: number
  end_time: number
  definite: boolean
  words?: VolcWord[]
}

export interface VolcWord {
  text: string
  start_time: number
  end_time: number
}

// 火山引擎配置
export interface VolcProviderConfig {
  appKey: string
  accessKey: string
  language?: string
  // 高级选项
  enableItn?: boolean
  enablePunc?: boolean
  enableDdc?: boolean // 语义顺滑
  enableNonstream?: boolean // 二遍识别
  enableVad?: boolean // VAD 判停
  modelV2?: boolean // 使用 V2 模型
  bidiStreaming?: boolean // 双向流式
}

// 火山引擎常量
export const VOLC_WS_ENDPOINT_BIDI = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'
export const VOLC_WS_ENDPOINT_NOSTREAM = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream'
export const VOLC_RESOURCE_V1 = 'volc.bigasr.sauc.duration'
export const VOLC_RESOURCE_V2 = 'volc.seedasr.sauc.duration'
