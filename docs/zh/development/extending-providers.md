# 扩展 Provider

本指南说明如何为 DeLive 添加新的 ASR Provider。

## 步骤 1：创建实现

在 `frontend/src/providers/implementations/YourProvider.ts` 创建新文件。

### 流式 Provider

直接继承 `BaseASRProvider`：

```typescript
import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'

export class YourProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'your_provider' as ASRVendor

  readonly info: ASRProviderInfo = {
    id: this.id,
    name: 'Your Provider',
    description: '描述',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder', // 或 'pcm16'
      transport: {
        executionMode: 'realtime-stream',
        captureRestartStrategy: 'reuse-session',
      },
    },
    requiredConfigKeys: ['apiKey'],
    supportedLanguages: ['en', 'zh'],
    website: 'https://example.com',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  }

  async connect(config: ProviderConfig): Promise<void> {
    // 打开 WebSocket、认证等
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    // 关闭连接
    this.setState('idle')
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    // 转发音频到服务
  }
}
```

### 批处理 Provider

继承 `WindowedBatchTranscriptionProvider`：

```typescript
import { WindowedBatchTranscriptionProvider } from '../windowedBatch'

export class YourBatchProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  constructor() {
    super({
      maxWindowMs: 45000,
      transcribeIntervalMs: 1500,
      scheduleMode: 'interval', // 或 'debounce'
    })
  }

  protected async transcribeWindow(
    chunks: Array<{ data: ArrayBuffer; durationMs: number }>,
    config: ProviderConfig
  ): Promise<string> {
    // 从块构建 WAV，调用 REST API，返回文本
  }

  protected resolveAudioChunk(
    data: Blob | ArrayBuffer
  ): { chunk: ArrayBuffer; durationMs: number } | null {
    // 转换输入为类型化块，返回 null 跳过
  }
}
```

## 步骤 2：注册 Provider

在 `frontend/src/providers/registry.ts` 的 `registerDefaultProviders()` 中添加：

```typescript
import { YourProvider } from './implementations/YourProvider'

providerRegistry.register({
  info: new YourProvider().info,
  create: () => new YourProvider(),
})
```

## 步骤 3：添加配置测试（可选）

在 `frontend/src/utils/providerConfigTest.ts` 中为你的 Provider 添加测试函数。

## 步骤 4：添加 Electron 支持（如需）

如果你的 Provider 需要：
- **自定义 Header**（浏览器无法设置）→ 在 `electron/` 中添加代理（如火山引擎）
- **本地二进制管理** → 扩展 `electron/localRuntime*.ts`（如 whisper.cpp）
- **IPC 通道** → 在 `electron/` 中添加处理器并通过 `preload.ts` 暴露

## 步骤 5：添加类型声明

将你的 vendor ID 添加到 `frontend/src/types/asr/common.ts` 的 `ASRVendor` 类型。

## Provider 契约

### 必需方法

| 方法 | 说明 |
|------|------|
| `connect(config)` | 建立连接；成功后必须调用 `setState('connected')` |
| `disconnect()` | 清理关闭；完成后必须调用 `setState('idle')` |
| `sendAudio(data)` | 接受 Blob（MediaRecorder）或 ArrayBuffer（PCM16）块 |

### 需发出的事件

| 事件 | 时机 |
|------|------|
| `onPartial(text)` | 部分/进行中的转录文本 |
| `onFinal(text)` | 最终已提交文本 |
| `onTokens(tokens)` | Token 级更新（如 `prefersTokenEvents`） |
| `onError(error)` | 失败时（同时设置状态为 `error`） |
| `onFinished()` | 会话正常完成 |

### 音频格式

Provider 的 `audioInputMode` 决定 `CaptureManager` 发送的内容：

- `'media-recorder'` → `Blob` 块（WebM/Opus）
- `'pcm16'` → `ArrayBuffer` 块（16 kHz 单声道 PCM16）
