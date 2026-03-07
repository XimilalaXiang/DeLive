import type { IpcMain } from 'electron'
import type {
  LocalRuntimeController,
  LocalRuntimeLaunchOptions,
} from './localRuntime'
import { createRuntimeErrorSnapshot } from './localRuntime'

interface RegisterLocalRuntimeIpcOptions {
  ipcMain: IpcMain
  controller: LocalRuntimeController
}

export function registerLocalRuntimeIpc({ ipcMain, controller }: RegisterLocalRuntimeIpcOptions): void {
  ipcMain.handle('local-runtime-get-status', (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    try {
      return controller.getStatus(runtimeId, options)
    } catch (error) {
      return createRuntimeErrorSnapshot(runtimeId, options, error instanceof Error ? error.message : '获取 runtime 状态失败')
    }
  })

  ipcMain.handle('local-runtime-open-models-path', async (_event, runtimeId: string) => {
    return controller.openModelsPath(runtimeId)
  })

  ipcMain.handle('local-runtime-list-models', (_event, runtimeId: string) => {
    try {
      return controller.listModels(runtimeId)
    } catch (error) {
      console.error('[LocalRuntime] 列出模型失败:', error)
      return []
    }
  })

  ipcMain.handle('local-runtime-import-model', async (_event, runtimeId: string, sourcePath: string) => {
    return controller.importModel(runtimeId, sourcePath)
  })

  ipcMain.handle('local-runtime-import-binary', async (_event, runtimeId: string, sourcePath: string) => {
    return controller.importBinary(runtimeId, sourcePath)
  })

  ipcMain.handle('local-runtime-download-model', async (_event, runtimeId: string, urlString: string) => {
    return controller.downloadModel(runtimeId, urlString)
  })

  ipcMain.handle('local-runtime-download-binary', async (_event, runtimeId: string, urlString: string) => {
    return controller.downloadBinary(runtimeId, urlString)
  })

  ipcMain.handle('local-runtime-start', async (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    return controller.start(runtimeId, options)
  })

  ipcMain.handle('local-runtime-stop', async (_event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    return controller.stop(runtimeId, options)
  })
}
