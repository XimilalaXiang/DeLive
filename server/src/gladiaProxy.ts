import type { WebSocketServer } from 'ws'
import { attachGladiaProxyServer } from '../../shared/gladiaProxyCore.js'

export function createGladiaProxyServer(wss: WebSocketServer): void {
  attachGladiaProxyServer(wss)
}
