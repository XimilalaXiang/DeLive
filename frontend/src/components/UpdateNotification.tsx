/**
 * 更新通知组件
 * 显示应用更新状态和下载进度
 */

import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateStatus = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export function UpdateNotification() {
  const { t } = useTranscriptStore()
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // 设置更新事件监听
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanups: (() => void)[] = []

    // 检查更新中
    cleanups.push(
      window.electronAPI.onCheckingForUpdate(() => {
        setStatus('checking')
        setError(null)
      })
    )

    // 有可用更新
    cleanups.push(
      window.electronAPI.onUpdateAvailable((info) => {
        setStatus('available')
        setUpdateInfo(info)
        setDismissed(false)
      })
    )

    // 没有可用更新
    cleanups.push(
      window.electronAPI.onUpdateNotAvailable(() => {
        setStatus('not-available')
        // 3秒后隐藏
        setTimeout(() => setStatus('idle'), 3000)
      })
    )

    // 下载进度
    cleanups.push(
      window.electronAPI.onDownloadProgress((prog) => {
        setStatus('downloading')
        setProgress(prog)
      })
    )

    // 下载完成
    cleanups.push(
      window.electronAPI.onUpdateDownloaded((info) => {
        setStatus('downloaded')
        setUpdateInfo(info)
        setProgress(null)
      })
    )

    // 更新错误
    cleanups.push(
      window.electronAPI.onUpdateError((err) => {
        setStatus('error')
        setError(err)
      })
    )

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [])

  // 手动检查更新
  const handleCheckUpdate = useCallback(async () => {
    if (!window.electronAPI) return
    setStatus('checking')
    setError(null)
    
    const result = await window.electronAPI.checkForUpdates()
    if (result.error) {
      setStatus('error')
      setError(result.error)
    }
  }, [])

  // 下载更新
  const handleDownload = useCallback(async () => {
    if (!window.electronAPI) return
    setStatus('downloading')
    setProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 })
    
    const result = await window.electronAPI.downloadUpdate()
    if (result.error) {
      setStatus('error')
      setError(result.error)
    }
  }, [])

  // 安装更新
  const handleInstall = useCallback(() => {
    if (!window.electronAPI) return
    window.electronAPI.installUpdate()
  }, [])

  // 关闭通知
  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  // 格式化字节大小
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  // 不在 Electron 环境中时不显示
  if (!window.electronAPI) return null

  // 已关闭且不是下载中或已下载状态时不显示
  if (dismissed && status !== 'downloading' && status !== 'downloaded') return null

  // 空闲状态不显示
  if (status === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className={`
        rounded-lg shadow-lg border p-4 backdrop-blur-sm
        ${status === 'error' 
          ? 'bg-red-50/95 dark:bg-red-900/30 border-red-200 dark:border-red-800' 
          : status === 'downloaded'
          ? 'bg-green-50/95 dark:bg-green-900/30 border-green-200 dark:border-green-800'
          : 'bg-background/95 border-border'
        }
      `}>
        {/* 关闭按钮 */}
        {status !== 'downloading' && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 检查更新中 */}
        {status === 'checking' && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">{t.update?.checking || '正在检查更新...'}</span>
          </div>
        )}

        {/* 有可用更新 */}
        {status === 'available' && updateInfo && (
          <div className="space-y-3 pr-6">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <span className="font-medium">{t.update?.available || '发现新版本'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.update?.newVersion || '新版本'} <span className="font-mono font-medium text-foreground">v{updateInfo.version}</span> {t.update?.readyToDownload || '可供下载'}
            </p>
            <button
              onClick={handleDownload}
              className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t.update?.downloadNow || '立即下载'}
            </button>
          </div>
        )}

        {/* 没有可用更新 */}
        {status === 'not-available' && (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm">{t.update?.upToDate || '已是最新版本'}</span>
          </div>
        )}

        {/* 下载中 */}
        {status === 'downloading' && progress && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium">{t.update?.downloading || '正在下载更新...'}</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.percent.toFixed(1)}%</span>
                <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 下载完成 */}
        {status === 'downloaded' && updateInfo && (
          <div className="space-y-3 pr-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">
                {t.update?.downloaded || '更新已下载完成'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.update?.readyToInstall || '版本'} <span className="font-mono font-medium">v{updateInfo.version}</span> {t.update?.installPrompt || '已准备就绪，点击安装'}
            </p>
            <button
              onClick={handleInstall}
              className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t.update?.installNow || '立即安装并重启'}
            </button>
          </div>
        )}

        {/* 错误 */}
        {status === 'error' && (
          <div className="space-y-3 pr-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-400">
                {t.update?.error || '更新失败'}
              </span>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              onClick={handleCheckUpdate}
              className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t.update?.retry || '重试'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
