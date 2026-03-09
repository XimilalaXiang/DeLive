/**
 * 字幕导出工具
 * 支持 SRT 和 VTT 格式
 */

import type { TranscriptTokenData, TranscriptSession } from '../types'

type SubtitleTranslationDisplay = 'auto' | 'source-only' | 'dual' | 'translated-only'

interface GroupedSubtitle {
  startMs: number
  endMs: number
  text: string
  speakerId?: string
  translatedText?: string
}

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
): GroupedSubtitle[] {
  const {
    maxCharsPerLine = 40,
    maxDurationMs = 5000,
    minDurationMs = 1000,
  } = options

  const subtitles: GroupedSubtitle[] = []
  
  if (tokens.length === 0) return subtitles

  let currentSubtitle = {
    startMs: tokens[0].startMs ?? 0,
    endMs: tokens[0].endMs ?? 0,
    text: '',
    speakerId: tokens[0].speaker,
  }

  for (const token of tokens) {
    const tokenStartMs = token.startMs ?? currentSubtitle.endMs
    const tokenEndMs = token.endMs ?? tokenStartMs + 500

    // 判断是否需要开始新的字幕段
    const currentDuration = currentSubtitle.endMs - currentSubtitle.startMs
    const newDuration = tokenEndMs - currentSubtitle.startMs
    const speakerChanged = token.speaker && token.speaker !== currentSubtitle.speakerId
    
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
        speakerId: token.speaker,
      }
    } else {
      currentSubtitle.text += token.text
      currentSubtitle.endMs = tokenEndMs
      if (token.speaker) {
        currentSubtitle.speakerId = token.speaker
      }
    }
  }

  // 添加最后一个字幕段
  if (currentSubtitle.text) {
    subtitles.push(currentSubtitle)
  }

  return subtitles
}

function resolveTranslationDisplayMode(
  session: TranscriptSession | undefined,
  translationDisplay: SubtitleTranslationDisplay | undefined,
): Exclude<SubtitleTranslationDisplay, 'auto'> {
  if (translationDisplay && translationDisplay !== 'auto') {
    return translationDisplay
  }

  const translatedText = session?.translatedTranscript?.text?.trim()
  if (!translatedText) {
    return 'source-only'
  }

  return session?.translatedTranscript?.mode === 'output-only'
    ? 'translated-only'
    : 'dual'
}

function buildSpeakerNameMap(session: TranscriptSession | undefined): Record<string, string> {
  const entries = (session?.speakers || [])
    .map((speaker) => {
      const displayName = speaker.displayName?.trim() || speaker.label?.trim() || speaker.id
      return displayName ? [speaker.id, displayName] : null
    })
    .filter((entry): entry is [string, string] => Boolean(entry))

  return Object.fromEntries(entries)
}

function splitTranslatedTextIntoSubtitles(
  translatedText: string,
  subtitles: GroupedSubtitle[],
): string[] {
  if (!translatedText.trim() || subtitles.length === 0) {
    return subtitles.map(() => '')
  }

  const sentenceMatches = translatedText
    .match(/[^。！？.!?\n]+[。！？.!?]*/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || []

  if (sentenceMatches.length >= subtitles.length) {
    const buckets = Array.from({ length: subtitles.length }, () => [] as string[])
    sentenceMatches.forEach((sentence, index) => {
      const bucketIndex = Math.min(
        subtitles.length - 1,
        Math.floor(index * subtitles.length / sentenceMatches.length),
      )
      buckets[bucketIndex].push(sentence)
    })
    return buckets.map((bucket) => bucket.join(' ').trim())
  }

  const units = translatedText.includes(' ')
    ? (translatedText.match(/\S+\s*/g) ?? [translatedText])
    : Array.from(translatedText)
  const weights = subtitles.map((subtitle) => Math.max(1, subtitle.text.replace(/\s+/g, '').length))
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)

  let previousBoundary = 0
  let consumedWeight = 0

  return weights.map((weight, index) => {
    consumedWeight += weight
    const nextBoundary = index === weights.length - 1
      ? units.length
      : Math.round(consumedWeight / totalWeight * units.length)
    const chunk = units.slice(previousBoundary, nextBoundary).join('').trim()
    previousBoundary = nextBoundary
    return chunk
  })
}

function attachTranslatedTextToSubtitles(
  subtitles: GroupedSubtitle[],
  translatedText: string | undefined,
): GroupedSubtitle[] {
  if (!translatedText?.trim()) {
    return subtitles
  }

  const translatedChunks = splitTranslatedTextIntoSubtitles(translatedText, subtitles)
  return subtitles.map((subtitle, index) => ({
    ...subtitle,
    translatedText: translatedChunks[index] || '',
  }))
}

