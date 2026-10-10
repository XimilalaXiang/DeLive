/**
 * CORS shim for local ASR services (funasr-server, OpenAI-compatible servers,
 * whisper.cpp ...) that the renderer calls directly with fetch().
 *
 * In production the renderer is loaded from file:// (origin "null"); in dev it
 * is http://localhost:5173. Either way requests to http://127.0.0.1:8000 etc.
 * are cross-origin, and many local servers send no CORS headers by default
 * (funasr-server only does with --cors-origin), so Chromium blocks them.
 *
 * Only loopback responses are touched, so remote APIs keep their own policy.
 */

export type HeaderMap = Record<string, string[] | string>

export interface LocalCorsResponseDetails {
  url: string
  method: string
  statusCode: number
  responseHeaders?: HeaderMap
}

export interface LocalCorsResult {
  responseHeaders: HeaderMap
  statusLine?: string
}

const ALLOW_METHODS = 'GET, POST, OPTIONS'
const ALLOW_HEADERS = 'Authorization, Content-Type'

export function isLoopbackHttpUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  return host === 'localhost'
    || host === '[::1]'
    || host === '::1'
    || /^127(?:\.\d{1,3}){3}$/.test(host)
}

function setHeader(headers: HeaderMap, name: string, value: string): void {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) delete headers[key]
  }
  headers[name] = [value]
}

function hasHeader(headers: HeaderMap, name: string): boolean {
  const lower = name.toLowerCase()
  return Object.keys(headers).some((key) => key.toLowerCase() === lower)
}

/**
 * Returns response headers (and, for a rejected preflight, a replacement status
 * line) that let the renderer read a loopback service's response.
 * Returns null when the response is not from a loopback service.
 */
export function applyLocalServiceCors(details: LocalCorsResponseDetails): LocalCorsResult | null {
  if (!isLoopbackHttpUrl(details.url)) return null

  const headers: HeaderMap = { ...(details.responseHeaders ?? {}) }
  setHeader(headers, 'Access-Control-Allow-Origin', '*')
  // A wildcard origin cannot be combined with credentials; DeLive never sends
  // cookies to local services, so drop it rather than fail the request.
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'access-control-allow-credentials') delete headers[key]
  }

  const isPreflight = details.method.toUpperCase() === 'OPTIONS'
  if (isPreflight) {
    if (!hasHeader(headers, 'Access-Control-Allow-Methods')) {
      headers['Access-Control-Allow-Methods'] = [ALLOW_METHODS]
    }
    if (!hasHeader(headers, 'Access-Control-Allow-Headers')) {
      headers['Access-Control-Allow-Headers'] = [ALLOW_HEADERS]
    }
    // Servers without CORS support usually answer OPTIONS with 404/405, which
    // fails the preflight even with the headers above.
    if (details.statusCode < 200 || details.statusCode >= 300) {
      return { responseHeaders: headers, statusLine: 'HTTP/1.1 204 No Content' }
    }
  }

  return { responseHeaders: headers }
}
