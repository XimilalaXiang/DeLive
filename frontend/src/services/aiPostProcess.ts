import type {
  AiPostProcessConfig,
  AppSettings,
  TranscriptChapter,
  TranscriptPostProcess,
  TranscriptSession,
} from '../types'

const DEFAULT_AI_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_PROMPT_LANGUAGE: NonNullable<AiPostProcessConfig['promptLanguage']> = 'zh'
const MAX_TRANSCRIPT_CHARS = 24_000

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

interface AiBriefingPayload {
  summary?: unknown
  actionItems?: unknown
  keywords?: unknown
  chapters?: unknown
}

export interface SessionBriefingResult {
  postProcess: TranscriptPostProcess
}

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

function normalizeStringArray(value: unknown, limit = 8): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const normalized = value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
    .slice(0, limit)

  return normalized.length > 0 ? normalized : undefined
}

function normalizeChapter(value: unknown): TranscriptChapter | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  if (!title) {
    return null
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() : undefined

  return {
    title,
    summary: summary || undefined,
  }
}

function normalizeBriefingPayload(payload: AiBriefingPayload, model: string): TranscriptPostProcess {
  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : undefined
  const actionItems = normalizeStringArray(payload.actionItems)
  const keywords = normalizeStringArray(payload.keywords, 12)
  const chapters = Array.isArray(payload.chapters)
    ? payload.chapters
      .map(normalizeChapter)
      .filter((chapter): chapter is TranscriptChapter => chapter !== null)
      .slice(0, 8)
    : undefined

  if (!summary && !actionItems?.length && !keywords?.length && !chapters?.length) {
    throw new Error('AI 未返回可用的结构化结果')
  }

  return {
    summary,
    actionItems,
    keywords,
    chapters: chapters && chapters.length > 0 ? chapters : undefined,
    generatedAt: Date.now(),
    model,
    status: 'success',
    error: undefined,
  }
}

function extractTextContent(content: ChatCompletionResponse['choices']): string {
  const messageContent = content?.[0]?.message?.content
  if (typeof messageContent === 'string') {
    return messageContent.trim()
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => part?.type === 'text' && typeof part.text === 'string' ? part.text : '')
      .join('\n')
      .trim()
  }

  return ''
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('AI 未返回内容')
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  throw new Error('AI 返回内容不是有效 JSON')
}

function buildSystemPrompt(language: NonNullable<AiPostProcessConfig['promptLanguage']>): string {
  if (language === 'en') {
    return [
      'You are an assistant that converts a transcript into structured meeting notes.',
      'Return only a JSON object with keys: summary, actionItems, keywords, chapters.',
      'summary must be a concise paragraph.',
      'actionItems must be an array of actionable bullet-style strings.',
      'keywords must be an array of short keywords.',
      'chapters must be an array of objects with title and summary.',
      'Do not invent facts that are not supported by the transcript.',
    ].join(' ')
  }

  return [
    '你是一个把转录内容整理成结构化摘要的助手。',
    '你只能返回 JSON 对象，且只允许包含 summary、actionItems、keywords、chapters 四个字段。',
    'summary 是简洁摘要。',
    'actionItems 是行动项字符串数组。',
    'keywords 是关键词字符串数组。',
    'chapters 是由 title 和 summary 组成的数组。',
    '不要编造转录中不存在的事实。',
  ].join('')
}

function buildUserPrompt(
  session: TranscriptSession,
  language: NonNullable<AiPostProcessConfig['promptLanguage']>,
): string {
  const transcript = session.transcript.trim()
  const clippedTranscript = transcript.length > MAX_TRANSCRIPT_CHARS
    ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[truncated]`
    : transcript
  const translatedTranscript = session.translatedTranscript?.text?.trim()
  const transcriptBlock = translatedTranscript
    ? `${clippedTranscript}\n\n=== translated ===\n${translatedTranscript}`
    : clippedTranscript

  if (language === 'en') {
    return [
      `Session title: ${session.title}`,
      'Generate a structured briefing for this transcript.',
      'Keep output concise and useful for review.',
      'Transcript:',
      transcriptBlock,
    ].join('\n\n')
  }

  return [
    `会话标题：${session.title}`,
    '请为下面的转录生成结构化 briefing，结果适合会后回顾。',
    '输出要简洁、准确、可操作。',
    '转录内容：',
    transcriptBlock,
  ].join('\n\n')
}

export function isAiPostProcessConfigured(settings: AppSettings): boolean {
  const config = getAiConfig(settings)
  return Boolean(
    config.enabled
    && config.baseUrl?.trim()
    && config.model?.trim(),
  )
}

export function parseAiBriefingResponse(raw: string, model: string): TranscriptPostProcess {
  const jsonText = extractJsonObject(raw)

  let parsed: AiBriefingPayload
  try {
    parsed = JSON.parse(jsonText) as AiBriefingPayload
  } catch {
    throw new Error('AI 返回内容无法解析为 JSON')
  }

  return normalizeBriefingPayload(parsed, model)
}

export async function generateSessionBriefing(
  session: TranscriptSession,
  settings: AppSettings,
): Promise<SessionBriefingResult> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = config.model?.trim()
  const promptLanguage = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE

  if (!config.enabled) {
    throw new Error('请先在设置中启用 AI 后处理')
  }

  if (!model) {
    throw new Error('请先配置 AI 模型')
  }

  if (!session.transcript.trim()) {
    throw new Error('当前会话没有可用于 AI 分析的转录内容')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey?.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt(promptLanguage) },
        { role: 'user', content: buildUserPrompt(session, promptLanguage) },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `AI 请求失败: HTTP ${response.status}`)
  }

  const payload = await response.json() as ChatCompletionResponse
  const content = extractTextContent(payload.choices)
  const postProcess = parseAiBriefingResponse(content, model)

  return { postProcess }
}
