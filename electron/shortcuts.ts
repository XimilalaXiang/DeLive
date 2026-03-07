import { app, globalShortcut, type BrowserWindow } from 'electron'

interface RegisterShortcutsOptions {
  getMainWindow: () => BrowserWindow | null
  isTrayReady: () => boolean
}

export function registerAppShortcuts(options: RegisterShortcutsOptions): void {
  const shortcut = 'CommandOrControl+Shift+D'

  const toggleWindow = () => {
    const mainWindow = options.getMainWindow()
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
      if (process.platform === 'darwin' && options.isTrayReady()) app.dock?.hide()
    } else {
      if (process.platform === 'darwin') app.dock?.show()
      mainWindow?.show()
      mainWindow?.focus()
    }
  }

  try {
    const registered = globalShortcut.register(shortcut, toggleWindow)

    if (registered) {
      console.log(`全局快捷键 ${shortcut} 注册成功`)
    } else {
      console.warn(`全局快捷键 ${shortcut} 注册失败，可能被其他程序占用`)

      const backupShortcut = 'CommandOrControl+Alt+D'
      const backupRegistered = globalShortcut.register(backupShortcut, toggleWindow)

      if (backupRegistered) {
        console.log(`备用快捷键 ${backupShortcut} 注册成功`)
      } else {
        console.warn(`备用快捷键 ${backupShortcut} 也注册失败`)
      }
    }

    console.log(`快捷键 ${shortcut} 已注册: ${globalShortcut.isRegistered(shortcut)}`)
  } catch (error) {
    console.warn('[Shortcuts] 全局快捷键注册失败，当前环境可能不支持:', error)
  }
}
