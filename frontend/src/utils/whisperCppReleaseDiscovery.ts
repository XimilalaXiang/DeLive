export interface WhisperCppReleaseAsset {
  name: string
  url: string
}

export interface WhisperCppReleaseInfo {
  tag: string
  assets: WhisperCppReleaseAsset[]
}

function scoreAssetName(name: string, platform: 'win32' | 'darwin' | 'linux' | undefined): number {
  const lower = name.toLowerCase()
  let score = 0

  if (platform === 'win32' && lower.includes('x64')) score += 40
  if (platform === 'win32' && lower.includes('win')) score += 20
  if (platform === 'darwin' && (lower.includes('mac') || lower.includes('osx'))) score += 40
  if (platform === 'linux' && lower.includes('linux')) score += 40
  if (lower.includes('server')) score += 20
  if (lower.includes('bin')) score += 10
  if (lower.includes('blas')) score += 5

  return score
}

export async function fetchLatestWhisperCppReleaseInfo(
  platform: 'win32' | 'darwin' | 'linux' | undefined
): Promise<WhisperCppReleaseInfo> {
  const response = await fetch('https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest', {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `获取 whisper.cpp release 失败: ${response.status}`)
  }

  const payload = await response.json() as {
    tag_name?: string
    assets?: Array<{
      name?: string
      browser_download_url?: string
    }>
  }

  const assets = (payload.assets || [])
    .map((asset) => ({
      name: asset.name || '',
      url: asset.browser_download_url || '',
    }))
    .filter((asset) => asset.name && asset.url)
    .sort((a, b) => scoreAssetName(b.name, platform) - scoreAssetName(a.name, platform))

  return {
    tag: payload.tag_name || 'unknown',
    assets,
  }
}
