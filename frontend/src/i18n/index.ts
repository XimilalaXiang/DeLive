import { zh } from './locales/zh'
import { en } from './locales/en'
import type { Translations } from './locales/zh'

export type Language = 'zh' | 'en'

export const languages: Record<Language, Translations> = {
  zh,
  en,
}

export const languageNames: Record<Language, string> = {
  zh: '中文',
  en: 'English',
}

// 获取翻译文本
export function getTranslations(lang: Language): Translations {
  return languages[lang] || languages.zh
}

// 获取保存的语言设置
export function getSavedLanguage(): Language {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language')
    if (saved === 'zh' || saved === 'en') {
      return saved
    }
  }
  return 'zh' // 默认中文
}

// 保存语言设置
export function saveLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang)
  }
}

export type { Translations }
export { zh, en }
