import { useState, useEffect, useRef } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import type { RecordingState } from '../types'

interface TitleBarProps {
  recordingState?: RecordingState
  onClickRec?: () => void
}

export function TitleBar({ recordingState, onClickRec }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const { t } = useUIStore()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (recordingState === 'recording') {
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setElapsed(0)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [recordingState])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // 当前平台
  const platform = window.electronAPI?.platform

  // 检查窗口是否最大化
  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI?.windowIsMaximized) {
        const maximized = await window.electronAPI.windowIsMaximized()
        setIsMaximized(maximized)
      }
    }
    checkMaximized()

    // 监听窗口大小变化
    const handleResize = () => {
      checkMaximized()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 非 Electron 环境不显示
  if (!window.electronAPI?.isElectron) {
    return null
  }

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize('titlebar-minimize-button')
  }

  const handleMaximize = async () => {
    await window.electronAPI?.windowMaximize()
    const maximized = await window.electronAPI?.windowIsMaximized()
    setIsMaximized(maximized ?? false)
  }

  const handleClose = () => {
    window.electronAPI?.windowClose()
  }

  return (
    <div className="title-bar fixed top-0 left-0 right-0 h-8 z-50 flex items-center justify-between bg-background/95 backdrop-blur border-b border-border/40">
      <div
        className={`flex-1 h-full app-drag-region flex items-center ${platform === 'darwin' ? 'pl-20' : ''}`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {recordingState === 'recording' && (
          <button
            onClick={onClickRec}
            className="ml-auto mr-auto flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
            REC {formatTime(elapsed)}
          </button>
        )}
      </div>


      {/* 窗口控制按钮 - macOS 上不显示（使用原生红绿灯） */}
      {platform !== 'darwin' && (
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* 最小化 */}
          <button
            onClick={handleMinimize}
            className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
            title={t.titleBar.minimize}
            aria-label="Minimize window"
          >
            <Minus className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* 最大化/还原 */}
          <button
            onClick={handleMaximize}
            className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
            title={isMaximized ? t.titleBar.restore : t.titleBar.maximize}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            {isMaximized ? (
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Square className="w-3 h-3 text-muted-foreground" />
            )}
          </button>

          {/* 关闭 */}
          <button
            onClick={handleClose}
            className="h-8 w-12 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors group"
            title={t.titleBar.close}
            aria-label="Close window"
          >
            <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}
