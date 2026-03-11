import { Mic, Square, Loader2 } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { useASR } from '../hooks/useASR'
import { buildProviderConnectConfig, isProviderConfigured } from '../utils/providerConfig'
import { StatusIndicator } from './ui'

interface RecordingControlsProps {
  onError: (message: string) => void
}

export function RecordingControls({ onError }: RecordingControlsProps) {
  const { t } = useUIStore()
  const { settings, availableProviders } = useSettingsStore()
  const { recordingState, currentTranscript } = useSessionStore()
  const { startRecording, stopRecording } = useASR({
    onError,
    onStarted: () => console.log('[UI] Recording started'),
    onFinished: () => console.log('[UI] Recording finished'),
  })

  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const currentConfig = settings.providerConfigs?.[currentVendor]
  const normalizedConfig = buildProviderConnectConfig(currentProvider, currentConfig, settings)
  const hasApiKey = isProviderConfigured(currentProvider, normalizedConfig)

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
    <div className="flex items-center gap-4">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          relative flex shrink-0 items-center gap-2.5 rounded-full px-5 py-2.5
          text-sm font-medium tracking-wide shadow-md
          transition-all duration-200
          disabled:opacity-80 disabled:cursor-not-allowed
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${isRecording
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive/20'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/20'
          }
        `}
      >
        {isStarting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.recording.starting}</span>
          </>
        ) : isStopping ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.recording.stopping}</span>
          </>
        ) : isRecording ? (
          <>
            <Square className="h-4 w-4 fill-current" />
            <span>{t.recording.stopRecording}</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            <span>{t.recording.startRecording}</span>
          </>
        )}
      </button>

      <div className="min-w-0 flex-1 text-sm">
        {isStarting && (
          <p className="flex items-center gap-2 text-warning">
            <StatusIndicator status="starting" />
            {t.recording.selectSource}
          </p>
        )}
        {isRecording && (
          <div className="flex items-center gap-2 text-success">
            <StatusIndicator status="recording" />
            <span className="font-medium">{t.recording.capturingAudio}</span>
            {!currentTranscript && (
              <span className="text-xs text-muted-foreground">{t.recording.waitingForAudio}</span>
            )}
          </div>
        )}
        {isIdle && !hasApiKey && (
          <p className="text-warning">{t.recording.clickToConfigureApi}</p>
        )}
      </div>
    </div>
  )
}
