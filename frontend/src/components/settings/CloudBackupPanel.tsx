import { useState, useCallback } from 'react'
import {
  Cloud,
  Check,
  Loader2,
  Trash2,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Switch } from '../ui'
import type { Translations } from '../../i18n'
import type {
  CloudBackupConfig,
  CloudBackupProviderType,
  S3BackupConfig,
  WebDAVBackupConfig,
} from '../../types'
import type { CloudBackupIpcConfig, CloudBackupIpcFileInfo } from '../../../../shared/electronApi'
import {
  validateBackupData,
  upgradeBackupData,
  importDataOverwrite,
  type BackupData,
} from '../../utils/storage'
import { getSessions } from '../../utils/sessionStorage'
import { getSettings, getTags, getTopics } from '../../utils/settingsStorage'
import { normalizeTranscriptSessions } from '../../utils/sessionSchema'
import { CURRENT_BACKUP_VERSION, CURRENT_BACKUP_SCHEMA_VERSION } from '../../utils/backupStorage'

interface CloudBackupPanelProps {
  t: Translations
  cloudBackupConfig: CloudBackupConfig
  updateCloudBackupConfig: (config: Partial<CloudBackupConfig>) => Promise<void>
}

function buildIpcConfig(config: CloudBackupConfig): CloudBackupIpcConfig {
  return {
    provider: config.provider || 's3',
    s3: config.s3 ? {
      endpoint: config.s3.endpoint || '',
      region: config.s3.region || 'us-east-1',
      bucket: config.s3.bucket || '',
      prefix: config.s3.prefix || '',
      accessKeyId: config.s3.accessKeyId || '',
      secretAccessKey: config.s3.secretAccessKey || '',
      forcePathStyle: config.s3.forcePathStyle ?? true,
    } : undefined,
    webdav: config.webdav ? {
      url: config.webdav.url || '',
      username: config.webdav.username || '',
      password: config.webdav.password || '',
      basePath: config.webdav.basePath || '',
    } : undefined,
  }
}

async function buildBackupJson(): Promise<string> {
  const sessions = normalizeTranscriptSessions(await getSessions())
  const tags = getTags()
  const settings = getSettings()
  const topics = getTopics()
  const data: BackupData = {
    version: CURRENT_BACKUP_VERSION,
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions,
    tags,
    settings,
    topics,
  }
  return JSON.stringify(data, null, 2)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString()
  } catch {
    return isoStr
  }
}

