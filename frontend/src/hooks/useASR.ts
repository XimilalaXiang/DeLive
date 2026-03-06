/**
 * 通用 ASR Hook
 * 替代原有的 useSoniox，支持多提供商切换
 */

import { useCallback, useRef, useEffect } from 'react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { createProvider, providerRegistry } from '../providers'
import { AudioProcessor } from '../utils/audioProcessor'
import {
  buildProviderConnectConfig,
  getMissingRequiredConfigLabels,
} from '../utils/providerConfig'
import type {
  ASRProvider,
  ASRVendor,
  TranscriptToken,
  ASRError,
  ASRProviderInfo,
  ProviderConfig,
} from '../types/asr'
import type { ProviderConfigData } from '../types'

interface UseASROptions {
  onError?: (message: string) => void
  onStarted?: () => void
  onFinished?: () => void
}

function createCompatibleMediaRecorder(stream: MediaStream): MediaRecorder {
  const preferredMimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]

  if (typeof MediaRecorder.isTypeSupported === 'function') {
    for (const mimeType of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`[useASR] 使用 MediaRecorder 编码格式: ${mimeType}`)
        return new MediaRecorder(stream, { mimeType })
      }
    }
  }

  console.log('[useASR] 未命中预设编码格式，使用浏览器默认 MediaRecorder 配置')
  return new MediaRecorder(stream)
}

