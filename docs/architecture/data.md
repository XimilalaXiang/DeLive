# Data & Persistence

## Session Data Model

The core data type is `TranscriptSession`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `schemaVersion` | `number` | Currently 3 |
| `title` | `string` | Display title |
| `date` / `time` | `string` | `YYYY-MM-DD` / `HH:mm` |
| `createdAt` / `updatedAt` | `number` | Unix milliseconds |
| `transcript` | `string` | Plain text transcript |
| `translatedTranscript` | `TranscriptTranslationData` | Optional translated text |
| `duration` | `number` | Duration in ms |
| `tokens` | `TranscriptTokenData[]` | Timestamped tokens |
| `speakers` | `TranscriptSpeaker[]` | Speaker labels |
| `segments` | `TranscriptSegment[]` | Timestamped segments |
| `postProcess` | `TranscriptPostProcess` | AI briefing output |
| `askHistory` | `TranscriptAskTurn[]` | Q&A conversation turns |
| `mindMap` | `TranscriptMindMap` | Mind map data |
| `topicId` | `string` | Associated topic |
| `tagIds` | `string[]` | Associated tags |
| `providerId` | `string` | ASR provider used |
| `status` | `TranscriptSessionStatus` | `recording`, `interrupted`, `completed` |

## Storage Architecture

```
┌─────────────────────────────────────────┐
│  sessionStore (Zustand)                  │
│  Runtime state + sessions array          │
│  ↕ read/write                            │
├──────────────────────────────────────────┤
│  sessionRepository (in-memory cache)     │
│  cachedSessions: TranscriptSession[]     │
│  ↕ async persist                         │
├──────────────────────────────────────────┤
│  sessionStorage (IndexedDB)              │
│  DB: 'delive-app', store: 'sessions'     │
│  Index: 'updatedAt' (sorted retrieval)   │
└──────────────────────────────────────────┘
```

### IndexedDB Schema

Database `delive-app` at version 3 with four object stores:

| Store | Key Path | Indexes | Contents |
|-------|----------|---------|----------|
| `sessions` | `id` | `updatedAt` | Transcript sessions |
| `meta` | `key` | — | Migration flags |
| `settings` | `id` | — | Settings mirror |
| `tags` | `id` | — | Tags mirror |

### localStorage Keys

| Key | Contents |
|-----|----------|
| `desktoplive_settings` | App settings (authoritative source) |
| `desktoplive_tags` | Tags |
| `desktoplive_topics` | Topics |
| `language` | Interface language |
| `theme` | Light/dark mode preference |

Settings and tags are **mirrored** to IndexedDB for redundancy. On startup, if localStorage is empty but IndexedDB has data, the values are restored from IDB.

::: info
Topics are stored **only** in localStorage and are not included in backup/export.
:::

## Session Lifecycle

### Creation

`sessionStore.startNewSession()` creates a draft via `sessionRepository.createDraft()` with status `recording`, empty transcript, and metadata (timestamp, provider, source info).

### Autosave

Every transcript event triggers `scheduleCurrentSessionAutosave()` with a **1200ms debounce**. The autosave only persists when the snapshot has meaningful content (transcript, tokens, translated text, or post-process data).

### Completion

`sessionStore.endCurrentSession()` calls `sessionRepository.completeSession()` which sets `status: 'completed'`. If the session has no content, the draft is deleted instead.

### Recovery

On `loadSessions()`, any session with `status: 'recording'` is marked as `interrupted` and `wasInterrupted: true`. The first interrupted session with content becomes the `recoverySession`. Users can restore (load back into recording state) or dismiss it.

## Settings

`AppSettings` includes:

| Field | Type | Description |
|-------|------|-------------|
| `currentVendor` | `string` | Selected ASR provider |
| `providerConfigs` | `Record<string, ProviderConfigData>` | Per-provider credentials |
| `captionStyle` | `CaptionStyle` | Caption overlay appearance |
| `colorTheme` | `string` | Accent palette (`cyan`, `violet`, etc.) |
| `aiPostProcess` | `AiPostProcessConfig` | AI endpoint configuration |
| `openApi` | `OpenApiConfig` | API enable/token settings |
| `autoCheckUpdate` | `boolean` | Auto-update preference |

## Backup & Import

`backupStorage.ts` handles data portability:

- **Export**: `exportAllData()` → JSON file with sessions, tags, and settings (version 2.0, schema version 2)
- **Import overwrite**: replaces all data (preserves existing API key if set)
- **Import merge**: adds only new sessions and tags by ID
- **Normalization**: validates and repairs data structure on import
