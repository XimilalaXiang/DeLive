import { createServer, type Server } from 'http'
import { URL } from 'url'
import { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../shared/volcProxyCore'
import { attachMistralProxyServer } from '../shared/mistralProxyCore'
import { attachDeepgramProxyServer } from '../shared/deepgramProxyCore'
import { attachAssemblyAIProxyServer } from '../shared/assemblyaiProxyCore'

export function startVolcProxyServer(port = 23456): Server {
  const server = createServer()

  const volcWss = new WebSocketServer({ noServer: true })
  attachVolcProxyServer(volcWss)

  const mistralWss = new WebSocketServer({ noServer: true })
  attachMistralProxyServer(mistralWss)

  const deepgramWss = new WebSocketServer({ noServer: true })
  attachDeepgramProxyServer(deepgramWss)

  const assemblyaiWss = new WebSocketServer({ noServer: true })
  attachAssemblyAIProxyServer(assemblyaiWss)

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
    } else {
      socket.destroy()
    }
  })

  server.listen(port, () => {
    console.log(`[Proxy] 内置代理服务器已启动: http://localhost:${port}`)
    console.log(`[Proxy] 火山引擎: ws://localhost:${port}/ws/volc`)
    console.log(`[Proxy] Mistral: ws://localhost:${port}/ws/mistral`)
    console.log(`[Proxy] Deepgram: ws://localhost:${port}/ws/deepgram`)
    console.log(`[Proxy] AssemblyAI: ws://localhost:${port}/ws/assemblyai`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`[Proxy] 端口 ${port} 已被占用，代理服务器可能已在运行`)
    } else {
      console.error('[Proxy] 服务器错误:', error)
    }
  })

  return server
}
