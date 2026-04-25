import type {
  AiFeatureKey,
  AiPostProcessConfig,
  AppSettings,
  TranscriptChapter,
  TranscriptMindMap,
  TranscriptPostProcess,
  TranscriptQaCitation,
  TranscriptSession,
} from '../types'

const DEFAULT_AI_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_PROMPT_LANGUAGE: NonNullable<AiPostProcessConfig['promptLanguage']> = 'zh'
const MAX_TRANSCRIPT_CHARS = 24_000

interface ModelsApiResponse {
  data?: Array<{ id: string; created?: number; owned_by?: string }>
  object?: string
}

export async function fetchAvailableModels(
  baseUrl: string,
  apiKey?: string,
): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/models`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  const payload = (await res.json()) as ModelsApiResponse
  const models = (payload.data ?? [])
    .map((m) => m.id)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  if (models.length === 0) throw new Error('API 未返回可用模型')
  return models
}

export function resolveModelForFeature(
  config: AiPostProcessConfig,
  feature: AiFeatureKey,
): string {
  const assigned = config.modelAssignment?.[feature]
  if (assigned?.trim()) return assigned.trim()
  if (config.defaultModel?.trim()) return config.defaultModel.trim()
  if (config.model?.trim()) return config.model.trim()
  return ''
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

interface AiBriefingPayload {
  titleSuggestion?: unknown
  tagSuggestions?: unknown
  summary?: unknown
  actionItems?: unknown
  keywords?: unknown
  chapters?: unknown
}

interface SessionQaPayload {
  answer?: unknown
  citations?: unknown
}

interface SessionMindMapPayload {
  title?: unknown
  markdown?: unknown
}

export interface SessionBriefingResult {
  postProcess: TranscriptPostProcess
}

export interface SessionQaResult {
  answer: string
  citations?: TranscriptQaCitation[]
  model: string
}

export interface SessionMindMapResult {
  mindMap: TranscriptMindMap
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
  const unique = normalized.filter((item, index) => normalized.indexOf(item) === index).slice(0, limit)

  return unique.length > 0 ? unique : undefined
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

function normalizeQaCitation(value: unknown): TranscriptQaCitation | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const quote = typeof record.quote === 'string' ? record.quote.trim() : ''
  if (!quote) {
    return null
  }

  const speakerLabel = typeof record.speakerLabel === 'string'
    ? record.speakerLabel.trim()
    : ''

  return {
    quote,
    speakerLabel: speakerLabel || undefined,
  }
}

function normalizeBriefingPayload(payload: AiBriefingPayload, model: string): TranscriptPostProcess {
  const titleSuggestion = typeof payload.titleSuggestion === 'string'
    ? payload.titleSuggestion.trim()
    : undefined
  const tagSuggestions = normalizeStringArray(payload.tagSuggestions, 8)
  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : undefined
  const actionItems = normalizeStringArray(payload.actionItems)
  const keywords = normalizeStringArray(payload.keywords, 12)
  const chapters = Array.isArray(payload.chapters)
    ? payload.chapters
      .map(normalizeChapter)
      .filter((chapter): chapter is TranscriptChapter => chapter !== null)
      .slice(0, 8)
    : undefined

  if (!summary && !actionItems?.length && !keywords?.length && !chapters?.length && !titleSuggestion && !tagSuggestions?.length) {
    throw new Error('AI 未返回可用的结构化结果')
  }

  return {
    titleSuggestion: titleSuggestion || undefined,
    tagSuggestions,
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

function normalizeQaPayload(payload: SessionQaPayload, model: string): SessionQaResult {
  const answer = typeof payload.answer === 'string' ? payload.answer.trim() : ''
  const citations = Array.isArray(payload.citations)
    ? payload.citations
      .map(normalizeQaCitation)
      .filter((citation): citation is TranscriptQaCitation => citation !== null)
      .slice(0, 5)
    : undefined

  if (!answer) {
    throw new Error('AI 未返回有效回答')
  }

  return {
    answer,
    citations: citations && citations.length > 0 ? citations : undefined,
    model,
  }
}

function normalizeMindMapPayload(payload: SessionMindMapPayload, model: string): TranscriptMindMap {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const markdown = typeof payload.markdown === 'string' ? payload.markdown.trim() : ''

  if (!markdown) {
    throw new Error('AI 未返回思维导图 Markdown')
  }

  return {
    markdown,
    title: title || undefined,
    generatedAt: Date.now(),
    updatedAt: Date.now(),
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
      'Return only a JSON object with keys: titleSuggestion, tagSuggestions, summary, actionItems, keywords, chapters.',
      'titleSuggestion must be a short, specific title.',
      'tagSuggestions must be an array of short topic tags.',
      'summary must be a concise paragraph.',
      'actionItems must be an array of actionable bullet-style strings.',
      'keywords must be an array of short keywords.',
      'chapters must be an array of objects with title and summary.',
      'Do not invent facts that are not supported by the transcript.',
    ].join(' ')
  }

  return [
    '你是一个把转录内容整理成结构化摘要的助手。',
    '你只能返回 JSON 对象，且只允许包含 titleSuggestion、tagSuggestions、summary、actionItems、keywords、chapters 六个字段。',
    'titleSuggestion 是简洁明确的标题建议。',
    'tagSuggestions 是简短标签数组。',
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
  const transcriptBlock = buildSessionContextBlock(session)

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

function buildSessionContextBlock(session: TranscriptSession): string {
  const transcript = session.transcript.trim()
  const clippedTranscript = transcript.length > MAX_TRANSCRIPT_CHARS
    ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[truncated]`
    : transcript
  const translatedTranscript = session.translatedTranscript?.text?.trim()
  return translatedTranscript
    ? `${clippedTranscript}\n\n=== translated ===\n${translatedTranscript}`
    : clippedTranscript
}

