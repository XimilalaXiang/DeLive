/**
 * 音频处理工具
 *
 * 优先使用 AudioWorklet（在独立线程中处理，不阻塞主线程）。
 * 不支持 AudioWorklet 的环境下自动回退到已废弃的 ScriptProcessorNode。
 */

export interface AudioProcessorConfig {
  sampleRate?: number
  channels?: number
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private legacyProcessorNode: ScriptProcessorNode | null = null
  private targetSampleRate: number
  private onAudioData: ((pcmData: ArrayBuffer) => void) | null = null

  constructor(config: AudioProcessorConfig = {}) {
    this.targetSampleRate = config.sampleRate || 16000
  }

  async start(
    mediaStream: MediaStream,
    onAudioData: (pcmData: ArrayBuffer) => void,
  ): Promise<void> {
    this.onAudioData = onAudioData

    this.audioContext = new AudioContext({
      sampleRate: this.targetSampleRate,
    })

    const actualSampleRate = this.audioContext.sampleRate
    console.log(`[AudioProcessor] 目标采样率: ${this.targetSampleRate}, 实际: ${actualSampleRate}`)

    this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream)

    if (typeof AudioWorkletNode !== 'undefined') {
      try {
        await this.startWithWorklet(this.audioContext, actualSampleRate)
        return
      } catch (err) {
        console.warn('[AudioProcessor] AudioWorklet 加载失败，回退到 ScriptProcessorNode:', err)
      }
    }

    this.startWithScriptProcessor(this.audioContext, actualSampleRate)
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.legacyProcessorNode) {
      this.legacyProcessorNode.disconnect()
      this.legacyProcessorNode = null
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

  // ── AudioWorklet 路径 ────────────────────────────────

  private async startWithWorklet(
    ctx: AudioContext,
    _actualSampleRate: number,
  ): Promise<void> {
    const url = new URL('./pcm-processor.worklet.js', window.location.href).href
    await ctx.audioWorklet.addModule(url)

    this.workletNode = new AudioWorkletNode(ctx, 'pcm-processor', {
      processorOptions: { targetSampleRate: this.targetSampleRate },
    })

    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      this.onAudioData?.(event.data)
    }

    this.sourceNode!.connect(this.workletNode)
    this.workletNode.connect(ctx.destination)
    console.log('[AudioProcessor] 已启动（AudioWorklet）')
  }

  // ── ScriptProcessorNode 回退路径 ──────────────────────

  private startWithScriptProcessor(
    ctx: AudioContext,
    actualSampleRate: number,
  ): void {
    const bufferSize = 4096
    this.legacyProcessorNode = ctx.createScriptProcessor(bufferSize, 1, 1)

    this.legacyProcessorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)

      let outputData: Float32Array
      if (actualSampleRate !== this.targetSampleRate) {
        outputData = this.resample(inputData, actualSampleRate, this.targetSampleRate)
      } else {
        outputData = inputData
      }

      const pcmData = this.float32ToPCM16(outputData)
      this.onAudioData?.(pcmData.buffer as ArrayBuffer)
    }

    this.sourceNode!.connect(this.legacyProcessorNode)
    this.legacyProcessorNode.connect(ctx.destination)
    console.log('[AudioProcessor] 已启动（ScriptProcessorNode 回退模式）')
  }

  // ── 共享工具方法（回退路径使用）──────────────────────

  private resample(
    inputData: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number,
  ): Float32Array {
    const ratio = inputSampleRate / outputSampleRate
    const outputLength = Math.floor(inputData.length / ratio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio
      const srcFloor = Math.floor(srcIndex)
      const srcCeil = Math.min(srcFloor + 1, inputData.length - 1)
      const fraction = srcIndex - srcFloor
      output[i] = inputData[srcFloor] * (1 - fraction) + inputData[srcCeil] * fraction
    }

    return output
  }

  private float32ToPCM16(float32Data: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Data.length)
    for (let i = 0; i < float32Data.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Data[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
    return pcm16
  }
}

export function createAudioProcessor(config?: AudioProcessorConfig): AudioProcessor {
  return new AudioProcessor(config)
}
