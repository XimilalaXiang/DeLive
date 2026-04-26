import { HttpsProxyAgent } from 'https-proxy-agent'

let resolvedProxy: HttpsProxyAgent<string> | undefined
let lastEnvSnapshot = ''

function getEnvSnapshot(): string {
  return [
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
  ].join('|')
}

function detectProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    undefined
  )
}

export function getWsProxyAgent(): HttpsProxyAgent<string> | undefined {
  const snapshot = getEnvSnapshot()
  if (snapshot !== lastEnvSnapshot) {
    lastEnvSnapshot = snapshot
    const url = detectProxyUrl()
    if (url) {
      resolvedProxy = new HttpsProxyAgent(url)
      console.log(`[Proxy] 检测到代理: ${url}`)
    } else {
      resolvedProxy = undefined
    }
  }
  return resolvedProxy
}
