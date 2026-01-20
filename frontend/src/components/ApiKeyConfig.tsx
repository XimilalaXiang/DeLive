import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Eye, EyeOff, Check, X, Key, Download, Upload, AlertCircle, Power, Globe, Cpu, PlayCircle, Loader2, RefreshCw } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { exportAllData, validateBackupData, importDataOverwrite, importDataMerge } from '../utils/storage'
import { ProviderSelector } from './ProviderSelector'
import type { ASRProviderInfo, ProviderConfigData } from '../types'

interface ApiKeyConfigProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyConfig({ isOpen, onClose }: ApiKeyConfigProps) {
  const { 
    settings, 
    updateSettings, 
    loadSessions, 
    loadTags, 
    t, 
    language, 
    setLanguage,
    availableProviders,
    updateProviderConfig,
  } = useTranscriptStore()
  
  const currentVendor = settings.currentVendor || 'soniox'
  const currentProvider = availableProviders.find(p => p.id === currentVendor)
  const currentConfig: ProviderConfigData = settings.providerConfigs?.[currentVendor] || { apiKey: '' }
  
  // 通用字段
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || settings.apiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [languageHints, setLanguageHints] = useState(
    (currentConfig.languageHints || settings.languageHints || ['zh', 'en']).join(', ')
  )
  
