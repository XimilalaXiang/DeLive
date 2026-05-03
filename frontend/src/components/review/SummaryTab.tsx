import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  SpellCheck,
  FolderOpen,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { OverviewTab } from './OverviewTab'
import { AiTab } from './AiTab'
import { CorrectionTab } from './CorrectionTab'

interface SummaryTabProps {
  session: TranscriptSession
}

type SectionId = 'overview' | 'ai' | 'correction'

const SECTION_CONFIG: { id: SectionId; icon: typeof Sparkles; labelKey: string }[] = [
  { id: 'overview', icon: FolderOpen, labelKey: 'summarySectionOverview' },
  { id: 'ai', icon: Sparkles, labelKey: 'summarySectionAi' },
  { id: 'correction', icon: SpellCheck, labelKey: 'summarySectionCorrection' },
]

export function SummaryTab({ session }: SummaryTabProps) {
  const { t } = useUIStore()
  const p = t.preview as Record<string, unknown>
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    new Set(['overview', 'ai']),
  )

  const toggleSection = (id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {SECTION_CONFIG.map(({ id, icon: Icon, labelKey }) => {
          const isExpanded = expandedSections.has(id)
          const label = (p[labelKey] as string) || labelKey

          return (
            <div key={id}>
              <button
                type="button"
                onClick={() => toggleSection(id)}
                className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-border/50">
                  {id === 'overview' && (
                    <div className="[&>div]:!overflow-visible [&>div]:!flex-none">
                      <OverviewTab session={session} />
                    </div>
                  )}
                  {id === 'ai' && (
                    <div className="[&>div]:!overflow-visible [&>div]:!flex-none">
                      <AiTab session={session} />
                    </div>
                  )}
                  {id === 'correction' && (
                    <div className="min-h-[400px] [&>div]:!h-auto [&>div]:!min-h-[400px]">
                      <CorrectionTab session={session} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
