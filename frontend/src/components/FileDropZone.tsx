import { useCallback, useState, useRef } from 'react'
import { Upload, FileAudio, X } from 'lucide-react'
import { isAcceptedAudioFile, formatFileSize, ACCEPTED_AUDIO_EXTENSIONS } from '../types/fileTranscription'

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function FileDropZone({ onFilesSelected, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files).filter(isAcceptedAudioFile)
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
    }
  }, [disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isAcceptedAudioFile)
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
      setSelectedFiles([])
    }
  }, [selectedFiles, onFilesSelected])

  const acceptAttr = ACCEPTED_AUDIO_EXTENSIONS.join(',')

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className={`rounded-full p-3 ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
          <Upload className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? '松开以添加文件' : '拖拽音频文件到此处，或点击选择'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            支持 MP3, WAV, M4A, FLAC, OGG, WebM, MP4 等格式
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            已选择 {selectedFiles.length} 个文件
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            开始转录 ({selectedFiles.length} 个文件)
          </button>
        </div>
      )}
    </div>
  )
}
