import { useMemo } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { PreviewModal } from './PreviewModal'
import { HistoryPanel } from './HistoryPanel'

export function ReviewDeskView() {
  const { reviewSessionId } = useUIStore()
  const sessions = useSessionStore((s) => s.sessions)

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
      {/* 左侧列表 */}
      <aside className="hidden lg:flex w-[380px] shrink-0 border-r border-border/60 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3">
          <HistoryPanel variant="rail" contentHeightClassName="h-[calc(100vh-8rem)]" />
        </div>
      </aside>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-hidden">
        <PreviewModal
          session={session}
          onClose={() => useUIStore.getState().setView('review')}
          mode="view"
        />
      </div>
    </div>
  )
}
