import { describe, it, expect, vi } from 'vitest'
import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'

class TestProvider extends BaseASRProvider {
  readonly id = 'soniox' as ASRVendor
  readonly info: ASRProviderInfo = {
    id: 'soniox' as ASRVendor,
    name: 'Test Provider',
    description: 'For testing',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder',
      transport: { type: 'realtime' },
    },
    requiredConfigKeys: [],
    supportedLanguages: ['en'],
    website: 'https://test.com',
    configFields: [],
  }

  async connect(_config: ProviderConfig): Promise<void> {
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    this.setState('idle')
  }

  sendAudio(_data: Blob | ArrayBuffer): void {
    // no-op for test
  }

  testEmitTokens(tokens: Parameters<typeof this.emitTokens>[0]) {
    this.emitTokens(tokens)
  }

  testEmitPartial(text: string) {
    this.emitPartial(text)
  }

  testEmitFinal(text: string) {
    this.emitFinal(text)
  }

  testEmitError(code: string, message: string) {
    this.emitError(this.createError(code, message))
  }

  testEmitFinished() {
    this.emitFinished()
  }
}

describe('BaseASRProvider', () => {
  describe('state management', () => {
    it('starts in idle state', () => {
      const provider = new TestProvider()
      expect(provider.state).toBe('idle')
      expect(provider.isConnected).toBe(false)
      expect(provider.isRecording).toBe(false)
    })

    it('transitions to connected after connect', async () => {
      const provider = new TestProvider()
      await provider.connect({})
      expect(provider.state).toBe('connected')
      expect(provider.isConnected).toBe(true)
    })

    it('transitions back to idle after disconnect', async () => {
      const provider = new TestProvider()
      await provider.connect({})
      await provider.disconnect()
      expect(provider.state).toBe('idle')
      expect(provider.isConnected).toBe(false)
    })

    it('emits onStateChange when state changes', async () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onStateChange', cb)
      await provider.connect({})
      expect(cb).toHaveBeenCalledWith('connected')
    })

    it('does not emit onStateChange for same state', async () => {
      const provider = new TestProvider()
      await provider.connect({})
      const cb = vi.fn()
      provider.on('onStateChange', cb)
      await provider.connect({}) // already connected
      expect(cb).not.toHaveBeenCalled()
    })
  })

  describe('event system', () => {
    it('on() registers a listener and returns unsubscribe fn', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      const unsub = provider.on('onTokens', cb)
      provider.testEmitTokens([{ text: 'hi', isFinal: true }])
      expect(cb).toHaveBeenCalledTimes(1)

      unsub()
      provider.testEmitTokens([{ text: 'bye', isFinal: true }])
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('off() removes a specific listener', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onPartial', cb)
      provider.off('onPartial', cb)
      provider.testEmitPartial('test')
      expect(cb).not.toHaveBeenCalled()
    })

    it('removeAllListeners() clears everything', () => {
      const provider = new TestProvider()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      provider.on('onFinal', cb1)
      provider.on('onPartial', cb2)
      provider.removeAllListeners()
      provider.testEmitFinal('text')
      provider.testEmitPartial('text')
      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()
    })

    it('emits onTokens with correct payload', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onTokens', cb)
      const tokens = [
        { text: 'Hello', isFinal: false },
        { text: ' world', isFinal: true },
      ]
      provider.testEmitTokens(tokens)
      expect(cb).toHaveBeenCalledWith(tokens)
    })

    it('emits onPartial with text', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onPartial', cb)
      provider.testEmitPartial('partial text')
      expect(cb).toHaveBeenCalledWith('partial text')
    })

    it('emits onFinal with text', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onFinal', cb)
      provider.testEmitFinal('final text')
      expect(cb).toHaveBeenCalledWith('final text')
    })

    it('emits onError and transitions to error state', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onError', cb)
      provider.testEmitError('ERR_TEST', 'Something broke')
      expect(cb).toHaveBeenCalledWith({
        code: 'ERR_TEST',
        message: 'Something broke',
      })
      expect(provider.state).toBe('error')
    })

    it('emits onFinished', () => {
      const provider = new TestProvider()
      const cb = vi.fn()
      provider.on('onFinished', cb)
      provider.testEmitFinished()
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('supports multiple listeners on the same event', () => {
      const provider = new TestProvider()
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      provider.on('onFinal', cb1)
      provider.on('onFinal', cb2)
      provider.testEmitFinal('text')
      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
    })

    it('listener errors are caught and do not propagate', () => {
      const provider = new TestProvider()
      const bad = vi.fn(() => { throw new Error('listener crash') })
      const good = vi.fn()
      provider.on('onFinal', bad)
      provider.on('onFinal', good)
      expect(() => provider.testEmitFinal('text')).not.toThrow()
      expect(good).toHaveBeenCalled()
    })
  })
})
