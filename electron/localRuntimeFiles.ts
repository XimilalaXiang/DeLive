import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import AdmZip from 'adm-zip'
import * as httpModule from 'http'
import * as httpsModule from 'https'
import { URL } from 'url'
import type { LocalRuntimeDefinition, LocalRuntimeLaunchOptions } from './localRuntimeShared'
import { getLocalRuntimeDefinition } from './localRuntimeShared'

export function fileExists(targetPath: string | undefined | null): boolean {
  if (!targetPath) return false
  try {
    return fs.existsSync(targetPath)
  } catch {
    return false
  }
}

export function getLocalRuntimeModelsPath(runtimeId: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const modelsPath = path.join(app.getPath('userData'), definition.modelsSubdir)
  fs.mkdirSync(modelsPath, { recursive: true })
  return modelsPath
}

export function getLocalRuntimeBinariesPath(runtimeId: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const binariesPath = path.join(app.getPath('userData'), definition.binariesSubdir)
  fs.mkdirSync(binariesPath, { recursive: true })
  return binariesPath
}

export function getLocalRuntimeBinaryFiles(runtimeId: string): string[] {
  const binariesPath = getLocalRuntimeBinariesPath(runtimeId)

  try {
    const entries = fs.readdirSync(binariesPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(binariesPath, entry.name))
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.warn('[LocalRuntime] 读取 binary 目录失败:', binariesPath, error)
    return []
  }
}

export function isLikelyIncompleteManagedWhisperCppBinary(runtimeId: string, binaryPath: string | null): boolean {
  if (runtimeId !== 'whisper_cpp' || !binaryPath) {
    return false
  }

  const managedPath = getLocalRuntimeBinariesPath(runtimeId)
  const normalizedBinaryPath = path.resolve(binaryPath)
  const normalizedManagedPath = path.resolve(managedPath)

  if (!normalizedBinaryPath.startsWith(normalizedManagedPath)) {
    return false
  }

  const files = getLocalRuntimeBinaryFiles(runtimeId)
  if (process.platform === 'win32' && files.length <= 1) {
    return true
  }

  return false
}

export function getLocalRuntimeModelFiles(runtimeId: string): string[] {
  const modelsPath = getLocalRuntimeModelsPath(runtimeId)

  try {
    const entries = fs.readdirSync(modelsPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(modelsPath, entry.name))
      .filter((filePath) => {
        const ext = path.extname(filePath).toLowerCase()
        return ext === '.bin' || ext === '.gguf'
      })
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.warn('[LocalRuntime] 读取模型目录失败:', modelsPath, error)
    return []
  }
}

export function resolveUniqueFilePath(directory: string, fileName: string): string {
  const parsed = path.parse(fileName)
  let candidate = path.join(directory, fileName)
  let counter = 1

  while (fileExists(candidate)) {
    candidate = path.join(directory, `${parsed.name} (${counter})${parsed.ext}`)
    counter += 1
  }

  return candidate
}

export function getFileNameFromUrl(urlString: string, fallback: string): string {
  try {
    const parsed = new URL(urlString)
    const pathname = parsed.pathname.split('/').filter(Boolean)
    const candidate = pathname[pathname.length - 1]
    return candidate || fallback
  } catch {
    return fallback
  }
}

async function requestRemoteResource(
  urlString: string,
  targetPath: string,
  redirectDepth = 5,
): Promise<void> {
  const parsed = new URL(urlString)
  const client = parsed.protocol === 'https:' ? httpsModule : httpModule

  await new Promise<void>((resolve, reject) => {
    const request = client.request(urlString, {
      method: 'GET',
      headers: {
        'User-Agent': 'DeLive-Downloader',
        Accept: '*/*',
      },
    }, (response) => {
      const statusCode = response.statusCode || 0

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectDepth <= 0) {
          response.resume()
          reject(new Error('下载失败：重定向次数过多'))
          return
        }

        const nextUrl = new URL(response.headers.location, parsed).toString()
        response.resume()
        void requestRemoteResource(nextUrl, targetPath, redirectDepth - 1)
          .then(resolve)
          .catch(reject)
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const details = Buffer.concat(chunks).toString('utf8').trim()
          reject(new Error(details || `下载失败：HTTP ${statusCode}`))
        })
        return
      }

      const fileStream = fs.createWriteStream(targetPath)
      response.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', (error) => {
        response.resume()
        reject(error)
      })
      response.on('error', reject)
    })

    request.setTimeout(120000, () => {
      request.destroy(new Error('下载超时，请检查网络或稍后重试'))
    })
    request.on('error', reject)
    request.end()
  })
}

