import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Settings, Waves } from 'lucide-react'
import { useUIStore } from './stores/uiStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSessionStore } from './stores/sessionStore'
import { useTagStore } from './stores/tagStore'
import { buildProviderConnectConfig, isProviderConfigured } from './utils/providerConfig'
import { 
  ApiKeyConfig, 
  TranscriptDisplay, 
  RecordingControls, 
  HistoryPanel,
  ToastContainer,
  AnimatedThemeToggler,
  SourcePicker,
  TitleBar,
  CaptionControls,
  type ToastMessage 
} from './components'
import { Badge } from './components/ui'
import { StatusIndicator } from './components/ui'
import { UpdateNotification } from './components/UpdateNotification'
import { ReviewDeskView } from './components/ReviewDeskView'
import { initStorage } from './utils/storage'

function App() {
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const { initTheme, language, t, currentView, setView, backToLive } = useUIStore()
  const { loadSettings, settings, availableProviders } = useSettingsStore()
  const {
    loadSessions,
    recoverySession,
    restoreRecoverySession,
    dismissRecoverySession,
    recordingState,
    sessions,
  } = useSessionStore()
  const { loadTags } = useTagStore()
  const hasCheckedApiKey = useRef(false)

  // 初始化加载
  useEffect(() => {
    let cancelled = false

    void (async () => {
      await initStorage()
      initTheme()
      loadSettings()
      loadTags()
      await loadSessions()

      if (!cancelled) {
        setIsInitialized(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initTheme, loadSettings, loadSessions, loadTags])

  // 启动时自动检查更新（根据设置）
  useEffect(() => {
    if (!isInitialized) return
    
    // 默认启用自动检查更新，除非用户明确禁用
    const autoCheckUpdate = settings.autoCheckUpdate !== false
    const supportsAutoUpdate = !!window.electronAPI?.supportsAutoUpdate
    
    if (autoCheckUpdate && supportsAutoUpdate && window.electronAPI?.checkForUpdates) {
      // 延迟 3 秒检查更新，避免影响启动性能
      const timer = setTimeout(() => {
        window.electronAPI?.checkForUpdates().catch((err) => {
          console.error('自动检查更新失败:', err)
        })
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isInitialized, settings.autoCheckUpdate])

  // 监听 Electron 的源选择器请求
  useEffect(() => {
    if (window.electronAPI?.onShowSourcePicker) {
      const cleanup = window.electronAPI.onShowSourcePicker(() => {
        setShowSourcePicker(true)
      })
      return cleanup
    }
  }, [])

  // 检查当前提供商是否已配置
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const currentConfig = settings.providerConfigs?.[currentVendor]
  const normalizedConfig = buildProviderConnectConfig(currentProvider, currentConfig, settings)
  const hasApiKey = isProviderConfigured(currentProvider, normalizedConfig)

  // 只在初始化完成后检查一次是否需要弹出设置窗口
  useEffect(() => {
    if (isInitialized && !hasCheckedApiKey.current) {
      hasCheckedApiKey.current = true
      if (!hasApiKey) {
        setView('settings')
      }
    }
  }, [isInitialized, hasApiKey, setView])

  // Toast 管理
  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleError = useCallback((message: string) => {
    addToast('error', message)
  }, [addToast])

  // 检测是否在 Electron 环境中
  const isElectron = !!window.electronAPI?.isElectron
  const copy = language === 'zh'
    ? {
      notConfigured: '未完成配置',
      statusIdle: '待命',
      statusStarting: '正在启动',
      statusRecording: '录制中',
      statusStopping: '正在停止',
      captionsUnavailable: '字幕不可用（仅桌面端）',
    }
    : {
      notConfigured: 'Not configured',
      statusIdle: 'Idle',
      statusStarting: 'Starting',
      statusRecording: 'Recording',
      statusStopping: 'Stopping',
      captionsUnavailable: 'Captions unavailable (desktop only)',
    }

  const recordingStateLabel = (() => {
    if (recordingState === 'recording') return copy.statusRecording
    if (recordingState === 'starting') return copy.statusStarting
    if (recordingState === 'stopping') return copy.statusStopping
    return copy.statusIdle
  })()

  const statusType = (() => {
    if (recordingState === 'recording') return 'recording' as const
    if (recordingState === 'starting') return 'starting' as const
    if (recordingState === 'stopping') return 'stopping' as const
    return 'idle' as const
  })()

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TitleBar />

      {/* Compact header: brand + status badges + actions */}
      <header className={`sticky z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 ${isElectron ? 'top-8' : 'top-0'}`}>
        <div className="container mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Waves className="h-4 w-4" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">{t.app.name}</h1>
            <div className="hidden items-center gap-2 sm:flex">
              <Badge>{currentProvider?.name || copy.notConfigured}</Badge>
              <Badge>
                <StatusIndicator status={statusType} />
                {recordingStateLabel}
              </Badge>
              <Badge>{sessions.length} sessions</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isElectron && <CaptionControls />}
            <AnimatedThemeToggler />
            <button
              onClick={() => setView('settings')}
              className={`
                inline-flex items-center justify-center rounded-md text-sm font-medium
                ring-offset-background transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                h-9 px-3 gap-2 active:scale-[0.97]
                ${!hasApiKey
                  ? 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
              `}
              aria-label={hasApiKey ? 'Open settings' : 'Configure API'}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{hasApiKey ? t.common.settings : t.common.configureApi}</span>
            </button>
          </div>
        </div>
      </header>

      {currentView === 'settings' ? (
        <main id="app-main" className="flex-1 overflow-hidden">
          <ApiKeyConfig isOpen mode="view" onClose={backToLive} />
        </main>
      ) : currentView === 'review' ? (
        <main id="app-main" className="flex-1 overflow-hidden">
          <ReviewDeskView />
        </main>
      ) : (
        <main id="app-main" className="container mx-auto max-w-[1500px] px-4 pb-8 pt-4 sm:px-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              {isInitialized && !hasApiKey && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div className="rounded-full bg-warning/10 p-1.5 text-warning">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">{t.api.needConfig}</h3>
                    <p className="text-xs text-muted-foreground">{t.api.needConfigDesc}</p>
                  </div>
                </div>
              )}

              {isInitialized && recordingState === 'idle' && recoverySession && (
                <div className="flex flex-col gap-3 rounded-xl border border-info/30 bg-info/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-info/10 p-1.5 text-info">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-foreground">{t.session.recoveryTitle}</h3>
                      <p className="text-xs text-muted-foreground">{t.session.recoveryDesc(recoverySession.title)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { restoreRecoverySession(); addToast('success', t.session.recoveredToast) }}
                      className="inline-flex h-8 items-center rounded-md bg-info px-3 text-xs font-medium text-white hover:bg-info/90"
                    >
                      {t.session.restoreInterrupted}
                    </button>
                    <button
                      onClick={() => { dismissRecoverySession(); addToast('success', t.session.dismissedToast) }}
                      className="inline-flex h-8 items-center rounded-md border border-info/30 bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-info/10"
                    >
                      {t.session.dismissInterrupted}
                    </button>
                  </div>
                </div>
              )}

              <TranscriptDisplay contentHeightClassName="h-[min(60vh,48rem)] min-h-[32rem]" />

              <div className="workspace-panel p-5">
                <RecordingControls onError={handleError} />
              </div>
            </div>

            <aside>
              <HistoryPanel variant="rail" />
            </aside>
          </div>
        </main>
      )}

      {window.electronAPI && (
        <SourcePicker
          isOpen={showSourcePicker}
          onSelect={async (sourceId) => {
            const success = await window.electronAPI?.selectSource(sourceId)
            setShowSourcePicker(false)
            if (!success) addToast('error', t.sourcePicker.selectFailed)
          }}
          onCancel={() => {
            window.electronAPI?.cancelSourceSelection()
            setShowSourcePicker(false)
          }}
        />
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
      <UpdateNotification />
    </div>
  )
}

export default App
