import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSearch,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react'
import type { WhisperCppReleaseAsset } from '../../utils/whisperCppReleaseDiscovery'
import type { WhisperCppModelPreset } from '../../utils/whisperCppPresets'

interface BundledRuntimeAdvancedPanelProps {
  showAdvanced: boolean
  onToggleAdvanced: () => void
  statusState: 'idle' | 'loading' | 'error'
  onRefreshStatus: () => void
  onStart: () => void
  onStop: () => void
  onPickModelPath: () => void
  onPickBinaryPath: () => void
  onImportBinary: () => void
  releaseAssets: WhisperCppReleaseAsset[]
  releaseTag: string
  releasesUrl: string
  serverDocsUrl: string
  onLoadOfficialBinaryPresets: () => void
  binaryDownloadUrl: string
  onBinaryDownloadUrlChange: (value: string) => void
  onDownloadBinary: () => void
  onImportModel: () => void
  modelPresets: WhisperCppModelPreset[]
  modelDownloadUrl: string
  onModelDownloadUrlChange: (value: string) => void
  onDownloadModel: () => void
  onOpenModelsPath: () => void
}

export function BundledRuntimeAdvancedPanel({
  showAdvanced,
  onToggleAdvanced,
  statusState,
  onRefreshStatus,
  onStart,
  onStop,
  onPickModelPath,
  onPickBinaryPath,
  onImportBinary,
  releaseAssets,
  releaseTag,
  releasesUrl,
  serverDocsUrl,
  onLoadOfficialBinaryPresets,
  binaryDownloadUrl,
  onBinaryDownloadUrlChange,
  onDownloadBinary,
  onImportModel,
  modelPresets,
  modelDownloadUrl,
  onModelDownloadUrlChange,
  onDownloadModel,
  onOpenModelsPath,
}: BundledRuntimeAdvancedPanelProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
      >
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showAdvanced ? '收起高级操作' : '展开高级操作'}
      </button>

      {showAdvanced && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={onRefreshStatus}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              {statusState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              刷新状态
            </button>

            <button
              onClick={onStart}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Play className="h-3.5 w-3.5" />
              启动 runtime
            </button>

            <button
              onClick={onStop}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Square className="h-3.5 w-3.5" />
              停止 runtime
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={onPickModelPath}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileSearch className="h-3.5 w-3.5" />
              选择模型文件
            </button>

            <button
              onClick={onPickBinaryPath}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileSearch className="h-3.5 w-3.5" />
              选择 runtime binary
            </button>
          </div>

          <button
            onClick={onImportBinary}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            导入 runtime binary 到应用目录
          </button>

          <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
            <div className="text-xs font-medium text-foreground">第 1 步：获取 runtime binary</div>
            <div className="flex flex-wrap gap-2">
              <a
                href={releasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                打开官方 Releases
              </a>
              <a
                href={serverDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                打开 Server 文档
              </a>
              <button
                type="button"
                onClick={onLoadOfficialBinaryPresets}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                加载官方 Binary 预设
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Binary 建议从官方 Releases 获取；模型可直接使用下面的官方预设。
            </p>
            {releaseAssets.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  当前 release: {releaseTag}
                </div>
                <div className="flex flex-wrap gap-2">
                  {releaseAssets.map((asset) => (
                    <button
                      key={asset.url}
                      type="button"
                      onClick={() => onBinaryDownloadUrlChange(asset.url)}
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
                      title={asset.url}
                    >
                      {asset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={binaryDownloadUrl}
              onChange={(e) => onBinaryDownloadUrlChange(e.target.value)}
              placeholder="粘贴 runtime binary 下载 URL"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
            <button
              onClick={onDownloadBinary}
              disabled={statusState === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-3.5 w-3.5" />
              下载 runtime binary 到应用目录
            </button>
          </div>

          <button
            onClick={onImportModel}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            导入模型到 runtime 目录
          </button>

          <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
            <div className="text-xs font-medium text-foreground">第 2 步：获取模型文件</div>
            <div className="flex flex-wrap gap-2">
              {modelPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onModelDownloadUrlChange(preset.url)}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              先点一个预设填入 URL，再点击“下载模型到 runtime 目录”。
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={modelDownloadUrl}
              onChange={(e) => onModelDownloadUrlChange(e.target.value)}
              placeholder="粘贴模型下载 URL"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
            <button
              onClick={onDownloadModel}
              disabled={statusState === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-3.5 w-3.5" />
              下载模型到 runtime 目录
            </button>
          </div>

          <button
            onClick={onOpenModelsPath}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            打开模型目录
          </button>
        </div>
      )}
    </>
  )
}
