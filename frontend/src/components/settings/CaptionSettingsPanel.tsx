import { useState, useEffect, useCallback } from 'react'
import {
  Subtitles,
  RotateCcw,
  Palette,
  Type,
  Maximize2,
  Sun,
} from 'lucide-react'
import { Switch } from '../ui'
import { useSettingsStore } from '../../stores/settingsStore'
import type { CaptionStyle } from '../../types'
import type { Translations } from '../../i18n'

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

interface CaptionSettingsPanelProps {
  t: Translations
}

export function CaptionSettingsPanel({ t }: CaptionSettingsPanelProps) {
  const { settings, availableProviders, updateSettings } = useSettingsStore()
  const [isEnabled, setIsEnabled] = useState(false)
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
  const currentProvider = availableProviders.find((p) => p.id === currentVendor)
  const supportsBilingualCaption = Boolean(currentProvider?.capabilities.supportsTranslation)

  useEffect(() => {
    if (!window.electronAPI?.captionGetStatus) return
    window.electronAPI.captionGetStatus().then((status) => {
      setIsEnabled(status.enabled)
      setStyle(status.style)
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.captionUpdateStyle || !settings.captionStyle) return
    window.electronAPI.captionUpdateStyle(settings.captionStyle).then((updated) => {
      setStyle(updated)
    }).catch(() => {})
  }, [settings.captionStyle])

  useEffect(() => {
    if (!window.electronAPI?.onCaptionStatusChanged) return
    return window.electronAPI.onCaptionStatusChanged((enabled) => setIsEnabled(enabled))
  }, [])

  const handleToggle = useCallback(async () => {
    if (!window.electronAPI?.captionToggle) return
    const newState = await window.electronAPI.captionToggle(undefined, 'settings-caption-toggle')
    setIsEnabled(newState)
  }, [])

  const handleResetPosition = useCallback(async () => {
    if (!window.electronAPI?.captionResetPosition) return
    await window.electronAPI.captionResetPosition()
  }, [])

  const handleStyleChange = useCallback(async (newStyle: Partial<CaptionStyle>) => {
    if (!window.electronAPI?.captionUpdateStyle) return
    const updatedStyle = await window.electronAPI.captionUpdateStyle(newStyle)
    setStyle(updatedStyle)
    updateSettings({ captionStyle: updatedStyle })
  }, [updateSettings])

  useEffect(() => {
    if (supportsBilingualCaption) return
    if ((settings.captionStyle?.displayMode ?? 'source') === 'source') return
    void handleStyleChange({ displayMode: 'source' })
  }, [handleStyleChange, settings.captionStyle?.displayMode, supportsBilingualCaption])

  if (!window.electronAPI?.captionToggle) {
    return (
      <div className="space-y-6">
        <section className="workspace-panel-muted p-4">
          <p className="text-sm text-muted-foreground">{t.caption?.notAvailable || 'Caption is only available in the desktop app.'}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable + Reset */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Subtitles className="w-3.5 h-3.5 text-muted-foreground" />
            {isEnabled ? t.caption?.hideCaption : t.caption?.showCaption}
          </label>
          <Switch checked={isEnabled} onChange={handleToggle} />
        </div>
        {isEnabled && (
          <button
            onClick={handleResetPosition}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.caption?.resetPosition}
          </button>
        )}
      </section>

      {/* Preview */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium">{t.caption?.previewText || 'Preview'}</label>
        <div className="p-4 rounded-xl border border-border" style={{ backgroundColor: style.backgroundColor }}>
          {(style.displayMode ?? 'source') !== 'translated' && (
            <p style={{
              fontFamily: style.fontFamily,
              fontSize: `${Math.min(style.fontSize, 32)}px`,
              color: style.textColor,
              textShadow: style.textShadow ? '2px 2px 4px rgba(0, 0, 0, 0.8)' : 'none',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              {t.caption?.previewText || 'Caption preview'}
            </p>
          )}
          {(style.displayMode ?? 'source') === 'dual' && <div className="my-2 h-px bg-white/20" />}
          {(style.displayMode ?? 'source') !== 'source' && (
            <p style={{
              fontFamily: style.fontFamily,
              fontSize: `${Math.min(style.fontSize, 32)}px`,
              color: '#7dd3fc',
              textShadow: style.textShadow ? '2px 2px 4px rgba(0, 0, 0, 0.8)' : 'none',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              Translated caption preview
            </p>
          )}
        </div>
      </section>

      {/* Display Mode */}
      {supportsBilingualCaption && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Subtitles className="w-3.5 h-3.5 text-muted-foreground" />
            {t.caption?.displayMode}
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
                className={`py-2 rounded-lg font-medium text-sm transition-all border-2 ${
                  (style.displayMode ?? 'source') === option.value
                    ? 'bg-primary/10 text-foreground border-primary'
                    : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Font Size */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Type className="w-3.5 h-3.5 text-muted-foreground" />
          {t.caption?.fontSize}
          <span className="ml-auto font-mono text-xs">{style.fontSize}px</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">16</span>
          <input
            type="range" min="16" max="72"
            value={style.fontSize}
            onChange={(e) => handleStyleChange({ fontSize: parseInt(e.target.value) })}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
          />
          <span className="text-xs text-muted-foreground">72</span>
        </div>
      </section>

      {/* Width */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          {t.caption?.width}
          <span className="ml-auto font-mono text-xs">{style.width}px</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">400</span>
          <input
            type="range" min="400" max="1400" step="20"
            value={style.width}
            onChange={(e) => handleStyleChange({ width: parseInt(e.target.value) })}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
          />
          <span className="text-xs text-muted-foreground">1400</span>
        </div>
      </section>

      {/* Max Lines */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          {t.caption?.maxLines}
          <span className="ml-auto font-mono text-xs">{style.maxLines} {t.caption?.linesUnit || 'lines'}</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => handleStyleChange({ maxLines: num })}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all border-2 ${
                style.maxLines === num
                  ? 'bg-primary/10 text-foreground border-primary'
                  : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </section>

      {/* Font Family */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium">{t.caption?.fontFamily}</label>
        <div className="flex gap-2 overflow-x-auto p-1 -mx-1 no-scrollbar">
          {PRESET_FONTS.map((font) => (
            <button
              key={font.value}
              onClick={() => handleStyleChange({ fontFamily: font.value })}
              className={`px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap border-2 ${
                style.fontFamily === font.value
                  ? 'bg-primary/10 text-foreground border-primary'
                  : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border-transparent'
              }`}
              style={{ fontFamily: font.value }}
            >
              {(t.caption as Record<string, string>)?.[font.key] ?? font.key}
            </button>
          ))}
        </div>
      </section>

      {/* Text Color */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          {t.caption?.textColor}
        </label>
        <div className="flex gap-3 justify-center">
          {PRESET_COLORS.map((color) => {
            const label = (t.caption as Record<string, string>)?.[color.key] ?? color.key
            return (
              <button
                key={color.value}
                onClick={() => handleStyleChange({ textColor: color.value })}
                className={`w-8 h-8 rounded-full transition-all relative border-2 ${
                  style.textColor === color.value
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                    : 'hover:scale-105 border-border hover:border-primary/50'
                }`}
                style={{ backgroundColor: color.value }}
                title={label}
                aria-label={label}
              />
            )
          })}
        </div>
      </section>

      {/* Background Color */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium">{t.caption?.backgroundColor}</label>
        <div className="flex gap-2 overflow-x-auto p-1 -mx-1 no-scrollbar">
          {PRESET_BACKGROUNDS.map((bg) => (
            <button
              key={bg.value}
              onClick={() => handleStyleChange({ backgroundColor: bg.value })}
              className={`px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap border ${
                style.backgroundColor === bg.value
                  ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                  : 'opacity-80 hover:opacity-100 border-border'
              }`}
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
      </section>

      {/* Text Shadow */}
      <section className="workspace-panel-muted p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Sun className={`w-3.5 h-3.5 ${style.textShadow ? 'text-primary' : 'text-muted-foreground'}`} />
            {t.caption?.textShadow}
          </label>
          <Switch
            checked={!!style.textShadow}
            onChange={(val) => handleStyleChange({ textShadow: val })}
            aria-label={style.textShadow ? 'Disable text shadow' : 'Enable text shadow'}
          />
        </div>
      </section>
    </div>
  )
}
