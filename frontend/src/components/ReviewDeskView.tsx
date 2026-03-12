import { useMemo, useState, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTagStore } from '../stores/tagStore'
import { PreviewModal } from './PreviewModal'
import { HistoryPanel } from './HistoryPanel'
import { ActivityHeatmap } from './ActivityHeatmap'

export function ReviewDeskView() {
  const { reviewSessionId } = useUIStore()
  const sessions = useSessionStore((s) => s.sessions)
  const { searchQuery, setSearchQuery } = useTagStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const session = useMemo(
    () => sessions.find((s) => s.id === reviewSessionId) ?? null,
    [sessions, reviewSessionId],
  )

  const handleDateClick = useCallback((date: string) => {
    setSearchQuery(searchQuery === date ? '' : date)
  }, [searchQuery, setSearchQuery])

  const activeDate = /^\d{4}-\d{2}-\d{2}$/.test(searchQuery) ? searchQuery : null

  if (!session) {
    return (
      <div className="h-full flex flex-col animate-view-enter overflow-y-auto">
        <div className="container mx-auto max-w-5xl px-4 py-4 sm:px-6 space-y-4">
          <ActivityHeatmap
            sessions={sessions}
            onDateClick={handleDateClick}
            activeDate={activeDate}
          />
          <HistoryPanel variant="full" contentHeightClassName="h-[min(60vh,48rem)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex animate-view-enter">
      {/* Collapsible sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-0' : 'w-[380px] border-r border-border/40'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-3 w-[380px]">
          <HistoryPanel variant="rail" contentHeightClassName="h-[calc(100vh-8rem)]" />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <PreviewModal
          session={session}
          onClose={() => useUIStore.getState().setView('review')}
          mode="view"
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
    </div>
  )
}
