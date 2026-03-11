import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { PreviewModal } from './PreviewModal'

export function ReviewDeskView() {
  const { reviewSessionId, backToLive } = useUIStore()
  const sessions = useSessionStore((s) => s.sessions)

  const session = useMemo(
    () => sessions.find((s) => s.id === reviewSessionId) ?? null,
    [sessions, reviewSessionId],
  )

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-sm">Session not found</p>
        <button
          onClick={backToLive}
          className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live
        </button>
      </div>
    )
  }

  return (
    <PreviewModal
      session={session}
      onClose={backToLive}
      mode="view"
    />
  )
}
