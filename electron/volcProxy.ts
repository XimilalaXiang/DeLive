import { createServer, type Server } from 'http'
import { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../shared/volcProxyCore'

export function startVolcProxyServer(port = 23456): Server {
  const server = createServer()

  try {
    const volcWss = new WebSocketServer({ server, path: '/ws/volc' })
    attachVolcProxyServer(volcWss)
    console.log('[Proxy] 火山引擎 WebSocket 代理已注册: /ws/volc')
  } catch (err) {
    console.error('[Proxy] 注册火山引擎代理失败:', err)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { attachMistralProxyServer } = require('../shared/mistralProxyCore') as {
      attachMistralProxyServer: (wss: WebSocketServer) => void
    }
    const mistralWss = new WebSocketServer({ server, path: '/ws/mistral' })
    attachMistralProxyServer(mistralWss)
    console.log('[Proxy] Mistral WebSocket 代理已注册: /ws/mistral')
  } catch (err) {
    console.error('[Proxy] 注册 Mistral 代理失败 (非致命):', err)
  }

  server.listen(port, () => {
    console.log(`[Proxy] 内置代理服务器已启动: http://localhost:${port}`)
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
