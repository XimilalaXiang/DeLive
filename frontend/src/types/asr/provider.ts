/**
 * ASR Provider 接口定义
 * 定义了所有 ASR 提供商必须实现的接口
 */

import type {
  ASRVendor,
  ASRProviderInfo,
  ProviderState,
  ASREventCallbacks,
} from './common'

// Provider 配置接口
export interface ProviderConfig {
  apiKey: string
  languageHints?: string[]
  model?: string
  // 允许提供商特定的额外配置
  [key: string]: unknown
}

// ASR Provider 核心接口
export interface ASRProvider {
  // 提供商信息
  readonly id: ASRVendor
  readonly info: ASRProviderInfo

  // 状态
  readonly state: ProviderState
  readonly isConnected: boolean
  readonly isRecording: boolean

  // 生命周期方法
  connect(config: ProviderConfig): Promise<void>
  disconnect(): Promise<void>

  // 音频数据发送
  sendAudio(data: Blob | ArrayBuffer): void

  // 事件监听
  on<K extends keyof ASREventCallbacks>(
    event: K,
    callback: NonNullable<ASREventCallbacks[K]>
  ): () => void

  // 移除事件监听
  off<K extends keyof ASREventCallbacks>(
    event: K,
    callback: NonNullable<ASREventCallbacks[K]>
  ): void

  // 清理所有监听器
  removeAllListeners(): void
}

// Provider 构造函数类型
export type ASRProviderConstructor = new () => ASRProvider

// Provider 注册表条目
export interface ProviderRegistryEntry {
  info: ASRProviderInfo
  create: () => ASRProvider
}

// 用于存储的提供商配置
export interface StoredProviderConfig {
  vendorId: ASRVendor
  config: ProviderConfig
}

// 多提供商配置存储
export interface MultiProviderSettings {
  currentVendor: ASRVendor
  configs: Partial<Record<ASRVendor, ProviderConfig>>
}
