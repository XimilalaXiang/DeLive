import { describe, expect, it } from 'vitest'
import { getTranslations } from '../i18n'
import { userErrorMessage } from './userErrors'

const HAS_CHINESE = /[一-鿿]/

describe('user-facing error locales', () => {
  for (const locale of ['en', 'ko'] as const) {
    it(`errors block has no Chinese in ${locale}`, () => {
      const t = getTranslations(locale)
      const leaks: string[] = []

      for (const [key, value] of Object.entries(t.errors)) {
        const sample =
          typeof value === 'function'
            ? (value as (a: number, b?: string) => string)(404, 'detail')
            : value
        if (typeof sample === 'string' && HAS_CHINESE.test(sample)) {
          leaks.push(`${key}: ${sample}`)
        }
      }

      expect(leaks).toEqual([])
    })
  }

  it('localizes AI request failure by UI language', () => {
    expect(userErrorMessage('aiRequestFailed', 'ko', 502)).toContain('502')
    expect(userErrorMessage('aiRequestFailed', 'en', 502)).toMatch(/AI request failed/i)
  })
})
