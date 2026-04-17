# Extending Providers

This guide walks through adding a new ASR provider to DeLive.

## Step 1: Create the Implementation

Create a new file at `frontend/src/providers/implementations/YourProvider.ts`.

### Streaming Provider

Extend `BaseASRProvider` directly:

```typescript
import { BaseASRProvider } from '../base'
import type { ASRProviderInfo, ProviderConfig, ASRVendor } from '../../types/asr'

export class YourProvider extends BaseASRProvider {
  readonly id: ASRVendor = 'your_provider' as ASRVendor
  
  readonly info: ASRProviderInfo = {
    id: this.id,
    name: 'Your Provider',
    description: 'Description here',
    type: 'cloud',
    supportsStreaming: true,
    capabilities: {
      audioInputMode: 'media-recorder', // or 'pcm16'
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
    // Open WebSocket, authenticate, etc.
    this.setState('connected')
  }

  async disconnect(): Promise<void> {
    // Close connection
    this.setState('idle')
  }

  sendAudio(data: Blob | ArrayBuffer): void {
    // Forward audio to the service
  }
}
```

### Batch Provider

Extend `WindowedBatchTranscriptionProvider`:

```typescript
import { WindowedBatchTranscriptionProvider } from '../windowedBatch'

export class YourBatchProvider extends WindowedBatchTranscriptionProvider<ArrayBuffer> {
  constructor() {
    super({
      maxWindowMs: 45000,
      transcribeIntervalMs: 1500,
      scheduleMode: 'interval', // or 'debounce'
    })
  }

  protected async transcribeWindow(
    chunks: Array<{ data: ArrayBuffer; durationMs: number }>,
    config: ProviderConfig
  ): Promise<string> {
    // Build WAV from chunks, call REST API, return text
  }

  protected resolveAudioChunk(
    data: Blob | ArrayBuffer
  ): { chunk: ArrayBuffer; durationMs: number } | null {
    // Convert input to typed chunk, return null to skip
  }
}
```

## Step 2: Register the Provider

In `frontend/src/providers/registry.ts`, add to `registerDefaultProviders()`:

```typescript
import { YourProvider } from './implementations/YourProvider'

providerRegistry.register({
  info: new YourProvider().info,
  create: () => new YourProvider(),
})
```

## Step 3: Add Config Test (Optional)

In `frontend/src/utils/providerConfigTest.ts`, add a test function for your provider:

```typescript
case 'your_provider':
  return testYourProvider(config)
```

## Step 4: Add Electron Support (If Needed)

If your provider requires:
- **Custom headers** that browsers can't set → add a proxy in `electron/` (like Volcengine)
- **Local binary management** → extend `electron/localRuntime*.ts` (like whisper.cpp)
- **IPC channels** → add handlers in `electron/` and expose via `preload.ts`

## Step 5: Add Type Declarations

Add your vendor ID to the `ASRVendor` type in `frontend/src/types/asr/common.ts`.

## Provider Contract

### Required Methods

| Method | Description |
|--------|-------------|
| `connect(config)` | Establish connection; must call `setState('connected')` on success |
| `disconnect()` | Clean shutdown; must call `setState('idle')` when done |
| `sendAudio(data)` | Accept Blob (MediaRecorder) or ArrayBuffer (PCM16) chunks |

### Events to Emit

| Event | When |
|-------|------|
| `onPartial(text)` | Partial/in-progress transcription text |
| `onFinal(text)` | Final committed text |
| `onTokens(tokens)` | Token-level updates (if `prefersTokenEvents`) |
| `onError(error)` | On failure (also sets state to `error`) |
| `onFinished()` | Clean session completion |

### Audio Format

Your provider's `audioInputMode` determines what `CaptureManager` sends:

- `'media-recorder'` → `Blob` chunks (WebM/Opus)
- `'pcm16'` → `ArrayBuffer` chunks (16 kHz mono PCM16)
