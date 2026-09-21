import type { ProviderConfigData } from '../types'
import type { ASRProviderInfo, ASRVendor } from '../types/asr'
import { createBundledRuntimeManager } from './localRuntimeManager'
import { getProxyWsUrl } from './proxyUrl'
import { GROQ_DEFAULT_BASE_URL, GROQ_DEFAULT_MODEL } from '../types/asr/vendors/groq'
import { SILICONFLOW_DEFAULT_MODEL } from '../types/asr/vendors/siliconflow'
import { MISTRAL_REALTIME_MODEL } from '../types/asr/vendors/mistral'
import { DEEPGRAM_DEFAULT_MODEL } from '../types/asr/vendors/deepgram'
import { ASSEMBLYAI_DEFAULT_MODEL } from '../types/asr/vendors/assemblyai'
import { resolveElevenLabsRealtimeModel } from '../types/asr/vendors/elevenlabs'
import { GLADIA_DEFAULT_MODEL } from '../types/asr/vendors/gladia'
import { CLOUDFLARE_DEFAULT_MODEL } from '../types/asr/vendors/cloudflare'
import { SENSEVOICE_DEFAULT_BASE_URL, SENSEVOICE_DEFAULT_MODEL } from '../types/asr/vendors/sensevoice'
import { transcribeSiliconFlowAudio } from './siliconflow'
import { throwUserError, userErrorMessage } from './userErrors'

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
      throwUserError('enterApiKey')
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
          model: typeof config.model === 'string' && config.model.trim() ? config.model.trim() : 'stt-rt-v5',
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
      throwUserError('enterAppId')
    }
    if (!accessKey) {
      throwUserError('enterAccessToken')
    }

    const volcBaseUrl = await getProxyWsUrl('/ws/volc')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        appKey,
        accessKey,
        modelV2: 'true',
        bidiStreaming: 'true',
        enableDdc: 'true',
      })
      const proxyUrl = `${volcBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null
      let lastProxyErrorMessage = ''

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
            lastProxyErrorMessage = msg.message || ''
            ws?.close()
            reject(new Error(lastProxyErrorMessage || '火山引擎连接失败'))
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
          reject(new Error(lastProxyErrorMessage || '火山引擎连接失败，请检查网络、DNS、代理设置以及 APP ID / Access Token'))
        }
      }
    })
  },
  mistral: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterMistralApiKey')
    }

    const mistralBaseUrl = await getProxyWsUrl('/ws/mistral')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        model: MISTRAL_REALTIME_MODEL,
        language: '',
      })
      const proxyUrl = `${mistralBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
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
            reject(new Error(msg.message || 'Mistral 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('Mistral API 连接失败，请检查 API Key 是否正确'))
        }
      }
    })
  },
  deepgram: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterDeepgramApiKey')
    }

    const deepgramBaseUrl = await getProxyWsUrl('/ws/deepgram')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        model: DEEPGRAM_DEFAULT_MODEL,
        language: '',
      })
      const proxyUrl = `${deepgramBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
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
            reject(new Error(msg.message || 'Deepgram 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('Deepgram API 连接失败，请检查 API Key 是否正确'))
        }
      }
    })
  },
  assemblyai: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterAssemblyAiApiKey')
    }

    const assemblyaiBaseUrl = await getProxyWsUrl('/ws/assemblyai')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        model: ASSEMBLYAI_DEFAULT_MODEL,
      })
      const proxyUrl = `${assemblyaiBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
            clearTimeout(timeout)
            ws?.send(JSON.stringify({ type: 'terminate' }))
            setTimeout(() => {
              ws?.close(1000, 'test complete')
              resolve()
            }, 500)
            return
          }

          if (msg.type === 'error') {
            clearTimeout(timeout)
            ws?.close()
            reject(new Error(msg.message || 'AssemblyAI 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('AssemblyAI API 连接失败，请检查 API Key 是否正确'))
        }
      }
    })
  },
  elevenlabs: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterElevenLabsApiKey')
    }

    const elevenlabsBaseUrl = await getProxyWsUrl('/ws/elevenlabs')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        model: resolveElevenLabsRealtimeModel(config.model),
        language: '',
      })
      const proxyUrl = `${elevenlabsBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
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
            reject(new Error(msg.message || 'ElevenLabs 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('ElevenLabs API 连接失败，请检查 API Key 是否正确'))
        }
      }
    })
  },
  gladia: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterGladiaApiKey')
    }

    const gladiaBaseUrl = await getProxyWsUrl('/ws/gladia')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        model: GLADIA_DEFAULT_MODEL,
        language: '',
      })
      const proxyUrl = `${gladiaBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
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
            reject(new Error(msg.message || 'Gladia 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('Gladia API 连接失败，请检查 API Key 是否正确'))
        } else if (event.code === 4003) {
          reject(new Error('Gladia Session 初始化失败，请检查 API Key'))
        }
      }
    })
  },
  cloudflare: async (config) => {
    const apiToken = typeof config.apiToken === 'string' ? config.apiToken.trim() : ''
    const accountId = typeof config.accountId === 'string' ? config.accountId.trim() : ''
    const model = typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : CLOUDFLARE_DEFAULT_MODEL

    if (!apiToken) {
      throwUserError('enterCloudflareApiToken')
    }
    if (!accountId) {
      throwUserError('enterCloudflareAccountId')
    }

    const wavBlob = createSilentWavBlob()
    const arrayBuffer = await wavBlob.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
    )

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio: base64 }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      if (response.status === 401 || response.status === 403) {
        throwUserError('cloudflareTokenInvalid')
      }
      if (response.status === 404) {
        throwUserError('cloudflareAccountInvalid')
      }
      throw new Error(details || userErrorMessage('cloudflareApiError', undefined, response.status))
    }

    const result = await response.json() as { success?: boolean; errors?: unknown[] }
    if (!result.success) {
      throwUserError('cloudflareApiFailedStatus')
    }
  },
  local_openai: async (config) => {
    const rawBaseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : ''
    const model = typeof config.model === 'string' ? config.model.trim() : ''

    if (!rawBaseUrl) {
      throwUserError('enterBaseUrl')
    }
    if (!model) {
      throwUserError('enterModelName')
    }

    let url: URL
    try {
      url = new URL(rawBaseUrl.replace(/\/+$/, ''))
    } catch {
      throwUserError('invalidBaseUrl')
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
      throw new Error(details || userErrorMessage('serviceReturnedError', undefined, response.status))
    }
  },
  groq: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
    const model = typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : GROQ_DEFAULT_MODEL

    if (!apiKey) {
      throwUserError('enterGroqApiKey')
    }

    const formData = new FormData()
    formData.append('file', createSilentWavBlob(), 'test.wav')
    formData.append('model', model)

    const response = await fetch(`${GROQ_DEFAULT_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(details || userErrorMessage('groqServiceError', undefined, response.status))
    }
  },
  siliconflow: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
    const model = typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : SILICONFLOW_DEFAULT_MODEL

    if (!apiKey) {
      throwUserError('enterSiliconflowApiKey')
    }

    const language = Array.isArray(config.languageHints)
      ? config.languageHints.find((item) => typeof item === 'string' && item.trim().length > 0)?.trim()
      : undefined

    await transcribeSiliconFlowAudio({
      apiKey,
      model,
      wavBlob: createSilentWavBlob(),
      language,
    })
  },
  sixtydb: async (config) => {
    const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''

    if (!apiKey) {
      throwUserError('enterSixtydbApiKey')
    }

    const sixtydbBaseUrl = await getProxyWsUrl('/ws/sixtydb')
    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        apiKey,
        language: '',
      })
      const proxyUrl = `${sixtydbBaseUrl}?${params.toString()}`
      let ws: WebSocket | null = null

      const timeout = setTimeout(() => {
        ws?.close()
        reject(new Error('连接超时，请检查网络或确保代理服务器已启动'))
      }, 15000)

      try {
        ws = new WebSocket(proxyUrl)
      } catch {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保服务器已启动'))
        return
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string
            message?: string
          }

          if (msg.type === 'ready') {
            clearTimeout(timeout)
            ws?.send(JSON.stringify({ type: 'stop' }))
            setTimeout(() => {
              ws?.close(1000, 'test complete')
              resolve()
            }, 500)
            return
          }

          if (msg.type === 'error') {
            clearTimeout(timeout)
            ws?.close()
            reject(new Error(msg.message || '60db 连接失败'))
          }
        } catch {
          // ignore invalid payload
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('无法连接到代理服务器，请确保后端服务已启动'))
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        if (event.code === 4001) {
          reject(new Error('缺少 API Key'))
        } else if (event.code === 4002) {
          reject(new Error('60db API 连接失败，请检查 API Key 是否正确'))
        }
      }
    })
  },
  sensevoice: async (config) => {
    const rawBaseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : ''
    const baseUrl = (rawBaseUrl || SENSEVOICE_DEFAULT_BASE_URL).replace(/\/+$/, '')

    try {
      new URL(baseUrl)
    } catch {
      throwUserError('invalidServiceUrl')
    }

    const healthRes = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    }).catch((err: Error) => {
      throwUserError('funasrConnectFailed', undefined, baseUrl, err instanceof Error ? err.message : String(err))
    })

    if (!healthRes.ok) {
      throwUserError('funasrHealthCheckFailed', undefined, healthRes.status)
    }

    const model = typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : SENSEVOICE_DEFAULT_MODEL

    const wavBlob = createSilentWavBlob()
    const formData = new FormData()
    formData.append('file', wavBlob, 'test.wav')
    formData.append('model', model)
    formData.append('response_format', 'json')

    const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(details || userErrorMessage('funasrTranscriptionTestFailed', undefined, response.status))
    }
  },
  local_whisper_cpp: async (config) => {
    if (!window.electronAPI?.isElectron) {
      throwUserError('notElectronWhisperTest')
    }

    const manager = createBundledRuntimeManager('whisper_cpp')
    const before = await manager.getSnapshot(config)
    const shouldStopAfterTest = before.status !== 'running'

    try {
      const snapshot = await manager.start(config)
      if (snapshot.status !== 'running') {
        throw new Error(snapshot.message || userErrorMessage('whisperRuntimeStartFailed'))
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
        throw new Error(details || userErrorMessage('whisperInferenceError', undefined, response.status))
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
    throwUserError('providerConfigTestNotImplemented')
  }

  await tester(config)
}
