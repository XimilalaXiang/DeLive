import { buildPcmWavBlob } from './pcmWav'

/**
 * Mix decoded channels down to mono and convert to little-endian PCM16.
 * Channels shorter than the first one are treated as silence past their end.
 */
export function mixToMonoPcm16(channels: Float32Array[]): ArrayBuffer {
  const length = channels[0]?.length ?? 0
  const buffer = new ArrayBuffer(length * 2)
  const view = new DataView(buffer)
  const count = channels.length

  for (let i = 0; i < length; i += 1) {
    let sum = 0
    for (let c = 0; c < count; c += 1) {
      sum += channels[c][i] ?? 0
    }
    const sample = Math.max(-1, Math.min(1, count > 0 ? sum / count : 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }

  return buffer
}

/**
 * Decode an audio/video file in the renderer and re-encode it as 16-bit mono
 * WAV at the given sample rate. whisper-server only reads WAV unless it was
 * started with --convert (which needs ffmpeg), so files are normalized here.
 */
export async function decodeFileToMonoWav(file: Blob, sampleRate = 16000): Promise<{ wav: Blob; durationMs: number }> {
  const OfflineCtx = globalThis.OfflineAudioContext
  if (!OfflineCtx) {
    throw new Error('OfflineAudioContext is not available')
  }

  const data = await file.arrayBuffer()
  // decodeAudioData resamples to the context's sample rate.
  const context = new OfflineCtx(1, 1, sampleRate)
  const audioBuffer = await context.decodeAudioData(data)

  const channels: Float32Array[] = []
  for (let c = 0; c < audioBuffer.numberOfChannels; c += 1) {
    channels.push(audioBuffer.getChannelData(c))
  }

  const pcm = mixToMonoPcm16(channels)
  const wav = buildPcmWavBlob([pcm], { sampleRate: audioBuffer.sampleRate, channels: 1, bitsPerSample: 16 })
  return { wav, durationMs: Math.round(audioBuffer.duration * 1000) }
}
