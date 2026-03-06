import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const version = process.argv[2] ?? process.env.RELEASE_VERSION
const repo = process.env.GITHUB_REPOSITORY ?? ''
const workspace = process.env.GITHUB_WORKSPACE
  ? path.resolve(process.env.GITHUB_WORKSPACE)
  : process.cwd()

if (!version) {
  fail('Missing release version. Usage: node scripts/generate-release-notes.mjs <version>')
}

const changelogPath = path.join(workspace, 'CHANGELOG.md')

if (!existsSync(changelogPath)) {
  fail(`CHANGELOG.md not found at ${changelogPath}`)
}

const changelog = readFileSync(changelogPath, 'utf8')
const sections = parseChangelogSections(changelog)
const currentIndex = sections.findIndex((section) => section.version === version)

if (currentIndex === -1) {
  const knownVersions = sections.slice(0, 5).map((section) => section.version).join(', ')
  fail(`Version ${version} was not found in CHANGELOG.md. Known versions: ${knownVersions}`)
}

const currentSection = sections[currentIndex]
const previousSection = sections[currentIndex + 1]
const downloadRows = collectDownloadRows(workspace, version)

if (downloadRows.length === 0) {
  fail('No release assets were found in release-win, release-mac, or release-linux')
}

const lines = [
  `## DeLive ${version}`,
  '',
]

if (currentSection.date) {
  lines.push(`> 发布日期 / Release Date: ${currentSection.date}`, '')
}

lines.push(
  '### 📥 下载 / Downloads',
  '',
  '| 平台 / Platform | 文件 / File | 说明 / Description |',
  '|-----------------|-------------|---------------------|',
)

for (const row of downloadRows) {
  lines.push(`| ${row.platform} | ${formatAssetLink(row.filename, repo, version)} | ${row.description} |`)
}

lines.push(
  '',
  '### 🔄 更新内容 / What\'s Changed',
  '',
  currentSection.body,
  '',
  '### 📖 使用说明 / Usage',
  '',
  '1. 下载对应平台的安装包',
  '2. 运行安装或直接打开',
  '3. 在设置中配置 ASR 服务商的 API 密钥',
  '4. 开始录制并享受实时转录',
  '',
  '> ⚠️ macOS 用户注意：应用未经 Apple 签名，首次打开需右键选择"打开"，或在"系统设置 > 隐私与安全性"中允许运行。',
)

if (repo && previousSection) {
  lines.push(
    '',
    '---',
    '',
    `**Full Changelog**: https://github.com/${repo}/compare/v${previousSection.version}...v${version}`,
  )
}

process.stdout.write(`${normalizeSpacing(lines.join('\n'))}\n`)

function parseChangelogSections(source) {
  const headingPattern = /^## \[(?<version>[^\]]+)\](?: - (?<date>.+))?$/gm
  const matches = [...source.matchAll(headingPattern)]

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? source.length) : source.length
    const body = cleanSectionBody(source.slice(start, end))

    return {
      version: match.groups?.version?.trim() ?? '',
      date: match.groups?.date?.trim() ?? '',
      body,
    }
  }).filter((section) => section.version && section.body)
}

function collectDownloadRows(rootDir, releaseVersion) {
  const escapedVersion = escapeRegExp(releaseVersion)
  const specs = [
    {
      dir: 'release-win',
      platform: '🪟 Windows',
      pattern: new RegExp(`^DeLive-${escapedVersion}-x64\\.exe$`),
      description: 'Windows 安装包 / Installer',
    },
    {
      dir: 'release-win',
      platform: '🪟 Windows',
      pattern: new RegExp(`^DeLive-${escapedVersion}-portable\\.exe$`),
      description: '便携版 / Portable',
    },
    {
      dir: 'release-mac',
      platform: '🍎 macOS',
      pattern: new RegExp(`^DeLive-${escapedVersion}-mac-x64\\.dmg$`),
      description: 'macOS Intel 安装包',
    },
    {
      dir: 'release-mac',
      platform: '🍎 macOS',
      pattern: new RegExp(`^DeLive-${escapedVersion}-mac-arm64\\.dmg$`),
      description: 'macOS Apple Silicon 安装包',
    },
    {
      dir: 'release-linux',
      platform: '🐧 Linux',
      pattern: new RegExp(`^DeLive-${escapedVersion}-linux-x64\\.AppImage$`),
      description: 'Linux AppImage',
    },
    {
      dir: 'release-linux',
      platform: '🐧 Linux',
      pattern: new RegExp(`^DeLive-${escapedVersion}-linux-x64\\.deb$`),
      description: 'Debian/Ubuntu 安装包',
    },
  ]

  return specs.flatMap((spec) => {
    const dirPath = path.join(rootDir, spec.dir)

    if (!existsSync(dirPath)) {
      return []
    }

    const filename = readdirSync(dirPath).find((entry) => spec.pattern.test(entry))

    if (!filename) {
      return []
    }

    return [{
      platform: spec.platform,
      filename,
      description: spec.description,
    }]
  })
}

function formatAssetLink(filename, repoName, releaseVersion) {
  if (!repoName) {
    return `\`${filename}\``
  }

  const encodedFilename = encodeURIComponent(filename)
  const url = `https://github.com/${repoName}/releases/download/v${releaseVersion}/${encodedFilename}`
  return `[${filename}](${url})`
}

function normalizeSpacing(markdown) {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

function cleanSectionBody(body) {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\n---\s*$/u, '')
    .trim()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
