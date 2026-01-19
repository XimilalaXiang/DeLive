import { useEffect, useRef } from 'react'
import { FileText, Mic, AlertCircle } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'

export function TranscriptDisplay() {
  const { finalTranscript, nonFinalTranscript, recordingState, currentSessionId } = useTranscriptStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [finalTranscript, nonFinalTranscript])

  const isEmpty = !finalTranscript && !nonFinalTranscript
  const isRecording = recordingState === 'recording'
  const isStarting = recordingState === 'starting'

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">实时转录</span>
          {currentSessionId && (
            <span className="text-xs text-zinc-400 ml-2">
              会话ID: {currentSessionId.slice(0, 8)}...
            </span>
          )}
        </div>
        {isStarting && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs text-amber-600 font-medium">正在启动...</span>
          </div>
        )}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs text-red-600 font-medium">录制中</span>
          </div>
        )}
      </div>

      {/* 转录内容 */}
      <div 
        ref={containerRef}
        className="h-[300px] overflow-y-auto p-5"
      >
        {isStarting ? (
          <div className="h-full flex flex-col items-center justify-center text-amber-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-3"></div>
            <p className="text-sm font-medium">正在连接 Soniox...</p>
            <p className="text-xs text-zinc-400 mt-1">请在弹出窗口中选择要共享的音频源</p>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400">
            {isRecording ? (
              <>
                <div className="relative">
                  <Mic className="w-12 h-12 mb-3 text-red-400" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-600">正在监听音频...</p>
                <p className="text-xs mt-1">转录结果将在这里显示</p>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700">
                      <p className="font-medium">如果长时间没有显示内容：</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        <li>确保选择的页面正在播放音频</li>
                        <li>确保共享时勾选了"共享音频"</li>
                        <li>打开浏览器控制台(F12)查看日志</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Mic className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">点击下方按钮开始录制</p>
                <p className="text-xs mt-1">将捕获系统音频并实时转录</p>
              </>
            )}
          </div>
        ) : (
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            <span className="transcript-final">{finalTranscript}</span>
            <span className="transcript-nonfinal">{nonFinalTranscript}</span>
            {isRecording && (
              <span className="inline-block w-0.5 h-5 bg-primary-500 ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        )}
      </div>

      {/* 底部状态栏 */}
      {(finalTranscript || nonFinalTranscript) && (
        <div className="px-5 py-2 border-t border-surface-100 bg-surface-50 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            已转录 {finalTranscript.length} 个字符
          </span>
          {isRecording && (
            <span className="text-xs text-green-600">
              ● 实时更新中
            </span>
          )}
        </div>
      )}
    </div>
  )
}
