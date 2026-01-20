/**
 * 字幕导出工具
 * 支持 SRT 和 VTT 格式
 */

import type { TranscriptTokenData, TranscriptSession } from '../types'

/**
 * 将毫秒转换为 SRT 时间格式 (HH:MM:SS,mmm)
 */
function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * 将毫秒转换为 VTT 时间格式 (HH:MM:SS.mmm)
 */
function msToVttTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

/**
 * 将 tokens 分组为字幕段落
 * 每个段落包含一定数量的文字或一定时长
 */
function groupTokensIntoSubtitles(
  tokens: TranscriptTokenData[],
  options: {
    maxCharsPerLine?: number  // 每行最大字符数
    maxDurationMs?: number    // 每段最大时长（毫秒）
    minDurationMs?: number    // 每段最小时长（毫秒）
  } = {}
): Array<{ startMs: number; endMs: number; text: string; speaker?: string }> {
  const {
    maxCharsPerLine = 40,
    maxDurationMs = 5000,
    minDurationMs = 1000,
  } = options

  const subtitles: Array<{ startMs: number; endMs: number; text: string; speaker?: string }> = []
  
  if (tokens.length === 0) return subtitles

  let currentSubtitle = {
    startMs: tokens[0].startMs ?? 0,
    endMs: tokens[0].endMs ?? 0,
    text: '',
    speaker: tokens[0].speaker,
  }

  for (const token of tokens) {
    const tokenStartMs = token.startMs ?? currentSubtitle.endMs
    const tokenEndMs = token.endMs ?? tokenStartMs + 500

    // 判断是否需要开始新的字幕段
    const currentDuration = currentSubtitle.endMs - currentSubtitle.startMs
    const newDuration = tokenEndMs - currentSubtitle.startMs
    const speakerChanged = token.speaker && token.speaker !== currentSubtitle.speaker
    
    const shouldStartNew = 
      (currentSubtitle.text.length + token.text.length > maxCharsPerLine && currentDuration >= minDurationMs) ||
      newDuration > maxDurationMs ||
      speakerChanged

    if (shouldStartNew && currentSubtitle.text) {
      subtitles.push({ ...currentSubtitle })
      currentSubtitle = {
        startMs: tokenStartMs,
        endMs: tokenEndMs,
        text: token.text,
        speaker: token.speaker,
      }
    } else {
      currentSubtitle.text += token.text
      currentSubtitle.endMs = tokenEndMs
      if (token.speaker) {
        currentSubtitle.speaker = token.speaker
      }
    }
  }

  // 添加最后一个字幕段
  if (currentSubtitle.text) {
    subtitles.push(currentSubtitle)
  }

  return subtitles
}

/**
 * 生成 SRT 格式字幕
 */
export function generateSRT(
  tokens: TranscriptTokenData[],
  options?: {
    maxCharsPerLine?: number
    maxDurationMs?: number
    includeSpeaker?: boolean
  }
): string {
  const { includeSpeaker = true, ...groupOptions } = options || {}
  const subtitles = groupTokensIntoSubtitles(tokens, groupOptions)

  return subtitles
    .map((sub, index) => {
      const startTime = msToSrtTime(sub.startMs)
      const endTime = msToSrtTime(sub.endMs)
      const speakerPrefix = includeSpeaker && sub.speaker ? `[${sub.speaker}] ` : ''
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${sub.text}\n`
    })
    .join('\n')
}

/**
 * 生成 VTT 格式字幕
 */
export function generateVTT(
  tokens: TranscriptTokenData[],
  options?: {
    maxCharsPerLine?: number
    maxDurationMs?: number
    includeSpeaker?: boolean
    title?: string
  }
): string {
  const { includeSpeaker = true, title, ...groupOptions } = options || {}
  const subtitles = groupTokensIntoSubtitles(tokens, groupOptions)

  let vtt = 'WEBVTT\n'
  if (title) {
    vtt += `Kind: captions\nLanguage: auto\n`
  }
  vtt += '\n'

  return vtt + subtitles
    .map((sub, index) => {
      const startTime = msToVttTime(sub.startMs)
      const endTime = msToVttTime(sub.endMs)
      const speakerPrefix = includeSpeaker && sub.speaker ? `<v ${sub.speaker}>` : ''
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${sub.text}\n`
    })
    .join('\n')
}

/**
 * 从 Session 生成字幕（如果没有 tokens，则基于纯文本生成简单字幕）
 */
export function generateSubtitleFromSession(
  session: TranscriptSession,
  format: 'srt' | 'vtt' = 'srt',
  options?: {
    maxCharsPerLine?: number
    maxDurationMs?: number
    includeSpeaker?: boolean
  }
): string {
  // 如果有 tokens，使用 tokens 生成
  if (session.tokens && session.tokens.length > 0) {
    return format === 'srt' 
      ? generateSRT(session.tokens, options)
      : generateVTT(session.tokens, { ...options, title: session.title })
  }

  // 如果没有 tokens，基于纯文本生成简单字幕
  // 按句号、问号、感叹号分割
  const sentences = session.transcript
    .split(/([。！？.!?]+)/)
    .reduce((acc: string[], curr, i, arr) => {
      if (i % 2 === 0 && curr) {
        const punctuation = arr[i + 1] || ''
        acc.push(curr + punctuation)
      }
      return acc
    }, [])
    .filter(s => s.trim())

  // 为每个句子分配时间（估算）
  const totalDuration = session.duration || (sentences.length * 3000) // 默认每句 3 秒
  const avgDuration = totalDuration / sentences.length

  const tokens: TranscriptTokenData[] = sentences.map((text, i) => ({
    text: text.trim(),
    startMs: Math.round(i * avgDuration),
    endMs: Math.round((i + 1) * avgDuration),
  }))

  return format === 'srt' 
    ? generateSRT(tokens, options)
    : generateVTT(tokens, { ...options, title: session.title })
}

/**
 * 下载字幕文件
 */
export function downloadSubtitle(
  session: TranscriptSession,
  format: 'srt' | 'vtt' = 'srt',
  options?: {
    maxCharsPerLine?: number
    maxDurationMs?: number
    includeSpeaker?: boolean
  }
): void {
  const content = generateSubtitleFromSession(session, format, options)
  const mimeType = format === 'srt' ? 'text/plain' : 'text/vtt'
  const extension = format === 'srt' ? 'srt' : 'vtt'
  
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${session.title || 'transcript'}.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
