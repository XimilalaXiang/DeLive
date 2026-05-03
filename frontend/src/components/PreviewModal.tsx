import { useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
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
  const [floatingBtn, setFloatingBtn] = useState<{ x: number; y: number; text: string } | null>(null)
  const tabPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveTab('transcript')
    setAiPanelOpen(false)
    setFloatingBtn(null)
  }, [session?.id])

  const handleToggleAiPanel = useCallback(() => {
    setAiPanelOpen((prev) => !prev)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedText(undefined)
  }, [])

  const handleAskAiFromSelection = useCallback(() => {
    if (!floatingBtn) return
    setSelectedText(floatingBtn.text)
    setAiPanelOpen(true)
    setFloatingBtn(null)
    window.getSelection()?.removeAllRanges()
  }, [floatingBtn])

  useEffect(() => {
    if (activeTab !== 'transcript') return undefined

    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim()
        if (!text || text.length < 5 || !sel?.rangeCount) {
          setFloatingBtn(null)
          return
        }
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const panelRect = tabPanelRef.current?.getBoundingClientRect()
        if (!panelRect) return
        setFloatingBtn({
          x: Math.min(rect.right - panelRect.left, panelRect.width - 120),
          y: rect.top - panelRect.top - 40,
          text,
        })
      }, 10)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-ask-ai-btn]')) return
      setFloatingBtn(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [activeTab])

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
        ref={tabPanelRef}
        key={activeTab}
        className="flex-1 overflow-hidden flex animate-tab-enter relative"
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
        {activeTab === 'transcript' && floatingBtn && (
          <button
            data-ask-ai-btn
            onClick={handleAskAiFromSelection}
            className="absolute z-20 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: floatingBtn.x, top: Math.max(0, floatingBtn.y) }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI
          </button>
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
