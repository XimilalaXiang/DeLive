/**
 * Color theme definitions
 * Inspired by StyleKit (github.com/AnxForever/stylekit):
 *   Cyan      — cyberpunk-neon / glassmorphism
 *   Violet    — stripe-style
 *   Rose      — neon-tokyo / warm-dashboard
 *   Green     — solarpunk
 *   Amber     — warm-dashboard
 */

export type ColorThemeId = 'cyan' | 'violet' | 'rose' | 'green' | 'amber'

export interface ColorTheme {
  id: ColorThemeId
  labelKey: string          // i18n key
  preview: string           // hex for the swatch UI
  light: {
    primary: string         // HSL values (no hsl() wrapper)
    primaryForeground: string
    ring: string
  }
  dark: {
    primary: string
    primaryForeground: string
    ring: string
  }
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'cyan',
    labelKey: 'themeCyan',
    preview: '#0891b2',
    light: {
      primary: '192 91% 37%',
      primaryForeground: '0 0% 100%',
      ring: '192 91% 37%',
    },
    dark: {
      primary: '186 83% 54%',
      primaryForeground: '224 14% 7%',
      ring: '186 83% 54%',
    },
  },
  {
    id: 'violet',
    labelKey: 'themeViolet',
    preview: '#635bff',
    light: {
      primary: '244 100% 68%',
      primaryForeground: '0 0% 100%',
      ring: '244 100% 68%',
    },
    dark: {
      primary: '250 95% 76%',
      primaryForeground: '224 14% 7%',
      ring: '250 95% 76%',
    },
  },
  {
    id: 'rose',
    labelKey: 'themeRose',
    preview: '#e11d48',
    light: {
      primary: '347 77% 50%',
      primaryForeground: '0 0% 100%',
      ring: '347 77% 50%',
    },
    dark: {
      primary: '347 87% 65%',
      primaryForeground: '224 14% 7%',
      ring: '347 87% 65%',
    },
  },
  {
    id: 'green',
    labelKey: 'themeGreen',
    preview: '#059669',
    light: {
      primary: '160 84% 39%',
      primaryForeground: '0 0% 100%',
      ring: '160 84% 39%',
    },
    dark: {
      primary: '160 67% 52%',
      primaryForeground: '224 14% 7%',
      ring: '160 67% 52%',
    },
  },
  {
    id: 'amber',
    labelKey: 'themeAmber',
    preview: '#d97706',
    light: {
      primary: '38 92% 50%',
      primaryForeground: '0 0% 100%',
      ring: '38 92% 50%',
    },
    dark: {
      primary: '38 92% 56%',
      primaryForeground: '224 14% 7%',
      ring: '38 92% 56%',
    },
  },
]

export const defaultColorTheme: ColorThemeId = 'cyan'

export function getColorTheme(id: ColorThemeId): ColorTheme {
  return colorThemes.find(t => t.id === id) || colorThemes[0]
}

/** Apply a color theme's CSS variables to the document root */
export function applyColorThemeToDOM(themeId: ColorThemeId, isDark: boolean) {
  const theme = getColorTheme(themeId)
  const vars = isDark ? theme.dark : theme.light
  const root = document.documentElement
  root.style.setProperty('--primary', vars.primary)
  root.style.setProperty('--primary-foreground', vars.primaryForeground)
  root.style.setProperty('--ring', vars.ring)
}