function buildAskSystemPrompt(language: NonNullable<AiPostProcessConfig['promptLanguage']>): string {
  if (language === 'en') {
    return [
      'You answer questions about a single transcript session.',
      'Return only a JSON object with keys: answer, citations.',
      'answer must be grounded in the transcript only.',
      'citations must be an array of objects with quote and optional speakerLabel.',
      'Use exact short quotes from the transcript whenever possible.',
      'If the answer is not in the transcript, say so explicitly.',
    ].join(' ')
  }

  return [
    '你是一个只回答单个会话转录内容问题的助手。',
    '你只能返回 JSON 对象，且只允许包含 answer 和 citations 两个字段。',
    'answer 必须严格基于转录内容。',
    'citations 必须是由 quote 和可选 speakerLabel 组成的数组。',
    '尽量引用转录中的原句短片段。',
    '如果转录中没有答案，要明确说明无法从当前会话确认。',
  ].join('')
}

function buildAskUserPrompt(
  session: TranscriptSession,
  question: string,
  language: NonNullable<AiPostProcessConfig['promptLanguage']>,
): string {
  const transcriptBlock = buildSessionContextBlock(session)
  const previousTurns = (session.askHistory || [])
    .filter((turn) => turn.status === 'success' && turn.answer?.trim())
    .slice(-4)

  const historyBlock = previousTurns.length > 0
    ? previousTurns.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n\n')
    : ''

  if (language === 'en') {
    return [
      `Session title: ${session.title}`,
      historyBlock ? `Previous Q&A:\n${historyBlock}` : '',
      `Question:\n${question.trim()}`,
      'Transcript:',
      transcriptBlock,
    ].filter(Boolean).join('\n\n')
  }

  return [
    `会话标题：${session.title}`,
    historyBlock ? `历史问答：\n${historyBlock}` : '',
    `问题：\n${question.trim()}`,
    '转录内容：',
    transcriptBlock,
  ].filter(Boolean).join('\n\n')
}

function buildMindMapSystemPrompt(language: NonNullable<AiPostProcessConfig['promptLanguage']>): string {
  if (language === 'en') {
    return [
      'You generate a Markmap-compatible Markdown mind map for a single transcript session.',
      'Return only a JSON object with keys: title, markdown.',
      'markdown must be valid Markmap Markdown that starts with a single # root heading.',
      'Use nested headings like ## and ### for branches and sub-branches.',
      'Keep the structure concise, readable, and grounded in the transcript.',
      'Do not include code fences.',
    ].join(' ')
  }

  return [
    '你负责为单个会话转录生成兼容 Markmap 的 Markdown 思维导图。',
    '你只能返回 JSON 对象，且只允许包含 title 和 markdown 两个字段。',
    'markdown 必须是合法的 Markmap Markdown，并且以单个 # 根标题开头。',
    '使用 ##、### 这样的层级标题表示分支和子分支。',
    '结构要简洁、清晰，并严格基于转录内容。',
    '不要返回代码块围栏。',
  ].join('')
}

