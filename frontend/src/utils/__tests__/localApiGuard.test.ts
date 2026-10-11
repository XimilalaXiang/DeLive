import { describe, expect, it } from 'vitest'
import { isAllowedLiveOrigin, isLoopbackHostHeader } from '../../../../shared/localApiGuard'

describe('isLoopbackHostHeader', () => {
  it('accepts loopback hosts with or without a port', () => {
    expect(isLoopbackHostHeader('localhost:23456')).toBe(true)
    expect(isLoopbackHostHeader('127.0.0.1:23456')).toBe(true)
    expect(isLoopbackHostHeader('[::1]:23456')).toBe(true)
    expect(isLoopbackHostHeader('LOCALHOST')).toBe(true)
  })

  it('rejects other hosts, including DNS-rebinding names', () => {
    expect(isLoopbackHostHeader('attacker.example.com')).toBe(false)
    expect(isLoopbackHostHeader('attacker.example.com:23456')).toBe(false)
    expect(isLoopbackHostHeader('localhost.attacker.com')).toBe(false)
    expect(isLoopbackHostHeader('192.168.1.20:23456')).toBe(false)
    expect(isLoopbackHostHeader(undefined)).toBe(false)
    expect(isLoopbackHostHeader('')).toBe(false)
  })
})

describe('isAllowedLiveOrigin', () => {
  it('allows local tools (no Origin) and DeLive windows', () => {
    expect(isAllowedLiveOrigin(undefined)).toBe(true)
    expect(isAllowedLiveOrigin('file://')).toBe(true)
    expect(isAllowedLiveOrigin('http://localhost:5173')).toBe(true)
  })

  it('refuses web pages', () => {
    expect(isAllowedLiveOrigin('https://evil.example.com')).toBe(false)
    expect(isAllowedLiveOrigin('http://localhost:8080')).toBe(false)
  })
})
