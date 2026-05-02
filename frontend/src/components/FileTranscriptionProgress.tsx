import { FileAudio, Check, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react'
import type { FileTranscriptionJob } from '../types/fileTranscription'
import { formatFileSize } from '../types/fileTranscription'

interface FileTranscriptionProgressProps {
  jobs: FileTranscriptionJob[]
  onCancel: (jobId: string) => void
  onOpenResult: (jobId: string) => void
  onRemove: (jobId: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  uploading: '上传中',
  transcribing: '转录中',
  completed: '已完成',
  error: '出错',
  cancelled: '已取消',
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-emerald-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />
    case 'cancelled':
      return <X className="h-4 w-4 text-muted-foreground" />
    default:
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
  }
}

export function FileTranscriptionProgress({
  jobs,
  onCancel,
  onOpenResult,
  onRemove,
}: FileTranscriptionProgressProps) {
  if (jobs.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        转录任务
      </p>
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors"
        >
          <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{job.fileName}</p>
              <span className="text-xs text-muted-foreground">{formatFileSize(job.fileSize)}</span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <JobStatusIcon status={job.status} />
              <span className="text-xs text-muted-foreground">
                {STATUS_LABELS[job.status] || job.status}
              </span>
              {job.audioDurationMs && job.status === 'completed' && (
                <span className="text-xs text-muted-foreground">
                  · {Math.round(job.audioDurationMs / 1000)}s
                </span>
              )}
            </div>

            {(job.status === 'uploading' || job.status === 'transcribing' || job.status === 'queued') && (
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}

            {job.error && (
              <p className="mt-1 text-xs text-destructive truncate">{job.error}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {job.status === 'completed' && job.sessionId && (
              <button
                onClick={() => onOpenResult(job.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="查看转录结果"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            {(job.status === 'uploading' || job.status === 'transcribing' || job.status === 'queued') && (
              <button
                onClick={() => onCancel(job.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="取消"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {(job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') && (
              <button
                onClick={() => onRemove(job.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="移除"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
