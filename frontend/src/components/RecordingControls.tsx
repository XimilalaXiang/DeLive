import { useState } from 'react'
import { Mic, Square, Loader2, Settings2, RefreshCw } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { buildProviderConnectConfig, isProviderConfigured } from '../utils/providerConfig'
import { getProviderName } from '../utils/providerI18n'
import { StatusIndicator, Switch } from './ui'
import type { ProviderConfigData } from '../types'

const TRANSLATION_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

interface RecordingControlsProps {
  onError: (message: string) => void
  startRecording: () => void
  stopRecording: () => void
  switchConfig?: (configPatch: Partial<ProviderConfigData>, description: string) => Promise<void>
}

export function RecordingControls({ onError, startRecording, stopRecording, switchConfig }: RecordingControlsProps) {
  const { t } = useUIStore()
  const { settings, availableProviders } = useSettingsStore()
  const { recordingState, currentTranscript } = useSessionStore()
  const [showQuickSettings, setShowQuickSettings] = useState(false)

  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const currentConfig = settings.providerConfigs?.[currentVendor]
  const normalizedConfig = buildProviderConnectConfig(currentProvider, currentConfig, settings)
  const hasApiKey = isProviderConfigured(currentProvider, normalizedConfig)

  const isIdle = recordingState === 'idle'
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'
  const isStopping = recordingState === 'stopping'
  const isSwitching = recordingState === 'switching'
  const isLoading = isStarting || isStopping || isSwitching

  const supportsTranslation = currentProvider?.capabilities.supportsTranslation ?? false
  const supportsDiarization = currentProvider?.capabilities.supportsSpeakerDiarization ?? false
  const hasLiveFeatures = supportsTranslation || supportsDiarization

  const translationEnabled = Boolean(currentConfig?.translationEnabled)
  const translationTarget = (currentConfig?.translationTargetLanguage as string) || 'en'
  const diarizationEnabled = Boolean(currentConfig?.enableSpeakerDiarization)

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

  const handleToggleTranslation = async () => {
    if (!switchConfig) return
    const newEnabled = !translationEnabled
    const desc = newEnabled
      ? (t.recording?.translationEnabled || 'Translation enabled')
      : (t.recording?.translationDisabled || 'Translation disabled')
    await switchConfig(
      { translationEnabled: newEnabled, translationTargetLanguage: translationTarget },
      desc,
    )
  }

  const handleChangeTranslationTarget = async (target: string) => {
    if (!switchConfig || !translationEnabled) return
    await switchConfig(
      { translationEnabled: true, translationTargetLanguage: target },
      `${t.recording?.translationTarget || 'Target'}: ${target}`,
    )
  }

  const handleToggleDiarization = async () => {
    if (!switchConfig) return
    const newEnabled = !diarizationEnabled
    const desc = newEnabled
      ? (t.recording?.diarizationEnabled || 'Speaker identification enabled')
      : (t.recording?.diarizationDisabled || 'Speaker identification disabled')
    await switchConfig({ enableSpeakerDiarization: newEnabled }, desc)
  }

  return (
    <div className="space-y-3">
      <div className={`flex ${isIdle ? 'flex-col items-center gap-3' : 'items-center gap-5'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClick}
            disabled={isLoading}
            className={`
              relative flex shrink-0 items-center gap-2.5 rounded-full px-6 py-3
              text-sm font-semibold tracking-wide shadow-md
              transition-all duration-200
              disabled:opacity-80 disabled:cursor-not-allowed
              active:scale-[0.97]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${isRecording || isSwitching
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive/20 animate-glow-pulse-destructive'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/20 animate-glow-pulse'
              }
            `}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>{t.recording.starting}</span>
              </>
            ) : isStopping ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>{t.recording.stopping}</span>
              </>
            ) : isSwitching ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                <span>{t.recording?.switching || 'Switching...'}</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                <span>{t.recording.stopRecording}</span>
              </>
            ) : (
              <>
                <Mic className="h-4.5 w-4.5" />
                <span>{t.recording.startRecording}</span>
              </>
            )}
          </button>

          {(isRecording || isSwitching) && hasLiveFeatures && (
            <button
              onClick={() => setShowQuickSettings(prev => !prev)}
              disabled={isSwitching}
              className={`
                p-2.5 rounded-full transition-all
                ${showQuickSettings
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={t.recording?.quickSettings || 'Quick Settings'}
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        <div className={`text-sm ${isIdle ? 'text-center' : 'min-w-0 flex-1'}`}>
          {isStarting && (
            <p className="flex items-center gap-2 text-warning">
              <StatusIndicator status="starting" />
              {t.recording.selectSource}
            </p>
          )}
          {isSwitching && (
            <p className="flex items-center gap-2 text-info">
              <StatusIndicator status="starting" />
              <span className="font-medium">{t.recording?.switching || 'Switching config...'}</span>
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

      {/* Config summary tags (idle state) */}
      {isIdle && hasApiKey && hasLiveFeatures && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{currentProvider ? getProviderName(currentProvider, t) : currentVendor}</span>
          <span className="text-border">·</span>
          <span>{t.recording?.translation || 'Translation'}: {translationEnabled ? translationTarget.toUpperCase() : 'OFF'}</span>
          <span className="text-border">·</span>
          <span>{t.recording?.speakerDiarization || 'Speakers'}: {diarizationEnabled ? 'ON' : 'OFF'}</span>
        </div>
      )}

      {/* Quick settings panel (recording state) */}
      {showQuickSettings && (isRecording || isSwitching) && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {t.recording?.quickSettings || 'Quick Settings'}
            </h4>
            <span className="text-xs text-muted-foreground">
              {currentProvider ? getProviderName(currentProvider, t) : currentVendor}
            </span>
          </div>

          {supportsTranslation && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">
                  {t.recording?.translation || 'Translation'}
                </label>
                <Switch
                  checked={translationEnabled}
                  onChange={() => void handleToggleTranslation()}
                  disabled={isSwitching}
                  aria-label={t.recording?.translation || 'Translation'}
                />
              </div>
              {translationEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground shrink-0">
                    {t.recording?.translationTarget || 'Target'}
                  </label>
                  <select
                    value={translationTarget}
                    onChange={(e) => void handleChangeTranslationTarget(e.target.value)}
                    disabled={isSwitching}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {TRANSLATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {supportsDiarization && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-foreground">
                {t.recording?.speakerDiarization || 'Speaker Identification'}
              </label>
              <Switch
                checked={diarizationEnabled}
                onChange={() => void handleToggleDiarization()}
                disabled={isSwitching}
                aria-label={t.recording?.speakerDiarization || 'Speaker Identification'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
