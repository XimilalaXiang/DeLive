import { describe, it, expect } from 'vitest'
import { TranscriptStabilizer } from '../transcriptStabilizer'

describe('TranscriptStabilizer', () => {
  it('returns empty on first call (nothing stable yet)', () => {
    const stab = new TranscriptStabilizer()
    const result = stab.process('Hello')
    expect(result.finalizedText).toBe('')
    expect(result.partialText).toBe('Hello')
  })

  it('commits text at a strong boundary after two identical snapshots', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Hello world.')
    const result = stab.process('Hello world. More text')
    expect(result.finalizedText).toBe('Hello world.')
  })

  it('does not commit text shorter than MIN_BOUNDARY_COMMIT_CHARS', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Hi.')
    const result = stab.process('Hi. More')
    // "Hi." is only 3 chars, below the 4-char minimum
    expect(result.finalizedText).toBe('')
  })

  it('commits at strong boundary with exactly MIN_BOUNDARY_COMMIT_CHARS', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Abcd.')
    const result = stab.process('Abcd. Next')
    // "Abcd." is 5 chars >= 4 min
    expect(result.finalizedText).toBe('Abcd.')
  })

  it('accumulates commits over multiple process calls', () => {
    const stab = new TranscriptStabilizer()
    stab.process('First sentence.')
    stab.process('First sentence. Second.')
    const r1 = stab.process('First sentence. Second. Third.')

    // By now "First sentence." should have been committed
    // "Second." should also commit (prefix is stable across calls)
    // The exact behavior depends on common-prefix logic
    expect(r1.partialText).not.toContain('First sentence.')
  })

  it('flush commits all remaining text', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Some partial text')
    const result = stab.flush('Some partial text that is final')
    expect(result.finalizedText).toBe('Some partial text that is final')
    expect(result.partialText).toBe('')
  })

  it('flush after partial commit only flushes the remainder', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Hello world.')
    stab.process('Hello world. End')
    // "Hello world." is now committed
    const result = stab.flush('Hello world. End')
    expect(result.finalizedText).toBe(' End')
    expect(result.partialText).toBe('')
  })

  it('reset clears all internal state', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Some text.')
    stab.process('Some text. More')
    stab.reset()

    const result = stab.process('Brand new')
    expect(result.finalizedText).toBe('')
    expect(result.partialText).toBe('Brand new')
  })

  it('normalizes CRLF to LF', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Line one.\r\nLine two.')
    const result = stab.process('Line one.\r\nLine two. More')
    // Should treat \r\n the same as \n
    expect(result.finalizedText).toContain('Line one.')
  })

  it('handles soft boundaries for long stable segments', () => {
    const stab = new TranscriptStabilizer()
    const longText = 'This is a rather long sentence without any strong punctuation'
    stab.process(longText)
    const result = stab.process(longText + ' continued')
    // With 60+ chars stable, soft boundary or long-segment logic should commit some text
    expect(result.finalizedText.length).toBeGreaterThan(0)
  })

  it('handles empty string input', () => {
    const stab = new TranscriptStabilizer()
    const result = stab.process('')
    expect(result.finalizedText).toBe('')
    expect(result.partialText).toBe('')
  })

  it('flush on empty after process returns remaining', () => {
    const stab = new TranscriptStabilizer()
    stab.process('Hello')
    const result = stab.flush('Hello')
    expect(result.finalizedText).toBe('Hello')
  })
})
