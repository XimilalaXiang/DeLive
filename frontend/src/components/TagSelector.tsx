import { useState, useRef } from 'react'
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
  const { tags, addTag, deleteTag, updateSessionTags, t } = useTranscriptStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0].name)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    if (confirm(t.tag.deleteConfirm(tagName))) {
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
      <div className="flex items-center gap-1.5 flex-wrap">
        {sessionTags.map(tag => {
          const color = getTagColor(tag.color)
          return (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border
                        ${color.bg} ${color.text} ${compact ? 'text-[10px]' : ''} border-transparent bg-opacity-90`}
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
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
                    text-muted-foreground hover:text-foreground hover:bg-muted
                    transition-colors ${compact ? 'text-[10px]' : ''}`}
        >
          <TagIcon className="w-3 h-3" />
          {!compact && <span>{t.tag.tags}</span>}
        </button>
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 背景遮罩 - 处理点击外部关闭和背景模糊 */}
          <div 
            className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              setIsCreating(false)
              setIsManaging(false)
            }}
          />

          <div 
            className="absolute top-full left-0 mt-1 w-64 bg-card text-card-foreground
                      rounded-lg shadow-xl border border-border z-50 overflow-hidden
                      animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
            onClick={e => e.stopPropagation()}
          >
            {/* 管理模式 */}
            {isManaging ? (
              <div className="p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium text-muted-foreground">{t.tag.manageTags}</span>
                  <button
                    onClick={() => setIsManaging(false)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    {t.common.done}
                  </button>
                </div>
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {t.tag.noTags}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {tags.map(tag => {
                      const color = getTagColor(tag.color)
                      return (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded
                                   hover:bg-muted/50"
                        >
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                          ${color.bg} ${color.text}`}>
                            {tag.name}
                          </span>
                          <button
                            onClick={(e) => handleDeleteTag(e, tag.id, tag.name)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 
                                     rounded transition-colors"
                            title={t.common.delete}
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
                  placeholder={t.tag.tagName}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      className={`w-6 h-6 rounded-full ${color.bg} border-2
                                ${selectedColor === color.name ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}
                    />
                  ))}
                </div>
                {/* 按钮 */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded 
                             hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t.common.create}
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
                                    hover:bg-muted transition-colors`}
                        >
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium
                                          ${color.bg} ${color.text} bg-opacity-90`}>
                            {tag.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {tags.length > 0 && <div className="border-t border-border" />}

                {/* 底部操作按钮 */}
                <div className="p-1">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground
                             hover:bg-muted hover:text-foreground rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.tag.createNew}</span>
                  </button>
                  {tags.length > 0 && (
                    <button
                      onClick={() => setIsManaging(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground
                               hover:bg-muted hover:text-foreground rounded transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t.tag.manageTags}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// 标签筛选栏组件
export function TagFilter() {
  const { tags, selectedTagIds, toggleTagFilter, clearTagFilter, t } = useTranscriptStore()

  if (tags.length === 0) return null

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0]
  }

  return (
    <div className="flex items-center gap-2 flex-wrap animate-in slide-in-from-top-2 fade-in">
      <span className="text-xs text-muted-foreground">{t.tag.filter}</span>
      {tags.map(tag => {
        const color = getTagColor(tag.color)
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => toggleTagFilter(tag.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border
                      transition-all ${isSelected 
                        ? `${color.bg} ${color.text} border-primary/50 ring-1 ring-primary/20` 
                        : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
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
          className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
        >
          {t.tag.clearFilter}
        </button>
      )}
    </div>
  )
}

// 标签管理组件（用于设置页面）
export function TagManager() {
  const { tags, deleteTag, updateTag, t } = useTranscriptStore()
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
      <div className="text-sm text-muted-foreground text-center py-4">
        {t.tag.noTagsHint}
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
                     bg-muted/50 hover:bg-muted transition-colors"
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
                className="flex-1 px-2 py-1 text-sm border border-input rounded
                         bg-background focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  {t.common.edit}
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(t.tag.deleteConfirm(tag.name))) {
                    deleteTag(tag.id)
                  }
                }}
                className="p-1 text-muted-foreground hover:text-destructive"
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