  // 火山引擎特有字段
  const [appKey, setAppKey] = useState((currentConfig as ProviderConfigData).appKey as string || '')
  const [accessKey, setAccessKey] = useState((currentConfig as ProviderConfigData).accessKey as string || '')
  const [showAppKey, setShowAppKey] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)
  
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle')
  const [appVersion, setAppVersion] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 当提供商改变时更新表单
  useEffect(() => {
    const config: ProviderConfigData = settings.providerConfigs?.[currentVendor] || { apiKey: '' }
    setApiKey(config.apiKey || '')
    setLanguageHints(((config.languageHints as string[]) || settings.languageHints || ['zh', 'en']).join(', '))
    
    // 火山引擎特有字段
    if (currentVendor === 'volc') {
      setAppKey((config as ProviderConfigData).appKey as string || '')
      setAccessKey((config as ProviderConfigData).accessKey as string || '')
    }
  }, [currentVendor, settings])

  // 加载开机自启动状态和应用版本（仅 Electron 环境）
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getAutoLaunch?.().then(setAutoLaunch)
      window.electronAPI.getAppVersion?.().then(setAppVersion)
    }
  }, [isOpen])

  // 切换开机自启动
  const handleAutoLaunchChange = async (enable: boolean) => {
    if (window.electronAPI?.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(enable)
      setAutoLaunch(result)
    }
  }

  // 手动检查更新
  const handleCheckUpdate = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) return
    
    setUpdateStatus('checking')
    const result = await window.electronAPI.checkForUpdates()
    
    if (result.error) {
      setUpdateStatus('error')
      setTimeout(() => setUpdateStatus('idle'), 3000)
    } else if (result.success) {
      // 等待更新事件通知
      setTimeout(() => {
        if (updateStatus === 'checking') {
          setUpdateStatus('not-available')
          setTimeout(() => setUpdateStatus('idle'), 3000)
        }
      }, 5000)
    }
  }, [updateStatus])

  // 测试 API 配置
  const handleTestConfig = async () => {
    setTestStatus('testing')
    setTestMessage('')

    try {
      if (currentVendor === 'soniox') {
        await testSonioxConfig()
      } else if (currentVendor === 'volc') {
        await testVolcConfig()
      } else {
        throw new Error('不支持的提供商')
      }
      
      setTestStatus('success')
      setTestMessage(t.settings?.testSuccess || '配置验证成功！')
      setTimeout(() => {
        setTestStatus('idle')
        setTestMessage('')
      }, 3000)
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '配置验证失败')
    }
  }

  // 测试 Soniox 配置
  const testSonioxConfig = async () => {
    if (!apiKey.trim()) {
      throw new Error('请输入 API Key')
    }

    // 尝试建立 WebSocket 连接并验证 API Key
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('连接超时，请检查网络'))
      }, 10000)

      ws.onopen = () => {
        // 发送配置消息
        ws.send(JSON.stringify({
          api_key: apiKey.trim(),
          model: 'stt-rt-v3',
          audio_format: 'auto',
          language_hints: ['zh', 'en'],
        }))
      }

      ws.onmessage = (event) => {
        clearTimeout(timeout)
        try {
          const response = JSON.parse(event.data)
          if (response.error_code) {
            ws.close()
            reject(new Error(response.error_message || `错误代码: ${response.error_code}`))
          } else {
            // 配置有效，关闭连接
            ws.close()
            resolve()
          }
        } catch {
          ws.close()
          reject(new Error('解析响应失败'))
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('WebSocket 连接失败'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code !== 1000 && event.code !== 1005) {
          reject(new Error(`连接关闭: ${event.reason || '未知原因'}`))
        }
      }
    })
  }

  // 测试火山引擎配置（通过本地代理服务器）
  const testVolcConfig = async () => {
    if (!appKey.trim()) {
      throw new Error('请输入 APP ID')
    }
    if (!accessKey.trim()) {
      throw new Error('请输入 Access Token')
    }

    // 通过本地代理服务器测试火山引擎连接
    return new Promise<void>((resolve, reject) => {
      // 构建代理 WebSocket URL
      const params = new URLSearchParams({
        appKey: appKey.trim(),
        accessKey: accessKey.trim(),
        modelV2: 'true',
        bidiStreaming: 'true',
        enableDdc: 'true',
      })
      const proxyUrl = `ws://localhost:3001/ws/volc?${params.toString()}`
      
      let ws: WebSocket | null = null
      
      const timeout = setTimeout(() => {
        if (ws) ws.close()
        reject(new Error('连接超时，请检查网络或确保服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch (error) {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动 (npm run dev:server)'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          
          if (msg.type === 'ready') {
            // 代理已就绪，火山引擎连接成功
            clearTimeout(timeout)
            // 发送音频结束标记以正常关闭连接
            ws?.send(JSON.stringify({ type: 'audio_end' }))
            // 等待一小段时间让服务器处理
            setTimeout(() => {
              ws?.close(1000, 'test complete')
              resolve()
            }, 500)
          } else if (msg.type === 'error') {
            clearTimeout(timeout)
            ws?.close()
            reject(new Error(msg.message || '火山引擎连接失败'))
          } else if (msg.type === 'final') {
            // 收到最终结果也表示连接成功
            clearTimeout(timeout)
            ws?.close(1000, 'test complete')
            resolve()
          }
        } catch {
          // 忽略解析错误
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动 (cd server && npm run dev)'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 APP ID 或 Access Token'))
        } else if (event.code === 4002) {
          reject(new Error('火山引擎连接失败，请检查 APP ID 和 Access Token 是否正确'))
        }
        // 正常关闭不需要处理
      }
    })
  }

  const handleSave = () => {
    const hints = languageHints
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
    
    // 根据提供商构建配置
    let providerConfig: ProviderConfigData = {
      apiKey: apiKey.trim(),
      languageHints: hints.length > 0 ? hints : ['zh', 'en'],
    }
    
    // 火山引擎特有配置
    if (currentVendor === 'volc') {
      providerConfig = {
        ...providerConfig,
        appKey: appKey.trim(),
        accessKey: accessKey.trim(),
      }
    }
    
    // 更新当前提供商的配置
    updateProviderConfig(currentVendor, providerConfig)
    
    // 同时更新全局设置以保持兼容
    updateSettings({
      apiKey: apiKey.trim(),
      languageHints: hints.length > 0 ? hints : ['zh', 'en'],
    })
    onClose()
  }
  
  // 获取提供商的配置链接
  const getProviderConsoleUrl = (provider: ASRProviderInfo | undefined): string => {
    switch (provider?.id) {
      case 'soniox':
        return 'https://console.soniox.com'
      case 'volc':
        return 'https://console.volcengine.com/speech/app'
      default:
        return provider?.website || '#'
    }
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
  
  // 渲染提供商特定的配置字段
  const renderProviderFields = () => {
    // 火山引擎需要特殊处理（APP ID + Access Token）
    if (currentVendor === 'volc') {
      return (
        <>
          {/* APP ID */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              APP ID
            </label>
            <div className="relative group">
              <input
                type={showAppKey ? 'text' : 'password'}
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                placeholder="输入火山引擎 APP ID"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAppKey(!showAppKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAppKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Access Token */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              Access Token
            </label>
            <div className="relative group">
              <input
                type={showAccessKey ? 'text' : 'password'}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="输入火山引擎 Access Token"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAccessKey(!showAccessKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              从 <a href="https://console.volcengine.com/speech/app" target="_blank" rel="noopener noreferrer" 
                   className="text-primary font-medium hover:underline underline-offset-2">火山引擎控制台</a> 获取 APP ID 和 Access Token
            </p>
          </div>
          
          {/* 测试按钮 */}
          {renderTestButton()}
        </>
      )
    }
    
    // 其他提供商使用单一 API Key
    return (
      <>
        <div className="space-y-3">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            {currentProvider?.name || 'Soniox'} API Key
          </label>
          <div className="relative group">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.settings.apiKeyPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t.settings.apiKeyHint} <a href={getProviderConsoleUrl(currentProvider)} target="_blank" rel="noopener noreferrer" 
                 className="text-primary font-medium hover:underline underline-offset-2">{currentProvider?.website || 'console.soniox.com'}</a>
          </p>
        </div>
        
        {/* 测试按钮 */}
        {renderTestButton()}
      </>
    )
  }

  // 渲染测试按钮
  const renderTestButton = () => {
    return (
      <div className="space-y-3">
        <button
          onClick={handleTestConfig}
          disabled={testStatus === 'testing'}
          className={`
            w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium
            rounded-lg transition-all
            ${testStatus === 'testing' 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : testStatus === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
              : testStatus === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
              : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
            }
          `}
        >
          {testStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.settings?.testing || '正在测试...'}
            </>
          ) : testStatus === 'success' ? (
            <>
              <Check className="w-4 h-4" />
              {t.settings?.testSuccess || '配置有效'}
            </>
          ) : testStatus === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              {t.settings?.testFailed || '配置无效'}
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              {t.settings?.testConfig || '测试配置'}
            </>
          )}
        </button>
        
        {/* 测试结果消息 */}
        {testMessage && (
          <div className={`
            flex items-center gap-2 p-3 rounded-lg text-xs
            ${testStatus === 'success' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }
          `}>
            {testStatus === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="break-all">{testMessage}</span>
          </div>
        )}
      </div>
    )
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
          {/* ASR 提供商选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium leading-none flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
              {t.settings?.asrProvider || '语音识别服务'}
            </label>
            <ProviderSelector />
            <p className="text-[10px] text-muted-foreground">
              {t.settings?.asrProviderDesc || '选择语音识别服务提供商，不同提供商有不同的特性和价格'}
            </p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 提供商特定配置字段 */}
          {renderProviderFields()}

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

              {/* 检查更新 */}
              <div className="border-t border-border" />
              <div className="space-y-3">
                <label className="text-sm font-medium leading-none flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.update?.checkForUpdates || '检查更新'}
                </label>
                
                {/* 启动时自动检查更新开关 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'zh' ? '启动时自动检查更新' : 'Auto-check on startup'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'zh' ? '每次启动应用时自动检查是否有新版本' : 'Automatically check for updates when app starts'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = settings.autoCheckUpdate === false ? true : false
                      updateSettings({ autoCheckUpdate: newValue })
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              ${settings.autoCheckUpdate !== false ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                                ${settings.autoCheckUpdate !== false ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
                
                {/* 当前版本和手动检查按钮 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'zh' ? '当前版本' : 'Current Version'}: {appVersion || '-'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {updateStatus === 'checking' 
                        ? (t.update?.checking || '正在检查更新...')
                        : updateStatus === 'not-available'
                        ? (t.update?.upToDate || '已是最新版本')
                        : updateStatus === 'error'
                        ? (t.update?.error || '检查更新失败')
                        : (language === 'zh' ? '点击按钮检查是否有新版本' : 'Click to check for updates')
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    disabled={updateStatus === 'checking'}
                    className={`inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors
                              ${updateStatus === 'checking'
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : updateStatus === 'not-available'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/50'
                                : updateStatus === 'error'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/50'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                              }`}
                  >
                    {updateStatus === 'checking' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : updateStatus === 'not-available' ? (
                      <Check className="w-4 h-4" />
                    ) : updateStatus === 'error' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {updateStatus === 'checking' 
                      ? (language === 'zh' ? '检查中...' : 'Checking...')
                      : (t.update?.checkForUpdates || '检查更新')
                    }
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
