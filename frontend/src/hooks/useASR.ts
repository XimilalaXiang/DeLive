/**
 * useASR — 通用 ASR Hook（编排层）
 *
 * 将 CaptureManager、ProviderSessionManager、CaptionBridge 组合在一起，
 * 对外只暴露 startRecording / stopRecording。
 */

import { useCallback, useRef, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTopicStore } from '../stores/topicStore'
import { CaptureManager } from '../services/captureManager'
import { CaptionBridge } from '../services/captionBridge'
import { ProviderSessionManager } from '../services/providerSession'
import type { ASRVendor } from '../types/asr'
import type { ProviderConfigData } from '../types'

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
    applyTranscriptEvent,
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
      applyTranscriptEvent({ type: 'tokens', tokens })

      const s = useSessionStore.getState()
      captionRef.current.update(
        s.finalTranscript,
        s.nonFinalTranscript,
        s.finalTranslatedTranscript,
        s.nonFinalTranslatedTranscript,
      )
    },

    onPartial(text: string) {
      applyTranscriptEvent({ type: 'partial-text', text })
      const s = useSessionStore.getState()
      captionRef.current.update(
        s.finalTranscript,
        text,
        s.finalTranslatedTranscript,
        s.nonFinalTranslatedTranscript,
      )
    },

    onFinal(text: string) {
      applyTranscriptEvent({ type: 'final-text', text })
      const s = useSessionStore.getState()
      captionRef.current.update(
        s.finalTranscript,
        '',
        s.finalTranslatedTranscript,
        '',
      )
    },

    onError(error: import('../types/asr').ASRError) {
      const currentState = useSessionStore.getState().recordingState
      if (currentState === 'switching') {
        console.warn('[useASR] 配置切换中收到 Provider 错误（忽略）:', error.code, error.message)
        return
      }
      options.onError?.(`${error.code}: ${error.message}`)
      void stopRecordingRef.current()
    },

    onFinished() {
      options.onFinished?.()
    },
  }), [applyTranscriptEvent, options])

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
        setup.providerInfo.capabilities,
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
        setup.providerInfo.capabilities,
        {
          onAudioData: (data) => psm.sendAudio(data),
          onTrackEnded: () => {
            if (captureRef.current.isRestarting) {
              console.log('[useASR] Track ended during restart, ignoring')
              return
            }
            void stopRecordingRef.current()
          },
          onDeviceChange: () => {
            const currentState = useSessionStore.getState().recordingState
            if (currentState === 'recording') {
              void restartCapture()
            }
          },
        },
      )

      startNewSession()

      const activeTopicId = useTopicStore.getState().activeTopicId
      if (activeTopicId) {
        const sid = useSessionStore.getState().currentSessionId
        if (sid) useSessionStore.getState().updateSessionTopic(sid, activeTopicId)
      }

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

  const switchConfig = useCallback(async (configPatch: Partial<ProviderConfigData>, changeDescription: string) => {
    const vendorId = selectedVendorRef.current
    if (!vendorId) return
    const currentState = useSessionStore.getState().recordingState
    if (currentState !== 'recording') return

    const previousConfig = useSettingsStore.getState().settings.providerConfigs?.[vendorId]

    try {
      setRecordingState('switching')

      useSettingsStore.getState().updateProviderConfig(vendorId, configPatch)

      const newSettings = useSettingsStore.getState().settings
      const psm = providerSessionRef.current
      const setup = psm.resolveSetup(vendorId, newSettings)

      applyTranscriptEvent({ type: 'config-change', description: changeDescription })

      // 关键：先停止 MediaRecorder 的数据产出，防止旧数据（无 WebM 头）被发到新连接
      captureRef.current.pauseRecorder()

      await psm.reconnect(vendorId, setup.connectConfig, buildProviderCallbacks())

      // reconnect 完成后再重启 MediaRecorder，生成新的 WebM 文件头
      captureRef.current.restartRecorder(setup.providerInfo.capabilities)

      setRecordingState('recording')
      console.log('[useASR] 配置热切换成功:', changeDescription)
    } catch (error) {
      console.error('[useASR] 配置热切换失败:', error)

      if (previousConfig) {
        useSettingsStore.getState().updateProviderConfig(vendorId, previousConfig)
      }

      try {
        const fallbackSettings = useSettingsStore.getState().settings
        const psm = providerSessionRef.current
        const fallbackSetup = psm.resolveSetup(vendorId, fallbackSettings)

        captureRef.current.pauseRecorder()
        await psm.reconnect(vendorId, fallbackSetup.connectConfig, buildProviderCallbacks())
        captureRef.current.restartRecorder(fallbackSetup.providerInfo.capabilities)

        setRecordingState('recording')
        options.onError?.('配置切换失败，已恢复之前的配置')
      } catch {
        captureRef.current.stop()
        await providerSessionRef.current.disconnect()
        endCurrentSession()
        setRecordingState('idle')
        options.onError?.('配置切换失败且无法恢复，录制已停止')
      }
    }
  }, [settings, setRecordingState, endCurrentSession, applyTranscriptEvent, buildProviderCallbacks, options])

  return {
    startRecording,
    stopRecording,
    switchConfig,
  }
}
