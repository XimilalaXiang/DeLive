import { useState, useMemo } from 'react'
import { History, Calendar, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Search, FileText, Subtitles } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportToTxt } from '../utils/storage'
import { downloadSubtitle } from '../utils/subtitleExport'
import { PreviewModal } from './PreviewModal'
import { TagSelector, TagFilter } from './TagSelector'
import type { TranscriptSession } from '../types'

export function HistoryPanel() {
  const { sessions, tags, updateSessionTitle, deleteSession, selectedTagIds, searchQuery, setSearchQuery, t } = useTranscriptStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [previewSession, setPreviewSession] = useState<TranscriptSession | null>(null)
  const [searchInput, setSearchInput] = useState(searchQuery) // 本地输入状态

  // 按回车执行搜索
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchQuery(searchInput.trim())
    }
  }

  // 清除搜索
  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
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
      result = result.filter(session => 
        session.title.toLowerCase().includes(query) ||
        session.transcript.toLowerCase().includes(query)
      )
    }
    
    return result
  }, [sessions, selectedTagIds, searchQuery])

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
    if (confirm(t.history.deleteConfirm)) {
      deleteSession(id)
    }
  }

  const handleExport = (e: React.MouseEvent, session: TranscriptSession) => {
    e.stopPropagation()
    exportToTxt(session, tags)
  }

  const handleExportSrt = (e: React.MouseEvent, session: TranscriptSession) => {
    e.stopPropagation()
    downloadSubtitle(session, 'srt')
  }

  const handlePreview = (session: TranscriptSession) => {
    if (editingId) return // 编辑中不触发预览
    setPreviewSession(session)
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

  return (
    <>
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-background border border-border shadow-sm">
                <History className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{t.history.title}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t.history.searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-sm rounded-md border border-input bg-background
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
            {(searchInput || searchQuery) && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* 标签筛选栏 */}
          <TagFilter />
        </div>

        {/* 内容 */}
        <div className="max-h-[400px] overflow-y-auto bg-background/50">
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
                                   hover:bg-accent/50 cursor-pointer transition-all duration-200 border border-transparent hover:border-border/50"
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
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                  {session.title}
                                </span>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={(e) => startEditing(e, session)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all shadow-sm border border-transparent hover:border-border"
                                    title={t.history.editTitle}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleExport(e, session)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all shadow-sm border border-transparent hover:border-border"
                                    title={t.history.exportTxt}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleExportSrt(e, session)}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all shadow-sm border border-transparent hover:border-primary/30"
                                    title={t.history?.exportSrt || 'Export SRT'}
                                  >
                                    <Subtitles className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, session.id)}
                                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all shadow-sm border border-transparent hover:border-red-200 dark:hover:border-red-900"
                                    title={t.common.delete}
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
                            <div className="pl-[3.75rem]" onClick={e => e.stopPropagation()}>
                              <TagSelector 
                                sessionId={session.id} 
                                sessionTagIds={session.tagIds || []}
                                compact
                              />
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

      {/* 预览弹窗 */}
      <PreviewModal 
        session={previewSession} 
        onClose={() => setPreviewSession(null)} 
      />
    </>
  )
}
