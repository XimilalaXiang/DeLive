/**
 * 火山引擎 豆包语音 — 大模型录音文件极速版识别 API
 *
 * 同步模式：一次请求即返回识别结果
 * 音频限制：≤ 2h / ≤ 100MB，支持 WAV/MP3/OGG
 * 认证方式：Header 传 AppKey + AccessKey（旧版控制台）
 */

const VOLC_RECOGNIZE_URL = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash'

/* ─── Response types ──────────────────────────────────────── */

export interface VolcWord {
  text: string
  start_time: number
  end_time: number
  confidence: number
}

export interface VolcUtterance {
  text: string
  start_time: number
  end_time: number
  words?: VolcWord[]
  speaker?: string
}

export interface VolcRecognizeResponse {
  audio_info: {
    duration: number
  }
  result: {
    text: string
    utterances?: VolcUtterance[]
    additions?: {
      duration?: string
    }
  }
}

export interface VolcTranscribeParams {
  enableSpeakerInfo?: boolean
  enableItn?: boolean
  enablePunc?: boolean
  enableDdc?: boolean
}

/* ─── Helpers ─────────────────────────────────────────────── */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/* ─── Transcribe file (flash / sync) ──────────────────────── */

export async function transcribeFile(
  appKey: string,
  accessKey: string,
  file: File,
  params: VolcTranscribeParams = {},
  signal?: AbortSignal,
): Promise<VolcRecognizeResponse> {
  const buffer = await file.arrayBuffer()
  const base64Data = arrayBufferToBase64(buffer)

  const requestId = crypto.randomUUID()

  const headers: Record<string, string> = {
    'X-Api-App-Key': appKey,
    'X-Api-Access-Key': accessKey,
    'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': '-1',
    'Content-Type': 'application/json',
  }

  const body = {
    user: { uid: appKey },
    audio: { data: base64Data },
    request: {
      model_name: 'bigmodel',
      enable_itn: params.enableItn ?? true,
      enable_punc: params.enablePunc ?? true,
      enable_ddc: params.enableDdc ?? true,
      enable_speaker_info: params.enableSpeakerInfo ?? false,
    },
  }

  const res = await fetch(VOLC_RECOGNIZE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  const statusCode = res.headers.get('X-Api-Status-Code')
  const statusMessage = res.headers.get('X-Api-Message')

  if (!res.ok || (statusCode && statusCode !== '20000000')) {
    const errMsg = statusMessage || `Volcengine API error (${statusCode || res.status})`
    throw new Error(errMsg)
  }

  return res.json()
}
