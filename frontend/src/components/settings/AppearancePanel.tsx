import { Globe, Palette, Star } from 'lucide-react'
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
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
          >
            {t.settings.languageChinese}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
              ${language === 'en'
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
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
        <div className="flex gap-3 justify-start">
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setColorTheme(theme.id)}
              className="group flex flex-col items-center gap-1.5 transition-all"
              title={t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
            >
              <span
                className={`
                  relative w-10 h-10 rounded-lg overflow-hidden transition-all border-2
                  ${colorTheme === theme.id
                    ? 'ring-2 ring-offset-2 ring-offset-background scale-110 border-transparent'
                    : 'border-border hover:scale-105 hover:border-foreground/30'
                  }
                `}
                style={{
                  backgroundColor: theme.previewBg,
                  ...(colorTheme === theme.id ? { boxShadow: `0 0 0 2px ${theme.preview}` } : {}),
                }}
              >
                <span className="absolute bottom-0 left-0 right-0 h-[40%]" style={{ backgroundColor: theme.preview }} />
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: theme.preview, opacity: 0.6 }} />
              </span>
              <span className={`text-xs font-medium flex items-center justify-center gap-1 ${
                colorTheme === theme.id ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
                {theme.id === 'cyan' && (
                  <span title={t.electron.brandRecommended}>
                    <Star className="w-3 h-3 fill-primary text-primary" />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
