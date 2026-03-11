import { useEffect, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogShellProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: string
  titleId?: string
  icon?: ReactNode
  maxWidth?: string
  children: ReactNode
  footer?: ReactNode
}

export function DialogShell({
  open,
  onClose,
  title,
  subtitle,
  titleId = 'dialog-title',
  icon,
  maxWidth = 'max-w-[min(78rem,calc(100vw-2rem))]',
  children,
  footer,
}: DialogShellProps) {
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          flex h-[min(92vh,58rem)] w-full flex-col overflow-hidden
          rounded-2xl border border-border bg-card text-card-foreground
          shadow-2xl dark:ring-1 dark:ring-white/[0.08]
          animate-in zoom-in-95 duration-200
          ${maxWidth}
        `}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 p-2">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background/50">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
