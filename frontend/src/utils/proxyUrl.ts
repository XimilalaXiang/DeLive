const DEFAULT_PROXY_PORT = 23456

let cachedPort: number | null = null

export async function getProxyPort(): Promise<number> {
  if (cachedPort != null) return cachedPort

  const api = (window as Record<string, unknown>).electronAPI as
    | { getProxyPort?: () => Promise<number> }
    | undefined

  if (api?.getProxyPort) {
    try {
      cachedPort = await api.getProxyPort()
      return cachedPort
    } catch {
      // IPC failed, fall through to default
    }
  }

  cachedPort = DEFAULT_PROXY_PORT
  return cachedPort
}

export async function getProxyWsUrl(path: string): Promise<string> {
  const port = await getProxyPort()
  return `ws://localhost:${port}${path}`
}

export async function getProxyHttpUrl(path: string): Promise<string> {
  const port = await getProxyPort()
  return `http://localhost:${port}${path}`
}
