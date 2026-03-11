import { useMemo, useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { PreviewModal } from './PreviewModal'
import { HistoryPanel } from './HistoryPanel'

export function ReviewDeskView() {
  const { reviewSessionId } = useUIStore()
  const sessions = useSessionStore((s) => s.sessions)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const session = useMemo(
    () => sessions.find((s) => s.id === reviewSessionId) ?? null,
    [sessions, reviewSessionId],
  )

  if (!session) {
    return (
      <div className="h-full flex flex-col animate-view-enter">
        <div className="container mx-auto max-w-5xl flex-1 px-4 py-4 sm:px-6">
          <HistoryPanel variant="full" contentHeightClassName="h-[min(72vh,56rem)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex animate-view-enter">
      {/* Collapsible sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 border-r border-border/60 overflow-hidden transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-0 border-r-0' : 'w-[380px]'
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
