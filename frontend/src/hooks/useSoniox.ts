import { useCallback, useRef } from 'react'
import { useTranscriptStore } from '../stores/transcriptStore'
import type { SonioxConfig, SonioxResponse } from '../types'

const SONIOX_WEBSOCKET_URL = 'wss://stt-rt.soniox.com/transcribe-websocket'

interface UseSonioxOptions {
  onError?: (message: string) => void
  onStarted?: () => void
  onFinished?: () => void
}

export function useSoniox(options: UseSonioxOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  
  const { 
    settings, 
    processTokens, 
    setRecordingState,
    startNewSession,
    endCurrentSession 
  } = useTranscriptStore()

  // 开始录制
  const startRecording = useCallback(async () => {
    if (!settings.apiKey) {
      options.onError?.('请先配置API密钥')
      return
    }

    setRecordingState('starting')
    console.log('[Soniox] 开始录制流程...')

    try {
      // 1. 请求屏幕共享（包含系统音频）
      console.log('[Soniox] 请求屏幕共享...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // 必须请求视频，但我们只用音频
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      })

      console.log('[Soniox] 屏幕共享已获取')

      // 检查是否获取到音频轨道
      const audioTracks = displayStream.getAudioTracks()
      console.log('[Soniox] 音频轨道数量:', audioTracks.length)
      
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach(track => track.stop())
        throw new Error('未能获取系统音频。请确保在选择共享时勾选了"共享音频"选项。')
      }

      // 停止视频轨道，只保留音频
      displayStream.getVideoTracks().forEach(track => track.stop())

      // 创建只包含音频的流
      mediaStreamRef.current = new MediaStream(audioTracks)

      // 2. 直接使用用户的API密钥（不再生成临时密钥）
      console.log('[Soniox] 建立WebSocket连接...')
      const ws = new WebSocket(SONIOX_WEBSOCKET_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Soniox] WebSocket已连接')
        
        // 发送配置 - 直接使用用户的API密钥
        const config: SonioxConfig = {
          api_key: settings.apiKey,
          model: 'stt-rt-v3',
          audio_format: 'auto',
          language_hints: settings.languageHints,
          enable_language_identification: true,
          enable_endpoint_detection: true,
        }
        console.log('[Soniox] 发送配置:', { ...config, api_key: '***' })
        ws.send(JSON.stringify(config))

        // 开始录制音频
        try {
          const mediaRecorder = new MediaRecorder(mediaStreamRef.current!, {
            mimeType: 'audio/webm;codecs=opus',
          })
          mediaRecorderRef.current = mediaRecorder

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(event.data)
            }
          }

          mediaRecorder.onerror = (event) => {
            console.error('[Soniox] MediaRecorder错误:', event)
          }

          mediaRecorder.start(100) // 每100ms发送一次数据
          console.log('[Soniox] MediaRecorder已启动')
          
          // 开始新会话
          startNewSession()
          setRecordingState('recording')
          options.onStarted?.()
          console.log('[Soniox] 录制已开始')
        } catch (recorderError) {
          console.error('[Soniox] MediaRecorder创建失败:', recorderError)
          options.onError?.('音频录制器创建失败')
        }
      }

      ws.onmessage = (event) => {
        try {
          const response: SonioxResponse = JSON.parse(event.data)
          console.log('[Soniox] 收到消息:', response)
          
          if (response.error_code) {
            console.error('[Soniox] API错误:', response.error_code, response.error_message)
            options.onError?.(`Soniox错误: ${response.error_message}`)
            stopRecording()
            return
          }

          if (response.tokens && response.tokens.length > 0) {
            console.log('[Soniox] 收到tokens:', response.tokens.length)
            processTokens(response.tokens)
          }

          if (response.finished) {
            console.log('[Soniox] 转录完成')
            options.onFinished?.()
          }
        } catch (error) {
          console.error('[Soniox] 解析消息失败:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[Soniox] WebSocket错误:', error)
        options.onError?.('WebSocket连接错误')
        stopRecording()
      }

      ws.onclose = (event) => {
        console.log('[Soniox] WebSocket关闭:', event.code, event.reason)
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }

      // 监听音频轨道结束（用户停止共享）
      audioTracks[0].onended = () => {
        console.log('[Soniox] 音频轨道结束（用户停止共享）')
        stopRecording()
      }

    } catch (error) {
      console.error('[Soniox] 启动失败:', error)
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
  }, [settings, processTokens, setRecordingState, startNewSession, options])

  // 停止录制
  const stopRecording = useCallback(() => {
    console.log('[Soniox] 停止录制...')
    setRecordingState('stopping')

    // 停止MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      console.log('[Soniox] MediaRecorder已停止')
    }
    mediaRecorderRef.current = null

    // 停止媒体流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
      console.log('[Soniox] 媒体流已停止')
    }

    // 关闭WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('') // 发送空消息表示结束
      }
      wsRef.current.close()
      wsRef.current = null
      console.log('[Soniox] WebSocket已关闭')
    }

    // 结束当前会话
    endCurrentSession()
    setRecordingState('idle')
    console.log('[Soniox] 录制已停止')
  }, [setRecordingState, endCurrentSession])

  return {
    startRecording,
    stopRecording,
  }
}
