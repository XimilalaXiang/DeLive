import { useState, useRef, useEffect } from 'react'
import { Settings, Eye, EyeOff, Check, X, Key, Download, Upload, AlertCircle, Power, Globe } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportAllData, validateBackupData, importDataOverwrite, importDataMerge } from '../utils/storage'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { settings, updateSettings, loadSessions, loadTags, t, language, setLanguage } = useTranscriptStore()
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
    setImportMessage({ type: 'success', text: t.settings.dataExported })
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
        setImportMessage({ type: 'error', text: t.settings.invalidBackupFile })
        return
      }

      // 询问导入模式
      const mode = confirm(t.settings.importConfirm(data.sessions.length, data.tags.length))

      if (mode) {
        // 覆盖模式
        const result = importDataOverwrite(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedOverwrite(result.sessions, result.tags)
        })
      } else {
        // 合并模式
        const result = importDataMerge(data)
        setImportMessage({ 
          type: 'success', 
          text: t.settings.importedMerge(result.newSessions, result.newTags)
        })
      }

      // 刷新store中的数据
      loadSessions()
      loadTags()
    } catch {
      setImportMessage({ type: 'error', text: t.settings.importFailed })
    }

    // 清空文件输入，允许再次选择同一文件
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t.settings.title}</h2>
              <p className="text-xs text-muted-foreground">{t.settings.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* API Key 输入 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              {t.settings.apiKey}
            </label>
            <div className="relative group">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t.settings.apiKeyPlaceholder}
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
              {t.settings.apiKeyHint} <a href="https://console.soniox.com" target="_blank" rel="noopener noreferrer" 
                   className="text-primary font-medium hover:underline underline-offset-2">console.soniox.com</a>
            </p>
          </div>

          {/* 语言提示 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t.settings.languageHints}
            </label>
            <input
              type="text"
              value={languageHints}
              onChange={(e) => setLanguageHints(e.target.value)}
              placeholder={t.settings.languageHintsPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground">
              {t.settings.languageHintsDesc}
            </p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 界面语言设置 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              {t.settings.interfaceLanguage}
            </label>
            <p className="text-[10px] text-muted-foreground">
              {t.settings.interfaceLanguageDesc}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('zh')}
                className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
                          ${language === 'zh' 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500 ring-2 ring-green-500/20' 
                            : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                          }`}
              >
                {t.settings.languageChinese}
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all
                          ${language === 'en' 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500 ring-2 ring-green-500/20' 
                            : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                          }`}
              >
                {t.settings.languageEnglish}
              </button>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 数据管理 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              {t.settings.dataManagement}
            </label>
            <p className="text-[10px] text-muted-foreground">
              {t.settings.dataManagementDesc}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                         border border-input bg-background hover:bg-accent hover:text-accent-foreground
                         rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                {t.settings.exportData}
              </button>
              <button
                onClick={handleImportClick}
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 text-sm font-medium
                         border border-input bg-background hover:bg-accent hover:text-accent-foreground
                         rounded-md transition-colors"
              >
                <Upload className="w-4 h-4" />
                {t.settings.importData}
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
                  {t.settings.launchSettings}
                </label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{t.settings.autoLaunch}</p>
                    <p className="text-[10px] text-muted-foreground">{t.settings.autoLaunchDesc}</p>
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
        <div className="flex justify-end gap-3 px-6 py-4 bg-muted/30 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 gap-2"
          >
            <Check className="w-4 h-4" />
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  )
}
