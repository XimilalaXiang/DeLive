import { useState, useMemo, useCallback } from 'react'
import { Search, Plus, Mic, MoreVertical, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useTopicStore } from '../stores/topicStore'
import { useSessionStore } from '../stores/sessionStore'
import { TopicDialog } from './TopicDialog'
import { ActionDialog } from './ActionDialog'
import { TopicDetailView } from './TopicDetailView'
import { EmptyState } from './ui/EmptyState'
import type { Topic } from '../types'

function formatDuration(ms: number, t: { hoursShort: string; minutesShort: string }) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}${t.hoursShort}${m > 0 ? ` ${m}${t.minutesShort}` : ''}`
  return `${Math.max(1, m)}${t.minutesShort}`
}

function timeAgo(ts: number, t: { daysAgo: (n: number) => string; weeksAgo: (n: number) => string }) {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days < 7) return t.daysAgo(days)
  return t.weeksAgo(Math.floor(days / 7))
}

export function TopicsView() {
  const { t } = useUIStore()
  const { topics, addTopic, updateTopic, deleteTopic } = useTopicStore()
  const sessions = useSessionStore((s) => s.sessions)

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const topicStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalDuration: number; lastCreatedAt: number }>()
    for (const s of sessions) {
      if (!s.topicId) continue
      const existing = stats.get(s.topicId) ?? { count: 0, totalDuration: 0, lastCreatedAt: 0 }
      existing.count++
      existing.totalDuration += s.duration ?? 0
      if (s.createdAt > existing.lastCreatedAt) existing.lastCreatedAt = s.createdAt
      stats.set(s.topicId, existing)
    }
    return stats
  }, [sessions])

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics
    const q = search.toLowerCase()
    return topics.filter(
      (tp) => tp.name.toLowerCase().includes(q) || tp.description?.toLowerCase().includes(q),
    )
  }, [topics, search])

  const handleCreate = useCallback((name: string, emoji: string, description?: string) => {
    addTopic(name, emoji, description)
  }, [addTopic])

  const handleEdit = useCallback((name: string, emoji: string, description?: string) => {
    if (editingTopic) {
      updateTopic(editingTopic.id, { name, emoji, description })
      setEditingTopic(null)
    }
  }, [editingTopic, updateTopic])

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      deleteTopic(deleteTarget.id)
      setDeleteTarget(null)
      if (selectedTopicId === deleteTarget.id) setSelectedTopicId(null)
    }
  }, [deleteTarget, deleteTopic, selectedTopicId])

  const handleTopicClick = useCallback((topicId: string) => {
    setSelectedTopicId(topicId)
  }, [])

  const handleStartRecording = useCallback((topicId: string) => {
    useTopicStore.getState().setActiveTopic(topicId)
    useUIStore.getState().setView('live')
  }, [])

  const selectedTopic = selectedTopicId ? topics.find((tp) => tp.id === selectedTopicId) ?? null : null

  if (selectedTopic) {
    return (
      <TopicDetailView
        topic={selectedTopic}
        onBack={() => setSelectedTopicId(null)}
        onStartRecording={() => handleStartRecording(selectedTopic.id)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col animate-view-enter overflow-y-auto">
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t.topics.title}</h2>
          <button
            onClick={() => { setEditingTopic(null); setDialogOpen(true) }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            {t.topics.newTopic}
          </button>
        </div>

        {/* Search */}
        {topics.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.topics.searchTopics}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Card grid */}
        {filteredTopics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredTopics.map((topic, idx) => {
              const stats = topicStats.get(topic.id)
              return (
                <div
                  key={topic.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTopicClick(topic.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTopicClick(topic.id) } }}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98] interactive-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Menu */}
                  <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === topic.id ? null : topic.id)}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      aria-label="Topic options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === topic.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 min-w-[140px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                        <button
                          onClick={() => { setOpenMenuId(null); setEditingTopic(topic); setDialogOpen(true) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => { setOpenMenuId(null); setDeleteTarget(topic) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t.common.delete}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Topic info */}
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl">
                      {topic.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-foreground">{topic.name}</h3>
                      {topic.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{topic.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{stats?.count ?? 0} {t.topics.sessions}</span>
                    {stats && stats.totalDuration > 0 && (
                      <span>{t.topics.totalDuration} {formatDuration(stats.totalDuration, t.topics)}</span>
                    )}
                    {stats && stats.lastCreatedAt > 0 && (
                      <span>{timeAgo(stats.lastCreatedAt, t.topics)}</span>
                    )}
                  </div>

                  {/* Quick record */}
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartRecording(topic.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      {t.topics.recordNew}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-8 w-8 text-primary/60" />}
            title={t.topics.noTopics}
            description={t.topics.noTopicsHint}
            action={
              <button
                onClick={() => { setEditingTopic(null); setDialogOpen(true) }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t.topics.newTopic}
              </button>
            }
          />
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t.history.noSearchResults(search)}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <TopicDialog
        open={dialogOpen}
        topic={editingTopic}
        onClose={() => { setDialogOpen(false); setEditingTopic(null) }}
        onSave={editingTopic ? handleEdit : handleCreate}
      />

      {/* Delete confirmation */}
      <ActionDialog
        open={!!deleteTarget}
        title={t.topics.deleteTopic}
        description={deleteTarget ? t.topics.deleteConfirm(deleteTarget.name) : ''}
        onClose={() => setDeleteTarget(null)}
        actions={[
          { label: t.common.cancel, onClick: () => setDeleteTarget(null), variant: 'secondary' },
          { label: t.common.delete, onClick: handleDelete, variant: 'danger' },
        ]}
      />
    </div>
  )
}
