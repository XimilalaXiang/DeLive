/**
 * useASR — 通用 ASR Hook（编排层）
 *
 * 将 CaptureManager、ProviderSessionManager、CaptionBridge 组合在一起，
 * 对外只暴露 startRecording / stopRecording。
 */

import { useCallback, useRef, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { CaptureManager } from '../services/captureManager'
import { CaptionBridge } from '../services/captionBridge'
import { ProviderSessionManager } from '../services/providerSession'
import type { ASRVendor } from '../types/asr'

interface UseASROptions {
  onError?: (message: string) => void
  onStarted?: () => void
  onFinished?: () => void
}

export function useASR(options: UseASROptions = {}) {
  const captureRef = useRef(new CaptureManager())
  const captionRef = useRef(new CaptionBridge())
  const providerSessionRef = useRef(new ProviderSessionManager())
  const isRestartingRef = useRef(false)
  const lastRestartTimeRef = useRef(0)
  const selectedVendorRef = useRef<ASRVendor | null>(null)
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {})

  const { settings } = useSettingsStore()
  const {
    processTokens,
    setRecordingState,
    startNewSession,
    endCurrentSession,
  } = useSessionStore()

  // ── 停止录制 ──────────────────────────────────────

  const stopRecording = useCallback(async () => {
    console.log('[useASR] 停止录制...')
    setRecordingState('stopping')

    captureRef.current.stop()
    await providerSessionRef.current.disconnect()
    captionRef.current.clear()

    selectedVendorRef.current = null
    endCurrentSession()
    setRecordingState('idle')
    console.log('[useASR] 录制已停止')
  }, [setRecordingState, endCurrentSession])

  stopRecordingRef.current = stopRecording

  // ── 组件卸载清理 ──────────────────────────────────

  useEffect(() => {
    const capture = captureRef.current
    const providerSession = providerSessionRef.current

    return () => {
      capture.stop()
      void providerSession.disconnect()
    }
  }, [])

  // ── Provider 事件 → Store + 字幕 ──────────────────

  const buildProviderCallbacks = useCallback(() => ({
    onTokens(tokens: import('../types/asr').TranscriptToken[]) {
      const legacyTokens = tokens.map(t => ({
        text: t.text,
        is_final: t.isFinal,
        start_ms: t.startMs,
        end_ms: t.endMs,
        confidence: t.confidence,
        language: t.language,
        speaker: t.speaker,
      }))
      processTokens(legacyTokens)

      const s = useSessionStore.getState()
      captionRef.current.update(s.finalTranscript, s.nonFinalTranscript)
    },

    onPartial(text: string) {
      const s = useSessionStore.getState()
      s.setTranscript(s.finalTranscript, text)
      captionRef.current.update(s.finalTranscript, text)
    },

    onFinal(text: string) {
      processTokens([{ text, is_final: true, start_ms: 0, end_ms: 0 }])
      const s = useSessionStore.getState()
      captionRef.current.update(s.finalTranscript, '')
    },

    onError(error: import('../types/asr').ASRError) {
      options.onError?.(`${error.code}: ${error.message}`)
      void stopRecordingRef.current()
    },

    onFinished() {
      options.onFinished?.()
    },
  }), [processTokens, options])

  // ── 设备变化后自动重启采集 ─────────────────────────

  const restartCapture = useCallback(async () => {
    if (isRestartingRef.current) return
    const now = Date.now()
    if (now - lastRestartTimeRef.current < 10_000) return
    const vendorId = selectedVendorRef.current
    if (!vendorId) return

    console.log('[useASR] 音频设备变化，自动重新采集')
    isRestartingRef.current = true
    lastRestartTimeRef.current = now

    try {
      const psm = providerSessionRef.current
      const setup = psm.resolveSetup(vendorId, settings)
      const needReconnect = setup.captureRestartStrategy === 'reconnect-session'

      if (needReconnect) {
        await psm.disconnect()
      }

      const stream = await captureRef.current.restartPipeline(
        setup.providerInfo.capabilities.audioInputMode,
      )

      if (needReconnect || !psm.currentProvider) {
        await psm.connect(vendorId, setup.connectConfig, buildProviderCallbacks())
      }

      // 新流的音轨结束回调
      stream.getAudioTracks()[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        void stopRecordingRef.current()
      }

      console.log('[useASR] 音频重新采集成功')
    } catch (error) {
      console.error('[useASR] 音频重新采集失败:', error)
      captureRef.current.stop()
      await providerSessionRef.current.disconnect()
      endCurrentSession()
      setRecordingState('idle')
      options.onError?.('音频设备切换后重新捕获失败，录制已停止')
    } finally {
      isRestartingRef.current = false
    }
  }, [settings, buildProviderCallbacks, endCurrentSession, setRecordingState, options])

  // ── 开始录制 ──────────────────────────────────────

  const startRecording = useCallback(async () => {
    const vendorId = (settings.currentVendor || 'soniox') as ASRVendor
    const psm = providerSessionRef.current

    let setup: ReturnType<typeof psm.resolveSetup>
    try {
      setup = psm.resolveSetup(vendorId, settings)
    } catch (e) {
      options.onError?.((e as Error).message)
      return
    }

    setRecordingState('starting')
    captionRef.current.clear()
    console.log(
      `[useASR] 开始录制，提供商: ${vendorId}, transport=${setup.providerInfo.capabilities.transport.type}`,
    )

    try {
      const providerCallbacks = buildProviderCallbacks()
      await psm.connect(vendorId, setup.connectConfig, providerCallbacks)

      const capture = captureRef.current
      await capture.start(
        setup.providerInfo.capabilities.audioInputMode,
        {
          onAudioData: (data) => psm.sendAudio(data),
          onTrackEnded: () => void stopRecordingRef.current(),
          onDeviceChange: () => {
            const currentState = useSessionStore.getState().recordingState
            if (currentState === 'recording') {
              void restartCapture()
            }
          },
        },
      )

      startNewSession()
      selectedVendorRef.current = vendorId
      setRecordingState('recording')
      options.onStarted?.()
      console.log('[useASR] 录制已开始')
    } catch (error) {
      console.error('[useASR] 启动失败:', error)
      captureRef.current.stop()
      await providerSessionRef.current.disconnect()
      setRecordingState('idle')

      if (error instanceof Error) {
        options.onError?.(
          error.name === 'NotAllowedError' ? '用户取消了屏幕共享' : error.message,
        )
      } else {
        options.onError?.('启动录制失败')
      }
    }
  }, [
    settings,
    setRecordingState,
    startNewSession,
    options,
    buildProviderCallbacks,
    restartCapture,
  ])

  return {
    startRecording,
    stopRecording,
  }
}
