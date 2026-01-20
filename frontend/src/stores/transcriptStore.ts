import { create } from 'zustand'
import type { TranscriptSession, RecordingState, AppSettings, SonioxToken, Tag, ProviderConfigData } from '../types'
import { 
  getSessions, 
  saveSessions, 
  getSettings, 
  saveSettings,
  getTags,
  saveTags,
  generateId, 
  formatDate, 
  formatTime 
} from '../utils/storage'
import { 
  type Language, 
  type Translations, 
  getTranslations, 
  getSavedLanguage, 
  saveLanguage 
} from '../i18n'
import { providerRegistry } from '../providers'
import type { ASRProviderInfo } from '../types/asr'

// 主题类型定义
type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

// 获取系统主题
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// 解析主题
const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

// 从 localStorage 获取保存的主题
const getSavedTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
  }
  return 'system'
}

// 应用主题到 DOM
const applyTheme = (resolvedTheme: ResolvedTheme) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

interface TranscriptState {
  // 语言状态
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void
  
  // 主题状态
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  initTheme: () => void
  
  // 录制状态
  recordingState: RecordingState
  setRecordingState: (state: RecordingState) => void
  
  // 当前转录内容
  currentTranscript: string
  finalTranscript: string
  nonFinalTranscript: string
  setTranscript: (final: string, nonFinal: string) => void
  clearTranscript: () => void
  
  // 当前会话
  currentSessionId: string | null
  startNewSession: () => string
  endCurrentSession: () => void
  
  // 历史会话
  sessions: TranscriptSession[]
  loadSessions: () => void
  updateSessionTitle: (id: string, title: string) => void
  deleteSession: (id: string) => void
  updateSessionTags: (sessionId: string, tagIds: string[]) => void
  
  // 标签
  tags: Tag[]
  loadTags: () => void
  addTag: (name: string, color: string) => Tag
  deleteTag: (id: string) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  
  // 标签筛选
  selectedTagIds: string[]
  setSelectedTagIds: (ids: string[]) => void
  toggleTagFilter: (tagId: string) => void
  clearTagFilter: () => void
  
  // 搜索
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // 设置
  settings: AppSettings
  loadSettings: () => void
  updateSettings: (settings: Partial<AppSettings>) => void
  
  // 多提供商支持
  availableProviders: ASRProviderInfo[]
  setCurrentVendor: (vendorId: string) => void
  updateProviderConfig: (vendorId: string, config: Partial<ProviderConfigData>) => void
  getProviderConfig: (vendorId: string) => ProviderConfigData | undefined
  
  // Token处理
  processTokens: (tokens: SonioxToken[]) => void
  finalTokens: SonioxToken[]
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  // 语言状态
  language: getSavedLanguage(),
  t: getTranslations(getSavedLanguage()),
  setLanguage: (lang) => {
    saveLanguage(lang)
    set({ language: lang, t: getTranslations(lang) })
  },
  
