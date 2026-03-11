import { useState, useMemo, useEffect, useRef } from 'react'
import { History, Calendar, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Search, FileText, Sparkles } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTagStore } from '../stores/tagStore'
import { exportToTxt } from '../utils/storage'
import { ActionDialog } from './ActionDialog'
import { TagSelector, TagFilter } from './TagSelector'
import type { TranscriptSession } from '../types'

interface HistoryPanelProps {
  variant?: 'full' | 'rail'
  className?: string
  contentHeightClassName?: string
}

export function HistoryPanel({
  variant = 'full',
  className = '',
  contentHeightClassName,
}: HistoryPanelProps) {
  const { t, language, openReview } = useUIStore()
  const { sessions, updateSessionTitle, deleteSession } = useSessionStore()
  const { tags, selectedTagIds, searchQuery, setSearchQuery } = useTagStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [inputValue, setInputValue] = useState(searchQuery)
  const [pendingDeleteSession, setPendingDeleteSession] = useState<TranscriptSession | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync input when searchQuery changes externally (e.g. from another panel)
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  // Debounce setSearchQuery by 200ms for instant search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(inputValue.trim())
      debounceRef.current = null
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, setSearchQuery])

  const clearSearch = () => {
    setInputValue('')
    setSearchQuery('')
  }

  const getSessionPreviewText = (session: TranscriptSession) => {
    const summary = session.postProcess?.summary?.trim()
    if (summary) {
      return summary
    }

    const translated = session.translatedTranscript?.text?.trim()
    if (translated) {
      return translated
    }

    return session.transcript.trim()
  }

  // 按标签和搜索词筛选会话
  const filteredSessions = useMemo(() => {
    let result = sessions
    
    // 标签筛选
    if (selectedTagIds.length > 0) {
      result = result.filter(session => 
        selectedTagIds.some(tagId => session.tagIds?.includes(tagId))
      )
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(session => {
        const tagNames = (session.tagIds || [])
          .map((tagId) => tags.find((tag) => tag.id === tagId)?.name || '')
          .filter(Boolean)
        const postProcessSearch = [
          session.postProcess?.summary || '',
          ...(session.postProcess?.actionItems || []),
          ...(session.postProcess?.keywords || []),
          ...(session.postProcess?.tagSuggestions || []),
          ...(session.postProcess?.chapters || []).flatMap((chapter) => [
            chapter.title || '',
            chapter.summary || '',
          ]),
        ]
        const speakerSearch = [
          ...(session.speakers || []).flatMap((speaker) => [
            speaker.id,
            speaker.label,
            speaker.displayName || '',
          ]),
          ...(session.segments || []).map((segment) => segment.speakerId || ''),
        ]
        const searchableContent = [
          session.title,
          session.transcript,
          session.translatedTranscript?.text || '',
          session.providerId || '',
          ...tagNames,
          ...postProcessSearch,
          ...speakerSearch,
        ]
          .join('\n')
          .toLowerCase()

        return searchableContent.includes(query)
      })
    }
    
    return result
  }, [sessions, selectedTagIds, searchQuery, tags])

  // 按日期分组
  const groupedSessions = useMemo(() => {
    const groups: Record<string, TranscriptSession[]> = {}
    
    for (const session of filteredSessions) {
      if (!groups[session.date]) {
        groups[session.date] = []
      }
      groups[session.date].push(session)
    }

    // 按日期降序排列
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredSessions])

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const startEditing = (e: React.MouseEvent, session: TranscriptSession) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditingTitle(session.title)
  }

  const saveTitle = () => {
    if (editingId && editingTitle.trim()) {
      updateSessionTitle(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const session = sessions.find((item) => item.id === id) || null
    setPendingDeleteSession(session)
  }

  const handleExport = (e: React.MouseEvent, session: TranscriptSession) => {
    e.stopPropagation()
    exportToTxt(session, tags)
  }

  const handlePreview = (session: TranscriptSession) => {
    if (editingId) return
    openReview(session.id)
  }

  const formatDateDisplay = (dateStr: string) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return t.common.today
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return t.common.yesterday
    }
    return dateStr
  }

  // 默认展开今天和昨天
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const isExpanded = (date: string) => 
    expandedDates.has(date) || date === today || date === yesterday
  const isRail = variant === 'rail'
  const resolvedContentHeightClassName = contentHeightClassName || (isRail ? 'h-[min(62vh,44rem)]' : 'max-h-[400px]')
  const railCopy = language === 'zh'
    ? {
      title: 'Session Library',
      description: '检索、重开并整理已完成会话。',
    }
    : {
      title: 'Session Library',
      description: 'Search, reopen, and organize finished sessions.',
    }

  return (
    <>
      <div className={`workspace-panel overflow-hidden ${className}`}>
        {/* 头部 */}
        <div className={`space-y-3 border-b border-border/70 bg-muted/20 ${isRail ? 'px-5 py-4' : 'px-6 py-4'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                <History className="h-3.5 w-3.5" />
                {isRail ? railCopy.title : t.history.title}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRail ? railCopy.description : 'Search transcripts and reopen completed sessions.'}
              </p>
            </div>
            <span className="workspace-badge">
              {(selectedTagIds.length > 0 || searchQuery.trim())
                ? `${filteredSessions.length}/${sessions.length} ${t.common.items}`
                : `${sessions.length} ${t.common.items}`
              }
            </span>
          </div>
          
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.history.searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-sm rounded-md border border-input bg-background
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
            {(inputValue || searchQuery) && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* 标签筛选栏 */}
          <TagFilter />
        </div>

        {/* 内容 */}
        <div className={`${resolvedContentHeightClassName} overflow-y-auto bg-background/40`}>
          {groupedSessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                {searchQuery.trim() ? (
                  <Search className="w-8 h-8 opacity-50" />
                ) : (
                  <History className="w-8 h-8 opacity-50" />
                )}
              </div>
              <p className="text-sm">
                {searchQuery.trim() 
                  ? t.history.noSearchResults(searchQuery)
                  : selectedTagIds.length > 0 
                    ? t.history.noMatchingRecords
                    : t.history.noRecords
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groupedSessions.map(([date, dateSessions]) => (
                <div key={date}>
                  {/* 日期头部 */}
                  <button
                    onClick={() => toggleDate(date)}
                    className="w-full flex items-center gap-2 px-6 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    {isExpanded(date) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                    <Calendar className="w-4 h-4 text-primary/70" />
                    <span className="text-sm font-medium text-foreground">
                      {formatDateDisplay(date)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({dateSessions.length})
                    </span>
                  </button>

                  {/* 会话列表 */}
                  {isExpanded(date) && (
                    <div className="px-2 pb-2 space-y-1">
                      {dateSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handlePreview(session)}
                          className="group flex flex-col gap-2 px-4 py-3 rounded-lg mx-2
                                   hover:bg-primary/5 cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/20"
                        >
                          {/* 第一行：时间、标题、操作 */}
                          <div className="flex items-center gap-3">
                            {/* 时间 */}
                            <span className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0 bg-muted/50 px-1.5 py-0.5 rounded text-center">
                              {session.time}
                            </span>

                            {/* 标题 */}
                            {editingId === session.id ? (
                              <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveTitle()
                                    if (e.key === 'Escape') cancelEditing()
                                  }}
                                  className="flex-1 h-8 px-2 text-sm border border-input rounded bg-background 
                                           focus:outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                />
                                <button
                                  onClick={saveTitle}
                                  className="h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-success hover:bg-success/10 dark:hover:bg-success/10 rounded transition-colors"
                                  aria-label="Save title"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded transition-colors"
                                  aria-label="Cancel editing"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                  {session.title}
                                </span>
                                {session.providerId && (
                                  <span className="hidden rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:inline-flex">
                                    {session.providerId}
                                  </span>
                                )}

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={(e) => startEditing(e, session)}
                                    className="h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all shadow-sm border border-transparent hover:border-border"
                                    title={t.history.editTitle}
                                    aria-label="Edit title"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleExport(e, session)}
                                    className="h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all shadow-sm border border-transparent hover:border-border"
                                    title={t.history.exportTxt}
                                    aria-label="Export as TXT"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, session.id)}
                                    className="h-8 w-8 min-h-8 min-w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/10 rounded-md transition-all shadow-sm border border-transparent hover:border-destructive/30 dark:hover:border-destructive/30"
                                    title={t.common.delete}
                                    aria-label="Delete session"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                              </>
                            )}
                          </div>

                          {/* 第二行：标签 */}
                          {editingId !== session.id && (
                            <div className="pl-[3.75rem]">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <TagSelector 
                                    sessionId={session.id} 
                                    sessionTagIds={session.tagIds || []}
                                    compact
                                  />
                                  {session.postProcess?.summary && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                                      <Sparkles className="h-3 w-3" />
                                      AI
                                    </span>
                                  )}
                                </div>
                                {getSessionPreviewText(session) && (
                                  <p className="text-xs leading-5 text-muted-foreground">
                                    {getSessionPreviewText(session).slice(0, 150)}
                                    {getSessionPreviewText(session).length > 150 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ActionDialog
        open={pendingDeleteSession !== null}
        title={t.common.delete}
        description={t.history.deleteConfirm}
        onClose={() => setPendingDeleteSession(null)}
        actions={[
          {
            label: t.common.cancel,
            onClick: () => setPendingDeleteSession(null),
            variant: 'secondary',
          },
          {
            label: t.common.delete,
            onClick: () => {
              if (pendingDeleteSession) {
                deleteSession(pendingDeleteSession.id)
              }
              setPendingDeleteSession(null)
            },
            variant: 'danger',
          },
        ]}
      />
    </>
  )
}
