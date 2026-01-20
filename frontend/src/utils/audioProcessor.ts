/**
 * 音频处理工具
 * 用于将浏览器捕获的音频转换为 ASR 服务所需的格式
 */

export interface AudioProcessorConfig {
  sampleRate?: number // 目标采样率，默认 16000
  channels?: number // 目标声道数，默认 1
}

/**
 * 音频处理器类
 * 使用 Web Audio API 将音频流转换为 PCM 格式
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private targetSampleRate: number
  private targetChannels: number
  private onAudioData: ((pcmData: ArrayBuffer) => void) | null = null

  constructor(config: AudioProcessorConfig = {}) {
    this.targetSampleRate = config.sampleRate || 16000
    this.targetChannels = config.channels || 1
  }

  /**
   * 开始处理音频流
   */
  async start(
    mediaStream: MediaStream,
    onAudioData: (pcmData: ArrayBuffer) => void
  ): Promise<void> {
    this.onAudioData = onAudioData

    // 创建 AudioContext
    // 注意：某些浏览器可能不支持指定采样率
    this.audioContext = new AudioContext({
      sampleRate: this.targetSampleRate,
    })

    // 如果实际采样率与目标不同，需要重采样
    const actualSampleRate = this.audioContext.sampleRate
    console.log(`[AudioProcessor] 目标采样率: ${this.targetSampleRate}, 实际采样率: ${actualSampleRate}`)

    // 创建音频源节点
    this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream)

    // 使用 ScriptProcessorNode 获取原始音频数据
    // 缓冲区大小：4096 样本（约 256ms @ 16kHz）
    const bufferSize = 4096
    this.processorNode = this.audioContext.createScriptProcessor(
      bufferSize,
      1, // 输入声道数
      1  // 输出声道数
    )

    this.processorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)
      
      // 如果需要重采样
      let outputData: Float32Array
      if (actualSampleRate !== this.targetSampleRate) {
        outputData = this.resample(inputData, actualSampleRate, this.targetSampleRate)
      } else {
        outputData = inputData
      }

      // 转换为 16-bit PCM
      const pcmData = this.float32ToPCM16(outputData)
      
      if (this.onAudioData) {
        this.onAudioData(pcmData.buffer)
      }
    }

    // 连接节点
    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)

    console.log('[AudioProcessor] 音频处理器已启动')
  }

  /**
   * 停止处理
   */
  stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.onAudioData = null
    console.log('[AudioProcessor] 音频处理器已停止')
  }

  /**
   * 简单的线性插值重采样
   */
  private resample(
    inputData: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array {
    const ratio = inputSampleRate / outputSampleRate
    const outputLength = Math.floor(inputData.length / ratio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1)
      const fraction = srcIndex - srcIndexFloor

      // 线性插值
      output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction
    }

    return output
  }

  /**
   * 将 Float32 音频数据转换为 16-bit PCM
   */
  private float32ToPCM16(float32Data: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Data.length)
    
    for (let i = 0; i < float32Data.length; i++) {
      // 限制在 [-1, 1] 范围内
      let sample = Math.max(-1, Math.min(1, float32Data[i]))
      // 转换为 16-bit 整数
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }

    return pcm16
  }
}

/**
 * 创建一个简单的音频处理器实例
 */
export function createAudioProcessor(config?: AudioProcessorConfig): AudioProcessor {
  return new AudioProcessor(config)
}
