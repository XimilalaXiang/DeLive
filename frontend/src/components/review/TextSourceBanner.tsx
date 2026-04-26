import { Info, Loader2 } from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSessionStore } from '../../stores/sessionStore'

interface TextSourceBannerProps {
  session: TranscriptSession
}

export function TextSourceBanner({ session }: TextSourceBannerProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const preference = settings.aiPostProcess?.preferCorrectedText || 'auto'

  const liveSession = useSessionStore(
    (s) => s.sessions.find((sess) => sess.id === session.id),
  )
  const correction = liveSession?.correction ?? session.correction
  const correctionStatus = correction?.status || 'idle'

  const isCorrecting = correctionStatus === 'correcting' || correctionStatus === 'detecting'

  const hasCorrected = correctionStatus === 'done'
    && typeof correction?.correctedText === 'string'
    && correction.correctedText.trim().length > 0

  if (isCorrecting && preference !== 'original') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
        {t.preview.aiCorrectionInProgress as string}
      </div>
    )
  }

  if (!hasCorrected) return null

  const usingCorrected = preference === 'corrected' || preference === 'auto'

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
      usingCorrected
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-muted text-muted-foreground'
    }`}>
      <Info className="w-3 h-3 shrink-0" />
      {usingCorrected
        ? (t.preview.aiUsingCorrectedText as string)
        : (t.preview.aiUsingOriginalText as string)
      }
    </div>
  )
}
