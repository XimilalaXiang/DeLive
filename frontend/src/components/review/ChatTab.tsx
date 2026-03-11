import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquareQuote,
  Send,
  Loader2,
  Quote,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { isAiPostProcessConfigured } from '../../services/aiPostProcess'
import { generateId } from '../../utils/storage'

interface ChatTabProps {
  session: TranscriptSession
}

export function ChatTab({ session }: ChatTabProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const askSessionQuestion = useSessionStore((state) => state.askSessionQuestion)
  const [questionDraft, setQuestionDraft] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string>('default')
  const askMessagesEndRef = useRef<HTMLDivElement>(null)

  const askHistory = useMemo(() => session.askHistory || [], [session.askHistory])
  const aiConfigured = isAiPostProcessConfigured(settings)
  const askPending = askHistory.some((turn) => turn.status === 'pending')

  useEffect(() => {
    setQuestionDraft('')
    setActiveConversationId('default')
  }, [session.id])

  const askConversations = useMemo(() => {
    const grouped = new Map<string, typeof askHistory>()
    for (const turn of askHistory) {
      const cid = turn.conversationId || 'default'
      const current = grouped.get(cid) || []
      current.push(turn)
      grouped.set(cid, current)
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

  const hasActiveConversation = askConversations.some((c) => c.id === activeConversationId)
  const displayedAskHistory = askHistory.filter(
    (turn) => (turn.conversationId || 'default') === activeConversationId,
  )
  const latestAskStatus = displayedAskHistory.length > 0
    ? displayedAskHistory[displayedAskHistory.length - 1]?.status
    : undefined

  useEffect(() => {
    if (hasActiveConversation) return
    if (askConversations.length > 0) {
      setActiveConversationId(askConversations[0].id)
      return
    }
    setActiveConversationId('default')
  }, [activeConversationId, askConversations, hasActiveConversation])

  useEffect(() => {
    askMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedAskHistory.length, latestAskStatus, activeConversationId, session.id])

  const handleAskQuestion = async () => {
    if (!session || askPending || !questionDraft.trim()) return
    try {
      await askSessionQuestion(session.id, questionDraft, {
        conversationId: activeConversationId,
      })
      setQuestionDraft('')
    } catch (error) {
      console.error('[ChatTab] Session QA failed:', error)
    }
  }

  const handleStartNewConversation = () => {
    setActiveConversationId(generateId())
    setQuestionDraft('')
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
    if (!askConversations.some((c) => c.id === conversationId)) {
      return t.preview.askNewConversationLabel
    }
    return `${t.preview.askConversation} ${index + 1}`
  }

  const askSuggestions = t.preview.askSuggestions || []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Thread bar + new conversation */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 overflow-hidden">
          {askConversations.map((conversation, index) => (
            <button
              key={conversation.id}
              onClick={() => setActiveConversationId(conversation.id)}
              className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              {t.preview.askNewConversationLabel}
            </span>
          )}
        </div>
        <button
          onClick={handleStartNewConversation}
          disabled={!aiConfigured || !session.transcript.trim() || askPending}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !aiConfigured || !session.transcript.trim() || askPending
              ? 'cursor-not-allowed text-muted-foreground'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {t.preview.askNewConversation}
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {!aiConfigured && (
          <p className="mb-4 text-xs text-muted-foreground">{t.preview.aiNotConfigured}</p>
        )}
        {!session.transcript.trim() && (
          <p className="mb-4 text-xs text-muted-foreground">{t.preview.askNoTranscript}</p>
        )}

        {displayedAskHistory.length > 0 ? (
          <div className="space-y-5">
            {displayedAskHistory.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm font-medium leading-relaxed text-primary-foreground shadow-sm">
                    <p className="whitespace-pre-wrap">{turn.question}</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
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
                      <p className="text-sm leading-relaxed text-destructive whitespace-pre-wrap">
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
                          {turn.citations.map((citation, cidx) => (
                            <div
                              key={`${citation.quote}-${cidx}`}
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
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <MessageSquareQuote className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t.preview.askEmpty}</p>
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

      {/* Input area - always pinned at bottom */}
      <div className="shrink-0 border-t border-border bg-card/70 px-5 py-4">
        <div className="flex items-end gap-3">
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
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            onClick={() => void handleAskQuestion()}
            disabled={!aiConfigured || askPending || !session.transcript.trim() || !questionDraft.trim()}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              !aiConfigured || askPending || !session.transcript.trim() || !questionDraft.trim()
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            aria-label={t.preview.askSend}
          >
            {askPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t.preview.askShortcut}</p>
      </div>
    </div>
  )
}
