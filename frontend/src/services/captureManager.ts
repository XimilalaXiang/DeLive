import { AudioProcessor } from '../utils/audioProcessor'
import type { ASRAudioProfileCapabilities, ASRProviderCapabilities } from '../types/asr'

export interface CaptureCallbacks {
  onAudioData: (data: Blob | ArrayBuffer) => void
  onTrackEnded: () => void
  onDeviceChange: () => void
}

type CapturePipelineCapabilities = Pick<ASRProviderCapabilities, 'audioInputMode' | 'audioProfile'>

function resolvePreferredMimeTypes(profile?: ASRAudioProfileCapabilities): string[] {
  if (profile?.payloadFormat === 'wav') {
    return ['audio/wav', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  }

  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
}

function createCompatibleMediaRecorder(
  stream: MediaStream,
  profile?: ASRAudioProfileCapabilities,
): MediaRecorder {
  const preferredMimeTypes = resolvePreferredMimeTypes(profile)

  if (typeof MediaRecorder.isTypeSupported === 'function') {
    for (const mimeType of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`[CaptureManager] Using MediaRecorder format: ${mimeType}`)
        return new MediaRecorder(stream, { mimeType })
      }
    }
  }

  console.log('[CaptureManager] Falling back to browser default MediaRecorder config')
  return new MediaRecorder(stream)
}

export class CaptureManager {
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioProcessor: AudioProcessor | null = null
  private deviceChangeCleanup: (() => void) | null = null
  private callbacks: CaptureCallbacks | null = null

  async start(
    capabilities: CapturePipelineCapabilities,
    callbacks: CaptureCallbacks,
  ): Promise<MediaStream> {
    this.callbacks = callbacks

    const stream = await this.requestDisplayAudio()
    this.mediaStream = stream

    await this.startPipeline(capabilities, stream)
    this.listenDeviceChanges()

    return stream
  }

  async restartPipeline(capabilities: CapturePipelineCapabilities): Promise<MediaStream> {
    this.stopPipeline()
    this.stopStream()

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const stream = await this.requestDisplayAudio()
    this.mediaStream = stream

    await this.startPipeline(capabilities, stream)

    return stream
  }

  stop(): void {
    this.removeDeviceListener()
    this.stopPipeline()
    this.stopStream()
    this.callbacks = null
  }

  /**
   * 重启 MediaRecorder（不重新请求屏幕共享）。
   * 用于配置热切换场景：新的 WebSocket 连接需要接收完整的 WebM 文件头，
   * 而正在运行的 MediaRecorder 只会输出后续音频段（缺少初始化段）。
   */
  restartRecorder(capabilities: CapturePipelineCapabilities): void {
    if (!this.mediaStream) {
      console.warn('[CaptureManager] No active stream, cannot restart recorder')
      return
    }
    if (capabilities.audioInputMode === 'pcm16') {
      console.log('[CaptureManager] PCM16 mode, no need to restart recorder')
      return
    }

    this.stopPipeline()

    console.log('[CaptureManager] Restarting MediaRecorder for new WebM header')
    const recorder = createCompatibleMediaRecorder(this.mediaStream, capabilities.audioProfile)
    this.mediaRecorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.callbacks?.onAudioData(event.data)
      }
    }
    recorder.onerror = (event) => {
      console.error('[CaptureManager] MediaRecorder error:', event)
    }
    recorder.start(capabilities.audioProfile?.preferredChunkMs ?? 100)
    console.log('[CaptureManager] MediaRecorder restarted')
  }

  get currentStream(): MediaStream | null {
    return this.mediaStream
  }

  private async requestDisplayAudio(): Promise<MediaStream> {
    console.log('[CaptureManager] Requesting screen share...')
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } as MediaTrackConstraints,
    })

    const audioTracks = displayStream.getAudioTracks()
    console.log('[CaptureManager] Audio track count:', audioTracks.length)

    if (audioTracks.length === 0) {
      displayStream.getTracks().forEach((track) => track.stop())
      throw new Error('未能获取系统音频。请确保在选择共享时勾选了"共享音频"选项。')
    }

    displayStream.getVideoTracks().forEach((track) => track.stop())

    const audioStream = new MediaStream(audioTracks)
    audioTracks[0].onended = () => {
      console.log('[CaptureManager] Audio track ended')
      this.callbacks?.onTrackEnded()
    }

    return audioStream
  }

  private async startPipeline(
    capabilities: CapturePipelineCapabilities,
    stream: MediaStream,
  ): Promise<void> {
    const { audioInputMode, audioProfile } = capabilities

    if (audioInputMode === 'pcm16') {
      console.log('[CaptureManager] Using AudioProcessor (PCM16)')
      const processor = new AudioProcessor({
        sampleRate: audioProfile?.sampleRateHz ?? 16000,
        channels: audioProfile?.channels ?? 1,
      })
      this.audioProcessor = processor
      await processor.start(stream, (pcmData) => {
        this.callbacks?.onAudioData(pcmData)
      })
      return
    }

    console.log('[CaptureManager] Using MediaRecorder')
    const recorder = createCompatibleMediaRecorder(stream, audioProfile)
    this.mediaRecorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.callbacks?.onAudioData(event.data)
      }
    }
    recorder.onerror = (event) => {
      console.error('[CaptureManager] MediaRecorder error:', event)
    }
    recorder.start(audioProfile?.preferredChunkMs ?? 100)
    console.log('[CaptureManager] MediaRecorder started')
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
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
  }

  private listenDeviceChanges(): void {
    let timer: ReturnType<typeof setTimeout> | null = null
    const handler = () => {
      console.log('[CaptureManager] Detected audio device change')
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        this.callbacks?.onDeviceChange()
      }, 1500)
    }

    navigator.mediaDevices.addEventListener('devicechange', handler)
    this.deviceChangeCleanup = () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler)
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

  private removeDeviceListener(): void {
    if (this.deviceChangeCleanup) {
      this.deviceChangeCleanup()
      this.deviceChangeCleanup = null
    }
  }
}
