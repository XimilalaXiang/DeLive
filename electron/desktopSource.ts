import { desktopCapturer, session, type BrowserWindow, type IpcMain } from 'electron'

// Electron 的 display media callback 类型在这里不稳定，沿用主进程旧实现的宽类型。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DisplayMediaCallback = (result: any) => void

interface DesktopSourceControllerOptions {
  getMainWindow: () => BrowserWindow | null
}

export function createDesktopSourceController(options: DesktopSourceControllerOptions) {
  let pendingDisplayMediaCallback: DisplayMediaCallback | null = null
  let lastSelectedSourceId: string | null = null

  function attachDisplayMediaHandler(): void {
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      if (lastSelectedSourceId) {
        try {
          const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
          const savedSource = sources.find((source) => source.id === lastSelectedSourceId)
          if (savedSource) {
            console.log('[DisplayMedia] 自动复用上次选择的源:', lastSelectedSourceId)
            callback({ video: savedSource, audio: 'loopback' as const })
            return
          }
          console.log('[DisplayMedia] 上次选择的源已不可用，显示选择器')
        } catch (error) {
          console.error('[DisplayMedia] 自动复用源失败:', error)
        }
      }

      pendingDisplayMediaCallback = callback
      const mainWindow = options.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('show-source-picker')
      }
    })
  }

  async function selectSource(sourceId: string): Promise<boolean> {
    if (!pendingDisplayMediaCallback) return false

    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
      const selectedSource = sources.find((source) => source.id === sourceId)

      if (selectedSource) {
        lastSelectedSourceId = sourceId
        pendingDisplayMediaCallback({ video: selectedSource, audio: 'loopback' as const })
        pendingDisplayMediaCallback = null
        return true
      }

      pendingDisplayMediaCallback({})
      pendingDisplayMediaCallback = null
      return false
    } catch (error) {
      console.error('选择源失败:', error)
      pendingDisplayMediaCallback?.({})
      pendingDisplayMediaCallback = null
      return false
    }
  }

  function cancelSourceSelection(): void {
    if (pendingDisplayMediaCallback) {
      pendingDisplayMediaCallback({})
      pendingDisplayMediaCallback = null
    }
  }

  async function listDesktopSources() {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    })

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || null,
      isScreen: source.id.startsWith('screen:'),
    }))
  }

  return {
    attachDisplayMediaHandler,
    selectSource,
    cancelSourceSelection,
    listDesktopSources,
  }
}

interface RegisterDesktopSourceIpcOptions {
  ipcMain: IpcMain
  controller: ReturnType<typeof createDesktopSourceController>
}

export function registerDesktopSourceIpc({ ipcMain, controller }: RegisterDesktopSourceIpcOptions): void {
  ipcMain.removeHandler('select-source')
  ipcMain.handle('select-source', async (_event, sourceId: string) => {
    return controller.selectSource(sourceId)
  })

  ipcMain.removeHandler('cancel-source-selection')
  ipcMain.handle('cancel-source-selection', () => {
    controller.cancelSourceSelection()
  })

  ipcMain.handle('get-desktop-sources', async () => {
    try {
      return await controller.listDesktopSources()
    } catch (error) {
      console.error('获取桌面源失败:', error)
      return []
    }
  })
}
