import type { CloudBackupIpcConfig, CloudBackupIpcFileInfo } from '../../shared/electronApi'

type WebDAVConfig = NonNullable<CloudBackupIpcConfig['webdav']>

function buildBaseUrl(config: WebDAVConfig): string {
  const url = config.url.replace(/\/+$/, '')
  const base = config.basePath.replace(/^\/+|\/+$/g, '')
  return base ? `${url}/${base}` : url
}

function authHeaders(config: WebDAVConfig): Record<string, string> {
  const token = Buffer.from(`${config.username}:${config.password}`).toString('base64')
  return { Authorization: `Basic ${token}` }
}

async function request(
  url: string,
  method: string,
  config: WebDAVConfig,
  headers?: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string }> {
  const resp = await fetch(url, {
    method,
    headers: {
      ...authHeaders(config),
      ...headers,
    },
    body,
  })
  const text = await resp.text()
  return { status: resp.status, body: text }
}

async function ensureDirectory(config: WebDAVConfig): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = buildBaseUrl(config)

  const propfind = await request(baseUrl + '/', 'PROPFIND', config, {
    Depth: '0',
    'Content-Type': 'application/xml; charset=utf-8',
  }, '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/></D:prop></D:propfind>')

  if (propfind.status === 207 || propfind.status === 200) {
    return { ok: true }
  }

  if (propfind.status === 401 || propfind.status === 403) {
    return { ok: false, error: 'Authentication failed. Check username and password.' }
  }

  if (propfind.status === 404 && config.basePath.trim()) {
    const rootUrl = config.url.replace(/\/+$/, '')
    const segments = config.basePath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
    let currentPath = rootUrl

    for (const seg of segments) {
      currentPath = `${currentPath}/${seg}`
      const check = await request(currentPath + '/', 'PROPFIND', config, {
        Depth: '0',
        'Content-Type': 'application/xml; charset=utf-8',
      }, '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/></D:prop></D:propfind>')

      if (check.status === 207 || check.status === 200) continue

      const mkcol = await request(currentPath + '/', 'MKCOL', config)
      if (mkcol.status !== 201 && mkcol.status !== 405) {
        return { ok: false, error: `Failed to create directory "${seg}" (status ${mkcol.status})` }
      }
    }

    return { ok: true }
  }

  return { ok: false, error: `Server returned status ${propfind.status}` }
}

export async function webdavTest(
  config: WebDAVConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await ensureDirectory(config)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

export async function webdavUpload(
  config: WebDAVConfig,
  jsonData: string,
): Promise<{ ok: boolean; key?: string; error?: string }> {
  try {
    const baseUrl = buildBaseUrl(config)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `delive_backup_${timestamp}.json`
    const fileUrl = `${baseUrl}/${filename}`

    const resp = await request(fileUrl, 'PUT', config, {
      'Content-Type': 'application/json; charset=utf-8',
    }, jsonData)

    if (resp.status >= 200 && resp.status < 300) {
      return { ok: true, key: filename }
    }
    return { ok: false, error: `Upload failed with status ${resp.status}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

export async function webdavList(
  config: WebDAVConfig,
): Promise<{ ok: boolean; files?: CloudBackupIpcFileInfo[]; error?: string }> {
  try {
    const baseUrl = buildBaseUrl(config)
    const resp = await request(baseUrl + '/', 'PROPFIND', config, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    }, '<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:displayname/><D:getcontentlength/><D:getlastmodified/><D:resourcetype/></D:prop></D:propfind>')

    if (resp.status !== 207 && resp.status !== 200) {
      return { ok: false, error: `List failed with status ${resp.status}` }
    }

    const files: CloudBackupIpcFileInfo[] = []
    const hrefRegex = /<D:href>([^<]+)<\/D:href>/gi
    const responses = resp.body.split(/<D:response>/i).slice(1)

    for (const entry of responses) {
      const hrefMatch = hrefRegex.exec(entry)
      hrefRegex.lastIndex = 0
      if (!hrefMatch) continue

      const href = decodeURIComponent(hrefMatch[1])
      if (!href.endsWith('.json')) continue

      const isCollection = /<D:collection\s*\/?>/i.test(entry)
      if (isCollection) continue

      const filename = href.split('/').filter(Boolean).pop() || href

      const lastModMatch = /<D:getlastmodified>([^<]+)<\/D:getlastmodified>/i.exec(entry)
      const sizeMatch = /<D:getcontentlength>([^<]+)<\/D:getcontentlength>/i.exec(entry)

      files.push({
        key: filename,
        lastModified: lastModMatch ? new Date(lastModMatch[1]).toISOString() : '',
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      })
    }

    files.sort((a, b) => {
      const ta = new Date(a.lastModified).getTime() || 0
      const tb = new Date(b.lastModified).getTime() || 0
      return tb - ta
    })

    return { ok: true, files }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

export async function webdavDownload(
  config: WebDAVConfig,
  key: string,
): Promise<{ ok: boolean; data?: string; error?: string }> {
  try {
    const baseUrl = buildBaseUrl(config)
    const fileUrl = `${baseUrl}/${encodeURIComponent(key)}`

    const resp = await request(fileUrl, 'GET', config)

    if (resp.status === 200) {
      return { ok: true, data: resp.body }
    }
    if (resp.status === 404) {
      return { ok: false, error: 'File not found' }
    }
    return { ok: false, error: `Download failed with status ${resp.status}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

export async function webdavDelete(
  config: WebDAVConfig,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const baseUrl = buildBaseUrl(config)
    const fileUrl = `${baseUrl}/${encodeURIComponent(key)}`

    const resp = await request(fileUrl, 'DELETE', config)

    if (resp.status >= 200 && resp.status < 300 || resp.status === 404) {
      return { ok: true }
    }
    return { ok: false, error: `Delete failed with status ${resp.status}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}
