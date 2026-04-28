import { describe, it, expect } from 'vitest'
import { HypothesisBuffer, wordsToText, type TimestampedWord } from './hypothesisBuffer'

function w(text: string, start: number, end: number): TimestampedWord {
  return { text, start, end }
}

describe('HypothesisBuffer', () => {
  it('starts with empty state', () => {
    const buf = new HypothesisBuffer()
    expect(buf.getLastCommittedTime()).toBe(0)
    expect(buf.getAllCommitted()).toEqual([])
    expect(buf.complete()).toEqual([])
  })

  it('insert + flush with no prior buffer commits nothing', () => {
    const buf = new HypothesisBuffer()
    buf.insert([w('hello', 0, 0.5), w('world', 0.6, 1.0)], 0)
    const committed = buf.flush()
    expect(committed).toEqual([])
    expect(buf.complete()).toHaveLength(2)
  })

  it('commits words that agree between consecutive inserts', () => {
    const buf = new HypothesisBuffer()

    buf.insert([w('hello', 0, 0.5), w('world', 0.6, 1.0)], 0)
    buf.flush()

    buf.insert([w('hello', 0, 0.5), w('world', 0.6, 1.0), w('foo', 1.1, 1.5)], 0)
    const committed = buf.flush()

    expect(committed).toHaveLength(2)
    expect(committed[0].text).toBe('hello')
    expect(committed[1].text).toBe('world')
    expect(buf.getLastCommittedTime()).toBe(1.0)
  })

  it('does not commit words that disagree', () => {
    const buf = new HypothesisBuffer()

    buf.insert([w('hello', 0, 0.5), w('world', 0.6, 1.0)], 0)
    buf.flush()

    buf.insert([w('hello', 0, 0.5), w('earth', 0.6, 1.0)], 0)
    const committed = buf.flush()

    expect(committed).toHaveLength(1)
    expect(committed[0].text).toBe('hello')
  })

  it('applies time offset during insert', () => {
    const buf = new HypothesisBuffer()
    buf.insert([w('a', 0, 0.5)], 10)
    buf.flush()

    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0)], 10)
    const committed = buf.flush()

    expect(committed[0].start).toBe(10)
    expect(committed[0].end).toBe(10.5)
  })

  it('reset clears all state', () => {
    const buf = new HypothesisBuffer()
    buf.insert([w('hello', 0, 0.5)], 0)
    buf.flush()
    buf.insert([w('hello', 0, 0.5), w('world', 0.6, 1.0)], 0)
    buf.flush()

    buf.reset()

    expect(buf.getLastCommittedTime()).toBe(0)
    expect(buf.getAllCommitted()).toEqual([])
    expect(buf.complete()).toEqual([])
  })

  it('complete returns the current buffer (uncommitted hypothesis)', () => {
    const buf = new HypothesisBuffer()
    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0)], 0)
    buf.flush()

    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0), w('c', 1.1, 1.5)], 0)
    buf.flush()

    const remaining = buf.complete()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].text).toBe('c')
  })

  it('popCommitted removes words up to the given time', () => {
    const buf = new HypothesisBuffer()
    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0)], 0)
    buf.flush()

    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0), w('c', 1.1, 1.5)], 0)
    buf.flush()

    expect(buf.getAllCommitted()).toHaveLength(2)

    buf.popCommitted(0.5)
    expect(buf.getAllCommitted()).toHaveLength(1)
    expect(buf.getAllCommitted()[0].text).toBe('b')

    buf.popCommitted(2.0)
    expect(buf.getAllCommitted()).toHaveLength(0)
  })

  it('deduplicates overlapping n-grams between committed tail and new words', () => {
    const buf = new HypothesisBuffer()

    buf.insert([w('the', 0, 0.3), w('quick', 0.4, 0.7)], 0)
    buf.flush()

    buf.insert([w('the', 0, 0.3), w('quick', 0.4, 0.7), w('brown', 0.8, 1.1)], 0)
    buf.flush()

    // Now committed = [the, quick], next insert starts with "quick" overlap
    buf.insert([w('quick', 0.4, 0.7), w('brown', 0.8, 1.1), w('fox', 1.2, 1.5)], 0)
    const committed = buf.flush()

    // "quick" should be deduplicated, "brown" agrees with buffer
    expect(committed.map(w => w.text)).toContain('brown')
    const allTexts = buf.getAllCommitted().map(w => w.text)
    // Should not have duplicate "quick"
    expect(allTexts.filter(t => t === 'quick')).toHaveLength(1)
  })

  it('handles empty word array insert gracefully', () => {
    const buf = new HypothesisBuffer()
    buf.insert([], 0)
    const committed = buf.flush()
    expect(committed).toEqual([])
  })

  it('accumulates committed words over multiple flush cycles', () => {
    const buf = new HypothesisBuffer()

    buf.insert([w('a', 0, 0.5)], 0)
    buf.flush()
    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0)], 0)
    buf.flush()
    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0), w('c', 1.1, 1.5)], 0)
    buf.flush()
    buf.insert([w('a', 0, 0.5), w('b', 0.6, 1.0), w('c', 1.1, 1.5), w('d', 1.6, 2.0)], 0)
    buf.flush()

    const all = buf.getAllCommitted()
    expect(all.map(w => w.text)).toEqual(['a', 'b', 'c'])
  })
})

describe('wordsToText', () => {
  it('joins word text with default empty separator', () => {
    const words = [w('hello', 0, 0.5), w('world', 0.6, 1.0)]
    expect(wordsToText(words)).toBe('helloworld')
  })

  it('joins word text with custom separator', () => {
    const words = [w('hello', 0, 0.5), w('world', 0.6, 1.0)]
    expect(wordsToText(words, ' ')).toBe('hello world')
  })

  it('returns empty string for empty array', () => {
    expect(wordsToText([])).toBe('')
  })

  it('handles single word', () => {
    expect(wordsToText([w('solo', 0, 1)])).toBe('solo')
  })
})
