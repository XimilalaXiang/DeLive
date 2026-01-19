import { useState } from 'react'
import { Settings, Eye, EyeOff, Check, X } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { settings, updateSettings } = useTranscriptStore()
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [languageHints, setLanguageHints] = useState(settings.languageHints.join(', '))

  const handleSave = () => {
    const hints = languageHints
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    updateSettings({
      apiKey: apiKey.trim(),
      languageHints: hints.length > 0 ? hints : ['zh', 'en'],
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Settings className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-800">API 设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-5">
          {/* API Key 输入 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Soniox API 密钥
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 Soniox API 密钥"
                className="w-full px-4 py-3 pr-12 border border-surface-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         text-sm font-mono placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 
                         hover:bg-surface-100 rounded transition-colors"
              >
                {showKey ? (
                  <EyeOff className="w-5 h-5 text-zinc-400" />
                ) : (
                  <Eye className="w-5 h-5 text-zinc-400" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              在 <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" 
                   className="text-primary-600 hover:underline">console.soniox.com</a> 获取你的 API 密钥
            </p>
          </div>

          {/* 语言提示 */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              语言提示
            </label>
            <input
              type="text"
              value={languageHints}
              onChange={(e) => setLanguageHints(e.target.value)}
              placeholder="zh, en"
              className="w-full px-4 py-3 border border-surface-300 rounded-lg 
                       focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
            <p className="mt-2 text-xs text-zinc-500">
              用逗号分隔的语言代码，如: zh, en, ja, ko
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-surface-50 border-t border-surface-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 
                     hover:bg-surface-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white 
                     bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
