import {
  Sparkles,
  MessageSquareQuote,
  Network,
  FileText,
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

export type ReviewTab = 'overview' | 'chat' | 'mindmap' | 'transcript'

interface SessionTabBarProps {
  activeTab: ReviewTab
  onTabChange: (tab: ReviewTab) => void
}

const TAB_CONFIG: { id: ReviewTab; icon: typeof Sparkles; labelKey: string }[] = [
  { id: 'overview', icon: Sparkles, labelKey: 'tabOverview' },
  { id: 'chat', icon: MessageSquareQuote, labelKey: 'tabChat' },
  { id: 'mindmap', icon: Network, labelKey: 'tabMindMap' },
  { id: 'transcript', icon: FileText, labelKey: 'tabTranscript' },
]

export function SessionTabBar({ activeTab, onTabChange }: SessionTabBarProps) {
  const { t } = useUIStore()

  return (
    <div className="flex items-center gap-1 border-b border-border bg-background/70 px-6">
      {TAB_CONFIG.map(({ id, icon: Icon, labelKey }) => {
        const isActive = activeTab === id
        const label = (t.preview as Record<string, unknown>)[labelKey] as string | undefined

        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label || id}</span>
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
