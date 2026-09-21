import { describe, it, expect } from 'vitest'
import {
  ELEVENLABS_DEFAULT_MODEL,
  ELEVENLABS_REALTIME_MODELS,
  resolveElevenLabsRealtimeModel,
} from '../elevenlabs'

describe('resolveElevenLabsRealtimeModel', () => {
  it('defaults to scribe_v2_realtime', () => {
    expect(resolveElevenLabsRealtimeModel(undefined)).toBe(ELEVENLABS_DEFAULT_MODEL)
    expect(resolveElevenLabsRealtimeModel('')).toBe(ELEVENLABS_DEFAULT_MODEL)
    expect(resolveElevenLabsRealtimeModel('unknown-model')).toBe(ELEVENLABS_DEFAULT_MODEL)
  })

  it('accepts turbo and lite variants', () => {
    expect(resolveElevenLabsRealtimeModel('scribe_v2_realtime_turbo')).toBe('scribe_v2_realtime_turbo')
    expect(resolveElevenLabsRealtimeModel('scribe_v2_realtime_lite')).toBe('scribe_v2_realtime_lite')
  })

  it('exposes three selectable realtime models', () => {
    expect(ELEVENLABS_REALTIME_MODELS.map((m) => m.value)).toEqual([
      'scribe_v2_realtime',
      'scribe_v2_realtime_turbo',
      'scribe_v2_realtime_lite',
    ])
  })
})
