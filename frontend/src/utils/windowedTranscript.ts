const DEFAULT_OVERLAP_TAIL_CHARS = 200

function normalize(text: string): string {
  return text.replace(/[\s\u3000]+/g, ' ').replace(/[.,;:!?\u3002\uff0c\uff1b\uff1a\uff01\uff1f\u3001]+/g, '').toLowerCase()
}

function findNormalizedOverlapLength(
  tail: string,
  head: string,
): number {
  const normTail = normalize(tail)
  const normHead = normalize(head)
  const maxLen = Math.min(normTail.length, normHead.length)

  for (let len = maxLen; len >= 4; len -= 1) {
    if (normTail.slice(-len) === normHead.slice(0, len)) {
      return mapNormalizedIndexToOriginal(head, len)
    }
  }
  return 0
}

function mapNormalizedIndexToOriginal(original: string, normalizedLen: number): number {
  let normCount = 0
  for (let i = 0; i < original.length; i++) {
    const normChar = normalize(original[i])
    normCount += normChar.length
    if (normCount >= normalizedLen) {
      return i + 1
    }
  }
  return original.length
}

export function stripLeadingTranscriptOverlap(
  transcript: string,
  committedText: string,
  maxOverlapTailChars = DEFAULT_OVERLAP_TAIL_CHARS,
): string {
  if (!transcript) {
    return ''
  }

  if (!committedText) {
    return transcript
  }

  const tail = committedText.slice(-Math.max(0, maxOverlapTailChars))
  const maxLength = Math.min(tail.length, transcript.length)

  for (let length = maxLength; length > 0; length -= 1) {
    if (tail.slice(-length) === transcript.slice(0, length)) {
      return transcript.slice(length)
    }
  }

  const fuzzySkip = findNormalizedOverlapLength(tail, transcript.slice(0, maxLength))
  if (fuzzySkip > 0) {
    return transcript.slice(fuzzySkip)
  }

  return transcript
}

export function buildWindowedTranscriptSnapshot(
  committedText: string,
  transcript: string,
  maxOverlapTailChars = DEFAULT_OVERLAP_TAIL_CHARS,
): string {
  if (committedText) {
    const normCommitted = normalize(committedText)
    const normTranscript = normalize(transcript)
    if (normTranscript.startsWith(normCommitted)) {
      const skipLen = mapNormalizedIndexToOriginal(transcript, normCommitted.length)
      return committedText + transcript.slice(skipLen)
    }
  }

  return committedText + stripLeadingTranscriptOverlap(transcript, committedText, maxOverlapTailChars)
}
