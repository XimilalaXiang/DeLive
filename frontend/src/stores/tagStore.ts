import { create } from 'zustand'
import type { Tag } from '../types'
import { getTags, saveTags, generateId } from '../utils/storage'
import { useSessionStore } from './sessionStore'

export interface TagState {
  tags: Tag[]
  loadTags: () => void
  addTag: (name: string, color: string) => Tag
  deleteTag: (id: string) => void
  updateTag: (id: string, updates: Partial<Tag>) => void

  selectedTagIds: string[]
  setSelectedTagIds: (ids: string[]) => void
  toggleTagFilter: (tagId: string) => void
  clearTagFilter: () => void

  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loadTags: () => {
    const tags = getTags()
    set({ tags })
  },
  addTag: (name, color) => {
    const newTag: Tag = { id: generateId(), name, color }
    const tags = [...get().tags, newTag]
    saveTags(tags)
    set({ tags })
    return newTag
  },
  deleteTag: (id) => {
    const tags = get().tags.filter(t => t.id !== id)
    saveTags(tags)

    const sessionStore = useSessionStore.getState()
    const sessions = sessionStore.sessions.map(s => ({
      ...s,
      tagIds: s.tagIds?.filter(tid => tid !== id) || [],
    }))
    sessionStore.replaceAllSessions(sessions)

    const selectedTagIds = get().selectedTagIds.filter(tid => tid !== id)
    set({ tags, selectedTagIds })
  },
  updateTag: (id, updates) => {
    const tags = get().tags.map(t => (t.id === id ? { ...t, ...updates } : t))
    saveTags(tags)
    set({ tags })
  },

  selectedTagIds: [],
  setSelectedTagIds: (ids) => set({ selectedTagIds: ids }),
  toggleTagFilter: (tagId) => {
    const { selectedTagIds } = get()
    if (selectedTagIds.includes(tagId)) {
      set({ selectedTagIds: selectedTagIds.filter(id => id !== tagId) })
    } else {
      set({ selectedTagIds: [...selectedTagIds, tagId] })
    }
  },
  clearTagFilter: () => set({ selectedTagIds: [] }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
