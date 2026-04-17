import { useState } from 'react'
import { Check, Clipboard, Eye, EyeOff, Key, Network, Shuffle } from 'lucide-react'
import { Switch } from '../ui'
import type { Translations } from '../../i18n'
import type { OpenApiConfig } from '../../types'

interface OpenApiPanelProps {
  t: Translations
  openApiConfig: OpenApiConfig
  updateOpenApiConfig: (config: Partial<OpenApiConfig>) => void
}

function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'dlv_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function OpenApiPanel({
  t,
  openApiConfig,
  updateOpenApiConfig,
}: OpenApiPanelProps) {
  const [showApiToken, setShowApiToken] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  function copyToClipboard(text: string, field: string): void {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  const isElectron = !!window.electronAPI

  if (!isElectron) return null

  return (
    <section className="workspace-panel-muted p-4 space-y-3">
      <label className="text-sm font-medium leading-none flex items-center gap-2">
        <Network className="w-3.5 h-3.5 text-muted-foreground" />
        {t.settings.openApiTitle}
      </label>
      <p className="text-xs text-muted-foreground">
        {t.settings.openApiDesc}
      </p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="text-sm font-medium">{t.settings.openApiEnable}</p>
          <p className="text-xs text-muted-foreground">{t.settings.openApiEnableDesc}</p>
        </div>
        <Switch
          checked={!!openApiConfig.enabled}
          onChange={(val) => updateOpenApiConfig({ enabled: val })}
          aria-label={t.settings.openApiEnable}
        />
      </div>

      {openApiConfig.enabled && (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Key className="w-3.5 h-3.5" />
              {t.settings.openApiToken}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiToken ? 'text' : 'password'}
                  value={openApiConfig.token || ''}
                  onChange={(e) => updateOpenApiConfig({ token: e.target.value })}
                  placeholder={t.settings.openApiTokenPlaceholder}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => updateOpenApiConfig({ token: generateRandomToken() })}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                title={t.settings.openApiGenerateToken}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.settings.openApiTokenDesc}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t.settings.openApiEndpoints}
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                  {t.settings.openApiRestUrl}
                </span>
                <code className="text-xs font-mono flex-1 truncate">
                  http://localhost:23456/api/v1/
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('http://localhost:23456/api/v1/', 'rest')}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === 'rest' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                  {t.settings.openApiWsUrl}
                </span>
                <code className="text-xs font-mono flex-1 truncate">
                  ws://localhost:23456/ws/live
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('ws://localhost:23456/ws/live', 'ws')}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === 'ws' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
