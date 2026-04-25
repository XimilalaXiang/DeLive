import type {
  AiPostProcessConfig,
  AppSettings,
  CorrectionIssue,
  TranscriptSession,
} from '../types'
import { resolveModelForFeature } from './aiPostProcess'

const DEFAULT_AI_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_PROMPT_LANGUAGE: NonNullable<AiPostProcessConfig['promptLanguage']> = 'zh'

function getAiConfig(settings: AppSettings): AiPostProcessConfig {
  return {
    enabled: false,
    provider: 'openai-compatible',
    baseUrl: DEFAULT_AI_BASE_URL,
    model: '',
    apiKey: '',
    promptLanguage: DEFAULT_PROMPT_LANGUAGE,
    ...(settings.aiPostProcess || {}),
  }
}

function buildTranscriptBlock(session: TranscriptSession): string {
  return session.transcript.trim()
}

// --------------- Prompt builders ---------------

function buildDetectSystemPrompt(lang: 'zh' | 'en'): string {
  if (lang === 'en') {
    return [
      'You are a speech-recognition error detector.',
      'The user will provide a transcript produced by an ASR (automatic speech recognition) system.',
      'Identify ONLY clear transcription errors: homophones, near-homophones, misspelled proper nouns, and obvious punctuation mistakes.',
      'Do NOT report stylistic issues, grammar preferences, or rephrasing suggestions.',
      'Return a JSON array of objects, each with keys: id, originalText, suggestedText, reason, category.',
      'id must be a sequential string like "1", "2", "3".',
      'category must be one of: homophone, proper-noun, grammar, punctuation, other.',
      'If there are no errors, return an empty array: [].',
      'Return ONLY the JSON array, nothing else.',
    ].join(' ')
  }
  return [
    '你是一个语音识别错误检测器。',
    '用户会提供一段由 ASR（自动语音识别）系统生成的转录文本。',
    '你只需要找出明确的转录错误：同音字/近音字替换、专有名词拼写错误、明显的标点错误。',
    '不要报告风格问题、语法偏好或改写建议。',
    '返回一个 JSON 数组，每个元素包含：id, originalText, suggestedText, reason, category。',
    'id 必须是从 "1" 开始的顺序字符串。',
    'category 必须是以下之一：homophone, proper-noun, grammar, punctuation, other。',
    '如果没有错误，返回空数组：[]。',
    '只返回 JSON 数组，不要有其他内容。',
  ].join('')
}

function buildDetectUserPrompt(session: TranscriptSession, lang: 'zh' | 'en'): string {
  const text = buildTranscriptBlock(session)
  if (lang === 'en') {
    return `Session title: ${session.title}\n\nTranscript:\n${text}`
  }
  return `会话标题：${session.title}\n\n转录内容：\n${text}`
}

function buildQuickCorrectionSystemPrompt(lang: 'zh' | 'en'): string {
  if (lang === 'en') {
    return [
      'You are a transcript proofreader.',
      'The user will provide a transcript from an ASR system.',
      'Fix ONLY clear speech-recognition errors: homophones, near-homophones, misspelled proper nouns, and obvious punctuation mistakes.',
      'Do NOT change sentence structure, word order, style, tone, or meaning.',
      'If you are unsure whether something is an error, keep the original text.',
      'Preserve ALL original paragraph breaks and formatting.',
      'Output the full corrected transcript as plain text. No explanations, no JSON, no markdown.',
    ].join(' ')
  }
  return [
    '你是一个转录文本校对员。',
    '用户会提供一段由 ASR 系统生成的转录文本。',
    '你只需要修正明确的语音识别错误：同音字/近音字替换、专有名词拼写错误、明显的标点错误。',
    '不要修改句子结构、语序、风格、语气或含义。',
    '如果不确定某处是否为错误，保留原文。',
    '保留所有原始段落和格式。',
    '直接输出修正后的完整转录文本（纯文本），不要有解释、JSON 或 markdown。',
  ].join('')
}

function buildQuickCorrectionUserPrompt(session: TranscriptSession, lang: 'zh' | 'en'): string {
  const text = buildTranscriptBlock(session)
  if (lang === 'en') {
    return `Session title: ${session.title}\n\nPlease proofread and correct this transcript:\n${text}`
  }
  return `会话标题：${session.title}\n\n请校对并纠正以下转录内容：\n${text}`
}

function buildReviewCorrectionSystemPrompt(lang: 'zh' | 'en'): string {
  if (lang === 'en') {
    return [
      'You are a transcript proofreader.',
      'The user will provide a transcript and a list of confirmed corrections.',
      'Apply ONLY the corrections listed — do not make any additional changes.',
      'Output the full corrected transcript as plain text. No explanations, no JSON, no markdown.',
      'Preserve ALL original paragraph breaks and formatting.',
    ].join(' ')
  }
  return [
    '你是一个转录文本校对员。',
    '用户会提供一段转录文本和一份已确认的修改清单。',
    '你只需要应用清单中列出的修改，不要做任何额外修改。',
    '直接输出修正后的完整转录文本（纯文本），不要有解释、JSON 或 markdown。',
    '保留所有原始段落和格式。',
  ].join('')
}

