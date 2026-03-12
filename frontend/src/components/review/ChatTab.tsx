import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  MessageSquareQuote,
  Send,
  Loader2,
  Quote,
  ArrowUpRight,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Sparkles,
  User,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { isAiPostProcessConfigured } from '../../services/aiPostProcess'
import { generateId } from '../../utils/storage'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ChatTabProps {
  session: TranscriptSession
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
    </div>
  )
}

function MessageActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: typeof Copy
  label: string
  onClick: () => void
  variant?: 'default' | 'success'
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
        variant === 'success'
          ? 'text-green-600 dark:text-green-400'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </button>
  )
}

export function ChatTab({ session }: ChatTabProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const askSessionQuestion = useSessionStore((state) => state.askSessionQuestion)
  const deleteSessionConversation = useSessionStore((state) => state.deleteSessionConversation)
  const [questionDraft, setQuestionDraft] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string>('default')
  const [isNewThread, setIsNewThread] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const askMessagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const askHistory = useMemo(() => session.askHistory || [], [session.askHistory])
  const aiConfigured = isAiPostProcessConfigured(settings)
  const askPending = askHistory.some((turn) => turn.status === 'pending')

  useEffect(() => {
    setQuestionDraft('')
    setActiveConversationId('default')
    setIsNewThread(false)
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
    if (isNewThread) return
    if (hasActiveConversation) return
    if (askConversations.length > 0) {
      setActiveConversationId(askConversations[0].id)
      return
    }
    setActiveConversationId('default')
  }, [activeConversationId, askConversations, hasActiveConversation, isNewThread])

  useEffect(() => {
    if (isNewThread && hasActiveConversation) {
      setIsNewThread(false)
    }
  }, [isNewThread, hasActiveConversation])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    askMessagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [displayedAskHistory.length, latestAskStatus, activeConversationId, session.id, scrollToBottom])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setShowScrollBtn(!isNearBottom)
  }, [])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = 6 * 24 // ~6 lines
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [questionDraft, adjustTextareaHeight])

  const handleAskQuestion = async () => {
    if (!session || askPending || !questionDraft.trim()) return
    try {
      await askSessionQuestion(session.id, questionDraft, {
        conversationId: activeConversationId,
      })
      setQuestionDraft('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('[ChatTab] Session QA failed:', error)
    }
  }

  const handleStartNewConversation = () => {
    const newId = generateId()
    setActiveConversationId(newId)
    setIsNewThread(true)
    setQuestionDraft('')
  }

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setIsNewThread(false)
  }, [])

  const handleDeleteConversation = useCallback((e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    deleteSessionConversation(session.id, conversationId)
    if (activeConversationId === conversationId) {
      setActiveConversationId('default')
      setIsNewThread(false)
    }
  }, [session.id, activeConversationId, deleteSessionConversation])

  const handleCopyMessage = useCallback((messageId: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }, [])

  const handleRegenerate = useCallback(async (question: string) => {
    if (askPending || !question.trim()) return
    try {
      await askSessionQuestion(session.id, question, {
        conversationId: activeConversationId,
      })
    } catch (error) {
      console.error('[ChatTab] Regenerate failed:', error)
    }
  }, [askPending, session.id, activeConversationId, askSessionQuestion])

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
  const showNewThreadPill = isNewThread && !hasActiveConversation
  const canSend = aiConfigured && !askPending && session.transcript.trim() && questionDraft.trim()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Thread bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-5 py-2.5">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
          {askConversations.map((conversation, index) => (
            <div key={conversation.id} className="group/thread inline-flex shrink-0 items-center">
              <button
                onClick={() => handleSelectConversation(conversation.id)}
                className={`inline-flex max-w-[180px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  conversation.id === activeConversationId
                    ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 bg-background/80 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                }`}
                title={conversation.firstTurn?.question}
              >
                <span className="truncate">
                  {getConversationLabel(conversation.id, conversation.firstTurn?.question, index)}
                </span>
              </button>
              <button
                onClick={(e) => handleDeleteConversation(e, conversation.id)}
                className="ml-0.5 hidden h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover/thread:inline-flex"
                title={t.common.delete}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {showNewThreadPill && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              {t.preview.askNewConversationLabel}
            </span>
          )}
        </div>
        <button
          onClick={handleStartNewConversation}
          disabled={!aiConfigured || !session.transcript.trim() || askPending}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
            !aiConfigured || !session.transcript.trim() || askPending
              ? 'cursor-not-allowed text-muted-foreground/50'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Plus className="w-3 h-3" />
          {t.preview.askNewConversation}
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-5 py-6">
          {!aiConfigured && (
            <p className="mb-4 text-xs text-muted-foreground">{t.preview.aiNotConfigured}</p>
          )}
          {!session.transcript.trim() && (
            <p className="mb-4 text-xs text-muted-foreground">{t.preview.askNoTranscript}</p>
          )}

          {displayedAskHistory.length > 0 ? (
            <div className="space-y-6">
              {displayedAskHistory.map((turn) => (
                <div key={turn.id} className="space-y-4">
                  {/* User message */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
                        <p className="whitespace-pre-wrap">{turn.question}</p>
                      </div>
                      {/* User message actions */}
                      <div className="mt-1 flex justify-end opacity-0 transition-opacity [div:hover>&]:opacity-100">
                        <MessageActionButton
                          icon={copiedMessageId === `user-${turn.id}` ? Check : Copy}
                          label={copiedMessageId === `user-${turn.id}` ? t.preview.askCopied : t.preview.askCopy}
                          variant={copiedMessageId === `user-${turn.id}` ? 'success' : 'default'}
                          onClick={() => handleCopyMessage(`user-${turn.id}`, turn.question)}
                        />
                      </div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="group/msg flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {turn.status === 'pending' ? (
                        <div className="rounded-2xl rounded-tl-md bg-muted/40 px-4 py-3 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t.preview.askThinking}
                          </div>
                          <ThinkingIndicator />
                        </div>
                      ) : turn.status === 'error' ? (
                        <div className="rounded-2xl rounded-tl-md border border-destructive/20 bg-destructive/5 px-4 py-3">
                          <p className="text-sm leading-relaxed text-destructive whitespace-pre-wrap">
                            {turn.error || t.preview.askErrorFallback}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-tl-md bg-muted/30 px-4 py-3">
                          <MarkdownRenderer content={turn.answer || ''} />
                        </div>
                      )}

                      {/* Citations */}
                      {turn.citations && turn.citations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t.preview.askReferences}
                          </div>
                          <div className="grid gap-1.5">
                            {turn.citations.map((citation, cidx) => (
                              <div
                                key={`${citation.quote}-${cidx}`}
                                className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                              >
                                <div className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                  <Quote className="w-2.5 h-2.5" />
                                  {citation.speakerLabel || t.preview.askReferenceFallback}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                  {citation.quote}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI message actions */}
                      {turn.status !== 'pending' && (
                        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
                          <MessageActionButton
                            icon={copiedMessageId === `ai-${turn.id}` ? Check : Copy}
                            label={copiedMessageId === `ai-${turn.id}` ? t.preview.askCopied : t.preview.askCopy}
                            variant={copiedMessageId === `ai-${turn.id}` ? 'success' : 'default'}
                            onClick={() => handleCopyMessage(`ai-${turn.id}`, turn.answer || turn.error || '')}
                          />
                          <MessageActionButton
                            icon={RefreshCw}
                            label={t.preview.askRegenerate}
                            onClick={() => void handleRegenerate(turn.question)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={askMessagesEndRef} />
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-5 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
                <MessageSquareQuote className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">{t.preview.askEmpty}</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {showNewThreadPill ? t.preview.askNewConversationHint : t.preview.askEmptyHint}
                </p>
              </div>
              {askSuggestions.length > 0 && (
                <div className="flex max-w-lg flex-wrap justify-center gap-2 pt-2">
                  {askSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuestionDraft(suggestion)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-md active:scale-[0.98]"
                    >
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur transition-all hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            {t.preview.askScrollToBottom}
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur px-5 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/20">
            <textarea
              ref={textareaRef}
              value={questionDraft}
              onChange={(event) => setQuestionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleAskQuestion()
                }
              }}
              placeholder={t.preview.askPlaceholder}
              rows={1}
              className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
              style={{ minHeight: '36px', maxHeight: '144px' }}
            />
            <button
              onClick={() => void handleAskQuestion()}
              disabled={!canSend}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                !canSend
                  ? 'text-muted-foreground/40'
                  : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95'
              }`}
              aria-label={t.preview.askSend}
            >
              {askPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">
            Enter {t.preview.askSend} · Shift+Enter {'\u2191'}
          </p>
        </div>
      </div>
    </div>
  )
}
