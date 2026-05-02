import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Settings } from 'lucide-react'
import { useUIStore } from './stores/uiStore'
import { useSettingsStore } from './stores/settingsStore'
import { useSessionStore } from './stores/sessionStore'
import { useTagStore } from './stores/tagStore'
import { useTopicStore } from './stores/topicStore'
import { useASR } from './hooks/useASR'
import { useApiIpcResponder } from './hooks/useApiIpcResponder'
import { useSidebarState } from './hooks/useSidebarState'
import { useCaptionToggle } from './hooks/useCaptionToggle'
import { buildProviderConnectConfig, isProviderConfigured } from './utils/providerConfig'
import { getWhatsNewForVersion, getAllWhatsNew } from './utils/whatsNew'
import { 
  ApiKeyConfig, 
  TranscriptDisplay, 
  RecordingControls, 
  ToastContainer,
  SourcePicker,
  TitleBar,
  type ToastMessage 
} from './components'
import { Sidebar } from './components/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { UpdateNotification } from './components/UpdateNotification'
import { WhatsNewDialog } from './components/WhatsNewDialog'
import { ReviewDeskView } from './components/ReviewDeskView'
import { TopicsView } from './components/TopicsView'
import { TopicPicker } from './components/TopicPicker'
import { FileTranscriptionView } from './components/FileTranscriptionView'
import { initStorage } from './utils/storage'

