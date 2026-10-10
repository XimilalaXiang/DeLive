# ASR Providers

DeLive supports fourteen ASR backends through a unified provider registry. Each provider implements a common contract but uses different transport and audio processing strategies.

> **Need an API key?** See the [API Key Guide](./api-keys) for step-by-step instructions on obtaining keys for each provider.

## Provider Comparison

| Provider | Type | Transport | Audio | Streaming | Translation | Diarization | File |
|----------|------|-----------|-------|-----------|-------------|-------------|------|
| Soniox V5 | Cloud | WebSocket | MediaRecorder (WebM/Opus) | Yes | Yes | Yes | Yes |
| Volcengine | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| ElevenLabs | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| Mistral AI | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| Gladia | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| Deepgram | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| AssemblyAI | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| 60db | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No | Yes |
| Cloudflare Workers AI | Cloud | REST (batch) | AudioWorklet (PCM16) | No | No | No | Yes |
| SiliconFlow | Cloud | REST (batch) | AudioWorklet (PCM16) | No | No | No | Yes |
| Groq | Cloud | REST (batch) | AudioWorklet (PCM16) | No | No | No | Yes |
| Local OpenAI | Local | REST (batch) | MediaRecorder (WebM/Opus) | No | No | No | Yes |
| FunASR / SenseVoice | Local | REST (batch) | MediaRecorder (WebM/Opus) | No | No | No | Yes |
| whisper.cpp | Local | REST (local) | AudioWorklet (PCM16) | No | No | No | Yes |

## Execution Modes

### Real-Time Streaming

Used by **Soniox**, **Volcengine**, **ElevenLabs**, **Mistral AI**, **Gladia**, **Deepgram**, **AssemblyAI**, and **60db**. Audio chunks are sent continuously over a WebSocket connection, and transcript updates arrive in real-time.

- Soniox emits **token-level events** (`prefersTokenEvents: true`) for fine-grained text updates
- Volcengine, ElevenLabs, Mistral AI, Gladia, Deepgram, AssemblyAI, and 60db go through the embedded proxy (port 23456 by default) to inject required authentication headers
- If ports 23456–23460 are all taken, the proxy falls back to a free system port; DeLive picks up the real port automatically

### Windowed Batch

Used by **Cloudflare Workers AI**, **SiliconFlow**, **Groq**, **Local OpenAI-compatible**, **FunASR / SenseVoice**, and **whisper.cpp**. Audio accumulates in a rolling buffer (max 45 seconds), and a REST call retranscribes the entire window at regular intervals.

- **Interval mode** (Cloudflare, SiliconFlow, Groq, whisper.cpp): retranscribe every 1.5 seconds
- **Debounce mode** (Local OpenAI, FunASR / SenseVoice): retranscribe 1200ms after the last audio chunk
- A `TranscriptStabilizer` compares successive transcriptions and commits stable text prefixes, preventing text flickering

### Electron-Managed Runtime

Used by **whisper.cpp**. DeLive manages the `whisper-server` binary lifecycle:

1. Import or download the binary and model
2. DeLive spawns the process and waits for HTTP readiness (up to 20 seconds)
3. Audio is sent to `POST /inference` as WAV
4. Process is stopped on disconnect or app quit

## File Transcription

Every provider can transcribe uploaded audio or video files (the **File** column above). Cloud providers call their own file APIs, Local OpenAI-compatible and FunASR / SenseVoice post the file to `/v1/audio/transcriptions`, and whisper.cpp starts the local runtime, decodes the file to 16 kHz mono WAV, and posts it to `/inference`. If credentials are missing, the job fails with a visible error instead of silently using another provider.

## Soniox V5

The most feature-rich provider with real-time streaming, translation, and speaker diarization. DeLive uses Soniox real-time model **`stt-rt-v5`** by default.

**Required:** `apiKey`

**Optional:** `model` (default `stt-rt-v5`), `languageHints`, `translationEnabled`, `translationTargetLanguage`, `enableSpeakerDiarization`

**Features:**
- Token-level real-time transcription
- Real-time translation with dual-line captions
- Speaker diarization with labeled tokens
- Audio format: `auto` (WebM/Opus from MediaRecorder)

## Volcengine (火山引擎)

Chinese-focused real-time streaming through an embedded proxy.

**Required:** `appKey`, `accessKey`

**Optional:** `languageHints`

The browser cannot set custom WebSocket headers, so DeLive runs an embedded HTTP proxy in the Electron main process that forwards PCM16 audio to ByteDance's `openspeech.bytedance.com` endpoint with the required authentication headers.

