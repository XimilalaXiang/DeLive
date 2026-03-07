import { dialog, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

interface SetupAutoUpdaterOptions {
  getMainWindow: () => BrowserWindow | null
  markQuitting: () => void
}

export function setupAutoUpdater(options: SetupAutoUpdaterOptions): void {
  autoUpdater.on('error', (error) => {
    console.error('自动更新错误:', error)

    const isNoReleaseError =
      error.message.includes('404') ||
      /latest(?:-[a-z]+)?\.yml/i.test(error.message)

    if (isNoReleaseError) {
      console.log('未找到发布版本，跳过更新检查')
      return
    }

    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', error.message)
    }
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('checking-for-update')
    }
  })

  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      })
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本:', info.version)
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', {
        version: info.version,
      })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`下载进度: ${progress.percent.toFixed(2)}%`)
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      })
    }

    const msgBoxOptions = {
      type: 'info' as const,
      title: '更新已就绪',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '点击"立即安装"将关闭应用并安装更新，点击"稍后"将在下次启动时自动安装。',
      buttons: ['立即安装', '稍后'],
      defaultId: 0,
      cancelId: 1,
    }

    const msgBoxPromise = mainWindow && !mainWindow.isDestroyed()
      ? dialog.showMessageBox(mainWindow, msgBoxOptions)
      : dialog.showMessageBox(msgBoxOptions)

    void msgBoxPromise.then((result) => {
      if (result.response === 0) {
        options.markQuitting()
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })
}
