import { useEffect } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border
        animate-in slide-in-from-right duration-300 fade-in
        ${toast.type === 'error' 
          ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground dark:ring-1 dark:ring-white/[0.06]' 
          : 'bg-background border-border text-foreground dark:ring-1 dark:ring-white/[0.06]'
        }
      `}
    >
      {toast.type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
      ) : (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      )}
      <span className={`text-sm font-medium flex-1 ${toast.type === 'error' ? 'text-destructive' : ''}`}>
        {toast.message}
      </span>
      <button
        onClick={() => onClose(toast.id)}
        className="p-1 hover:bg-muted rounded transition-colors"
      >
        <X className="w-4 h-4 opacity-50 hover:opacity-100" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}
