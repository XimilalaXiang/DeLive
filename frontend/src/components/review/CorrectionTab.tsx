import { useState, useRef, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  SpellCheck,
  X,
  Zap,
} from 'lucide-react'
import type { CorrectionIssue, CorrectionIssueCategory, TranscriptSession } from '../../types'
import type { Translations } from '../../i18n'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useUIStore } from '../../stores/uiStore'
import { resolveModelForFeature } from '../../services/aiPostProcess'

interface CorrectionTabProps {
  session: TranscriptSession
}

const CATEGORY_COLORS: Record<CorrectionIssueCategory, string> = {
  'homophone': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'proper-noun': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'grammar': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'punctuation': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'other': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
}

function getCategoryLabel(category: CorrectionIssueCategory, t: Translations): string {
  const p = t.preview as Record<string, unknown>
  const map: Record<CorrectionIssueCategory, string> = {
    'homophone': (p.correctionCategoryHomophone as string) || 'Homophone',
    'proper-noun': (p.correctionCategoryProperNoun as string) || 'Proper Noun',
    'grammar': (p.correctionCategoryGrammar as string) || 'Grammar',
    'punctuation': (p.correctionCategoryPunctuation as string) || 'Punctuation',
    'other': (p.correctionCategoryOther as string) || 'Other',
  }
  return map[category]
}

