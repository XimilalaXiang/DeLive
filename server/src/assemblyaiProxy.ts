import type { WebSocketServer } from 'ws'
import { attachAssemblyAIProxyServer } from '../../shared/assemblyaiProxyCore.js'

export function createAssemblyAIProxyServer(wss: WebSocketServer): void {
  attachAssemblyAIProxyServer(wss)
}
