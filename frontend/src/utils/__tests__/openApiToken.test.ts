import { describe, expect, it } from 'vitest'
import { generateOpenApiToken, withOpenApiToken } from '../openApiToken'

describe('generateOpenApiToken', () => {
  it('returns dlv_ plus 32 alphanumeric characters', () => {
    const token = generateOpenApiToken()
    expect(token).toMatch(/^dlv_[A-Za-z0-9]{32}$/)
  })

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateOpenApiToken))
    expect(tokens.size).toBe(200)
  })
})

describe('withOpenApiToken', () => {
  it('adds a token to an enabled config without one', () => {
    expect(withOpenApiToken({ enabled: true, token: '' }).token).toMatch(/^dlv_/)
    expect(withOpenApiToken<{ enabled: boolean; token?: string }>({ enabled: true }).token).toMatch(/^dlv_/)
    expect(withOpenApiToken({ enabled: true, token: '   ' }).token).toMatch(/^dlv_/)
  })

  it('keeps existing tokens and disabled configs unchanged', () => {
    const withToken = { enabled: true, token: 'dlv_mine' }
    const disabled = { enabled: false, token: '' }
    expect(withOpenApiToken(withToken)).toBe(withToken)
    expect(withOpenApiToken(disabled)).toBe(disabled)
  })
})
