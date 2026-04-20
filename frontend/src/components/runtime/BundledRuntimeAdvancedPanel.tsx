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
import { useUIStore } from '../../stores/uiStore'
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
  const { t } = useUIStore()
  return (
    <>
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
      >
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showAdvanced ? '{t.bundledRuntime.collapseAdvanced}' : '{t.bundledRuntime.expandAdvanced}'}
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
              {t.bundledRuntime.refreshStatus}
            </button>

            <button
              onClick={onStart}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Play className="h-3.5 w-3.5" />
              {t.bundledRuntime.startRuntime}
            </button>

            <button
              onClick={onStop}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Square className="h-3.5 w-3.5" />
              {t.bundledRuntime.stopRuntime}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={onPickModelPath}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileSearch className="h-3.5 w-3.5" />
              {t.bundledRuntime.selectModel}
            </button>

            <button
              onClick={onPickBinaryPath}
              disabled={statusState === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileSearch className="h-3.5 w-3.5" />
              {t.bundledRuntime.selectBinary}
            </button>
          </div>

          <button
            onClick={onImportBinary}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            {t.bundledRuntime.importBinary}
          </button>

          <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
            <div className="text-xs font-medium text-foreground">{t.bundledRuntime.getBinaryTitle}</div>
            <div className="flex flex-wrap gap-2">
              <a
                href={releasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                {t.bundledRuntime.openOfficialReleases}
              </a>
              <a
                href={serverDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                {t.bundledRuntime.openServerDocs}
              </a>
              <button
                type="button"
                onClick={onLoadOfficialBinaryPresets}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                {t.bundledRuntime.loadOfficialPresets}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.bundledRuntime.binaryHint}
            </p>
            {releaseAssets.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {t.bundledRuntime.currentRelease}: {releaseTag}
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
              placeholder={t.bundledRuntime.binaryUrlPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
            <button
              onClick={onDownloadBinary}
              disabled={statusState === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-3.5 w-3.5" />
              {t.bundledRuntime.downloadBinary}
            </button>
          </div>

          <button
            onClick={onImportModel}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            {t.bundledRuntime.importModel}
          </button>

          <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
            <div className="text-xs font-medium text-foreground">{t.bundledRuntime.getModelTitle}</div>
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
              {t.bundledRuntime.modelHint}
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={modelDownloadUrl}
              onChange={(e) => onModelDownloadUrlChange(e.target.value)}
              placeholder={t.bundledRuntime.modelUrlPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
            <button
              onClick={onDownloadModel}
              disabled={statusState === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-3.5 w-3.5" />
              Download Model
            </button>
          </div>

          <button
            onClick={onOpenModelsPath}
            disabled={statusState === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t.bundledRuntime.openModelsDir}
          </button>
        </div>
      )}
    </>
  )
}