function buildMindMapUserPrompt(
  session: TranscriptSession,
  language: NonNullable<AiPostProcessConfig['promptLanguage']>,
): string {
  const transcriptBlock = buildSessionContextBlock(session)
  const summaryBlock = session.postProcess?.summary?.trim()
    ? `Summary:\n${session.postProcess.summary.trim()}`
    : ''
  const actionBlock = session.postProcess?.actionItems?.length
    ? `Action items:\n${session.postProcess.actionItems.join('\n')}`
    : ''
  const keywordsBlock = session.postProcess?.keywords?.length
    ? `Keywords:\n${session.postProcess.keywords.join(', ')}`
    : ''

  if (language === 'en') {
    return [
      `Session title: ${session.title}`,
      summaryBlock,
      actionBlock,
      keywordsBlock,
      'Generate a concise mind map that helps someone review this session quickly.',
      'Transcript:',
      transcriptBlock,
    ].filter(Boolean).join('\n\n')
  }

  return [
    `会话标题：${session.title}`,
    summaryBlock ? `摘要：\n${session.postProcess?.summary?.trim()}` : '',
    actionBlock ? `行动项：\n${session.postProcess?.actionItems?.join('\n')}` : '',
    keywordsBlock ? `关键词：\n${session.postProcess?.keywords?.join('，')}` : '',
    '请生成一份适合快速回顾会话内容的思维导图。',
    '转录内容：',
    transcriptBlock,
  ].filter(Boolean).join('\n\n')
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

export function parseSessionQaResponse(raw: string, model: string): SessionQaResult {
  const jsonText = extractJsonObject(raw)

  let parsed: SessionQaPayload
  try {
    parsed = JSON.parse(jsonText) as SessionQaPayload
  } catch {
    throw new Error('AI 返回内容无法解析为 JSON')
  }

  return normalizeQaPayload(parsed, model)
}

export function parseSessionMindMapResponse(raw: string, model: string): TranscriptMindMap {
  const jsonText = extractJsonObject(raw)

  let parsed: SessionMindMapPayload
  try {
    parsed = JSON.parse(jsonText) as SessionMindMapPayload
  } catch {
    throw new Error('AI 返回内容无法解析为 JSON')
  }

  return normalizeMindMapPayload(parsed, model)
}

export async function generateSessionBriefing(
  session: TranscriptSession,
  settings: AppSettings,
): Promise<SessionBriefingResult> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'briefing')
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

export async function askQuestionForSession(
  session: TranscriptSession,
  question: string,
  settings: AppSettings,
  options?: { conversationId?: string },
): Promise<SessionQaResult> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'chat')
  const promptLanguage = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE
  const normalizedQuestion = question.trim()

  if (!config.enabled) {
    throw new Error('请先在设置中启用 AI 后处理')
  }

  if (!model) {
    throw new Error('请先配置 AI 模型')
  }

  if (!session.transcript.trim()) {
    throw new Error('当前会话没有可用于问答的转录内容')
  }

  if (!normalizedQuestion) {
    throw new Error('请输入问题')
  }

  const conversationId = options?.conversationId?.trim()

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
        { role: 'system', content: buildAskSystemPrompt(promptLanguage) },
        {
          role: 'user',
          content: buildAskUserPrompt({
            ...session,
            askHistory: conversationId
              ? (session.askHistory || []).filter((turn) => (
                (turn.conversationId || 'default') === conversationId
              ))
              : session.askHistory,
          }, normalizedQuestion, promptLanguage),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `AI 请求失败: HTTP ${response.status}`)
  }

  const payload = await response.json() as ChatCompletionResponse
  const content = extractTextContent(payload.choices)
  return parseSessionQaResponse(content, model)
}

export async function generateSessionMindMap(
  session: TranscriptSession,
  settings: AppSettings,
): Promise<SessionMindMapResult> {
  const config = getAiConfig(settings)
  const baseUrl = config.baseUrl?.trim().replace(/\/+$/, '') || DEFAULT_AI_BASE_URL
  const model = resolveModelForFeature(config, 'mindmap')
  const promptLanguage = config.promptLanguage || DEFAULT_PROMPT_LANGUAGE

  if (!config.enabled) {
    throw new Error('请先在设置中启用 AI 后处理')
  }

  if (!model) {
    throw new Error('请先配置 AI 模型')
  }

  if (!session.transcript.trim()) {
    throw new Error('当前会话没有可用于生成思维导图的转录内容')
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
        { role: 'system', content: buildMindMapSystemPrompt(promptLanguage) },
        { role: 'user', content: buildMindMapUserPrompt(session, promptLanguage) },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `AI 请求失败: HTTP ${response.status}`)
  }

  const payload = await response.json() as ChatCompletionResponse
  const content = extractTextContent(payload.choices)
  const mindMap = parseSessionMindMapResponse(content, model)

  return { mindMap }
}
