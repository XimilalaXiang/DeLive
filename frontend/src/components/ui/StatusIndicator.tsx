const statusConfig = {
  idle: {
    dotClass: 'bg-muted-foreground',
    ping: false,
  },
  recording: {
    dotClass: 'bg-destructive',
    ping: true,
  },
  starting: {
    dotClass: 'bg-warning',
    ping: true,
  },
  stopping: {
    dotClass: 'bg-warning',
    ping: true,
  },
  success: {
    dotClass: 'bg-success',
    ping: false,
  },
  error: {
    dotClass: 'bg-destructive',
    ping: false,
  },
  live: {
    dotClass: 'bg-success',
    ping: true,
  },
} as const

export type StatusType = keyof typeof statusConfig

interface StatusIndicatorProps {
  status: StatusType
  label?: string
  className?: string
}

export function StatusIndicator({ status, label, className = '' }: StatusIndicatorProps) {
  const config = statusConfig[status]

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        {config.ping && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dotClass}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`} />
      </span>
      {label && <span className="text-xs font-medium">{label}</span>}
    </span>
  )
}
