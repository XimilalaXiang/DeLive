import { Mic, Square, Loader2 } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import { useSoniox } from '../hooks/useSoniox'

interface RecordingControlsProps {
  onError: (message: string) => void
}

export function RecordingControls({ onError }: RecordingControlsProps) {
  const { recordingState, settings, currentTranscript } = useTranscriptStore()
  const { startRecording, stopRecording } = useSoniox({
    onError,
    onStarted: () => console.log('[UI] Recording started'),
    onFinished: () => console.log('[UI] Recording finished'),
  })

  const isIdle = recordingState === 'idle'
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'
  const isStopping = recordingState === 'stopping'
  const isLoading = isStarting || isStopping

  const handleClick = () => {
    if (isIdle) {
      if (!settings.apiKey) {
        onError('请先在设置中配置 API 密钥')
        return
      }
      startRecording()
    } else if (isRecording) {
      stopRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-full font-medium text-base
            transition-all duration-200 shadow-lg hover:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-primary-600 hover:bg-primary-700 text-white'
            }
          `}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在启动...</span>
            </>
          ) : isStopping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在停止...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>停止录制</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>开始录制</span>
            </>
          )}
        </button>
      </div>

      {/* 状态提示 */}
      <div className="text-center">
        {isStarting && (
          <p className="text-sm text-amber-600">
            请在弹出的窗口中选择要共享的标签页/窗口，<strong>并勾选"共享音频"</strong>
          </p>
        )}
        {isRecording && (
          <div className="space-y-1">
            <p className="text-sm text-green-600 font-medium">
              ✓ 正在捕获系统音频并转录
            </p>
            {!currentTranscript && (
              <p className="text-xs text-zinc-500">
                等待音频输入... 请确保共享的页面正在播放声音
              </p>
            )}
          </div>
        )}
        {isIdle && !settings.apiKey && (
          <p className="text-sm text-amber-600">
            请先点击右上角配置 API 密钥
          </p>
        )}
      </div>
    </div>
  )
}
