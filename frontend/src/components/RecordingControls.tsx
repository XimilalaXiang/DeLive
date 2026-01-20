import { Mic, Square, Loader2 } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { useASR } from '../hooks/useASR'

interface RecordingControlsProps {
  onError: (message: string) => void
}

export function RecordingControls({ onError }: RecordingControlsProps) {
  const { recordingState, settings, currentTranscript, t } = useTranscriptStore()
  const { startRecording, stopRecording } = useASR({
    onError,
    onStarted: () => console.log('[UI] Recording started'),
    onFinished: () => console.log('[UI] Recording finished'),
  })
  
  // 获取当前提供商的配置
  const currentVendor = settings.currentVendor || 'soniox'
  const currentConfig = settings.providerConfigs?.[currentVendor]
  
  // 根据提供商类型检查配置
  const hasApiKey = (() => {
    if (currentVendor === 'volc') {
      // 火山引擎需要 appKey 和 accessKey
      const volcConfig = currentConfig as { appKey?: string; accessKey?: string } | undefined
      return !!(volcConfig?.appKey && volcConfig?.accessKey)
    }
    // 其他提供商使用 apiKey
    return !!(currentConfig?.apiKey || settings.apiKey)
  })()

  const isIdle = recordingState === 'idle'
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'
  const isStopping = recordingState === 'stopping'
  const isLoading = isStarting || isStopping

  const handleClick = () => {
    if (isIdle) {
      if (!hasApiKey) {
        onError(t.recording.configureApiFirst)
        return
      }
      startRecording()
    } else if (isRecording) {
      stopRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      <div className="relative group">
        {/* Glow effect */}
        <div className={`
          absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200
          ${isRecording ? 'from-red-500 to-orange-500 opacity-40' : ''}
        `}></div>
        
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`
            relative flex items-center gap-3 px-8 py-4 rounded-full font-medium text-base tracking-wide
            transition-all duration-300 shadow-xl
            disabled:opacity-80 disabled:cursor-not-allowed
            ${isRecording 
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-4 ring-destructive/20' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90 ring-4 ring-primary/10 hover:ring-primary/20'
            }
          `}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.recording.starting}</span>
            </>
          ) : isStopping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.recording.stopping}</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>{t.recording.stopRecording}</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>{t.recording.startRecording}</span>
            </>
          )}
        </button>
      </div>

      {/* 状态提示 */}
      <div className="text-center h-12 flex flex-col justify-center">
        {isStarting && (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-bottom-1">
            {t.recording.selectSource} <strong className="underline decoration-2 underline-offset-2">{t.recording.shareAudio}</strong>
          </p>
        )}
        {isRecording && (
          <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {t.recording.capturingAudio}
            </div>
            {!currentTranscript && (
              <p className="text-xs text-muted-foreground">
                {t.recording.waitingForAudio}
              </p>
            )}
          </div>
        )}
        {isIdle && !hasApiKey && (
          <p className="text-sm text-amber-600 dark:text-amber-400 animate-in fade-in">
            {t.recording.clickToConfigureApi}
          </p>
        )}
      </div>
    </div>
  )
}
