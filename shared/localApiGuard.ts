/**
 * Request checks for DeLive's local HTTP/WebSocket server (ASR proxies, the
 * Open API and /ws/live).
 *
 * The server listens on 127.0.0.1 only, but a web page can still reach it
 * through the browser: directly for WebSockets (no CORS), and through DNS
 * rebinding for HTTP (attacker.com resolving to 127.0.0.1). Both carry a
 * Host or Origin header that a local client would not send.
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * True when the Host header names this machine. Rejecting any other Host
 * blocks DNS-rebinding requests, which carry the attacker's hostname.
 */
export function isLoopbackHostHeader(host: string | undefined): boolean {
  if (!host) return false
  const value = host.trim().toLowerCase()
  const hostname = value.startsWith('[')
    ? value.slice(0, value.indexOf(']') + 1)
    : value.split(':')[0]
  return LOOPBACK_HOSTNAMES.has(hostname)
}

/**
 * Origins allowed to open /ws/live. Local tools (the MCP server, scripts)
 * send no Origin; DeLive's own windows send file:// (packaged) or the Vite
 * dev server. Any other origin is a web page and is refused.
 */
export function isAllowedLiveOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  const value = origin.trim().toLowerCase()
  return value === 'file://' || value === 'null' || value === 'http://localhost:5173'
}
