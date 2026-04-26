import type { WebSocketServer } from 'ws'
import { attachMistralProxyServer } from '../../shared/mistralProxyCore.js'

export function createMistralProxyServer(wss: WebSocketServer): void {
  attachMistralProxyServer(wss)
}
