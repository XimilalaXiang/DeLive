import { describe, it, expect } from 'vitest'
import { TranscriptStabilizer } from './transcriptStabilizer'

describe('TranscriptStabilizer', () => {
  it('starts with empty state', () => {
    const stabilizer = new TranscriptStabilizer()
    const result = stabilizer.process('')
    expect(result.finalizedText).toBe('')
    expect(result.partialText).toBe('')
  })

  it('keeps short text as partial until stable', () => {
    const stabilizer = new TranscriptStabilizer()
    const r1 = stabilizer.process('Hi')
    expect(r1.finalizedText).toBe('')
    expect(r1.partialText).toBe('Hi')
  })

  it('commits text at strong boundary when confirmed by next snapshot', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Hello world.')
    const r2 = stabilizer.process('Hello world. Next')
    expect(r2.finalizedText).toBe('Hello world.')
    expect(r2.partialText).toBe(' Next')
  })

  it('commits at Chinese sentence boundary', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('你好世界。')
    const r2 = stabilizer.process('你好世界。接下来')
    expect(r2.finalizedText).toBe('你好世界。')
  })

  it('commits at soft boundary for long stable text', () => {
    const stabilizer = new TranscriptStabilizer()
    const longText = 'word1 word2 word3 word4 word5 word6 word7'
    stabilizer.process(longText)
    const r2 = stabilizer.process(longText + ' more content here after')
    expect(r2.finalizedText.length).toBeGreaterThan(0)
  })

  it('flush commits all remaining text', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Hello world')
    const r = stabilizer.flush('Hello world')
    expect(r.finalizedText).toBe('Hello world')
    expect(r.partialText).toBe('')
  })

  it('flush after partial commit only flushes remaining', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Hello world.')
    stabilizer.process('Hello world. More text')
    const r = stabilizer.flush('Hello world. More text')
    expect(r.partialText).toBe('')
  })

  it('reset clears all state', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Some text.')
    stabilizer.process('Some text. More.')
    stabilizer.reset()
    const r = stabilizer.process('Brand new')
    expect(r.partialText).toBe('Brand new')
    expect(r.finalizedText).toBe('')
  })

  it('handles \r\n normalization', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Line one.\r\nLine two.')
    const r2 = stabilizer.process('Line one.\r\nLine two. More')
    expect(r2.finalizedText).toContain('Line one.')
  })

  it('does not commit when common prefix is shorter than committed text', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Hello world.')
    stabilizer.process('Hello world. Test.')
    const r3 = stabilizer.process('Completely different text')
    expect(r3.finalizedText).toBe('')
  })

  it('preserves last partial when snapshot diverges from committed text', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('Hello world.')
    const r2 = stabilizer.process('Hello world. Some partial')
    expect(r2.finalizedText).toBe('Hello world.')
    expect(r2.partialText).toBe(' Some partial')

    const r3 = stabilizer.process('Divergent snapshot that lost prefix')
    expect(r3.finalizedText).toBe('')
    expect(r3.partialText).toBe(' Some partial')
  })

  it('handles empty snapshots gracefully', () => {
    const stabilizer = new TranscriptStabilizer()
    const r1 = stabilizer.process('')
    expect(r1.finalizedText).toBe('')
    expect(r1.partialText).toBe('')
    const r2 = stabilizer.process('Hello')
    expect(r2.partialText).toBe('Hello')
  })

  it('accumulates committed text across multiple process calls', () => {
    const stabilizer = new TranscriptStabilizer()
    stabilizer.process('First sentence.')
    stabilizer.process('First sentence. Second sentence.')
    stabilizer.process('First sentence. Second sentence. Third')
    const finalFlush = stabilizer.flush('First sentence. Second sentence. Third')
    expect(finalFlush.partialText).toBe('')
  })
})