export function CloudBackupPanel({
  t,
  cloudBackupConfig,
  updateCloudBackupConfig,
}: CloudBackupPanelProps) {
  const ts = t.settings
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [files, setFiles] = useState<CloudBackupIpcFileInfo[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)

  const provider = cloudBackupConfig.provider || 's3'
  const s3 = cloudBackupConfig.s3 || {} as Partial<S3BackupConfig>
  const webdav = cloudBackupConfig.webdav || {} as Partial<WebDAVBackupConfig>

  const updateS3 = useCallback((updates: Partial<S3BackupConfig>) => {
    return updateCloudBackupConfig({
      s3: { ...s3, ...updates } as S3BackupConfig,
    })
  }, [s3, updateCloudBackupConfig])

  const updateWebdav = useCallback((updates: Partial<WebDAVBackupConfig>) => {
    return updateCloudBackupConfig({
      webdav: { ...webdav, ...updates } as WebDAVBackupConfig,
    })
  }, [webdav, updateCloudBackupConfig])

  const handleTest = useCallback(async () => {
    if (!window.electronAPI) return
    setTestStatus('testing')
    setTestError('')

    const result = await window.electronAPI.cloudBackupTest(buildIpcConfig(cloudBackupConfig))
    if (result.ok) {
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Unknown error')
    }
  }, [cloudBackupConfig])

  const handleUpload = useCallback(async () => {
    if (!window.electronAPI) return
    setUploadStatus('uploading')
    setUploadError('')

    try {
      const jsonData = await buildBackupJson()
      const result = await window.electronAPI.cloudBackupUpload(buildIpcConfig(cloudBackupConfig), jsonData)
      if (result.ok) {
        setUploadStatus('success')
        setTimeout(() => setUploadStatus('idle'), 3000)
        void handleLoadFiles()
      } else {
        setUploadStatus('error')
        setUploadError(result.error || 'Unknown error')
      }
    } catch (err) {
      setUploadStatus('error')
      setUploadError(err instanceof Error ? err.message : String(err))
    }
  }, [cloudBackupConfig])

  const handleLoadFiles = useCallback(async () => {
    if (!window.electronAPI) return
    setLoadingFiles(true)
    const result = await window.electronAPI.cloudBackupList(buildIpcConfig(cloudBackupConfig))
    if (result.ok && result.files) {
      setFiles(result.files)
    }
    setLoadingFiles(false)
  }, [cloudBackupConfig])

  const handleRestore = useCallback(async (key: string) => {
    if (!window.electronAPI) return
    if (!confirm(ts.cloudBackupRestoreConfirm)) return

    setRestoreStatus(key)
    const result = await window.electronAPI.cloudBackupDownload(buildIpcConfig(cloudBackupConfig), key)
    if (!result.ok || !result.data) {
      alert(`${ts.cloudBackupRestoreFailed}: ${result.error || 'No data'}`)
      setRestoreStatus(null)
      return
    }

    try {
      const parsed = JSON.parse(result.data)
      if (!validateBackupData(parsed)) {
        alert(`${ts.cloudBackupRestoreFailed}: Invalid backup data`)
        setRestoreStatus(null)
        return
      }

      await importDataOverwrite(upgradeBackupData(parsed))
      alert(ts.cloudBackupRestoreSuccess)
      window.location.reload()
    } catch (err) {
      alert(`${ts.cloudBackupRestoreFailed}: ${err instanceof Error ? err.message : String(err)}`)
      setRestoreStatus(null)
    }
  }, [cloudBackupConfig, ts])

  const handleDelete = useCallback(async (key: string) => {
    if (!window.electronAPI) return
    if (!confirm(ts.cloudBackupDeleteConfirm)) return

    const result = await window.electronAPI.cloudBackupDelete(buildIpcConfig(cloudBackupConfig), key)
    if (result.ok) {
      setFiles(prev => prev.filter(f => f.key !== key))
    } else {
      alert(result.error || 'Delete failed')
    }
  }, [cloudBackupConfig, ts])

  const hasElectronApi = typeof window !== 'undefined' && !!window.electronAPI

  if (!hasElectronApi) return null

  return (
    <section className="workspace-panel-muted p-4 space-y-3">
      <label className="text-sm font-medium leading-none flex items-center gap-2">
        <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
        {ts.cloudBackupTitle}
      </label>
      <p className="text-xs text-muted-foreground">{ts.cloudBackupDesc}</p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="text-sm font-medium">{ts.cloudBackupEnable}</p>
        </div>
        <Switch
          checked={!!cloudBackupConfig.enabled}
          onChange={(val) => void updateCloudBackupConfig({ enabled: val })}
          aria-label={ts.cloudBackupEnable}
        />
      </div>

      {cloudBackupConfig.enabled && (
        <>
          {/* Provider selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{ts.cloudBackupProvider}</label>
            <div className="flex gap-2">
              {(['s3', 'webdav'] as CloudBackupProviderType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void updateCloudBackupConfig({ provider: p })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    provider === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p === 's3' ? ts.cloudBackupS3 : ts.cloudBackupWebDAV}
                </button>
              ))}
            </div>
          </div>

          {/* S3 config */}
          {provider === 's3' && (
            <div className="space-y-2">
              <input
                type="text"
                value={s3.endpoint || ''}
                onChange={(e) => void updateS3({ endpoint: e.target.value })}
                placeholder={ts.cloudBackupEndpointPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-md bg-background border border-input"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={s3.region || ''}
                  onChange={(e) => void updateS3({ region: e.target.value })}
                  placeholder={ts.cloudBackupRegionPlaceholder}
                  className="px-3 py-2 text-xs rounded-md bg-background border border-input"
                />
                <input
                  type="text"
                  value={s3.bucket || ''}
                  onChange={(e) => void updateS3({ bucket: e.target.value })}
                  placeholder={ts.cloudBackupBucketPlaceholder}
                  className="px-3 py-2 text-xs rounded-md bg-background border border-input"
                />
              </div>
              <input
                type="text"
                value={s3.prefix || ''}
                onChange={(e) => void updateS3({ prefix: e.target.value })}
                placeholder={ts.cloudBackupPrefixPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-md bg-background border border-input"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={s3.accessKeyId || ''}
                  onChange={(e) => void updateS3({ accessKeyId: e.target.value })}
                  placeholder={ts.cloudBackupAccessKeyId}
                  className="px-3 py-2 text-xs rounded-md bg-background border border-input"
                />
                <input
                  type="password"
                  value={s3.secretAccessKey || ''}
                  onChange={(e) => void updateS3({ secretAccessKey: e.target.value })}
                  placeholder={ts.cloudBackupSecretAccessKey}
                  className="px-3 py-2 text-xs rounded-md bg-background border border-input"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={s3.forcePathStyle ?? true}
                  onChange={(e) => void updateS3({ forcePathStyle: e.target.checked })}
                  className="rounded"
                />
                {ts.cloudBackupForcePathStyle}
              </label>
            </div>
          )}

          {/* WebDAV config */}
          {provider === 'webdav' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{ts.cloudBackupWebdavUrl}</label>
                <input
                  type="text"
                  value={webdav.url || ''}
                  onChange={(e) => void updateWebdav({ url: e.target.value })}
                  placeholder={ts.cloudBackupWebdavUrlPlaceholder}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">{ts.cloudBackupWebdavUsername}</label>
                  <input
                    type="text"
                    value={webdav.username || ''}
                    onChange={(e) => void updateWebdav({ username: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{ts.cloudBackupWebdavPassword}</label>
                  <input
                    type="password"
                    value={webdav.password || ''}
                    onChange={(e) => void updateWebdav({ password: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{ts.cloudBackupWebdavBasePath}</label>
                <input
                  type="text"
                  value={webdav.basePath || ''}
                  onChange={(e) => void updateWebdav({ basePath: e.target.value })}
                  placeholder={ts.cloudBackupWebdavBasePathPlaceholder}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* Auto backup toggle */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={!!cloudBackupConfig.autoBackupOnComplete}
              onChange={(e) => void updateCloudBackupConfig({ autoBackupOnComplete: e.target.checked })}
              className="rounded"
            />
            {ts.cloudBackupAutoBackup}
          </label>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : testStatus === 'success' ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : testStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {testStatus === 'testing' ? ts.cloudBackupTesting
                : testStatus === 'success' ? ts.cloudBackupTestSuccess
                : testStatus === 'error' ? ts.cloudBackupTestFailed
                : ts.cloudBackupTestConnection}
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadStatus === 'uploading'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadStatus === 'uploading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : uploadStatus === 'success' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              {uploadStatus === 'uploading' ? ts.cloudBackupUploading
                : uploadStatus === 'success' ? ts.cloudBackupUploadSuccess
                : ts.cloudBackupNow}
            </button>
          </div>

          {testStatus === 'error' && testError && (
            <p className="text-xs text-destructive">{testError}</p>
          )}
          {uploadStatus === 'error' && uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}

          {/* Backup history */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">{ts.cloudBackupHistory}</label>
              <button
                type="button"
                onClick={handleLoadFiles}
                disabled={loadingFiles}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {loadingFiles ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {loadingFiles ? ts.cloudBackupLoading : ts.cloudBackupHistory}
              </button>
            </div>

            {files.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.key} className="flex items-center justify-between p-2 rounded-md bg-background text-xs">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{file.key.split('/').pop()}</p>
                      <p className="text-muted-foreground">
                        {formatDate(file.lastModified)} · {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleRestore(file.key)}
                        disabled={restoreStatus === file.key}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title={ts.cloudBackupRestore}
                      >
                        {restoreStatus === file.key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(file.key)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title={ts.cloudBackupDelete}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : files.length === 0 && !loadingFiles ? (
              <p className="text-xs text-muted-foreground text-center py-2">{ts.cloudBackupNoFiles}</p>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
