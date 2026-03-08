import type { IpcMain } from 'electron'
import type {
  LocalRuntimeController,
  LocalRuntimeLaunchOptions,
} from './localRuntime'
import { createRuntimeErrorSnapshot } from './localRuntime'
import { assertTrustedSender } from './ipcSecurity'

interface RegisterLocalRuntimeIpcOptions {
  ipcMain: IpcMain
  controller: LocalRuntimeController
}

export function registerLocalRuntimeIpc({ ipcMain, controller }: RegisterLocalRuntimeIpcOptions): void {
  ipcMain.handle('local-runtime-get-status', (event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    assertTrustedSender(event, 'local-runtime-get-status')
    try {
      return controller.getStatus(runtimeId, options)
    } catch (error) {
      return createRuntimeErrorSnapshot(runtimeId, options, error instanceof Error ? error.message : '获取 runtime 状态失败')
    }
  })

  ipcMain.handle('local-runtime-open-models-path', async (event, runtimeId: string) => {
    assertTrustedSender(event, 'local-runtime-open-models-path')
    return controller.openModelsPath(runtimeId)
  })

  ipcMain.handle('local-runtime-list-models', (event, runtimeId: string) => {
    assertTrustedSender(event, 'local-runtime-list-models')
    try {
      return controller.listModels(runtimeId)
    } catch (error) {
      console.error('[LocalRuntime] 列出模型失败:', error)
      return []
    }
  })

  ipcMain.handle('local-runtime-import-model', async (event, runtimeId: string, sourcePath: string) => {
    assertTrustedSender(event, 'local-runtime-import-model')
    return controller.importModel(runtimeId, sourcePath)
  })

  ipcMain.handle('local-runtime-import-binary', async (event, runtimeId: string, sourcePath: string) => {
    assertTrustedSender(event, 'local-runtime-import-binary')
    return controller.importBinary(runtimeId, sourcePath)
  })

  ipcMain.handle('local-runtime-download-model', async (event, runtimeId: string, urlString: string) => {
    assertTrustedSender(event, 'local-runtime-download-model')
    return controller.downloadModel(runtimeId, urlString)
  })

  ipcMain.handle('local-runtime-download-binary', async (event, runtimeId: string, urlString: string) => {
    assertTrustedSender(event, 'local-runtime-download-binary')
    return controller.downloadBinary(runtimeId, urlString)
  })

  ipcMain.handle('local-runtime-start', async (event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    assertTrustedSender(event, 'local-runtime-start')
    return controller.start(runtimeId, options)
  })

  ipcMain.handle('local-runtime-stop', async (event, runtimeId: string, options?: LocalRuntimeLaunchOptions) => {
    assertTrustedSender(event, 'local-runtime-stop')
    return controller.stop(runtimeId, options)
  })
}
