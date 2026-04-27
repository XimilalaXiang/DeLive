interface StabilizedTranscriptUpdate {
  finalizedText: string
  partialText: string
}

const STRONG_BOUNDARIES = new Set(['。', '！', '？', '.', '!', '?', ';', '；', ':', '：', '\n'])
const SOFT_BOUNDARIES = new Set([' ', '\t', ',', '，', '、'])
const MIN_BOUNDARY_COMMIT_CHARS = 4
const TRAILING_STABILITY_BUFFER = 4
const LONG_STABLE_SEGMENT_CHARS = 16

function normalizeSnapshot(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

function getLongestCommonPrefixLength(left: string, right: string): number {
  const maxLength = Math.min(left.length, right.length)
  let index = 0

  while (index < maxLength && left[index] === right[index]) {
    index += 1
  }

  return index
}

function findBoundaryIndex(text: string, boundaries: Set<string>): number {
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (boundaries.has(text[index])) {
      return index + 1
    }
  }

  return 0
}

function getCommitLength(candidate: string): number {
  if (!candidate) {
    return 0
  }

  const strongBoundary = findBoundaryIndex(candidate, STRONG_BOUNDARIES)
  if (strongBoundary >= MIN_BOUNDARY_COMMIT_CHARS) {
    return strongBoundary
  }

  if (candidate.length > TRAILING_STABILITY_BUFFER) {
    const softBoundaryWindow = candidate.slice(0, candidate.length - TRAILING_STABILITY_BUFFER)
    const softBoundary = findBoundaryIndex(softBoundaryWindow, SOFT_BOUNDARIES)
    if (softBoundary >= MIN_BOUNDARY_COMMIT_CHARS) {
      return softBoundary
    }
  }

  if (candidate.length >= LONG_STABLE_SEGMENT_CHARS) {
    return candidate.length - TRAILING_STABILITY_BUFFER
  }

  return 0
}

export class TranscriptStabilizer {
  private committedText = ''
  private previousSnapshot = ''
  private lastPartialText = ''

  getCommittedText(): string {
    return this.committedText
  }

  process(snapshot: string): StabilizedTranscriptUpdate {
    const normalizedSnapshot = normalizeSnapshot(snapshot)
    const commonPrefixLength = getLongestCommonPrefixLength(this.previousSnapshot, normalizedSnapshot)
    const stablePrefix = normalizedSnapshot.slice(0, commonPrefixLength)

    let finalizedText = ''

    if (
      stablePrefix.length > this.committedText.length &&
      stablePrefix.startsWith(this.committedText)
    ) {
      const stableCandidate = stablePrefix.slice(this.committedText.length)
      const commitLength = getCommitLength(stableCandidate)

      if (commitLength > 0) {
        finalizedText = stableCandidate.slice(0, commitLength)
        this.committedText += finalizedText
      }
    }

    this.previousSnapshot = normalizedSnapshot

    const partialText = this.buildPartialText(normalizedSnapshot)
    this.lastPartialText = partialText

    return {
      finalizedText,
      partialText,
    }
  }

  flush(snapshot: string): StabilizedTranscriptUpdate {
    const normalizedSnapshot = normalizeSnapshot(snapshot)
    const remainingText = normalizedSnapshot.startsWith(this.committedText)
      ? normalizedSnapshot.slice(this.committedText.length)
      : normalizedSnapshot

    this.committedText += remainingText
    this.previousSnapshot = normalizedSnapshot
    this.lastPartialText = ''

    return {
      finalizedText: remainingText,
      partialText: '',
    }
  }

  reset(): void {
    this.committedText = ''
    this.previousSnapshot = ''
    this.lastPartialText = ''
  }

  private buildPartialText(snapshot: string): string {
    if (snapshot.startsWith(this.committedText)) {
      return snapshot.slice(this.committedText.length)
    }

    return this.lastPartialText
  }
}
