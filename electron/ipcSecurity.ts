import { app, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import path from 'path'

type TrustedWindowProvider = () => BrowserWindow | null

const trustedWindows: TrustedWindowProvider[] = []

export function registerTrustedWindow(provider: TrustedWindowProvider): void {
  trustedWindows.push(provider)
}

export function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const senderWc = event.sender
  if (senderWc.isDestroyed()) return false

  for (const getWindow of trustedWindows) {
    const win = getWindow()
    if (win && !win.isDestroyed() && win.webContents.id === senderWc.id) {
      return true
    }
  }

  return false
}

export function assertTrustedSender(event: IpcMainInvokeEvent, channel: string): void {
  if (!isTrustedSender(event)) {
    console.warn(`[IPC Security] Blocked untrusted call to '${channel}' from webContents id=${event.sender.id}`)
    throw new Error(`IPC channel '${channel}' rejected: untrusted sender`)
  }
}

const SAFE_PATH_ROOTS: string[] = []

function initSafePathRoots(): void {
  if (SAFE_PATH_ROOTS.length > 0) return
  SAFE_PATH_ROOTS.push(
    app.getPath('userData'),
    app.getPath('home'),
    app.getPath('desktop'),
    app.getPath('downloads'),
    app.getPath('documents'),
    app.getPath('temp'),
  )
}

export function isPathAllowed(targetPath: string): boolean {
  initSafePathRoots()
  const resolved = path.resolve(targetPath)
  return SAFE_PATH_ROOTS.some(root => resolved.startsWith(root + path.sep) || resolved === root)
}

const ALLOWED_NAVIGATION_ORIGINS = new Set([
  'http://localhost:5173',
  'file://',
])

export function isAllowedNavigationUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') return true
    if (parsed.protocol === 'devtools:') return true
    const origin = parsed.origin
    return ALLOWED_NAVIGATION_ORIGINS.has(origin)
  } catch {
    return false
  }
}

export function buildCSP(isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    `connect-src 'self' ws: wss: https: http://localhost:*${isDev ? ' ws://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ]
  return directives.join('; ')
}
