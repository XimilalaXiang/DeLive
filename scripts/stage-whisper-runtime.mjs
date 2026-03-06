import fs from 'fs'
import path from 'path'

function printUsage() {
  console.log('Usage: node scripts/stage-whisper-runtime.mjs --binary <path> [--target <win32|darwin|linux>]')
}

function parseArgs(argv) {
  const args = { binary: '', target: process.platform }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    if (current === '--binary') {
      args.binary = argv[i + 1] || ''
      i += 1
      continue
    }
    if (current === '--target') {
      args.target = argv[i + 1] || args.target
      i += 1
    }
  }

  return args
}

function getExpectedBinaryName(target) {
  return target === 'win32' ? 'whisper-server.exe' : 'whisper-server'
}

function ensureFileExists(filePath) {
  if (!filePath) {
    throw new Error('Missing --binary argument')
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Binary does not exist: ${filePath}`)
  }
  const stats = fs.statSync(filePath)
  if (!stats.isFile()) {
    throw new Error(`Binary path is not a file: ${filePath}`)
  }
}

function main() {
  const { binary, target } = parseArgs(process.argv.slice(2))
  if (!binary) {
    printUsage()
    process.exitCode = 1
    return
  }

  ensureFileExists(binary)

  const repoRoot = process.cwd()
  const runtimeDir = path.join(repoRoot, 'local-runtimes', 'whisper_cpp')
  const targetBinaryName = getExpectedBinaryName(target)
  const targetPath = path.join(runtimeDir, targetBinaryName)

  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.copyFileSync(binary, targetPath)

  if (target !== 'win32') {
    fs.chmodSync(targetPath, 0o755)
  }

  console.log(`Staged whisper.cpp runtime binary:`)
  console.log(`  source: ${binary}`)
  console.log(`  target: ${targetPath}`)
  console.log(`  target platform: ${target}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
