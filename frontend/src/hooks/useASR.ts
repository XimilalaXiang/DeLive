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

export function useASR(options: UseASROptions = {}) {
  const providerRef = useRef<ASRProvider | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)

  const {
    settings,
    processTokens,
    setRecordingState,
    startNewSession,
    endCurrentSession,
  } = useTranscriptStore()

  // 清理函数
  const cleanup = useCallback(() => {
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

  // 开始录制
  const startRecording = useCallback(async () => {
    // 获取当前选择的提供商
    const vendorId = (settings.currentVendor || 'soniox') as ASRVendor
    const providerConfig = settings.providerConfigs?.[vendorId]

    // 根据提供商类型检查配置
    if (vendorId === 'volc') {
      // 火山引擎需要 appKey 和 accessKey
      const volcConfig = providerConfig as { appKey?: string; accessKey?: string } | undefined
      if (!volcConfig?.appKey || !volcConfig?.accessKey) {
        options.onError?.('请先配置火山引擎的 App Key 和 Access Key')
        return
      }
    } else {
      // 其他提供商使用 apiKey
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
      provider.on('onTokens', (tokens: TranscriptToken[]) => {
        console.log('[useASR] 收到 tokens:', tokens.length)
        // 转换为原有格式以兼容现有 store
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
        
        // 更新字幕窗口
        const text = tokens.map(t => t.text).join('')
        const isFinal = tokens.every(t => t.isFinal)
        window.electronAPI?.captionUpdateText(text, isFinal)
      })

      // 监听部分结果（火山引擎等使用此事件）
      // 注意：火山引擎的 partial 是当前句子的完整文本，不是增量
      provider.on('onPartial', (text: string) => {
        console.log('[useASR] 收到 partial:', text.substring(0, 50))
        
        // 获取当前已确认的文本
        const state = useTranscriptStore.getState()
        const { finalTranscript, setTranscript } = state
        const fullText = finalTranscript + text
        
        console.log('[useASR] onPartial - finalTranscript:', finalTranscript.substring(0, 50), 'partial:', text.substring(0, 50))
        
        // 更新 nonFinalTranscript 用于显示（不修改 finalTranscript）
        setTranscript(finalTranscript, text)
        
        // 更新字幕窗口（中间结果）
        window.electronAPI?.captionUpdateText(fullText, false)
      })

      // 监听最终结果（火山引擎等使用此事件）
      // 注意：火山引擎的 final 是当前句子的最终确认文本
      provider.on('onFinal', (text: string) => {
        console.log('[useASR] 收到 final:', text.substring(0, 50))
        
        // 获取当前 finalTokens 长度用于调试
        const beforeState = useTranscriptStore.getState()
        console.log('[useASR] onFinal 前 - finalTranscript:', beforeState.finalTranscript.substring(0, 50), 'finalTokens 数量:', beforeState.finalTokens.length)
        
        // 添加到 finalTokens 以便保存（这会自动更新 finalTranscript）
        processTokens([{
          text,
          is_final: true,
          start_ms: 0,
          end_ms: 0,
        }])
        
        // 获取更新后的 finalTranscript
        const afterState = useTranscriptStore.getState()
        console.log('[useASR] onFinal 后 - finalTranscript:', afterState.finalTranscript.substring(0, 50), 'finalTokens 数量:', afterState.finalTokens.length)
        
        // 更新字幕窗口（最终结果）
        window.electronAPI?.captionUpdateText(afterState.finalTranscript, true)
      })

      provider.on('onError', (error: ASRError) => {
        console.error('[useASR] Provider 错误:', error)
        options.onError?.(`${error.code}: ${error.message}`)
        stopRecording()
      })

      provider.on('onFinished', () => {
        console.log('[useASR] 转录完成')
        options.onFinished?.()
      })

      // 3. 请求屏幕共享（包含系统音频）
      console.log('[useASR] 请求屏幕共享...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      })

      // 检查音频轨道
      const audioTracks = displayStream.getAudioTracks()
      console.log('[useASR] 音频轨道数量:', audioTracks.length)

      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach(track => track.stop())
        throw new Error('未能获取系统音频。请确保在选择共享时勾选了"共享音频"选项。')
      }

      // 停止视频轨道，只保留音频
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
        // 火山引擎需要 PCM 16kHz 16bit 单声道格式
        console.log('[useASR] 使用 AudioProcessor 处理音频（火山引擎）')
        const audioProcessor = new AudioProcessor({
          sampleRate: 16000,
          channels: 1,
        })
        audioProcessorRef.current = audioProcessor

        await audioProcessor.start(mediaStreamRef.current, (pcmData) => {
          if (providerRef.current) {
            providerRef.current.sendAudio(pcmData)
          }
        })
      } else {
        // Soniox 等其他提供商使用 MediaRecorder（支持 webm/opus）
        console.log('[useASR] 使用 MediaRecorder 处理音频')
        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType: 'audio/webm;codecs=opus',
        })
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && providerRef.current) {
            providerRef.current.sendAudio(event.data)
          }
        }

        mediaRecorder.onerror = (event) => {
          console.error('[useASR] MediaRecorder 错误:', event)
        }

        mediaRecorder.start(100) // 每 100ms 发送一次数据
        console.log('[useASR] MediaRecorder 已启动')
      }

      // 开始新会话
      startNewSession()
      setRecordingState('recording')
      options.onStarted?.()
      console.log('[useASR] 录制已开始')

      // 监听音频轨道结束
      audioTracks[0].onended = () => {
        console.log('[useASR] 音频轨道结束（用户停止共享）')
        stopRecording()
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
  }, [settings, processTokens, setRecordingState, startNewSession, options, cleanup])

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

  return {
    startRecording,
    stopRecording,
  }
}
