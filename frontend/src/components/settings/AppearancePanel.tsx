import { Check, Globe, Palette } from 'lucide-react'
import type { Language, Translations } from '../../i18n'
import { colorThemes, type ColorThemeId } from '../../themes'

interface AppearancePanelProps {
  t: Translations
  language: Language
  setLanguage: (lang: Language) => void
  colorTheme: ColorThemeId
  setColorTheme: (id: ColorThemeId) => void
}

export function AppearancePanel({
  t,
  language,
  setLanguage,
  colorTheme,
  setColorTheme,
}: AppearancePanelProps) {
  return (
    <div className="space-y-6">
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          {t.settings.interfaceLanguage}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.settings.interfaceLanguageDesc}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('zh')}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
              ${language === 'zh'
                ? 'bg-accent text-foreground border-2 border-foreground/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
          >
            {t.settings.languageChinese}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
              ${language === 'en'
                ? 'bg-accent text-foreground border-2 border-foreground/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
          >
            {t.settings.languageEnglish}
          </button>
        </div>
      </section>

      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          {t.settings?.colorTheme || 'Color Theme'}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.settings?.colorThemeDesc || 'Choose the accent color'}
        </p>
        <div className="flex gap-4 justify-start">
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setColorTheme(theme.id)}
              className="group flex flex-col items-center gap-2 transition-all"
              title={t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
            >
              <span
                className={`
                  relative w-10 h-10 rounded-full transition-all
                  ${colorTheme === theme.id
                    ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                    : 'hover:scale-105'
                  }
                `}
                style={{
                  backgroundColor: theme.preview,
                  ...(colorTheme === theme.id ? { boxShadow: `0 0 0 2px ${theme.preview}` } : {}),
                }}
              >
                {colorTheme === theme.id && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
                )}
              </span>
              <span className={`text-[11px] font-medium flex items-center justify-center gap-1 ${
                colorTheme === theme.id ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
