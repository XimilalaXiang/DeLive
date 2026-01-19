import { useState, useEffect } from 'react'
import { Monitor, AppWindow, X, Loader2, RefreshCw } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'

// 使用全局定义的 DesktopSource 类型

interface SourcePickerProps {
  isOpen: boolean
  onSelect: (sourceId: string) => void
  onCancel: () => void
}

export function SourcePicker({ isOpen, onSelect, onCancel }: SourcePickerProps) {
  const { t } = useTranscriptStore()
  const [sources, setSources] = useState<DesktopSource[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 加载桌面源
  const loadSources = async () => {
    if (!window.electronAPI?.getDesktopSources) return
    
    setLoading(true)
    try {
      const desktopSources = await window.electronAPI.getDesktopSources()
      setSources(desktopSources)
      // 默认选中第一个屏幕
      const firstScreen = desktopSources.find((s: DesktopSource) => s.isScreen)
      if (firstScreen) {
        setSelectedId(firstScreen.id)
      }
    } catch (error) {
      console.error(t.sourcePicker.loadFailed, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSources()
    } else {
      setSources([])
      setSelectedId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const screens = sources.filter(s => s.isScreen)
  const windows = sources.filter(s => !s.isScreen)

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t.sourcePicker.title}</h2>
              <p className="text-xs text-muted-foreground">{t.sourcePicker.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSources}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              title={t.sourcePicker.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">{t.sourcePicker.loading}</p>
            </div>
          ) : (
            <>
              {/* 屏幕部分 */}
              {screens.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    {t.sourcePicker.screens} ({screens.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {screens.map(source => (
                      <button
                        key={source.id}
                        onClick={() => setSelectedId(source.id)}
                        className={`group relative rounded-lg overflow-hidden border-2 transition-all
                                  ${selectedId === source.id 
                                    ? 'border-primary ring-2 ring-primary/20' 
                                    : 'border-border hover:border-primary/50'
                                  }`}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-full aspect-video object-cover bg-muted"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-white text-sm font-medium truncate">
                            {source.name}
                          </p>
                        </div>
                        {selectedId === source.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 窗口部分 */}
              {windows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <AppWindow className="w-4 h-4" />
                    {t.sourcePicker.windows} ({windows.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {windows.map(source => (
                      <button
                        key={source.id}
                        onClick={() => setSelectedId(source.id)}
                        className={`group relative rounded-lg overflow-hidden border-2 transition-all
                                  ${selectedId === source.id 
                                    ? 'border-primary ring-2 ring-primary/20' 
                                    : 'border-border hover:border-primary/50'
                                  }`}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-full aspect-video object-cover bg-muted"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="flex items-center gap-1.5">
                            {source.appIcon && (
                              <img src={source.appIcon} alt="" className="w-4 h-4" />
                            )}
                            <p className="text-white text-xs font-medium truncate flex-1">
                              {source.name}
                            </p>
                          </div>
                        </div>
                        {selectedId === source.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sources.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t.sourcePicker.noSources}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {t.sourcePicker.captureHint}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedId}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.sourcePicker.startCapture}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
