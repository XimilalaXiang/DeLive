import { useState, useMemo } from 'react'
import { History, Calendar, Download, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportToTxt } from '../utils/storage'
import type { TranscriptSession } from '../types'

export function HistoryPanel() {
  const { sessions, updateSessionTitle, deleteSession } = useTranscriptStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // 按日期分组
  const groupedSessions = useMemo(() => {
    const groups: Record<string, TranscriptSession[]> = {}
    
    for (const session of sessions) {
      if (!groups[session.date]) {
        groups[session.date] = []
      }
      groups[session.date].push(session)
    }

    // 按日期降序排列
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sessions])

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const startEditing = (session: TranscriptSession) => {
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

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteSession(id)
    }
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天'
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天'
    }
    return dateStr
  }

  // 默认展开今天和昨天
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const isExpanded = (date: string) => 
    expandedDates.has(date) || date === today || date === yesterday

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-200 bg-surface-50">
        <History className="w-4 h-4 text-zinc-500" />
        <span className="text-sm font-medium text-zinc-700">历史记录</span>
        <span className="text-xs text-zinc-400 ml-auto">{sessions.length} 条记录</span>
      </div>

      {/* 内容 */}
      <div className="max-h-[400px] overflow-y-auto">
        {groupedSessions.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {groupedSessions.map(([date, dateSessions]) => (
              <div key={date}>
                {/* 日期头部 */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center gap-2 px-5 py-3 hover:bg-surface-50 transition-colors"
                >
                  {isExpanded(date) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-zinc-700">
                    {formatDateDisplay(date)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    ({dateSessions.length})
                  </span>
                </button>

                {/* 会话列表 */}
                {isExpanded(date) && (
                  <div className="pl-9 pr-4 pb-2 space-y-1">
                    {dateSessions.map((session) => (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-50 transition-colors"
                      >
                        {/* 时间 */}
                        <span className="text-xs text-zinc-400 font-mono w-12">
                          {session.time}
                        </span>

                        {/* 标题 */}
                        {editingId === session.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTitle()
                                if (e.key === 'Escape') cancelEditing()
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:ring-2 focus:ring-primary-500"
                              autoFocus
                            />
                            <button
                              onClick={saveTitle}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-zinc-400 hover:bg-surface-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-zinc-700 truncate">
                              {session.title}
                            </span>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(session)}
                                className="p-1.5 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="编辑标题"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => exportToTxt(session)}
                                className="p-1.5 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="导出TXT"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(session.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
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
  )
}
