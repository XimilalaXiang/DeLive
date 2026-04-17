import { useState } from 'react'
import { Eye, EyeOff, Key, Sparkles } from 'lucide-react'
import { Switch } from '../ui'
import type { Translations } from '../../i18n'
import type { AiPostProcessConfig } from '../../types'

interface AiPostProcessPanelProps {
  t: Translations
  aiPostProcessConfig: AiPostProcessConfig
  updateAiPostProcessConfig: (config: Partial<AiPostProcessConfig>) => void
}

export function AiPostProcessPanel({
  t,
  aiPostProcessConfig,
  updateAiPostProcessConfig,
}: AiPostProcessPanelProps) {
  const aiConfig = aiPostProcessConfig
  const [showAiApiKey, setShowAiApiKey] = useState(false)

  return (
    <section className="workspace-panel-muted p-4 space-y-3">
      <label className="text-sm font-medium leading-none flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        {t.settings.aiPostProcessTitle}
      </label>
      <p className="text-xs text-muted-foreground">
        {t.settings.aiPostProcessDesc}
      </p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="text-sm font-medium">{t.settings.aiPostProcessEnable}</p>
          <p className="text-xs text-muted-foreground">{t.settings.aiPostProcessEnableDesc}</p>
        </div>
        <Switch
          checked={!!aiConfig.enabled}
          onChange={(val) => updateAiPostProcessConfig({ enabled: val })}
          aria-label={t.settings.aiPostProcessEnable}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.settings.aiBaseUrl}</label>
        <input
          type="text"
          value={aiConfig.baseUrl || ''}
          onChange={(e) => updateAiPostProcessConfig({ baseUrl: e.target.value })}
          placeholder="http://127.0.0.1:11434/v1"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.settings.aiModel}</label>
        <input
          type="text"
          value={aiConfig.model || ''}
          onChange={(e) => updateAiPostProcessConfig({ model: e.target.value })}
          placeholder="qwen2.5:7b-instruct"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <Key className="w-3.5 h-3.5" />
          {t.settings.aiApiKey}
        </label>
        <div className="relative">
          <input
            type={showAiApiKey ? 'text' : 'password'}
            value={aiConfig.apiKey || ''}
            onChange={(e) => updateAiPostProcessConfig({ apiKey: e.target.value })}
            placeholder={t.settings.aiApiKeyPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="button"
            onClick={() => setShowAiApiKey(!showAiApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showAiApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showAiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.settings.aiApiKeyDesc}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">{t.settings.aiPromptLanguage}</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateAiPostProcessConfig({ promptLanguage: 'zh' })}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
              (aiConfig.promptLanguage || 'zh') === 'zh'
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => updateAiPostProcessConfig({ promptLanguage: 'en' })}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
              (aiConfig.promptLanguage || 'zh') === 'en'
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </section>
  )
}
