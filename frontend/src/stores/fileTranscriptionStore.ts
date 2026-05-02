import { create } from 'zustand'
import type { FileTranscriptionJob, FileTranscriptionJobStatus } from '../types/fileTranscription'
import { generateId } from '../utils/storageUtils'

interface FileTranscriptionState {
  jobs: FileTranscriptionJob[]

  addJob: (job: Omit<FileTranscriptionJob, 'id' | 'createdAt' | 'status' | 'progress'>) => string
  updateJob: (id: string, updates: Partial<FileTranscriptionJob>) => void
  removeJob: (id: string) => void
  clearCompleted: () => void

  getJob: (id: string) => FileTranscriptionJob | undefined
  getActiveJobs: () => FileTranscriptionJob[]
  getCompletedJobs: () => FileTranscriptionJob[]
}

const ACTIVE_STATUSES: FileTranscriptionJobStatus[] = ['queued', 'uploading', 'transcribing']

export const useFileTranscriptionStore = create<FileTranscriptionState>((set, get) => ({
  jobs: [],

  addJob: (partial) => {
    const id = generateId()
    const job: FileTranscriptionJob = {
      ...partial,
      id,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    }
    set((s) => ({ jobs: [job, ...s.jobs] }))
    return id
  },

  updateJob: (id, updates) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    }))
  },

  removeJob: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }))
  },

  clearCompleted: () => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.status !== 'completed') }))
  },

  getJob: (id) => get().jobs.find((j) => j.id === id),

  getActiveJobs: () => get().jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)),

  getCompletedJobs: () => get().jobs.filter((j) => j.status === 'completed'),
}))
