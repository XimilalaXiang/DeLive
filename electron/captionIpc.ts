import type { IpcMain } from 'electron'
import { createCaptionWindowController } from './captionWindow'
import { broadcastLiveTranscript } from './apiBroadcast'

interface RegisterCaptionIpcOptions {
  ipcMain: IpcMain
  controller: ReturnType<typeof createCaptionWindowController>
}

export function registerCaptionIpc({ ipcMain, controller }: RegisterCaptionIpcOptions): void {
  ipcMain.handle('caption-toggle', (_event, enable?: boolean, source?: string) => {
    return controller.toggleWindow(enable, source)
  })

  ipcMain.handle('caption-get-status', () => {
    return controller.getStatus()
  })

  ipcMain.handle(
    'caption-update-text',
    (
      _event,
      stableText: string,
      activeText: string,
      isFinal: boolean,
      translatedStableText?: string,
      translatedActiveText?: string,
    ) => {
      controller.updateText(
        stableText,
        activeText,
        isFinal,
        translatedStableText,
        translatedActiveText,
      )

      broadcastLiveTranscript({
        stableText,
        activeText,
        translatedStableText: translatedStableText ?? '',
        translatedActiveText: translatedActiveText ?? '',
        isFinal,
      })
    },
  )

  ipcMain.handle('caption-update-style', (_event, newStyle) => {
    return controller.updateStyle(newStyle)
  })

  ipcMain.handle('caption-toggle-draggable', (_event, draggable?: boolean) => {
    return controller.toggleDraggable(draggable)
  })

  ipcMain.handle('caption-set-interactive', (_event, interactive: boolean) => {
    controller.setInteractive(interactive)
    return true
  })

  ipcMain.handle('caption-open-settings', () => {
    return controller.openSettings()
  })

  ipcMain.handle('caption-get-bounds', () => {
    return controller.getBounds()
  })

  ipcMain.handle('caption-set-bounds', (_event, bounds) => {
    return controller.setBounds(bounds)
  })

  ipcMain.handle('caption-reset-position', () => {
    return controller.resetPosition()
  })
}
