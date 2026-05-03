import { useMemo, useRef, useState, useCallback } from 'react'
import { FileText, Languages, Play } from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'

interface TranscriptTabProps {
  session: TranscriptSession
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getSpeakerLabel(
  speakerId: string | undefined,
  speakerNameMap: Record<string, string>,
): string {
  if (!speakerId) return 'Speaker'
  return speakerNameMap[speakerId] || speakerId
}

function getSpeakerShortLabel(speakerId: string, speakerIds: string[]): string {
  const index = speakerIds.indexOf(speakerId)
  return `S${index + 1}`
}

const SPEAKER_BADGE_COLORS = [
  { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-200 dark:border-blue-800', label: 'text-blue-700 dark:text-blue-300', highlight: 'bg-blue-50 dark:bg-blue-950/30' },
  { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-200 dark:border-emerald-800', label: 'text-emerald-700 dark:text-emerald-300', highlight: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-200 dark:border-amber-800', label: 'text-amber-700 dark:text-amber-300', highlight: 'bg-amber-50 dark:bg-amber-950/30' },
  { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-200 dark:border-purple-800', label: 'text-purple-700 dark:text-purple-300', highlight: 'bg-purple-50 dark:bg-purple-950/30' },
  { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-200 dark:border-rose-800', label: 'text-rose-700 dark:text-rose-300', highlight: 'bg-rose-50 dark:bg-rose-950/30' },
  { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-200 dark:border-cyan-800', label: 'text-cyan-700 dark:text-cyan-300', highlight: 'bg-cyan-50 dark:bg-cyan-950/30' },
]

function getSpeakerBadgeColor(speakerId: string, speakerIds: string[]) {
  const index = speakerIds.indexOf(speakerId)
  return SPEAKER_BADGE_COLORS[index % SPEAKER_BADGE_COLORS.length]
}

export function TranscriptTab({ session }: TranscriptTabProps) {
  const { t } = useUIStore()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const translatedText = session.translatedTranscript?.text?.trim() || ''
  const speakerSegments = useMemo(
    () => (session.segments || []).filter((segment) => segment.speakerId && segment.text.trim()),
    [session.segments],
  )
  const sessionSpeakers = useMemo(
    () => (session.speakers || []).filter((speaker) => speaker.id.trim()),
    [session.speakers],
  )
  const speakerNameMap = useMemo(
    () =>
      Object.fromEntries(
        sessionSpeakers.map((speaker) => [
          speaker.id,
          speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
        ]),
      ),
    [sessionSpeakers],
  )
  const speakerIds = useMemo(
    () => [...new Set(speakerSegments.map((s) => s.speakerId).filter(Boolean) as string[])],
    [speakerSegments],
  )

  const handleSegmentHover = useCallback((index: number | null) => {
    setHoveredIndex(index)
  }, [])

  if (!session.transcript && !translatedText) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground py-12">
        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-sm">{t.preview.noContent}</p>
      </div>
    )
  }

  return (
    <div ref={contentRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        {speakerSegments.length > 0 ? (
          <div className="space-y-0.5">
            {speakerSegments.map((segment, index) => {
              const prevSegment = index > 0 ? speakerSegments[index - 1] : null
              const isSameSpeaker = prevSegment?.speakerId === segment.speakerId
              const isHovered = hoveredIndex === index
              const colors = segment.speakerId
                ? getSpeakerBadgeColor(segment.speakerId, speakerIds)
                : SPEAKER_BADGE_COLORS[0]

              return (
                <div
                  key={`${segment.speakerId || 'speaker'}-${index}`}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                    isHovered ? colors.highlight : ''
                  }`}
                  onMouseEnter={() => handleSegmentHover(index)}
                  onMouseLeave={() => handleSegmentHover(null)}
                >
                  {/* Speaker circle badge — shown on speaker change */}
                  <div className="w-7 shrink-0 pt-0.5 flex justify-center">
                    {!isSameSpeaker && segment.speakerId ? (
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}`}>
                        {getSpeakerShortLabel(segment.speakerId, speakerIds)}
                      </span>
                    ) : (
                      <span className="h-6 w-6" />
                    )}
                  </div>

                  {/* Speaker name + timestamp header */}
                  <div className="min-w-0 flex-1">
                    {!isSameSpeaker && segment.speakerId && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${colors.label}`}>
                          {getSpeakerLabel(segment.speakerId, speakerNameMap)}
                        </span>
                        {segment.startMs != null && (
                          <button
                            className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground/60 hover:text-primary transition-colors"
                            title={t.preview.jumpToTimestamp || 'Jump to timestamp'}
                          >
                            <Play className="h-2.5 w-2.5" />
                            {formatMs(segment.startMs)}
                          </button>
                        )}
                      </div>
                    )}
                    {isSameSpeaker && segment.startMs != null && (
                      <button
                        className={`mb-0.5 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums transition-colors ${
                          isHovered ? 'text-muted-foreground' : 'text-muted-foreground/30'
                        } hover:text-primary`}
                        title={t.preview.jumpToTimestamp || 'Jump to timestamp'}
                      >
                        <Play className="h-2.5 w-2.5" />
                        {formatMs(segment.startMs)}
                      </button>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 m-0">
                      {segment.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : session.transcript ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {session.transcript}
          </p>
        ) : null}

        {(session.transcript || speakerSegments.length > 0) && translatedText && (
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Languages className="h-3 w-3" />
              Translation
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {translatedText && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-info/80 dark:text-info/70">
            {translatedText}
          </p>
        )}
      </div>
    </div>
  )
}
