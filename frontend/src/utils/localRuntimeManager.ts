import type { ProviderConfigData } from '../types'
import type { ASRVendor } from '../types/asr'
import {
  type LocalServiceKind,
  type LocalServiceProbeResult,
  type OllamaPullProgress,
  isModelInstalled,
  probeLocalService,
  pullOllamaModel,
} from './localModelSetup'

export type LocalRuntimeManagerKind = 'service' | 'runtime'
export type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'
export type BundledRuntimeSnapshot = LocalRuntimeSnapshot

export interface LocalRuntimeModelStatus {
  installed: boolean
  installedModels: string[]
}

export interface LocalServiceRuntimeManager {
  kind: 'service'
  probe(config: ProviderConfigData): Promise<LocalServiceProbeResult>
  checkModel(config: ProviderConfigData): Promise<LocalRuntimeModelStatus>
  installModel?(
    config: ProviderConfigData,
    onProgress?: (progress: OllamaPullProgress) => void
  ): Promise<void>
}

export interface BundledRuntimeManager {
  kind: 'runtime'
  runtimeId: string
  getSnapshot(config?: ProviderConfigData): Promise<BundledRuntimeSnapshot>
  start(config?: ProviderConfigData): Promise<BundledRuntimeSnapshot>
  stop(config?: ProviderConfigData): Promise<BundledRuntimeSnapshot>
  openModelsPath(): Promise<string>
  listModels(): Promise<string[]>
  importModel(sourcePath: string): Promise<string>
  importBinary(sourcePath: string): Promise<string>
  downloadModel(urlString: string): Promise<string>
  downloadBinary(urlString: string): Promise<string>
  preloadModel?(config: ProviderConfigData): Promise<void>
}

export type LocalRuntimeManager = LocalServiceRuntimeManager | BundledRuntimeManager

function readTextConfig(config: ProviderConfigData, key: string): string {
  const value = config[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readNumberConfig(config: ProviderConfigData, key: string): number | undefined {
  const value = config[key]
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function buildRuntimeLaunchOptionsFromConfig(config: ProviderConfigData = {}): LocalRuntimeLaunchOptions {
  const binaryPath = readTextConfig(config, 'binaryPath')
  const modelPath = readTextConfig(config, 'modelPath')
  const port = readNumberConfig(config, 'port')

  return {
    ...(binaryPath ? { binaryPath } : {}),
    ...(modelPath ? { modelPath } : {}),
    ...(port ? { port } : {}),
  }
}

const localServiceManager: LocalServiceRuntimeManager = {
  kind: 'service',
  async probe(config) {
    const baseUrl = readTextConfig(config, 'baseUrl')
    const apiKey = readTextConfig(config, 'apiKey')
    return probeLocalService(baseUrl, apiKey)
  },
  async checkModel(config) {
    const baseUrl = readTextConfig(config, 'baseUrl')
    const apiKey = readTextConfig(config, 'apiKey')
    const result = await probeLocalService(baseUrl, apiKey)
    const model = readTextConfig(config, 'model')
    return {
      installed: isModelInstalled(result.installedModels, model),
      installedModels: result.installedModels,
    }
  },
  async installModel(config, onProgress) {
    const model = readTextConfig(config, 'model')
    if (!model) {
      throw new Error('请先填写模型名称')
    }

    const baseUrl = readTextConfig(config, 'baseUrl')
    const apiKey = readTextConfig(config, 'apiKey')
    const result = await probeLocalService(baseUrl, apiKey)
    if (result.kind !== 'ollama') {
      throw new Error('当前服务暂不支持一键拉取，请在服务侧先下载模型')
    }

    await pullOllamaModel(baseUrl, model, onProgress)
  },
}

const localRuntimeManagers: Partial<Record<ASRVendor, LocalRuntimeManager>> = {}

function getElectronRuntimeApi() {
  if (!window.electronAPI) {
    throw new Error('当前不在 Electron 环境中，无法管理 bundled runtime')
  }
  return window.electronAPI
}

export function createBundledRuntimeManager(runtimeId: string): BundledRuntimeManager {
  return {
    kind: 'runtime',
    runtimeId,
    async getSnapshot(config) {
      return getElectronRuntimeApi().localRuntimeGetStatus(runtimeId, buildRuntimeLaunchOptionsFromConfig(config))
    },
    async start(config) {
      const result = await getElectronRuntimeApi().localRuntimeStart(runtimeId, buildRuntimeLaunchOptionsFromConfig(config))
      if (!result.success) {
        throw new Error(result.error || result.status.message || '启动 runtime 失败')
      }
      return result.status
    },
    async stop(config) {
      const result = await getElectronRuntimeApi().localRuntimeStop(runtimeId, buildRuntimeLaunchOptionsFromConfig(config))
      if (!result.success) {
        throw new Error(result.error || result.status.message || '停止 runtime 失败')
      }
      return result.status
    },
    async openModelsPath() {
      const result = await getElectronRuntimeApi().localRuntimeOpenModelsPath(runtimeId)
      if (!result.success) {
        throw new Error(result.error || '打开模型目录失败')
      }
      return result.path
    },
    async listModels() {
      return getElectronRuntimeApi().localRuntimeListModels(runtimeId)
    },
    async importModel(sourcePath) {
      const result = await getElectronRuntimeApi().localRuntimeImportModel(runtimeId, sourcePath)
      if (!result.success) {
        throw new Error(result.error || '导入模型失败')
      }
      return result.path
    },
    async importBinary(sourcePath) {
      const result = await getElectronRuntimeApi().localRuntimeImportBinary(runtimeId, sourcePath)
      if (!result.success) {
        throw new Error(result.error || '导入 runtime binary 失败')
      }
      return result.path
    },
    async downloadModel(urlString) {
      const result = await getElectronRuntimeApi().localRuntimeDownloadModel(runtimeId, urlString)
      if (!result.success) {
        throw new Error(result.error || '下载模型失败')
      }
      return result.path
    },
    async downloadBinary(urlString) {
      const result = await getElectronRuntimeApi().localRuntimeDownloadBinary(runtimeId, urlString)
      if (!result.success) {
        throw new Error(result.error || '下载 runtime binary 失败')
      }
      return result.path
    },
  }
}

export function registerLocalRuntimeManager(vendorId: ASRVendor, manager: LocalRuntimeManager): void {
  localRuntimeManagers[vendorId] = manager
}

export function getLocalRuntimeManager(vendorId: ASRVendor | string | undefined): LocalRuntimeManager | undefined {
  if (!vendorId) {
    return undefined
  }
  return localRuntimeManagers[vendorId as ASRVendor]
}

export function getLocalServiceKindLabel(kind: LocalServiceKind): string {
  return kind === 'ollama' ? 'Ollama' : 'OpenAI-compatible'
}

registerLocalRuntimeManager('local_openai' as ASRVendor, localServiceManager)
