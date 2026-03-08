/**
 * PCM AudioWorklet Processor
 *
 * Runs in a dedicated audio thread, converts Float32 audio to 16-bit PCM
 * and sends it to the main thread via MessagePort.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this._targetSampleRate = (options.processorOptions && options.processorOptions.targetSampleRate) || 16000
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) {
      return true
    }

    const channelData = input[0]
    let samples

    if (sampleRate !== this._targetSampleRate) {
      samples = this._resample(channelData, sampleRate, this._targetSampleRate)
    } else {
      samples = channelData
    }

    const pcm16 = this._float32ToPCM16(samples)
    this.port.postMessage(pcm16.buffer, [pcm16.buffer])

    return true
  }

  _resample(inputData, inputRate, outputRate) {
    const ratio = inputRate / outputRate
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

  _float32ToPCM16(float32Data) {
    const pcm16 = new Int16Array(float32Data.length)
    for (let i = 0; i < float32Data.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Data[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
    return pcm16
  }
}

registerProcessor('pcm-processor', PCMProcessor)
