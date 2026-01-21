/**
 * 字幕控制组件
 * 用于在主应用中控制字幕窗口的显示和样式
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  Subtitles, 
  Settings, 
  RotateCcw, 
  Palette,
  Type,
  Maximize2,
  X,
  Sun
} from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import type { CaptionStyle } from '../types'

// 预设颜色
const presetColors = [
  { name: '白色', value: '#ffffff' },
  { name: '黄色', value: '#ffd700' },
  { name: '绿色', value: '#00ff00' },
  { name: '青色', value: '#00ffff' },
  { name: '粉色', value: '#ff69b4' },
]

// 预设背景
const presetBackgrounds = [
  { name: '半透明黑', value: 'rgba(0, 0, 0, 0.7)' },
  { name: '深色', value: 'rgba(0, 0, 0, 0.9)' },
  { name: '透明', value: 'rgba(0, 0, 0, 0)' },
  { name: '半透明蓝', value: 'rgba(0, 0, 100, 0.7)' },
  { name: '半透明紫', value: 'rgba(75, 0, 130, 0.7)' },
]

// 预设字体
const presetFonts = [
  { name: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { name: '黑体', value: 'SimHei, sans-serif' },
  { name: '宋体', value: 'SimSun, serif' },
  { name: '楷体', value: 'KaiTi, serif' },
  { name: '等宽', value: 'Consolas, monospace' },
]

interface CaptionControlsProps {
  className?: string
}

export function CaptionControls({ className = '' }: CaptionControlsProps) {
  const { t, settings, updateSettings } = useTranscriptStore()
  const [isEnabled, setIsEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [style, setStyle] = useState<CaptionStyle>({
    fontSize: 24,
    fontFamily: 'Microsoft YaHei, sans-serif',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textShadow: true,
    maxLines: 2,
    width: 800,
  })

  // 获取初始状态
  useEffect(() => {
    if (!window.electronAPI?.captionGetStatus) return

    window.electronAPI.captionGetStatus().then((status) => {
      setIsEnabled(status.enabled)
      setStyle(status.style)
    })
  }, [])

  // 将已保存的样式同步到主进程（应用启动后保持用户配置）
  useEffect(() => {
    if (!window.electronAPI?.captionUpdateStyle) return
    if (!settings.captionStyle) return

    window.electronAPI.captionUpdateStyle(settings.captionStyle).then((updated) => {
      setStyle(updated)
    }).catch(() => {
      // 忽略同步失败，用户再调整时会重新保存
    })
  }, [settings.captionStyle])

  // 监听字幕状态变化
  useEffect(() => {
    if (!window.electronAPI?.onCaptionStatusChanged) return

    const cleanup = window.electronAPI.onCaptionStatusChanged((enabled) => {
      setIsEnabled(enabled)
    })

    return cleanup
  }, [])

  // 切换字幕显示
  const handleToggle = useCallback(async () => {
    if (!window.electronAPI?.captionToggle) return
    const newState = await window.electronAPI.captionToggle()
    setIsEnabled(newState)
  }, [])

  // 重置位置
  const handleResetPosition = useCallback(async () => {
    if (!window.electronAPI?.captionResetPosition) return
    await window.electronAPI.captionResetPosition()
  }, [])

  // 更新样式
  const handleStyleChange = useCallback(async (newStyle: Partial<CaptionStyle>) => {
    if (!window.electronAPI?.captionUpdateStyle) return
    const updatedStyle = await window.electronAPI.captionUpdateStyle(newStyle)
    setStyle(updatedStyle)
    updateSettings({ captionStyle: updatedStyle })
  }, [updateSettings])

  // 如果不在 Electron 环境，不渲染
  if (!window.electronAPI?.captionToggle) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* 主按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-all duration-200
            ${isEnabled 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-muted text-muted-foreground hover:bg-accent'
            }
          `}
          title={isEnabled ? t.caption?.disable : t.caption?.enable}
        >
          <Subtitles className="w-4 h-4" />
          <span>{isEnabled ? t.caption?.hideCaption : t.caption?.showCaption}</span>
        </button>

        {/* 字幕已启用时显示的额外控制 */}
        {isEnabled && (
          <>
            {/* 重置位置 */}
            <button
              onClick={handleResetPosition}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-all duration-200"
              title={t.caption?.resetPosition}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${showSettings 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-accent'
                }
              `}
              title={t.caption?.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* 设置面板 - 模态框形式 */}
      {showSettings && isEnabled && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
          
          {/* 设置面板内容 */}
          <div 
            className="relative w-[420px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl bg-card border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 - 固定不滚动 */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-card border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Subtitles className="w-5 h-5 text-primary" />
                {t.caption?.styleSettings || '字幕样式设置'}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 字幕预览 */}
              <div 
                className="p-4 rounded-xl border border-border"
                style={{
                  backgroundColor: style.backgroundColor,
                }}
              >
                <p
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: `${Math.min(style.fontSize, 32)}px`,
                    color: style.textColor,
                    textShadow: style.textShadow 
                      ? '2px 2px 4px rgba(0, 0, 0, 0.8)' 
                      : 'none',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  字幕预览效果
                </p>
              </div>

              {/* 字体大小 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.fontSize || '字体大小'}</span>
                  <span className="ml-auto font-mono">{style.fontSize}px</span>
                </label>
                <div className="relative flex items-center">
                  <span className="text-xs text-muted-foreground mr-2">16</span>
                  <input
                    type="range"
                    min="16"
                    max="72"
                    value={style.fontSize}
                    onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                  />
                  <span className="text-xs text-muted-foreground ml-2">72</span>
                </div>
              </div>

              {/* 字幕宽度 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.width || '字幕宽度'}</span>
                  <span className="ml-auto font-mono">{style.width}px</span>
                </label>
                <div className="relative flex items-center">
                  <span className="text-xs text-muted-foreground mr-2">400</span>
                  <input
                    type="range"
                    min="400"
                    max="1400"
                    step="20"
                    value={style.width}
                    onChange={(e) => handleStyleChange({ width: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                  />
                  <span className="text-xs text-muted-foreground ml-2">1400</span>
                </div>
              </div>

              {/* 最大行数 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.maxLines || '最大行数'}</span>
                  <span className="ml-auto font-mono">{style.maxLines} 行</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleStyleChange({ maxLines: num })}
                      className={`
                        flex-1 py-2 rounded-lg font-medium text-sm transition-all relative border-2
                        ${style.maxLines === num 
                          ? 'bg-muted text-foreground border-gray-800 dark:border-white' 
                          : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
                        }
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 字体选择 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t.caption?.fontFamily || '字体'}
                </label>
                <div className="flex gap-2 overflow-x-auto p-2 -mx-2 no-scrollbar">
                  {presetFonts.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleStyleChange({ fontFamily: font.value })}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap border-2
                        ${style.fontFamily === font.value 
                          ? 'bg-muted text-foreground border-gray-800 dark:border-white' 
                          : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
                        }
                      `}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字颜色 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.textColor || '文字颜色'}</span>
                </label>
                <div className="flex gap-3 justify-center">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleStyleChange({ textColor: color.value })}
                      className={`
                        w-8 h-8 rounded-full transition-all relative border-2
                        ${style.textColor === color.value 
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' 
                          : 'hover:scale-105 border-border hover:border-primary/50'
                        }
                      `}
                      style={{ 
                        backgroundColor: color.value,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* 背景颜色 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t.caption?.backgroundColor || '背景颜色'}
                </label>
                <div className="flex gap-2 overflow-x-auto p-2 -mx-2 no-scrollbar">
                  {presetBackgrounds.map((bg) => (
                    <button
                      key={bg.value}
                      onClick={() => handleStyleChange({ backgroundColor: bg.value })}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap border
                        ${style.backgroundColor === bg.value 
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' 
                          : 'opacity-80 hover:opacity-100 border-border'
                        }
                      `}
                      style={{ 
                        backgroundColor: bg.value,
                        color: bg.value.includes('0, 0, 0, 0)') ? 'inherit' : '#fff',
                        borderStyle: bg.value.includes('0, 0, 0, 0)') ? 'dashed' : 'solid',
                      }}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字阴影 */}
              <div className="flex items-center justify-between p-4 rounded-xl transition-all border border-border bg-muted hover:bg-accent">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Sun className={`w-4 h-4 ${style.textShadow ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span>{t.caption?.textShadow || '文字阴影'}</span>
                </label>
                <button
                  onClick={() => handleStyleChange({ textShadow: !style.textShadow })}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-all ring-2
                    ${style.textShadow 
                      ? 'bg-green-500 ring-green-500' 
                      : 'bg-muted-foreground/30 ring-transparent'
                    }
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform bg-white
                      ${style.textShadow 
                        ? 'translate-x-6' 
                        : 'translate-x-1'
                      }
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CaptionControls
