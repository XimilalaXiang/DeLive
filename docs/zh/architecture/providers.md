# Provider 系统

Provider 系统是 DeLive 对 ASR 后端的抽象层，将十二种不同的语音识别服务统一在通用契约之后。

## 架构

```
ProviderRegistry（单例）
  ├── register(entry: { info, create })
  ├── getInfo(vendorId) → ASRProviderInfo
  └── createProvider(vendorId) → ASRProvider

ASRProvider（接口）
  ├── connect(config) → Promise<void>
  ├── disconnect() → Promise<void>
  ├── sendAudio(data: Blob | ArrayBuffer) → void
  └── events: onTokens, onPartial, onFinal, onError, onFinished

BaseASRProvider（抽象类）
  ├── 状态机: idle → connecting → connected → disconnecting
  ├── 事件发射器（Map of callbacks）
  └── 辅助方法: emitToken, emitPartial, emitFinal 等

WindowedBatchTranscriptionProvider<TChunk>（继承 BaseASRProvider）
  ├── RollingAudioBuffer（最长 45s 滑动窗口）
  ├── 调度: 定时或防抖
  ├── TranscriptStabilizer（提交稳定文本前缀）
  └── 抽象方法: transcribeWindow(), resolveAudioChunk()
```

## Provider 注册

`ProviderRegistry` 是将 vendor ID 映射到工厂函数的单例。十二个 Provider 在模块加载时通过 `registerDefaultProviders()` 注册。

## `ASRProviderInfo`

每个 Provider 通过 `ASRProviderInfo` 声明其能力：

- `audioInputMode`: `'media-recorder'` 或 `'pcm16'`
- `audioProfile`: 采样率、声道数、payload 格式、块时序
- `transport`: 执行模式、捕获重启策略
- 功能标志: `supportsTranslation`、`supportsSpeakerDiarization`、`prefersTokenEvents`

## 事件系统

| 事件 | Payload | 说明 |
|------|---------|------|
| `onTokens` | `TranscriptToken[]` | Token 级更新（Soniox） |
| `onPartial` | `string` | 部分/进行中文本 |
| `onFinal` | `string` | 最终已提交文本 |
| `onError` | `ASRError` | 带代码和消息的错误 |
| `onStateChange` | `ASRProviderState` | Provider 状态变化 |
| `onFinished` | — | Provider 会话正常完成 |

当 `prefersTokenEvents` 为 `true`（Soniox）时，`ProviderSessionManager` **不** 注册 `onPartial` 和 `onFinal` 监听器 — 而是从 `onTokens` 派生文本。

## 窗口批处理转录

五个 Provider（Cloudflare、硅基流动、Groq、本地 OpenAI、whisper.cpp）继承 `WindowedBatchTranscriptionProvider`：

### 滚动音频缓冲区

`RollingAudioBuffer<TChunk>` 存储带时间戳的音频块，最大持续时间 **45 秒**。超出限制时裁剪最旧的块。

### 调度

- **定时模式**（Cloudflare、Groq、硅基流动、whisper.cpp）：每 **1500ms** `setInterval` 触发重新转录
- **防抖模式**（本地 OpenAI）：每个新音频块重置 **1200ms** `setTimeout`（与 `transcribeIntervalMs` 同值）

### 稳定化

`TranscriptStabilizer` 比较连续转录结果：
1. 找到新旧转录之间的最长公共前缀
2. 将稳定前缀作为最终文本提交
3. 将剩余部分作为部分文本发出

防止 UI 中相同音频窗口产生略有不同转录时的文本闪烁。

### 文本重叠处理

滚动缓冲区前进时，`buildWindowedTranscriptSnapshot` 剥离已提交文本尾部和新窗口转录之间最多 **200 字符** 的重叠，避免重复内容。

## 音频管线

`CaptureManager` 根据 `capabilities.audioInputMode` 选择音频路径：

### MediaRecorder 路径

Soniox 和本地 OpenAI 兼容使用。

1. `getDisplayMedia({ audio: true })` → `MediaStream`
2. `MediaRecorder` 使用 `audio/webm;codecs=opus`（或回退）
3. `ondataavailable` 每 100ms → `Blob` 块
4. 块转发到 `provider.sendAudio(blob)`

### PCM16 路径

火山引擎、Groq、硅基流动、Mistral AI、Deepgram、AssemblyAI、ElevenLabs、Gladia、Cloudflare 和 whisper.cpp 使用。

1. `getDisplayMedia({ audio: true })` → `MediaStream`
2. `AudioProcessor` 使用 **AudioWorklet**（首选）或 **ScriptProcessorNode**（回退）
3. 重采样到 16 kHz 单声道
4. Float32 → Int16 转换 → `ArrayBuffer` 块
5. 块转发到 `provider.sendAudio(buffer)`
