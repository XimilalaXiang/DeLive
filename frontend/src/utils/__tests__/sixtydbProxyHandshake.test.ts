import { describe, expect, it } from 'vitest'
import { isSixtydbConnectionEstablished } from '../../../../shared/sixtydbProxyCore'

describe('isSixtydbConnectionEstablished', () => {
  it('recognizes STT connection_established frames by type', () => {
    expect(isSixtydbConnectionEstablished({ type: 'connection_established' })).toBe(true)
  })

  it('recognizes legacy TTS-style connection_established object key', () => {
    expect(isSixtydbConnectionEstablished({
      connection_established: { session_id: 'abc' },
    })).toBe(true)
  })

  it('ignores unrelated frames', () => {
    expect(isSixtydbConnectionEstablished({ type: 'connected' })).toBe(false)
    expect(isSixtydbConnectionEstablished({ type: 'connecting' })).toBe(false)
  })
})
