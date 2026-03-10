import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ActionDialogAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface ActionDialogProps {
  open: boolean
  title: string
  description: string
  actions: ActionDialogAction[]
  onClose: () => void
}

const actionClassMap: Record<NonNullable<ActionDialogAction['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

export function ActionDialog({
  open,
  title,
  description,
  actions,
  onClose,
}: ActionDialogProps) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl dark:ring-1 dark:ring-white/[0.08]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h3 id="action-dialog-title" className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-3 px-5 py-4">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors ${
                actionClassMap[action.variant || 'secondary']
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
