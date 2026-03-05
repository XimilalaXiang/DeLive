export type LocalServiceKind = 'ollama' | 'openai'

export interface LocalServiceProbeResult {
  kind: LocalServiceKind
  installedModels: string[]
}

export interface OllamaPullProgress {
  status: string
  completed?: number
  total?: number
}

function uniqueSortedModels(models: string[]): string[] {
  return Array.from(new Set(models.map(item => item.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function buildHeaders(apiKey?: string): HeadersInit {
  if (!apiKey?.trim()) {
    return {}
  }
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
  }
}

export function normalizeLocalServiceBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function isModelInstalled(installedModels: string[], targetModel: string): boolean {
  const target = targetModel.trim().toLowerCase()
  if (!target) return false

  return installedModels.some((modelName) => {
    const candidate = modelName.toLowerCase()
    return candidate === target || candidate.startsWith(`${target}:`)
  })
}

export async function probeLocalService(baseUrl: string, apiKey?: string): Promise<LocalServiceProbeResult> {
  const normalizedBaseUrl = normalizeLocalServiceBaseUrl(baseUrl)
  if (!normalizedBaseUrl) {
    throw new Error('请输入 Base URL')
  }

  try {
    new URL(normalizedBaseUrl)
  } catch {
    throw new Error('Base URL 格式不正确')
  }

  const headers = buildHeaders(apiKey)

  // 优先探测 Ollama
  try {
    const ollamaResp = await fetch(`${normalizedBaseUrl}/api/tags`, {
      method: 'GET',
      headers,
    })
    if (ollamaResp.ok) {
      const payload = await ollamaResp.json() as {
        models?: Array<{ name?: string; model?: string }>
      }
      const installedModels = uniqueSortedModels(
        (payload.models || []).map(item => item.name || item.model || '')
      )
      return {
        kind: 'ollama',
        installedModels,
      }
    }
  } catch {
    // ignore and fallback
  }

  // 再探测 OpenAI-compatible
  const openAIResp = await fetch(`${normalizedBaseUrl}/v1/models`, {
    method: 'GET',
    headers,
  })
  if (!openAIResp.ok) {
    const details = await openAIResp.text().catch(() => '')
    throw new Error(details || `服务返回错误: ${openAIResp.status}`)
  }

  const modelsPayload = await openAIResp.json() as {
    data?: Array<{ id?: string }>
  }
  const installedModels = uniqueSortedModels(
    (modelsPayload.data || []).map(item => item.id || '')
  )
  return {
    kind: 'openai',
    installedModels,
  }
}

export async function pullOllamaModel(
  baseUrl: string,
  model: string,
  onProgress?: (progress: OllamaPullProgress) => void
): Promise<void> {
  const normalizedBaseUrl = normalizeLocalServiceBaseUrl(baseUrl)
  const targetModel = model.trim()

  if (!normalizedBaseUrl) {
    throw new Error('请输入 Base URL')
  }
  if (!targetModel) {
    throw new Error('请输入模型名称')
  }

  const response = await fetch(`${normalizedBaseUrl}/api/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: targetModel,
      stream: true,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `拉取失败: ${response.status}`)
  }

  // 某些实现可能返回一次性 JSON
  if (!response.body) {
    const payload = await response.json().catch(() => ({})) as {
      error?: string
      status?: string
    }
    if (payload.error) {
      throw new Error(payload.error)
    }
    if (payload.status) {
      onProgress?.({ status: payload.status })
    }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      let payload: {
        status?: string
        error?: string
        completed?: number
        total?: number
      }
      try {
        payload = JSON.parse(trimmed) as {
          status?: string
          error?: string
          completed?: number
          total?: number
        }
      } catch {
        continue
      }

      if (payload.error) {
        throw new Error(payload.error)
      }

      onProgress?.({
        status: payload.status || 'pulling',
        completed: payload.completed,
        total: payload.total,
      })
    }
  }
}
