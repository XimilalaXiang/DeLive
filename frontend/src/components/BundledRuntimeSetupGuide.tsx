import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import { BundledRuntimeAdvancedPanel } from './runtime/BundledRuntimeAdvancedPanel'
import { BundledRuntimeSummaryCard } from './runtime/BundledRuntimeSummaryCard'
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
  onRunConfigTest: () => Promise<void> | void
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  testMessage: string
  onConfigPatch: (patch: Partial<ProviderConfigData>) => void
}

function normalizeModelPathCandidate(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const fileName = parts.pop() || ''
  const cleanedFileName = fileName.replace(/ \(\d+\)(\.[^.]+)$/u, '$1')
  return [...parts, cleanedFileName].join('/').toLowerCase()
}

export function BundledRuntimeSetupGuide({
  provider,
  config,
  onRunConfigTest,
  testStatus,
  testMessage,
  onConfigPatch,
}: BundledRuntimeSetupGuideProps) {
  const { t } = useUIStore()
  const runtimeId = provider.capabilities.local?.runtimeId
  const manager = useMemo(() => (
    runtimeId ? createBundledRuntimeManager(runtimeId) : null
  ), [runtimeId])
  const [snapshot, setSnapshot] = useState<BundledRuntimeSnapshot | null>(null)
  const [statusState, setStatusState] = useState<ActionState>('idle')
  const [actionMessage, setActionMessage] = useState('')
  const [modelFiles, setModelFiles] = useState<string[]>([])
  const [modelPathExists, setModelPathExists] = useState(false)
  const [binaryDownloadUrl, setBinaryDownloadUrl] = useState('')
  const [modelDownloadUrl, setModelDownloadUrl] = useState('')
  const [releaseTag, setReleaseTag] = useState('')
  const [releaseAssets, setReleaseAssets] = useState<WhisperCppReleaseAsset[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [releaseLoadedOnce, setReleaseLoadedOnce] = useState(false)
  const currentModelPath = typeof config.modelPath === 'string' ? config.modelPath.trim() : ''
  const currentBinaryPath = typeof config.binaryPath === 'string' ? config.binaryPath.trim() : ''
  const binaryReady = Boolean(snapshot?.binaryPath || currentBinaryPath)
  const modelReady = Boolean(currentModelPath) && modelPathExists
  const runtimeRunning = snapshot?.status === 'running'
  const recommendedModelPreset = whisperCppModelPresets[0]
  const recommendedBinaryAsset = releaseAssets[0]
  const nextStep = !binaryReady
    ? {
        title: t.bundledRuntime.step1Title,
        description: t.bundledRuntime.step1Desc,
      }
    : !modelReady
    ? {
        title: t.bundledRuntime.step2Title,
        description: t.bundledRuntime.step2Desc,
      }
    : !runtimeRunning
    ? {
        title: t.bundledRuntime.step3Title,
        description: t.bundledRuntime.step3Desc,
      }
    : {
        title: t.bundledRuntime.doneTitle,
        description: t.bundledRuntime.doneDesc,
      }

  const refreshStatus = useCallback(async () => {
    if (!manager) {
      setStatusState('error')
      setActionMessage(t.bundledRuntime.noRuntimeId)
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
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.getStatusFailed)
    }
  }, [config, manager])

  const handleLoadOfficialBinaryPresets = useCallback(async () => {
    setStatusState('loading')
    try {
      const releaseInfo = await fetchLatestWhisperCppReleaseInfo(window.electronAPI?.platform)
      const nextAssets = releaseInfo.assets.slice(0, 8)
      setReleaseTag(releaseInfo.tag)
      setReleaseAssets(nextAssets)
      if (!binaryDownloadUrl.trim() && nextAssets[0]?.url) {
        setBinaryDownloadUrl(nextAssets[0].url)
      }
      setStatusState('idle')
      setActionMessage(t.bundledRuntime.loadedRelease(releaseInfo.tag))
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.loadBinaryPresetFailed)
    }
  }, [binaryDownloadUrl])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const refreshModels = useCallback(async () => {
    if (!manager) return
    try {
      const files = await manager.listModels()
      setModelFiles(files)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.getModelListFailed)
    }
  }, [manager])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  useEffect(() => {
    let cancelled = false

    const checkModelPath = async () => {
      if (!currentModelPath || !window.electronAPI?.pathExists) {
        if (!cancelled) {
          setModelPathExists(false)
        }
        return
      }

      try {
        const exists = await window.electronAPI.pathExists(currentModelPath)
        if (!cancelled) {
          setModelPathExists(exists)
        }
      } catch {
        if (!cancelled) {
          setModelPathExists(false)
        }
      }
    }

    void checkModelPath()
    return () => {
      cancelled = true
    }
  }, [currentModelPath])

  useEffect(() => {
    if (!currentModelPath || modelPathExists || modelFiles.length === 0) {
      return
    }

    const normalizedCurrent = normalizeModelPathCandidate(currentModelPath)
    const matchedPath = modelFiles.find((filePath) => (
      normalizeModelPathCandidate(filePath) === normalizedCurrent
    ))

    if (matchedPath && matchedPath !== currentModelPath) {
      onConfigPatch({ modelPath: matchedPath })
      setActionMessage(t.bundledRuntime.autoFixModelPath(matchedPath))
    }
  }, [currentModelPath, modelFiles, modelPathExists, onConfigPatch])

  useEffect(() => {
    if (!modelDownloadUrl) {
      setModelDownloadUrl(recommendedModelPreset.url)
    }
  }, [modelDownloadUrl, recommendedModelPreset.url])

  useEffect(() => {
    if (releaseLoadedOnce) return
    setReleaseLoadedOnce(true)
    void handleLoadOfficialBinaryPresets()
  }, [handleLoadOfficialBinaryPresets, releaseLoadedOnce])

  const handlePrepareRecommendedFlow = async () => {
    onConfigPatch({ port: 8177 })
    setModelDownloadUrl(recommendedModelPreset.url)

    if (releaseAssets.length === 0) {
      setStatusState('loading')
      try {
        const releaseInfo = await fetchLatestWhisperCppReleaseInfo(window.electronAPI?.platform)
        const nextAssets = releaseInfo.assets.slice(0, 8)
        setReleaseTag(releaseInfo.tag)
        setReleaseAssets(nextAssets)
        if (nextAssets.length > 0) {
          setBinaryDownloadUrl(nextAssets[0].url)
        }
        setStatusState('idle')
        setActionMessage(t.bundledRuntime.recommendedFlowReady)
      } catch (error) {
        setStatusState('error')
        setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.loadRecommendedFailed)
      }
      return
    }

    if (releaseAssets[0]) {
      setBinaryDownloadUrl(releaseAssets[0].url)
    }
    setActionMessage('已填入推荐流程：官方 binary + Base 模型 + 默认端口 8177')
  }

  const handleRunValidation = async () => {
    setStatusState('loading')
    try {
      await onRunConfigTest()
      setStatusState('idle')
      setActionMessage(t.bundledRuntime.configTestTriggered)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.configTestFailed)
    }
  }

  const handlePrimaryAction = async () => {
    if (!binaryReady) {
      if (!recommendedBinaryAsset) {
        await handlePrepareRecommendedFlow()
        return
      }
      await handleDownloadBinary(recommendedBinaryAsset.url)
      return
    }

    if (!modelReady) {
      await handleDownloadModel()
      return
    }

    await handleRunValidation()
  }

  const handleStart = async () => {
    if (!manager) return
    setStatusState('loading')
    try {
      const nextSnapshot = await manager.start(config)
      setSnapshot(nextSnapshot)
      setStatusState('idle')
      setActionMessage(nextSnapshot.message || t.bundledRuntime.runtimeStarted)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.startFailed)
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
      setActionMessage(nextSnapshot.message || t.bundledRuntime.runtimeStopped)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.stopFailed)
    }
  }

  const handleOpenModelsPath = async () => {
    if (!manager) return
    setStatusState('loading')
    try {
      await manager.openModelsPath()
      setStatusState('idle')
      setActionMessage(snapshot?.modelsPath || t.bundledRuntime.openedModelsDir)
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.openModelsDirFailed)
    }
  }

  const handlePickModelPath = async () => {
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage(t.bundledRuntime.envNotSupportFilePick)
      return
    }

    const filePath = await window.electronAPI.pickFilePath({
      title: t.bundledRuntime.pickModelTitle,
      filters: [
        { name: 'Model Files', extensions: ['bin', 'gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (filePath) {
      onConfigPatch({ modelPath: filePath })
      setActionMessage(t.bundledRuntime.selectedModel(filePath))
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
      title: t.bundledRuntime.importModelTitle,
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
      setActionMessage(t.bundledRuntime.modelImported(importedPath))
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.importModelFailed)
    }
  }

  const handlePickBinaryPath = async () => {
    if (!window.electronAPI?.pickFilePath) {
      setStatusState('error')
      setActionMessage('当前环境不支持文件选择')
      return
    }

    const filePath = await window.electronAPI.pickFilePath({
      title: t.bundledRuntime.pickBinaryTitle,
      filters: [
        { name: 'Executable', extensions: ['exe', 'bin'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (filePath) {
      onConfigPatch({ binaryPath: filePath })
      setActionMessage(t.bundledRuntime.selectedBinary(filePath))
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
      title: t.bundledRuntime.importBinaryTitle,
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
      setActionMessage(t.bundledRuntime.binaryImported(importedPath))
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.importBinaryFailed)
    }
  }

  const handleDownloadBinary = async (preferredUrl?: string) => {
    if (!manager) return
    const effectiveUrl = (preferredUrl || binaryDownloadUrl).trim()
    if (!effectiveUrl) {
      setStatusState('error')
      setActionMessage(t.bundledRuntime.fillBinaryUrlFirst)
      return
    }

    setStatusState('loading')
    try {
      const downloadedPath = await manager.downloadBinary(effectiveUrl)
      if (!binaryDownloadUrl.trim()) {
        setBinaryDownloadUrl(effectiveUrl)
      }
      onConfigPatch({ binaryPath: downloadedPath })
      await refreshStatus()
      setStatusState('idle')
      setActionMessage(t.bundledRuntime.binaryDownloaded(downloadedPath))
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.downloadBinaryFailed)
    }
  }

  const handleDownloadModel = async () => {
    if (!manager) return
    if (!modelDownloadUrl.trim()) {
      setStatusState('error')
      setActionMessage(t.bundledRuntime.fillModelUrlFirst)
      return
    }

    setStatusState('loading')
    try {
      const downloadedPath = await manager.downloadModel(modelDownloadUrl.trim())
      onConfigPatch({ modelPath: downloadedPath })
      await refreshModels()
      setStatusState('idle')
      setActionMessage(t.bundledRuntime.modelDownloaded(downloadedPath))
    } catch (error) {
      setStatusState('error')
      setActionMessage(error instanceof Error ? error.message : t.bundledRuntime.downloadModelFailed)
    }
  }

  const primaryActionLabel = !binaryReady
    ? recommendedBinaryAsset
      ? t.bundledRuntime.downloadRecommendedBinary
      : t.bundledRuntime.prepareRecommendedFlow
    : !modelReady
    ? t.bundledRuntime.downloadRecommendedModel
    : t.bundledRuntime.testLocalConfig

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="text-xs font-medium text-foreground">{t.bundledRuntime.guideTitle}</div>
      <p className="text-xs text-muted-foreground">
        {t.bundledRuntime.guideDesc}
      </p>

      <BundledRuntimeSummaryCard
        binaryReady={binaryReady}
        modelReady={modelReady}
        runtimeRunning={runtimeRunning}
        nextStep={nextStep}
        hasRecommendedBinaryAsset={Boolean(recommendedBinaryAsset)}
        statusState={statusState}
        actionMessage={actionMessage}
        snapshot={snapshot}
        testStatus={testStatus}
        testMessage={testMessage}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={() => void handlePrimaryAction()}
        modelFiles={modelFiles}
        configuredModelPath={currentModelPath}
        onSelectModelPath={(path) => onConfigPatch({ modelPath: path })}
      />

      <BundledRuntimeAdvancedPanel
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(prev => !prev)}
        statusState={statusState}
        onRefreshStatus={() => void refreshStatus()}
        onStart={() => void handleStart()}
        onStop={() => void handleStop()}
        onPickModelPath={() => void handlePickModelPath()}
        onPickBinaryPath={() => void handlePickBinaryPath()}
        onImportBinary={() => void handleImportBinary()}
        releaseAssets={releaseAssets}
        releaseTag={releaseTag}
        releasesUrl={WHISPER_CPP_RELEASES_URL}
        serverDocsUrl={WHISPER_CPP_SERVER_DOCS_URL}
        onLoadOfficialBinaryPresets={() => void handleLoadOfficialBinaryPresets()}
        binaryDownloadUrl={binaryDownloadUrl}
        onBinaryDownloadUrlChange={setBinaryDownloadUrl}
        onDownloadBinary={() => void handleDownloadBinary()}
        onImportModel={() => void handleImportModel()}
        modelPresets={whisperCppModelPresets}
        modelDownloadUrl={modelDownloadUrl}
        onModelDownloadUrlChange={setModelDownloadUrl}
        onDownloadModel={() => void handleDownloadModel()}
        onOpenModelsPath={() => void handleOpenModelsPath()}
      />

      <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
        <div className="text-xs font-medium text-foreground">{t.bundledRuntime.step3Title}</div>
        <p className="text-xs text-muted-foreground">
          {t.bundledRuntime.step3DescLong}
        </p>
      </div>

    </div>
  )
}
