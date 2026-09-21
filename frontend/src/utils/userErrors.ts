import { getSavedLanguage, getTranslations, type Language } from '../i18n'
import type { ErrorMessages } from '../i18n/locales/errors.zh'

export type UserErrorKey = keyof ErrorMessages

export function userErrorMessage(
  key: UserErrorKey,
  lang: Language = getSavedLanguage(),
  ...args: unknown[]
): string {
  const value = getTranslations(lang).errors[key]
  if (typeof value === 'function') {
    return (value as (...a: unknown[]) => string)(...args)
  }
  return value as string
}

export function throwUserError(
  key: UserErrorKey,
  lang: Language = getSavedLanguage(),
  ...args: unknown[]
): never {
  throw new Error(userErrorMessage(key, lang, ...args))
}

/** Resolve unknown thrown values to a user-visible message using locale fallbacks. */
export function resolveUserFacingError(
  error: unknown,
  lang: Language = getSavedLanguage(),
  fallbackKey: UserErrorKey = 'unknownError',
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return userErrorMessage(fallbackKey, lang)
}
