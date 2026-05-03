import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Mic, HelpCircle, ArrowDown, Volume2, Share2, Terminal } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { getProviderName } from '../utils/providerI18n'

interface TranscriptDisplayProps {
  className?: string
  contentHeightClassName?: string
}

function getSpeakerLabel(speakerId: string | undefined): string {
  if (!speakerId) return 'Speaker'
  return speakerId
}

const LIVE_SPEAKER_COLORS = [
  { bg: 'bg-blue-500', text: 'text-white', label: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-emerald-500', text: 'text-white', label: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-500', text: 'text-white', label: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-purple-500', text: 'text-white', label: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-rose-500', text: 'text-white', label: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-500', text: 'text-white', label: 'text-cyan-600 dark:text-cyan-400' },
]

function getLiveSpeakerColor(speakerId: string, allIds: string[]) {
  const index = allIds.indexOf(speakerId)
  return LIVE_SPEAKER_COLORS[(index >= 0 ? index : 0) % LIVE_SPEAKER_COLORS.length]
}

function getSpeakerShortLabel(speakerId: string, allIds: string[]): string {
  const index = allIds.indexOf(speakerId)
  return `S${(index >= 0 ? index : 0) + 1}`
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
  } = useSessionStore()
  
  // 获取当前提供商名称
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const providerName = currentProvider ? getProviderName(currentProvider, t) : currentVendor
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
  return (
    <div className={`workspace-panel overflow-hidden relative ${className}`}>
      {/* Header — minimal: provider badge on right, scroll indicator */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {!shouldAutoScroll && isRecording && (
            <span className="workspace-badge">
              {t.transcript.scrollPaused}
            </span>
          )}
          {isStarting && (
            <div className="inline-flex items-center gap-1.5 text-warning font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
              </span>
              {t.recording.starting.replace('...', '')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            {currentProvider?.type === 'local' ? <Terminal className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
            {providerName}
          </span>
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
                <div className="space-y-3">
                  {(() => {
                    const allSpeakerIds = [...new Set(currentSegments.map(s => s.speakerId).filter(Boolean) as string[])]
                    return currentSegments.map((segment, index) => {
                      const prevSegment = index > 0 ? currentSegments[index - 1] : null
                      const isSameSpeaker = prevSegment?.speakerId === segment.speakerId
                      const colors = segment.speakerId
                        ? getLiveSpeakerColor(segment.speakerId, allSpeakerIds)
                        : LIVE_SPEAKER_COLORS[0]
                      return (
                        <div key={`${segment.speakerId || 'speaker'}-${index}`} className="flex items-start gap-2.5">
                          <div className="w-7 shrink-0 pt-0.5 flex justify-center">
                            {!isSameSpeaker && segment.speakerId ? (
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                                {getSpeakerShortLabel(segment.speakerId, allSpeakerIds)}
                              </span>
                            ) : (
                              <span className="h-6 w-6" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {!isSameSpeaker && segment.speakerId && (
                              <div className={`text-xs font-semibold mb-0.5 ${colors.label}`}>
                                {getSpeakerLabel(segment.speakerId)}
                              </div>
                            )}
                            <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium m-0">
                              {segment.text}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  })()}
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
        <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="w-3.5 h-3.5 mr-1" />
            <span>{t.transcript.transcribed} {(finalTranscript.length + nonFinalTranscript.length)} {t.common.characters}</span>
            {translatedText && (
              <>
                <span className="mx-1.5 text-border">|</span>
                <span className="text-info dark:text-info">
                  {t.transcript.translated || '已翻译'} {translatedText.length}
                </span>
              </>
            )}
            {isRecording && nonFinalTranscript.length > 0 && (
              <>
                <span className="mx-1.5 text-border">|</span>
                <span className="text-muted-foreground/60">
                  {t.transcript.confirmed || '已确认'} {finalTranscript.length}
                </span>
              </>
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
