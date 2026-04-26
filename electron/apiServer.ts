import type { Server, IncomingMessage, ServerResponse } from 'http'
import { app, ipcMain } from 'electron'
import { WebSocketServer } from 'ws'
import {
  requestSessions,
  requestSessionDetail,
  requestSearchSessions,
  requestTopics,
  requestTags,
  requestRecordingStatus,
} from './apiIpc'
import { addLiveClient, removeLiveClient, getLiveClients } from './apiBroadcast'

interface ApiServerOptions {
  server: Server
}

interface OpenApiRuntimeConfig {
  enabled: boolean
  token: string
}

let openApiConfig: OpenApiRuntimeConfig = { enabled: false, token: '' }

export function updateOpenApiConfig(config: OpenApiRuntimeConfig): void {
  openApiConfig = { ...config }
  console.log(`[API] Open API config updated: enabled=${config.enabled}, hasToken=${!!config.token}`)
}

function jsonResponse(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  })
  res.end(json)
}

function parseUrl(req: IncomingMessage): { pathname: string; params: URLSearchParams } {
  const parsed = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`)
  return { pathname: parsed.pathname, params: parsed.searchParams }
}

function extractBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

function checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (!openApiConfig.enabled) {
    jsonResponse(res, 403, { error: 'Open API is disabled. Enable it in DeLive settings.' })
    return false
  }

  if (openApiConfig.token) {
    const provided = extractBearerToken(req)
    if (provided !== openApiConfig.token) {
      jsonResponse(res, 401, { error: 'Unauthorized. Provide a valid Bearer token.' })
      return false
    }
  }

  return true
}

export function attachApiServer({ server }: ApiServerOptions): void {
  ipcMain.on('api-update-open-api-config', (_event, config: { enabled: boolean; token: string }) => {
    updateOpenApiConfig(config)
  })

  const liveWss = new WebSocketServer({ noServer: true })

  liveWss.on('connection', (ws) => {
    addLiveClient(ws)
    console.log(`[API] Live WS client connected (total: ${getLiveClients().size})`)

    ws.on('close', () => {
      removeLiveClient(ws)
      console.log(`[API] Live WS client disconnected (total: ${getLiveClients().size})`)
    })

    ws.on('error', () => {
      removeLiveClient(ws)
    })
  })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parseUrl(req)

    if (pathname === '/ws/live') {
      if (!openApiConfig.enabled) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }

      if (openApiConfig.token) {
        const { params } = parseUrl(req)
        const tokenFromQuery = params.get('token')
        const tokenFromHeader = extractBearerToken(req)
        if (tokenFromQuery !== openApiConfig.token && tokenFromHeader !== openApiConfig.token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
          return
        }
      }

      liveWss.handleUpgrade(req, socket, head, (ws) => {
        liveWss.emit('connection', ws, req)
      })
    }
  })

  const existingListeners = server.listeners('request').slice()
  server.removeAllListeners('request')

  server.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    const { pathname, params } = parseUrl(req)

    if (!pathname.startsWith('/api/')) {
      for (const listener of existingListeners) {
        (listener as (req: IncomingMessage, res: ServerResponse) => void)(req, res)
      }
      return
    }

    try {
      if (pathname === '/api/v1/health' && req.method === 'GET') {
        jsonResponse(res, 200, {
          status: 'ok',
          version: app.getVersion(),
          apiEnabled: openApiConfig.enabled,
          timestamp: new Date().toISOString(),
          liveClients: getLiveClients().size,
        })
        return
      }

      if (!checkAuth(req, res)) return

      if (pathname === '/api/v1/sessions' && req.method === 'GET') {
        const search = params.get('search')
        const limit = parseInt(params.get('limit') || '50', 10)
        const offset = parseInt(params.get('offset') || '0', 10)

        let sessions
        if (search && search.trim()) {
          sessions = await requestSearchSessions(search.trim())
        } else {
          sessions = await requestSessions()
        }

        const topicId = params.get('topicId')
        const status = params.get('status')

        let filtered = sessions
        if (topicId) filtered = filtered.filter(s => s.topicId === topicId)
        if (status) filtered = filtered.filter(s => s.status === status)

        const total = filtered.length
        const paged = filtered.slice(offset, offset + limit)

        jsonResponse(res, 200, { sessions: paged, total, limit, offset })
        return
      }

      const sessionDetailMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)$/)
      if (sessionDetailMatch && req.method === 'GET') {
        const sessionId = decodeURIComponent(sessionDetailMatch[1])
        const session = await requestSessionDetail(sessionId)
        if (!session) {
          jsonResponse(res, 404, { error: 'Session not found' })
          return
        }
        jsonResponse(res, 200, session)
        return
      }

      const transcriptMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/transcript$/)
      if (transcriptMatch && req.method === 'GET') {
        const sessionId = decodeURIComponent(transcriptMatch[1])
        const session = await requestSessionDetail(sessionId)
        if (!session) {
          jsonResponse(res, 404, { error: 'Session not found' })
          return
        }
        jsonResponse(res, 200, {
          sessionId: session.id,
          transcript: session.transcript,
          translatedTranscript: session.translatedTranscript?.text,
          correctedTranscript: session.correction?.correctedText || null,
        })
        return
      }

      const summaryMatch = pathname.match(/^\/api\/v1\/sessions\/([^/]+)\/summary$/)
      if (summaryMatch && req.method === 'GET') {
        const sessionId = decodeURIComponent(summaryMatch[1])
        const session = await requestSessionDetail(sessionId)
        if (!session) {
          jsonResponse(res, 404, { error: 'Session not found' })
          return
        }
        jsonResponse(res, 200, {
          sessionId: session.id,
          postProcess: session.postProcess,
          mindMap: session.mindMap,
        })
        return
      }

      if (pathname === '/api/v1/topics' && req.method === 'GET') {
        const topics = await requestTopics()
        jsonResponse(res, 200, { topics })
        return
      }

      if (pathname === '/api/v1/tags' && req.method === 'GET') {
        const tags = await requestTags()
        jsonResponse(res, 200, { tags })
        return
      }

      if (pathname === '/api/v1/status' && req.method === 'GET') {
        const status = await requestRecordingStatus()
        jsonResponse(res, 200, {
          ...status,
          version: app.getVersion(),
          liveClients: getLiveClients().size,
        })
        return
      }

      jsonResponse(res, 404, { error: 'Not found' })
    } catch (error) {
      console.error('[API] Request error:', error)
      jsonResponse(res, 500, { error: 'Internal server error' })
    }
  })

  console.log('🌐 REST API endpoints mounted at /api/v1/')
  console.log('📡 Live transcript WebSocket available at /ws/live')
}
