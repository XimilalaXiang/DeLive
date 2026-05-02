import { useCallback } from 'react'
import { FileAudio } from 'lucide-react'
import { FileDropZone } from './FileDropZone'
import { FileTranscriptionProgress } from './FileTranscriptionProgress'
import { useFileTranscription } from '../hooks/useFileTranscription'
import { useFileTranscriptionStore } from '../stores/fileTranscriptionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { ASRVendor } from '../types/asr/common'
import type { FileTranscriptionConfig } from '../types/fileTranscription'

export function FileTranscriptionView() {
  const { jobs, submitFile, cancelJob, openResult } = useFileTranscription()
  const removeJob = useFileTranscriptionStore((s) => s.removeJob)
  const providerConfig = useSettingsStore((s) => s.getProviderConfig('soniox'))
  const hasApiKey = Boolean(providerConfig?.apiKey)

  const activeJobs = useFileTranscriptionStore((s) => s.getActiveJobs())
  const isProcessing = activeJobs.length > 0

  const handleFilesSelected = useCallback((files: File[]) => {
    const config: FileTranscriptionConfig = {
      provider: ASRVendor.Soniox,
      languageHints: (providerConfig?.languageHints as string[]) || ['zh', 'en'],
      enableSpeakerDiarization: Boolean(providerConfig?.enableSpeakerDiarization),
      translationEnabled: Boolean(providerConfig?.translationEnabled),
      translationTargetLanguage: (providerConfig?.translationTargetLanguage as string) || 'en',
    }

    for (const file of files) {
      submitFile(file, config).catch((err) => {
        console.error('[FileTranscription] Submit failed:', err)
      })
    }
  }, [submitFile, providerConfig])

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
              上传音频文件，使用 Soniox 异步转录引擎处理
            </p>
          </div>
        </div>

        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              请先在设置 → Provider → Soniox 中配置 API Key
            </p>
          </div>
        )}

        {/* Provider Info */}
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Soniox Async (stt-async-v4)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                支持 60+ 种语言 · 说话人识别 · 翻译 · Token 级时间戳
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Cloud
            </span>
          </div>
        </div>

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
    </div>
  )
}
