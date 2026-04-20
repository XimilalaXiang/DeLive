import { AlertCircle, Check, Loader2, Power, RefreshCw } from 'lucide-react'
import { Switch } from '../ui'
import type { Language, Translations } from '../../i18n'
import type { AppSettings } from '../../types'

interface AboutPanelProps {
  t: Translations
  language: Language
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  supportsAutoLaunch: boolean
  autoLaunch: boolean
  handleAutoLaunchChange: (enable: boolean) => Promise<void>
  supportsAutoUpdate: boolean
  appVersion: string
  updateStatus: 'idle' | 'checking' | 'available' | 'not-available' | 'error'
  handleCheckUpdate: () => Promise<void>
}

export function AboutPanel({
  t,
  language: _language,
  settings,
  updateSettings,
  supportsAutoLaunch,
  autoLaunch,
  handleAutoLaunchChange,
  supportsAutoUpdate,
  appVersion,
  updateStatus,
  handleCheckUpdate,
}: AboutPanelProps) {
  const hasElectronApi = !!window.electronAPI

  return (
    <div className="space-y-6">
      {hasElectronApi && supportsAutoLaunch && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            <Power className="w-3.5 h-3.5 text-muted-foreground" />
            {t.settings.launchSettings}
          </label>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">{t.settings.autoLaunch}</p>
              <p className="text-xs text-muted-foreground">{t.settings.autoLaunchDesc}</p>
            </div>
            <Switch
              checked={autoLaunch}
              onChange={(val) => void handleAutoLaunchChange(val)}
              aria-label={t.settings.autoLaunch}
            />
          </div>
        </section>
      )}

      {hasElectronApi && supportsAutoUpdate && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            {t.update?.checkForUpdates || 'Check for Updates'}
          </label>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">
                {t.electron.autoCheckOnStartup}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.electron.autoCheckOnStartupDesc}
              </p>
            </div>
            <Switch
              checked={settings.autoCheckUpdate !== false}
              onChange={(val) => updateSettings({ autoCheckUpdate: val })}
              aria-label={t.electron.autoCheckOnStartup}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">
                {t.electron.currentVersion}: {appVersion || '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                {updateStatus === 'checking'
                  ? (t.update?.checking || 'Checking...')
                  : updateStatus === 'not-available'
                  ? (t.update?.upToDate || 'Up to date')
                  : updateStatus === 'error'
                  ? (t.update?.error || 'Check failed')
                  : (t.electron.clickToCheck)
                }
              </p>
            </div>
            <button
              onClick={() => void handleCheckUpdate()}
              disabled={updateStatus === 'checking'}
              className={`inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors
                ${updateStatus === 'checking'
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : updateStatus === 'not-available'
                  ? 'bg-success/10 text-success border border-success/50'
                  : updateStatus === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
            >
              {updateStatus === 'checking' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : updateStatus === 'not-available' ? (
                <Check className="w-4 h-4" />
              ) : updateStatus === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {updateStatus === 'checking'
                ? (t.electron.checking)
                : (t.update?.checkForUpdates || 'Check for Updates')
              }
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
