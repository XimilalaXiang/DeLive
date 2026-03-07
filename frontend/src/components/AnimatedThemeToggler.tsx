import { useCallback, useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { useUIStore } from '../stores/uiStore'

interface AnimatedThemeTogglerProps {
  className?: string
  duration?: number
}

export const AnimatedThemeToggler = ({
  className = '',
  duration = 400,
}: AnimatedThemeTogglerProps) => {
  const { resolvedTheme, setTheme } = useUIStore()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    const isDark = resolvedTheme === 'dark'
    const newTheme = isDark ? 'light' : 'dark'

    // 检查浏览器是否支持 View Transitions API
    if (!document.startViewTransition) {
      // 不支持时直接切换，无动画
      setTheme(newTheme)
      return
    }

    // 使用 View Transitions API 实现圆形扩散动画
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme)
      })
    })

    await transition.ready

    // 计算按钮中心点位置
    const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2

    // 计算从按钮中心到屏幕四角的最大距离
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    // 执行圆形扩散动画
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    )
  }, [resolvedTheme, setTheme, duration])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={`
        inline-flex items-center justify-center p-2 rounded-md transition-colors
        text-muted-foreground hover:bg-accent hover:text-accent-foreground
        ${className}
      `}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
