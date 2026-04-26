import { createServer, type Server } from 'http'
import { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../shared/volcProxyCore'
import { attachMistralProxyServer } from '../shared/mistralProxyCore'

export function startVolcProxyServer(port = 23456): Server {
  const server = createServer()

  const volcWss = new WebSocketServer({ server, path: '/ws/volc' })
  attachVolcProxyServer(volcWss)

  const mistralWss = new WebSocketServer({ server, path: '/ws/mistral' })
  attachMistralProxyServer(mistralWss)

  server.listen(port, () => {
    console.log(`🚀 内置代理服务器已启动: http://localhost:${port}`)
    console.log(`🔌 火山引擎 WebSocket 代理: ws://localhost:${port}/ws/volc`)
    console.log(`🔌 Mistral WebSocket 代理: ws://localhost:${port}/ws/mistral`)
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
