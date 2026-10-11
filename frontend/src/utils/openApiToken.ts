import type { OpenApiConfig } from '../types'

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Random `dlv_` + 32 alphanumeric characters, from the platform CSPRNG. */
export function generateOpenApiToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let result = 'dlv_'
  for (const byte of bytes) {
    // 248 is the largest multiple of 62 below 256; rejecting above it keeps
    // every character equally likely.
    let value = byte
    while (value >= 248) {
      const retry = new Uint8Array(1)
      crypto.getRandomValues(retry)
      value = retry[0]
    }
    result += TOKEN_CHARS[value % TOKEN_CHARS.length]
  }
  return result
}

/**
 * The Open API refuses requests while its token is empty, so give an enabled
 * config without one a fresh token. Returns the config unchanged otherwise.
 */
export function withOpenApiToken<T extends Partial<OpenApiConfig>>(config: T): T {
  if (config.enabled && !config.token?.trim()) {
    return { ...config, token: generateOpenApiToken() }
  }
  return config
}
