import type {
  TranscriptPostProcess,
  TranscriptSession,
  TranscriptSpeaker,
} from '../types'

export interface SessionScopedStateSlice {
  currentSessionId: string | null
  recoverySession: TranscriptSession | null
  currentSpeakers: TranscriptSpeaker[]
  currentPostProcess?: TranscriptPostProcess
}

export interface SessionMetadataUpdateResult {
  sessions: TranscriptSession[]
  recoverySession: TranscriptSession | null
  currentSpeakers: TranscriptSpeaker[]
  currentPostProcess?: TranscriptPostProcess
}

export function updateSessionInCollection(
  sessions: TranscriptSession[],
  sessionId: string | null,
  updates: Partial<TranscriptSession>,
): TranscriptSession[] {
  if (!sessionId) {
    return sessions
  }

  const now = Date.now()
  return sessions.map((session) => (
    session.id === sessionId
      ? { ...session, ...updates, updatedAt: now }
      : session
  ))
}

export function applySessionMetadataUpdate(
  sessions: TranscriptSession[],
  sessionId: string,
  updates: Partial<TranscriptSession>,
  state: SessionScopedStateSlice,
): SessionMetadataUpdateResult {
  const nextSessions = updateSessionInCollection(sessions, sessionId, updates)
  const nextRecoverySession = state.recoverySession?.id === sessionId
    ? { ...state.recoverySession, ...updates }
    : state.recoverySession

  return {
    sessions: nextSessions,
    recoverySession: nextRecoverySession,
    currentSpeakers: state.currentSessionId === sessionId && updates.speakers
      ? updates.speakers
      : state.currentSpeakers,
    currentPostProcess: state.currentSessionId === sessionId && updates.postProcess
      ? updates.postProcess
      : state.currentPostProcess,
  }
}

export function applySessionDeletion(
  sessions: TranscriptSession[],
  sessionId: string,
  recoverySession: TranscriptSession | null,
): Pick<SessionMetadataUpdateResult, 'sessions' | 'recoverySession'> {
  return {
    sessions: sessions.filter((session) => session.id !== sessionId),
    recoverySession: recoverySession?.id === sessionId ? null : recoverySession,
  }
}
