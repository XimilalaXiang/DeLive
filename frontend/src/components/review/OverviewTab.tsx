import { useState } from 'react'
import {
  Pencil,
  Check,
  X,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'
import type { TranscriptSession, TranscriptSpeaker } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useTopicStore } from '../../stores/topicStore'

interface OverviewTabProps {
  session: TranscriptSession
}

export function OverviewTab({ session }: OverviewTabProps) {
  const { t } = useUIStore()
  const updateSessionSpeakers = useSessionStore((state) => state.updateSessionSpeakers)
  const topics = useTopicStore((state) => state.topics)
  const updateSessionTopic = useSessionStore((state) => state.updateSessionTopic)
  const [showTopicMenu, setShowTopicMenu] = useState(false)
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [speakerDraftName, setSpeakerDraftName] = useState('')

  const sessionSpeakers = (session.speakers || []).filter((speaker) => speaker.id.trim())
  const speakerNameMap = Object.fromEntries(
    sessionSpeakers.map((speaker) => [
      speaker.id,
      speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
    ]),
  )

  const startEditingSpeaker = (speaker: TranscriptSpeaker) => {
    setEditingSpeakerId(speaker.id)
    setSpeakerDraftName(speaker.displayName?.trim() || speaker.label?.trim() || speaker.id)
  }

  const cancelEditingSpeaker = () => {
    setEditingSpeakerId(null)
    setSpeakerDraftName('')
  }

  const saveSpeakerName = () => {
    if (!session || !editingSpeakerId) return
    const updatedSpeakers = sessionSpeakers.map((speaker) => (
      speaker.id === editingSpeakerId
        ? { ...speaker, displayName: speakerDraftName.trim() || speaker.label || speaker.id }
        : speaker
    ))
    updateSessionSpeakers(session.id, updatedSpeakers)
    cancelEditingSpeaker()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Speaker Labels */}
      {sessionSpeakers.length > 0 && (
        <div className="rounded-xl border border-border bg-card/70 p-5 space-y-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t.preview.speakerLabels || 'Speaker labels'}
          </div>
          <div className="flex flex-wrap gap-2">
            {sessionSpeakers.map((speaker) => (
              editingSpeakerId === speaker.id ? (
                <div
                  key={speaker.id}
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2"
                >
                  <input
                    type="text"
                    value={speakerDraftName}
                    onChange={(e) => setSpeakerDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveSpeakerName()
                      if (e.key === 'Escape') cancelEditingSpeaker()
                    }}
                    className="h-8 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t.preview.speakerNamePlaceholder || 'Speaker name'}
                    autoFocus
                  />
                  <button
                    onClick={saveSpeakerName}
                    className="p-1.5 rounded-md text-success hover:bg-success/10 transition-colors"
                    title={t.common.save}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditingSpeaker}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                    title={t.common.cancel}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  key={speaker.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {speakerNameMap[speaker.id]}
                  </span>
                  <button
                    onClick={() => startEditingSpeaker(speaker)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                    title={t.preview.renameSpeaker || 'Rename speaker'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Topic */}
      <div className="rounded-xl border border-border bg-card/70 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderOpen className="w-3.5 h-3.5" />
            {t.topics.title}
          </div>
        </div>
        {(() => {
          const currentTopic = session.topicId ? topics.find((tp) => tp.id === session.topicId) : null
          return (
            <div className="relative">
              {currentTopic ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-base">{currentTopic.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{currentTopic.name}</span>
                  <button
                    onClick={() => updateSessionTopic(session.id, undefined)}
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    {t.topics.removeFromTopic}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTopicMenu(!showTopicMenu)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  {t.topics.moveToTopic}
                </button>
              )}

              {showTopicMenu && !currentTopic && topics.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 shadow-lg">
                  {topics.map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => {
                        updateSessionTopic(session.id, tp.id)
                        setShowTopicMenu(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <span>{tp.emoji}</span>
                      <span className="truncate">{tp.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
