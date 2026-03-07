/**
 * Unified store facade — re-exports every slice so existing consumers keep
 * working with `useTranscriptStore(state => state.xxx)`.
 *
 * New code should import from the individual stores directly
 * (uiStore, settingsStore, sessionStore, tagStore).
 */

import { create } from 'zustand'
import { useUIStore, type UIState } from './uiStore'
import { useSettingsStore, type SettingsState } from './settingsStore'
import { useSessionStore, type SessionState } from './sessionStore'
import { useTagStore, type TagState } from './tagStore'

type TranscriptState =
  UIState &
  SettingsState &
  SessionState &
  TagState

/**
 * Compatibility shim: subscribes to all four underlying stores and merges
 * their state into a single object so existing `useTranscriptStore(selector)`
 * calls keep working without any changes.
 *
 * Zustand's `create` with `subscribe` ensures React components re-render
 * when any of the underlying stores change.
 */
export const useTranscriptStore = create<TranscriptState>()(() => ({
  ...useUIStore.getState(),
  ...useSettingsStore.getState(),
  ...useSessionStore.getState(),
  ...useTagStore.getState(),
}))

function syncAll() {
  useTranscriptStore.setState({
    ...useUIStore.getState(),
    ...useSettingsStore.getState(),
    ...useSessionStore.getState(),
    ...useTagStore.getState(),
  })
}

useUIStore.subscribe(syncAll)
useSettingsStore.subscribe(syncAll)
useSessionStore.subscribe(syncAll)
useTagStore.subscribe(syncAll)
