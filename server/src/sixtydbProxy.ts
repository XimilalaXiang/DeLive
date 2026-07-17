import type { WebSocketServer } from 'ws'
import { attachSixtydbProxyServer } from '../../shared/sixtydbProxyCore.js'

export function createSixtydbProxyServer(wss: WebSocketServer): void {
  attachSixtydbProxyServer(wss)
}
