# ASR Provider

DeLive 通过统一的 Provider 注册机制支持十四种 ASR 后端。每个 Provider 实现相同的接口契约，但使用不同的传输和音频处理策略。

> **需要 API Key？** 请查看 [API Key 获取指引](./api-keys)，获取各服务商的 Key 获取步骤。

## Provider 对比

| Provider | 类型 | 传输方式 | 音频格式 | 流式 | 翻译 | 说话人分离 | 文件 |
|----------|------|---------|---------|------|------|-----------|------|
| Soniox V5 | 云端 | WebSocket | MediaRecorder (WebM/Opus) | 是 | 是 | 是 | 是 |
| 火山引擎 | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| ElevenLabs | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| Mistral AI | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| Gladia | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| Deepgram | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| AssemblyAI | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| 60db | 云端 | WebSocket（经代理） | AudioWorklet (PCM16) | 是 | 否 | 否 | 是 |
| Cloudflare Workers AI | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 | 是 |
| 硅基流动 | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 | 是 |
| Groq | 云端 | REST（批量） | AudioWorklet (PCM16) | 否 | 否 | 否 | 是 |
| 本地 OpenAI | 本地 | REST（批量） | MediaRecorder (WebM/Opus) | 否 | 否 | 否 | 是 |
| FunASR / SenseVoice | 本地 | REST（批量） | MediaRecorder (WebM/Opus) | 否 | 否 | 否 | 是 |
| whisper.cpp | 本地 | REST（本地） | AudioWorklet (PCM16) | 否 | 否 | 否 | 是 |

## 执行模式

### 实时流式

**Soniox**、**火山引擎**、**ElevenLabs**、**Mistral AI**、**Gladia**、**Deepgram**、**AssemblyAI** 和 **60db** 使用。音频块通过 WebSocket 连接持续发送，转录更新实时到达。

- Soniox 发出 **Token 级事件**（`prefersTokenEvents: true`），实现细粒度文本更新
- 火山引擎、ElevenLabs、Mistral AI、Gladia、Deepgram、AssemblyAI 和 60db 经内置代理（默认端口 23456）注入所需的认证 Header
- 如果 23456–23460 端口全被占用，代理会改用系统分配的空闲端口，DeLive 会自动获取实际端口

### 窗口批处理

**Cloudflare Workers AI**、**硅基流动**、**Groq**、**本地 OpenAI 兼容**、**FunASR / SenseVoice** 和 **whisper.cpp** 使用。音频在滚动缓冲区（最长 45 秒）中累积，定期通过 REST 调用重新转录整个窗口。

- **定时模式**（Cloudflare、硅基流动、Groq、whisper.cpp）：每 1.5 秒重新转录
- **防抖模式**（本地 OpenAI、FunASR / SenseVoice）：最后一个音频块到达后 1200ms 重新转录
- `TranscriptStabilizer` 比较连续转录结果，提交稳定文本前缀，防止文本闪烁

### Electron 托管运行时

**whisper.cpp** 使用。DeLive 管理 `whisper-server` 二进制文件的生命周期：

1. 导入或下载二进制文件和模型
2. DeLive 启动进程并等待 HTTP 就绪（最长 20 秒）
3. 音频以 WAV 格式发送到 `POST /inference`
4. 断开连接或应用退出时停止进程

## 文件转录

所有 Provider 都能转录上传的音频/视频文件（见上表「文件」列）。云端 Provider 调用各自的文件接口；本地 OpenAI 兼容和 FunASR / SenseVoice 把文件发送到 `/v1/audio/transcriptions`；whisper.cpp 会先启动本地 runtime，把文件解码为 16 kHz 单声道 WAV，再发送到 `/inference`。缺少配置时任务会直接显示失败，而不会悄悄改用其他 Provider。

## Soniox V5

功能最丰富的 Provider，支持实时流式、翻译和说话人分离。DeLive 默认使用 Soniox 实时模型 **`stt-rt-v5`**。

**必填：** `apiKey`

