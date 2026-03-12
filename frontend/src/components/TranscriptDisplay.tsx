import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Mic, HelpCircle, ArrowDown, Activity, Volume2, Share2, Terminal } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'

interface TranscriptDisplayProps {
  className?: string
  contentHeightClassName?: string
}

function getSpeakerLabel(speakerId: string | undefined): string {
  if (!speakerId) {
    return 'Speaker'
  }

  return speakerId
}

export function TranscriptDisplay({
  className = '',
  contentHeightClassName = 'h-[320px]',
}: TranscriptDisplayProps) {
  const { t } = useUIStore()
  const { settings, availableProviders } = useSettingsStore()
  const {
    finalTranscript,
    nonFinalTranscript,
    finalTranslatedTranscript,
    nonFinalTranslatedTranscript,
    currentSegments,
    recordingState,
    currentSessionId,
  } = useSessionStore()
  
  // 获取当前提供商名称
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const providerName = currentProvider?.name || currentVendor
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // 检查是否滚动到底部（允许一定的误差）
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // 允许 30px 的误差范围
    return scrollHeight - scrollTop - clientHeight < 30
  }, [])

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom()
    setShouldAutoScroll(atBottom)
    setShowScrollButton(
      !atBottom
      && !!(finalTranscript || nonFinalTranscript || finalTranslatedTranscript || nonFinalTranslatedTranscript),
    )
  }, [isAtBottom, finalTranscript, nonFinalTranscript, finalTranslatedTranscript, nonFinalTranslatedTranscript])

  // 智能自动滚动：只有当用户在底部时才自动滚动
  useEffect(() => {
    if (containerRef.current && shouldAutoScroll) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [finalTranscript, nonFinalTranscript, finalTranslatedTranscript, nonFinalTranslatedTranscript, shouldAutoScroll])

  // 滚动到底部按钮点击
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      })
      setShouldAutoScroll(true)
      setShowScrollButton(false)
    }
  }, [])

  const captionDisplayMode = settings.captionStyle?.displayMode ?? 'source'
  const translatedText = finalTranslatedTranscript + nonFinalTranslatedTranscript
  const showSource = captionDisplayMode !== 'translated' || translatedText.length === 0
  const showTranslated = captionDisplayMode !== 'source' && translatedText.length > 0
  const speakerDiarizationEnabled = currentVendor === 'soniox'
    && Boolean(settings.providerConfigs?.soniox?.enableSpeakerDiarization)
    && Boolean(currentProvider?.capabilities.supportsSpeakerDiarization)
    && currentSegments.some((segment) => segment.speakerId)
  const isEmpty = !finalTranscript && !nonFinalTranscript && !translatedText
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'
  const providerModeLabel = currentProvider?.type === 'local' ? 'Local' : 'Cloud'

  return (
    <div className={`workspace-panel overflow-hidden relative ${className}`}>
      {/* 头部 */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-muted/25 px-6 py-5">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            <Activity className="h-3.5 w-3.5" />
            {t.transcript.title}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="workspace-badge">
              {providerName}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {providerModeLabel}
              </span>
            </span>
            {currentSessionId && (
              <span className="workspace-badge font-mono">
                ID {currentSessionId.slice(0, 8)}
              </span>
            )}
            {showTranslated && (
              <span className="workspace-badge text-info dark:text-info">
                {t.transcript.translated || 'Translated'}
              </span>
            )}
            {speakerDiarizationEnabled && (
              <span className="workspace-badge">
                Speakers
              </span>
            )}
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!shouldAutoScroll && isRecording && (
            <span className="workspace-badge">
              {t.transcript.scrollPaused}
            </span>
          )}
          {isStarting && (
            <div className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
              <span className="relative mr-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
              </span>
              {t.recording.starting.replace('...', '')}
            </div>
          )}
          {isRecording && (
            <div className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive shadow-sm">
              <span className="relative mr-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              REC
            </div>
          )}
        </div>
      </div>

      {/* 转录内容 */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`${contentHeightClassName} overflow-y-auto bg-background/40 p-6 scroll-smooth`}
      >
        {isStarting ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
            <p className="text-sm font-medium text-foreground">{t.transcript.connecting(providerName)}</p>
            <p className="text-xs mt-2 opacity-80">{t.transcript.selectAudioSource}</p>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            {isRecording ? (
              <div className="text-center space-y-4 max-w-sm mx-auto animate-in fade-in duration-500">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping"></div>
                  <div className="relative bg-background p-4 rounded-full border border-border shadow-sm">
                    <Mic className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.transcript.listening}</p>
                  <p className="text-xs mt-1">{t.transcript.resultsWillAppear}</p>
                </div>
                
                <div className="mt-6 w-full max-w-xs mx-auto">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">{t.transcript.noContentTitle}</p>
                  </div>
                  <div className="space-y-1.5">
                    {[Volume2, Share2, Terminal].map((Icon, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/60 dark:bg-muted/40 border border-border/50 transition-colors hover:bg-muted"
                      >
                        <Icon className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground leading-tight">
                          {t.transcript.noContentTips[index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 opacity-60">
                <div className="bg-muted p-4 rounded-full inline-block">
                  <Mic className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.transcript.ready}</p>
                  <p className="text-xs">{t.transcript.clickToStart}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {showSource && (
              speakerDiarizationEnabled ? (
                <div className="space-y-4">
                  {currentSegments.map((segment, index) => (
                    <div key={`${segment.speakerId || 'speaker'}-${index}`} className="space-y-1">
                      <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {getSpeakerLabel(segment.speakerId)}
                      </div>
                      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                  {nonFinalTranscript && (
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground transition-colors duration-300">
                      {nonFinalTranscript}
                      {isRecording && (
                        <span className="inline-block w-1.5 h-4 bg-primary ml-1 rounded-sm animate-pulse align-middle" />
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  <span className="text-foreground/90 font-medium transition-colors duration-300">{finalTranscript}</span>
                  <span className="text-muted-foreground transition-colors duration-300">{nonFinalTranscript}</span>
                  {isRecording && (
                    <span className="inline-block w-1.5 h-4 bg-primary ml-1 rounded-sm animate-pulse align-middle" />
                  )}
                </p>
              )
            )}
            {showSource && showTranslated && (
              <div className="my-4 h-px bg-border" />
            )}
            {showTranslated && (
              <p className="text-base leading-relaxed whitespace-pre-wrap text-info">
                <span className="font-medium transition-colors duration-300">{finalTranslatedTranscript}</span>
                <span className="opacity-80 transition-colors duration-300">{nonFinalTranslatedTranscript}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollButton && isRecording && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-14 right-6 z-10 flex items-center gap-2 px-4 py-2 
                   bg-primary text-primary-foreground text-xs font-medium
                   rounded-full shadow-lg hover:shadow-xl hover:bg-primary/90
                   transition-all duration-300 animate-in slide-in-from-bottom-4"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{t.transcript.scrollToBottom}</span>
        </button>
      )}

      {/* 底部状态栏 */}
      {(finalTranscript || nonFinalTranscript || translatedText) && (
        <div className="px-6 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>
              {t.transcript.transcribed} {(finalTranscript.length + nonFinalTranscript.length)} {t.common.characters}
            </span>
            {translatedText && (
              <span className="text-info dark:text-info">
                {t.transcript.translated || '已翻译'} {translatedText.length}
              </span>
            )}
            {isRecording && nonFinalTranscript.length > 0 && (
              <span className="text-muted-foreground/60">
                ({t.transcript.confirmed || '已确认'} {finalTranscript.length})
              </span>
            )}
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 text-success dark:text-success">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
              <span className="font-medium">{t.transcript.liveUpdating}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