function renderSubtitleText(
  subtitle: GroupedSubtitle,
  options: {
    includeSpeaker: boolean
    speakerNameMap?: Record<string, string>
    translationDisplay: Exclude<SubtitleTranslationDisplay, 'auto'>
  },
): string {
  const {
    includeSpeaker,
    speakerNameMap = {},
    translationDisplay,
  } = options
  const speakerLabel = subtitle.speakerId
    ? speakerNameMap[subtitle.speakerId] || subtitle.speakerId
    : ''
  const speakerPrefix = includeSpeaker && speakerLabel ? `[${speakerLabel}] ` : ''
  const translatedText = subtitle.translatedText?.trim() || ''

  if (translationDisplay === 'translated-only') {
    return translatedText ? `${speakerPrefix}${translatedText}` : `${speakerPrefix}${subtitle.text}`
  }

  if (translationDisplay === 'dual' && translatedText) {
    return `${speakerPrefix}${subtitle.text}\n${translatedText}`
  }

  return `${speakerPrefix}${subtitle.text}`
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
    speakerNameMap?: Record<string, string>
    translationDisplay?: Exclude<SubtitleTranslationDisplay, 'auto'>
    translatedText?: string
  }
): string {
  const {
    includeSpeaker = true,
    speakerNameMap = {},
    translationDisplay = 'source-only',
    translatedText,
    ...groupOptions
  } = options || {}
  const subtitles = attachTranslatedTextToSubtitles(
    groupTokensIntoSubtitles(tokens, groupOptions),
    translatedText,
  )

  return subtitles
    .map((sub, index) => {
      const startTime = msToSrtTime(sub.startMs)
      const endTime = msToSrtTime(sub.endMs)
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${renderSubtitleText(sub, {
        includeSpeaker,
        speakerNameMap,
        translationDisplay,
      })}\n`
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
    speakerNameMap?: Record<string, string>
    translationDisplay?: Exclude<SubtitleTranslationDisplay, 'auto'>
    translatedText?: string
  }
): string {
  const {
    includeSpeaker = true,
    title,
    speakerNameMap = {},
    translationDisplay = 'source-only',
    translatedText,
    ...groupOptions
  } = options || {}
  const subtitles = attachTranslatedTextToSubtitles(
    groupTokensIntoSubtitles(tokens, groupOptions),
    translatedText,
  )

  let vtt = 'WEBVTT\n'
  if (title) {
    vtt += `Kind: captions\nLanguage: auto\n`
  }
  vtt += '\n'

  return vtt + subtitles
    .map((sub, index) => {
      const startTime = msToVttTime(sub.startMs)
      const endTime = msToVttTime(sub.endMs)
      const speakerLabel = sub.speakerId
        ? speakerNameMap[sub.speakerId] || sub.speakerId
        : ''
      const speakerPrefix = includeSpeaker && speakerLabel ? `<v ${speakerLabel}>` : ''
      const translatedTextLine = sub.translatedText?.trim() || ''
      const cueText = translationDisplay === 'translated-only'
        ? (translatedTextLine || sub.text)
        : translationDisplay === 'dual' && translatedTextLine
          ? `${sub.text}\n${translatedTextLine}`
          : sub.text
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${cueText}\n`
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
    translationDisplay?: SubtitleTranslationDisplay
  }
): string {
  const translationDisplay = resolveTranslationDisplayMode(session, options?.translationDisplay)
  const speakerNameMap = buildSpeakerNameMap(session)
  const translatedText = session.translatedTranscript?.text?.trim()

  // 如果有 tokens，使用 tokens 生成
  if (session.tokens && session.tokens.length > 0) {
    return format === 'srt' 
      ? generateSRT(session.tokens, {
        ...options,
        speakerNameMap,
        translationDisplay,
        translatedText,
      })
      : generateVTT(session.tokens, {
        ...options,
        title: session.title,
        speakerNameMap,
        translationDisplay,
        translatedText,
      })
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
    ? generateSRT(tokens, {
      ...options,
      speakerNameMap,
      translationDisplay,
      translatedText,
    })
    : generateVTT(tokens, {
      ...options,
      title: session.title,
      speakerNameMap,
      translationDisplay,
      translatedText,
    })
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
    translationDisplay?: SubtitleTranslationDisplay
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
