import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Eye, EyeOff, Check, X, Key, Download, Upload, AlertCircle, Power, Globe, Cpu, PlayCircle, Loader2, RefreshCw, Palette } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportAllData, validateBackupData, importDataOverwrite, importDataMerge } from '../utils/storage'
import { ProviderSelector } from './ProviderSelector'
import { LocalModelSetupGuide } from './LocalModelSetupGuide'
import { BundledRuntimeSetupGuide } from './BundledRuntimeSetupGuide'
import type { ASRProviderInfo, ProviderConfigData } from '../types'
import type { ProviderConfigField } from '../types/asr'
import { getMissingRequiredConfigLabels } from '../utils/providerConfig'
import {
  buildProviderConfigFromFormState,
  buildProviderFormState,
  formatStringArrayValue,
  type ProviderFormState,
} from '../utils/providerConfigForm'
import { testProviderConfig } from '../utils/providerConfigTest'
import { colorThemes } from '../themes'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { 
    settings, 
    updateSettings, 
    loadSessions, 
    loadTags, 
    t, 
    language, 
    setLanguage,
    availableProviders,
    updateProviderConfig,
    colorTheme,
    setColorTheme,
  } = useTranscriptStore()
  
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
  }, [currentProvider, currentStoredConfig, settings.apiKey, settings.languageHints, currentVendor])

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

  const getFieldIcon = (field: ProviderConfigField) => {
    if (field.key.toLowerCase().includes('model')) {
      return <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
    }
    return <Key className="w-3.5 h-3.5 text-muted-foreground" />
  }

  const isMonospaceField = (field: ProviderConfigField): boolean => {
    const key = field.key.toLowerCase()
    return field.type === 'password' || key.includes('key') || key.includes('url') || key.includes('model')
  }
  
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
  const handleExport = () => {
    exportAllData()
    setImportMessage({ type: 'success', text: t.settings.dataExported })
    setTimeout(() => setImportMessage(null), 3000)
  }

  // 触发文件选择
  const handleImportClick = () => {
    fileInputRef.current?.click()
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
        const result = importDataOverwrite(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedOverwrite(result.sessions, result.tags)
        })
      } else {
        // 合并模式
        const result = importDataMerge(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedMerge(result.newSessions, result.newTags)
        })
      }

      // 刷新store中的数据
      loadSessions()
      loadTags()
    } catch {
      setImportMessage({ type: 'error', text: t.settings.importFailed })
    }

    // 清空文件输入，允许再次选择同一文件
    e.target.value = ''
  }

  const renderFieldDescription = (field: ProviderConfigField) => {
    const description = field.description?.trim()
    const docsUrl = getProviderConsoleUrl(currentProvider)
    const shouldShowDocsLink = docsUrl !== '#' && (field.key === 'apiKey' || field.key === 'appKey')

    if (!description && !shouldShowDocsLink) {
      return null
    }

    return (
      <p className="text-[10px] text-muted-foreground">
        {description}
        {description && shouldShowDocsLink ? ' ' : ''}
        {shouldShowDocsLink && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline underline-offset-2"
          >
            {field.key === 'apiKey' ? '查看文档' : '打开控制台'}
          </a>
        )}
      </p>
    )
  }

  const renderProviderField = (field: ProviderConfigField) => {
    const commonInputClassName = `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isMonospaceField(field) ? 'font-mono' : ''}`

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                {getFieldIcon(field)}
                {field.label}
              </label>
              {field.description && (
                <p className="text-[10px] text-muted-foreground">{field.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => updateFormField(field.key, !getBooleanFieldValue(field.key))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                getBooleanFieldValue(field.key) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  getBooleanFieldValue(field.key) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            {getFieldIcon(field)}
            {field.label}
          </label>
          <select
            value={getStringFieldValue(field.key)}
            onChange={(e) => updateFormField(field.key, e.target.value)}
            className={commonInputClassName}
          >
            <option value="">{field.placeholder || `请选择${field.label}`}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {renderFieldDescription(field)}
        </div>
      )
    }

    const isPasswordField = field.type === 'password'
    const isRevealed = Boolean(revealedFields[field.key])
    const inputType = field.type === 'number'
      ? 'number'
      : isPasswordField && !isRevealed
      ? 'password'
      : 'text'
    const value = getStringFieldValue(field.key)
    const placeholder = field.placeholder || ''

    return (
      <div key={field.key} className="space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          {getFieldIcon(field)}
          {field.label}
        </label>
        <div className="relative group">
          <input
            type={inputType}
            value={value}
            onChange={(e) => updateFormField(field.key, e.target.value)}
            placeholder={placeholder}
            className={`${commonInputClassName} ${isPasswordField ? 'pr-10' : ''}`}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => toggleFieldVisibility(field.key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {renderFieldDescription(field)}
      </div>
    )
  }

  // 渲染提供商特定的配置字段
  const renderProviderFields = () => {
    const localCapabilities = currentProvider?.capabilities.local
    const shouldShowLocalSetupGuide = Boolean(
      currentProvider &&
      currentProvider.type === 'local' &&
      localCapabilities?.connectionMode === 'service' &&
      localCapabilities.supportsServiceDiscovery
    )
    const shouldShowBundledRuntimeGuide = Boolean(
      currentProvider &&
      currentProvider.type === 'local' &&
      localCapabilities?.connectionMode === 'runtime' &&
      localCapabilities.runtimeId
    )
    const guideManagedFieldKeys = shouldShowBundledRuntimeGuide
      ? new Set(['binaryPath', 'modelPath'])
      : new Set<string>()
    const providerFields = (currentProvider?.configFields || []).filter(
      field => field.key !== 'languageHints' && !guideManagedFieldKeys.has(field.key)
    )

    return (
      <>
        {providerFields.map(renderProviderField)}

        {shouldShowLocalSetupGuide && currentProvider && (
          <LocalModelSetupGuide
            provider={currentProvider}
            config={buildEditableProviderConfig()}
            onModelChange={(value) => updateFormField('model', value)}
          />
        )}

        {shouldShowBundledRuntimeGuide && currentProvider && (
          <BundledRuntimeSetupGuide
            provider={currentProvider}
            config={buildEditableProviderConfig()}
            onRunConfigTest={handleTestConfig}
            testStatus={testStatus}
            testMessage={testMessage}
            onConfigPatch={(patch) => {
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

        {renderTestButton()}
      </>
    )
  }

  // 渲染测试按钮
  const renderTestButton = () => {
    if (!currentProvider?.capabilities.supportsConfigTest) {
      return null
    }

    return (
      <div className="space-y-3">
        <button
          onClick={handleTestConfig}
          disabled={testStatus === 'testing'}
          className={`
            w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium
            rounded-lg transition-all
            ${testStatus === 'testing' 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : testStatus === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
              : testStatus === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
              : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
            }
          `}
        >
          {testStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.settings?.testing || '正在测试...'}
            </>
          ) : testStatus === 'success' ? (
            <>
              <Check className="w-4 h-4" />
              {t.settings?.testSuccess || '配置有效'}
            </>
          ) : testStatus === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              {t.settings?.testFailed || '配置无效'}
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              {t.settings?.testConfig || '测试配置'}
            </>
          )}
        </button>
        
        {/* 测试结果消息 */}
        {testMessage && (
          <div className={`
            flex items-center gap-2 p-3 rounded-lg text-xs
            ${testStatus === 'success' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }
          `}>
            {testStatus === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="break-all">{testMessage}</span>
          </div>
        )}
      </div>
    )
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
            <>
              {/* ASR 提供商选择 */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.settings?.asrProvider || '语音识别服务'}
                </label>
                <ProviderSelector />
                <p className="text-[10px] text-muted-foreground">
                  {t.settings?.asrProviderDesc || '选择语音识别服务提供商，不同提供商有不同的特性和价格'}
                </p>
              </div>

              {/* 提供商特定配置字段 */}
              {renderProviderFields()}

              {/* 语言提示 */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t.settings.languageHints}
                </label>
                <input
                  type="text"
                  value={languageHints}
                  onChange={(e) => {
                    setLanguageHints(e.target.value)
                    if (testStatus !== 'idle' || testMessage) {
                      setTestStatus('idle')
                      setTestMessage('')
                    }
                  }}
                  placeholder={t.settings.languageHintsPlaceholder}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t.settings.languageHintsDesc}
                </p>
              </div>
            </>
          )}

          {activeTab === 'general' && (
            <>
              {/* 界面语言设置 */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.settings.interfaceLanguage}
                </label>
                <p className="text-[10px] text-muted-foreground">
                  {t.settings.interfaceLanguageDesc}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage('zh')}
                    className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
                              ${language === 'zh' 
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500 ring-2 ring-green-500/20' 
                                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                              }`}
                  >
                    {t.settings.languageChinese}
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
                              ${language === 'en' 
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500 ring-2 ring-green-500/20' 
                                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                              }`}
                  >
                    {t.settings.languageEnglish}
                  </button>
                </div>
              </div>

              {/* 配色主题 */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.settings?.colorTheme || '主题配色'}
                </label>
                <p className="text-[10px] text-muted-foreground">
                  {t.settings?.colorThemeDesc || '选择应用的主色调'}
                </p>
                <div className="flex gap-3 justify-start">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setColorTheme(theme.id)}
                      className={`
                        group flex flex-col items-center gap-1.5 transition-all
                      `}
                      title={t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
                    >
                      {/* Mini palette preview: dark bg + primary accent */}
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
                        {/* Primary color bar */}
                        <span className="absolute bottom-0 left-0 right-0 h-[40%]" style={{ backgroundColor: theme.preview }} />
                        {/* Tiny accent dot */}
                        <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: theme.preview, opacity: 0.6 }} />
                      </span>
                      <span className={`text-[10px] font-medium ${
                        colorTheme === theme.id ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {t.settings?.[theme.labelKey as keyof typeof t.settings] as string || theme.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 数据管理 */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.settings.dataManagement}
                </label>
                <p className="text-[10px] text-muted-foreground">
                  {t.settings.dataManagementDesc}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
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
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                
                {/* 导入结果提示 */}
                {importMessage && (
                  <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                    importMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {importMessage.type === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    {importMessage.text}
                  </div>
                )}
              </div>

              {/* 开机自启动 / 更新（仅 Electron 环境显示） */}
              {window.electronAPI && (
                <>
                  {supportsAutoLaunch && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium leading-none flex items-center gap-2">
                        <Power className="w-3.5 h-3.5 text-muted-foreground" />
                        {t.settings.launchSettings}
                      </label>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{t.settings.autoLaunch}</p>
                          <p className="text-[10px] text-muted-foreground">{t.settings.autoLaunchDesc}</p>
                        </div>
                        <button
                          onClick={() => handleAutoLaunchChange(!autoLaunch)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${autoLaunch ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                                      ${autoLaunch ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {supportsAutoUpdate && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium leading-none flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        {t.update?.checkForUpdates || '检查更新'}
                      </label>
                      
                      {/* 启动时自动检查更新开关 */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">
                            {language === 'zh' ? '启动时自动检查更新' : 'Auto-check on startup'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {language === 'zh' ? '每次启动应用时自动检查是否有新版本' : 'Automatically check for updates when app starts'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newValue = settings.autoCheckUpdate === false ? true : false
                            updateSettings({ autoCheckUpdate: newValue })
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${settings.autoCheckUpdate !== false ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                                      ${settings.autoCheckUpdate !== false ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                      
                      {/* 当前版本和手动检查按钮 */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">
                            {language === 'zh' ? '当前版本' : 'Current Version'}: {appVersion || '-'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
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
                          onClick={handleCheckUpdate}
                          disabled={updateStatus === 'checking'}
                          className={`inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors
                                    ${updateStatus === 'checking'
                                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                      : updateStatus === 'not-available'
                                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/50'
                                      : updateStatus === 'error'
                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/50'
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
                    </div>
                  )}
                </>
              )}
            </>
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
