export interface TimestampedWord {
  start: number
  end: number
  text: string
}

export class HypothesisBuffer {
  private committedInBuffer: TimestampedWord[] = []
  private buffer: TimestampedWord[] = []
  private newWords: TimestampedWord[] = []
  private lastCommittedTime = 0

  insert(words: TimestampedWord[], offset: number): void {
    const shifted = words.map(w => ({
      start: w.start + offset,
      end: w.end + offset,
      text: w.text,
    }))

    this.newWords = shifted.filter(w => w.start > this.lastCommittedTime - 0.1)

    if (this.newWords.length >= 1 && this.committedInBuffer.length > 0) {
      const firstNew = this.newWords[0]
      if (Math.abs(firstNew.start - this.lastCommittedTime) < 1) {
        const cn = this.committedInBuffer.length
        const nn = this.newWords.length
        const maxNgram = Math.min(Math.min(cn, nn), 5)

        for (let i = 1; i <= maxNgram; i++) {
          const committedTail = this.committedInBuffer
            .slice(-i)
            .map(w => w.text.trim())
            .join(' ')
          const newHead = this.newWords
            .slice(0, i)
            .map(w => w.text.trim())
            .join(' ')

          if (committedTail === newHead) {
            this.newWords.splice(0, i)
            break
          }
        }
      }
    }
  }

  flush(): TimestampedWord[] {
    const commit: TimestampedWord[] = []

    while (this.newWords.length > 0 && this.buffer.length > 0) {
      const nw = this.newWords[0]
      const bw = this.buffer[0]

      if (nw.text.trim() === bw.text.trim()) {
        commit.push(nw)
        this.lastCommittedTime = nw.end
        this.buffer.shift()
        this.newWords.shift()
      } else {
        break
      }
    }

    this.buffer = this.newWords
    this.newWords = []
    this.committedInBuffer.push(...commit)
    return commit
  }

  popCommitted(time: number): void {
    while (this.committedInBuffer.length > 0 && this.committedInBuffer[0].end <= time) {
      this.committedInBuffer.shift()
    }
  }

  complete(): TimestampedWord[] {
    return this.buffer
  }

  getLastCommittedTime(): number {
    return this.lastCommittedTime
  }

  getAllCommitted(): TimestampedWord[] {
    return this.committedInBuffer
  }

  reset(): void {
    this.committedInBuffer = []
    this.buffer = []
    this.newWords = []
    this.lastCommittedTime = 0
  }
}

export function wordsToText(words: TimestampedWord[], separator = ''): string {
  if (words.length === 0) return ''
  return words.map(w => w.text).join(separator)
}
