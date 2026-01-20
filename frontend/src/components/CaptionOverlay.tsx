/**
 * 字幕叠加层组件
 * 用于在透明窗口中显示实时转录的字幕
 * 
 * 字幕显示逻辑：
 * - 显示固定的 maxLines 行
 * - 新文字追加到最后一行的末尾
 * - 当最后一行满了，整体向上滚动，最上面一行消失
 * - 已确认的行不会改变
 * 
 * 交互逻辑：
 * - 鼠标移动到字幕上时，右上角显示锁/解锁按钮
 * - 解锁状态下可以拖动字幕移动位置
 * - 锁定状态下字幕固定，鼠标穿透
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Move, Lock, Unlock } from 'lucide-react'

// 字幕样式接口
interface CaptionStyle {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  textShadow: boolean
  maxLines: number
}

// 默认样式
const defaultStyle: CaptionStyle = {
  fontSize: 24,
  fontFamily: 'Microsoft YaHei, sans-serif',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textShadow: true,
  maxLines: 2,
}

// 估算每行可以显示的字符数
const estimateCharsPerLine = (fontSize: number, containerWidth: number): number => {
  const availableWidth = containerWidth - 48 // 减去左右 padding
  const charWidth = fontSize
  return Math.floor(availableWidth / charWidth)
}

export function CaptionOverlay() {
  const [currentText, setCurrentText] = useState('')
  const [isFinalText, setIsFinalText] = useState(false)
  const [style, setStyle] = useState<CaptionStyle>(defaultStyle)
  const [isDraggable, setIsDraggable] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(720)

  // 监听容器宽度变化
  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current) {
        const width = contentRef.current.clientWidth
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width)
        }
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    if (contentRef.current) {
      observer.observe(contentRef.current)
    }
    window.addEventListener('resize', updateWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [containerWidth])

  // 监听字幕文字更新
  useEffect(() => {
    if (!window.electronAPI?.onCaptionTextUpdate) return

    const cleanup = window.electronAPI.onCaptionTextUpdate((data) => {
      const { text, isFinal } = data
      if (text) {
        setCurrentText(text)
        setIsFinalText(isFinal)
      }
    })

    return cleanup
  }, [])

  // 监听字幕样式更新
  useEffect(() => {
    if (!window.electronAPI?.onCaptionStyleUpdate) return

    const cleanup = window.electronAPI.onCaptionStyleUpdate((newStyle) => {
      setStyle(newStyle)
    })

    return cleanup
  }, [])

  // 监听拖拽状态变化
  useEffect(() => {
    if (!window.electronAPI?.onCaptionDraggableChanged) return

    const cleanup = window.electronAPI.onCaptionDraggableChanged((draggable) => {
      setIsDraggable(draggable)
    })

    return cleanup
  }, [])

  // 监听交互状态变化（鼠标悬停检测）
  useEffect(() => {
    if (!window.electronAPI?.onCaptionInteractiveChanged) return

    const cleanup = window.electronAPI.onCaptionInteractiveChanged((interactive) => {
      setIsHovering(interactive)
    })

    return cleanup
  }, [])

  // 切换锁定状态
  const handleToggleLock = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.electronAPI?.captionToggleDraggable) return
    await window.electronAPI.captionToggleDraggable()
  }, [])

  // 拖拽处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return
    
    // 如果点击的是锁按钮，不触发拖拽
    if ((e.target as HTMLElement).closest('.lock-button')) return
    
    setIsDragging(true)
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.screenX - startX
      const deltaY = moveEvent.screenY - startY
      
      window.electronAPI?.captionGetBounds().then((bounds) => {
        if (bounds) {
          window.electronAPI?.captionSetBounds({
            x: bounds.x + deltaX,
            y: bounds.y + deltaY,
          })
        }
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isDraggable])

  // 计算显示行
  const charsPerLine = estimateCharsPerLine(style.fontSize, containerWidth)
  
  const getDisplayLines = useCallback((): string[] => {
    if (!currentText) return []
    
    const lines: string[] = []
    let remaining = currentText
    
    while (remaining.length > 0) {
      lines.push(remaining.slice(0, charsPerLine))
      remaining = remaining.slice(charsPerLine)
    }
    
    return lines.slice(-style.maxLines)
  }, [currentText, charsPerLine, style.maxLines])
  
  const displayLines = getDisplayLines()
  const hasContent = displayLines.length > 0
  const showPlaceholder = !hasContent && !isDraggable

  // 是否显示锁按钮：鼠标悬停时或处于拖拽模式时
  const showLockButton = isHovering || isDraggable

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full flex items-center justify-center relative
        ${isDraggable ? 'cursor-move' : 'cursor-default'}
        ${isDragging ? 'select-none' : ''}
      `}
      onMouseDown={handleMouseDown}
      style={{
        WebkitAppRegion: isDraggable ? 'drag' : 'no-drag',
        padding: '10px',
      } as React.CSSProperties}
    >
      {/* 锁/解锁按钮 - 悬停或拖拽模式时显示 */}
      {showLockButton && (
        <button
          className={`
            lock-button absolute top-2 right-2 z-20
            flex items-center justify-center
            w-7 h-7 rounded-md
            transition-all duration-200
            ${isDraggable 
              ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600' 
              : 'bg-black/60 text-white/80 hover:bg-black/80 hover:text-white'
            }
          `}
          onClick={handleToggleLock}
          title={isDraggable ? '锁定字幕位置' : '解锁以移动字幕'}
          style={{
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          {isDraggable ? (
            <Unlock className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </button>
      )}

      {/* 拖拽模式指示器 */}
      {isDraggable && (
        <div className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-medium shadow-lg z-10">
          <Move className="w-3 h-3" />
          <span>拖拽调整位置</span>
        </div>
      )}

      {/* 字幕内容 */}
      <div
        ref={contentRef}
        className={`
          px-6 py-3 transition-opacity duration-200 relative
          ${showPlaceholder ? 'opacity-0' : 'opacity-100'}
          ${isDraggable ? 'border-2 border-dashed border-blue-400' : ''}
        `}
        style={{
          backgroundColor: style.backgroundColor,
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize}px`,
          color: style.textColor,
          textShadow: style.textShadow 
            ? '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.5)' 
            : 'none',
          width: '90%',
          maxWidth: '90%',
          textAlign: 'left',
          lineHeight: 1.5,
          borderRadius: '12px', // 四个角都是圆角
        }}
      >
        {/* 渲染每一行 */}
        {displayLines.map((line, index) => (
          <div
            key={index}
            style={{
              minHeight: `${style.fontSize * 1.5}px`,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {line}
            {/* 在最后一行且不是最终结果时显示光标 */}
            {index === displayLines.length - 1 && !isFinalText && (
              <span 
                className="inline-block w-0.5 ml-0.5 bg-current animate-pulse" 
                style={{ 
                  height: `${style.fontSize}px`,
                  verticalAlign: 'middle' 
                }} 
              />
            )}
          </div>
        ))}
        
        {/* 拖拽模式下的占位文字 */}
        {isDraggable && !hasContent && (
          <div style={{ minHeight: `${style.fontSize * 1.5}px` }}>
            字幕将显示在这里
          </div>
        )}
      </div>
    </div>
  )
}

export default CaptionOverlay
