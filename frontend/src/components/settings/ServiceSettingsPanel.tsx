import type { ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  Cpu,
  Eye,
  EyeOff,
  Key,
  Loader2,
  PlayCircle,
} from 'lucide-react'
import { BundledRuntimeSetupGuide } from '../BundledRuntimeSetupGuide'
import { LocalModelSetupGuide } from '../LocalModelSetupGuide'
import { ProviderSelector } from '../ProviderSelector'
import type { Translations } from '../../i18n'
import type { ASRProviderInfo, ProviderConfigData } from '../../types'
import type { ProviderConfigField } from '../../types/asr'

interface ServiceSettingsPanelProps {
  t: Translations
  currentProvider?: ASRProviderInfo
  languageHints: string
  onLanguageHintsChange: (value: string) => void
  getProviderConsoleUrl: (provider: ASRProviderInfo | undefined) => string
  updateFormField: (fieldKey: string, value: string | boolean) => void
  getStringFieldValue: (fieldKey: string) => string
  getBooleanFieldValue: (fieldKey: string) => boolean
  revealedFields: Record<string, boolean>
  toggleFieldVisibility: (fieldKey: string) => void
  buildEditableProviderConfig: () => ProviderConfigData
  onRunConfigTest: () => Promise<void>
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  testMessage: string
  onBundledRuntimePatch: (patch: Partial<ProviderConfigData>) => void
}

function getFieldIcon(field: ProviderConfigField): ReactNode {
  if (field.key.toLowerCase().includes('model')) {
    return <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
  }
  return <Key className="w-3.5 h-3.5 text-muted-foreground" />
}

function isMonospaceField(field: ProviderConfigField): boolean {
  const key = field.key.toLowerCase()
  return field.type === 'password' || key.includes('key') || key.includes('url') || key.includes('model')
}

export function ServiceSettingsPanel({
  t,
  currentProvider,
  languageHints,
  onLanguageHintsChange,
  getProviderConsoleUrl,
  updateFormField,
  getStringFieldValue,
  getBooleanFieldValue,
  revealedFields,
  toggleFieldVisibility,
  buildEditableProviderConfig,
  onRunConfigTest,
  testStatus,
  testMessage,
  onBundledRuntimePatch,
}: ServiceSettingsPanelProps) {
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

  const renderTestButton = () => {
    if (!currentProvider?.capabilities.supportsConfigTest) {
      return null
    }

    return (
      <div className="space-y-3">
        <button
          onClick={() => void onRunConfigTest()}
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-6">
        <section className="workspace-panel-muted p-4">
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
        </section>

        {providerFields.length > 0 && (
          <section className="workspace-panel-muted p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {providerFields.map(renderProviderField)}
            </div>
          </section>
        )}

        {renderTestButton() && (
          <section className="workspace-panel-muted p-4">
            {renderTestButton()}
          </section>
        )}
      </div>

      <div className="space-y-6">
        {shouldShowLocalSetupGuide && currentProvider && (
          <section className="workspace-panel-muted p-4">
            <LocalModelSetupGuide
              provider={currentProvider}
              config={buildEditableProviderConfig()}
              onModelChange={(value) => updateFormField('model', value)}
            />
          </section>
        )}

        {shouldShowBundledRuntimeGuide && currentProvider && (
          <section className="workspace-panel-muted p-4">
            <BundledRuntimeSetupGuide
              provider={currentProvider}
              config={buildEditableProviderConfig()}
              onRunConfigTest={onRunConfigTest}
              testStatus={testStatus}
              testMessage={testMessage}
              onConfigPatch={onBundledRuntimePatch}
            />
          </section>
        )}

        <section className="workspace-panel-muted p-4">
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t.settings.languageHints}
            </label>
            <input
              type="text"
              value={languageHints}
              onChange={(e) => onLanguageHintsChange(e.target.value)}
              placeholder={t.settings.languageHintsPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground">
              {t.settings.languageHintsDesc}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