  // 主题状态
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    localStorage.setItem('theme', theme)
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
  },
  initTheme: () => {
    const savedTheme = getSavedTheme()
    const resolved = resolveTheme(savedTheme)
    applyTheme(resolved)
    set({ theme: savedTheme, resolvedTheme: resolved })
    
    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        const currentTheme = get().theme
        if (currentTheme === 'system') {
          const newResolved = getSystemTheme()
          applyTheme(newResolved)
          set({ resolvedTheme: newResolved })
        }
      }
      mediaQuery.addEventListener('change', handleChange)
    }
  },
  
  // 录制状态
  recordingState: 'idle',
  setRecordingState: (state) => set({ recordingState: state }),
  
  // 当前转录内容
  currentTranscript: '',
  finalTranscript: '',
  nonFinalTranscript: '',
  setTranscript: (final, nonFinal) => set({ 
    finalTranscript: final, 
    nonFinalTranscript: nonFinal,
    currentTranscript: final + nonFinal 
  }),
  clearTranscript: () => set({ 
    currentTranscript: '', 
    finalTranscript: '', 
    nonFinalTranscript: '',
    finalTokens: []
  }),
  
  // 当前会话
  currentSessionId: null,
  startNewSession: () => {
    const id = generateId()
    const now = Date.now()
    const { t } = get()
    const session: TranscriptSession = {
      id,
      title: t.session.defaultTitle(formatTime(now)),
      date: formatDate(now),
      time: formatTime(now),
      createdAt: now,
      updatedAt: now,
      transcript: '',
      tagIds: [],
    }
    
    const sessions = [session, ...get().sessions]
    saveSessions(sessions)
    
    set({ 
      currentSessionId: id, 
      sessions,
      finalTranscript: '',
      nonFinalTranscript: '',
      currentTranscript: '',
      finalTokens: []
    })
    
    return id
  },
  endCurrentSession: () => {
    const { currentSessionId, finalTranscript, sessions } = get()
    if (currentSessionId && finalTranscript) {
      const updatedSessions = sessions.map(s => 
        s.id === currentSessionId 
          ? { ...s, transcript: finalTranscript, updatedAt: Date.now() }
          : s
      )
      saveSessions(updatedSessions)
      set({ sessions: updatedSessions })
    }
    set({ currentSessionId: null })
  },
  
  // 历史会话
  sessions: [],
  loadSessions: () => {
    const sessions = getSessions()
    set({ sessions })
  },
  updateSessionTitle: (id, title) => {
    const sessions = get().sessions.map(s =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s
    )
    saveSessions(sessions)
    set({ sessions })
  },
  deleteSession: (id) => {
    const sessions = get().sessions.filter(s => s.id !== id)
    saveSessions(sessions)
    set({ sessions })
  },
  updateSessionTags: (sessionId, tagIds) => {
    const sessions = get().sessions.map(s =>
      s.id === sessionId ? { ...s, tagIds, updatedAt: Date.now() } : s
    )
    saveSessions(sessions)
    set({ sessions })
  },
  
  // 标签
  tags: [],
  loadTags: () => {
    const tags = getTags()
    set({ tags })
  },
  addTag: (name, color) => {
    const newTag: Tag = {
      id: generateId(),
      name,
      color,
    }
    const tags = [...get().tags, newTag]
    saveTags(tags)
    set({ tags })
    return newTag
  },
  deleteTag: (id) => {
    // 删除标签
    const tags = get().tags.filter(t => t.id !== id)
    saveTags(tags)
    
    // 从所有会话中移除该标签
    const sessions = get().sessions.map(s => ({
      ...s,
      tagIds: s.tagIds?.filter(tid => tid !== id) || []
    }))
    saveSessions(sessions)
    
    // 从筛选中移除
    const selectedTagIds = get().selectedTagIds.filter(tid => tid !== id)
    
    set({ tags, sessions, selectedTagIds })
  },
  updateTag: (id, updates) => {
    const tags = get().tags.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
    saveTags(tags)
    set({ tags })
  },
  
  // 标签筛选
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
  
  // 搜索
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // 设置
  settings: { apiKey: '', languageHints: ['zh', 'en'], currentVendor: 'soniox', providerConfigs: {} },
  loadSettings: () => {
    const settings = getSettings()
    // 兼容旧版配置：如果有 apiKey 但没有 providerConfigs，则迁移到 soniox 配置
    if (settings.apiKey && (!settings.providerConfigs || !settings.providerConfigs['soniox'])) {
      settings.currentVendor = 'soniox'
      settings.providerConfigs = {
        ...settings.providerConfigs,
        soniox: {
          apiKey: settings.apiKey,
          languageHints: settings.languageHints,
        },
      }
    }
    set({ settings })
  },
  updateSettings: (newSettings) => {
    const settings = { ...get().settings, ...newSettings }
    saveSettings(settings)
    set({ settings })
  },
  
  // 多提供商支持
  availableProviders: providerRegistry.getAllProviders(),
  setCurrentVendor: (vendorId) => {
    const { settings } = get()
    const newSettings = { ...settings, currentVendor: vendorId }
    saveSettings(newSettings)
    set({ settings: newSettings })
  },
  updateProviderConfig: (vendorId, config) => {
    const { settings } = get()
    const currentConfig = settings.providerConfigs?.[vendorId] || { apiKey: '' }
    const newProviderConfigs = {
      ...settings.providerConfigs,
      [vendorId]: { ...currentConfig, ...config },
    }
    // 同时更新顶层 apiKey 以保持兼容
    const newApiKey = vendorId === settings.currentVendor 
      ? (config.apiKey ?? currentConfig.apiKey ?? settings.apiKey)
      : settings.apiKey
    const newSettings = { 
      ...settings, 
      providerConfigs: newProviderConfigs,
      apiKey: newApiKey,
    }
    saveSettings(newSettings)
    set({ settings: newSettings })
  },
  getProviderConfig: (vendorId) => {
    const { settings } = get()
    return settings.providerConfigs?.[vendorId]
  },
  
  // Token处理
  finalTokens: [],
  processTokens: (tokens) => {
    const { finalTokens } = get()
    const newFinalTokens = [...finalTokens]
    let nonFinalText = ''
    
    for (const token of tokens) {
      if (token.text) {
        if (token.is_final) {
          newFinalTokens.push(token)
        } else {
          nonFinalText += token.text
        }
      }
    }
    
    const finalText = newFinalTokens.map(t => t.text).join('')
    
    set({
      finalTokens: newFinalTokens,
      finalTranscript: finalText,
      nonFinalTranscript: nonFinalText,
      currentTranscript: finalText + nonFinalText
    })
    
    // 实时保存到当前会话
    const { currentSessionId, sessions } = get()
    if (currentSessionId) {
      // 将 tokens 转换为可保存的格式
      const tokenData = newFinalTokens.map(t => ({
        text: t.text,
        startMs: t.start_ms,
        endMs: t.end_ms,
        speaker: t.speaker,
        language: t.language,
        confidence: t.confidence,
      }))
      
      const updatedSessions = sessions.map(s =>
        s.id === currentSessionId
          ? { ...s, transcript: finalText, tokens: tokenData, updatedAt: Date.now() }
          : s
      )
      // 不频繁保存到localStorage，只更新内存中的状态
      set({ sessions: updatedSessions })
    }
  },
}))
