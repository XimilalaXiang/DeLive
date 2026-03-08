import type { WebSocketServer } from 'ws'
import { attachVolcProxyServer } from '../../shared/volcProxyCore.js'

export function createVolcProxyServer(wss: WebSocketServer): void {
  attachVolcProxyServer(wss)
}
