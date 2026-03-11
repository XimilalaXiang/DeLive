import type { HTMLAttributes } from 'react'

const variants = {
  default:
    'border-border/70 bg-background/80 text-muted-foreground',
  primary:
    'border-primary/30 bg-primary/10 text-primary',
  success:
    'border-success/30 bg-success/10 text-success',
  warning:
    'border-warning/30 bg-warning/10 text-warning',
  destructive:
    'border-destructive/30 bg-destructive/10 text-destructive',
  info:
    'border-info/30 bg-info/10 text-info',
} as const

export type BadgeVariant = keyof typeof variants

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5
        text-xs font-medium
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
