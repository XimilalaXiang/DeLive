import { useEffect, useState } from 'react'
import type { TranscriptSession } from '../types'
import {
  SessionHeader,
  SessionTabBar,
  OverviewTab,
  AiTab,
  ChatTab,
  MindMapTab,
  TranscriptTab,
  CorrectionTab,
} from './review'
import type { ReviewTab } from './review'

interface PreviewModalProps {
  session: TranscriptSession | null
  onClose: () => void
  mode?: 'modal' | 'view'
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function PreviewModal({
  session,
  onClose,
  mode = 'modal',
  sidebarCollapsed,
  onToggleSidebar,
}: PreviewModalProps) {
  const isViewMode = mode === 'view'
  const [activeTab, setActiveTab] = useState<ReviewTab>('transcript')

  useEffect(() => {
    setActiveTab('transcript')
  }, [session?.id])

  useEffect(() => {
    if (!session) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '6') {
        event.preventDefault()
        const tabs: ReviewTab[] = ['transcript', 'correction', 'overview', 'ai', 'chat', 'mindmap']
        const index = parseInt(event.key, 10) - 1
        if (index >= 0 && index < tabs.length) {
          setActiveTab(tabs[index])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, session])

  if (!session) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const tabContent = (() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab session={session} />
      case 'ai':
        return <AiTab session={session} />
      case 'chat':
        return <ChatTab session={session} />
      case 'mindmap':
        return <MindMapTab session={session} />
      case 'correction':
        return <CorrectionTab session={session} />
      case 'transcript':
        return <TranscriptTab session={session} />
      default:
        return <TranscriptTab session={session} />
    }
  })()

  const containerContent = (
    <>
      <SessionHeader
        session={session}
        onClose={onClose}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
      />
      <SessionTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        key={activeTab}
        className="flex-1 overflow-hidden animate-tab-enter"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {tabContent}
      </div>
    </>
  )

  if (isViewMode) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-card text-card-foreground">
        {containerContent}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-review-title"
        className="flex h-[min(92vh,58rem)] w-full max-w-[min(88rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl dark:ring-1 dark:ring-white/[0.08] animate-in zoom-in-95 duration-200"
      >
        {containerContent}
      </div>
    </div>
  )
}
