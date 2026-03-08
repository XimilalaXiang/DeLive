import { X, Download, Calendar, Clock, FileText, Subtitles } from 'lucide-react'
import type { TranscriptSession } from '../types'
import { exportToTxt } from '../utils/storage'
import { downloadSubtitle } from '../utils/subtitleExport'
import { useUIStore } from '../stores/uiStore'

interface PreviewModalProps {
  session: TranscriptSession | null
  onClose: () => void
}

function getSpeakerLabel(speakerId: string | undefined): string {
  if (!speakerId) {
    return 'Speaker'
  }

  return speakerId
}

export function PreviewModal({ session, onClose }: PreviewModalProps) {
  const { t } = useUIStore()
  
  if (!session) return null

  const handleExport = () => {
    exportToTxt(session)
  }

  const handleExportSrt = () => {
    downloadSubtitle(session, 'srt')
  }

  const translatedText = session.translatedTranscript?.text?.trim() || ''
  const speakerSegments = (session.segments || []).filter((segment) => segment.speakerId && segment.text.trim())

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
          {session.transcript || translatedText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {speakerSegments.length > 0 ? (
                <div className="space-y-4">
                  {speakerSegments.map((segment, index) => (
                    <div key={`${segment.speakerId || 'speaker'}-${index}`} className="space-y-1">
                      <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {getSpeakerLabel(segment.speakerId)}
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
