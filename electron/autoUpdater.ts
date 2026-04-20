import { dialog, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getElectronStrings } from './i18n'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

interface SetupAutoUpdaterOptions {
  getMainWindow: () => BrowserWindow | null
  markQuitting: () => void
}

export function setupAutoUpdater(options: SetupAutoUpdaterOptions): void {
  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error)

    const isNoReleaseError =
      error.message.includes('404') ||
      /latest(?:-[a-z]+)?\.yml/i.test(error.message)

    if (isNoReleaseError) {
      console.log('No release found, skipping update check')
      return
    }

    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', error.message)
    }
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('checking-for-update')
    }
  })

  autoUpdater.on('update-available', (info) => {
    console.log('New version available:', info.version)
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
    console.log('Already up to date:', info.version)
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
    console.log('Update downloaded:', info.version)
    const mainWindow = options.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      })
    }

    const msgBoxOptions = {
      type: 'info' as const,
      title: getElectronStrings().updateReady,
      message: getElectronStrings().updateDetail(info.version),
      detail: '点击"立即安装"将关闭应用并安装更新，点击"稍后"将在下次启动时自动安装。',
      buttons: [getElectronStrings().updateInstallNow, getElectronStrings().updateLater],
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
