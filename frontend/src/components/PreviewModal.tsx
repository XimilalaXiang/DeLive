import { X, Download, Calendar, Clock, FileText } from 'lucide-react'
import type { TranscriptSession } from '../types'
import { exportToTxt } from '../utils/storage'
import { useTranscriptStore } from '../stores/transcriptStore'

interface PreviewModalProps {
  session: TranscriptSession | null
  onClose: () => void
}

export function PreviewModal({ session, onClose }: PreviewModalProps) {
  const { t } = useTranscriptStore()
  
  if (!session) return null

  const handleExport = () => {
    exportToTxt(session)
  }

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
          {session.transcript ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                {session.transcript}
              </p>
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
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              {t.common.close}
            </button>
            {session.transcript && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground 
                         bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                {t.preview.exportTxt}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
