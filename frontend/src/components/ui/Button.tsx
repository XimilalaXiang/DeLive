import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost:
    'hover:bg-accent hover:text-accent-foreground',
  danger:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm',
  link:
    'text-primary underline-offset-4 hover:underline',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 py-2 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 py-2.5 text-sm rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-md',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center whitespace-nowrap font-medium
        ring-offset-background transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        active:scale-[0.97] transition-transform duration-100
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
