import { WebSocket } from 'ws'

const liveClients = new Set<WebSocket>()

export function getLiveClients(): Set<WebSocket> {
  return liveClients
}

export function addLiveClient(ws: WebSocket): void {
  liveClients.add(ws)
}

export function removeLiveClient(ws: WebSocket): void {
  liveClients.delete(ws)
}

export function broadcastLiveTranscript(data: {
  stableText: string
  activeText: string
  translatedStableText: string
  translatedActiveText: string
  isFinal: boolean
}): void {
  if (liveClients.size === 0) return

  const message = JSON.stringify({
    type: 'transcript',
    ...data,
    timestamp: Date.now(),
  })

  for (const client of liveClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

export function broadcastSessionEvent(type: 'session-start' | 'session-end', sessionId: string): void {
  if (liveClients.size === 0) return

  const message = JSON.stringify({ type, sessionId, timestamp: Date.now() })
  for (const client of liveClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}
