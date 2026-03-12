import { app, globalShortcut, type BrowserWindow } from 'electron'

interface RegisterShortcutsOptions {
  getMainWindow: () => BrowserWindow | null
  isTrayReady: () => boolean
}

function tryRegister(
  accelerator: string,
  callback: () => void,
  label: string,
): boolean {
  try {
    const ok = globalShortcut.register(accelerator, callback)
    if (ok) {
      console.log(`[Shortcuts] ${label} ${accelerator} 注册成功`)
    } else {
      console.warn(`[Shortcuts] ${label} ${accelerator} 注册失败，可能被其他程序占用`)
    }
    return ok
  } catch (error) {
    console.warn(`[Shortcuts] ${label} ${accelerator} 注册异常:`, error)
    return false
  }
}

export function registerAppShortcuts(options: RegisterShortcutsOptions): void {
  // ── Toggle window visibility ─────────────────────
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

  if (!tryRegister('CommandOrControl+Shift+D', toggleWindow, '显示/隐藏窗口')) {
    tryRegister('CommandOrControl+Alt+D', toggleWindow, '显示/隐藏窗口(备用)')
  }

  // ── Toggle recording ─────────────────────────────
  const toggleRecording = () => {
    const mainWindow = options.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('toggle-recording')
  }

  if (!tryRegister('CommandOrControl+Shift+R', toggleRecording, '开始/停止录制')) {
    tryRegister('CommandOrControl+Alt+R', toggleRecording, '开始/停止录制(备用)')
  }
}
