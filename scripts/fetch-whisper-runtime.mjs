import fs from 'fs'
import os from 'os'
import path from 'path'
import http from 'http'
import https from 'https'
import AdmZip from 'adm-zip'

const GITHUB_API_URL = 'https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest'

function printUsage() {
  console.log('Usage: node scripts/fetch-whisper-runtime.mjs [--target <win32|darwin|linux>] [--asset-url <url>] [--variant <cpu|blas|cublas-11.8.0|cublas-12.4.0>]')
}

function parseArgs(argv) {
  const args = {
    target: process.platform,
    assetUrl: '',
    variant: 'cpu',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    if (current === '--target') {
      args.target = argv[i + 1] || args.target
      i += 1
      continue
    }
    if (current === '--asset-url') {
      args.assetUrl = argv[i + 1] || ''
      i += 1
      continue
    }
    if (current === '--variant') {
      args.variant = argv[i + 1] || args.variant
      i += 1
    }
  }

  return args
}

function getCanonicalBinaryName(target) {
  return target === 'win32' ? 'whisper-server.exe' : 'whisper-server'
}

function getDefaultAssetName(target, variant) {
  if (target !== 'win32') {
    return null
  }

  switch (variant) {
    case 'blas':
      return 'whisper-blas-bin-x64.zip'
    case 'cublas-11.8.0':
      return 'whisper-cublas-11.8.0-bin-x64.zip'
    case 'cublas-12.4.0':
      return 'whisper-cublas-12.4.0-bin-x64.zip'
    case 'cpu':
    default:
      return 'whisper-bin-x64.zip'
  }
}

function httpRequest(urlString, headers = {}, redirectDepth = 5) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString)
    const client = url.protocol === 'http:' ? http : https
    const request = client.request(urlString, { method: 'GET', headers }, (response) => {
      const statusCode = response.statusCode || 0
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectDepth <= 0) {
          reject(new Error('Too many redirects'))
          return
        }
        const nextUrl = new URL(response.headers.location, url).toString()
        response.resume()
        resolve(httpRequest(nextUrl, headers, redirectDepth - 1))
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          reject(new Error(Buffer.concat(chunks).toString() || `Request failed: ${statusCode}`))
        })
        return
      }

      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
    })

    request.setTimeout(120000, () => {
      request.destroy(new Error('Request timeout'))
    })
    request.on('error', reject)
    request.end()
  })
}

async function fetchJson(url) {
  const buffer = await httpRequest(url, {
    'User-Agent': 'DeLive-Fetch-Whisper-Runtime',
    Accept: 'application/vnd.github+json',
  })
  return JSON.parse(buffer.toString('utf8'))
}

async function resolveAssetUrl(target, variant, assetUrl) {
  if (assetUrl) {
    return { url: assetUrl, source: 'custom-url' }
  }

  const defaultAssetName = getDefaultAssetName(target, variant)
  if (!defaultAssetName) {
    throw new Error(`No built-in official asset mapping for target=${target}. Use --asset-url.`)
  }

  const payload = await fetchJson(GITHUB_API_URL)
  const asset = (payload.assets || []).find((item) => item.name === defaultAssetName)
  if (!asset?.browser_download_url) {
    throw new Error(`Official asset not found in latest release: ${defaultAssetName}`)
  }

  return {
    url: asset.browser_download_url,
    source: `${payload.tag_name || 'latest'}:${defaultAssetName}`,
  }
}

async function downloadToFile(url, targetPath) {
  const buffer = await httpRequest(url, {
    'User-Agent': 'DeLive-Fetch-Whisper-Runtime',
    Accept: '*/*',
  })
  fs.writeFileSync(targetPath, buffer)
}

function extractBinaryFromZip(zipPath, canonicalBinaryName, outputPath) {
  const zip = new AdmZip(zipPath)
  const entry = zip.getEntries().find((item) => {
    if (item.isDirectory) return false
    const normalized = item.entryName.replace(/\\/g, '/')
    return normalized.endsWith(canonicalBinaryName)
  })

  if (!entry) {
    throw new Error(`Zip does not contain ${canonicalBinaryName}`)
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, entry.getData())
}

async function main() {
  const { target, assetUrl, variant } = parseArgs(process.argv.slice(2))
  const repoRoot = process.cwd()
  const runtimeDir = path.join(repoRoot, 'local-runtimes', 'whisper_cpp')
  const canonicalBinaryName = getCanonicalBinaryName(target)
  const outputPath = path.join(runtimeDir, canonicalBinaryName)

  const resolved = await resolveAssetUrl(target, variant, assetUrl)
  const tmpZipPath = path.join(os.tmpdir(), `delive-whisper-runtime-${Date.now()}.zip`)

  await downloadToFile(resolved.url, tmpZipPath)
  extractBinaryFromZip(tmpZipPath, canonicalBinaryName, outputPath)

  if (target !== 'win32') {
    fs.chmodSync(outputPath, 0o755)
  }

  fs.unlinkSync(tmpZipPath)

  console.log('Fetched whisper.cpp runtime binary:')
  console.log(`  source: ${resolved.source}`)
  console.log(`  url: ${resolved.url}`)
  console.log(`  target: ${outputPath}`)
}

try {
  await main()
} catch (error) {
  printUsage()
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
