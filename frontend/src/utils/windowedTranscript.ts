const DEFAULT_OVERLAP_TAIL_CHARS = 200

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

  return transcript
}

export function buildWindowedTranscriptSnapshot(
  committedText: string,
  transcript: string,
  maxOverlapTailChars = DEFAULT_OVERLAP_TAIL_CHARS,
): string {
  return committedText + stripLeadingTranscriptOverlap(transcript, committedText, maxOverlapTailChars)
}
