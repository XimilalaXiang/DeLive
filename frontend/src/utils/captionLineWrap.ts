export interface CaptionLineWrapOptions {
  maxLines: number
  maxWidth: number
  measureText: (text: string) => number
}

function splitParagraphs(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n')
}

function segmentWords(text: string): string[] {
  if (!text) return []

  const intlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity?: 'grapheme' | 'word' | 'sentence' }
    ) => {
      segment: (input: string) => Iterable<{ segment: string }>
    }
  }

  if (typeof intlWithSegmenter.Segmenter === 'function') {
    const segmenter = new intlWithSegmenter.Segmenter(undefined, { granularity: 'word' })
    const rawSegments = Array.from(segmenter.segment(text), (item) => item.segment)
    const mergedSegments: string[] = []

    for (const segment of rawSegments) {
      if (/^\s+$/u.test(segment) && mergedSegments.length > 0) {
        mergedSegments[mergedSegments.length - 1] += segment
      } else {
        mergedSegments.push(segment)
      }
    }

    return mergedSegments
  }

  return Array.from(text)
}

function splitOversizedSegment(
  segment: string,
  maxWidth: number,
  measureText: (text: string) => number,
): string[] {
  const chars = Array.from(segment)
  const parts: string[] = []
  let current = ''

  for (const char of chars) {
    const candidate = current + char
    if (!current || measureText(candidate) <= maxWidth) {
      current = candidate
      continue
    }

    parts.push(current)
    current = char
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

function appendSegmentToLines(
  lines: string[],
  rawSegment: string,
  maxWidth: number,
  measureText: (text: string) => number,
): void {
  let currentLine = lines[lines.length - 1] ?? ''
  const segment = currentLine ? rawSegment : rawSegment.replace(/^\s+/u, '')

  if (!segment) {
    return
  }

  const candidate = currentLine + segment
  if (!currentLine && measureText(segment) <= maxWidth) {
    lines[lines.length - 1] = segment
    return
  }

  if (currentLine && measureText(candidate) <= maxWidth) {
    lines[lines.length - 1] = candidate
    return
  }

  const trimmedSegment = segment.replace(/^\s+/u, '')
  const splitParts = measureText(trimmedSegment) <= maxWidth
    ? [trimmedSegment]
    : splitOversizedSegment(trimmedSegment, maxWidth, measureText)

  for (const part of splitParts) {
    currentLine = lines[lines.length - 1] ?? ''
    const nextCandidate = currentLine ? currentLine + part : part

    if (!currentLine && measureText(part) <= maxWidth) {
      lines[lines.length - 1] = part
      continue
    }

    if (currentLine && measureText(nextCandidate) <= maxWidth) {
      lines[lines.length - 1] = nextCandidate
      continue
    }

    if (currentLine) {
      lines[lines.length - 1] = currentLine.trimEnd()
      lines.push(part)
    } else {
      lines[lines.length - 1] = part
    }
  }
}

function normalizeLines(lines: string[], maxLines: number): string[] {
  return lines
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-maxLines)
}

export function wrapCaptionText(
  text: string,
  { maxLines, maxWidth, measureText }: CaptionLineWrapOptions,
): string[] {
  if (!text || maxLines <= 0 || maxWidth <= 0) {
    return []
  }

  const lines: string[] = ['']
  const paragraphs = splitParagraphs(text)

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex > 0) {
      lines.push('')
    }

    const segments = segmentWords(paragraph)
    for (const segment of segments) {
      appendSegmentToLines(lines, segment, maxWidth, measureText)
    }
  })

  return normalizeLines(lines, maxLines)
}

export function appendCaptionText(
  baseLines: string[],
  text: string,
  { maxLines, maxWidth, measureText }: CaptionLineWrapOptions,
): string[] {
  if (!text) {
    return normalizeLines(baseLines, maxLines)
  }

  const lines = baseLines.length > 0 ? [...baseLines] : ['']
  const paragraphs = splitParagraphs(text)

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex > 0) {
      lines.push('')
    }

    const segments = segmentWords(paragraph)
    for (const segment of segments) {
      appendSegmentToLines(lines, segment, maxWidth, measureText)
    }
  })

  return normalizeLines(lines, maxLines)
}
