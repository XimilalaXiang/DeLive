import type { WebSocketServer } from 'ws'
import { attachDeepgramProxyServer } from '../../shared/deepgramProxyCore.js'

export function createDeepgramProxyServer(wss: WebSocketServer): void {
  attachDeepgramProxyServer(wss)
}
