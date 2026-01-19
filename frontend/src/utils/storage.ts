import type { TranscriptSession, AppSettings, Tag } from '../types'

const STORAGE_KEYS = {
  SESSIONS: 'desktoplive_sessions',
  SETTINGS: 'desktoplive_settings',
  TAGS: 'desktoplive_tags',
} as const

// ==================== 会话相关 ====================

// 获取所有转录会话
export function getSessions(): TranscriptSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    return data ? JSON.parse(data) : []
  } catch {
    console.error('Failed to parse sessions from localStorage')
    return []
  }
}

// 保存所有转录会话
export function saveSessions(sessions: TranscriptSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error)
  }
}

// 添加新会话
export function addSession(session: TranscriptSession): void {
  const sessions = getSessions()
  sessions.unshift(session) // 新会话放在最前面
  saveSessions(sessions)
}

// 更新会话
export function updateSession(id: string, updates: Partial<TranscriptSession>): void {
  const sessions = getSessions()
  const index = sessions.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() }
    saveSessions(sessions)
  }
}

// 删除会话
export function deleteSession(id: string): void {
  const sessions = getSessions()
  const filtered = sessions.filter(s => s.id !== id)
  saveSessions(filtered)
}

// ==================== 标签相关 ====================

// 获取所有标签
export function getTags(): Tag[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS)
    return data ? JSON.parse(data) : []
  } catch {
    console.error('Failed to parse tags from localStorage')
    return []
  }
}

// 保存所有标签
export function saveTags(tags: Tag[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags))
  } catch (error) {
    console.error('Failed to save tags to localStorage:', error)
  }
}

// ==================== 设置相关 ====================

// 获取应用设置
export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    console.error('Failed to parse settings from localStorage')
  }
  // 默认设置
  return {
    apiKey: '',
    languageHints: ['zh', 'en'],
  }
}

// 保存应用设置
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
  }
}

// ==================== 工具函数 ====================

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 格式化日期
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

// 格式化时间
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toTimeString().slice(0, 5) // HH:mm
}

// 导出为TXT文件
export function exportToTxt(session: TranscriptSession, tags?: Tag[]): void {
  const sessionTags = tags?.filter(t => session.tagIds?.includes(t.id)) || []
  const tagNames = sessionTags.map(t => t.name).join(', ')
  
  const content = `标题: ${session.title}
日期: ${session.date}
时间: ${session.time}${tagNames ? `\n标签: ${tagNames}` : ''}
${'='.repeat(50)}

${session.transcript}
`
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${session.title}_${session.date}_${session.time.replace(':', '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
