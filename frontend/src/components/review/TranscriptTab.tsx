import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'

interface TranscriptTabProps {
  session: TranscriptSession
}

function getSpeakerLabel(
  speakerId: string | undefined,
  speakerNameMap: Record<string, string>,
): string {
  if (!speakerId) return 'Speaker'
  return speakerNameMap[speakerId] || speakerId
}

export function TranscriptTab({ session }: TranscriptTabProps) {
  const { t } = useUIStore()
  const translatedText = session.translatedTranscript?.text?.trim() || ''
  const speakerSegments = (session.segments || []).filter(
    (segment) => segment.speakerId && segment.text.trim(),
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {speakerSegments.length > 0 ? (
          <div className="space-y-4">
            {speakerSegments.map((segment, index) => (
              <div key={`${segment.speakerId || 'speaker'}-${index}`} className="space-y-1">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {getSpeakerLabel(segment.speakerId, speakerNameMap)}
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground m-0">
                  {segment.text}
                </p>
              </div>
            ))}
          </div>
        ) : session.transcript ? (
          <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
            {session.transcript}
          </p>
        ) : null}

        {(session.transcript || speakerSegments.length > 0) && translatedText && (
          <div className="my-4 h-px bg-border" />
        )}

        {translatedText && (
          <p className="text-base leading-relaxed whitespace-pre-wrap text-info dark:text-info">
            {translatedText}
          </p>
        )}
      </div>
    </div>
  )
}
