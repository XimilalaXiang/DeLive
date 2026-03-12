import type { Tag, TranscriptSession } from '../types'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0]
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toTimeString().slice(0, 5)
}

function buildSpeakerAwareTranscript(session: TranscriptSession): string {
  const speakerNameMap = Object.fromEntries(
    (session.speakers || []).map((speaker) => [
      speaker.id,
      speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
    ]),
  )

  if ((session.segments || []).length > 0) {
    return (session.segments || [])
      .filter((segment) => segment.text.trim())
      .map((segment) => {
        const speakerLabel = segment.speakerId
          ? speakerNameMap[segment.speakerId] || segment.speakerId
          : ''
        return speakerLabel
          ? `[${speakerLabel}]\n${segment.text}`
          : segment.text
      })
      .join('\n\n')
  }
  return session.transcript
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToTxt(session: TranscriptSession, tags?: Tag[]): void {
  const sessionTags = tags?.filter((tag) => session.tagIds?.includes(tag.id)) || []
  const tagNames = sessionTags.map((tag) => tag.name).join(', ')
  const translatedText = session.translatedTranscript?.text?.trim()
  const speakerAwareTranscript = buildSpeakerAwareTranscript(session)

  const content = `标题: ${session.title}
日期: ${session.date}
时间: ${session.time}${tagNames ? `\n标签: ${tagNames}` : ''}
${'='.repeat(50)}

${speakerAwareTranscript}
${translatedText ? `\n\n${'-'.repeat(20)}\n翻译\n${'-'.repeat(20)}\n\n${translatedText}\n` : ''}
`

  triggerDownload(
    new Blob([content], { type: 'text/plain;charset=utf-8' }),
    `${session.title}_${session.date}_${session.time.replace(':', '-')}.txt`,
  )
}

export function exportToMarkdown(session: TranscriptSession, tags?: Tag[]): void {
  const sessionTags = tags?.filter((tag) => session.tagIds?.includes(tag.id)) || []
  const tagNames = sessionTags.map((tag) => `\`${tag.name}\``).join(' ')
  const translatedText = session.translatedTranscript?.text?.trim()

  const speakerNameMap = Object.fromEntries(
    (session.speakers || []).map((speaker) => [
      speaker.id,
      speaker.displayName?.trim() || speaker.label?.trim() || speaker.id,
    ]),
  )

  const hasSegments = (session.segments || []).length > 0
  const transcriptMd = hasSegments
    ? (session.segments || [])
        .filter((seg) => seg.text.trim())
        .map((seg) => {
          const speaker = seg.speakerId
            ? speakerNameMap[seg.speakerId] || seg.speakerId
            : ''
          return speaker ? `**${speaker}**: ${seg.text}` : seg.text
        })
        .join('\n\n')
    : session.transcript

  const lines: string[] = []
  lines.push(`# ${session.title}`)
  lines.push('')
  lines.push(`> ${session.date} ${session.time}${tagNames ? ` | ${tagNames}` : ''}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(transcriptMd)

  if (translatedText) {
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('## Translation')
    lines.push('')
    lines.push(translatedText)
  }

  lines.push('')

  triggerDownload(
    new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }),
    `${session.title}_${session.date}_${session.time.replace(':', '-')}.md`,
  )
}
