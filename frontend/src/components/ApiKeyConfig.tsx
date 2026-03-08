import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Check, X } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTagStore } from '../stores/tagStore'
import { exportAllData, validateBackupData, importDataOverwrite, importDataMerge } from '../utils/storage'
import { GeneralSettingsPanel } from './settings/GeneralSettingsPanel'
import { ServiceSettingsPanel } from './settings/ServiceSettingsPanel'
import type { ASRProviderInfo, ProviderConfigData } from '../types'
import { getMissingRequiredConfigLabels } from '../utils/providerConfig'
import {
  buildProviderConfigFromFormState,
  buildProviderFormState,
  formatStringArrayValue,
  type ProviderFormState,
} from '../utils/providerConfigForm'
import { testProviderConfig } from '../utils/providerConfigTest'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { t, language, setLanguage, colorTheme, setColorTheme } = useUIStore()
  const { settings, updateSettings, availableProviders, updateProviderConfig } = useSettingsStore()
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
  
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle')
  const [appVersion, setAppVersion] = useState('')
  const [activeTab, setActiveTab] = useState<'service' | 'general'>('service')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supportsAutoLaunch = !!window.electronAPI?.supportsAutoLaunch
  const supportsAutoUpdate = !!window.electronAPI?.supportsAutoUpdate
  
  // 当提供商改变时更新表单
  useEffect(() => {
    setFormState(buildProviderFormState(currentProvider, currentStoredConfig, settings))
    setLanguageHints(formatStringArrayValue(currentStoredConfig?.languageHints, settings.languageHints || ['zh', 'en']))
    setRevealedFields({})
    setTestStatus('idle')
    setTestMessage('')
  }, [currentProvider, currentStoredConfig, settings])

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

  const handleSave = () => {
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
      alert(t.settings.diagnosticsExported)
    } else if (result.reason !== 'cancelled') {
      alert(`${t.settings.diagnosticsExportFailed}: ${result.reason}`)
    }
  }

  // 处理文件导入
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!validateBackupData(data)) {
        setImportMessage({ type: 'error', text: t.settings.invalidBackupFile })
        return
      }

      // 询问导入模式
      const mode = confirm(t.settings.importConfirm(data.sessions.length, data.tags.length))

      if (mode) {
        // 覆盖模式
        const result = await importDataOverwrite(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedOverwrite(result.sessions, result.tags)
        })
      } else {
        // 合并模式
        const result = await importDataMerge(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedMerge(result.newSessions, result.newTags)
        })
      }

      // 刷新store中的数据
      await loadSessions()
      loadTags()
    } catch {
      setImportMessage({ type: 'error', text: t.settings.importFailed })
    }

    // 清空文件输入，允许再次选择同一文件
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col dark:ring-1 dark:ring-white/[0.08]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t.settings.title}</h2>
              <p className="text-xs text-muted-foreground">{t.settings.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-muted/20 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('service')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'service'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.settings?.tabService || '服务配置'}
            {activeTab === 'service' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'general'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.settings?.tabGeneral || '通用设置'}
            {activeTab === 'general' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'service' && (
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
          )}

          {activeTab === 'general' && (
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
              appVersion={appVersion}
              updateStatus={updateStatus}
              handleCheckUpdate={handleCheckUpdate}
              handleExportDiagnostics={handleExportDiagnostics}
            />
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 press-scale"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2 press-scale"
          >
            <Check className="w-4 h-4" />
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  )
}
