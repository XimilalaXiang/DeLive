/**
 * Complete color theme system
 * Each theme defines a full set of HSL tokens for both light and dark modes.
 *
 * Inspired by StyleKit (github.com/AnxForever/stylekit):
 *   Cyan      — cyberpunk-neon / glassmorphism
 *   Violet    — stripe-style
 *   Rose      — neon-tokyo / warm-dashboard
 *   Green     — solarpunk
 *   Amber     — warm-dashboard
 */

export type ColorThemeId = 'cyan' | 'violet' | 'rose' | 'green' | 'amber' | 'pink' | 'slate' | 'orange'

/** Full set of HSL tokens (values only, e.g. "192 91% 37%") */
export interface ThemeTokens {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  warning: string
  warningForeground: string
  success: string
  successForeground: string
  info: string
  infoForeground: string
}

export interface ColorTheme {
  id: ColorThemeId
  labelKey: string
  preview: string           // primary hex for the swatch
  previewBg: string         // dark-mode background hex for the swatch
  light: ThemeTokens
  dark: ThemeTokens
}

// ─────────────────────────────────────────────
// Theme 1: Cyan — Tech / Audio (default)
// Inspired by: cyberpunk-neon, glassmorphism
// ─────────────────────────────────────────────
const cyan: ColorTheme = {
  id: 'cyan',
  labelKey: 'themeCyan',
  preview: '#0891b2',
  previewBg: '#0f1721',
  light: {
    background: '0 0% 100%',
    foreground: '224 10% 10%',
    card: '0 0% 100%',
    cardForeground: '224 10% 10%',
    popover: '0 0% 100%',
    popoverForeground: '224 10% 10%',
    primary: '192 91% 37%',
    primaryForeground: '0 0% 100%',
    secondary: '200 14% 96%',
    secondaryForeground: '224 10% 10%',
    muted: '200 14% 96%',
    mutedForeground: '200 9% 46%',
    accent: '200 14% 96%',
    accentForeground: '224 10% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '200 13% 91%',
    input: '200 13% 91%',
    ring: '192 91% 37%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '210 20% 7%',
    foreground: '190 15% 96%',
    card: '210 18% 10%',
    cardForeground: '190 15% 96%',
    popover: '210 18% 10%',
    popoverForeground: '190 15% 96%',
    primary: '186 83% 54%',
    primaryForeground: '210 20% 7%',
    secondary: '205 18% 15%',
    secondaryForeground: '190 15% 96%',
    muted: '205 18% 15%',
    mutedForeground: '200 10% 60%',
    accent: '205 18% 15%',
    accentForeground: '190 15% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '205 16% 18%',
    input: '205 16% 18%',
    ring: '186 83% 54%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 2: Violet — Stripe / Premium
// Inspired by: stripe-style (#635bff, #0a2540)
// ─────────────────────────────────────────────
const violet: ColorTheme = {
  id: 'violet',
  labelKey: 'themeViolet',
  preview: '#635bff',
  previewBg: '#13102a',
  light: {
    background: '250 20% 99%',
    foreground: '245 15% 12%',
    card: '260 15% 100%',
    cardForeground: '245 15% 12%',
    popover: '260 15% 100%',
    popoverForeground: '245 15% 12%',
    primary: '244 96% 68%',
    primaryForeground: '0 0% 100%',
    secondary: '250 15% 95%',
    secondaryForeground: '245 15% 12%',
    muted: '250 15% 95%',
    mutedForeground: '248 8% 50%',
    accent: '250 15% 95%',
    accentForeground: '245 15% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '250 12% 90%',
    input: '250 12% 90%',
    ring: '244 96% 68%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '255 18% 6%',
    foreground: '250 12% 95%',
    card: '255 16% 9%',
    cardForeground: '250 12% 95%',
    popover: '255 16% 9%',
    popoverForeground: '250 12% 95%',
    primary: '250 90% 72%',
    primaryForeground: '255 18% 6%',
    secondary: '255 14% 15%',
    secondaryForeground: '250 12% 95%',
    muted: '255 14% 15%',
    mutedForeground: '250 8% 58%',
    accent: '255 14% 15%',
    accentForeground: '250 12% 95%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '255 13% 18%',
    input: '255 13% 18%',
    ring: '250 90% 72%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 3: Rose — Warm / Neon Tokyo
// Inspired by: neon-tokyo (#ff1493), warm-dashboard
// ─────────────────────────────────────────────
const rose: ColorTheme = {
  id: 'rose',
  labelKey: 'themeRose',
  preview: '#e11d48',
  previewBg: '#1a0f14',
  light: {
    background: '350 25% 99%',
    foreground: '345 12% 12%',
    card: '350 20% 100%',
    cardForeground: '345 12% 12%',
    popover: '350 20% 100%',
    popoverForeground: '345 12% 12%',
    primary: '347 77% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '350 18% 95%',
    secondaryForeground: '345 12% 12%',
    muted: '350 18% 95%',
    mutedForeground: '345 8% 50%',
    accent: '350 18% 95%',
    accentForeground: '345 12% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '350 14% 90%',
    input: '350 14% 90%',
    ring: '347 77% 50%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '345 18% 6%',
    foreground: '350 12% 96%',
    card: '345 16% 9%',
    cardForeground: '350 12% 96%',
    popover: '345 16% 9%',
    popoverForeground: '350 12% 96%',
    primary: '347 87% 62%',
    primaryForeground: '345 18% 6%',
    secondary: '345 14% 15%',
    secondaryForeground: '350 12% 96%',
    muted: '345 14% 15%',
    mutedForeground: '345 8% 58%',
    accent: '345 14% 15%',
    accentForeground: '350 12% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '345 13% 18%',
    input: '345 13% 18%',
    ring: '347 87% 62%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 4: Green — Solarpunk / Natural
// Inspired by: solarpunk (#4ade80, #059669)
// ─────────────────────────────────────────────
const green: ColorTheme = {
  id: 'green',
  labelKey: 'themeGreen',
  preview: '#059669',
  previewBg: '#0c1a14',
  light: {
    background: '140 20% 99%',
    foreground: '150 12% 12%',
    card: '140 15% 100%',
    cardForeground: '150 12% 12%',
    popover: '140 15% 100%',
    popoverForeground: '150 12% 12%',
    primary: '160 84% 39%',
    primaryForeground: '0 0% 100%',
    secondary: '145 18% 95%',
    secondaryForeground: '150 12% 12%',
    muted: '145 18% 95%',
    mutedForeground: '148 8% 48%',
    accent: '145 18% 95%',
    accentForeground: '150 12% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '145 12% 89%',
    input: '145 12% 89%',
    ring: '160 84% 39%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '155 18% 6%',
    foreground: '145 12% 96%',
    card: '155 16% 9%',
    cardForeground: '145 12% 96%',
    popover: '155 16% 9%',
    popoverForeground: '145 12% 96%',
    primary: '160 67% 52%',
    primaryForeground: '155 18% 6%',
    secondary: '155 14% 14%',
    secondaryForeground: '145 12% 96%',
    muted: '155 14% 14%',
    mutedForeground: '150 8% 56%',
    accent: '155 14% 14%',
    accentForeground: '145 12% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '155 12% 17%',
    input: '155 12% 17%',
    ring: '160 67% 52%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 5: Amber — Warm Dashboard
// Inspired by: warm-dashboard (#d4a088, #4a9d9a, #e8b86d)
// ─────────────────────────────────────────────
const amber: ColorTheme = {
  id: 'amber',
  labelKey: 'themeAmber',
  preview: '#d97706',
  previewBg: '#1a140c',
  light: {
    background: '40 25% 99%',
    foreground: '30 15% 12%',
    card: '40 20% 100%',
    cardForeground: '30 15% 12%',
    popover: '40 20% 100%',
    popoverForeground: '30 15% 12%',
    primary: '38 92% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 95%',
    secondaryForeground: '30 15% 12%',
    muted: '38 20% 95%',
    mutedForeground: '32 8% 48%',
    accent: '38 20% 95%',
    accentForeground: '30 15% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '36 14% 89%',
    input: '36 14% 89%',
    ring: '38 92% 50%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '30 18% 6%',
    foreground: '38 14% 96%',
    card: '30 16% 9%',
    cardForeground: '38 14% 96%',
    popover: '30 16% 9%',
    popoverForeground: '38 14% 96%',
    primary: '38 92% 56%',
    primaryForeground: '30 18% 6%',
    secondary: '30 14% 14%',
    secondaryForeground: '38 14% 96%',
    muted: '30 14% 14%',
    mutedForeground: '32 8% 56%',
    accent: '30 14% 14%',
    accentForeground: '38 14% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '30 12% 17%',
    input: '30 12% 17%',
    ring: '38 92% 56%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 6: Pink — Soft / Playful
// Inspired by: Sakura pink (#ec4899, #db2777)
// ─────────────────────────────────────────────
const pink: ColorTheme = {
  id: 'pink',
  labelKey: 'themePink',
  preview: '#db2777',
  previewBg: '#1a0d15',
  light: {
    background: '330 25% 99%',
    foreground: '325 12% 12%',
    card: '330 20% 100%',
    cardForeground: '325 12% 12%',
    popover: '330 20% 100%',
    popoverForeground: '325 12% 12%',
    primary: '322 81% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '325 18% 95%',
    secondaryForeground: '325 12% 12%',
    muted: '325 18% 95%',
    mutedForeground: '325 8% 50%',
    accent: '325 18% 95%',
    accentForeground: '325 12% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '325 14% 90%',
    input: '325 14% 90%',
    ring: '322 81% 50%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '325 18% 6%',
    foreground: '330 12% 96%',
    card: '325 16% 9%',
    cardForeground: '330 12% 96%',
    popover: '325 16% 9%',
    popoverForeground: '330 12% 96%',
    primary: '322 85% 62%',
    primaryForeground: '325 18% 6%',
    secondary: '325 14% 15%',
    secondaryForeground: '330 12% 96%',
    muted: '325 14% 15%',
    mutedForeground: '325 8% 58%',
    accent: '325 14% 15%',
    accentForeground: '330 12% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '325 13% 18%',
    input: '325 13% 18%',
    ring: '322 85% 62%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 7: Slate — Neutral / Professional
// Inspired by: monochrome design (#64748b, #475569)
// ─────────────────────────────────────────────
const slate: ColorTheme = {
  id: 'slate',
  labelKey: 'themeSlate',
  preview: '#475569',
  previewBg: '#0f1218',
  light: {
    background: '210 15% 99%',
    foreground: '222 12% 12%',
    card: '210 12% 100%',
    cardForeground: '222 12% 12%',
    popover: '210 12% 100%',
    popoverForeground: '222 12% 12%',
    primary: '215 16% 37%',
    primaryForeground: '0 0% 100%',
    secondary: '215 14% 95%',
    secondaryForeground: '222 12% 12%',
    muted: '215 14% 95%',
    mutedForeground: '215 8% 48%',
    accent: '215 14% 95%',
    accentForeground: '222 12% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '215 12% 89%',
    input: '215 12% 89%',
    ring: '215 16% 37%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '222 16% 7%',
    foreground: '215 12% 96%',
    card: '222 14% 10%',
    cardForeground: '215 12% 96%',
    popover: '222 14% 10%',
    popoverForeground: '215 12% 96%',
    primary: '215 20% 58%',
    primaryForeground: '222 16% 7%',
    secondary: '222 12% 15%',
    secondaryForeground: '215 12% 96%',
    muted: '222 12% 15%',
    mutedForeground: '215 8% 56%',
    accent: '222 12% 15%',
    accentForeground: '215 12% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '222 11% 18%',
    input: '222 11% 18%',
    ring: '215 20% 58%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Theme 8: Orange — Energetic / Creative
// Inspired by: Hacker News / Vercel (#ea580c, #f97316)
// ─────────────────────────────────────────────
const orange: ColorTheme = {
  id: 'orange',
  labelKey: 'themeOrange',
  preview: '#ea580c',
  previewBg: '#1a120a',
  light: {
    background: '25 25% 99%',
    foreground: '20 15% 12%',
    card: '25 20% 100%',
    cardForeground: '20 15% 12%',
    popover: '25 20% 100%',
    popoverForeground: '20 15% 12%',
    primary: '21 90% 48%',
    primaryForeground: '0 0% 100%',
    secondary: '24 18% 95%',
    secondaryForeground: '20 15% 12%',
    muted: '24 18% 95%',
    mutedForeground: '20 8% 48%',
    accent: '24 18% 95%',
    accentForeground: '20 15% 12%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '24 14% 89%',
    input: '24 14% 89%',
    ring: '21 90% 48%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 100%',
    success: '142 71% 45%',
    successForeground: '0 0% 100%',
    info: '199 89% 48%',
    infoForeground: '0 0% 100%',
  },
  dark: {
    background: '20 18% 6%',
    foreground: '24 14% 96%',
    card: '20 16% 9%',
    cardForeground: '24 14% 96%',
    popover: '20 16% 9%',
    popoverForeground: '24 14% 96%',
    primary: '21 90% 55%',
    primaryForeground: '20 18% 6%',
    secondary: '20 14% 14%',
    secondaryForeground: '24 14% 96%',
    muted: '20 14% 14%',
    mutedForeground: '20 8% 56%',
    accent: '20 14% 14%',
    accentForeground: '24 14% 96%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 98%',
    border: '20 12% 17%',
    input: '20 12% 17%',
    ring: '21 90% 55%',
    warning: '38 92% 50%',
    warningForeground: '38 20% 10%',
    success: '142 71% 45%',
    successForeground: '142 20% 10%',
    info: '199 89% 48%',
    infoForeground: '199 20% 10%',
  },
}

// ─────────────────────────────────────────────
// Registry
// Brand theme — Cyan is the primary brand identity
// Other themes are user accent preferences
// ─────────────────────────────────────────────
export const colorThemes: ColorTheme[] = [cyan, violet, rose, green, amber, pink, slate, orange]

export const defaultColorTheme: ColorThemeId = 'cyan'

export function getColorTheme(id: ColorThemeId): ColorTheme {
  return colorThemes.find(t => t.id === id) || colorThemes[0]
}

/** CSS variable name mapping */
const TOKEN_TO_VAR: Record<keyof ThemeTokens, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  info: '--info',
  infoForeground: '--info-foreground',
}

/** Apply a complete color theme to the document root */
export function applyColorThemeToDOM(themeId: ColorThemeId, isDark: boolean) {
  const theme = getColorTheme(themeId)
  const tokens = isDark ? theme.dark : theme.light
  const root = document.documentElement

  for (const [key, cssVar] of Object.entries(TOKEN_TO_VAR)) {
    root.style.setProperty(cssVar, tokens[key as keyof ThemeTokens])
  }
}
