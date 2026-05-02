import { useCallback, useMemo, useState, useEffect } from 'react'
import { FileAudio, ChevronDown, Check, Cloud, HardDrive, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { FileDropZone } from './FileDropZone'
import { FileTranscriptionProgress } from './FileTranscriptionProgress'
import { useFileTranscription } from '../hooks/useFileTranscription'
import { useFileTranscriptionStore } from '../stores/fileTranscriptionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useUIStore } from '../stores/uiStore'
import { supportsProviderWorkload, type ASRProviderInfo } from '../types/asr/common'
import { buildProviderConnectConfig, isProviderConfigured } from '../utils/providerConfig'
import { getProviderName, getProviderDescription } from '../utils/providerI18n'
import { getProviderLogo } from './icons/ProviderLogos'
import type { FileTranscriptionConfig } from '../types/fileTranscription'

export function FileTranscriptionView() {
  const { jobs, submitFile, cancelJob, openResult } = useFileTranscription()
  const removeJob = useFileTranscriptionStore((s) => s.removeJob)
  const { t } = useUIStore()
  const { settings, availableProviders } = useSettingsStore()

  const fileProviders = useMemo(
    () => availableProviders.filter((p) => supportsProviderWorkload(p.capabilities, 'file-transcription')),
    [availableProviders],
  )

  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => {
    if (fileProviders.length > 0) return fileProviders[0].id
    return 'soniox'
  })
  const [isOpen, setIsOpen] = useState(false)

  const selectedProvider = fileProviders.find((p) => p.id === selectedProviderId) ?? fileProviders[0]
  const providerConfig = useSettingsStore((s) => s.getProviderConfig(selectedProviderId))
  const hasApiKey = selectedProviderId === 'cloudflare'
    ? Boolean(providerConfig?.apiToken && providerConfig?.accountId)
    : Boolean(providerConfig?.apiKey)

  const activeJobs = useFileTranscriptionStore((s) => s.getActiveJobs())
  const isProcessing = activeJobs.length > 0

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSelect = (vendorId: string) => {
    setSelectedProviderId(vendorId)
    setIsOpen(false)
  }

  const handleFilesSelected = useCallback((files: File[]) => {
    const rawHints = providerConfig?.languageHints
    let languageHints: string[] | undefined
    if (Array.isArray(rawHints)) {
      languageHints = rawHints.filter(Boolean)
    } else if (typeof rawHints === 'string' && rawHints.trim()) {
      languageHints = rawHints.split(',').map(s => s.trim()).filter(Boolean)
    }

    const config: FileTranscriptionConfig = {
      provider: selectedProviderId as FileTranscriptionConfig['provider'],
      languageHints: languageHints?.length ? languageHints : undefined,
      enableSpeakerDiarization: Boolean(providerConfig?.enableSpeakerDiarization),
      translationEnabled: Boolean(providerConfig?.translationEnabled),
      translationTargetLanguage: (providerConfig?.translationTargetLanguage as string) || 'en',
    }

    for (const file of files) {
      submitFile(file, config).catch((err) => {
        console.error('[FileTranscription] Submit failed:', err)
      })
    }
  }, [submitFile, providerConfig, selectedProviderId])

  const getExecutionModeBadge = (provider: ASRProviderInfo): { label: string; className: string } | null => {
    const workloads = provider.capabilities.workloads
    const ft = workloads?.fileTranscription
    if (!ft || ft.availability === 'unsupported') return null
    switch (ft.executionMode) {
      case 'native-job':
        return { label: '异步', className: 'bg-info/20 text-info' }
      case 'single-request':
        return { label: '同步', className: 'bg-success/20 text-success' }
      case 'local-runtime':
        return { label: '本地', className: 'bg-warning/20 text-warning' }
      default:
        return null
    }
  }

  const renderProviderItem = (provider: ASRProviderInfo) => {
    const isSelected = provider.id === selectedProviderId
    const config = buildProviderConnectConfig(provider, settings.providerConfigs?.[provider.id], settings)
    const hasConfig = isProviderConfigured(provider, config)
    const badge = getExecutionModeBadge(provider)

    return (
      <button
        key={provider.id}
        onClick={() => handleSelect(provider.id)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all
          ${isSelected
            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'hover:bg-muted/80 text-foreground'
          }
        `}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50">
          {getProviderLogo(provider.id, 24) || (
            provider.type === 'cloud'
              ? <Cloud className="w-5 h-5 text-info" />
              : <HardDrive className="w-5 h-5 text-success" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{getProviderName(provider, t)}</span>
            {badge && (
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {getProviderDescription(provider, t)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasConfig && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning/20 text-warning">
              {t.provider?.needConfig || '需配置'}
            </span>
          )}
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
      </button>
    )
  }

  const cloudProviders = fileProviders.filter((p) => p.type === 'cloud')
  const localProviders = fileProviders.filter((p) => p.type === 'local')

  const renderModal = () => {
    if (!isOpen) return null
    return createPortal(
      <div className="fixed inset-0 z-[100]">
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-provider-selector-title"
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden dark:ring-1 dark:ring-white/[0.08]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div>
                <h3 id="file-provider-selector-title" className="text-base font-semibold">
                  选择文件转录服务
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  选择适合您需求的语音转录引擎
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                aria-label={t.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {cloudProviders.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Cloud className="w-4 h-4 text-info" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t.provider?.cloudProviders || '云端服务'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cloudProviders.map(renderProviderItem)}
                  </div>
                </div>
              )}

              {localProviders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-border mt-2 pt-3">
                    <HardDrive className="w-4 h-4 text-success" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t.provider?.localProviders || '本地模型'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {localProviders.map(renderProviderItem)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileAudio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">文件转录</h1>
            <p className="text-sm text-muted-foreground">
              上传音频/视频文件，使用 AI 引擎转录为文本
            </p>
          </div>
        </div>

        {/* Provider Selector Button */}
        <button
          onClick={() => setIsOpen(true)}
          disabled={isProcessing}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
            border-input hover:border-primary/50 hover:bg-muted/50
            bg-background text-foreground
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50">
            {selectedProvider && getProviderLogo(selectedProvider.id, 24) || (
              selectedProvider?.type === 'cloud'
                ? <Cloud className="w-5 h-5 text-info" />
                : <HardDrive className="w-5 h-5 text-success" />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm">
              {selectedProvider ? getProviderName(selectedProvider, t) : 'Soniox'}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedProvider ? getProviderDescription(selectedProvider, t) : '点击选择服务'}
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              请先在设置 → Provider → {selectedProvider ? getProviderName(selectedProvider, t) : selectedProviderId} 中配置 API Key
            </p>
          </div>
        )}

        {/* Cloudflare file-size warning */}
        {selectedProviderId === 'cloudflare' && hasApiKey && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Cloudflare Workers AI 限制文件大小约 2 MB。较大的文件请选择 Groq、Gladia 或 ElevenLabs。
            </p>
          </div>
        )}

        {/* Drop Zone */}
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={!hasApiKey || isProcessing}
        />

        {/* Job Progress */}
        <FileTranscriptionProgress
          jobs={jobs}
          onCancel={cancelJob}
          onOpenResult={openResult}
          onRemove={removeJob}
        />

        {/* Help */}
        {jobs.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              转录完成后，会自动创建一个 Session，你可以在 Review Desk 中查看、
              <br />
              进行 AI 摘要、对话、思维导图等后处理操作。
            </p>
          </div>
        )}
      </div>

      {/* Provider Selection Modal */}
      {renderModal()}
    </div>
  )
}
