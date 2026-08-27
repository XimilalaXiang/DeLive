import { describe, expect, it } from 'vitest'
import { providerRegistry } from '../providers/registry'
import { getProviderDescription, getProviderName, translateConfigField } from './providerI18n'
import { getTranslations } from '../i18n'

const HAS_CHINESE = /[一-鿿]/

/**
 * Upstream writes provider fields in Chinese and translateConfigField falls
 * back to that text whenever a key is missing, which is silent: the field
 * renders, it just renders in the wrong language. Adding a provider or an
 * option is exactly when that gap opens, so the check belongs in the suite
 * rather than in whoever happens to look at the settings screen.
 */
describe('every provider field has a non-Chinese string in each locale', () => {
  for (const locale of ['en', 'ko'] as const) {
    it(`leaves no Chinese in ${locale}`, () => {
      const t = getTranslations(locale)
      const leaks: string[] = []

      for (const info of providerRegistry.getAllProviders()) {
        const check0 = (what: string, text?: string) => {
          if (text && HAS_CHINESE.test(text)) leaks.push(`${info.id} ${what}: ${text}`)
        }
        check0('name', getProviderName(info, t))
        check0('description', getProviderDescription(info, t))
        for (const field of info.configFields ?? []) {
          const out = translateConfigField(info.id, field, t)
          const check = (what: string, text?: string) => {
            if (text && HAS_CHINESE.test(text)) leaks.push(`${info.id}.${field.key} ${what}: ${text}`)
          }
          check('label', out.label)
          check('description', out.description)
          check('placeholder', out.placeholder)
          out.options?.forEach((opt) => check(`option ${opt.value}`, opt.label))
        }
      }

      expect(leaks).toEqual([])
    })
  }
})
