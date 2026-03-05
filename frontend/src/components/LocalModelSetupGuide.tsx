import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, DownloadCloud, AlertCircle, Search, Server } from 'lucide-react'
import {
  type LocalServiceKind,
  isModelInstalled,
  probeLocalService,
  pullOllamaModel,
} from '../utils/localModelSetup'

type DetectStatus = 'idle' | 'checking' | 'ready' | 'error'
type ModelStatus = 'idle' | 'checking' | 'installed' | 'missing' | 'error'
type PullStatus = 'idle' | 'pulling' | 'success' | 'error'

interface LocalModelSetupGuideProps {
  baseUrl: string
  model: string
  apiKey?: string
  onModelChange: (value: string) => void
}

function formatPullProgress(completed?: number, total?: number): string {
  if (!completed || !total || total <= 0) return ''
  const percent = Math.min(100, Math.round((completed / total) * 100))
  return `${percent}%`
}

export function LocalModelSetupGuide({
  baseUrl,
  model,
  apiKey,
  onModelChange,
}: LocalModelSetupGuideProps) {
  const [detectStatus, setDetectStatus] = useState<DetectStatus>('idle')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [pullStatus, setPullStatus] = useState<PullStatus>('idle')
  const [serviceKind, setServiceKind] = useState<LocalServiceKind | null>(null)
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [pullMessage, setPullMessage] = useState('')
  const [pullPercent, setPullPercent] = useState<string>('')

  const modelName = model.trim()
  const canPullWithOneClick = serviceKind === 'ollama'

  const modelCheckResult = useMemo(() => {
    if (!modelName) return 'empty'
    return isModelInstalled(installedModels, modelName) ? 'installed' : 'missing'
  }, [installedModels, modelName])

  const syncModelStatus = (models: string[]) => {
    if (!modelName) {
      setModelStatus('idle')
      return
    }
    setModelStatus(isModelInstalled(models, modelName) ? 'installed' : 'missing')
  }

  const handleDetect = async () => {
    setDetectStatus('checking')
    setModelStatus('checking')
    setPullStatus('idle')
    setPullMessage('')
    setPullPercent('')
    setMessage('')

    try {
      const result = await probeLocalService(baseUrl, apiKey)
      setServiceKind(result.kind)
      setInstalledModels(result.installedModels)
      setDetectStatus('ready')

      if (!modelName && result.installedModels.length > 0) {
        onModelChange(result.installedModels[0])
      }

      syncModelStatus(result.installedModels)
      setMessage(
        result.kind === 'ollama'
          ? `已检测到 Ollama，发现 ${result.installedModels.length} 个模型`
          : `已检测到 OpenAI-compatible 服务，发现 ${result.installedModels.length} 个模型`
      )
    } catch (error) {
      setDetectStatus('error')
      setModelStatus('error')
      setServiceKind(null)
      setInstalledModels([])
      setMessage(error instanceof Error ? error.message : '检测失败')
    }
  }

  const handleCheckModel = () => {
    if (detectStatus !== 'ready') {
      void handleDetect()
      return
    }
    setModelStatus('checking')
    syncModelStatus(installedModels)
  }

  const handlePullModel = async () => {
    if (!canPullWithOneClick) {
      setPullStatus('error')
      setPullMessage('当前服务暂不支持一键拉取，请在服务侧先下载模型')
      return
    }
    if (!modelName) {
      setPullStatus('error')
      setPullMessage('请先填写模型名称')
      return
    }

    setPullStatus('pulling')
    setPullMessage('开始拉取模型...')
    setPullPercent('')

    try {
      await pullOllamaModel(baseUrl, modelName, (progress) => {
        const percent = formatPullProgress(progress.completed, progress.total)
        setPullPercent(percent)
        setPullMessage(progress.status || '正在拉取模型...')
      })
      setPullStatus('success')
      setPullMessage('模型拉取完成，正在刷新模型列表...')
      await handleDetect()
    } catch (error) {
      setPullStatus('error')
      setPullMessage(error instanceof Error ? error.message : '模型拉取失败')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="text-xs font-medium text-foreground">本地模型引导</div>
      <p className="text-[11px] text-muted-foreground">
        按顺序执行：检测服务、检测模型；若是 Ollama 可直接一键拉取并回填模型。
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={handleDetect}
          disabled={detectStatus === 'checking'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {detectStatus === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
          检测服务
        </button>

        <button
          onClick={handleCheckModel}
          disabled={detectStatus === 'checking' || modelStatus === 'checking'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {modelStatus === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          检测模型
        </button>
      </div>

      {detectStatus !== 'idle' && (
        <div
          className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] ${
            detectStatus === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-green-500/10 text-green-700 dark:text-green-400'
          }`}
        >
          {detectStatus === 'error' ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="break-all">{message || '检测完成'}</span>
        </div>
      )}

      {installedModels.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">已发现模型（点击可回填）</div>
          <div className="flex flex-wrap gap-1.5">
            {installedModels.slice(0, 8).map((item) => (
              <button
                key={item}
                onClick={() => onModelChange(item)}
                className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${
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
          className={`rounded-md px-2.5 py-2 text-[11px] ${
            modelCheckResult === 'installed'
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}
        >
          {modelCheckResult === 'installed'
            ? `模型已就绪：${modelName}`
            : `未找到模型：${modelName}`}
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
            {canPullWithOneClick ? '一键拉取模型（Ollama）' : '当前服务不支持一键拉取'}
          </button>

          {(pullMessage || pullPercent) && (
            <div
              className={`rounded-md px-2.5 py-2 text-[11px] ${
                pullStatus === 'error'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
              }`}
            >
              <span>{pullMessage || '处理中...'}</span>
              {pullPercent && <span className="ml-2 font-medium">{pullPercent}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
