import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Plus, X } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import { useTopicStore } from '../stores/topicStore'
import { TopicDialog } from './TopicDialog'

export function TopicPicker() {
  const { t } = useUIStore()
  const { topics, activeTopicId, setActiveTopic, clearActiveTopic, addTopic } = useTopicStore()
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeTopic = activeTopicId ? topics.find((tp) => tp.id === activeTopicId) : null

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (activeTopic) {
    return (
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors">
          <span>{activeTopic.emoji}</span>
          <span className="max-w-[160px] truncate">{activeTopic.name}</span>
          <button
            onClick={clearActiveTopic}
            className="rounded-full p-0.5 text-primary/60 transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Clear topic"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        {t.topics.selectTopic}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 w-64 rounded-xl border border-border bg-popover py-1 shadow-xl">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{t.topics.selectTopic}</div>
          {topics.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {topics.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => { setActiveTopic(tp.id); setOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span>{tp.emoji}</span>
                  <span className="truncate flex-1 text-left">{tp.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">{t.topics.noTopics}</div>
          )}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); setDialogOpen(true) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-primary transition-colors hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.topics.newTopic}
            </button>
          </div>
        </div>
      )}

      <TopicDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={(name, emoji, description) => {
          const newTopic = addTopic(name, emoji, description)
          setActiveTopic(newTopic.id)
        }}
      />
    </div>
  )
}
