export interface PcmWavOptions {
  sampleRate: number
  channels?: number
  bitsPerSample?: number
}

export function buildPcmWavBlob(
  chunks: ArrayBuffer[],
  options: PcmWavOptions,
): Blob {
  const channels = options.channels ?? 1
  const bitsPerSample = options.bitsPerSample ?? 16
  const pcmSize = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const wavHeader = new ArrayBuffer(44)
  const view = new DataView(wavHeader)

  const byteRate = options.sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcmSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, options.sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcmSize, true)

  return new Blob([wavHeader, ...chunks], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}
