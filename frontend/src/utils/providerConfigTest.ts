import type { ProviderConfigData } from '../types'
import type { ASRProviderInfo, ASRVendor } from '../types/asr'
import { createBundledRuntimeManager } from './localRuntimeManager'

type ProviderConfigTester = (config: ProviderConfigData) => Promise<void>

function createSilentWavBlob(durationMs = 500, sampleRate = 16000): Blob {
  const sampleCount = Math.max(1, Math.floor(sampleRate * durationMs / 1000))
  const pcmSize = sampleCount * 2
  const buffer = new ArrayBuffer(44 + pcmSize)
  const view = new DataView(buffer)

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + pcmSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, pcmSize, true)

  return new Blob([buffer], { type: 'audio/wav' })
}

const providerConfigTesters: Partial<Record<ASRVendor, ProviderConfigTester>> = {
  soniox: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
    if (!apiKey) {
      throw new Error('请输入 API Key')
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('连接超时，请检查网络'))
      }, 10000)

      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: typeof config.model === 'string' && config.model.trim() ? config.model.trim() : 'stt-rt-v4',
          audio_format: 'auto',
          language_hints: Array.isArray(config.languageHints) && config.languageHints.length > 0
            ? config.languageHints
            : ['zh', 'en'],
        }))
      }

      ws.onmessage = (event) => {
        clearTimeout(timeout)
        try {
          const response = JSON.parse(event.data) as {
            error_code?: string
            error_message?: string
          }

          if (response.error_code) {
            ws.close()
            reject(new Error(response.error_message || `错误代码: ${response.error_code}`))
            return
          }

          ws.close()
          resolve()
        } catch {
          ws.close()
          reject(new Error('解析响应失败'))
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('WebSocket 连接失败'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code !== 1000 && event.code !== 1005) {
          reject(new Error(`连接关闭: ${event.reason || '未知原因'}`))
        }
      }
    })
  },
  volc: async (config) => {
    const appKey = typeof config.appKey === 'string' ? config.appKey.trim() : ''
    const accessKey = typeof config.accessKey === 'string' ? config.accessKey.trim() : ''

    if (!appKey) {
      throw new Error('请输入 APP ID')
    }
    if (!accessKey) {
      throw new Error('请输入 Access Token')
    }

    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        appKey,
        accessKey,
        modelV2: 'true',
        bidiStreaming: 'true',
        enableDdc: 'true',
      })
      const proxyUrl = `ws://localhost:3001/ws/volc?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动 (npm run dev:server)'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready' || msg.type === 'final') {
            clearTimeout(timeout)
            ws?.send(JSON.stringify({ type: 'audio_end' }))
            setTimeout(() => {
              ws?.close(1000, 'test complete')
              resolve()
            }, 500)
            return
          }

          if (msg.type === 'error') {
            clearTimeout(timeout)
            ws?.close()
            reject(new Error(msg.message || '火山引擎连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动 (cd server && npm run dev)'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 APP ID 或 Access Token'))
        } else if (event.code === 4002) {
          reject(new Error('火山引擎连接失败，请检查 APP ID 和 Access Token 是否正确'))
        }
      }
    })
  },
  local_openai: async (config) => {
    const rawBaseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : ''
    const model = typeof config.model === 'string' ? config.model.trim() : ''

    if (!rawBaseUrl) {
      throw new Error('请输入 Base URL')
    }
    if (!model) {
      throw new Error('请输入模型名称')
    }

    let url: URL
    try {
      url = new URL(rawBaseUrl.replace(/\/+$/, ''))
    } catch {
      throw new Error('Base URL 格式不正确')
    }

    const headers: HeadersInit = {}
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const response = await fetch(`${url.toString().replace(/\/+$/, '')}/v1/models`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(details || `服务返回错误: ${response.status}`)
    }
  },
  local_whisper_cpp: async (config) => {
    if (!window.electronAPI?.isElectron) {
      throw new Error('当前不在 Electron 环境中，无法测试本地 whisper.cpp runtime')
    }

    const manager = createBundledRuntimeManager('whisper_cpp')
    const before = await manager.getSnapshot(config)
    const shouldStopAfterTest = before.status !== 'running'

    try {
      const snapshot = await manager.start(config)
      if (snapshot.status !== 'running') {
        throw new Error(snapshot.message || '本地 whisper.cpp runtime 未成功启动')
      }

      const formData = new FormData()
      formData.append('file', createSilentWavBlob(), 'test.wav')
      formData.append('response_format', 'json')

      const response = await fetch(`${snapshot.baseUrl.replace(/\/+$/, '')}/inference`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        throw new Error(details || `whisper.cpp /inference 返回错误: HTTP ${response.status}`)
      }
    } finally {
      if (shouldStopAfterTest) {
        await manager.stop(config).catch(() => undefined)
      }
    }
  },
}

export async function testProviderConfig(
  provider: ASRProviderInfo | undefined,
  config: ProviderConfigData
): Promise<void> {
  if (!provider?.capabilities.supportsConfigTest) {
    return
  }

  const tester = providerConfigTesters[provider.id]
  if (!tester) {
    throw new Error('该提供商暂未实现配置测试')
  }

  await tester(config)
}
