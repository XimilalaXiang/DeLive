import { useState, type ChangeEvent, type Ref } from 'react'
import {
  AlertCircle,
  Check,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Network,
  Palette,
  Power,
  RefreshCw,
  Sparkles,
  Upload,
  Shuffle,
} from 'lucide-react'
import { Switch } from '../ui'
import type { Language, Translations } from '../../i18n'
import type { AiPostProcessConfig, AppSettings, OpenApiConfig } from '../../types'
import { colorThemes, type ColorThemeId } from '../../themes'

interface ImportMessage {
  type: 'success' | 'error'
  text: string
}

interface GeneralSettingsPanelProps {
  t: Translations
  language: Language
  setLanguage: (language: Language) => void
  colorTheme: ColorThemeId
  setColorTheme: (themeId: ColorThemeId) => void
  handleExport: () => Promise<void>
  handleImportClick: () => void
  fileInputRef: Ref<HTMLInputElement>
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  importMessage: ImportMessage | null
  hasElectronApi: boolean
  supportsAutoLaunch: boolean
  autoLaunch: boolean
  handleAutoLaunchChange: (enable: boolean) => Promise<void>
  supportsAutoUpdate: boolean
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  aiPostProcessConfig: AiPostProcessConfig
  updateAiPostProcessConfig: (config: Partial<AiPostProcessConfig>) => void
  openApiConfig: OpenApiConfig
  updateOpenApiConfig: (config: Partial<OpenApiConfig>) => void
  appVersion: string
  updateStatus: 'idle' | 'checking' | 'available' | 'not-available' | 'error'
  handleCheckUpdate: () => Promise<void>
  handleExportDiagnostics: () => Promise<void>
}

export function GeneralSettingsPanel({
  t,
  language,
  setLanguage,
  colorTheme,
  setColorTheme,
  handleExport,
  handleImportClick,
  fileInputRef,
  handleFileChange,
  importMessage,
  hasElectronApi,
  supportsAutoLaunch,
  autoLaunch,
  handleAutoLaunchChange,
  supportsAutoUpdate,
  settings,
  updateSettings,
  aiPostProcessConfig,
  updateAiPostProcessConfig,
  openApiConfig,
  updateOpenApiConfig,
  appVersion,
  updateStatus,
  handleCheckUpdate,
  handleExportDiagnostics,
}: GeneralSettingsPanelProps) {
  const aiConfig = aiPostProcessConfig
  const [showAiApiKey, setShowAiApiKey] = useState(false)
  const [showApiToken, setShowApiToken] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  function generateRandomToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'dlv_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  function copyToClipboard(text: string, field: string): void {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  return (
    <>
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
          {t.settings?.colorTheme || '主题配色'}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.settings?.colorThemeDesc || '选择应用的主色调'}
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
            onChange={(event) => updateAiPostProcessConfig({ baseUrl: event.target.value })}
            placeholder="http://127.0.0.1:11434/v1"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t.settings.aiModel}</label>
          <input
            type="text"
            value={aiConfig.model || ''}
            onChange={(event) => updateAiPostProcessConfig({ model: event.target.value })}
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
              onChange={(event) => updateAiPostProcessConfig({ apiKey: event.target.value })}
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
                  ? 'bg-accent text-foreground border-2 border-foreground/20'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => updateAiPostProcessConfig({ promptLanguage: 'en' })}
              className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
                (aiConfig.promptLanguage || 'zh') === 'en'
                  ? 'bg-accent text-foreground border-2 border-foreground/20'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </section>

      {hasElectronApi && (
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
      )}

      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          {t.settings.dataManagement}
        </label>
        <p className="text-xs text-muted-foreground">
          {t.settings.dataManagementDesc}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExport()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                     border border-input bg-background hover:bg-accent hover:text-accent-foreground
                     rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            {t.settings.exportData}
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                     border border-input bg-background hover:bg-accent hover:text-accent-foreground
                     rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t.settings.importData}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />
        </div>

        {importMessage && (
          <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
            importMessage.type === 'success'
              ? 'bg-success/10 text-success dark:bg-success/10 dark:text-success'
              : 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive'
          }`}>
            {importMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {importMessage.text}
          </div>
        )}
      </section>

      {hasElectronApi && (
        <>
          {supportsAutoLaunch && (
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

          {supportsAutoUpdate && (
            <section className="workspace-panel-muted p-4 space-y-3">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                {t.update?.checkForUpdates || '检查更新'}
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
                      ? (t.update?.checking || '正在检查更新...')
                      : updateStatus === 'not-available'
                      ? (t.update?.upToDate || '已是最新版本')
                      : updateStatus === 'error'
                      ? (t.update?.error || '检查更新失败')
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
                    : (t.update?.checkForUpdates || '检查更新')
                  }
                </button>
              </div>
            </section>
          )}

          <section className="workspace-panel-muted p-4 space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
              {t.settings.diagnostics}
            </label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{t.settings.exportDiagnostics}</p>
                <p className="text-xs text-muted-foreground">{t.settings.exportDiagnosticsDesc}</p>
              </div>
              <button
                onClick={() => void handleExportDiagnostics()}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="w-4 h-4" />
                {t.settings.exportDiagnostics}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  )
}
