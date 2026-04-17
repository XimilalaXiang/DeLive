import { createServer, type Server } from 'http'
import { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../shared/volcProxyCore'

export function startVolcProxyServer(port = 23456): Server {
  const server = createServer()
  const wss = new WebSocketServer({
    server,
    path: '/ws/volc',
  })

  attachVolcProxyServer(wss)

  server.listen(port, () => {
    console.log(`🚀 内置代理服务器已启动: http://localhost:${port}`)
    console.log(`🔌 火山引擎 WebSocket 代理: ws://localhost:${port}/ws/volc`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`[VolcProxy] 端口 ${port} 已被占用，代理服务器可能已在运行`)
    } else {
      console.error('[VolcProxy] 服务器错误:', error)
    }
  })

  return server
}
