import type { BrowserWindow, IpcMain } from 'electron'
import type {
  ApiRecordingStatus,
  ApiTagData,
  ApiTopicData,
  SessionDetail,
  SessionSummary,
} from '../shared/electronApi'
import { broadcastSessionEvent } from './apiBroadcast'

interface RegisterApiIpcOptions {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
}

type PendingResolver<T> = {
  resolve: (value: T) => void
  timer: ReturnType<typeof setTimeout>
}

const pendingSessionsMap = new Map<string, PendingResolver<SessionSummary[]>>()
const pendingSessionDetailMap = new Map<string, PendingResolver<SessionDetail | null>>()
const pendingSearchMap = new Map<string, PendingResolver<SessionSummary[]>>()
const pendingTopicsMap = new Map<string, PendingResolver<ApiTopicData[]>>()
const pendingTagsMap = new Map<string, PendingResolver<ApiTagData[]>>()
const pendingRecordingStatusMap = new Map<string, PendingResolver<ApiRecordingStatus>>()

let _getMainWindow: () => BrowserWindow | null = () => null

const IPC_TIMEOUT_MS = 5000
let _reqCounter = 0

function nextReqId(): string {
  _reqCounter = (_reqCounter + 1) % 1_000_000
  return `${Date.now()}-${_reqCounter}`
}

function createPending<T>(
  map: Map<string, PendingResolver<T>>,
  reqId: string,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      map.delete(reqId)
      resolve(fallback)
    }, IPC_TIMEOUT_MS)
    map.set(reqId, { resolve, timer })
  })
}

function resolvePending<T>(map: Map<string, PendingResolver<T>>, reqId: string, value: T): void {
  const slot = map.get(reqId)
  if (!slot) return
  map.delete(reqId)
  clearTimeout(slot.timer)
  slot.resolve(value)
}

export function requestSessions(): Promise<SessionSummary[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const reqId = nextReqId()
  const promise = createPending(pendingSessionsMap, reqId, [])
  win.webContents.send('api-get-sessions', reqId)
  return promise
}

export function requestSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve(null)

  const reqId = nextReqId()
  const promise = createPending(pendingSessionDetailMap, reqId, null)
  win.webContents.send('api-get-session-detail', reqId, sessionId)
  return promise
}

export function requestSearchSessions(query: string): Promise<SessionSummary[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const reqId = nextReqId()
  const promise = createPending(pendingSearchMap, reqId, [])
  win.webContents.send('api-search-sessions', reqId, query)
  return promise
}

export function requestTopics(): Promise<ApiTopicData[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const reqId = nextReqId()
  const promise = createPending(pendingTopicsMap, reqId, [])
  win.webContents.send('api-get-topics', reqId)
  return promise
}

export function requestTags(): Promise<ApiTagData[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const reqId = nextReqId()
  const promise = createPending(pendingTagsMap, reqId, [])
  win.webContents.send('api-get-tags', reqId)
  return promise
}

export function requestRecordingStatus(): Promise<ApiRecordingStatus> {
  const win = _getMainWindow()
  const fallback: ApiRecordingStatus = { isRecording: false, currentSessionId: null, recordingState: 'idle' }
  if (!win || win.isDestroyed()) return Promise.resolve(fallback)

  const reqId = nextReqId()
  const promise = createPending(pendingRecordingStatusMap, reqId, fallback)
  win.webContents.send('api-get-recording-status', reqId)
  return promise
}

export function registerApiIpc({ ipcMain, getMainWindow }: RegisterApiIpcOptions): void {
  _getMainWindow = getMainWindow

  ipcMain.on('api-notify-session-start', (_event, sessionId: string) => {
    broadcastSessionEvent('session-start', sessionId)
  })

  ipcMain.on('api-notify-session-end', (_event, sessionId: string) => {
    broadcastSessionEvent('session-end', sessionId)
  })

  ipcMain.on('api-respond-sessions', (_event, reqId: string, sessions: SessionSummary[]) => {
    resolvePending(pendingSessionsMap, reqId, sessions)
  })

  ipcMain.on('api-respond-session-detail', (_event, reqId: string, session: SessionDetail | null) => {
    resolvePending(pendingSessionDetailMap, reqId, session)
  })

  ipcMain.on('api-respond-search-sessions', (_event, reqId: string, sessions: SessionSummary[]) => {
    resolvePending(pendingSearchMap, reqId, sessions)
  })

  ipcMain.on('api-respond-topics', (_event, reqId: string, topics: ApiTopicData[]) => {
    resolvePending(pendingTopicsMap, reqId, topics)
  })

  ipcMain.on('api-respond-tags', (_event, reqId: string, tags: ApiTagData[]) => {
    resolvePending(pendingTagsMap, reqId, tags)
  })

  ipcMain.on('api-respond-recording-status', (_event, reqId: string, status: ApiRecordingStatus) => {
    resolvePending(pendingRecordingStatusMap, reqId, status)
  })
}
