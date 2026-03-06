import {
  type SiliconFlowChatCompletionResponse,
  type SiliconFlowTranscriptionResponse,
  SILICONFLOW_DEFAULT_BASE_URL,
  isSiliconFlowChatCompletionModel,
} from '../types/asr/vendors/siliconflow'

interface SiliconFlowAudioRequest {
  apiKey: string
  model: string
  wavBlob: Blob
  language?: string
}

function buildTranscriptionPrompt(language?: string): string {
  const languageInstruction = language
    ? `音频语言提示：${language}。`
    : '请自动识别音频语言。'

  return `${languageInstruction}请逐字转写音频内容，只输出转写文本，不要添加解释、摘要、标题、说话人标签或其他额外说明。如果没有识别到有效语音，则返回空字符串。`
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

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  return `data:${blob.type || 'audio/wav'};base64,${base64}`
}

function extractChatCompletionText(result: SiliconFlowChatCompletionResponse): string {
  const content = result.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text?.trim() || '')
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  return ''
}

async function transcribeViaAudioEndpoint({
  apiKey,
  model,
  wavBlob,
  language,
}: SiliconFlowAudioRequest): Promise<string> {
  const formData = new FormData()
  formData.append('file', wavBlob, 'audio.wav')
  formData.append('model', model)

  if (language) {
    formData.append('language', language)
  }

  const response = await fetch(`${SILICONFLOW_DEFAULT_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `硅基流动服务返回错误: ${response.status}`)
  }

  const result = await response.json() as SiliconFlowTranscriptionResponse
  return typeof result.text === 'string' ? result.text.trim() : ''
}

async function transcribeViaChatCompletion({
  apiKey,
  model,
  wavBlob,
  language,
}: SiliconFlowAudioRequest): Promise<string> {
  const audioUrl = await blobToDataUrl(wavBlob)
  const response = await fetch(`${SILICONFLOW_DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: '你是专业的语音转写助手。你只能返回转写文本本身。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'audio_url',
              audio_url: {
                url: audioUrl,
              },
            },
            {
              type: 'text',
              text: buildTranscriptionPrompt(language),
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `硅基流动服务返回错误: ${response.status}`)
  }

  const result = await response.json() as SiliconFlowChatCompletionResponse
  return extractChatCompletionText(result)
}

export async function transcribeSiliconFlowAudio(request: SiliconFlowAudioRequest): Promise<string> {
  if (isSiliconFlowChatCompletionModel(request.model)) {
    // Qwen Omni 音频输入走多模态 chat/completions，不支持 audio/transcriptions。
    return transcribeViaChatCompletion(request)
  }

  return transcribeViaAudioEndpoint(request)
}
