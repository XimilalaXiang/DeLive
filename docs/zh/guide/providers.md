# ASR Provider

DeLive 通过统一的 Provider 注册机制支持十二种 ASR 后端。每个 Provider 实现相同的接口契约，但使用不同的传输和音频处理策略。

## Provider 对比

| Provider | 类型 | 传输方式 | 音频格式 | 流式 | 翻译 | 说话人分离 |
|----------|------|---------|---------|------|------|-----------|
| Soniox V4 | 云端 | WebSocket | MediaRecorder (WebM/Opus) | 是 | 是 | 是 |
| 火山引擎 | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| ElevenLabs | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| Mistral AI | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| Gladia | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| Deepgram | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| AssemblyAI | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 |
| Cloudflare Workers AI | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 |
| 硅基流动 | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 |
| Groq | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 |
| 本地 OpenAI | 本地 | REST（批量） | MediaRecorder (WebM/Opus) | 否 | 否 | 否 |
| whisper.cpp | 本地 | REST（本地） | AudioWorklet (PCM16) | 否 | 否 | 否 |

## 执行模式

### 实时流式

**Soniox**、**火山引擎**、**ElevenLabs**、**Mistral AI**、**Gladia**、**Deepgram** 和 **AssemblyAI** 使用。音频块通过 WebSocket 连接持续发送，转录更新实时到达。

- Soniox 发出 **Token 级事件**（`prefersTokenEvents: true`），实现细粒度文本更新
- 火山引擎、ElevenLabs、Mistral AI、Gladia、Deepgram 和 AssemblyAI 使用本地代理（端口 23456）注入所需的认证 Header

### 窗口批处理

**Cloudflare Workers AI**、**硅基流动**、**Groq**、**本地 OpenAI 兼容** 和 **whisper.cpp** 使用。音频在滚动缓冲区（最长 45 秒）中累积，定期通过 REST 调用重新转录整个窗口。

- **定时模式**（Cloudflare、硅基流动、Groq、whisper.cpp）：每 1.5 秒重新转录
- **防抖模式**（本地 OpenAI）：最后一个音频块到达后 1200ms 重新转录
- `TranscriptStabilizer` 比较连续转录结果，提交稳定文本前缀，防止文本闪烁

### Electron 托管运行时

**whisper.cpp** 使用。DeLive 管理 `whisper-server` 二进制文件的生命周期：

1. 导入或下载二进制文件和模型
2. DeLive 启动进程并等待 HTTP 就绪（最长 20 秒）
3. 音频以 WAV 格式发送到 `POST /inference`
4. 断开连接或应用退出时停止进程

## Soniox V4

功能最丰富的 Provider，支持实时流式、翻译和说话人分离。

**必填：** `apiKey`

**可选：** `model`、`languageHints`、`translationEnabled`、`translationTargetLanguage`、`enableSpeakerDiarization`

## 火山引擎

中文优化的实时流式服务，通过内置代理工作。

**必填：** `appKey`、`accessKey`

**可选：** `languageHints`

浏览器无法设置自定义 WebSocket Header，因此 DeLive 在 Electron 主进程中运行内置 HTTP 代理，将 PCM16 音频转发到字节跳动的 `openspeech.bytedance.com` 端点并附加所需的认证 Header。

## Groq

通过 Groq 高性能推理 API 使用 Whisper `large-v3-turbo` / `large-v3`。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

## 硅基流动

通过硅基流动 API 使用 SenseVoice、TeleSpeech 和通义千问 Omni 模型。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

## Mistral AI

通过 Mistral API 使用 Voxtral Realtime 流式 ASR。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

使用本地 WebSocket 代理（端口 23456 的 `/ws/mistral`）注入 `Authorization` Header。

## Deepgram

通过 Deepgram API 使用 Nova-3 和 Nova-2 实时流式 ASR。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

使用本地 WebSocket 代理（端口 23456 的 `/ws/deepgram`）注入 `Authorization: Token` Header。最适合英语和多语言内容。

## AssemblyAI

通过 AssemblyAI WebSocket API 使用 Universal-3 Pro 实时流式 ASR。

**必填：** `apiKey`

**可选：** `model`

使用本地 WebSocket 代理（端口 23456 的 `/ws/assemblyai`）注入 `Authorization` Header。支持 6 种流式语言，最适合英语内容。

## ElevenLabs

通过 ElevenLabs WebSocket API 使用 Scribe v2 Realtime ASR。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

使用本地 WebSocket 代理（端口 23456 的 `/ws/elevenlabs`）注入 `xi-api-key` Header。支持 90+ 种语言含普通话。音频以 base64 编码 JSON 格式发送。

## 本地 OpenAI 兼容

兼容 Ollama 或任何暴露 OpenAI 兼容音频转录端点的服务。

**必填：** `baseUrl`、`model`

**可选：** `apiKey`、`languageHints`

DeLive 可探测 `baseUrl` 处的服务，通过 `/v1/models` 列出已安装模型，如检测到 Ollama 还可拉取模型。

## 本地 whisper.cpp

使用 `whisper-server` 二进制文件的完全离线转录。

**必填：** `modelPath`

**可选：** `binaryPath`、`port`（默认 8177）、`languageHints`

DeLive 可导入或下载二进制文件和模型文件。静音音频块会自动跳过以减少不必要的推理。
