import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Settings, Check, X } from 'lucide-react'
import { Button } from './ui'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTagStore } from '../stores/tagStore'
import {
  exportAllData,
  getBackupValidationErrors,
  validateBackupData,
  importDataOverwrite,
  importDataMerge,
  type BackupData,
} from '../utils/storage'
import { GeneralSettingsPanel } from './settings/GeneralSettingsPanel'
import { CloudBackupPanel } from './settings/CloudBackupPanel'
import { ServiceSettingsPanel } from './settings/ServiceSettingsPanel'
import { ActionDialog } from './ActionDialog'
import type { ASRProviderInfo, ProviderConfigData } from '../types'
import { getMissingRequiredConfigLabels } from '../utils/providerConfig'
import {
  buildProviderConfigFromFormState,
  buildProviderFormState,
  formatStringArrayValue,
  type ProviderFormState,
} from '../utils/providerConfigForm'
import { testProviderConfig } from '../utils/providerConfigTest'
import { getDefaultSettings } from '../utils/storageShared'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'modal' | 'view'
}

export function ApiKeyConfig({ isOpen, onClose, mode = 'modal' }: ApiKeyConfigProps) {
  const isViewMode = mode === 'view'
  const { t, language, setLanguage, colorTheme, setColorTheme } = useUIStore()
  const {
    settings,
    updateSettings,
    updateAiPostProcessConfig,
    updateOpenApiConfig,
    updateCloudBackupConfig,
    availableProviders,
    updateProviderConfig,
  } = useSettingsStore()
  const { loadSessions } = useSessionStore()
  const { loadTags } = useTagStore()
  
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const currentStoredConfig = settings.providerConfigs?.[currentVendor]

  const [formState, setFormState] = useState<ProviderFormState>(() => (
    buildProviderFormState(currentProvider, currentStoredConfig, settings)
  ))
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({})
  const [languageHints, setLanguageHints] = useState(() => (
    formatStringArrayValue(currentStoredConfig?.languageHints, settings.languageHints || ['zh', 'en'])
  ))
  const [aiPostProcessConfig, setAiPostProcessConfig] = useState(
    settings.aiPostProcess || getDefaultSettings().aiPostProcess || {},
  )
  
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingImportData, setPendingImportData] = useState<{ data: BackupData } | null>(null)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle')
  const [appVersion, setAppVersion] = useState('')
  const [activeTab, setActiveTab] = useState<'service' | 'general'>('service')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supportsAutoLaunch = !!window.electronAPI?.supportsAutoLaunch
  const supportsAutoUpdate = !!window.electronAPI?.supportsAutoUpdate

  const snapshotRef = useRef({ formState, languageHints, aiPostProcessConfig, currentVendor: settings.currentVendor })
  
  // 当提供商改变时更新表单
  useEffect(() => {
    const newFormState = buildProviderFormState(currentProvider, currentStoredConfig, settings)
    const newLanguageHints = formatStringArrayValue(currentStoredConfig?.languageHints, settings.languageHints || ['zh', 'en'])
    const newAiConfig = settings.aiPostProcess || getDefaultSettings().aiPostProcess || {}
    setFormState(newFormState)
    setLanguageHints(newLanguageHints)
    setAiPostProcessConfig(newAiConfig)
    setRevealedFields({})
    setTestStatus('idle')
    setTestMessage('')
    snapshotRef.current = { formState: newFormState, languageHints: newLanguageHints, aiPostProcessConfig: newAiConfig, currentVendor: settings.currentVendor || 'soniox' }
  }, [currentProvider, currentStoredConfig, settings])

  const isDirty = useMemo(() => {
    const snap = snapshotRef.current
    return (
      JSON.stringify(formState) !== JSON.stringify(snap.formState) ||
      languageHints !== snap.languageHints ||
      JSON.stringify(aiPostProcessConfig) !== JSON.stringify(snap.aiPostProcessConfig) ||
      (settings.currentVendor || 'soniox') !== snap.currentVendor
    )
  }, [formState, languageHints, aiPostProcessConfig, settings.currentVendor])

  // 加载开机自启动状态和应用版本（仅 Electron 环境）
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      if (window.electronAPI.supportsAutoLaunch) {
        window.electronAPI.getAutoLaunch?.().then(setAutoLaunch).catch(() => {
          setAutoLaunch(false)
        })
      } else {
        setAutoLaunch(false)
      }
      window.electronAPI.getAppVersion?.().then(setAppVersion)
    }
  }, [isOpen])

  // 切换开机自启动
  const handleAutoLaunchChange = async (enable: boolean) => {
    if (!window.electronAPI?.setAutoLaunch || !supportsAutoLaunch) return
    try {
      const result = await window.electronAPI.setAutoLaunch(enable)
      setAutoLaunch(result)
    } catch (error) {
      console.error('设置开机自启动失败:', error)
    }
  }

  // 手动检查更新
  const handleCheckUpdate = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) return
    
    setUpdateStatus('checking')
    const result = await window.electronAPI.checkForUpdates()
    
    if (result.error) {
      setUpdateStatus('error')
      setTimeout(() => setUpdateStatus('idle'), 3000)
    } else if (result.success) {
      // 等待更新事件通知
      setTimeout(() => {
        if (updateStatus === 'checking') {
          setUpdateStatus('not-available')
          setTimeout(() => setUpdateStatus('idle'), 3000)
        }
      }, 5000)
    }
  }, [updateStatus])

  const updateFormField = (fieldKey: string, value: string | boolean) => {
    setFormState(prev => ({
      ...prev,
      [fieldKey]: value,
    }))
    if (testStatus !== 'idle' || testMessage) {
      setTestStatus('idle')
      setTestMessage('')
    }
  }

  const toggleFieldVisibility = (fieldKey: string) => {
    setRevealedFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }))
  }

  const getStringFieldValue = (fieldKey: string): string => {
    const value = formState[fieldKey]
    return typeof value === 'string' ? value : ''
  }

  const getBooleanFieldValue = (fieldKey: string): boolean => {
    return Boolean(formState[fieldKey])
  }

  const buildEditableProviderConfig = (): ProviderConfigData => (
    buildProviderConfigFromFormState(currentProvider, formState, languageHints)
  )

  // 测试 API 配置
  const handleTestConfig = async () => {
    if (!currentProvider?.capabilities.supportsConfigTest) {
      return
    }

    setTestStatus('testing')
    setTestMessage('')

    try {
      const providerConfig = buildEditableProviderConfig()
      const missingLabels = getMissingRequiredConfigLabels(currentProvider, providerConfig)

      if (missingLabels.length > 0) {
        throw new Error(`请先填写: ${missingLabels.join('、')}`)
      }

      await testProviderConfig(currentProvider, providerConfig)

      setTestStatus('success')
      setTestMessage(t.settings?.testSuccess || '配置验证成功！')
      setTimeout(() => {
        setTestStatus('idle')
        setTestMessage('')
      }, 3000)
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '配置验证失败')
    }
  }

  const handleSave = async () => {
    const providerConfig = buildEditableProviderConfig()
    const normalizedHints = Array.isArray(providerConfig.languageHints) && providerConfig.languageHints.length > 0
      ? providerConfig.languageHints
          .map((item) => String(item).trim())
          .filter(Boolean)
      : ['zh', 'en']

    const missingLabels = getMissingRequiredConfigLabels(currentProvider, providerConfig)
    if (missingLabels.length > 0) {
      setTestStatus('error')
      setTestMessage(`请先填写: ${missingLabels.join('、')}`)
      return
    }
    
    // 更新当前提供商的配置
    updateProviderConfig(currentVendor, providerConfig)
    
    // 同时更新全局设置以保持兼容
    const shouldSyncLegacyApiKey = currentProvider?.requiredConfigKeys.includes('apiKey')
    updateSettings({
      apiKey: shouldSyncLegacyApiKey && typeof providerConfig.apiKey === 'string'
        ? providerConfig.apiKey.trim()
        : settings.apiKey,
      languageHints: normalizedHints,
    })
    await updateAiPostProcessConfig(aiPostProcessConfig)
    onClose()
  }
  
  // 获取提供商的配置链接
  const getProviderConsoleUrl = (provider: ASRProviderInfo | undefined): string => {
    switch (provider?.id) {
      case 'soniox':
        return 'https://console.soniox.com'
      case 'volc':
        return 'https://console.volcengine.com/speech/app'
      case 'local_openai':
        return 'https://platform.openai.com/docs/api-reference/audio'
      default:
        return provider?.website || '#'
    }
  }

  // 导出数据
  const handleExport = async () => {
    try {
      await exportAllData()
      setImportMessage({ type: 'success', text: t.settings.dataExported })
      setTimeout(() => setImportMessage(null), 3000)
    } catch {
      setImportMessage({ type: 'error', text: t.settings.importFailed })
    }
  }

  // 触发文件选择
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleExportDiagnostics = async () => {
    if (!window.electronAPI?.exportDiagnostics) return

    const settingsData = { ...settings } as Record<string, unknown>
    const localStorageKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) localStorageKeys.push(key)
    }

  const result = await window.electronAPI.exportDiagnostics({ settings: settingsData, localStorageKeys })
  if (result.success) {
      setImportMessage({ type: 'success', text: t.settings.diagnosticsExported })
      setTimeout(() => setImportMessage(null), 3000)
  } else if (result.reason !== 'cancelled') {
      setImportMessage({
        type: 'error',
        text: `${t.settings.diagnosticsExportFailed}: ${result.reason}`,
      })
  }
}

  // 处理文件导入
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      const validationErrors = getBackupValidationErrors(data)
      if (!validateBackupData(data)) {
        setImportMessage({
          type: 'error',
          text: validationErrors.length > 0
            ? `${t.settings.invalidBackupFile}: ${validationErrors[0]}`
            : t.settings.invalidBackupFile,
        })
        return
      }

      setPendingImportData({ data })
    } catch (error) {
      const message = error instanceof SyntaxError
        ? `${t.settings.invalidBackupFile}: invalid JSON`
        : error instanceof Error
          ? error.message
          : t.settings.importFailed
      setImportMessage({ type: 'error', text: message })
    }

    // 清空文件输入，允许再次选择同一文件
    e.target.value = ''
  }

  const handleApplyImport = useCallback(async (mode: 'overwrite' | 'merge') => {
    if (!pendingImportData) return

    try {
      if (mode === 'overwrite') {
        const result = await importDataOverwrite(pendingImportData.data)
        setImportMessage({
          type: 'success',
          text: t.settings.importedOverwrite(result.sessions, result.tags),
        })
      } else {
        const result = await importDataMerge(pendingImportData.data)
        setImportMessage({
          type: 'success',
          text: t.settings.importedMerge(result.newSessions, result.newTags),
        })
      }

      await loadSessions()
      loadTags()
    } catch (error) {
      setImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t.settings.importFailed,
      })
    } finally {
      setPendingImportData(null)
    }
  }, [loadSessions, loadTags, pendingImportData, t.settings])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen && !isViewMode) return null

  const settingsContent = (
    <>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-lg font-semibold tracking-tight">{t.settings.title}</h2>
              <p className="text-xs text-muted-foreground">{t.settings.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar — unified with SessionTabBar style */}
        <div className="relative flex items-center gap-1 border-b border-border bg-background/70 px-6 flex-shrink-0" role="tablist" aria-label="Settings sections">
          <button
            role="tab"
            aria-selected={activeTab === 'service'}
            aria-controls="settings-panel-service"
            id="settings-tab-service"
            onClick={() => setActiveTab('service')}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'service'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            {t.settings?.tabService || '服务配置'}
            <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary transition-opacity duration-200 ${activeTab === 'service' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'general'}
            aria-controls="settings-panel-general"
            id="settings-tab-general"
            onClick={() => setActiveTab('general')}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            {t.settings?.tabGeneral || '通用设置'}
            <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary transition-opacity duration-200 ${activeTab === 'general' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'service' && (
            <div id="settings-panel-service" role="tabpanel" aria-labelledby="settings-tab-service">
            <ServiceSettingsPanel
              t={t}
              currentProvider={currentProvider}
              languageHints={languageHints}
              onLanguageHintsChange={(value) => {
                setLanguageHints(value)
                if (testStatus !== 'idle' || testMessage) {
                  setTestStatus('idle')
                  setTestMessage('')
                }
              }}
              getProviderConsoleUrl={getProviderConsoleUrl}
              updateFormField={updateFormField}
              getStringFieldValue={getStringFieldValue}
              getBooleanFieldValue={getBooleanFieldValue}
              revealedFields={revealedFields}
              toggleFieldVisibility={toggleFieldVisibility}
              buildEditableProviderConfig={buildEditableProviderConfig}
              onRunConfigTest={handleTestConfig}
              testStatus={testStatus}
              testMessage={testMessage}
              onBundledRuntimePatch={(patch) => {
                for (const [key, value] of Object.entries(patch)) {
                  if (typeof value === 'boolean') {
                    updateFormField(key, value)
                  } else if (typeof value === 'number') {
                    updateFormField(key, String(value))
                  } else if (typeof value === 'string') {
                    updateFormField(key, value)
                  }
                }
              }}
            />
            </div>
          )}

          {activeTab === 'general' && (
            <div id="settings-panel-general" role="tabpanel" aria-labelledby="settings-tab-general">
            <GeneralSettingsPanel
              t={t}
              language={language}
              setLanguage={setLanguage}
              colorTheme={colorTheme}
              setColorTheme={setColorTheme}
              handleExport={handleExport}
              handleImportClick={handleImportClick}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              importMessage={importMessage}
              hasElectronApi={Boolean(window.electronAPI)}
              supportsAutoLaunch={supportsAutoLaunch}
              autoLaunch={autoLaunch}
              handleAutoLaunchChange={handleAutoLaunchChange}
              supportsAutoUpdate={supportsAutoUpdate}
              settings={settings}
              updateSettings={updateSettings}
              aiPostProcessConfig={aiPostProcessConfig}
              updateAiPostProcessConfig={(patch) => {
                setAiPostProcessConfig((prev) => ({
                  ...prev,
                  ...patch,
                }))
              }}
              openApiConfig={settings.openApi || { enabled: false, token: '' }}
              updateOpenApiConfig={updateOpenApiConfig}
              appVersion={appVersion}
              updateStatus={updateStatus}
              handleCheckUpdate={handleCheckUpdate}
              handleExportDiagnostics={handleExportDiagnostics}
            />
            <CloudBackupPanel
              t={t}
              cloudBackupConfig={settings.cloudBackup || { enabled: false, provider: 's3' }}
              updateCloudBackupConfig={updateCloudBackupConfig}
            />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border flex-shrink-0">
          {isDirty && (
            <span className="mr-auto text-xs text-warning font-medium">
              {language === 'zh' ? '有未保存的更改' : 'Unsaved changes'}
            </span>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="primary" onClick={() => void handleSave()}>
            <Check className="w-4 h-4" />
            {t.common.save}
          </Button>
        </div>
        <ActionDialog
          open={pendingImportData !== null}
          title={language === 'zh' ? '选择导入模式' : 'Choose import mode'}
          description={pendingImportData
            ? t.settings.importConfirm(pendingImportData.data.sessions.length, pendingImportData.data.tags.length)
            : ''
          }
          onClose={() => setPendingImportData(null)}
          actions={[
            {
              label: t.common.cancel,
              onClick: () => setPendingImportData(null),
              variant: 'secondary',
            },
            {
              label: language === 'zh' ? '合并导入' : 'Merge import',
              onClick: () => void handleApplyImport('merge'),
              variant: 'secondary',
            },
            {
              label: language === 'zh' ? '覆盖导入' : 'Overwrite import',
              onClick: () => void handleApplyImport('overwrite'),
              variant: 'primary',
            },
          ]}
        />
    </>
  )

  if (isViewMode) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
        {settingsContent}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="mx-4 flex h-[min(92vh,58rem)] w-full max-w-[min(78rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl dark:ring-1 dark:ring-white/[0.08] animate-in zoom-in-95 duration-200"
      >
        {settingsContent}
      </div>
    </div>
  )
}
