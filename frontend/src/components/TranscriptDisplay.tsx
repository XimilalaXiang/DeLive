import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Mic, HelpCircle, ArrowDown, Activity, Volume2, Share2, Terminal } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'

export function TranscriptDisplay() {
  const { t } = useUIStore()
  const { settings, availableProviders } = useSettingsStore()
  const { finalTranscript, nonFinalTranscript, recordingState, currentSessionId } = useSessionStore()
  
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
    setShowScrollButton(!atBottom && !!(finalTranscript || nonFinalTranscript))
  }, [isAtBottom, finalTranscript, nonFinalTranscript])

  // 智能自动滚动：只有当用户在底部时才自动滚动
  useEffect(() => {
    if (containerRef.current && shouldAutoScroll) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [finalTranscript, nonFinalTranscript, shouldAutoScroll])

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

  const isEmpty = !finalTranscript && !nonFinalTranscript
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden relative transition-all duration-200 hover:shadow-lg hover:border-primary/20 dark:ring-1 dark:ring-white/[0.06]">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-background border border-border shadow-sm">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">{t.transcript.title}</span>
            {currentSessionId && (
              <span className="text-[10px] text-muted-foreground font-mono">
                ID: {currentSessionId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* 状态指示器 */}
        {isStarting && (
          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {t.recording.starting.replace('...', '')}
          </div>
        )}
        {isRecording && (
          <div className="flex items-center gap-3">
            {!shouldAutoScroll && (
              <span className="text-xs font-medium text-muted-foreground animate-in fade-in">
                {t.transcript.scrollPaused}
              </span>
            )}
            <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 shadow-sm">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              REC
            </div>
          </div>
        )}
      </div>

      {/* 转录内容 */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[320px] overflow-y-auto p-6 scroll-smooth bg-background/50"
      >
        {isStarting ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-2 w-2 bg-primary rounded-full"></div>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">{t.transcript.connecting(providerName)}</p>
            <p className="text-xs mt-2 opacity-80">{t.transcript.selectAudioSource}</p>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            {isRecording ? (
              <div className="text-center space-y-4 max-w-sm mx-auto animate-in fade-in duration-500">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                  <div className="relative bg-background p-4 rounded-full border border-border shadow-sm">
                    <Mic className="w-8 h-8 text-red-500" />
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
                        <span className="text-[11px] text-muted-foreground leading-tight">
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
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              <span className="text-foreground/90 font-medium transition-colors duration-300">{finalTranscript}</span>
              <span className="text-muted-foreground transition-colors duration-300">{nonFinalTranscript}</span>
              {isRecording && (
                <span className="inline-block w-1.5 h-4 bg-primary ml-1 rounded-sm animate-pulse align-middle" />
              )}
            </p>
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
      {(finalTranscript || nonFinalTranscript) && (
        <div className="px-6 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>{t.transcript.transcribed} {(finalTranscript.length + nonFinalTranscript.length)} {t.common.characters}</span>
            {isRecording && nonFinalTranscript.length > 0 && (
              <span className="text-muted-foreground/60">
                ({t.transcript.confirmed || '已确认'} {finalTranscript.length})
              </span>
            )}
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
              <span className="font-medium">{t.transcript.liveUpdating}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
