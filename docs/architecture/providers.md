# Provider System

The provider system is DeLive's abstraction layer for ASR backends. It unifies ten different speech recognition services behind a common contract.

## Architecture

```
ProviderRegistry (singleton)
  ├── register(entry: { info, create })
  ├── getInfo(vendorId) → ASRProviderInfo
  └── createProvider(vendorId) → ASRProvider

ASRProvider (interface)
  ├── connect(config) → Promise<void>
  ├── disconnect() → Promise<void>
  ├── sendAudio(data: Blob | ArrayBuffer) → void
  └── events: onTokens, onPartial, onFinal, onError, onFinished

BaseASRProvider (abstract class)
  ├── State machine: idle → connecting → connected → disconnecting
  ├── Event emitter (Map of callbacks)
  └── Helper methods: emitToken, emitPartial, emitFinal, etc.

WindowedBatchTranscriptionProvider<TChunk> (extends BaseASRProvider)
  ├── RollingAudioBuffer (max 45s sliding window)
  ├── Scheduling: interval or debounce
  ├── TranscriptStabilizer (commits stable text prefixes)
  └── Abstract: transcribeWindow(), resolveAudioChunk()
```

## Provider Registry

The `ProviderRegistry` is a singleton that maps vendor IDs to factory functions:

```typescript
providerRegistry.register({
  info: new SonioxProvider().info,
  create: () => new SonioxProvider(),
})
```

Ten providers are registered at module load via `registerDefaultProviders()`.

## `ASRProviderInfo`

Each provider declares its capabilities through `ASRProviderInfo`:

```typescript
interface ASRProviderInfo {
  id: ASRVendor
  name: string
  description: string
  type: ProviderType            // 'cloud' | 'local'
  supportsStreaming: boolean
  capabilities: ASRProviderCapabilities
  requiredConfigKeys: string[]
  supportedLanguages: string[]
  website: string
  configFields: ProviderConfigField[]
}
```

`ASRProviderCapabilities` includes:

- `audioInputMode`: `'media-recorder'` or `'pcm16'`
- `audioProfile`: sample rate, channels, payload format, chunk timing
- `transport`: execution mode, capture restart strategy
- Feature flags: `supportsTranslation`, `supportsSpeakerDiarization`, `prefersTokenEvents`

## Event System

Providers emit events through an internal `Map<eventName, callback[]>`:

| Event | Payload | Description |
|-------|---------|-------------|
| `onTokens` | `TranscriptToken[]` | Token-level updates (Soniox) |
| `onPartial` | `string` | Partial/in-progress text |
| `onFinal` | `string` | Final committed text |
| `onError` | `ASRError` | Error with code and message |
| `onStateChange` | `ASRProviderState` | Provider state changed |
| `onFinished` | — | Provider session completed cleanly |

::: info
When `prefersTokenEvents` is `true` (Soniox), `ProviderSessionManager` does **not** register `onPartial` and `onFinal` listeners — it derives text from `onTokens` instead.
:::

## Windowed Batch Transcription

Four providers (Groq, SiliconFlow, Local OpenAI, whisper.cpp) extend `WindowedBatchTranscriptionProvider`:

### Rolling Audio Buffer

A `RollingAudioBuffer<TChunk>` stores timestamped audio chunks with a maximum duration of **45 seconds**. When the buffer exceeds the limit, oldest chunks are trimmed.

### Scheduling

- **Interval mode** (Groq, SiliconFlow, whisper.cpp): `setInterval` every **1500ms** triggers retranscription
- **Debounce mode** (Local OpenAI): each new audio chunk resets a **1200ms** `setTimeout` (same value as `transcribeIntervalMs`)

### Stabilization

`TranscriptStabilizer` compares successive transcription results:
1. Finds the longest common prefix between the new and previous transcription
2. Commits the stable prefix as final text
3. Emits the remainder as partial text

This prevents text flickering in the UI when the same audio window produces slightly different transcriptions.

### Text Overlap Handling

When the rolling buffer advances, `buildWindowedTranscriptSnapshot` strips up to **200 characters** of overlap between the committed text tail and the new window transcription to avoid duplicate content.

## Audio Pipeline

`CaptureManager` selects the audio path based on `capabilities.audioInputMode`:

### MediaRecorder Path

Used by Soniox and Local OpenAI-compatible. (All other cloud streaming providers use the PCM16 path.)

1. `getDisplayMedia({ audio: true })` → `MediaStream`
2. `MediaRecorder` with `audio/webm;codecs=opus` (or fallback)
3. `ondataavailable` every 100ms → `Blob` chunks
4. Chunks forwarded to `provider.sendAudio(blob)`

### PCM16 Path

Used by Volcengine, Groq, SiliconFlow, Mistral AI, Deepgram, AssemblyAI, ElevenLabs, and whisper.cpp.

1. `getDisplayMedia({ audio: true })` → `MediaStream`
2. `AudioProcessor` with **AudioWorklet** (preferred) or **ScriptProcessorNode** (fallback)
3. Resampled to 16 kHz mono
4. Float32 → Int16 conversion → `ArrayBuffer` chunks
5. Chunks forwarded to `provider.sendAudio(buffer)`
