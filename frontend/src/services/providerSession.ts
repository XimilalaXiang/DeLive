/**
 * ProviderSessionManager — ASR Provider 会话管理
 *
 * 负责：Provider 实例创建、连接/断开、事件监听注册。
 * 将 Provider 的 ASR 事件转发为简洁回调，隐藏 Provider 内部细节。
 */

import { createProvider, providerRegistry } from '../providers'
import {
  buildProviderConnectConfig,
  getMissingRequiredConfigLabels,
} from '../utils/providerConfig'
import { getCaptureRestartStrategy } from '../types/asr'
import type {
  ASRProvider,
  ASRVendor,
  ASRProviderInfo,
  ProviderConfig,
  TranscriptToken,
  ASRError,
  CaptureRestartStrategy,
} from '../types/asr'
import type { AppSettings, ProviderConfigData } from '../types'

export interface ProviderSessionCallbacks {
  onTokens: (tokens: TranscriptToken[]) => void
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (error: ASRError) => void
  onFinished: () => void
}

export interface ProviderSetup {
  providerInfo: ASRProviderInfo
  connectConfig: ProviderConfig
  captureRestartStrategy: CaptureRestartStrategy
}

export class ProviderSessionManager {
  private provider: ASRProvider | null = null
  private callbacks: ProviderSessionCallbacks | null = null

  get currentProvider(): ASRProvider | null {
    return this.provider
  }

  /**
   * 解析 vendor 配置、校验必填字段。
   * 抛出 Error 表示配置不完整。
   */
  resolveSetup(vendorId: ASRVendor, settings: AppSettings): ProviderSetup {
    const providerInfo = providerRegistry.getInfo(vendorId)
    if (!providerInfo) {
      throw new Error(`未找到提供商: ${vendorId}`)
    }

    const providerConfig = settings.providerConfigs?.[vendorId]
    const connectConfig = buildProviderConnectConfig(providerInfo, providerConfig, settings)

    const missingLabels = getMissingRequiredConfigLabels(
      providerInfo,
      connectConfig as ProviderConfigData,
    )
    if (missingLabels.length > 0) {
      throw new Error(`Please configure: ${missingLabels.join(', ')}`)
    }

    return {
      providerInfo,
      connectConfig,
      captureRestartStrategy: getCaptureRestartStrategy(providerInfo.capabilities),
    }
  }

  /** 创建 Provider 实例、注册事件、建立连接 */
  async connect(
    vendorId: ASRVendor,
    connectConfig: ProviderConfig,
    callbacks: ProviderSessionCallbacks,
  ): Promise<ASRProvider> {
    this.callbacks = callbacks

    const provider = createProvider(vendorId)
    if (!provider) {
      throw new Error(`未找到提供商: ${vendorId}`)
    }
    this.provider = provider
    this.bindListeners(provider)

    console.log('[ProviderSession] 连接 Provider...')
    await provider.connect(connectConfig)

    return provider
  }

  /** 断开连接并清理监听器 */
  async disconnect(): Promise<void> {
    const provider = this.provider
    if (!provider) return

    this.provider = null
    try {
      await provider.disconnect()
    } catch (error) {
      console.warn('[ProviderSession] Provider 断开连接失败:', error)
    } finally {
      provider.removeAllListeners()
    }
    this.callbacks = null
  }

  /** 向 Provider 发送音频数据 */
  sendAudio(data: Blob | ArrayBuffer): void {
    this.provider?.sendAudio(data)
  }

  // ── 内部实现 ──────────────────────────────────────────

  private bindListeners(provider: ASRProvider): void {
    provider.on('onTokens', (tokens: TranscriptToken[]) => {
      console.log('[ProviderSession] 收到 tokens:', tokens.length)
      this.callbacks?.onTokens(tokens)
    })

    if (!provider.info.capabilities.prefersTokenEvents) {
      provider.on('onPartial', (text: string) => {
        console.log('[ProviderSession] 收到 partial:', text.substring(0, 50))
        this.callbacks?.onPartial(text)
      })
    }

    if (!provider.info.capabilities.prefersTokenEvents) {
      provider.on('onFinal', (text: string) => {
        console.log('[ProviderSession] 收到 final:', text.substring(0, 50))
        this.callbacks?.onFinal(text)
      })
    }

    provider.on('onError', (error: ASRError) => {
      console.error('[ProviderSession] Provider 错误:', error)
      this.callbacks?.onError(error)
    })

    provider.on('onFinished', () => {
      console.log('[ProviderSession] 转录完成')
      this.callbacks?.onFinished()
    })
  }
}
