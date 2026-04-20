import { useMemo, useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import { CheckCircle2, Loader2, DownloadCloud, AlertCircle, Search, Server } from 'lucide-react'
import type { ProviderConfigData } from '../types'
import type { ASRProviderInfo } from '../types/asr'
import {
  getLocalRuntimeManager,
  getLocalServiceKindLabel,
} from '../utils/localRuntimeManager'

type DetectStatus = 'idle' | 'checking' | 'ready' | 'error'
type ModelStatus = 'idle' | 'checking' | 'installed' | 'missing' | 'error'
type PullStatus = 'idle' | 'pulling' | 'success' | 'error'

interface LocalModelSetupGuideProps {
  provider: ASRProviderInfo
  config: ProviderConfigData
  onModelChange: (value: string) => void
}

function formatPullProgress(completed?: number, total?: number): string {
  if (!completed || !total || total <= 0) return ''
  const percent = Math.min(100, Math.round((completed / total) * 100))
  return `${percent}%`
}

export function LocalModelSetupGuide({
  provider,
  config,
  onModelChange,
}: LocalModelSetupGuideProps) {
  const { t } = useUIStore()
  const [detectStatus, setDetectStatus] = useState<DetectStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [pullStatus, setPullStatus] = useState<PullStatus>('idle')
  const [serviceKindLabel, setServiceKindLabel] = useState<string | null>(null)
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [pullMessage, setPullMessage] = useState('')
  const [pullPercent, setPullPercent] = useState<string>('')

  const manager = getLocalRuntimeManager(provider.id)
  const serviceManager = manager?.kind === 'service' ? manager : undefined
  const modelName = typeof config.model === 'string' ? config.model.trim() : ''
  const canPullWithOneClick = Boolean(serviceManager?.installModel && serviceKindLabel === 'Ollama')

  const modelCheckResult = useMemo(() => {
    if (!modelName) return 'empty'
    return installedModels.some((item) => item === modelName || item.startsWith(`${modelName}:`))
      ? 'installed'
      : 'missing'
  }, [installedModels, modelName])

  const handleDetect = async () => {
    if (!serviceManager) {
      setDetectStatus('error')
      setModelStatus('error')
      setMessage(t.localModel.providerNoRuntime)
      return
    }

    setDetectStatus('checking')
    setModelStatus('checking')
    setPullStatus('idle')
    setPullMessage('')
    setPullPercent('')
    setMessage('')

    try {
      const result = await serviceManager.probe(config)
      const nextInstalledModels = result.installedModels
      setServiceKindLabel(getLocalServiceKindLabel(result.kind))
      setInstalledModels(nextInstalledModels)
      setDetectStatus('ready')

      if (!modelName && nextInstalledModels.length > 0) {
        onModelChange(nextInstalledModels[0])
      }

      if (!modelName) {
        setModelStatus('idle')
      } else {
        setModelStatus(
          nextInstalledModels.some((item) => item === modelName || item.startsWith(`${modelName}:`))
            ? 'installed'
            : 'missing'
        )
      }

      setMessage(t.localModel.detected(getLocalServiceKindLabel(result.kind), nextInstalledModels.length))
    } catch (error) {
      setDetectStatus('error')
      setModelStatus('error')
      setServiceKindLabel(null)
      setInstalledModels([])
      setMessage(error instanceof Error ? error.message : t.localModel.detectFailed)
    }
  }

  const handleCheckModel = async () => {
    if (!serviceManager) {
      setModelStatus('error')
      setMessage('当前提供商尚未接入本地运行时管理器')
      return
    }

    setModelStatus('checking')

    try {
      const result = await serviceManager.checkModel(config)
      setInstalledModels(result.installedModels)
      if (!modelName) {
        setModelStatus('idle')
      } else {
        setModelStatus(result.installed ? 'installed' : 'missing')
      }
    } catch (error) {
      setModelStatus('error')
      setMessage(error instanceof Error ? error.message : t.localModel.modelDetectFailed)
    }
  }

  const handlePullModel = async () => {
    if (!serviceManager?.installModel) {
      setPullStatus('error')
      setPullMessage(t.localModel.pullNotSupported)
      return
    }
    if (!modelName) {
      setPullStatus('error')
      setPullMessage(t.localModel.fillModelNameFirst)
      return
    }

    setPullStatus('pulling')
    setPullMessage(t.localModel.pullStarted)
    setPullPercent('')

    try {
      await serviceManager.installModel(config, (progress) => {
        const percent = formatPullProgress(progress.completed, progress.total)
        setPullPercent(percent)
        setPullMessage(progress.status || t.localModel.pulling)
      })
      setPullStatus('success')
      setPullMessage(t.localModel.pullComplete)
      await handleDetect()
    } catch (error) {
      setPullStatus('error')
      setPullMessage(error instanceof Error ? error.message : t.localModel.pullFailed)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="text-xs font-medium text-foreground">{t.localModel.guideTitle}</div>
      <p className="text-xs text-muted-foreground">
        {t.localModel.guideDesc}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={handleDetect}
          disabled={detectStatus === 'checking'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {detectStatus === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
          {t.localModel.detectService}
        </button>

        <button
          onClick={handleCheckModel}
          disabled={detectStatus === 'checking' || modelStatus === 'checking'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {modelStatus === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t.localModel.detectModel}
        </button>
      </div>

      {detectStatus !== 'idle' && (
        <div
          className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${
            detectStatus === 'error'
              ? 'bg-destructive/10 text-destructive dark:text-destructive'
              : 'bg-success/10 text-success dark:text-success'
          }`}
        >
          {detectStatus === 'error' ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="break-all">{message || t.localModel.detectDone}</span>
        </div>
      )}

      {installedModels.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">{t.localModel.discoveredModels}</div>
          <div className="flex flex-wrap gap-1.5">
            {installedModels.slice(0, 8).map((item) => (
              <button
                key={item}
                onClick={() => onModelChange(item)}
                className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                  item === modelName
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {modelName && modelStatus !== 'idle' && modelStatus !== 'checking' && (
        <div
          className={`rounded-md px-2.5 py-2 text-xs ${
            modelCheckResult === 'installed'
              ? 'bg-success/10 text-success dark:text-success'
              : 'bg-warning/10 text-warning dark:text-warning'
          }`}
        >
          {modelCheckResult === 'installed'
            ? t.localModel.modelReady(modelName)
            : t.localModel.modelNotFound(modelName)}
        </div>
      )}

      {modelCheckResult === 'missing' && (
        <div className="space-y-2">
          <button
            onClick={handlePullModel}
            disabled={pullStatus === 'pulling'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pullStatus === 'pulling' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
            {canPullWithOneClick ? t.localModel.oneClickPull : '当前服务不支持一键拉取'}
          </button>

          {(pullMessage || pullPercent) && (
            <div
              className={`rounded-md px-2.5 py-2 text-xs ${
                pullStatus === 'error'
                  ? 'bg-destructive/10 text-destructive dark:text-destructive'
                  : 'bg-info/10 text-info dark:text-info'
              }`}
            >
              <span>{pullMessage || t.localModel.processing}</span>
              {pullPercent && <span className="ml-2 font-medium">{pullPercent}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