function buildReviewCorrectionUserPrompt(
  session: TranscriptSession,
  issues: CorrectionIssue[],
  lang: 'zh' | 'en',
): string {
  const text = buildTranscriptBlock(session)
  const issuesList = issues
    .map((i) => `- "${i.originalText}" → "${i.suggestedText}"`)
    .join('\n')

  if (lang === 'en') {
    return [
      `Session title: ${session.title}`,
      `Confirmed corrections:\n${issuesList}`,
      `Transcript:\n${text}`,
    ].join('\n\n')
  }
  return [
    `会话标题：${session.title}`,
    `已确认的修改：\n${issuesList}`,
    `转录内容：\n${text}`,
  ].join('\n\n')
}

// --------------- SSE streaming ---------------

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

async function streamChatCompletion(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.1,
      stream: true,
      messages,
    }),
    signal,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(errorText || `AI 请求失败: HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Response body is not readable')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            fullText += content
            callbacks.onChunk(content)
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }

    callbacks.onDone(fullText)
  } catch (err) {
    if (signal?.aborted) return
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    reader.releaseLock()
  }
}

// --------------- Non-streaming JSON call ---------------

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

function extractTextContent(choices: ChatCompletionResponse['choices']): string {
  const content = choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('\n')
      .trim()
  }
  return ''
}

function extractJsonArray(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('AI 未返回内容')

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)

  throw new Error('AI 返回内容不是有效 JSON 数组')
}

// --------------- Public API ---------------

export interface DetectResult {
  issues: CorrectionIssue[]
  model: string
}

export async function detectCorrectionIssues(
  session: TranscriptSession,
  settings: AppSettings,
): Promise<DetectResult> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'correction')
  const lang = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE

  if (!config.enabled) throw new Error('请先在设置中启用 AI 后处理')
  if (!model) throw new Error('请先配置 AI 纠错模型')
  if (!session.transcript.trim()) throw new Error('当前会话没有可用于纠错的转录内容')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey?.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: buildDetectSystemPrompt(lang) },
        { role: 'user', content: buildDetectUserPrompt(session, lang) },
      ],
    }),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(errorText || `AI 请求失败: HTTP ${res.status}`)
  }

  const payload = (await res.json()) as ChatCompletionResponse
  const raw = extractTextContent(payload.choices)
  const jsonText = extractJsonArray(raw)

  let parsed: Array<{
    id?: string
    originalText?: string
    suggestedText?: string
    reason?: string
    category?: string
    segmentIndex?: number
  }>
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('AI 返回内容无法解析为 JSON')
  }

  if (!Array.isArray(parsed)) throw new Error('AI 返回的不是数组')

  const validCategories = new Set(['homophone', 'proper-noun', 'grammar', 'punctuation', 'other'])
  const issues: CorrectionIssue[] = parsed
    .filter((item) => item.originalText?.trim() && item.suggestedText?.trim())
    .map((item, idx) => ({
      id: item.id || String(idx + 1),
      originalText: item.originalText!.trim(),
      suggestedText: item.suggestedText!.trim(),
      reason: (item.reason || '').trim(),
      category: validCategories.has(item.category || '') ? item.category as CorrectionIssue['category'] : 'other',
      segmentIndex: item.segmentIndex,
      accepted: undefined,
    }))

  return { issues, model }
}

export interface QuickCorrectionCallbacks extends StreamCallbacks {
  signal?: AbortSignal
}

export async function correctTranscriptQuick(
  session: TranscriptSession,
  settings: AppSettings,
  callbacks: QuickCorrectionCallbacks,
): Promise<void> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'correction')
  const lang = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE

  if (!config.enabled) throw new Error('请先在设置中启用 AI 后处理')
  if (!model) throw new Error('请先配置 AI 纠错模型')
  if (!session.transcript.trim()) throw new Error('当前会话没有可用于纠错的转录内容')

  await streamChatCompletion(
    baseUrl,
    config.apiKey,
    model,
    [
      { role: 'system', content: buildQuickCorrectionSystemPrompt(lang) },
      { role: 'user', content: buildQuickCorrectionUserPrompt(session, lang) },
    ],
    callbacks,
    callbacks.signal,
  )
}

export async function correctTranscriptWithReview(
  session: TranscriptSession,
  acceptedIssues: CorrectionIssue[],
  settings: AppSettings,
  callbacks: QuickCorrectionCallbacks,
): Promise<void> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'correction')
  const lang = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE

  if (!config.enabled) throw new Error('请先在设置中启用 AI 后处理')
  if (!model) throw new Error('请先配置 AI 纠错模型')
  if (acceptedIssues.length === 0) throw new Error('没有已确认的修改项')

  await streamChatCompletion(
    baseUrl,
    config.apiKey,
    model,
    [
      { role: 'system', content: buildReviewCorrectionSystemPrompt(lang) },
      { role: 'user', content: buildReviewCorrectionUserPrompt(session, acceptedIssues, lang) },
    ],
    callbacks,
    callbacks.signal,
  )
}
