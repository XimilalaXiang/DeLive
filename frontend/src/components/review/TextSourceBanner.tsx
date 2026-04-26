import { Info } from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'

interface TextSourceBannerProps {
  session: TranscriptSession
}

export function TextSourceBanner({ session }: TextSourceBannerProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const preference = settings.aiPostProcess?.preferCorrectedText || 'auto'

  const hasCorrected = session.correction?.status === 'done'
    && typeof session.correction.correctedText === 'string'
    && session.correction.correctedText.trim().length > 0

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
