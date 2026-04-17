/**
 * 字幕控制组件
 * 用于在主应用中控制字幕窗口的显示和样式
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
import { Switch } from './ui'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { CaptionStyle } from '../types'

const PRESET_COLORS = [
  { key: 'colorWhite' as const, value: '#ffffff' },
  { key: 'colorYellow' as const, value: '#ffd700' },
  { key: 'colorGreen' as const, value: '#00ff00' },
  { key: 'colorCyan' as const, value: '#00ffff' },
  { key: 'colorPink' as const, value: '#ff69b4' },
]

const PRESET_BACKGROUNDS = [
  { key: 'bgSemiBlack' as const, value: 'rgba(0, 0, 0, 0.7)' },
  { key: 'bgDark' as const, value: 'rgba(0, 0, 0, 0.9)' },
  { key: 'bgTransparent' as const, value: 'rgba(0, 0, 0, 0)' },
  { key: 'bgSemiBlue' as const, value: 'rgba(0, 0, 100, 0.7)' },
  { key: 'bgSemiPurple' as const, value: 'rgba(75, 0, 130, 0.7)' },
]

const PRESET_FONTS = [
  { key: 'fontSystem' as const, value: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", sans-serif' },
  { key: 'fontHei' as const, value: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif' },
  { key: 'fontSong' as const, value: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif' },
  { key: 'fontKai' as const, value: 'KaiTi, "Kaiti SC", serif' },
  { key: 'fontMono' as const, value: '"SF Mono", Consolas, "Liberation Mono", monospace' },
]

interface CaptionControlsProps {
  className?: string
}

export function CaptionControls({ className = '' }: CaptionControlsProps) {
  const { t } = useUIStore()
  const { settings, availableProviders, updateSettings } = useSettingsStore()
  const [isEnabled, setIsEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [style, setStyle] = useState<CaptionStyle>({
    fontSize: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif',
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textShadow: true,
    maxLines: 2,
    width: 800,
    displayMode: 'source',
  })
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find((provider) => provider.id === currentVendor)
  const supportsBilingualCaption = Boolean(currentProvider?.capabilities.supportsTranslation)

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
    const newState = await window.electronAPI.captionToggle(undefined, 'main-caption-controls-toggle')
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

  useEffect(() => {
    if (supportsBilingualCaption) {
      return
    }

    if ((settings.captionStyle?.displayMode ?? 'source') === 'source') {
      return
    }

    void handleStyleChange({ displayMode: 'source' })
  }, [handleStyleChange, settings.captionStyle?.displayMode, supportsBilingualCaption])

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
            transition-all duration-200 active:scale-[0.97]
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
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-all duration-200 active:scale-[0.97]"
              title={t.caption?.resetPosition}
              aria-label="Reset caption position"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`
                p-2 rounded-lg transition-all duration-200 active:scale-[0.97]
                ${showSettings
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
                }
              `}
              title={t.caption?.settings}
              aria-label="Caption settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* 设置面板 - Portal 到 body 避免层叠上下文遮挡 */}
      {showSettings && isEnabled && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="caption-settings-title"
            className="relative w-[420px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl dark:ring-1 dark:ring-white/[0.08] bg-card border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-card border-b border-border">
              <h3 id="caption-settings-title" className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Subtitles className="w-5 h-5 text-primary" />
                {t.caption?.styleSettings}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label={t.common.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 字幕预览 */}
              <div
                className="p-4 rounded-xl border border-border"
                style={{
                  backgroundColor: style.backgroundColor,
                }}
              >
                {(style.displayMode ?? 'source') !== 'translated' && (
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
                    {t.caption?.previewText || 'Caption preview'}
                  </p>
                )}
                {(style.displayMode ?? 'source') === 'dual' && (
                  <div className="my-2 h-px bg-white/20" />
                )}
                {(style.displayMode ?? 'source') !== 'source' && (
                  <p
                    style={{
                      fontFamily: style.fontFamily,
                      fontSize: `${Math.min(style.fontSize, 32)}px`,
                      color: '#7dd3fc',
                      textShadow: style.textShadow
                        ? '2px 2px 4px rgba(0, 0, 0, 0.8)'
                        : 'none',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}
                  >
                    Translated caption preview
                  </p>
                )}
              </div>

              {supportsBilingualCaption && (
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Subtitles className="w-4 h-4 text-muted-foreground" />
                    <span>{t.caption?.displayMode}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'source', label: t.caption?.modeSource },
                      { value: 'translated', label: t.caption?.modeTranslated },
                      { value: 'dual', label: t.caption?.modeDual },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleStyleChange({ displayMode: option.value as CaptionStyle['displayMode'] })}
                        className={`
                          py-2 rounded-lg font-medium text-sm transition-all border-2
                          ${(style.displayMode ?? 'source') === option.value
                            ? 'bg-primary/10 text-foreground border-primary'
                            : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 字体大小 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.fontSize}</span>
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
                  <span>{t.caption?.width}</span>
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
                  <span>{t.caption?.maxLines}</span>
                  <span className="ml-auto font-mono">{style.maxLines} {t.caption?.linesUnit || 'lines'}</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleStyleChange({ maxLines: num })}
                      className={`
                        flex-1 py-2 rounded-lg font-medium text-sm transition-all relative border-2
                        ${style.maxLines === num
                          ? 'bg-primary/10 text-foreground border-primary'
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
                  {t.caption?.fontFamily}
                </label>
                <div className="flex gap-2 overflow-x-auto p-2 -mx-2 no-scrollbar">
                  {PRESET_FONTS.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleStyleChange({ fontFamily: font.value })}
                      className={`
                        px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap border-2
                        ${style.fontFamily === font.value
                          ? 'bg-primary/10 text-foreground border-primary'
                          : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
                        }
                      `}
                      style={{ fontFamily: font.value }}
                    >
                      {(t.caption as Record<string, string>)?.[font.key] ?? font.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字颜色 */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span>{t.caption?.textColor}</span>
                </label>
                <div className="flex gap-3 justify-center">
                  {PRESET_COLORS.map((color) => {
                    const label = (t.caption as Record<string, string>)?.[color.key] ?? color.key
                    return (
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
                        style={{ backgroundColor: color.value }}
                        title={label}
                        aria-label={label}
                      />
                    )
                  })}
                </div>
              </div>

              {/* 背景颜色 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t.caption?.backgroundColor}
                </label>
                <div className="flex gap-2 overflow-x-auto p-2 -mx-2 no-scrollbar">
                  {PRESET_BACKGROUNDS.map((bg) => (
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
                      {(t.caption as Record<string, string>)?.[bg.key] ?? bg.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字阴影 */}
              <div className="flex items-center justify-between p-4 rounded-xl transition-all border border-border bg-muted hover:bg-accent">
                <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Sun className={`w-4 h-4 ${style.textShadow ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{t.caption?.textShadow}</span>
                </label>
                <Switch
                  checked={!!style.textShadow}
                  onChange={(val) => handleStyleChange({ textShadow: val })}
                  aria-label={style.textShadow ? 'Disable text shadow' : 'Enable text shadow'}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default CaptionControls
