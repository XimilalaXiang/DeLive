import { useMemo, useState, useCallback } from 'react'
import { ArrowLeft, Mic, Search } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTagStore } from '../stores/tagStore'
import { PreviewModal } from './PreviewModal'
import type { Topic, TranscriptSession } from '../types'

interface TopicDetailViewProps {
  topic: Topic
  onBack: () => void
  onStartRecording: () => void
}

export function TopicDetailView({ topic, onBack, onStartRecording }: TopicDetailViewProps) {
  const { t } = useUIStore()
  const sessions = useSessionStore((s) => s.sessions)
  const tags = useTagStore((s) => s.tags)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const topicSessions = useMemo(() => {
    let list = sessions.filter((s) => s.topicId === topic.id)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => {
        const tagNames = (s.tagIds || []).map((id) => tags.find((tg) => tg.id === id)?.name || '').filter(Boolean)
        return [s.title, s.transcript, s.date, s.time, ...tagNames].join('\n').toLowerCase().includes(q)
      })
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [sessions, topic.id, search, tags])

  const selectedSession = useMemo(
    () => (selectedId ? topicSessions.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, topicSessions],
  )

  const formatDate = (s: TranscriptSession) => {
    const d = new Date(s.createdAt)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    const m = Math.floor(ms / 60000)
    return m > 0 ? `${m}${t.topics.minutesShort}` : '<1min'
  }

  const handleSessionClick = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  if (!selectedSession) {
    return (
      <div className="h-full flex flex-col animate-view-enter overflow-y-auto">
        <div className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to topics"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">{topic.emoji}</span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-foreground">{topic.name}</h2>
                {topic.description && (
                  <p className="truncate text-xs text-muted-foreground">{topic.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onStartRecording}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
            >
              <Mic className="h-4 w-4" />
              {t.topics.recordNew}
            </button>
          </div>

          {/* Search */}
          {topicSessions.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.history.searchPlaceholder}
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Session list */}
          {topicSessions.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {topicSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSessionClick(s.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50 active:scale-[0.99]"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s)} · {s.time}
                      {s.duration ? ` · ${formatDuration(s.duration)}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search.trim() ? t.history.noSearchResults(search) : t.topics.noTopicsHint}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex animate-view-enter">
      {/* Session sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-0' : 'w-[320px] border-r border-border/40'
        }`}
      >
        <div className="flex w-[320px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
            <button
              onClick={() => { setSelectedId(null) }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">{topic.emoji}</span>
            <span className="truncate text-sm font-medium">{topic.name}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {topicSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSessionClick(s.id)}
                className={`flex w-full flex-col gap-0.5 border-b border-border/30 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                  s.id === selectedId ? 'bg-accent/60' : ''
                }`}
              >
                <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(s)} · {s.time}
                </p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <PreviewModal
          session={selectedSession}
          onClose={() => setSelectedId(null)}
          mode="view"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
    </div>
  )
}
