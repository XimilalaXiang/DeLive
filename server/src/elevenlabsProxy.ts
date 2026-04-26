import type { WebSocketServer } from 'ws'
import { attachElevenLabsProxyServer } from '../../shared/elevenlabsProxyCore.js'

export function createElevenLabsProxyServer(wss: WebSocketServer): void {
  attachElevenLabsProxyServer(wss)
}
