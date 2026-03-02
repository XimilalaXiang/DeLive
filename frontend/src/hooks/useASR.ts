/**
 * 通用 ASR Hook
 * 替代原有的 useSoniox，支持多提供商切换
 */

import { useCallback, useRef, useEffect } from 'react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { createProvider } from '../providers'
import { AudioProcessor } from '../utils/audioProcessor'
import type { ASRProvider, ASRVendor, TranscriptToken, ASRError } from '../types/asr'

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
  const stopRecordingRef = useRef<() => void>(() => {})

  const {
    settings,
    processTokens,
    setRecordingState,
    startNewSession,
    endCurrentSession,
  } = useTranscriptStore()

  // 清理函数
  const cleanup = useCallback(() => {
    // 清理设备变化监听
    if (deviceChangeCleanupRef.current) {
      deviceChangeCleanupRef.current()
      deviceChangeCleanupRef.current = null
    }
    selectedVendorRef.current = null

    // 停止音频处理器
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }

    // 停止 MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    // 停止媒体流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // 断开 Provider
    if (providerRef.current) {
      providerRef.current.disconnect()
      providerRef.current.removeAllListeners()
      providerRef.current = null
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // 停止录制
  const stopRecording = useCallback(() => {
    console.log('[useASR] 停止录制...')
    setRecordingState('stopping')

    cleanup()

    // 结束当前会话
    endCurrentSession()
    setRecordingState('idle')
    console.log('[useASR] 录制已停止')
  }, [setRecordingState, endCurrentSession, cleanup])

  // 同步 ref
  stopRecordingRef.current = stopRecording

  // 设置 provider 事件监听的辅助函数
  const setupProviderListeners = useCallback((provider: ASRProvider, vendorId: ASRVendor) => {
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

    if (vendorId !== 'soniox') {
      provider.on('onPartial', (text: string) => {
        console.log('[useASR] 收到 partial:', text.substring(0, 50))
        const state = useTranscriptStore.getState()
        const { finalTranscript, setTranscript } = state
        const fullText = finalTranscript + text
        console.log('[useASR] onPartial - finalTranscript:', finalTranscript.substring(0, 50), 'partial:', text.substring(0, 50))
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
      const beforeState = useTranscriptStore.getState()
      console.log('[useASR] onFinal 前 - finalTranscript:', beforeState.finalTranscript.substring(0, 50), 'finalTokens 数量:', beforeState.finalTokens.length)
      processTokens([{
        text,
        is_final: true,
        start_ms: 0,
        end_ms: 0,
      }])
      const afterState = useTranscriptStore.getState()
      console.log('[useASR] onFinal 后 - finalTranscript:', afterState.finalTranscript.substring(0, 50), 'finalTokens 数量:', afterState.finalTokens.length)
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
      stopRecordingRef.current()
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
      // 1. 停止旧的音频流和处理器
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

      // 2. 对于 MediaRecorder 提供商（如 Soniox），需要重连 provider
      if (vendorId !== 'volc' && providerRef.current) {
        providerRef.current.disconnect()
        providerRef.current.removeAllListeners()
        providerRef.current = null
      }

      // 等待系统音频设备稳定
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 3. 重新获取音频流
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

      // 4. 重新连接 provider（如果需要）
      if (vendorId !== 'volc') {
        const providerConfig = settings.providerConfigs?.[vendorId]
        const provider = createProvider(vendorId)
        if (!provider) throw new Error(`未找到提供商: ${vendorId}`)
        providerRef.current = provider
        setupProviderListeners(provider, vendorId)
        await provider.connect({
          apiKey: providerConfig?.apiKey || '',
          languageHints: (providerConfig?.languageHints as string[]) || ['zh', 'en'],
          ...(providerConfig || {}),
        })
      }

      // 5. 重新启动音频处理
      if (vendorId === 'volc') {
        const audioProcessor = new AudioProcessor({ sampleRate: 16000, channels: 1 })
        audioProcessorRef.current = audioProcessor
        await audioProcessor.start(mediaStreamRef.current, (pcmData) => {
          if (providerRef.current) {
            providerRef.current.sendAudio(pcmData)
          }
        })
      } else {
        const mediaRecorder = createCompatibleMediaRecorder(mediaStreamRef.current)
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
      }

      // 6. 重新监听音频轨道结束
      audioTracks[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        stopRecordingRef.current()
      }

      console.log('[useASR] 音频重新捕获成功')
    } catch (error) {
      console.error('[useASR] 音频重新捕获失败:', error)
      cleanup()
      endCurrentSession()
      setRecordingState('idle')
      options.onError?.('音频设备切换后重新捕获失败，录制已停止')
    } finally {
      isRestartingRef.current = false
    }
  }, [settings, processTokens, options, cleanup, endCurrentSession, setRecordingState, setupProviderListeners])

  // 开始录制
  const startRecording = useCallback(async () => {
    lastCaptionRef.current = { text: '', isFinal: false }

    const vendorId = (settings.currentVendor || 'soniox') as ASRVendor
    const providerConfig = settings.providerConfigs?.[vendorId]

    if (vendorId === 'volc') {
      const volcConfig = providerConfig as { appKey?: string; accessKey?: string } | undefined
      if (!volcConfig?.appKey || !volcConfig?.accessKey) {
        options.onError?.('请先配置火山引擎的 App Key 和 Access Key')
        return
      }
    } else {
      if (!providerConfig?.apiKey) {
        options.onError?.('请先配置 API 密钥')
        return
      }
    }

    setRecordingState('starting')
    console.log(`[useASR] 开始录制流程，使用提供商: ${vendorId}`)

    try {
      // 1. 创建 Provider 实例
      const provider = createProvider(vendorId)
      if (!provider) {
        throw new Error(`未找到提供商: ${vendorId}`)
      }
      providerRef.current = provider

      // 2. 设置事件监听
      setupProviderListeners(provider, vendorId)

      // 3. 请求屏幕共享
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

      // 4. 连接 Provider
      console.log('[useASR] 连接 Provider...')
      await provider.connect({
        apiKey: providerConfig?.apiKey || '',
        languageHints: (providerConfig?.languageHints as string[]) || ['zh', 'en'],
        ...(providerConfig || {}),
      })

      // 5. 根据提供商类型选择音频处理方式
      if (vendorId === 'volc') {
        console.log('[useASR] 使用 AudioProcessor 处理音频（火山引擎）')
        const audioProcessor = new AudioProcessor({ sampleRate: 16000, channels: 1 })
        audioProcessorRef.current = audioProcessor
        await audioProcessor.start(mediaStreamRef.current, (pcmData) => {
          if (providerRef.current) {
            providerRef.current.sendAudio(pcmData)
          }
        })
      } else {
        console.log('[useASR] 使用 MediaRecorder 处理音频')
        const mediaRecorder = createCompatibleMediaRecorder(mediaStreamRef.current)
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
      }

      // 开始新会话
      startNewSession()
      setRecordingState('recording')
      options.onStarted?.()
      console.log('[useASR] 录制已开始')

      // 保存当前 vendorId 供 restartCapture 使用
      selectedVendorRef.current = vendorId

      // 设置音频设备变化监听
      let deviceChangeTimer: ReturnType<typeof setTimeout> | null = null
      const handleDeviceChange = () => {
        console.log('[useASR] 检测到音频设备变化')
        if (deviceChangeTimer) clearTimeout(deviceChangeTimer)
        deviceChangeTimer = setTimeout(() => {
          const currentState = useTranscriptStore.getState().recordingState
          if (currentState === 'recording') {
            restartCapture('devicechange')
          }
        }, 1500)
      }
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

      deviceChangeCleanupRef.current = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
        if (deviceChangeTimer) clearTimeout(deviceChangeTimer)
      }

      // 监听音频轨道结束
      audioTracks[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        stopRecordingRef.current()
      }

    } catch (error) {
      console.error('[useASR] 启动失败:', error)
      cleanup()
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
  }, [settings, processTokens, setRecordingState, startNewSession, options, cleanup, setupProviderListeners, restartCapture])

  return {
    startRecording,
    stopRecording,
  }
}
