import { useEffect, useCallback } from 'react'
import { Sparkles, Wrench, X } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import type { WhatsNewEntry } from '../utils/whatsNew'

interface WhatsNewDialogProps {
  open: boolean
  onClose: () => void
  entry: WhatsNewEntry | null
  allEntries?: WhatsNewEntry[]
  showAll?: boolean
}

export function WhatsNewDialog({ open, onClose, entry, allEntries, showAll }: WhatsNewDialogProps) {
  const { language } = useUIStore()
  const lang = language === 'zh' ? 'zh' : 'en'

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return undefined
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  const entriesToShow = showAll && allEntries ? allEntries : entry ? [entry] : []
  if (entriesToShow.length === 0) return null

  const title = lang === 'zh' ? '更新日志' : "What's New"

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {!showAll && entry && (
                <p className="text-xs text-muted-foreground">v{entry.version} · {entry.date}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {entriesToShow.map((e) => (
            <VersionSection key={e.version} entry={e} lang={lang} showHeader={showAll} />
          ))}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-3">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {lang === 'zh' ? '知道了' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VersionSection({ entry, lang, showHeader }: { entry: WhatsNewEntry; lang: 'zh' | 'en'; showHeader?: boolean }) {
  return (
    <div>
      {showHeader && (
        <h3 className="mb-3 text-base font-semibold">
          v{entry.version} <span className="text-xs font-normal text-muted-foreground ml-2">{entry.date}</span>
        </h3>
      )}

      {entry.features.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{lang === 'zh' ? '新功能' : 'New Features'}</span>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {entry.features.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
                <span>{f[lang]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.fixes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            <span>{lang === 'zh' ? '修复' : 'Bug Fixes'}</span>
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/70">
            {entry.fixes.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span>{f[lang]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
