import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Waves } from 'lucide-react'
import { useTranscriptStore } from './stores/transcriptStore'
import { 
  ApiKeyConfig, 
  TranscriptDisplay, 
  RecordingControls, 
  HistoryPanel,
  ToastContainer,
  AnimatedThemeToggler,
  SourcePicker,
  TitleBar,
  type ToastMessage 
} from './components'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const { loadSessions, loadSettings, loadTags, settings, initTheme } = useTranscriptStore()
  const hasCheckedApiKey = useRef(false)

  // 初始化加载
  useEffect(() => {
    initTheme()
    loadSettings()
    loadSessions()
    loadTags()
    setIsInitialized(true)
  }, [initTheme, loadSettings, loadSessions, loadTags])

  // 监听 Electron 的源选择器请求
  useEffect(() => {
    if (window.electronAPI?.onShowSourcePicker) {
      const cleanup = window.electronAPI.onShowSourcePicker(() => {
        setShowSourcePicker(true)
      })
      return cleanup
    }
  }, [])

  // 只在初始化完成后检查一次是否需要弹出设置窗口
  useEffect(() => {
    if (isInitialized && !hasCheckedApiKey.current) {
      hasCheckedApiKey.current = true
      // 只有当本地确实没有保存API密钥时才弹出设置窗口
      if (!settings.apiKey) {
        setShowSettings(true)
      }
    }
  }, [isInitialized, settings.apiKey])

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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* 自定义标题栏 - 仅 Electron */}
      <TitleBar />
      
      {/* 头部 - 使用玻璃拟态效果 */}
      <header className={`sticky z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isElectron ? 'top-8 mt-8' : 'top-0'}`}>
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Waves className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-bold leading-none tracking-tight">DeLive</h1>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">桌面音频实时转录</p>
              </div>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-2">
              {/* 主题切换按钮 */}
              <AnimatedThemeToggler />
              
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(true)}
                className={`
                  inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                  h-9 px-4 py-2
                  ${!settings.apiKey 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }
                `}
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>{settings.apiKey ? '设置' : '配置 API'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* API 未配置提示 */}
        {isInitialized && !settings.apiKey && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <Settings className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium leading-none tracking-tight text-amber-900 dark:text-amber-200">
                  需要配置 API 密钥
                </h3>
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  请点击右上角的"配置 API"按钮，输入你的 Soniox API 密钥以开始使用。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 转录显示区域 - 占据主要视觉 */}
        <section className="space-y-4">
          <TranscriptDisplay />
        </section>

        {/* 录制控制 */}
        <section className="flex justify-center py-4">
          <RecordingControls onError={handleError} />
        </section>

        {/* 历史记录 */}
        <section className="space-y-4">
          <HistoryPanel />
        </section>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-border/40 bg-muted/40 mt-auto">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Open Source on <a href="https://github.com/XimilalaXiang/DeLive" target="_blank" rel="noopener noreferrer" 
                         className="font-medium underline underline-offset-4 hover:text-primary transition-colors">GitHub</a>
          </p>
        </div>
      </footer>

      {/* API 设置弹窗 */}
      <ApiKeyConfig 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* 源选择器弹窗 (仅 Electron 环境) */}
      {window.electronAPI && (
        <SourcePicker
          isOpen={showSourcePicker}
          onSelect={async (sourceId) => {
            const success = await window.electronAPI?.selectSource(sourceId)
            setShowSourcePicker(false)
            if (!success) {
              addToast('error', '选择源失败')
            }
          }}
          onCancel={() => {
            window.electronAPI?.cancelSourceSelection()
            setShowSourcePicker(false)
          }}
        />
      )}

      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default App
