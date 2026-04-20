import { app, Menu, nativeImage, Tray, type BrowserWindow, type NativeImage } from 'electron'
import { getElectronStrings } from './i18n'
import fs from 'fs'
import path from 'path'

const EMBEDDED_ICON_32_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAADjklEQVR4nNWXS08TURSAB6addjrT4NrgFqOJaX0sNMaKGx8b97ox+ke6FApSikIf9EEBQetajY+EqPggdkAoInTaTumUlxtjtLpAPeZOO7etdF5aFp7kLun3zTnn3nMgiP8uEkDaw8X9bLjgYoaFy+iw4ZzLHsp2EG5o3R0oQIttRLzARMUwE139yERXgYmgkwcmnAdmWADbcA7oUG6LDmbCtgB/Hv1NU9j2ePEEExNfsDER2GgBlOC2EDpZsAWzQAczYA3wMxY/3/n35CkwsSPiLQlsEE4HMkD7eaD9abAOpn2Ee8pkiN0WE/awMfHJv8LpoTRYh1bAOrj8mAhm2/TRE0CyseKD5sElAbDe+vBYVybYJqS9ARysNz+A5eaSTwNecBmBH7snwtF7Bb1wsAwsgcWXOtOYDtDCRAuvjHz51rcf0tENH3gPlv7UTMMrahsRLxhNe2n7l3RkuD2QhtvLn+Ha0/XGcN8iWPoXweJNndshwMTEiBq8LSxA+2i+ruZYoPLljgkBULxYKynCqf4UUH0LoXq6G1rZaGFT7cvv8F8k2L64gGsuC8hpd07kJIHptZIy3JsCs3dhi0gkSMy3x4sdWmmf3vgu/fjhuwVccyxQqbnzdrYqoACnvAsoA0D1zB6sSb/QqVVzLHBnFde8KlBuOOd4rYAy3Nw3D1Tv/MWqAJpqGg03vS4L5HHNywI/ccM5agVU4OYb78DcM3ulKhARLmk9MtPr38oCk3lccwSXBCoNVyegBu/9Q4CN5E5rvXCygHNSwDWXBeSGc4xnygLFkjq8dw6oXq5aAnso26H1vGKBCQHXHAtUGs4xxpevYfGrKtzcMwdUF3eg7hrSoeyG2ts+mf4s1bw9yuOaVwXKDecYrRVQhps83OaO7YlGm4zKYLH707A3UoWjtGOBSsMdiqclgedIQAneMwukhwvufIoD/HkDU01KOxaoNBzjW4TxpU9w9WFBEW7ycEB6kmcbziPan3lpZLBslbalo9Vw9XDuteK+aB1aOaV7qvkW4cgYD4fHeN3w8nl7siFcDrTD6YFr3vMGcLIr2UdoRgJI6+Dy/WbDTd1JfSuZFMFsG9rhmgbvSj4iupI6l1I53FMmtMM1Je21o9do0L6l45Qv9cwonOzm3piucy6iKQHQgtYotMmY++Y3VeAbZDcXUrznTQk3tFLe1AE0z9FEQwcNFult37V/TncxfgMkp/kkbDW+hQAAAABJRU5ErkJggg=='

interface CreateAppTrayOptions {
  getMainWindow: () => BrowserWindow | null
  onQuit: () => void
  debug?: (message: string, extra?: Record<string, unknown>) => void
}

function getIconCandidates(): string[] {
  const appPath = app.getAppPath()
  const resourcesPath = process.resourcesPath
  const candidates: string[] = []

  const preferredIconFiles = process.platform === 'darwin'
    ? ['icon.icns', 'icon.png', 'icon.ico']
    : process.platform === 'linux'
      ? ['icon.png', 'icon.ico']
      : ['icon.ico', 'icon.png']

  for (const iconFile of preferredIconFiles) {
    candidates.push(path.join(resourcesPath, 'build', iconFile))
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'build', iconFile))
    candidates.push(path.join(resourcesPath, iconFile))
  }

  for (const iconFile of preferredIconFiles) {
    candidates.push(path.join(appPath, 'build', iconFile))
  }

  return candidates
}

export function findIconPath(): string | null {
  const candidates = getIconCandidates()
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch (error) {
      console.warn('[Icon] 检查图标路径失败:', candidate, error)
    }
  }
  return null
}

function loadIconFromPath(filePath: string): NativeImage | null {
  try {
    if (!fs.existsSync(filePath)) return null

    if (filePath.includes('.asar') && !filePath.includes('.asar.unpacked')) {
      const buffer = fs.readFileSync(filePath)
      const image = nativeImage.createFromBuffer(buffer)
      return image.isEmpty() ? null : image
    }

    const image = nativeImage.createFromPath(filePath)
    return image.isEmpty() ? null : image
  } catch {
    return null
  }
}

function loadTrayIcon(): NativeImage {
  const candidates = getIconCandidates()
  console.log('[Tray] 尝试加载图标，候选路径:', candidates)

  for (const candidate of candidates) {
    const image = loadIconFromPath(candidate)
    if (image) {
      console.log('[Tray] 图标加载成功:', candidate)
      return image
    }
  }

  console.log('[Tray] 文件路径均不可用，使用内嵌图标')
  const fallback = nativeImage.createFromDataURL(`data:image/png;base64,${EMBEDDED_ICON_32_BASE64}`)
  if (!fallback.isEmpty()) {
    return fallback
  }

  console.warn('[Tray] 内嵌图标也失败，使用空图标')
  return nativeImage.createEmpty()
}

export function createAppTray(options: CreateAppTrayOptions): Tray | null {
  try {
    const tray = new Tray(loadTrayIcon())
    options.debug?.('createTray.success')
    const i18n = getElectronStrings()
    tray.setToolTip(i18n.trayTooltip)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: i18n.trayShowWindow,
        click: () => {
          const mainWindow = options.getMainWindow()
          if (process.platform === 'darwin') app.dock?.show()
          mainWindow?.show()
          mainWindow?.focus()
        },
      },
      {
        type: 'separator',
      },
      {
        label: i18n.trayQuit,
        click: () => {
          options.onQuit()
        },
      },
    ])

    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      const mainWindow = options.getMainWindow()
      if (mainWindow?.isVisible()) {
        mainWindow.focus()
      } else {
        if (process.platform === 'darwin') app.dock?.show()
        mainWindow?.show()
      }
    })

    return tray
  } catch (error) {
    console.warn('[Tray] 初始化失败，当前环境可能不支持系统托盘:', error)
    options.debug?.('createTray.failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
