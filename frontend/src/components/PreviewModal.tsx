import { useEffect, useMemo, useState } from 'react'
import {
  X,
  Download,
  Calendar,
  Clock,
  FileText,
  Subtitles,
  Pencil,
  Check,
  Sparkles,
  Loader2,
  ListTodo,
  Tags,
  BookOpenText,
} from 'lucide-react'
import type { TranscriptSession, TranscriptSpeaker } from '../types'
import { exportToTxt } from '../utils/storage'
import { downloadSubtitle } from '../utils/subtitleExport'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSettingsStore } from '../stores/settingsStore'
import { isAiPostProcessConfigured } from '../services/aiPostProcess'

interface PreviewModalProps {
  session: TranscriptSession | null
  onClose: () => void
}

function getSpeakerLabel(
  speakerId: string | undefined,
  speakerNameMap: Record<string, string>,
): string {
  if (!speakerId) {
    return 'Speaker'
  }

  return speakerNameMap[speakerId] || speakerId
}

export function PreviewModal({ session, onClose }: PreviewModalProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const updateSessionSpeakers = useSessionStore((state) => state.updateSessionSpeakers)
  const generateSessionPostProcess = useSessionStore((state) => state.generateSessionPostProcess)
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [speakerDraftName, setSpeakerDraftName] = useState('')

  useEffect(() => {
    setEditingSpeakerId(null)
    setSpeakerDraftName('')
  }, [session?.id])

  const handleExport = () => {
    if (!session) return
    exportToTxt(session)
  }

  const handleExportSrt = () => {
    if (!session) return
    downloadSubtitle(session, 'srt')
  }

  const handleExportVtt = () => {
    if (!session) return
    downloadSubtitle(session, 'vtt')
  }

  const translatedText = session?.translatedTranscript?.text?.trim() || ''
  const postProcess = session?.postProcess
  const speakerSegments = (session?.segments || []).filter((segment) => segment.speakerId && segment.text.trim())
  const sessionSpeakers = useMemo(
    () => (session?.speakers || []).filter((speaker) => speaker.id.trim()),
    [session?.speakers],
  )
  const speakerNameMap = useMemo(() => (
    Object.fromEntries(
      sessionSpeakers.map((speaker) => [
        speaker.id,
        speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
      ]),
    )
  ), [sessionSpeakers])

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
        ? {
          ...speaker,
          displayName: speakerDraftName.trim() || speaker.label || speaker.id,
        }
        : speaker
    ))

    updateSessionSpeakers(session.id, updatedSpeakers)
    cancelEditingSpeaker()
  }

  const aiConfigured = isAiPostProcessConfigured(settings)
  const aiGenerating = postProcess?.status === 'pending'
  const hasAiContent = Boolean(
    postProcess?.summary?.trim()
    || postProcess?.actionItems?.length
    || postProcess?.keywords?.length
    || postProcess?.chapters?.length,
  )

  const handleGenerateAiBriefing = async () => {
    if (!session || aiGenerating) return

    try {
      await generateSessionPostProcess(session.id)
    } catch (error) {
      console.error('[PreviewModal] AI post-process failed:', error)
    }
  }

  if (!session) return null

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl dark:ring-1 dark:ring-white/[0.08] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight truncate">
                {session.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {session.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.time}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 bg-background/50">
          <div className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.preview.aiBriefing}
                </div>
                {!aiConfigured && (
                  <p className="text-xs text-muted-foreground">
                    {t.preview.aiNotConfigured}
                  </p>
                )}
                {postProcess?.status === 'error' && postProcess.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {postProcess.error}
                  </p>
                )}
              </div>
              <button
                onClick={() => void handleGenerateAiBriefing()}
                disabled={!aiConfigured || aiGenerating || !session.transcript.trim()}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  !aiConfigured || !session.transcript.trim()
                    ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                    : aiGenerating
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : 'border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.preview.aiGenerating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {hasAiContent ? t.preview.aiRegenerate : t.preview.aiGenerate}
                  </>
                )}
              </button>
            </div>

            {hasAiContent && (
              <div className="grid gap-4">
                {postProcess?.summary && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.preview.aiSummary}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {postProcess.summary}
                    </p>
                  </div>
                )}

                {postProcess?.actionItems && postProcess.actionItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ListTodo className="w-3.5 h-3.5" />
                      {t.preview.aiActionItems}
                    </div>
                    <div className="space-y-2">
                      {postProcess.actionItems.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {postProcess?.keywords && postProcess.keywords.length > 0 && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Tags className="w-3.5 h-3.5" />
                      {t.preview.aiKeywords}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {postProcess.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {postProcess?.chapters && postProcess.chapters.length > 0 && (
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <BookOpenText className="w-3.5 h-3.5" />
                      {t.preview.aiChapters}
                    </div>
                    <div className="space-y-2">
                      {postProcess.chapters.map((chapter, index) => (
                        <div
                          key={`${chapter.title}-${index}`}
                          className="rounded-lg border border-border bg-background/70 px-3 py-3"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {chapter.title}
                          </div>
                          {chapter.summary && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                              {chapter.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {session.transcript || translatedText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {sessionSpeakers.length > 0 && (
                <div className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-3">
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
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
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
                <p className="text-base leading-relaxed whitespace-pre-wrap text-sky-700 dark:text-sky-300">
                  {translatedText}
                </p>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm">{t.preview.noContent}</p>
            </div>
          )}
        </div>

        {/* 底部信息和操作 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {t.preview.totalCharacters} {session.transcript?.length || 0} {t.common.characters}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              {t.common.close}
            </button>
            {(session.transcript || translatedText) && (
              <>
                <button
                  onClick={handleExportVtt}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary/30
                           text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  title={t.history?.exportVtt || 'Export VTT'}
                >
                  <Subtitles className="w-4 h-4" />
                  VTT
                </button>
                <button
                  onClick={handleExportSrt}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary/30
                           text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  title={t.history?.exportSrt || 'Export SRT'}
                >
                  <Subtitles className="w-4 h-4" />
                  SRT
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground 
                           bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  {t.preview.exportTxt}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
