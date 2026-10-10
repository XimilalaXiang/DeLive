import { describe, expect, it } from 'vitest'
import { SENSEVOICE_MODEL_OPTIONS, resolveSenseVoiceModel } from '../sensevoice'

describe('SenseVoice / funasr-server models', () => {
  it('only offers models funasr-server accepts', () => {
    const accepted = ['sensevoice', 'paraformer', 'fun-asr-nano', 'moss-transcribe-diarize', 'custom']
    for (const option of SENSEVOICE_MODEL_OPTIONS) {
      expect(accepted).toContain(option.value)
    }
  })

  it('maps the removed paraformer-en option to the default model', () => {
    expect(resolveSenseVoiceModel('paraformer-en')).toBe('sensevoice')
  })

  it('defaults empty values and keeps known ones', () => {
    expect(resolveSenseVoiceModel(undefined)).toBe('sensevoice')
    expect(resolveSenseVoiceModel('  ')).toBe('sensevoice')
    expect(resolveSenseVoiceModel(' paraformer ')).toBe('paraformer')
    expect(resolveSenseVoiceModel('custom')).toBe('custom')
  })
})
