import { describe, expect, it } from 'vitest'
import { mixToMonoPcm16 } from '../audioFileToWav'

describe('mixToMonoPcm16', () => {
  it('converts float samples to little-endian PCM16', () => {
    const view = new DataView(mixToMonoPcm16([new Float32Array([0, 1, -1, 0.5, 2, -2])]))
    expect(view.byteLength).toBe(12)
    expect(view.getInt16(0, true)).toBe(0)
    expect(view.getInt16(2, true)).toBe(32767)
    expect(view.getInt16(4, true)).toBe(-32768)
    expect(view.getInt16(6, true)).toBe(16383)
    expect(view.getInt16(8, true)).toBe(32767)
    expect(view.getInt16(10, true)).toBe(-32768)
  })

  it('averages channels to mono', () => {
    const view = new DataView(mixToMonoPcm16([
      new Float32Array([1, 0.5]),
      new Float32Array([-1, 0.5]),
    ]))
    expect(view.getInt16(0, true)).toBe(0)
    expect(view.getInt16(2, true)).toBe(16383)
  })

  it('handles empty input', () => {
    expect(mixToMonoPcm16([]).byteLength).toBe(0)
  })
})
