import { describe, it, expect } from 'vitest'
import {
  GLADIA_DEFAULT_FILE_MODEL,
  GLADIA_DEFAULT_MODEL,
  resolveGladiaFileModel,
} from '../gladia'

describe('resolveGladiaFileModel', () => {
  it('defaults to solaria-1 for file transcription', () => {
    expect(resolveGladiaFileModel(undefined)).toBe(GLADIA_DEFAULT_FILE_MODEL)
    expect(GLADIA_DEFAULT_FILE_MODEL).toBe(GLADIA_DEFAULT_MODEL)
  })

  it('allows solaria-3 for async file jobs only', () => {
    expect(resolveGladiaFileModel('solaria-3')).toBe('solaria-3')
    expect(resolveGladiaFileModel('solaria-1')).toBe('solaria-1')
  })

  it('rejects invalid file models', () => {
    expect(resolveGladiaFileModel('solaria-99')).toBe(GLADIA_DEFAULT_FILE_MODEL)
  })
})
