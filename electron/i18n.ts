import { app } from 'electron'
import fs from 'fs'
import path from 'path'

type Lang = 'zh' | 'en'

const strings = {
  zh: {
    trayShowWindow: '显示主窗口',
    trayQuit: '退出',
    trayTooltip: 'DeLive - 桌面音频实时转录',
    shortcutToggleWindow: '显示/隐藏窗口',
    shortcutToggleWindowAlt: '显示/隐藏窗口(备用)',
    shortcutToggleRecording: '开始/停止录制',
    shortcutToggleRecordingAlt: '开始/停止录制(备用)',
    updateReady: '更新已就绪',
    updateDetail: (version: string) => `新版本 ${version} 已下载完成`,
    updateInstallPrompt: '点击"立即安装"将关闭应用并安装更新，点击"稍后"将在下次启动时自动安装。',
    updateInstallNow: '立即安装',
    updateLater: '稍后',
  },
  en: {
    trayShowWindow: 'Show Main Window',
    trayQuit: 'Quit',
    trayTooltip: 'DeLive - Desktop Audio Transcription',
    shortcutToggleWindow: 'Show/Hide Window',
    shortcutToggleWindowAlt: 'Show/Hide Window (Alt)',
    shortcutToggleRecording: 'Start/Stop Recording',
    shortcutToggleRecordingAlt: 'Start/Stop Recording (Alt)',
    updateReady: 'Update Ready',
    updateDetail: (version: string) => `Version ${version} has been downloaded`,
    updateInstallPrompt: 'Click "Install Now" to close the app and install. Click "Later" to auto-install on next startup.',
    updateInstallNow: 'Install Now',
    updateLater: 'Later',
  },
} as const

function getSavedLang(): Lang {
  try {
    const userDataPath = app.getPath('userData')
    const prefsPath = path.join(userDataPath, 'Local Storage', 'leveldb')
    if (fs.existsSync(prefsPath)) {
      const files = fs.readdirSync(prefsPath).filter(f => f.endsWith('.log') || f.endsWith('.ldb'))
      for (const file of files) {
        try {
          const buf = fs.readFileSync(path.join(prefsPath, file))
          const text = buf.toString('utf8')
          if (text.includes('"language"') && text.includes('"en"')) {
            return 'en'
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  return 'zh'
}

let cachedLang: Lang | null = null

export function getElectronStrings() {
  if (!cachedLang) {
    cachedLang = getSavedLang()
  }
  return strings[cachedLang]
}

export function refreshElectronLang() {
  cachedLang = getSavedLang()
}
