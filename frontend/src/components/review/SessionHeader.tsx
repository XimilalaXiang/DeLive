import { useState, useRef } from 'react'
import {
  X,
  Download,
  Calendar,
  Clock,
  FileText,
  Subtitles,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { exportToTxt, exportToMarkdown } from '../../utils/storage'
import { downloadSubtitle } from '../../utils/subtitleExport'
import { useUIStore } from '../../stores/uiStore'

interface SessionHeaderProps {
  session: TranscriptSession
  onClose: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function SessionHeader({
  session,
  onClose,
  sidebarCollapsed,
  onToggleSidebar,
}: SessionHeaderProps) {
  const { t } = useUIStore()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const translatedText = session.translatedTranscript?.text?.trim() || ''
  const hasContent = Boolean(session.transcript || translatedText)

  const handleExportTxt = () => {
    exportToTxt(session)
    setShowExportMenu(false)
  }

  const handleExportMarkdown = () => {
    exportToMarkdown(session)
    setShowExportMenu(false)
  }

  const handleExportSrt = () => {
    downloadSubtitle(session, 'srt')
    setShowExportMenu(false)
  }

  const handleExportVtt = () => {
    downloadSubtitle(session, 'vtt')
    setShowExportMenu(false)
  }

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={sidebarCollapsed ? 'Show session library' : 'Hide session library'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 border border-primary/20">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 id="session-review-title" className="text-lg font-semibold tracking-tight truncate">
            {session.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {session.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.time}
            </span>
            <span className="text-xs text-muted-foreground">
              {session.transcript?.length || 0} {t.common.characters}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasContent && (
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="w-4 h-4" />
              {t.common.export}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg animate-dropdown-in">
                  <button
                    onClick={handleExportTxt}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <FileText className="w-4 h-4" />
                    {t.preview.exportTxt}
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <FileText className="w-4 h-4" />
                    Markdown
                  </button>
                  <button
                    onClick={handleExportSrt}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <Subtitles className="w-4 h-4" />
                    SRT
                  </button>
                  <button
                    onClick={handleExportVtt}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <Subtitles className="w-4 h-4" />
                    VTT
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
