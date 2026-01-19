import { useState, useEffect, useCallback } from 'react'
import { Settings, Waves } from 'lucide-react'
import { useTranscriptStore } from './stores/transcriptStore'
import { 
  ApiKeyConfig, 
  TranscriptDisplay, 
  RecordingControls, 
  HistoryPanel,
  ToastContainer,
  type ToastMessage 
} from './components'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const { loadSessions, loadSettings, settings } = useTranscriptStore()

  // 初始化加载
  useEffect(() => {
    loadSettings()
    loadSessions()
  }, [loadSettings, loadSessions])

  // 首次使用时自动打开设置
  useEffect(() => {
    if (!settings.apiKey) {
      setShowSettings(true)
    }
  }, [settings.apiKey])

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
    <div className="min-h-screen bg-surface-50">
      {/* 头部 */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-800">DesktopLive</h1>
                <p className="text-xs text-zinc-500">桌面音频实时转录</p>
              </div>
            </div>

            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(true)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${settings.apiKey 
                  ? 'text-zinc-600 hover:bg-surface-100' 
                  : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
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
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* API 未配置提示 */}
        {!settings.apiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1 bg-amber-100 rounded-lg">
              <Settings className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">需要配置 API 密钥</h3>
              <p className="text-sm text-amber-700 mt-1">
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
      <footer className="border-t border-surface-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs text-zinc-400">
            Powered by <a href="https://soniox.com" target="_blank" rel="noopener noreferrer" 
                         className="text-primary-600 hover:underline">Soniox</a> Speech-to-Text API
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