function shouldUseWindowsDownloadFallback(error: unknown): boolean {
  if (process.platform !== 'win32') {
    return false
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('econnreset') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnaborted') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('socket hang up') ||
    message.includes('client network socket disconnected') ||
    message.includes('tls') ||
    message.includes('fetch failed')
  )
}

async function downloadFileToPathWithPowerShell(urlString: string, targetPath: string): Promise<void> {
  const powershellPath = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  )

  const script = [
    '$ProgressPreference = "SilentlyContinue"',
    '$ErrorActionPreference = "Stop"',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12',
    `$url = '${urlString.replace(/'/g, "''")}'`,
    `$out = '${targetPath.replace(/'/g, "''")}'`,
    'Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing',
  ].join('; ')

  const encoded = Buffer.from(script, 'utf16le').toString('base64')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(powershellPath, [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded,
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `PowerShell 下载失败 (exit code ${code ?? 'unknown'})`))
    })
  })
}

export async function downloadFileToPath(urlString: string, targetPath: string): Promise<void> {
  try {
    await requestRemoteResource(urlString, targetPath)
  } catch (error) {
    if (shouldUseWindowsDownloadFallback(error)) {
      try {
        await downloadFileToPathWithPowerShell(urlString, targetPath)
        return
      } catch (fallbackError) {
        if (fileExists(targetPath)) {
          try {
            fs.unlinkSync(targetPath)
          } catch {
            // ignore cleanup failure
          }
        }

        const primaryMessage = error instanceof Error ? error.message : String(error)
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        throw new Error(`下载失败：主下载通道错误：${primaryMessage}；Windows 回退下载也失败：${fallbackMessage}`)
      }
    }

    if (fileExists(targetPath)) {
      try {
        fs.unlinkSync(targetPath)
      } catch {
        // ignore cleanup failure
      }
    }
    throw error
  }
}

export function installRuntimeBinaryFile(runtimeId: string, sourcePath: string): string {
  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    throw new Error(`Unknown local runtime: ${runtimeId}`)
  }

  const binariesPath = getLocalRuntimeBinariesPath(runtimeId)
  const canonicalBinaryName = definition.binaryFileNames[0]
  const targetPath = path.join(binariesPath, canonicalBinaryName)
  const sourceExt = path.extname(sourcePath).toLowerCase()

  if (sourceExt === '.zip') {
    const zip = new AdmZip(sourcePath)
    const entries = zip.getEntries()
    const binaryEntry = entries.find((entry) => {
      if (entry.isDirectory) return false
      const normalized = entry.entryName.replace(/\\/g, '/')
      return definition.binaryFileNames.some((fileName) => normalized.endsWith(fileName))
    })

    if (!binaryEntry) {
      throw new Error(`压缩包中未找到 ${canonicalBinaryName}`)
    }

    fs.rmSync(binariesPath, { recursive: true, force: true })
    fs.mkdirSync(binariesPath, { recursive: true })

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const relativeName = entry.entryName.replace(/\\/g, '/')
      const fileName = relativeName.split('/').pop()
      if (!fileName) continue
      const outputPath = path.join(binariesPath, fileName)
      fs.writeFileSync(outputPath, entry.getData())
    }

    if (!fileExists(targetPath)) {
      const fallbackBinary = fs.readdirSync(binariesPath)
        .map((fileName) => path.join(binariesPath, fileName))
        .find((filePath) => definition.binaryFileNames.includes(path.basename(filePath)))

      if (!fallbackBinary) {
        throw new Error(`解压完成，但未找到 ${canonicalBinaryName}`)
      }
    }
  } else {
    fs.copyFileSync(sourcePath, targetPath)
  }

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(targetPath, 0o755)
    } catch (error) {
      console.warn('[LocalRuntime] 设置 binary 可执行权限失败:', targetPath, error)
    }
  }

  return targetPath
}

export function resolveLocalRuntimeBinary(runtimeId: string, options?: LocalRuntimeLaunchOptions): string | null {
  const userBinaryPath = options?.binaryPath?.trim()
  if (userBinaryPath && fileExists(userBinaryPath)) {
    return userBinaryPath
  }

  const definition = getLocalRuntimeDefinition(runtimeId)
  if (!definition) {
    return null
  }

  const candidates: string[] = []
  const managedBinariesPath = getLocalRuntimeBinariesPath(runtimeId)

  for (const fileName of definition.binaryFileNames) {
    candidates.push(path.join(managedBinariesPath, fileName))
  }

  for (const fileName of definition.binaryFileNames) {
    const relativePath = path.join('local-runtimes', definition.id, fileName)
    candidates.push(path.join(process.resourcesPath, relativePath))
    candidates.push(path.join(app.getAppPath(), relativePath))
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch (error) {
      console.warn('[LocalRuntime] 检查二进制失败:', candidate, error)
    }
  }

  return null
}
