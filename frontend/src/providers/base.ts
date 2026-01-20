/**
 * ASR Provider 基类
 * 提供通用的事件管理和状态管理功能
 */

import type {
  ASRProvider,
  ASRProviderInfo,
  ASREventCallbacks,
  ProviderConfig,
  ProviderState,
  ASRVendor,
  TranscriptToken,
  ASRError,
} from '../types/asr'

type EventCallback = NonNullable<ASREventCallbacks[keyof ASREventCallbacks]>

export abstract class BaseASRProvider implements ASRProvider {
  abstract readonly id: ASRVendor
  abstract readonly info: ASRProviderInfo

  protected _state: ProviderState = 'idle'
  protected _config: ProviderConfig | null = null
  
  // 事件监听器存储
  private listeners: Map<keyof ASREventCallbacks, Set<EventCallback>> = new Map()

  get state(): ProviderState {
    return this._state
  }

  get isConnected(): boolean {
    return this._state === 'connected' || this._state === 'recording' || this._state === 'processing'
  }

  get isRecording(): boolean {
    return this._state === 'recording'
  }

  // 状态变更
  protected setState(newState: ProviderState): void {
    if (this._state !== newState) {
      this._state = newState
      this.emit('onStateChange', newState)
    }
  }

  // 抽象方法：子类必须实现
  abstract connect(config: ProviderConfig): Promise<void>
  abstract disconnect(): Promise<void>
  abstract sendAudio(data: Blob | ArrayBuffer): void

  // 事件监听
  on<K extends keyof ASREventCallbacks>(
    event: K,
    callback: NonNullable<ASREventCallbacks[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback)
    
    // 返回取消订阅函数
    return () => this.off(event, callback)
  }

  // 移除事件监听
  off<K extends keyof ASREventCallbacks>(
    event: K,
    callback: NonNullable<ASREventCallbacks[K]>
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback as EventCallback)
    }
  }

  // 清理所有监听器
  removeAllListeners(): void {
    this.listeners.clear()
  }

  // 触发事件
  protected emit<K extends keyof ASREventCallbacks>(
    event: K,
    ...args: Parameters<NonNullable<ASREventCallbacks[K]>>
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          // @ts-expect-error - 类型系统无法完美推断
          callback(...args)
        } catch (error) {
          console.error(`[${this.id}] Error in ${event} callback:`, error)
        }
      })
    }
  }

  // 便捷方法：发送 Token
  protected emitToken(token: TranscriptToken): void {
    this.emit('onToken', token)
  }

  // 便捷方法：发送多个 Tokens
  protected emitTokens(tokens: TranscriptToken[]): void {
    this.emit('onTokens', tokens)
  }

  // 便捷方法：发送部分结果
  protected emitPartial(text: string): void {
    this.emit('onPartial', text)
  }

  // 便捷方法：发送最终结果
  protected emitFinal(text: string): void {
    this.emit('onFinal', text)
  }

  // 便捷方法：发送错误
  protected emitError(error: ASRError): void {
    this.emit('onError', error)
    this.setState('error')
  }

  // 便捷方法：发送完成事件
  protected emitFinished(): void {
    this.emit('onFinished')
  }

  // 创建标准错误对象
  protected createError(code: string, message: string, details?: Record<string, unknown>): ASRError {
    return { code, message, details }
  }
}
