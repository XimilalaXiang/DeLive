import { useState, useRef, useEffect } from 'react'
import { Settings, Eye, EyeOff, Check, X, Key, Download, Upload, AlertCircle, Power } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportAllData, validateBackupData, importDataOverwrite, importDataMerge } from '../utils/storage'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { settings, updateSettings, loadSessions, loadTags } = useTranscriptStore()
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [languageHints, setLanguageHints] = useState(settings.languageHints.join(', '))
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载开机自启动状态（仅 Electron 环境）
  useEffect(() => {
    if (isOpen && window.electronAPI?.getAutoLaunch) {
      window.electronAPI.getAutoLaunch().then(setAutoLaunch)
    }
  }, [isOpen])

  // 切换开机自启动
  const handleAutoLaunchChange = async (enable: boolean) => {
    if (window.electronAPI?.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(enable)
      setAutoLaunch(result)
    }
  }

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

  // 导出数据
  const handleExport = () => {
    exportAllData()
    setImportMessage({ type: 'success', text: '数据已导出' })
    setTimeout(() => setImportMessage(null), 3000)
  }

  // 触发文件选择
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  // 处理文件导入
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!validateBackupData(data)) {
        setImportMessage({ type: 'error', text: '无效的备份文件格式' })
        return
      }

      // 询问导入模式
      const mode = confirm(
        `检测到备份文件包含 ${data.sessions.length} 条会话和 ${data.tags.length} 个标签。\n\n` +
        `点击"确定"将覆盖现有数据\n` +
        `点击"取消"将合并数据（保留现有，添加新数据）`
      )

      if (mode) {
        // 覆盖模式
        const result = importDataOverwrite(data)
        setImportMessage({ 
          type: 'success', 
          text: `已导入 ${result.sessions} 条会话和 ${result.tags} 个标签` 
        })
      } else {
        // 合并模式
        const result = importDataMerge(data)
        setImportMessage({ 
          type: 'success', 
          text: `已合并数据：新增 ${result.newSessions} 条会话和 ${result.newTags} 个标签` 
        })
      }

      // 刷新store中的数据
      loadSessions()
      loadTags()
    } catch {
      setImportMessage({ type: 'error', text: '文件解析失败，请确保是有效的JSON文件' })
    }

    // 清空文件输入，允许再次选择同一文件
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">API 设置</h2>
              <p className="text-xs text-muted-foreground">配置 Soniox API 连接</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* API Key 输入 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              Soniox API 密钥
            </label>
            <div className="relative group">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 Soniox API 密钥"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              在 <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" 
                   className="text-primary font-medium hover:underline underline-offset-2">console.soniox.com</a> 获取你的 API 密钥
            </p>
          </div>

          {/* 语言提示 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              语言提示 (Language Hints)
            </label>
            <input
              type="text"
              value={languageHints}
              onChange={(e) => setLanguageHints(e.target.value)}
              placeholder="zh, en"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground">
              用逗号分隔的语言代码，例如: zh, en, ja, ko
            </p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 数据管理 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              数据管理
            </label>
            <p className="text-[10px] text-muted-foreground">
              导出数据以备份或迁移到其他设备，导入时可选择覆盖或合并现有数据
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                         border border-input bg-background hover:bg-accent hover:text-accent-foreground
                         rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                导出数据
              </button>
              <button
                onClick={handleImportClick}
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                         border border-input bg-background hover:bg-accent hover:text-accent-foreground
                         rounded-md transition-colors"
              >
                <Upload className="w-4 h-4" />
                导入数据
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            {/* 导入结果提示 */}
            {importMessage && (
              <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                importMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {importMessage.type === 'success' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {importMessage.text}
              </div>
            )}
          </div>

          {/* 开机自启动（仅 Electron 环境显示） */}
          {window.electronAPI && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <Power className="w-3.5 h-3.5 text-muted-foreground" />
                  启动设置
                </label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">开机自动启动</p>
                    <p className="text-[10px] text-muted-foreground">系统启动时自动运行并最小化到托盘</p>
                  </div>
                  <button
                    onClick={() => handleAutoLaunchChange(!autoLaunch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              ${autoLaunch ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                                ${autoLaunch ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2"
          >
            <Check className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
