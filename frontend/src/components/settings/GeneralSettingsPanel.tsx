import type { ChangeEvent, Ref } from 'react'
import {
  AlertCircle,
  Check,
  Download,
  Globe,
  Key,
  Loader2,
  Palette,
  Power,
  RefreshCw,
  Sparkles,
  Star,
  Upload,
} from 'lucide-react'
import type { Language, Translations } from '../../i18n'
import type { AiPostProcessConfig, AppSettings } from '../../types'
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
  appVersion,
  updateStatus,
  handleCheckUpdate,
  handleExportDiagnostics,
}: GeneralSettingsPanelProps) {
  const aiConfig = aiPostProcessConfig

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
                        ? 'bg-success/10 text-success dark:text-success border-2 border-success ring-2 ring-success/20'
                        : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
          >
            {t.settings.languageChinese}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
                      ${language === 'en'
                        ? 'bg-success/10 text-success dark:text-success border-2 border-success ring-2 ring-success/20'
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
                  <span title={language === 'zh' ? '品牌推荐' : 'Recommended'}>
                    <Star className="w-3 h-3 fill-primary text-primary" />
                  </span>
                )}
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
          <button
            onClick={() => updateAiPostProcessConfig({ enabled: !aiConfig.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              aiConfig.enabled ? 'bg-success' : 'bg-gray-400 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                aiConfig.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
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
          <input
            type="password"
            value={aiConfig.apiKey || ''}
            onChange={(event) => updateAiPostProcessConfig({ apiKey: event.target.value })}
            placeholder={t.settings.aiApiKeyPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
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
                  ? 'bg-success/10 text-success dark:text-success border-2 border-success ring-2 ring-success/20'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => updateAiPostProcessConfig({ promptLanguage: 'en' })}
              className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
                (aiConfig.promptLanguage || 'zh') === 'en'
                  ? 'bg-success/10 text-success dark:text-success border-2 border-success ring-2 ring-success/20'
                  : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </section>

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
                <button
                  onClick={() => void handleAutoLaunchChange(!autoLaunch)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${autoLaunch ? 'bg-success' : 'bg-gray-400 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                              ${autoLaunch ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
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
                    {language === 'zh' ? '启动时自动检查更新' : 'Auto-check on startup'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '每次启动应用时自动检查是否有新版本' : 'Automatically check for updates when app starts'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newValue = settings.autoCheckUpdate === false ? true : false
                    updateSettings({ autoCheckUpdate: newValue })
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${settings.autoCheckUpdate !== false ? 'bg-success' : 'bg-gray-400 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                              ${settings.autoCheckUpdate !== false ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">
                    {language === 'zh' ? '当前版本' : 'Current Version'}: {appVersion || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {updateStatus === 'checking'
                      ? (t.update?.checking || '正在检查更新...')
                      : updateStatus === 'not-available'
                      ? (t.update?.upToDate || '已是最新版本')
                      : updateStatus === 'error'
                      ? (t.update?.error || '检查更新失败')
                      : (language === 'zh' ? '点击按钮检查是否有新版本' : 'Click to check for updates')
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
                              ? 'bg-success/10 text-success dark:text-success border border-success/50'
                              : updateStatus === 'error'
                              ? 'bg-destructive/10 text-destructive dark:text-destructive border border-destructive/50'
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
                    ? (language === 'zh' ? '检查中...' : 'Checking...')
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
