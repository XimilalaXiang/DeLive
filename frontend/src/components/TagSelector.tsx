import { useState, useRef, useEffect } from 'react'
import { Tag as TagIcon, Plus, X, Check, Trash2, Settings } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { TAG_COLORS } from '../types'
import type { Tag } from '../types'

interface TagSelectorProps {
  sessionId: string
  sessionTagIds: string[]
  compact?: boolean
}

export function TagSelector({ sessionId, sessionTagIds, compact = false }: TagSelectorProps) {
  const { tags, addTag, deleteTag, updateSessionTags } = useTranscriptStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].name)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setIsManaging(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTag = (tagId: string) => {
    const newTagIds = sessionTagIds.includes(tagId)
      ? sessionTagIds.filter(id => id !== tagId)
      : [...sessionTagIds, tagId]
    updateSessionTags(sessionId, newTagIds)
  }

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      const newTag = addTag(newTagName.trim(), selectedColor)
      updateSessionTags(sessionId, [...sessionTagIds, newTag.id])
      setNewTagName('')
      setIsCreating(false)
    }
  }

  const handleDeleteTag = (e: React.MouseEvent, tagId: string, tagName: string) => {
    e.stopPropagation()
    if (confirm(`确定删除标签"${tagName}"吗？此操作会从所有会话中移除该标签。`)) {
      deleteTag(tagId)
    }
  }

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0]
  }

  const sessionTags = tags.filter(t => sessionTagIds.includes(t.id))

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 显示已有标签 + 添加按钮 */}
      <div className="flex items-center gap-1 flex-wrap">
        {sessionTags.map(tag => {
          const color = getTagColor(tag.color)
          return (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
                        ${color.bg} ${color.text} ${compact ? 'text-[10px]' : ''}`}
            >
              {tag.name}
            </span>
          )
        })}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
            setIsManaging(false)
            setIsCreating(false)
          }}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs
                    text-zinc-400 hover:text-zinc-600 hover:bg-surface-100 
                    dark:hover:text-zinc-300 dark:hover:bg-surface-800
                    transition-colors ${compact ? 'text-[10px]' : ''}`}
        >
          <TagIcon className="w-3 h-3" />
          {!compact && <span>标签</span>}
        </button>
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-surface-900 
                    rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 
                    z-50 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 管理模式 */}
          {isManaging ? (
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">管理标签</span>
                <button
                  onClick={() => setIsManaging(false)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  完成
                </button>
              </div>
              {tags.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
                  暂无标签
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {tags.map(tag => {
                    const color = getTagColor(tag.color)
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded
                                 bg-surface-50 dark:bg-surface-800"
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                        ${color.bg} ${color.text}`}>
                          {tag.name}
                        </span>
                        <button
                          onClick={(e) => handleDeleteTag(e, tag.id, tag.name)}
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 
                                   dark:hover:bg-red-900/30 rounded transition-colors"
                          title="删除标签"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : isCreating ? (
            /* 创建新标签 */
            <div className="p-3 space-y-3">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="标签名称"
                className="w-full px-2 py-1.5 text-sm border border-surface-300 dark:border-surface-600 
                         rounded bg-white dark:bg-surface-800 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateTag()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
              />
              {/* 颜色选择 */}
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-6 h-6 rounded-full ${color.bg} ${color.border} border-2
                              ${selectedColor === color.name ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                  />
                ))}
              </div>
              {/* 按钮 */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-2 py-1 text-xs bg-primary-600 text-white rounded 
                           hover:bg-primary-700 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </div>
          ) : (
            /* 标签选择列表 */
            <>
              {/* 已有标签列表 */}
              {tags.length > 0 && (
                <div className="p-2 max-h-40 overflow-y-auto">
                  {tags.map(tag => {
                    const color = getTagColor(tag.color)
                    const isSelected = sessionTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded
                                  hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors`}
                      >
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium
                                        ${color.bg} ${color.text}`}>
                          {tag.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-green-500" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {tags.length > 0 && <div className="border-t border-surface-200 dark:border-surface-700" />}

              {/* 底部操作按钮 */}
              <div className="p-1">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400
                           hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>创建新标签</span>
                </button>
                {tags.length > 0 && (
                  <button
                    onClick={() => setIsManaging(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400
                             hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>管理标签</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// 标签筛选栏组件
export function TagFilter() {
  const { tags, selectedTagIds, toggleTagFilter, clearTagFilter } = useTranscriptStore()

  if (tags.length === 0) return null

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0]
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">筛选:</span>
      {tags.map(tag => {
        const color = getTagColor(tag.color)
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => toggleTagFilter(tag.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                      transition-all ${isSelected 
                        ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-primary-400` 
                        : 'bg-surface-100 dark:bg-surface-800 text-zinc-500 dark:text-zinc-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                      }`}
          >
            {tag.name}
            {isSelected && <X className="w-3 h-3" />}
          </button>
        )
      })}
      {selectedTagIds.length > 0 && (
        <button
          onClick={clearTagFilter}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          清除筛选
        </button>
      )}
    </div>
  )
}

// 标签管理组件（用于设置页面）
export function TagManager() {
  const { tags, deleteTag, updateTag } = useTranscriptStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0]
  }

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
  }

  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      updateTag(editingId, { name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }

  if (tags.length === 0) {
    return (
      <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
        暂无标签，在历史记录中添加
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tags.map(tag => {
        const color = getTagColor(tag.color)
        return (
          <div 
            key={tag.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg
                     bg-surface-50 dark:bg-surface-800"
          >
            {editingId === tag.id ? (
              <input
                type="text"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={saveEdit}
                className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded
                         bg-white dark:bg-surface-900 focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                              ${color.bg} ${color.text}`}>
                {tag.name}
              </span>
            )}
            <div className="flex items-center gap-1">
              {editingId !== tag.id && (
                <button
                  onClick={() => startEditing(tag)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  编辑
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`确定删除标签"${tag.name}"吗？`)) {
                    deleteTag(tag.id)
                  }
                }}
                className="p-1 text-zinc-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
