import { describe, expect, it } from 'vitest'
import { applyLocalServiceCors, isLoopbackHttpUrl } from '../../../../shared/localServiceCors'

describe('isLoopbackHttpUrl', () => {
  it('accepts loopback hosts', () => {
    expect(isLoopbackHttpUrl('http://127.0.0.1:8000/health')).toBe(true)
    expect(isLoopbackHttpUrl('http://localhost:8177/inference')).toBe(true)
    expect(isLoopbackHttpUrl('http://[::1]:8000/v1/models')).toBe(true)
    expect(isLoopbackHttpUrl('http://127.1.2.3:9000/')).toBe(true)
  })

  it('rejects remote, LAN and non-http urls', () => {
    expect(isLoopbackHttpUrl('https://api.soniox.com/v1/files')).toBe(false)
    expect(isLoopbackHttpUrl('http://192.168.1.10:8000/health')).toBe(false)
    expect(isLoopbackHttpUrl('http://localhost.evil.com/')).toBe(false)
    expect(isLoopbackHttpUrl('file:///index.html')).toBe(false)
    expect(isLoopbackHttpUrl('not a url')).toBe(false)
  })
})

describe('applyLocalServiceCors', () => {
  it('leaves remote responses untouched', () => {
    expect(applyLocalServiceCors({
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      method: 'POST',
      statusCode: 200,
      responseHeaders: {},
    })).toBeNull()
  })

  it('adds a wildcard origin to local responses without CORS headers (funasr-server default)', () => {
    const result = applyLocalServiceCors({
      url: 'http://127.0.0.1:8000/health',
      method: 'GET',
      statusCode: 200,
      responseHeaders: { 'content-type': ['application/json'] },
    })
    expect(result?.responseHeaders['Access-Control-Allow-Origin']).toEqual(['*'])
    expect(result?.responseHeaders['content-type']).toEqual(['application/json'])
    expect(result?.statusLine).toBeUndefined()
  })

  it('replaces an origin allow-list that does not include the app origin', () => {
    const result = applyLocalServiceCors({
      url: 'http://127.0.0.1:8000/v1/audio/transcriptions',
      method: 'POST',
      statusCode: 200,
      responseHeaders: {
        'access-control-allow-origin': ['http://localhost:3000'],
        'access-control-allow-credentials': ['true'],
      },
    })
    const headers = result!.responseHeaders
    expect(headers['access-control-allow-origin']).toBeUndefined()
    expect(headers['access-control-allow-credentials']).toBeUndefined()
    expect(headers['Access-Control-Allow-Origin']).toEqual(['*'])
  })

  it('turns a rejected preflight into a successful one', () => {
    const result = applyLocalServiceCors({
      url: 'http://localhost:1234/v1/audio/transcriptions',
      method: 'OPTIONS',
      statusCode: 405,
      responseHeaders: {},
    })
    expect(result?.statusLine).toBe('HTTP/1.1 204 No Content')
    expect(result?.responseHeaders['Access-Control-Allow-Methods']).toEqual(['GET, POST, OPTIONS'])
    expect(result?.responseHeaders['Access-Control-Allow-Headers']).toEqual(['Authorization, Content-Type'])
  })

  it('keeps a server-provided preflight answer', () => {
    const result = applyLocalServiceCors({
      url: 'http://localhost:1234/v1/audio/transcriptions',
      method: 'OPTIONS',
      statusCode: 200,
      responseHeaders: { 'Access-Control-Allow-Headers': ['Authorization, Content-Type, X-Custom'] },
    })
    expect(result?.statusLine).toBeUndefined()
    expect(result?.responseHeaders['Access-Control-Allow-Headers']).toEqual(['Authorization, Content-Type, X-Custom'])
  })
})
