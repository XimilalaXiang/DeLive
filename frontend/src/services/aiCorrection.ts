import type {
  AiPostProcessConfig,
  AppSettings,
  CorrectionIssue,
  TranscriptSession,
} from '../types'
import { resolveModelForFeature } from './aiPostProcess'
import { throwUserError, userErrorMessage } from '../utils/userErrors'

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

type PromptLang = NonNullable<AiPostProcessConfig['promptLanguage']>

// --------------- Prompt builders ---------------

function buildDetectSystemPrompt(lang: PromptLang): string {
  if (lang === 'ko') {
    return [
      '너는 음성 인식 오류 검출기다.',
      '사용자가 ASR(자동 음성 인식) 시스템이 만든 전사 텍스트를 준다.',
      '명백한 전사 오류만 찾아라: 동음이의어와 유사 발음 치환, 고유명사 표기 오류, 명백한 문장부호 오류.',
      '문체 문제, 문법 취향, 다시 쓰기 제안은 보고하지 마라.',
      'id, originalText, suggestedText, reason, category 키를 가진 객체의 JSON 배열을 반환한다.',
      'id는 "1", "2", "3"처럼 1부터 이어지는 문자열이어야 한다.',
      'category는 homophone, proper-noun, grammar, punctuation, other 중 하나여야 한다.',
      'reason은 한국어로 작성한다.',
      '오류가 없으면 빈 배열 []을 반환한다.',
      'JSON 배열만 반환하고 다른 내용은 넣지 마라.',
    ].join(' ')
  }
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

function buildDetectUserPrompt(session: TranscriptSession, lang: PromptLang): string {
  const text = buildTranscriptBlock(session)
  if (lang === 'ko') {
    return `세션 제목: ${session.title}\n\n전사 내용:\n${text}`
  }
  if (lang === 'en') {
    return `Session title: ${session.title}\n\nTranscript:\n${text}`
  }
  return `会话标题：${session.title}\n\n转录内容：\n${text}`
}

function buildQuickCorrectionSystemPrompt(lang: PromptLang): string {
  if (lang === 'ko') {
    return [
      '너는 전사 텍스트 교정자다.',
      '사용자가 ASR 시스템이 만든 전사 텍스트를 준다.',
      '명백한 음성 인식 오류만 고쳐라: 동음이의어와 유사 발음 치환, 고유명사 표기 오류, 명백한 문장부호 오류.',
      '문장 구조, 어순, 문체, 어조, 의미는 바꾸지 마라.',
      '오류인지 확실하지 않으면 원문을 그대로 둔다.',
      '원래의 문단 구분과 서식을 모두 유지한다.',
      '교정된 전문을 일반 텍스트로만 출력한다. 설명, JSON, 마크다운은 넣지 마라.',
    ].join(' ')
  }
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

function buildQuickCorrectionUserPrompt(session: TranscriptSession, lang: PromptLang): string {
  const text = buildTranscriptBlock(session)
  if (lang === 'ko') {
    return `세션 제목: ${session.title}\n\n다음 전사 내용을 교정해 줘:\n${text}`
  }
  if (lang === 'en') {
    return `Session title: ${session.title}\n\nPlease proofread and correct this transcript:\n${text}`
  }
  return `会话标题：${session.title}\n\n请校对并纠正以下转录内容：\n${text}`
}

function buildReviewCorrectionSystemPrompt(lang: PromptLang): string {
  if (lang === 'ko') {
    return [
      '너는 전사 텍스트 교정자다.',
      '사용자가 전사 텍스트와 확정된 수정 목록을 준다.',
      '목록에 있는 수정만 적용하고 그 밖의 변경은 하지 마라.',
      '교정된 전문을 일반 텍스트로만 출력한다. 설명, JSON, 마크다운은 넣지 마라.',
      '원래의 문단 구분과 서식을 모두 유지한다.',
    ].join(' ')
  }
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
  lang: PromptLang,
): string {
  const text = buildTranscriptBlock(session)
  const issuesList = issues
    .map((i) => `- "${i.originalText}" → "${i.suggestedText}"`)
    .join('\n')

  if (lang === 'ko') {
    return [
      `세션 제목: ${session.title}`,
      `확정된 수정:\n${issuesList}`,
      `전사 내용:\n${text}`,
    ].join('\n\n')
  }
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
    throw new Error(errorText || userErrorMessage('aiRequestFailed', undefined, res.status))
  }

  const reader = res.body?.getReader()
  if (!reader) throwUserError('responseBodyNotReadable')

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
  if (!trimmed) throwUserError('aiNoContent')

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)

  throwUserError('aiInvalidJsonArray')
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

  if (!config.enabled) throwUserError('aiPostProcessDisabled')
  if (!model) throwUserError('aiCorrectionModelNotConfigured')
  if (!session.transcript.trim()) throwUserError('noTranscriptForCorrection')

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
    throw new Error(errorText || userErrorMessage('aiRequestFailed', undefined, res.status))
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
    throwUserError('aiJsonParseFailed')
  }

  if (!Array.isArray(parsed)) throwUserError('aiResponseNotArray')

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

  if (!config.enabled) throwUserError('aiPostProcessDisabled')
  if (!model) throwUserError('aiCorrectionModelNotConfigured')
  if (!session.transcript.trim()) throwUserError('noTranscriptForCorrection')

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

  if (!config.enabled) throwUserError('aiPostProcessDisabled')
  if (!model) throwUserError('aiCorrectionModelNotConfigured')
  if (acceptedIssues.length === 0) throwUserError('noAcceptedIssues')

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