export function CorrectionTab({ session }: CorrectionTabProps) {
  const { t, language } = useUIStore()
  const settings = useSettingsStore((s) => s.settings)
  const p = t.preview as Record<string, unknown>
  const isZh = language === 'zh'

  const {
    detectSessionCorrectionIssues,
    startSessionQuickCorrection,
    startSessionReviewCorrection,
    updateSessionCorrection,
  } = useSessionStore()

  const liveSession = useSessionStore(
    (s) => s.sessions.find((sess) => sess.id === session.id),
  )
  const correction = liveSession?.correction ?? session.correction
  const correctionMode = settings.aiPostProcess?.correctionMode || 'quick'
  const storeStatus = correction?.status || 'idle'

  const [streamingText, setStreamingText] = useState('')
  const [localStatus, setLocalStatus] = useState(storeStatus)
  const [localError, setLocalError] = useState<string | null>(null)
  const [localIssues, setLocalIssues] = useState<CorrectionIssue[]>([])
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const streamRef = useRef<HTMLDivElement>(null)

  const status = localStatus !== 'idle' ? localStatus : storeStatus

  useEffect(() => {
    if (storeStatus === 'done' || storeStatus === 'error' || storeStatus === 'reviewing') {
      setLocalStatus(storeStatus)
    }
  }, [storeStatus])

  useEffect(() => {
    if (!startTime || status === 'done' || status === 'error' || status === 'idle') return undefined
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime, status])

  useEffect(() => {
    if (correction?.issues) {
      setLocalIssues(correction.issues.map((i) => ({ ...i, accepted: i.accepted ?? true })))
    }
  }, [correction?.issues])

  useEffect(() => {
    if (streamRef.current && streamingText) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [streamingText])

  const hasModel = !!resolveModelForFeature(
    settings.aiPostProcess || {},
    'correction',
  )
  const activeSession = liveSession ?? session
  const hasTranscript = !!activeSession.transcript.trim()
  const canStart = settings.aiPostProcess?.enabled && hasModel && hasTranscript

  const handleQuickCorrection = useCallback(async () => {
    setStreamingText('')
    setLocalStatus('correcting')
    setLocalError(null)
    setStartTime(Date.now())
    setElapsed(0)
    try {
      await startSessionQuickCorrection(session.id, (chunk) => {
        setStreamingText((prev) => prev + chunk)
      })
      setLocalStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '纠错失败'
      setLocalStatus('error')
      setLocalError(msg)
    } finally {
      setStartTime(null)
    }
  }, [session.id, startSessionQuickCorrection])

  const handleDetect = useCallback(async () => {
    setLocalStatus('detecting')
    setLocalError(null)
    setStartTime(Date.now())
    setElapsed(0)
    try {
      await detectSessionCorrectionIssues(session.id)
      setLocalStatus('reviewing')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '检测失败'
      setLocalStatus('error')
      setLocalError(msg)
    } finally {
      setStartTime(null)
    }
  }, [session.id, detectSessionCorrectionIssues])

  const handleReviewCorrection = useCallback(async () => {
    const accepted = localIssues.filter((i) => i.accepted)
    if (accepted.length === 0) return
    setStreamingText('')
    setLocalStatus('correcting')
    setLocalError(null)
    setStartTime(Date.now())
    setElapsed(0)
    try {
      await startSessionReviewCorrection(session.id, accepted, (chunk) => {
        setStreamingText((prev) => prev + chunk)
      })
      setLocalStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '纠错失败'
      setLocalStatus('error')
      setLocalError(msg)
    } finally {
      setStartTime(null)
    }
  }, [session.id, localIssues, startSessionReviewCorrection])

  const handleReset = useCallback(() => {
    updateSessionCorrection(session.id, {
      status: 'idle',
      correctedText: undefined,
      issues: undefined,
      error: undefined,
      requestedAt: undefined,
      completedAt: undefined,
    })
    setStreamingText('')
    setLocalIssues([])
    setLocalStatus('idle')
    setLocalError(null)
    setStartTime(null)
    setElapsed(0)
  }, [session.id, updateSessionCorrection])

  const toggleIssueAccepted = useCallback((issueId: string) => {
    setLocalIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, accepted: !i.accepted } : i)),
    )
  }, [])

  const setAllAccepted = useCallback((accepted: boolean) => {
    setLocalIssues((prev) => prev.map((i) => ({ ...i, accepted })))
  }, [])

  if (!hasTranscript) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">{p.correctionNoTranscript as string}</p>
      </div>
    )
  }

  const transcriptText = activeSession.transcript

  if (!canStart && status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          {p.correctionNotConfigured as string}
        </p>
      </div>
    )
  }

  const isProcessing = status === 'detecting' || status === 'correcting'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <SpellCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">{p.correctionTitle as string}</h3>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'idle' && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {p.correctionReset as string}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Idle state — start buttons */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <SpellCheck className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {p.correctionDesc as string}
            </p>
            <div className="flex gap-3">
              {correctionMode === 'quick' ? (
                <button
                  type="button"
                  onClick={() => void handleQuickCorrection()}
                  className="inline-flex items-center gap-2 h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  {p.correctionStart as string}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDetect()}
                  className="inline-flex items-center gap-2 h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <SpellCheck className="w-4 h-4" />
                  {p.correctionDetect as string}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Detecting */}
        {status === 'detecting' && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{p.correctionDetecting as string}</p>
            {elapsed > 0 && (
              <p className="text-xs text-muted-foreground">{elapsed}s</p>
            )}
          </div>
        )}

        {/* Reviewing issues list */}
        {status === 'reviewing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {typeof p.correctionIssuesFound === 'function'
                  ? (p.correctionIssuesFound as (n: number) => string)(localIssues.length)
                  : `${localIssues.length} issues`}
              </p>
              {localIssues.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAllAccepted(true)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {p.correctionAcceptAll as string}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllAccepted(false)}
                    className="text-xs font-medium text-muted-foreground hover:underline"
                  >
                    {p.correctionRejectAll as string}
                  </button>
                </div>
              )}
            </div>

            {localIssues.length === 0 && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm text-muted-foreground">{p.correctionNoIssues as string}</p>
              </div>
            )}

            <div className="space-y-2">
              {localIssues.map((issue) => {
                const isExpanded = expandedIssue === issue.id
                return (
                  <div
                    key={issue.id}
                    className={`rounded-lg border transition-colors ${
                      issue.accepted
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleIssueAccepted(issue.id)
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                          issue.accepted
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-input hover:border-primary/50'
                        }`}
                      >
                        {issue.accepted && <Check className="w-3 h-3" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm line-through text-destructive/70 font-mono truncate">
                            {issue.originalText}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm text-green-600 dark:text-green-400 font-mono truncate">
                            {issue.suggestedText}
                          </span>
                        </div>
                      </div>

                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${CATEGORY_COLORS[issue.category]}`}>
                        {getCategoryLabel(issue.category, t)}
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>

                    {isExpanded && issue.reason && (
                      <div className="px-4 pb-3 pt-0">
                        <p className="text-xs text-muted-foreground pl-8">
                          <span className="font-medium">{p.correctionReason as string}:</span>{' '}
                          {issue.reason}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {localIssues.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleReviewCorrection()}
                  disabled={localIssues.filter((i) => i.accepted).length === 0}
                  className="inline-flex items-center gap-2 h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full justify-center disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {p.correctionApply as string}
                  <span className="text-xs opacity-70">
                    ({localIssues.filter((i) => i.accepted).length}/{localIssues.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Correcting — streaming output */}
        {status === 'correcting' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <p className="text-sm font-medium">{p.correctionCorrecting as string}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {elapsed > 0 && (
                  <span>{elapsed}s</span>
                )}
                <span>{streamingText.length} / ~{transcriptText.length} chars</span>
              </div>
            </div>

            {streamingText.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-border bg-muted/30">
                <Loader2 className="w-8 h-8 text-primary/40 animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  {isZh ? 'AI 正在分析转录内容，请稍候...' : 'AI is analyzing the transcript, please wait...'}
                </p>
              </div>
            ) : (
              <div
                ref={streamRef}
                className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
              >
                <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground">
                  {streamingText}
                  <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Done — show result */}
        {status === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm font-medium">{p.correctionDone as string}</p>
              {correction?.model && (
                <span className="text-xs text-muted-foreground font-mono ml-auto">
                  {correction.model}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {p.correctionOriginal as string}
                </h4>
                <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-[50vh] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed text-muted-foreground">
                    {transcriptText}
                  </pre>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-primary uppercase tracking-wide">
                  {p.correctionCorrected as string}
                </h4>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 max-h-[50vh] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground">
                    {correction?.correctedText || streamingText}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (localError || correction?.error) && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <X className="w-8 h-8 text-destructive" />
            <p className="text-sm text-destructive text-center">{localError || correction?.error}</p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {p.correctionReset as string}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
