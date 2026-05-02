import {
  SILICONFLOW_DEFAULT_BASE_URL,
  SILICONFLOW_DEFAULT_MODEL,
  isSiliconFlowChatCompletionModel,
  type SiliconFlowChatCompletionResponse,
} from '../types/asr/vendors/siliconflow'

export interface SiliconFlowFileTranscriptionResponse {
  text: string
}

export interface SiliconFlowFileTranscribeParams {
  model?: string
  language?: string
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize)
    let binary = ''
    for (const byte of slice) {
      binary += String.fromCharCode(byte)
    }
    chunks.push(binary)
  }
  return btoa(chunks.join(''))
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  return `data:${file.type || 'audio/mpeg'};base64,${base64}`
}

async function transcribeViaAudioEndpoint(
  apiKey: string,
  file: File,
  params: SiliconFlowFileTranscribeParams,
  signal?: AbortSignal,
): Promise<SiliconFlowFileTranscriptionResponse> {
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('model', params.model || SILICONFLOW_DEFAULT_MODEL)

  if (params.language) {
    formData.append('language', params.language)
  }

  const res = await fetch(`${SILICONFLOW_DEFAULT_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errorMsg = `SiliconFlow API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.error?.message || body.message || body.detail || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  const result = await res.json()
  return { text: typeof result.text === 'string' ? result.text.trim() : '' }
}

async function transcribeViaChatCompletion(
  apiKey: string,
  file: File,
  params: SiliconFlowFileTranscribeParams,
  signal?: AbortSignal,
): Promise<SiliconFlowFileTranscriptionResponse> {
  const audioUrl = await fileToDataUrl(file)
  const langHint = params.language
    ? `音频语言提示：${params.language}。`
    : '请自动识别音频语言。'

  const res = await fetch(`${SILICONFLOW_DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: '你是专业的语音转写助手。你只能返回转写文本本身。',
        },
        {
          role: 'user',
          content: [
            { type: 'audio_url', audio_url: { url: audioUrl } },
            {
              type: 'text',
              text: `${langHint}请逐字转写音频内容，只输出转写文本，不要添加解释、摘要、标题、说话人标签或其他额外说明。如果没有识别到有效语音，则返回空字符串。`,
            },
          ],
        },
      ],
    }),
    signal,
  })

  if (!res.ok) {
    let errorMsg = `SiliconFlow API error ${res.status}`
    try {
      const body = await res.json()
      errorMsg = body.error?.message || body.message || body.detail || errorMsg
    } catch { /* ignore */ }
    throw new Error(errorMsg)
  }

  const result = (await res.json()) as SiliconFlowChatCompletionResponse
  const content = result.choices?.[0]?.message?.content
  let text = ''
  if (typeof content === 'string') {
    text = content.trim()
  } else if (Array.isArray(content)) {
    text = content
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text?.trim() || '')
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return { text }
}

export async function transcribeFile(
  apiKey: string,
  file: File,
  params: SiliconFlowFileTranscribeParams = {},
  signal?: AbortSignal,
): Promise<SiliconFlowFileTranscriptionResponse> {
  const model = params.model || SILICONFLOW_DEFAULT_MODEL
  if (isSiliconFlowChatCompletionModel(model)) {
    return transcribeViaChatCompletion(apiKey, file, { ...params, model }, signal)
  }
  return transcribeViaAudioEndpoint(apiKey, file, { ...params, model }, signal)
}
