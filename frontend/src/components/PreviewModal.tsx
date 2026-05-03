import { useEffect, useState, useCallback } from 'react'
import type { TranscriptSession } from '../types'
import {
  SessionHeader,
  SessionTabBar,
  ChatTab,
  MindMapTab,
  TranscriptTab,
  SummaryTab,
} from './review'
import type { ReviewTab } from './review'
import { AiSidePanel } from './review/AiSidePanel'

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
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [selectedText, setSelectedText] = useState<string | undefined>()

  useEffect(() => {
    setActiveTab('transcript')
    setAiPanelOpen(false)
  }, [session?.id])

  const handleToggleAiPanel = useCallback(() => {
    setAiPanelOpen((prev) => !prev)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedText(undefined)
  }, [])

  useEffect(() => {
    if (activeTab !== 'transcript') return undefined
    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString().trim()
      if (selection && selection.length > 5) {
        setSelectedText(selection)
        if (!aiPanelOpen) setAiPanelOpen(true)
      }
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [activeTab, aiPanelOpen])

  useEffect(() => {
    if (!session) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '4') {
        event.preventDefault()
        const tabs: ReviewTab[] = ['transcript', 'summary', 'chat', 'mindmap']
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
      case 'summary':
        return <SummaryTab session={session} />
      case 'chat':
        return <ChatTab session={session} />
      case 'mindmap':
        return <MindMapTab session={session} />
      case 'transcript':
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
        className="flex-1 overflow-hidden flex animate-tab-enter"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {tabContent}
          {activeTab === 'transcript' && !aiPanelOpen && session && (
            <AiSidePanel
              session={session}
              isOpen={false}
              onToggle={handleToggleAiPanel}
            />
          )}
        </div>
        {activeTab === 'transcript' && aiPanelOpen && session && (
          <AiSidePanel
            session={session}
            isOpen={true}
            onToggle={handleToggleAiPanel}
            selectedText={selectedText}
            onClearSelection={handleClearSelection}
          />
        )}
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