## Groq

Whisper `large-v3-turbo` / `large-v3` through Groq's high-performance inference API.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`

## SiliconFlow (硅基流动)

SenseVoice, TeleSpeech, and Qwen Omni models through SiliconFlow's API.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`

## Mistral AI

Voxtral Realtime streaming ASR through the Mistral API.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`

Uses a local WebSocket proxy (`/ws/mistral` on port 23456) to inject `Authorization` headers. Supports the Voxtral model family for real-time transcription.

## Deepgram

Nova-3 and Nova-2 real-time streaming ASR through Deepgram's API.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`

Uses a local WebSocket proxy (`/ws/deepgram` on port 23456) to inject `Authorization: Token` headers. Best for English and multilingual content.

## AssemblyAI

Universal-3.5 Pro real-time streaming ASR through AssemblyAI's WebSocket API.

**Required:** `apiKey`

**Optional:** `model`

Uses a local WebSocket proxy (`/ws/assemblyai` on port 23456) to inject `Authorization` headers. Supports 6 streaming languages; best suited for English content.

## 60db

Real-time STT through 60db's WebSocket API, with ~40 languages including Indic languages mixed with English.

**Required:** `apiKey`

**Optional:** `languageHints` (up to 5 ISO 639-1 codes; leave empty for auto-detect)

Uses a local WebSocket proxy (`/ws/sixtydb`) that hides the API key and normalizes 60db's two-phase finals into DeLive's partial/final events. File transcription uses the 60db REST `/stt` endpoint, which accepts files up to **10 MB**.

## ElevenLabs

Scribe v2 Realtime ASR through ElevenLabs' WebSocket API. Selectable realtime models: `scribe_v2_realtime` (default), `scribe_v2_realtime_turbo`, and `scribe_v2_realtime_lite`.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`

Uses a local WebSocket proxy (`/ws/elevenlabs` on port 23456) to inject `xi-api-key` headers. Supports 90+ languages including Mandarin Chinese. Audio is sent as base64-encoded JSON payloads.

## Gladia

Solaria-1 real-time streaming ASR with sub-300ms latency and 100+ language support. File/async transcription can use `solaria-1` (default) or `solaria-3` (pre-recorded only; EN/FR/DE/ES/IT).

**Required:** `apiKey`

**Optional:** `fileModel` (file jobs only), `languageHints`

Uses a local WebSocket proxy (`/ws/gladia` on port 23456) that handles HTTP POST session initialization and injects the `x-gladia-key` authentication header. Live capture always uses Solaria-1; `solaria-3` is never sent on the live WebSocket.

## Cloudflare Workers AI

Whisper-based transcription through Cloudflare's Workers AI platform. Low cost with a generous free tier.

**Required:** `apiToken`, `accountId`

**Optional:** `model`, `languageHints`

Uses windowed batch retranscription with VAD filtering and anti-hallucination measures. Supports both live capture and file transcription. Available models include `@cf/openai/whisper` and `@cf/openai/whisper-large-v3-turbo`.

## Local OpenAI-Compatible

Works with Ollama or any service exposing the OpenAI-compatible audio transcription endpoint.

**Required:** `baseUrl`, `model`

**Optional:** `apiKey`, `languageHints`

DeLive can probe the service at `baseUrl`, list installed models via `/v1/models`, and pull models from Ollama if detected.

## Local FunASR / SenseVoice

Local transcription through a self-hosted [FunASR](https://github.com/modelscope/FunASR) `funasr-server`, which exposes an OpenAI-compatible `/v1/audio/transcriptions` endpoint. No API cost.

**Required:** `baseUrl` (default `http://127.0.0.1:8000`)

**Optional:** `model`, `languageHints`

Models: `sensevoice` (default; multilingual with emotion and audio-event tags), `paraformer` (production-grade Chinese with VAD and punctuation), and `fun-asr-nano` (LLM-based, 31 languages).

Start the server with:

```bash
pip install funasr
funasr-server --device cuda --port 8000
```

Use `--device cpu` without an NVIDIA GPU, or `--device mps` on Apple Silicon. Older configs that used `paraformer-en` (rejected by funasr-server) fall back to `sensevoice` automatically.

## Local whisper.cpp

Fully offline transcription using the `whisper-server` binary.

**Required:** `modelPath`

**Optional:** `binaryPath`, `port` (default 8177), `languageHints`

DeLive can import or download both the binary and model files. Silent audio chunks are automatically skipped to reduce unnecessary inference.
