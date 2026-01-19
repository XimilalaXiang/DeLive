import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

/**
 * 自定义标题栏组件 - 仅在 Electron 环境中显示
 * 提供窗口拖拽和最小化/最大化/关闭按钮
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

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
    window.electronAPI?.windowMinimize()
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
      {/* 拖拽区域 - 占据大部分空间 */}
      <div 
        className="flex-1 h-full app-drag-region"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      

      {/* 窗口控制按钮 */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 最小化 */}
        <button
          onClick={handleMinimize}
          className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
          title="最小化"
        >
          <Minus className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* 最大化/还原 */}
        <button
          onClick={handleMaximize}
          className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
          title={isMaximized ? '还原' : '最大化'}
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
          className="h-8 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
          title="关闭"
        >
          <X className="w-4 h-4 text-muted-foreground group-hover:text-white" />
        </button>
      </div>
    </div>
  )
}
