import { useEffect, useMemo, useState } from 'react'
import { Activity, FolderOpen, Loader2, Play, RefreshCw, Square, AlertCircle, CheckCircle2, FileSearch, Download } from 'lucide-react'
import type { ProviderConfigData } from '../types'
import type { ASRProviderInfo } from '../types/asr'
import { createBundledRuntimeManager, type BundledRuntimeSnapshot } from '../utils/localRuntimeManager'
import {
  WHISPER_CPP_RELEASES_URL,
  WHISPER_CPP_SERVER_DOCS_URL,
  whisperCppModelPresets,
} from '../utils/whisperCppPresets'
import {
  fetchLatestWhisperCppReleaseInfo,
  type WhisperCppReleaseAsset,
} from '../utils/whisperCppReleaseDiscovery'

type ActionState = 'idle' | 'loading' | 'error'

interface BundledRuntimeSetupGuideProps {
  provider: ASRProviderInfo
  config: ProviderConfigData
  onConfigPatch: (patch: Partial<ProviderConfigData>) => void
}

export function BundledRuntimeSetupGuide({ provider, config, onConfigPatch }: BundledRuntimeSetupGuideProps) {
  const runtimeId = provider.capabilities.local?.runtimeId
  const manager = useMemo(() => (
    runtimeId ? createBundledRuntimeManager(runtimeId) : null
  ), [runtimeId])
  const [snapshot, setSnapshot] = useState<BundledRuntimeSnapshot | null>(null)
  const [statusState, setStatusState] = useState<ActionState>('idle')
  const [actionMessage, setActionMessage] = useState('')
  const [modelFiles, setModelFiles] = useState<string[]>([])
  const [binaryDownloadUrl, setBinaryDownloadUrl] = useState('')
  const [modelDownloadUrl, setModelDownloadUrl] = useState('')
  const [releaseTag, setReleaseTag] = useState('')
  const [releaseAssets, setReleaseAssets] = useState<WhisperCppReleaseAsset[]>([])

  const refreshStatus = async () => {
    if (!manager) {
      setStatusState('error')
      setActionMessage('当前 provider 未声明 runtimeId，无法管理 bundled runtime')
      return
    }

    setStatusState('loading')
    try {
      const nextSnapshot = await manager.getSnapshot(config)
      setSnapshot(nextSnapshot)
      setStatusState('idle')
      setActionMessage(nextSnapshot.message || '')
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '获取 runtime 状态失败')
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [manager, config])

  const refreshModels = async () => {
    if (!manager) return
    try {
      const files = await manager.listModels()
      setModelFiles(files)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '获取模型列表失败')
    }
  }

  useEffect(() => {
    void refreshModels()
  }, [manager])

  const handleStart = async () => {
    if (!manager) return
    setStatusState('loading')
    try {
      const nextSnapshot = await manager.start(config)
      setSnapshot(nextSnapshot)
      setStatusState('idle')
      setActionMessage(nextSnapshot.message || 'runtime 已启动')
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '启动 runtime 失败')
      await refreshStatus()
    }
  }

  const handleStop = async () => {
    if (!manager) return
    setStatusState('loading')
    try {
      const nextSnapshot = await manager.stop(config)
      setSnapshot(nextSnapshot)
      setStatusState('idle')
      setActionMessage(nextSnapshot.message || 'runtime 已停止')
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '停止 runtime 失败')
    }
  }

  const handleOpenModelsPath = async () => {
    if (!manager) return
    setStatusState('loading')
    try {
      await manager.openModelsPath()
      setStatusState('idle')
      setActionMessage(snapshot?.modelsPath || '已打开模型目录')
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '打开模型目录失败')
    }
  }

  const handlePickModelPath = async () => {
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage('当前环境不支持文件选择')
      return
    }

    const filePath = await window.electronAPI.pickFilePath({
      title: '选择 whisper.cpp 模型文件',
      filters: [
        { name: 'Model Files', extensions: ['bin', 'gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (filePath) {
      onConfigPatch({ modelPath: filePath })
      setActionMessage(`已选择模型文件: ${filePath}`)
    }
  }

  const handleImportModel = async () => {
    if (!manager) return
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage('当前环境不支持文件选择')
      return
    }

    const sourcePath = await window.electronAPI.pickFilePath({
      title: '导入模型到 runtime 目录',
      filters: [
        { name: 'Model Files', extensions: ['bin', 'gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (!sourcePath) {
      return
    }

    setStatusState('loading')
    try {
      const importedPath = await manager.importModel(sourcePath)
      onConfigPatch({ modelPath: importedPath })
      await refreshModels()
      setStatusState('idle')
      setActionMessage(`模型已导入: ${importedPath}`)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '导入模型失败')
    }
  }

  const handlePickBinaryPath = async () => {
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage('当前环境不支持文件选择')
      return
    }

    const filePath = await window.electronAPI.pickFilePath({
      title: '选择 whisper-server 可执行文件',
      filters: [
        { name: 'Executable', extensions: ['exe', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (filePath) {
      onConfigPatch({ binaryPath: filePath })
      setActionMessage(`已选择 runtime binary: ${filePath}`)
    }
  }

  const handleImportBinary = async () => {
    if (!manager) return
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage('当前环境不支持文件选择')
      return
    }

    const sourcePath = await window.electronAPI.pickFilePath({
      title: '导入 whisper-server 到应用目录',
      filters: [
        { name: 'Executable', extensions: ['exe', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (!sourcePath) {
      return
    }

    setStatusState('loading')
    try {
      const importedPath = await manager.importBinary(sourcePath)
      onConfigPatch({ binaryPath: importedPath })
      await refreshStatus()
      setStatusState('idle')
      setActionMessage(`runtime binary 已导入: ${importedPath}`)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '导入 runtime binary 失败')
    }
  }

  const handleDownloadBinary = async () => {
    if (!manager) return
    if (!binaryDownloadUrl.trim()) {
      setStatusState('error')
      setActionMessage('请先填写 runtime binary 下载 URL')
      return
    }

    setStatusState('loading')
    try {
      const downloadedPath = await manager.downloadBinary(binaryDownloadUrl.trim())
      onConfigPatch({ binaryPath: downloadedPath })
      await refreshStatus()
      setStatusState('idle')
      setActionMessage(`runtime binary 已下载: ${downloadedPath}`)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '下载 runtime binary 失败')
    }
  }

  const handleDownloadModel = async () => {
    if (!manager) return
    if (!modelDownloadUrl.trim()) {
      setStatusState('error')
      setActionMessage('请先填写模型下载 URL')
      return
    }

    setStatusState('loading')
    try {
      const downloadedPath = await manager.downloadModel(modelDownloadUrl.trim())
      onConfigPatch({ modelPath: downloadedPath })
      await refreshModels()
      setStatusState('idle')
      setActionMessage(`模型已下载: ${downloadedPath}`)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '下载模型失败')
    }
  }

  const handleLoadOfficialBinaryPresets = async () => {
    setStatusState('loading')
    try {
      const releaseInfo = await fetchLatestWhisperCppReleaseInfo(window.electronAPI?.platform)
      setReleaseTag(releaseInfo.tag)
      setReleaseAssets(releaseInfo.assets.slice(0, 8))
      setStatusState('idle')
      setActionMessage(`已加载 whisper.cpp ${releaseInfo.tag} 官方 release 资产`)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : '加载官方 binary 预设失败')
    }
  }

  const statusTone = snapshot?.status === 'running'
    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
    : snapshot?.status === 'error' || statusState === 'error'
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="text-xs font-medium text-foreground">Bundled Runtime 引导</div>
      <p className="text-[11px] text-muted-foreground">
        当前 provider 走随应用打包的本地 runtime 路径。这里负责 runtime 状态、模型目录和后续启动入口。
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => void refreshStatus()}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {statusState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          刷新状态
        </button>

        <button
          onClick={() => void handleStart()}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Play className="h-3.5 w-3.5" />
          启动 runtime
        </button>

        <button
          onClick={() => void handleStop()}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Square className="h-3.5 w-3.5" />
          停止 runtime
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => void handlePickModelPath()}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileSearch className="h-3.5 w-3.5" />
          选择模型文件
        </button>

        <button
          onClick={() => void handlePickBinaryPath()}
          disabled={statusState === 'loading'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileSearch className="h-3.5 w-3.5" />
          选择 runtime binary
        </button>
      </div>

      <button
        onClick={() => void handleImportBinary()}
        disabled={statusState === 'loading'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Download className="h-3.5 w-3.5" />
        导入 runtime binary 到应用目录
      </button>

      <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
        <div className="text-[11px] font-medium text-foreground">官方入口</div>
        <div className="flex flex-wrap gap-2">
          <a
            href={WHISPER_CPP_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-[11px] font-medium hover:bg-accent"
          >
            打开官方 Releases
          </a>
          <a
            href={WHISPER_CPP_SERVER_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-[11px] font-medium hover:bg-accent"
          >
            打开 Server 文档
          </a>
          <button
            type="button"
            onClick={() => void handleLoadOfficialBinaryPresets()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-[11px] font-medium hover:bg-accent"
          >
            加载官方 Binary 预设
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Binary 建议从官方 Releases 获取；模型可直接使用下面的官方预设。
        </p>
        {releaseAssets.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground">
              当前 release: {releaseTag}
            </div>
            <div className="flex flex-wrap gap-2">
              {releaseAssets.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  onClick={() => setBinaryDownloadUrl(asset.url)}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-[10px] font-medium hover:bg-accent"
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
          onChange={(e) => setBinaryDownloadUrl(e.target.value)}
          placeholder="粘贴 runtime binary 下载 URL"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
        />
        <button
          onClick={() => void handleDownloadBinary()}
          disabled={statusState === 'loading'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-3.5 w-3.5" />
          下载 runtime binary 到应用目录
        </button>
      </div>

      <button
        onClick={() => void handleImportModel()}
        disabled={statusState === 'loading'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Download className="h-3.5 w-3.5" />
        导入模型到 runtime 目录
      </button>

      <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
        <div className="text-[11px] font-medium text-foreground">官方模型预设</div>
        <div className="flex flex-wrap gap-2">
          {whisperCppModelPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setModelDownloadUrl(preset.url)}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-[11px] font-medium hover:bg-accent"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          先点一个预设填入 URL，再点击“下载模型到 runtime 目录”。
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={modelDownloadUrl}
          onChange={(e) => setModelDownloadUrl(e.target.value)}
          placeholder="粘贴模型下载 URL"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
        />
        <button
          onClick={() => void handleDownloadModel()}
          disabled={statusState === 'loading'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Download className="h-3.5 w-3.5" />
          下载模型到 runtime 目录
        </button>
      </div>

      <button
        onClick={() => void handleOpenModelsPath()}
        disabled={statusState === 'loading'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        打开模型目录
      </button>

      <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] ${statusTone}`}>
        {snapshot?.status === 'running'
          ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          : snapshot?.status === 'error' || statusState === 'error'
          ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          : <Activity className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="break-all">{actionMessage || snapshot?.message || '等待获取 runtime 状态'}</span>
      </div>

      {snapshot && (
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>Runtime: {snapshot.displayName}</div>
          <div>状态: {snapshot.status}</div>
          <div>二进制: {snapshot.binaryPath || '未发现'}</div>
          <div>模型目录: {snapshot.modelsPath || '未初始化'}</div>
          <div>服务地址: {snapshot.baseUrl}</div>
          <div>配置模型: {typeof config.modelPath === 'string' && config.modelPath.trim() ? config.modelPath : '未填写'}</div>
        </div>
      )}

      {modelFiles.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">runtime 目录中的模型（点击回填）</div>
          <div className="flex flex-wrap gap-1.5">
            {modelFiles.map((filePath) => (
              <button
                key={filePath}
                onClick={() => onConfigPatch({ modelPath: filePath })}
                className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${
                  config.modelPath === filePath
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
    </div>
  )
}
