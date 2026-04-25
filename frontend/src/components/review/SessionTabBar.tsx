import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  MessageSquareQuote,
  Network,
  FileText,
  SpellCheck,
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

export type ReviewTab = 'overview' | 'ai' | 'chat' | 'mindmap' | 'transcript' | 'correction'

interface SessionTabBarProps {
  activeTab: ReviewTab
  onTabChange: (tab: ReviewTab) => void
}

const TAB_CONFIG: { id: ReviewTab; icon: typeof Sparkles; labelKey: string }[] = [
  { id: 'transcript', icon: FileText, labelKey: 'tabTranscript' },
  { id: 'overview', icon: Sparkles, labelKey: 'tabOverview' },
  { id: 'ai', icon: Bot, labelKey: 'tabAi' },
  { id: 'chat', icon: MessageSquareQuote, labelKey: 'tabChat' },
  { id: 'mindmap', icon: Network, labelKey: 'tabMindMap' },
  { id: 'correction', icon: SpellCheck, labelKey: 'tabCorrection' },
]

export function SessionTabBar({ activeTab, onTabChange }: SessionTabBarProps) {
  const { t } = useUIStore()
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const el = tabRefs.current.get(activeTab)
    if (el) {
      const parent = el.parentElement
      if (parent) {
        setIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
        })
      }
    }
  }, [activeTab])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  return (
    <div
      className="relative flex items-center gap-1 border-b border-border bg-background/70 px-6"
      role="tablist"
      aria-label="Review tabs"
    >
      {TAB_CONFIG.map(({ id, icon: Icon, labelKey }, index) => {
        const isActive = activeTab === id
        const label = (t.preview as Record<string, unknown>)[labelKey] as string | undefined

        return (
          <button
            key={id}
            ref={(el) => {
              if (el) tabRefs.current.set(id, el)
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(id)}
            onKeyDown={(e) => {
              let nextIndex = index
              if (e.key === 'ArrowRight') nextIndex = (index + 1) % TAB_CONFIG.length
              else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + TAB_CONFIG.length) % TAB_CONFIG.length
              else return
              e.preventDefault()
              const next = TAB_CONFIG[nextIndex]
              onTabChange(next.id)
              tabRefs.current.get(next.id)?.focus()
            }}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label || id}</span>
          </button>
        )
      })}

      {/* Animated active indicator */}
      <span
        className="absolute bottom-0 h-0.5 rounded-t-full bg-primary transition-all duration-250 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  )
}