function App() {
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const { initTheme, t, currentView, setView, backToLive } = useUIStore()
  const { loadSettings, settings, availableProviders } = useSettingsStore()
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarState()
  const { enabled: captionEnabled, toggle: toggleCaption } = useCaptionToggle()
  const {
    loadSessions,
    recoverySession,
    restoreRecoverySession,
    dismissRecoverySession,
    recordingState,
  } = useSessionStore()
  const { loadTags } = useTagStore()
  const { loadTopics } = useTopicStore()
  const hasCheckedApiKey = useRef(false)
  const prevRecordingState = useRef(recordingState)
  const [lastFinishedSessionId, setLastFinishedSessionId] = useState<string | null>(null)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [whatsNewShowAll, setWhatsNewShowAll] = useState(false)

  useEffect(() => {
    if (prevRecordingState.current === 'recording' && recordingState === 'idle') {
      const sessions = useSessionStore.getState().sessions
      if (sessions.length > 0) {
        setLastFinishedSessionId(sessions[0].id)
      }
    }
    prevRecordingState.current = recordingState
  }, [recordingState])

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

  useApiIpcResponder()

  // ASR — lifted to App so global shortcut can reach it
  const { startRecording, stopRecording, switchConfig, switchProvider } = useASR({
    onError: handleError,
    onStarted: () => console.log('[App] Recording started'),
  })

  // Global shortcut: toggle recording from Electron
  useEffect(() => {
    if (!window.electronAPI?.onToggleRecording) return
    return window.electronAPI.onToggleRecording(() => {
      const state = useSessionStore.getState().recordingState
      if (state === 'idle') {
        startRecording()
      } else if (state === 'recording') {
        stopRecording()
      }
    })
  }, [startRecording, stopRecording])

  // 初始化加载
  useEffect(() => {
    let cancelled = false

    void (async () => {
      await initStorage()
      initTheme()
      loadSettings()
      loadTags()
      loadTopics()
      await loadSessions()

      if (!cancelled) {
        setIsInitialized(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initTheme, loadSettings, loadSessions, loadTags])

  // 初始化完成后同步字幕样式到主进程，确保字幕窗口使用用户保存的样式
  useEffect(() => {
    if (!isInitialized) return
    if (!window.electronAPI?.captionUpdateStyle) return
    const saved = useSettingsStore.getState().settings.captionStyle
    if (saved) {
      void window.electronAPI.captionUpdateStyle(saved)
    }
  }, [isInitialized])

  // 版本更新后自动弹出 What's New
  useEffect(() => {
    if (!isInitialized) return
    void (async () => {
      const version = await window.electronAPI?.getAppVersion?.() ?? __APP_VERSION__
      if (!version) return
      const lastSeen = localStorage.getItem('delive_last_seen_version')
      const majorVersion = version.replace(/-.*$/, '')
      if (lastSeen !== majorVersion && getWhatsNewForVersion(version)) {
        setWhatsNewOpen(true)
        setWhatsNewShowAll(false)
      }
      localStorage.setItem('delive_last_seen_version', majorVersion)
    })()
  }, [isInitialized])

  // 启动时自动检查更新（根据设置）
  useEffect(() => {
    if (!isInitialized) return
    
    const autoCheckUpdate = settings.autoCheckUpdate !== false
    const supportsAutoUpdate = !!window.electronAPI?.supportsAutoUpdate
    
    if (autoCheckUpdate && supportsAutoUpdate && window.electronAPI?.checkForUpdates) {
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

  const isElectron = !!window.electronAPI?.isElectron

  const sidebarWidth = sidebarCollapsed ? 56 : 224

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      <TitleBar recordingState={recordingState} onClickRec={() => setView('live')} />
      <CommandPalette />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        currentView={currentView}
        onNavigate={setView}
        recordingState={recordingState}
        captionEnabled={captionEnabled}
        onToggleCaption={toggleCaption}
        onOpenCaptionSettings={() => { /* Phase 5: open caption settings panel */ }}
      />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          marginLeft: sidebarWidth,
          marginTop: isElectron ? 32 : 0,
        }}
      >
        {/* Settings */}
        {currentView === 'settings' && (
          <div className="flex-1 overflow-hidden animate-view-enter">
            <ApiKeyConfig
              isOpen
              mode="view"
              onClose={backToLive}
              onViewChangelog={() => { setWhatsNewShowAll(true); setWhatsNewOpen(true) }}
            />
          </div>
        )}

        {/* Review */}
        {currentView === 'review' && (
          <div className="flex-1 overflow-hidden animate-view-enter">
            <ReviewDeskView />
          </div>
        )}

        {/* Topics */}
        {currentView === 'topics' && (
          <div className="flex-1 overflow-hidden animate-view-enter">
            <TopicsView />
          </div>
        )}

        {/* File Transcription */}
        {currentView === 'file' && (
          <div className="flex-1 overflow-hidden animate-view-enter">
            <FileTranscriptionView />
          </div>
        )}

        {/* Live — always mounted, hidden when not active */}
        <main
          id="app-main"
          className={`flex-1 overflow-y-auto ${currentView === 'live' ? '' : 'hidden'}`}
        >
          <div className={`container mx-auto max-w-5xl px-4 pb-8 sm:px-6 ${recordingState === 'idle' ? 'min-h-full flex flex-col justify-center' : 'pt-4'}`}>
            <div className="space-y-6">
              {isInitialized && !hasApiKey && recordingState === 'idle' && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3 text-center">
                  <h3 className="text-lg font-semibold text-foreground">{t.live?.welcomeTitle || t.api.needConfig}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{t.live?.welcomeDesc || t.api.needConfigDesc}</p>
                  <button
                    onClick={() => setView('settings')}
                    className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    {t.live?.goToSettings || t.common.settings}
                  </button>
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    {t.live?.welcomeLocalHint}
                  </p>
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

              {lastFinishedSessionId && recordingState === 'idle' && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-5 flex flex-col sm:flex-row items-center gap-3 animate-reveal-up">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-medium text-foreground">{t.live?.sessionSaved || 'Session saved'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { useUIStore.getState().openReview(lastFinishedSessionId); setLastFinishedSessionId(null) }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t.live?.viewDetails || 'View Details'}
                    </button>
                    <button
                      onClick={() => setLastFinishedSessionId(null)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {t.live?.recordAgain || 'Record Again'}
                    </button>
                  </div>
                </div>
              )}

              <div className="animate-reveal-up delay-1">
                <TranscriptDisplay contentHeightClassName="h-[min(50vh,36rem)] min-h-[24rem]" />
              </div>

              <div className="workspace-panel p-5 animate-reveal-up delay-2 space-y-3">
                {recordingState === 'idle' && <TopicPicker />}
                <RecordingControls onError={handleError} startRecording={startRecording} stopRecording={stopRecording} switchConfig={switchConfig} switchProvider={switchProvider} />
              </div>
            </div>
          </div>
        </main>
      </div>

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
      <WhatsNewDialog
        open={whatsNewOpen}
        onClose={() => setWhatsNewOpen(false)}
        entry={getWhatsNewForVersion(__APP_VERSION__) ?? null}
        allEntries={getAllWhatsNew()}
        showAll={whatsNewShowAll}
      />
    </div>
  )
}

export default App
