import { createServer, type IncomingMessage, type Server } from 'http'
import { createServer as createNetServer } from 'net'
import type { Duplex } from 'stream'
import { URL } from 'url'
import { WebSocketServer } from 'ws'
import { isAllowedAppOrigin, isLoopbackHostHeader } from '../shared/localApiGuard'
import { attachVolcProxyServer } from '../shared/volcProxyCore'
import { attachMistralProxyServer } from '../shared/mistralProxyCore'
import { attachDeepgramProxyServer } from '../shared/deepgramProxyCore'
import { attachAssemblyAIProxyServer } from '../shared/assemblyaiProxyCore'
import { attachElevenLabsProxyServer } from '../shared/elevenlabsProxyCore'
import { attachGladiaProxyServer } from '../shared/gladiaProxyCore'
import { attachSixtydbProxyServer } from '../shared/sixtydbProxyCore'

const DEFAULT_PORT = 23456
const FALLBACK_PORTS = [23456, 23457, 23458, 23459, 23460]

// Only this machine may connect. Binding to every interface exposed the
// proxies and the Open API to anyone on the same network.
const LISTEN_HOST = '127.0.0.1'

let actualProxyPort = DEFAULT_PORT

type UpgradeHandler = (request: IncomingMessage, socket: Duplex, head: Buffer) => void

const upgradeRoutes = new WeakMap<Server, Map<string, UpgradeHandler>>()

/**
 * Routes WebSocket upgrades for `pathname` on `server`. All routes share one
 * 'upgrade' listener, which first refuses non-local hosts and web-page
 * origins, and refuses an unknown path only after every route (including
 * /ws/live, added by apiServer) has been checked.
 */
export function registerUpgradeRoute(
  server: Server,
  pathname: string,
  target: WebSocketServer | UpgradeHandler,
): void {
  let routes = upgradeRoutes.get(server)
  if (!routes) {
    const table = new Map<string, UpgradeHandler>()
    routes = table
    upgradeRoutes.set(server, table)
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      // WebSockets are not covered by CORS: without the Origin check any web
      // page could use the proxies or subscribe to /ws/live.
      if (!isLoopbackHostHeader(request.headers.host) || !isAllowedAppOrigin(request.headers.origin)) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
      const { pathname: requestPath } = new URL(request.url || '', 'http://localhost')
      const handler = table.get(requestPath)
      if (handler) {
        handler(request, socket, head)
      } else {
        socket.destroy()
      }
    })
  }

  const handler: UpgradeHandler = typeof target === 'function'
    ? target
    : (request, socket, head) => {
        target.handleUpgrade(request, socket, head, (ws) => {
          target.emit('connection', ws, request)
        })
      }
  routes.set(pathname, handler)
}

export function getProxyPort(): number {
  return actualProxyPort
}

function tryListen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.removeListener('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve(port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, LISTEN_HOST)
  })
}

/**
 * `localhost` may resolve to ::1 first (Node's default resolver, some
 * systems' Chromium), so also accept connections on the IPv6 loopback and
 * hand them to the same HTTP server. Skipped quietly if IPv6 is unavailable.
 */
function listenOnIpv6Loopback(server: Server, port: number): void {
  const mirror = createNetServer((socket) => {
    server.emit('connection', socket)
  })
  mirror.on('error', (error: NodeJS.ErrnoException) => {
    console.warn(`[Proxy] 未能在 [::1]:${port} 监听 (${error.code ?? error.message})，仅使用 127.0.0.1`)
  })
  mirror.listen(port, '::1')
  server.on('close', () => mirror.close())
}

export async function startVolcProxyServer(): Promise<{ server: Server; port: number }> {
  const server = createServer()

  const volcWss = new WebSocketServer({ noServer: true })
  attachVolcProxyServer(volcWss)

  const mistralWss = new WebSocketServer({ noServer: true })
  attachMistralProxyServer(mistralWss)

  const deepgramWss = new WebSocketServer({ noServer: true })
  attachDeepgramProxyServer(deepgramWss)

  const assemblyaiWss = new WebSocketServer({ noServer: true })
  attachAssemblyAIProxyServer(assemblyaiWss)

  const elevenlabsWss = new WebSocketServer({ noServer: true })
  attachElevenLabsProxyServer(elevenlabsWss)

  const gladiaWss = new WebSocketServer({ noServer: true })
  attachGladiaProxyServer(gladiaWss)

  const sixtydbWss = new WebSocketServer({ noServer: true })
  attachSixtydbProxyServer(sixtydbWss)

  registerUpgradeRoute(server, '/ws/volc', volcWss)
  registerUpgradeRoute(server, '/ws/mistral', mistralWss)
  registerUpgradeRoute(server, '/ws/deepgram', deepgramWss)
  registerUpgradeRoute(server, '/ws/assemblyai', assemblyaiWss)
  registerUpgradeRoute(server, '/ws/elevenlabs', elevenlabsWss)
  registerUpgradeRoute(server, '/ws/gladia', gladiaWss)
  registerUpgradeRoute(server, '/ws/sixtydb', sixtydbWss)

  let boundPort: number | null = null
  for (const port of FALLBACK_PORTS) {
    try {
      boundPort = await tryListen(server, port)
      break
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'EADDRINUSE') {
        console.warn(`[Proxy] 端口 ${port} 已被占用，尝试下一个...`)
      } else {
        console.error(`[Proxy] 端口 ${port} 绑定失败:`, err)
      }
    }
  }

  if (boundPort == null) {
    // All preferred ports are taken: let the OS pick a free one. The renderer
    // reads the real port over IPC, so only external MCP/API clients need to
    // look up the new port in Settings.
    console.warn('[Proxy] 候选端口 (23456-23460) 均不可用，改用系统分配的空闲端口')
    await tryListen(server, 0)
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('代理服务器无法获取监听端口')
    }
    boundPort = address.port
  }

  actualProxyPort = boundPort
  listenOnIpv6Loopback(server, boundPort)
  console.log(`[Proxy] 内置代理服务器已启动: http://${LISTEN_HOST}:${boundPort}`)

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('[Proxy] 服务器运行时错误:', error)
  })

  return { server, port: boundPort }
}
