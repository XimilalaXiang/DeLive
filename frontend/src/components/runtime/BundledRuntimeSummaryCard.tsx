import { Activity, AlertCircle, CheckCircle2, Loader2, Wand2 } from 'lucide-react'

interface RuntimeSnapshotLike {
  status: string
  displayName: string
  binaryPath: string | null
  modelsPath: string
  baseUrl: string
  message?: string
}

interface NextStepInfo {
  title: string
  description: string
}

interface BundledRuntimeSummaryCardProps {
  binaryReady: boolean
  modelReady: boolean
  runtimeRunning: boolean
  nextStep: NextStepInfo
  hasRecommendedBinaryAsset: boolean
  statusState: 'idle' | 'loading' | 'error'
  actionMessage: string
  snapshot: RuntimeSnapshotLike | null
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  testMessage: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  modelFiles: string[]
  configuredModelPath: string
  onSelectModelPath: (path: string) => void
}

function StepBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
        done
          ? 'border-success/30 bg-success/10 text-success dark:text-success'
          : 'border-border bg-background text-muted-foreground'
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </div>
  )
}

function getStatusTone(snapshot: RuntimeSnapshotLike | null, statusState: 'idle' | 'loading' | 'error'): string {
  if (snapshot?.status === 'running') {
    return 'bg-success/10 text-success dark:text-success'
  }
  if (snapshot?.status === 'error' || statusState === 'error') {
    return 'bg-destructive/10 text-destructive dark:text-destructive'
  }
  return 'bg-info/10 text-info dark:text-info'
}

export function BundledRuntimeSummaryCard({
  binaryReady,
  modelReady,
  runtimeRunning,
  nextStep,
  hasRecommendedBinaryAsset,
  statusState,
  actionMessage,
  snapshot,
  testStatus,
  testMessage,
  primaryActionLabel,
  onPrimaryAction,
  modelFiles,
  configuredModelPath,
  onSelectModelPath,
}: BundledRuntimeSummaryCardProps) {
  const statusTone = getStatusTone(snapshot, statusState)

  return (
    <>
      <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
        <div className="flex flex-wrap gap-2">
          <StepBadge done={binaryReady} label="1. Binary" />
          <StepBadge done={modelReady} label="2. 模型" />
          <StepBadge done={runtimeRunning} label="3. Runtime" />
        </div>
        <div className="space-y-1">
          <div className="text-[12px] font-medium text-foreground">{nextStep.title}</div>
          <p className="text-xs text-muted-foreground">{nextStep.description}</p>
        </div>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {primaryActionLabel}
        </button>
        <p className="text-xs text-muted-foreground">
          推荐默认值：官方 CPU 版 binary、Base 模型、端口 8177。
          {!hasRecommendedBinaryAsset ? ' 当前还未拿到推荐 binary 资产，将先尝试加载官方预设。' : ''}
        </p>
      </div>

      <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${statusTone}`}>
        {snapshot?.status === 'running'
          ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          : snapshot?.status === 'error' || statusState === 'error'
          ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          : <Activity className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="break-all">{actionMessage || snapshot?.message || '等待获取 runtime 状态'}</span>
      </div>

      {testMessage && (
        <div
          className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${
            testStatus === 'success'
              ? 'bg-success/10 text-success dark:text-success'
              : testStatus === 'error'
              ? 'bg-destructive/10 text-destructive dark:text-destructive'
              : 'bg-info/10 text-info dark:text-info'
          }`}
        >
          {testStatus === 'success'
            ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            : testStatus === 'error'
            ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            : <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />}
          <span className="break-all">{testMessage}</span>
        </div>
      )}

      {snapshot && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Runtime: {snapshot.displayName}</div>
          <div>状态: {snapshot.status}</div>
          <div>二进制: {snapshot.binaryPath || '未发现'}</div>
          <div>模型目录: {snapshot.modelsPath || '未初始化'}</div>
          <div>服务地址: {snapshot.baseUrl}</div>
          <div>配置模型: {configuredModelPath || '未填写'}</div>
        </div>
      )}

      {modelFiles.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">runtime 目录中的模型（点击回填）</div>
          <div className="flex flex-wrap gap-1.5">
            {modelFiles.map((filePath) => (
              <button
                key={filePath}
                onClick={() => onSelectModelPath(filePath)}
                className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                  configuredModelPath === filePath
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {filePath.split(/[/\\]/).pop() || filePath}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
