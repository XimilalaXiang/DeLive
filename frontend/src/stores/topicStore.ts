import { create } from 'zustand'
import type { Topic } from '../types'
import { getTopics, saveTopics } from '../utils/storage'
import { generateId } from '../utils/storageUtils'
import { useSessionStore } from './sessionStore'

export interface TopicState {
  topics: Topic[]
  activeTopicId: string | null
  selectedTopicId: string | null

  loadTopics: () => void
  addTopic: (name: string, emoji: string, description?: string) => Topic
  deleteTopic: (id: string) => void
  updateTopic: (id: string, updates: Partial<Omit<Topic, 'id' | 'createdAt'>>) => void

  setActiveTopic: (id: string | null) => void
  clearActiveTopic: () => void

  setSelectedTopic: (id: string | null) => void
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  activeTopicId: null,
  selectedTopicId: null,

  loadTopics: () => {
    const topics = getTopics()
    set({ topics })
  },

  addTopic: (name, emoji, description) => {
    const now = Date.now()
    const newTopic: Topic = {
      id: generateId(),
      name,
      emoji,
      description,
      createdAt: now,
      updatedAt: now,
    }
    const topics = [...get().topics, newTopic]
    saveTopics(topics)
    set({ topics })
    return newTopic
  },

  deleteTopic: (id) => {
    const topics = get().topics.filter((t) => t.id !== id)
    saveTopics(topics)

    const sessionStore = useSessionStore.getState()
    const sessions = sessionStore.sessions.map((s) =>
      s.topicId === id ? { ...s, topicId: undefined } : s,
    )
    sessionStore.replaceAllSessions(sessions)

    const { activeTopicId, selectedTopicId } = get()
    set({
      topics,
      activeTopicId: activeTopicId === id ? null : activeTopicId,
      selectedTopicId: selectedTopicId === id ? null : selectedTopicId,
    })
  },

  updateTopic: (id, updates) => {
    const topics = get().topics.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
    )
    saveTopics(topics)
    set({ topics })
  },

  setActiveTopic: (id) => set({ activeTopicId: id }),
  clearActiveTopic: () => set({ activeTopicId: null }),

  setSelectedTopic: (id) => set({ selectedTopicId: id }),
}))
