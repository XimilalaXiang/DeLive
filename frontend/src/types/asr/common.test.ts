import { describe, expect, it } from 'vitest'
import {
  getDefaultProviderWorkloads,
  getResolvedProviderWorkloads,
  supportsProviderWorkload,
  type ASRProviderCapabilities,
} from './common'

describe('ASR workload capabilities', () => {
  it('derives sensible defaults from transport type', () => {
    const capabilities: ASRProviderCapabilities = {
      audioInputMode: 'pcm16',
      transport: {
        type: 'local-runtime',
      },
    }

    expect(getDefaultProviderWorkloads(capabilities)).toEqual({
      liveCapture: {
        availability: 'implemented',
        executionMode: 'local-runtime',
        inputSources: ['system-audio'],
        acceptedFileKinds: ['audio'],
      },
      fileTranscription: {
        availability: 'unsupported',
      },
    })
  })

  it('merges explicit workload metadata over defaults', () => {
    const capabilities: ASRProviderCapabilities = {
      audioInputMode: 'media-recorder',
      transport: {
        type: 'full-session-retranscription',
      },
      workloads: {
        liveCapture: {
          availability: 'implemented',
          executionMode: 'windowed-batch',
          inputSources: ['system-audio', 'microphone'],
          acceptedFileKinds: ['audio'],
        },
        fileTranscription: {
          availability: 'compatible',
          executionMode: 'single-request',
          inputSources: ['file'],
          acceptedFileKinds: ['audio', 'video'],
        },
      },
    }

    expect(getResolvedProviderWorkloads(capabilities)).toEqual({
      liveCapture: {
        availability: 'implemented',
        executionMode: 'windowed-batch',
        inputSources: ['system-audio', 'microphone'],
        acceptedFileKinds: ['audio'],
      },
      fileTranscription: {
        availability: 'compatible',
        executionMode: 'single-request',
        inputSources: ['file'],
        acceptedFileKinds: ['audio', 'video'],
      },
    })

    expect(supportsProviderWorkload(capabilities, 'live-capture')).toBe(true)
    expect(supportsProviderWorkload(capabilities, 'file-transcription')).toBe(true)
    expect(supportsProviderWorkload(capabilities, 'post-process')).toBe(false)
  })
})