export function useASR(options: UseASROptions = {}) {
  const providerRef = useRef<ASRProvider | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const lastCaptionRef = useRef<{ text: string; isFinal: boolean }>({
    text: '',
    isFinal: false,
  })
  const isRestartingRef = useRef(false)
  const lastRestartTimeRef = useRef(0)
  const selectedVendorRef = useRef<ASRVendor | null>(null)
  const deviceChangeCleanupRef = useRef<(() => void) | null>(null)
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {})

  const {
    settings,
    processTokens,
    setRecordingState,
    startNewSession,
    endCurrentSession,
  } = useTranscriptStore()

  const getProviderSetup = useCallback((vendorId: ASRVendor): {
    providerInfo: ASRProviderInfo
    connectConfig: ProviderConfig
  } => {
    const providerInfo = providerRegistry.getInfo(vendorId)
    if (!providerInfo) {
      throw new Error(`未找到提供商: ${vendorId}`)
    }

    const providerConfig = settings.providerConfigs?.[vendorId]
    const connectConfig = buildProviderConnectConfig(providerInfo, providerConfig, settings)
    return { providerInfo, connectConfig }
  }, [settings])

  const disconnectProvider = useCallback(async () => {
    const provider = providerRef.current
    if (!provider) return

    providerRef.current = null
    try {
      await provider.disconnect()
    } catch (error) {
      console.warn('[useASR] Provider 断开连接失败:', error)
    } finally {
      provider.removeAllListeners()
    }
  }, [])

  const startAudioPipeline = useCallback(async (provider: ASRProvider, stream: MediaStream) => {
    if (provider.info.capabilities.audioInputMode === 'pcm16') {
      console.log('[useASR] 使用 AudioProcessor 处理音频')
      const audioProcessor = new AudioProcessor({ sampleRate: 16000, channels: 1 })
      audioProcessorRef.current = audioProcessor
      await audioProcessor.start(stream, (pcmData) => {
        if (providerRef.current) {
          providerRef.current.sendAudio(pcmData)
        }
      })
      return
    }

    console.log('[useASR] 使用 MediaRecorder 处理音频')
    const mediaRecorder = createCompatibleMediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && providerRef.current) {
        providerRef.current.sendAudio(event.data)
      }
    }
    mediaRecorder.onerror = (event) => {
      console.error('[useASR] MediaRecorder 错误:', event)
    }
    mediaRecorder.start(100)
    console.log('[useASR] MediaRecorder 已启动')
  }, [])

  // 清理函数
  const cleanup = useCallback(async () => {
    if (deviceChangeCleanupRef.current) {
      deviceChangeCleanupRef.current()
      deviceChangeCleanupRef.current = null
    }
    selectedVendorRef.current = null

    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    await disconnectProvider()
  }, [disconnectProvider])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      void cleanup()
    }
  }, [cleanup])

  // 停止录制
  const stopRecording = useCallback(async () => {
    console.log('[useASR] 停止录制...')
    setRecordingState('stopping')

    await cleanup()
    await window.electronAPI?.captionUpdateText('', false)
    lastCaptionRef.current = { text: '', isFinal: false }

    endCurrentSession()
    setRecordingState('idle')
    console.log('[useASR] 录制已停止')
  }, [setRecordingState, endCurrentSession, cleanup])

  // 同步 ref
  stopRecordingRef.current = stopRecording

  // 设置 provider 事件监听的辅助函数
  const setupProviderListeners = useCallback((provider: ASRProvider) => {
    provider.on('onTokens', (tokens: TranscriptToken[]) => {
      console.log('[useASR] 收到 tokens:', tokens.length)
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

      const state = useTranscriptStore.getState()
      const fullText = state.finalTranscript + state.nonFinalTranscript
      const isFinalText = state.nonFinalTranscript.length === 0 && fullText.length > 0
      if (
        fullText !== lastCaptionRef.current.text ||
        isFinalText !== lastCaptionRef.current.isFinal
      ) {
        window.electronAPI?.captionUpdateText(fullText, isFinalText)
        lastCaptionRef.current = { text: fullText, isFinal: isFinalText }
      }
    })

    if (!provider.info.capabilities.prefersTokenEvents) {
      provider.on('onPartial', (text: string) => {
        console.log('[useASR] 收到 partial:', text.substring(0, 50))
        const state = useTranscriptStore.getState()
        const { finalTranscript, setTranscript } = state
        const fullText = finalTranscript + text
        setTranscript(finalTranscript, text)
        if (
          fullText !== lastCaptionRef.current.text ||
          lastCaptionRef.current.isFinal !== false
        ) {
          window.electronAPI?.captionUpdateText(fullText, false)
          lastCaptionRef.current = { text: fullText, isFinal: false }
        }
      })
    }

    provider.on('onFinal', (text: string) => {
      console.log('[useASR] 收到 final:', text.substring(0, 50))
      processTokens([{
        text,
        is_final: true,
        start_ms: 0,
        end_ms: 0,
      }])
      const afterState = useTranscriptStore.getState()
      if (
        afterState.finalTranscript !== lastCaptionRef.current.text ||
        lastCaptionRef.current.isFinal !== true
      ) {
        window.electronAPI?.captionUpdateText(afterState.finalTranscript, true)
        lastCaptionRef.current = { text: afterState.finalTranscript, isFinal: true }
      }
    })

    provider.on('onError', (error: ASRError) => {
      console.error('[useASR] Provider 错误:', error)
      options.onError?.(`${error.code}: ${error.message}`)
      void stopRecordingRef.current()
    })

    provider.on('onFinished', () => {
      console.log('[useASR] 转录完成')
      options.onFinished?.()
    })
  }, [processTokens, options])

  // 音频设备切换后自动重新捕获
  const restartCapture = useCallback(async (reason: string) => {
    if (isRestartingRef.current) {
      console.log('[useASR] 已在重启中，跳过')
      return
    }

    const now = Date.now()
    if (now - lastRestartTimeRef.current < 10000) {
      console.log('[useASR] 重启过于频繁，跳过')
      return
    }

    const vendorId = selectedVendorRef.current
    if (!vendorId) return

    console.log(`[useASR] 音频设备变化，自动重新捕获 (原因: ${reason})`)
    isRestartingRef.current = true
    lastRestartTimeRef.current = now

    try {
      const { providerInfo, connectConfig } = getProviderSetup(vendorId)

      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop()
        audioProcessorRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      const requiresReconnect = providerInfo.capabilities.audioInputMode !== 'pcm16'
      if (requiresReconnect) {
        await disconnectProvider()
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('[useASR] 重新请求屏幕共享...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      })

      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach(track => track.stop())
        throw new Error('重新捕获时未获取到音频轨道')
      }

      displayStream.getVideoTracks().forEach(track => track.stop())
      mediaStreamRef.current = new MediaStream(audioTracks)

      if (requiresReconnect || !providerRef.current) {
        const provider = createProvider(vendorId)
        if (!provider) throw new Error(`未找到提供商: ${vendorId}`)
        providerRef.current = provider
        setupProviderListeners(provider)
        await provider.connect(connectConfig)
      }

      if (!providerRef.current) {
        throw new Error('Provider 未初始化')
      }
      await startAudioPipeline(providerRef.current, mediaStreamRef.current)

      audioTracks[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        void stopRecordingRef.current()
      }

      console.log('[useASR] 音频重新捕获成功')
    } catch (error) {
      console.error('[useASR] 音频重新捕获失败:', error)
      await cleanup()
      endCurrentSession()
      setRecordingState('idle')
      options.onError?.('音频设备切换后重新捕获失败，录制已停止')
    } finally {
      isRestartingRef.current = false
    }
  }, [
    getProviderSetup,
    setupProviderListeners,
    startAudioPipeline,
    cleanup,
    endCurrentSession,
    setRecordingState,
    options,
    disconnectProvider,
  ])

  // 开始录制
  const startRecording = useCallback(async () => {
    lastCaptionRef.current = { text: '', isFinal: false }

    const vendorId = (settings.currentVendor || 'soniox') as ASRVendor
    const { providerInfo, connectConfig } = getProviderSetup(vendorId)
    const missingLabels = getMissingRequiredConfigLabels(
      providerInfo,
      connectConfig as ProviderConfigData
    )

    if (missingLabels.length > 0) {
      options.onError?.(`请先配置: ${missingLabels.join('、')}`)
      return
    }

    setRecordingState('starting')
    await window.electronAPI?.captionUpdateText('', false)
    console.log(`[useASR] 开始录制流程，使用提供商: ${vendorId}`)

    try {
      const provider = createProvider(vendorId)
      if (!provider) {
        throw new Error(`未找到提供商: ${vendorId}`)
      }
      providerRef.current = provider
      setupProviderListeners(provider)

      console.log('[useASR] 请求屏幕共享...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      })

      const audioTracks = displayStream.getAudioTracks()
      console.log('[useASR] 音频轨道数量:', audioTracks.length)

      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach(track => track.stop())
        throw new Error('未能获取系统音频。请确保在选择共享时勾选了"共享音频"选项。')
      }

      displayStream.getVideoTracks().forEach(track => track.stop())
      mediaStreamRef.current = new MediaStream(audioTracks)

      console.log('[useASR] 连接 Provider...')
      await provider.connect(connectConfig)

      await startAudioPipeline(provider, mediaStreamRef.current)

      startNewSession()
      setRecordingState('recording')
      options.onStarted?.()
      console.log('[useASR] 录制已开始')

      selectedVendorRef.current = vendorId

      let deviceChangeTimer: ReturnType<typeof setTimeout> | null = null
      const handleDeviceChange = () => {
        console.log('[useASR] 检测到音频设备变化')
        if (deviceChangeTimer) clearTimeout(deviceChangeTimer)
        deviceChangeTimer = setTimeout(() => {
          const currentState = useTranscriptStore.getState().recordingState
          if (currentState === 'recording') {
            void restartCapture('devicechange')
          }
        }, 1500)
      }
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

      deviceChangeCleanupRef.current = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
        if (deviceChangeTimer) clearTimeout(deviceChangeTimer)
      }

      audioTracks[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        void stopRecordingRef.current()
      }
    } catch (error) {
      console.error('[useASR] 启动失败:', error)
      await cleanup()
      setRecordingState('idle')

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          options.onError?.('用户取消了屏幕共享')
        } else {
          options.onError?.(error.message)
        }
      } else {
        options.onError?.('启动录制失败')
      }
    }
  }, [settings, getProviderSetup, setRecordingState, startNewSession, options, cleanup, setupProviderListeners, startAudioPipeline, restartCapture])

  return {
    startRecording,
    stopRecording,
  }
}
