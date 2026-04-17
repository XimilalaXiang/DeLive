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

let pendingSessionsReq: PendingResolver<SessionSummary[]> | null = null
let pendingSessionDetailReq: PendingResolver<SessionDetail | null> | null = null
let pendingSearchReq: PendingResolver<SessionSummary[]> | null = null
let pendingTopicsReq: PendingResolver<ApiTopicData[]> | null = null
let pendingTagsReq: PendingResolver<ApiTagData[]> | null = null
let pendingRecordingStatusReq: PendingResolver<ApiRecordingStatus> | null = null

let _getMainWindow: () => BrowserWindow | null = () => null

const IPC_TIMEOUT_MS = 5000

function createPending<T>(fallback: T): { promise: Promise<T>; pending: PendingResolver<T> } {
  let pending!: PendingResolver<T>
  const promise = new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      resolve(fallback)
    }, IPC_TIMEOUT_MS)
    pending = { resolve, timer }
  })
  return { promise, pending }
}

function resolvePending<T>(slot: PendingResolver<T> | null, value: T): void {
  if (!slot) return
  clearTimeout(slot.timer)
  slot.resolve(value)
}

export function requestSessions(): Promise<SessionSummary[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const { promise, pending } = createPending<SessionSummary[]>([])
  pendingSessionsReq = pending
  win.webContents.send('api-get-sessions')
  return promise
}

export function requestSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve(null)

  const { promise, pending } = createPending<SessionDetail | null>(null)
  pendingSessionDetailReq = pending
  win.webContents.send('api-get-session-detail', sessionId)
  return promise
}

export function requestSearchSessions(query: string): Promise<SessionSummary[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const { promise, pending } = createPending<SessionSummary[]>([])
  pendingSearchReq = pending
  win.webContents.send('api-search-sessions', query)
  return promise
}

export function requestTopics(): Promise<ApiTopicData[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const { promise, pending } = createPending<ApiTopicData[]>([])
  pendingTopicsReq = pending
  win.webContents.send('api-get-topics')
  return promise
}

export function requestTags(): Promise<ApiTagData[]> {
  const win = _getMainWindow()
  if (!win || win.isDestroyed()) return Promise.resolve([])

  const { promise, pending } = createPending<ApiTagData[]>([])
  pendingTagsReq = pending
  win.webContents.send('api-get-tags')
  return promise
}

export function requestRecordingStatus(): Promise<ApiRecordingStatus> {
  const win = _getMainWindow()
  const fallback: ApiRecordingStatus = { isRecording: false, currentSessionId: null, recordingState: 'idle' }
  if (!win || win.isDestroyed()) return Promise.resolve(fallback)

  const { promise, pending } = createPending<ApiRecordingStatus>(fallback)
  pendingRecordingStatusReq = pending
  win.webContents.send('api-get-recording-status')
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

  ipcMain.on('api-respond-sessions', (_event, sessions: SessionSummary[]) => {
    resolvePending(pendingSessionsReq, sessions)
    pendingSessionsReq = null
  })

  ipcMain.on('api-respond-session-detail', (_event, session: SessionDetail | null) => {
    resolvePending(pendingSessionDetailReq, session)
    pendingSessionDetailReq = null
  })

  ipcMain.on('api-respond-search-sessions', (_event, sessions: SessionSummary[]) => {
    resolvePending(pendingSearchReq, sessions)
    pendingSearchReq = null
  })

  ipcMain.on('api-respond-topics', (_event, topics: ApiTopicData[]) => {
    resolvePending(pendingTopicsReq, topics)
    pendingTopicsReq = null
  })

  ipcMain.on('api-respond-tags', (_event, tags: ApiTagData[]) => {
    resolvePending(pendingTagsReq, tags)
    pendingTagsReq = null
  })

  ipcMain.on('api-respond-recording-status', (_event, status: ApiRecordingStatus) => {
    resolvePending(pendingRecordingStatusReq, status)
    pendingRecordingStatusReq = null
  })
}