**可选：** `model`（默认 `stt-rt-v5`）、`languageHints`、`translationEnabled`、`translationTargetLanguage`、`enableSpeakerDiarization`

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

通过 AssemblyAI WebSocket API 使用 Universal-3.5 Pro 实时流式 ASR。

**必填：** `apiKey`

**可选：** `model`

使用本地 WebSocket 代理（端口 23456 的 `/ws/assemblyai`）注入 `Authorization` Header。支持 6 种流式语言，最适合英语内容。

## 60db

通过 60db WebSocket API 实时转录，支持约 40 种语言，含印度语系与英语混说。

**必填：** `apiKey`

**可选：** `languageHints`（最多 5 个 ISO 639-1 语言代码；留空自动检测）

使用本地 WebSocket 代理（`/ws/sixtydb`）隐藏 API Key，并把 60db 的两阶段 final 结果归一为 DeLive 的 partial/final 事件。文件转录使用 60db REST `/stt` 接口，单个文件最大 **10MB**。

## ElevenLabs

通过 ElevenLabs WebSocket API 使用 Scribe v2 Realtime ASR。可选实时模型：`scribe_v2_realtime`（默认）、`scribe_v2_realtime_turbo`、`scribe_v2_realtime_lite`。

**必填：** `apiKey`

**可选：** `model`、`languageHints`

使用本地 WebSocket 代理（端口 23456 的 `/ws/elevenlabs`）注入 `xi-api-key` Header。支持 90+ 种语言含普通话。音频以 base64 编码 JSON 格式发送。

## Gladia

Solaria-1 实时流式 ASR，延迟低于 300ms，支持 100+ 种语言。文件/异步转录可选 `solaria-1`（默认）或 `solaria-3`（仅预录音频；英/法/德/西/意）。

**必填：** `apiKey`

**可选：** `fileModel`（仅文件任务）、`languageHints`

使用本地 WebSocket 代理（`/ws/gladia`）处理 HTTP POST 会话初始化并注入 `x-gladia-key` 认证 Header。实时转录始终使用 Solaria-1，`solaria-3` 不会发送到实时 WebSocket。

## Cloudflare Workers AI

通过 Cloudflare Workers AI 平台进行基于 Whisper 的转录，成本低且有充足的免费额度。

**必填：** `apiToken`、`accountId`

**可选：** `model`、`languageHints`

使用窗口批处理重转录，带 VAD 过滤和防幻觉措施。支持实时采集和文件转录。可用模型包括 `@cf/openai/whisper` 和 `@cf/openai/whisper-large-v3-turbo`。

## 本地 OpenAI 兼容

兼容 Ollama 或任何暴露 OpenAI 兼容音频转录端点的服务。

**必填：** `baseUrl`、`model`

**可选：** `apiKey`、`languageHints`

DeLive 可探测 `baseUrl` 处的服务，通过 `/v1/models` 列出已安装模型，如检测到 Ollama 还可拉取模型。

## 本地 FunASR / SenseVoice

通过自建的 [FunASR](https://github.com/modelscope/FunASR) `funasr-server` 本地转录，该服务提供 OpenAI 兼容的 `/v1/audio/transcriptions` 接口，无 API 费用。

**必填：** `baseUrl`（默认 `http://127.0.0.1:8000`）

**可选：** `model`、`languageHints`

模型：`sensevoice`（默认；多语言，带情感与音频事件标签）、`paraformer`（中文生产级，含 VAD 与标点）、`fun-asr-nano`（基于 LLM，31 种语言）。

启动服务：

```bash
pip install funasr
funasr-server --device cuda --port 8000
```

没有 NVIDIA 显卡时用 `--device cpu`，Apple 芯片可用 `--device mps`。旧配置中的 `paraformer-en`（funasr-server 不支持）会自动回退为 `sensevoice`。

## 本地 whisper.cpp

使用 `whisper-server` 二进制文件的完全离线转录。

**必填：** `modelPath`

**可选：** `binaryPath`、`port`（默认 8177）、`languageHints`

DeLive 可导入或下载二进制文件和模型文件。静音音频块会自动跳过以减少不必要的推理。
