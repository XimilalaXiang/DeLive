import { useMemo, useRef, useState, useCallback } from 'react'
import { FileText, Clock, Languages } from 'lucide-react'
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

const SPEAKER_COLORS = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-warning/10 text-warning',
  'bg-success/10 text-success',
  'bg-destructive/10 text-destructive',
  'bg-accent text-accent-foreground',
]

function getSpeakerColor(speakerId: string, speakerIds: string[]): string {
  const index = speakerIds.indexOf(speakerId)
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
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
          <div className="space-y-1">
            {speakerSegments.map((segment, index) => {
              const prevSegment = index > 0 ? speakerSegments[index - 1] : null
              const isSameSpeaker = prevSegment?.speakerId === segment.speakerId
              const isHovered = hoveredIndex === index

              return (
                <div
                  key={`${segment.speakerId || 'speaker'}-${index}`}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                    isHovered ? 'bg-muted/50' : ''
                  }`}
                  onMouseEnter={() => handleSegmentHover(index)}
                  onMouseLeave={() => handleSegmentHover(null)}
                >
                  {/* Timestamp */}
                  <div className="w-10 shrink-0 pt-0.5 text-right">
                    {segment.startMs != null ? (
                      <span className={`font-mono text-[10px] tabular-nums transition-colors ${
                        isHovered ? 'text-muted-foreground' : 'text-muted-foreground/40'
                      }`}>
                        {formatMs(segment.startMs)}
                      </span>
                    ) : (
                      <Clock className="ml-auto h-3 w-3 text-muted-foreground/20" />
                    )}
                  </div>

                  {/* Speaker badge + text */}
                  <div className="min-w-0 flex-1">
                    {!isSameSpeaker && segment.speakerId && (
                      <span className={`mb-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        getSpeakerColor(segment.speakerId, speakerIds)
                      }`}>
                        {getSpeakerLabel(segment.speakerId, speakerNameMap)}
                      </span>
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
