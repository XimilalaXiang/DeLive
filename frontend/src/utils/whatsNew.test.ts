import { describe, expect, it } from 'vitest'
import { getAllWhatsNew, whatsNewLineText } from './whatsNew'

describe('whatsNewLineText', () => {
  it('returns Korean copy when ko is present', () => {
    const entry = getAllWhatsNew()[0]
    const line = entry.features[0]
    expect(whatsNewLineText(line, 'ko')).toMatch(/베트남어|Vietnamese/)
    expect(whatsNewLineText(line, 'zh')).toBe(line.zh)
    expect(whatsNewLineText(line, 'en')).toBe(line.en)
  })

  it('falls back to English for Korean UI when ko is omitted', () => {
    const line = { zh: '中文', en: 'English only' }
    expect(whatsNewLineText(line, 'ko')).toBe('English only')
  })
})
