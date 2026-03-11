import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X,
  Download,
  Calendar,
  Clock,
  FileText,
  Subtitles,
  Pencil,
  Check,
  Sparkles,
  Loader2,
  Type,
  ListTodo,
  Tags,
  BookOpenText,
  MessageSquareQuote,
  Send,
  Quote,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
import type { TranscriptSession, TranscriptSpeaker } from '../types'
import { exportToTxt } from '../utils/storage'
import { downloadSubtitle } from '../utils/subtitleExport'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { isAiPostProcessConfigured } from '../services/aiPostProcess'
import { useTagStore } from '../stores/tagStore'
import { generateId } from '../utils/storage'
import { SessionMindMapCard } from './SessionMindMapCard'

interface PreviewModalProps {
  session: TranscriptSession | null
  onClose: () => void
  mode?: 'modal' | 'view'
}

function getSpeakerLabel(
  speakerId: string | undefined,
  speakerNameMap: Record<string, string>,
): string {
  if (!speakerId) {
    return 'Speaker'
  }

  return speakerNameMap[speakerId] || speakerId
}

export function PreviewModal({ session, onClose, mode = 'modal' }: PreviewModalProps) {
  const isViewMode = mode === 'view'
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const updateSessionSpeakers = useSessionStore((state) => state.updateSessionSpeakers)
  const updateSessionTitle = useSessionStore((state) => state.updateSessionTitle)
  const updateSessionTags = useSessionStore((state) => state.updateSessionTags)
  const askSessionQuestion = useSessionStore((state) => state.askSessionQuestion)
  const generateSessionPostProcess = useSessionStore((state) => state.generateSessionPostProcess)
  const tags = useTagStore((state) => state.tags)
  const addTag = useTagStore((state) => state.addTag)
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [speakerDraftName, setSpeakerDraftName] = useState('')
  const [questionDraft, setQuestionDraft] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string>('default')
  const askMessagesEndRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDivElement>(null)
  const askRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const translatedText = session?.translatedTranscript?.text?.trim() || ''
  const postProcess = session?.postProcess
  const askHistory = useMemo(() => session?.askHistory || [], [session?.askHistory])

  useEffect(() => {
    setEditingSpeakerId(null)
    setSpeakerDraftName('')
    setQuestionDraft('')
    setActiveConversationId('default')
  }, [session?.id])

  useEffect(() => {
    if (!session) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, session])

  const askConversations = useMemo(() => {
    const grouped = new Map<string, typeof askHistory>()

    for (const turn of askHistory) {
      const conversationId = turn.conversationId || 'default'
      const current = grouped.get(conversationId) || []
      current.push(turn)
      grouped.set(conversationId, current)
    }

    return Array.from(grouped.entries())
      .map(([id, turns]) => ({
        id,
        turns,
        firstTurn: turns[0],
        lastTurn: turns[turns.length - 1],
      }))
      .sort((a, b) => (b.lastTurn?.createdAt || 0) - (a.lastTurn?.createdAt || 0))
  }, [askHistory])

  const hasActiveConversation = askConversations.some((conversation) => conversation.id === activeConversationId)
  const displayedAskHistory = askHistory.filter((turn) => (
    (turn.conversationId || 'default') === activeConversationId
  ))
  const latestAskStatus = displayedAskHistory.length > 0
    ? displayedAskHistory[displayedAskHistory.length - 1]?.status
    : undefined

  useEffect(() => {
    if (hasActiveConversation) {
      return
    }

    if (askConversations.length > 0) {
      setActiveConversationId(askConversations[0].id)
      return
    }

    setActiveConversationId('default')
  }, [activeConversationId, askConversations, hasActiveConversation])

  useEffect(() => {
    askMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedAskHistory.length, latestAskStatus, activeConversationId, session?.id])

  const handleExport = () => {
    if (!session) return
    exportToTxt(session)
  }

  const handleExportSrt = () => {
    if (!session) return
    downloadSubtitle(session, 'srt')
  }

  const handleExportVtt = () => {
    if (!session) return
    downloadSubtitle(session, 'vtt')
  }

  const speakerSegments = (session?.segments || []).filter((segment) => segment.speakerId && segment.text.trim())
  const sessionSpeakers = useMemo(
    () => (session?.speakers || []).filter((speaker) => speaker.id.trim()),
    [session?.speakers],
  )
  const speakerNameMap = useMemo(() => (
    Object.fromEntries(
      sessionSpeakers.map((speaker) => [
        speaker.id,
        speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
      ]),
    )
  ), [sessionSpeakers])

  const startEditingSpeaker = (speaker: TranscriptSpeaker) => {
    setEditingSpeakerId(speaker.id)
    setSpeakerDraftName(speaker.displayName?.trim() || speaker.label?.trim() || speaker.id)
  }

  const cancelEditingSpeaker = () => {
    setEditingSpeakerId(null)
    setSpeakerDraftName('')
  }

  const saveSpeakerName = () => {
    if (!session || !editingSpeakerId) return

    const updatedSpeakers = sessionSpeakers.map((speaker) => (
      speaker.id === editingSpeakerId
        ? {
          ...speaker,
          displayName: speakerDraftName.trim() || speaker.label || speaker.id,
        }
        : speaker
    ))

    updateSessionSpeakers(session.id, updatedSpeakers)
    cancelEditingSpeaker()
  }

  const aiConfigured = isAiPostProcessConfigured(settings)
  const aiGenerating = postProcess?.status === 'pending'
  const askPending = askHistory.some((turn) => turn.status === 'pending')
  const hasAiContent = Boolean(
    postProcess?.summary?.trim()
    || postProcess?.actionItems?.length
    || postProcess?.keywords?.length
    || postProcess?.chapters?.length,
  )

  const handleGenerateAiBriefing = async () => {
    if (!session || aiGenerating) return

    try {
      await generateSessionPostProcess(session.id)
    } catch (error) {
      console.error('[PreviewModal] AI post-process failed:', error)
    }
  }

  const handleAskQuestion = async () => {
    if (!session || askPending) return

    try {
      await askSessionQuestion(session.id, questionDraft, {
        conversationId: activeConversationId,
      })
      setQuestionDraft('')
    } catch (error) {
      console.error('[PreviewModal] Session QA failed:', error)
    }
  }

  const handleStartNewConversation = () => {
    setActiveConversationId(generateId())
    setQuestionDraft('')
  }

  const askSuggestions = t.preview.askSuggestions || []
  const scrollToSection = (section: 'overview' | 'ask' | 'transcript') => {
    const target = (
      section === 'overview'
        ? overviewRef.current
        : section === 'ask'
          ? askRef.current
          : transcriptRef.current
    )
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const getConversationLabel = (
    conversationId: string,
    question: string | undefined,
    index: number,
  ) => {
    if (question?.trim()) {
      const trimmed = question.trim()
      return trimmed.length > 28 ? `${trimmed.slice(0, 28)}...` : trimmed
    }

    if (!askConversations.some((conversation) => conversation.id === conversationId)) {
      return t.preview.askNewConversationLabel
    }

    return `${t.preview.askConversation} ${index + 1}`
  }

  const handleApplySuggestedTitle = () => {
    if (!session || !postProcess?.titleSuggestion?.trim()) return
    updateSessionTitle(session.id, postProcess.titleSuggestion.trim())
  }

  const handleApplySuggestedTags = () => {
    if (!session || !postProcess?.tagSuggestions?.length) return

    const nextTagIds = new Set(session.tagIds || [])
    const normalizeTagName = (value: string) => value.trim().toLowerCase()

    for (const suggestion of postProcess.tagSuggestions) {
      const name = suggestion.trim()
      if (!name) continue

      const existing = tags.find((tag) => normalizeTagName(tag.name) === normalizeTagName(name))
      const tagId = existing?.id || addTag(name, 'blue').id
      nextTagIds.add(tagId)
    }

    updateSessionTags(session.id, Array.from(nextTagIds))
  }

  if (!session) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const containerContent = (
    <>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 id="session-review-title" className="text-lg font-semibold tracking-tight truncate">
                {session.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {session.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.time}
                </span>
                <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Review Desk
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-border bg-background/70 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToSection('overview')}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.preview.aiBriefing}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ask')}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <MessageSquareQuote className="h-3.5 w-3.5" />
              {t.preview.askThisSession}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('transcript')}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              {t.transcript.title}
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 bg-background/50">
          <div ref={overviewRef} className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.preview.aiBriefing}
                </div>
                {!aiConfigured && (
                  <p className="text-xs text-muted-foreground">
                    {t.preview.aiNotConfigured}
                  </p>
                )}
                {postProcess?.status === 'error' && postProcess.error && (
                  <p className="text-xs text-destructive dark:text-destructive">
                    {postProcess.error}
                  </p>
                )}
              </div>
              <button
                onClick={() => void handleGenerateAiBriefing()}
                disabled={!aiConfigured || aiGenerating || !session.transcript.trim()}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  !aiConfigured || !session.transcript.trim()
                    ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                    : aiGenerating
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : 'border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.preview.aiGenerating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {hasAiContent ? t.preview.aiRegenerate : t.preview.aiGenerate}
                  </>
                )}
              </button>
            </div>

            {hasAiContent && (
              <div className="grid gap-4">
                {postProcess?.summary && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.preview.aiSummary}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {postProcess.summary}
                    </p>
                  </div>
                )}

                {postProcess?.titleSuggestion && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Type className="w-3.5 h-3.5" />
                      {t.preview.aiTitleSuggestion}
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-medium text-foreground">
                        {postProcess.titleSuggestion}
                      </div>
                      <button
                        onClick={handleApplySuggestedTitle}
                        disabled={session.title.trim() === postProcess.titleSuggestion.trim()}
                        className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          session.title.trim() === postProcess.titleSuggestion.trim()
                            ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                            : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        {t.preview.aiApplyTitle}
                      </button>
                    </div>
                  </div>
                )}

                {postProcess?.actionItems && postProcess.actionItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ListTodo className="w-3.5 h-3.5" />
                      {t.preview.aiActionItems}
                    </div>
                    <div className="space-y-2">
                      {postProcess.actionItems.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(postProcess?.keywords && postProcess.keywords.length > 0) || (postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0) ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Tags className="w-3.5 h-3.5" />
                        {t.preview.aiKeywords}
                      </div>
                      {postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0 && (
                        <button
                          onClick={handleApplySuggestedTags}
                          className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          {t.preview.aiApplyTags}
                        </button>
                      )}
                    </div>
                    {postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          {t.preview.aiTagSuggestions}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {postProcess.tagSuggestions.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success dark:border-success/20 dark:bg-success/10 dark:text-success"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {postProcess?.keywords && postProcess.keywords.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          {t.preview.aiKeywords}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {postProcess.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {postProcess?.chapters && postProcess.chapters.length > 0 && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <BookOpenText className="w-3.5 h-3.5" />
                      {t.preview.aiChapters}
                    </div>
                    <div className="space-y-2">
                      {postProcess.chapters.map((chapter, index) => (
                        <div
                          key={`${chapter.title}-${index}`}
                          className="rounded-lg border border-border bg-background/70 px-3 py-3"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {chapter.title}
                          </div>
                          {chapter.summary && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                              {chapter.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <SessionMindMapCard session={session} />

          <div ref={askRef} className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  {t.preview.askThisSession}
                </div>
                {!aiConfigured && (
                  <p className="text-xs text-muted-foreground">
                    {t.preview.aiNotConfigured}
                  </p>
                )}
                {!session.transcript.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {t.preview.askNoTranscript}
                  </p>
                )}
              </div>
              <button
                onClick={handleStartNewConversation}
                disabled={!aiConfigured || !session.transcript.trim() || askPending}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !aiConfigured || !session.transcript.trim() || askPending
                    ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                    : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                }`}
              >
                <Plus className="w-4 h-4" />
                {t.preview.askNewConversation}
              </button>
            </div>

            {(askConversations.length > 0 || !hasActiveConversation || activeConversationId !== 'default') && (
              <div className="flex flex-wrap gap-2">
                {askConversations.map((conversation, index) => (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      conversation.id === activeConversationId
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    }`}
                    title={conversation.firstTurn?.question}
                  >
                    <span className="truncate">
                      {getConversationLabel(conversation.id, conversation.firstTurn?.question, index)}
                    </span>
                  </button>
                ))}
                {!hasActiveConversation && activeConversationId !== 'default' && (
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    <span className="truncate">
                      {t.preview.askNewConversationLabel}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border bg-background/70">
              <div className="max-h-[420px] overflow-y-auto px-4 py-4">
                {displayedAskHistory.length > 0 ? (
                  <div className="space-y-5">
                    {displayedAskHistory.map((turn) => (
                      <div key={turn.id} className="space-y-3">
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-medium leading-relaxed text-primary-foreground shadow-sm">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                              {t.preview.askQuestion}
                            </div>
                            <p className="whitespace-pre-wrap">
                              {turn.question}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-start">
                          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
                            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                              <MessageSquareQuote className="w-3.5 h-3.5" />
                              {t.preview.askAnswer}
                            </div>
                            {turn.status === 'pending' ? (
                              <div className="inline-flex items-center gap-2 text-sm text-primary">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t.preview.askSending}
                              </div>
                            ) : turn.status === 'error' ? (
                              <p className="text-sm leading-relaxed text-destructive dark:text-destructive whitespace-pre-wrap">
                                {turn.error || t.preview.askErrorFallback}
                              </p>
                            ) : (
                              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {turn.answer}
                              </p>
                            )}

                            {turn.citations && turn.citations.length > 0 && (
                              <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {t.preview.askReferences}
                                </div>
                                <div className="grid gap-2">
                                  {turn.citations.map((citation, index) => (
                                    <div
                                      key={`${citation.quote}-${index}`}
                                      className="rounded-xl border border-border bg-background/70 px-3 py-2"
                                    >
                                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Quote className="w-3 h-3" />
                                        {citation.speakerLabel || t.preview.askReferenceFallback}
                                      </div>
                                      <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                        {citation.quote}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={askMessagesEndRef} />
                  </div>
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <MessageSquareQuote className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t.preview.askEmpty}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveConversation ? t.preview.askEmptyHint : t.preview.askNewConversationHint}
                      </p>
                    </div>
                    {askSuggestions.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {askSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setQuestionDraft(suggestion)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-card/70 px-4 py-4">
                <div className="space-y-3">
                  <textarea
                    value={questionDraft}
                    onChange={(event) => setQuestionDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                        event.preventDefault()
                        void handleAskQuestion()
                      }
                    }}
                    placeholder={t.preview.askPlaceholder}
                    className="min-h-[88px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {t.preview.askShortcut}
                    </p>
                    <button
                      onClick={() => void handleAskQuestion()}
                      disabled={!aiConfigured || askPending || !session.transcript.trim() || !questionDraft.trim()}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        !aiConfigured || askPending || !session.transcript.trim() || !questionDraft.trim()
                          ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                          : 'border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {askPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.preview.askSending}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t.preview.askSend}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {session.transcript || translatedText ? (
            <div ref={transcriptRef} className="prose prose-sm dark:prose-invert max-w-none">
              {sessionSpeakers.length > 0 && (
                <div className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-3">
                  <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t.preview.speakerLabels || 'Speaker labels'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionSpeakers.map((speaker) => (
                      editingSpeakerId === speaker.id ? (
                        <div
                          key={speaker.id}
                          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2"
                        >
                          <input
                            type="text"
                            value={speakerDraftName}
                            onChange={(e) => setSpeakerDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveSpeakerName()
                              if (e.key === 'Escape') cancelEditingSpeaker()
                            }}
                            className="h-8 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder={t.preview.speakerNamePlaceholder || 'Speaker name'}
                            autoFocus
                          />
                          <button
                            onClick={saveSpeakerName}
                            className="p-1.5 rounded-md text-success hover:bg-success/10 dark:hover:bg-success/10 transition-colors"
                            title={t.common.save}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditingSpeaker}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                            title={t.common.cancel}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={speaker.id}
                          className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {speakerNameMap[speaker.id]}
                          </span>
                          <button
                            onClick={() => startEditingSpeaker(speaker)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                            title={t.preview.renameSpeaker || 'Rename speaker'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              {speakerSegments.length > 0 ? (
                <div className="space-y-4">
                  {speakerSegments.map((segment, index) => (
                    <div key={`${segment.speakerId || 'speaker'}-${index}`} className="space-y-1">
                      <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {getSpeakerLabel(segment.speakerId, speakerNameMap)}
                      </div>
                      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground m-0">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : session.transcript ? (
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  {session.transcript}
                </p>
              ) : null}
              {(session.transcript || speakerSegments.length > 0) && translatedText && (
                <div className="my-4 h-px bg-border" />
              )}
              {translatedText && (
                <p className="text-base leading-relaxed whitespace-pre-wrap text-info dark:text-info">
                  {translatedText}
                </p>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm">{t.preview.noContent}</p>
            </div>
          )}
        </div>

        {/* 底部信息和操作 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {t.preview.totalCharacters} {session.transcript?.length || 0} {t.common.characters}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              {t.common.close}
            </button>
            {(session.transcript || translatedText) && (
              <>
                <button
                  onClick={handleExportVtt}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary/30
                           text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  title={t.history?.exportVtt || 'Export VTT'}
                >
                  <Subtitles className="w-4 h-4" />
                  VTT
                </button>
                <button
                  onClick={handleExportSrt}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary/30
                           text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  title={t.history?.exportSrt || 'Export SRT'}
                >
                  <Subtitles className="w-4 h-4" />
                  SRT
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground 
                           bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  {t.preview.exportTxt}
                </button>
              </>
            )}
          </div>
        </div>
    </>
  )

  if (isViewMode) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
        {containerContent}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-review-title"
        className="flex h-[min(92vh,58rem)] w-full max-w-[min(88rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl dark:ring-1 dark:ring-white/[0.08] animate-in zoom-in-95 duration-200"
      >
        {containerContent}
      </div>
    </div>
  )
}
