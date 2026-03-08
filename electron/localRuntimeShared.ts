import path from 'path'
import type { ChildProcess } from 'child_process'

export type LocalRuntimeStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface LocalRuntimeDefinition {
  id: string
  displayName: string
  modelsSubdir: string
  binariesSubdir: string
  binaryFileNames: string[]
}

export interface LocalRuntimeSnapshot {
  runtimeId: string
  displayName: string
  status: LocalRuntimeStatus
  available: boolean
  modelsPath: string
  binaryPath: string | null
  baseUrl: string
  message?: string
}

export interface LocalRuntimeState {
  status: LocalRuntimeStatus
  process?: ChildProcess
  launchConfigHash?: string
  binaryPath?: string | null
  baseUrl?: string
  lastError?: string
  lastLogs?: string[]
}

export interface LocalRuntimeLaunchOptions {
  binaryPath?: string
  modelPath?: string
  port?: number
}

export interface ResolvedLocalRuntimeLaunchOptions {
  binaryPath: string | null
  modelPath: string
  port: number
  baseUrl: string
}

export interface LocalRuntimeController {
  getStatus: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => LocalRuntimeSnapshot
  openModelsPath: (runtimeId: string) => Promise<{ success: boolean; path: string; error?: string }>
  listModels: (runtimeId: string) => string[]
  importModel: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
  importBinary: (runtimeId: string, sourcePath: string) => Promise<{ success: boolean; path: string; error?: string }>
  downloadModel: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
  downloadBinary: (runtimeId: string, urlString: string) => Promise<{ success: boolean; path: string; error?: string }>
  start: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
  stop: (runtimeId: string, options?: LocalRuntimeLaunchOptions) => Promise<{ success: boolean; status: LocalRuntimeSnapshot; error?: string }>
  stopAll: () => Promise<void>
}

function getRuntimeBinaryFileNames(): string[] {
  if (process.platform === 'win32') {
    return ['whisper-server.exe', 'server.exe']
  }
  return ['whisper-server', 'server']
}

const localRuntimeDefinitions: Record<string, LocalRuntimeDefinition> = {
  whisper_cpp: {
    id: 'whisper_cpp',
    displayName: 'whisper.cpp',
    modelsSubdir: path.join('local-runtimes', 'whisper_cpp', 'models'),
    binariesSubdir: path.join('local-runtimes', 'whisper_cpp', 'bin'),
    binaryFileNames: getRuntimeBinaryFileNames(),
  },
}

export function getLocalRuntimeDefinition(runtimeId: string): LocalRuntimeDefinition | null {
  return localRuntimeDefinitions[runtimeId] || null
}
