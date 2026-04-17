# ASR Providers

DeLive supports six ASR backends through a unified provider registry. Each provider implements a common contract but uses different transport and audio processing strategies.

## Provider Comparison

| Provider | Type | Transport | Audio | Streaming | Translation | Diarization |
|----------|------|-----------|-------|-----------|-------------|-------------|
| Soniox V4 | Cloud | WebSocket | MediaRecorder (WebM/Opus) | Yes | Yes | Yes |
| Volcengine | Cloud | WebSocket (via proxy) | AudioWorklet (PCM16) | Yes | No | No |
| Groq | Cloud | REST (batch) | AudioWorklet (PCM16) | No | No | No |
| SiliconFlow | Cloud | REST (batch) | AudioWorklet (PCM16) | No | No | No |
| Local OpenAI | Local | REST (batch) | MediaRecorder (WebM/Opus) | No | No | No |
| whisper.cpp | Local | REST (local) | AudioWorklet (PCM16) | No | No | No |

## Execution Modes

### Real-Time Streaming

Used by **Soniox** and **Volcengine**. Audio chunks are sent continuously over a WebSocket connection, and transcript updates arrive in real-time.

- Soniox emits **token-level events** (`prefersTokenEvents: true`) for fine-grained text updates
- Volcengine uses a local proxy (`/ws/volc` on port 23456) to inject required authentication headers

### Windowed Batch

Used by **Groq**, **SiliconFlow**, **Local OpenAI-compatible**, and **whisper.cpp**. Audio accumulates in a rolling buffer (max 45 seconds), and a REST call retranscribes the entire window at regular intervals.

- **Interval mode** (Groq, SiliconFlow, whisper.cpp): retranscribe every 1.5 seconds
- **Debounce mode** (Local OpenAI): retranscribe 1200ms after the last audio chunk
- A `TranscriptStabilizer` compares successive transcriptions and commits stable text prefixes, preventing text flickering

### Electron-Managed Runtime

Used by **whisper.cpp**. DeLive manages the `whisper-server` binary lifecycle:

1. Import or download the binary and model
2. DeLive spawns the process and waits for HTTP readiness (up to 20 seconds)
3. Audio is sent to `POST /inference` as WAV
4. Process is stopped on disconnect or app quit

## Soniox V4

The most feature-rich provider with real-time streaming, translation, and speaker diarization.

**Required:** `apiKey`

**Optional:** `model`, `languageHints`, `translationEnabled`, `translationTargetLanguage`, `enableSpeakerDiarization`

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

## Local OpenAI-Compatible

Works with Ollama or any service exposing the OpenAI-compatible audio transcription endpoint.

**Required:** `baseUrl`, `model`

**Optional:** `apiKey`, `languageHints`

DeLive can probe the service at `baseUrl`, list installed models via `/v1/models`, and pull models from Ollama if detected.

## Local whisper.cpp

Fully offline transcription using the `whisper-server` binary.

**Required:** `modelPath`

**Optional:** `binaryPath`, `port` (default 8177), `languageHints`

DeLive can import or download both the binary and model files. Silent audio chunks are automatically skipped to reduce unnecessary inference.
