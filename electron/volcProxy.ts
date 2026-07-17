import { createServer, type Server } from 'http'
import { URL } from 'url'
import { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../shared/volcProxyCore'
import { attachMistralProxyServer } from '../shared/mistralProxyCore'
import { attachDeepgramProxyServer } from '../shared/deepgramProxyCore'
import { attachAssemblyAIProxyServer } from '../shared/assemblyaiProxyCore'
import { attachElevenLabsProxyServer } from '../shared/elevenlabsProxyCore'
import { attachGladiaProxyServer } from '../shared/gladiaProxyCore'

const DEFAULT_PORT = 23456
const FALLBACK_PORTS = [23456, 23457, 23458, 23459, 23460]

let actualProxyPort = DEFAULT_PORT

export function getProxyPort(): number {
  return actualProxyPort
}

function tryListen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.removeListener('listening', onListening)
      if (error.code === 'EADDRINUSE') {
        reject(error)
      } else {
        reject(error)
      }
    }
    const onListening = () => {
      server.removeListener('error', onError)
      resolve(port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port)
  })
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

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`)

    if (pathname === '/ws/volc') {
      volcWss.handleUpgrade(request, socket, head, (ws) => {
        volcWss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/mistral') {
      mistralWss.handleUpgrade(request, socket, head, (ws) => {
        mistralWss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/deepgram') {
      deepgramWss.handleUpgrade(request, socket, head, (ws) => {
        deepgramWss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/assemblyai') {
      assemblyaiWss.handleUpgrade(request, socket, head, (ws) => {
        assemblyaiWss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/elevenlabs') {
      elevenlabsWss.handleUpgrade(request, socket, head, (ws) => {
        elevenlabsWss.emit('connection', ws, request)
      })
    } else if (pathname === '/ws/gladia') {
      gladiaWss.handleUpgrade(request, socket, head, (ws) => {
        gladiaWss.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  })

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
    console.error('[Proxy] 所有候选端口均被占用，无法启动代理服务器')
    throw new Error('所有代理候选端口 (23456-23460) 均被占用')
  }

  actualProxyPort = boundPort
  console.log(`[Proxy] 内置代理服务器已启动: http://localhost:${boundPort}`)

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('[Proxy] 服务器运行时错误:', error)
  })

  return { server, port: boundPort }
}
