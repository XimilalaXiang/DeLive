/**
 * CaptureManager — 音频采集生命周期管理
 *
 * 负责：getDisplayMedia 请求、MediaRecorder / AudioProcessor 创建与销毁、
 * 音轨结束检测、音频设备变更后的自动重启。
 *
 * 不涉及 ASR Provider 或 UI 状态 —— 仅管理"从桌面获取音频数据"这一条链路。
 */

import { AudioProcessor } from '../utils/audioProcessor'
import type { AudioInputMode } from '../types/asr'

export interface CaptureCallbacks {
  /** 收到一段可发送给 Provider 的音频数据 */
  onAudioData: (data: Blob | ArrayBuffer) => void
  /** 用户主动停止共享（音轨 ended） */
  onTrackEnded: () => void
  /** 设备变化需要重新采集 */
  onDeviceChange: () => void
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
        console.log(`[CaptureManager] 使用 MediaRecorder 编码格式: ${mimeType}`)
        return new MediaRecorder(stream, { mimeType })
      }
    }
  }

  console.log('[CaptureManager] 未命中预设编码格式，使用浏览器默认配置')
  return new MediaRecorder(stream)
}

export class CaptureManager {
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioProcessor: AudioProcessor | null = null
  private deviceChangeCleanup: (() => void) | null = null
  private callbacks: CaptureCallbacks | null = null

  /**
   * 请求桌面音频并启动采集管道。
   * @returns 获取到的 MediaStream（仅音频轨道）
   */
  async start(
    audioInputMode: AudioInputMode,
    callbacks: CaptureCallbacks,
  ): Promise<MediaStream> {
    this.callbacks = callbacks

    const stream = await this.requestDisplayAudio()
    this.mediaStream = stream

    await this.startPipeline(audioInputMode, stream)
    this.listenDeviceChanges()

    return stream
  }

  /**
   * 仅重启音频管道（设备变化后复用）：
   * 关闭旧流 → 重新 getDisplayMedia → 重建管道。
   * 不触碰 Provider 连接。
   */
  async restartPipeline(audioInputMode: AudioInputMode): Promise<MediaStream> {
    this.stopPipeline()
    this.stopStream()

    await new Promise(resolve => setTimeout(resolve, 1000))

    const stream = await this.requestDisplayAudio()
    this.mediaStream = stream

    await this.startPipeline(audioInputMode, stream)

    return stream
  }

  /** 完全停止：管道 + 流 + 设备监听 */
  stop(): void {
    this.removeDeviceListener()
    this.stopPipeline()
    this.stopStream()
    this.callbacks = null
  }

  get currentStream(): MediaStream | null {
    return this.mediaStream
  }

  // ── 内部实现 ──────────────────────────────────────────

  private async requestDisplayAudio(): Promise<MediaStream> {
    console.log('[CaptureManager] 请求屏幕共享...')
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } as MediaTrackConstraints,
    })

    const audioTracks = displayStream.getAudioTracks()
    console.log('[CaptureManager] 音频轨道数量:', audioTracks.length)

    if (audioTracks.length === 0) {
      displayStream.getTracks().forEach(track => track.stop())
      throw new Error('未能获取系统音频。请确保在选择共享时勾选了"共享音频"选项。')
    }

    displayStream.getVideoTracks().forEach(track => track.stop())

    const audioStream = new MediaStream(audioTracks)

    audioTracks[0].onended = () => {
      console.log('[CaptureManager] 音频轨道结束（用户停止共享）')
      this.callbacks?.onTrackEnded()
    }

    return audioStream
  }

  private async startPipeline(
    audioInputMode: AudioInputMode,
    stream: MediaStream,
  ): Promise<void> {
    if (audioInputMode === 'pcm16') {
      console.log('[CaptureManager] 使用 AudioProcessor (PCM16)')
      const processor = new AudioProcessor({ sampleRate: 16000, channels: 1 })
      this.audioProcessor = processor
      await processor.start(stream, (pcmData) => {
        this.callbacks?.onAudioData(pcmData)
      })
      return
    }

    console.log('[CaptureManager] 使用 MediaRecorder')
    const recorder = createCompatibleMediaRecorder(stream)
    this.mediaRecorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.callbacks?.onAudioData(event.data)
      }
    }
    recorder.onerror = (event) => {
      console.error('[CaptureManager] MediaRecorder 错误:', event)
    }
    recorder.start(100)
    console.log('[CaptureManager] MediaRecorder 已启动')
  }

  private stopPipeline(): void {
    if (this.audioProcessor) {
      this.audioProcessor.stop()
      this.audioProcessor = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.mediaRecorder = null
  }

  private stopStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
  }

  private listenDeviceChanges(): void {
    let timer: ReturnType<typeof setTimeout> | null = null
    const handler = () => {
      console.log('[CaptureManager] 检测到音频设备变化')
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        this.callbacks?.onDeviceChange()
      }, 1500)
    }
    navigator.mediaDevices.addEventListener('devicechange', handler)
    this.deviceChangeCleanup = () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler)
      if (timer) clearTimeout(timer)
    }
  }

  private removeDeviceListener(): void {
    if (this.deviceChangeCleanup) {
      this.deviceChangeCleanup()
      this.deviceChangeCleanup = null
    }
  }
}
