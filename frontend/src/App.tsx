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
  type ToastMessage 
} from './components'

function App() {
  const [showSettings, setShowSettings] = useState(false)
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

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* 头部 */}
      <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">DesktopLive</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">桌面音频实时转录</p>
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
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                  ${settings.apiKey 
                    ? 'text-zinc-600 hover:bg-surface-100 dark:text-zinc-400 dark:hover:bg-surface-800' 
                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
                  }
                `}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">
                  {settings.apiKey ? 'API 设置' : '配置 API'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* API 未配置提示 - 只在初始化完成后且确实没有API密钥时显示 */}
        {isInitialized && !settings.apiKey && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
              <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">需要配置 API 密钥</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                请点击右上角的"配置 API"按钮，输入你的 Soniox API 密钥以开始使用。
              </p>
            </div>
          </div>
        )}

        {/* 转录显示区域 */}
        <TranscriptDisplay />

        {/* 录制控制 */}
        <RecordingControls onError={handleError} />

        {/* 历史记录 */}
        <HistoryPanel />
      </main>

      {/* 页脚 */}
      <footer className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            Powered by <a href="https://soniox.com" target="_blank" rel="noopener noreferrer" 
                         className="text-primary-600 dark:text-primary-400 hover:underline">Soniox</a> Speech-to-Text API
          </p>
        </div>
      </footer>

      {/* API 设置弹窗 */}
      <ApiKeyConfig 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default App
