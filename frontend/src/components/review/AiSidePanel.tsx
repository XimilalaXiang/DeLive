import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  PanelRightClose,
  PanelRightOpen,
  Send,
  Loader2,
  Sparkles,
  User,
  Copy,
  Check,
  ArrowUpRight,
  Trash2,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { isAiPostProcessConfigured } from '../../services/aiPostProcess'
import { MarkdownRenderer } from './MarkdownRenderer'

interface AiSidePanelProps {
  session: TranscriptSession
  isOpen: boolean
  onToggle: () => void
  selectedText?: string
  onClearSelection?: () => void
}

export function AiSidePanel({
  session,
  isOpen,
  onToggle,
  selectedText,
  onClearSelection,
}: AiSidePanelProps) {
  const { t } = useUIStore()
  const p = t.preview as Record<string, unknown>
  const settings = useSettingsStore((state) => state.settings)
  const askSessionQuestion = useSessionStore((state) => state.askSessionQuestion)
  const deleteSessionConversation = useSessionStore((state) => state.deleteSessionConversation)
  const [draft, setDraft] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sidePanelConversationId = useMemo(() => `side-panel-${session.id}`, [session.id])
  const askHistory = useMemo(() => session.askHistory || [], [session.askHistory])
  const panelHistory = useMemo(
    () => askHistory.filter((turn) => turn.conversationId === sidePanelConversationId),
    [askHistory, sidePanelConversationId],
  )

  const aiConfigured = isAiPostProcessConfigured(settings)
  const isPending = panelHistory.some((turn) => turn.status === 'pending')
  const hasTranscript = !!session.transcript.trim()

  useEffect(() => {
    if (selectedText?.trim() && isOpen) {
      const prefix = (p.aiSidePanelQuotePrefix as string) || 'Regarding: '
      setDraft(`${prefix}"${selectedText.trim().slice(0, 200)}"\n\n`)
      textareaRef.current?.focus()
    }
  }, [selectedText, isOpen, p.aiSidePanelQuotePrefix])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [panelHistory.length])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [draft, adjustTextareaHeight])

  const handleSend = async () => {
    if (!draft.trim() || isPending || !aiConfigured || !hasTranscript) return
    try {
      await askSessionQuestion(session.id, draft.trim(), {
        conversationId: sidePanelConversationId,
      })
      setDraft('')
      onClearSelection?.()
    } catch (err) {
      console.error('[AiSidePanel] Ask failed:', err)
    }
  }

  const handleCopy = useCallback((id: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleClearHistory = useCallback(() => {
    deleteSessionConversation(session.id, sidePanelConversationId)
  }, [session.id, sidePanelConversationId, deleteSessionConversation])

  const quickActions = [
    (p.aiSidePanelQuickSummary as string) || 'Summarize this transcript',
    (p.aiSidePanelQuickActions as string) || 'List action items',
    (p.aiSidePanelQuickKeyPoints as string) || 'What are the key points?',
  ]

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
        title={(p.aiSidePanelOpen as string) || 'Open AI Panel'}
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {(p.aiSidePanelTitle as string) || 'AI Assistant'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {panelHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title={(p.aiSidePanelClear as string) || 'Clear history'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={(p.aiSidePanelClose as string) || 'Close panel'}
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!aiConfigured && (
          <p className="text-xs text-muted-foreground mb-3">{t.preview.aiNotConfigured}</p>
        )}
        {!hasTranscript && (
          <p className="text-xs text-muted-foreground mb-3">{t.preview.noContent}</p>
        )}

        {panelHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              {(p.aiSidePanelHint as string) || 'Ask questions about the transcript, or select text to ask about specific parts.'}
            </p>
            {aiConfigured && hasTranscript && (
              <div className="flex flex-col gap-1.5 w-full pt-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => setDraft(action)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-left">{action}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {panelHistory.map((turn) => (
              <div key={turn.id} className="space-y-3">
                {/* User */}
                <div className="flex items-start gap-2 justify-end">
                  <div className="max-w-[85%]">
                    <div className="rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground">
                      <p className="whitespace-pre-wrap">{turn.question}</p>
                    </div>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-3 w-3" />
                  </div>
                </div>

                {/* AI */}
                <div className="group/msg flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {turn.status === 'pending' ? (
                      <div className="rounded-xl rounded-tl-sm bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                        </div>
                      </div>
                    ) : turn.status === 'error' ? (
                      <div className="rounded-xl rounded-tl-sm border border-destructive/20 bg-destructive/5 px-3 py-2">
                        <p className="text-xs text-destructive">{turn.error}</p>
                      </div>
                    ) : (
                      <div className="rounded-xl rounded-tl-sm bg-muted/30 px-3 py-2">
                        <div className="text-xs [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
                          <MarkdownRenderer content={turn.answer || ''} />
                        </div>
                      </div>
                    )}
                    {turn.status !== 'pending' && (
                      <div className="mt-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
                        <button
                          onClick={() => handleCopy(turn.id, turn.answer || '')}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === turn.id ? (
                            <Check className="h-2.5 w-2.5 text-green-500" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <div className="flex items-end gap-1.5 rounded-lg border border-input bg-background p-1 transition-colors focus-within:border-primary/40">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder={(p.aiSidePanelPlaceholder as string) || 'Ask about the transcript...'}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-xs leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
            style={{ minHeight: '28px', maxHeight: '120px' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!draft.trim() || isPending || !aiConfigured || !hasTranscript}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all ${
              !draft.trim() || isPending || !aiConfigured || !hasTranscript
                ? 'text-muted-foreground/40'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
