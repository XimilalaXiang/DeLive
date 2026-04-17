import { create } from 'zustand'
import {
  type Language,
  type Translations,
  getTranslations,
  getSavedLanguage,
  saveLanguage
} from '../i18n'
import { type ColorThemeId, defaultColorTheme, applyColorThemeToDOM } from '../themes'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const resolveTheme = (theme: Theme): ResolvedTheme =>
  theme === 'system' ? getSystemTheme() : theme

const getSavedTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
  }
  return 'system'
}

const applyTheme = (resolvedTheme: ResolvedTheme) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export type WorkspaceView = 'live' | 'review' | 'topics' | 'settings'

export interface UIState {
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void

  theme: Theme
  resolvedTheme: ResolvedTheme
  colorTheme: ColorThemeId
  setTheme: (theme: Theme) => void
  setColorTheme: (colorTheme: ColorThemeId) => void
  initTheme: () => void

  currentView: WorkspaceView
  reviewSessionId: string | null
  setView: (view: WorkspaceView, reviewSessionId?: string | null) => void
  openReview: (sessionId: string) => void
  backToLive: () => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  language: getSavedLanguage(),
  t: getTranslations(getSavedLanguage()),
  setLanguage: (lang) => {
    saveLanguage(lang)
    set({ language: lang, t: getTranslations(lang) })
  },

  theme: 'system',
  resolvedTheme: 'light',
  colorTheme: defaultColorTheme,
  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    localStorage.setItem('theme', theme)
    applyTheme(resolved)
    applyColorThemeToDOM(get().colorTheme, resolved === 'dark')
    set({ theme, resolvedTheme: resolved })
  },
  setColorTheme: (colorTheme) => {
    localStorage.setItem('colorTheme', colorTheme)
    applyColorThemeToDOM(colorTheme, get().resolvedTheme === 'dark')
    set({ colorTheme })
  },
  currentView: 'live',
  reviewSessionId: null,
  setView: (view, reviewSessionId = null) => set({ currentView: view, reviewSessionId }),
  openReview: (sessionId) => set({ currentView: 'review', reviewSessionId: sessionId }),
  backToLive: () => set({ currentView: 'live', reviewSessionId: null }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  initTheme: () => {
    const savedTheme = getSavedTheme()
    const resolved = resolveTheme(savedTheme)
    const savedColor = (localStorage.getItem('colorTheme') as ColorThemeId) || defaultColorTheme
    applyTheme(resolved)
    applyColorThemeToDOM(savedColor, resolved === 'dark')
    set({ theme: savedTheme, resolvedTheme: resolved, colorTheme: savedColor })

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        const currentTheme = get().theme
        if (currentTheme === 'system') {
          const newResolved = getSystemTheme()
          applyTheme(newResolved)
          applyColorThemeToDOM(get().colorTheme, newResolved === 'dark')
          set({ resolvedTheme: newResolved })
        }
      })
    }
  },
}))
