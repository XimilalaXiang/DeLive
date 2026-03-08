import { describe, expect, it } from 'vitest'
import { appendCaptionText, wrapCaptionText } from './captionLineWrap'

function createMeasureText(charWidth: number) {
  return (text: string) => Array.from(text).length * charWidth
}

describe('wrapCaptionText', () => {
  it('wraps text in visual order from the start', () => {
    const lines = wrapCaptionText('hello world again', {
      maxLines: 3,
      maxWidth: 60,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['hello', 'world', 'again'])
  })

  it('keeps only the last N wrapped lines', () => {
    const lines = wrapCaptionText('one two three four five six', {
      maxLines: 2,
      maxWidth: 50,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['five', 'six'])
  })

  it('splits oversized words when they exceed the available width', () => {
    const lines = wrapCaptionText('OpenCloudFolder', {
      maxLines: 4,
      maxWidth: 50,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['OpenC', 'loudF', 'older'])
  })

  it('respects explicit line breaks', () => {
    const lines = wrapCaptionText('line1\nline2', {
      maxLines: 3,
      maxWidth: 100,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['line1', 'line2'])
  })
})

describe('appendCaptionText', () => {
  it('appends active text to the last visible line before creating a new line', () => {
    const lines = appendCaptionText(['hello'], ' world', {
      maxLines: 2,
      maxWidth: 120,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['hello world'])
  })

  it('pushes overflow into a new line while preserving visual order', () => {
    const lines = appendCaptionText(['hello'], ' world again', {
      maxLines: 2,
      maxWidth: 110,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['hello', 'world again'])
  })

  it('drops older lines once maxLines is exceeded', () => {
    const lines = appendCaptionText(['line1', 'line2'], ' line3', {
      maxLines: 2,
      maxWidth: 60,
      measureText: createMeasureText(10),
    })

    expect(lines).toEqual(['line2', 'line3'])
  })
})
