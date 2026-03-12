<img src="assets/header.png" alt="DeLive Header">

<div align="center">

# DeLive

**System Audio Capture | Multi-Provider ASR | Local-First AI Review Workspace**

English | [简体中文](./README_ZH.md) | [繁體中文](./README_TW.md) | [日本語](./README_JA.md)

[![Version](https://img.shields.io/github/v/release/XimilalaXiang/DeLive?label=Version&color=blue)](https://github.com/XimilalaXiang/DeLive/releases)
[![License](https://img.shields.io/github/license/XimilalaXiang/DeLive?label=License&color=green)](https://github.com/XimilalaXiang/DeLive/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://github.com/XimilalaXiang/DeLive/releases)
[![Platform](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://github.com/XimilalaXiang/DeLive/releases)
[![Platform](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](https://github.com/XimilalaXiang/DeLive/releases)
[![Downloads](https://img.shields.io/github/downloads/XimilalaXiang/DeLive/total?label=Downloads&color=orange)](https://github.com/XimilalaXiang/DeLive/releases)
[![Stars](https://img.shields.io/github/stars/XimilalaXiang/DeLive?style=social)](https://github.com/XimilalaXiang/DeLive)

[Core Features](#-core-features) • [Project Map](#-project-map) • [Architecture](#-system-architecture) • [Providers](#-supported-asr-providers) • [Quick Start](#-quick-start)

</div>

DeLive is a desktop transcription workspace for system audio. It captures whatever your computer is playing, routes the audio through the ASR backend that fits the job, keeps everything on your machine, and turns completed transcripts into searchable history with a full AI Review Desk — rich Markdown-rendered chat, Q&A threads, structured briefings, and mind maps.

<div align="center">
<img width="800" alt="DeLive Screenshot" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />
</div>

## 🎯 Core Features

- **System-audio capture for real desktop use**. Browser video, live streams, meetings, courses, podcasts, or any other playback source that can be shared with system audio.
- **Six ASR backends behind one UI**. Soniox, Volcengine, Groq, SiliconFlow, OpenAI-compatible local services, and local `whisper.cpp`.
- **Provider-aware capture pipeline**. DeLive switches between `MediaRecorder` and `AudioWorklet` PCM16 capture based on the selected provider's transport requirements.
- **Three execution modes in one app**. True realtime streaming, windowed batch retranscription, and Electron-managed local runtime execution.
- **Session lifecycle management**. Draft sessions, autosave while recording, interrupted-session recovery on next launch, and completed-session history.
- **Floating caption overlay**. Separate always-on-top caption window with source / translated / dual display modes, drag/lock control, and style customization.
- **Soniox-specific bilingual and speaker-aware flows**. Realtime translation, dual-line captions, diarization tokens, and speaker-grouped session preview.
- **Dedicated AI Review Desk**. A full-page workspace (not a modal) for finished sessions with animated tab navigation (Overview, Transcript, Chat, Mind Map) and keyboard arrow support.
- **Rich AI Chat**. Multi-thread conversation with GFM Markdown rendering, syntax-highlighted code blocks with one-click copy, user/AI avatars, hover Copy/Regenerate actions on every message, animated thinking-dots indicator, auto-resizing composer (1–6 rows, Enter to send), floating scroll-to-bottom button, and per-thread delete.
- **Structured AI briefing**. Summary, action items, keywords, chapters, title/tag suggestions, and cited Q&A answers — all persisted into the session.
- **Mind maps**. Generate Markmap-compatible Markdown, edit it live, and export SVG or PNG directly from the Review Desk.
- **Polished Transcript tab**. Timestamps in the left gutter, color-coded speaker badges, automatic consecutive same-speaker merging, and hover highlight.
- **Local model workflows**. Detect local services, discover installed models, optionally pull models from Ollama, and import/download `whisper.cpp` binaries and models.
- **Local-first persistence**. Sessions, tags, and settings live in IndexedDB/localStorage, while secrets go through Electron `safeStorage` when OS encryption is available.
- **Shared design system**. Composable UI primitives (Button, Badge, Switch, EmptyState, StatusIndicator, DialogShell) with semantic `warning`/`success`/`info` color tokens across five light and dark themes.
- **Desktop integration**. Tray behavior, global shortcut, auto-launch, updater, diagnostics export, source picker, and typed preload APIs.
- **Security hardening**. Trusted-window IPC checks, CSP injection, navigation guard, path allowlist, redacted diagnostics, and encrypted secret storage.

## 🧩 Project Map

| Area | Key files | Responsibility |
|------|-----------|----------------|
| Desktop shell | `electron/main.ts`, `electron/mainWindow.ts`, `electron/captionWindow.ts`, `electron/tray.ts`, `electron/shortcuts.ts` | Starts Electron, owns native windows, tray behavior, shortcuts, updater lifecycle, and app shutdown. |
| Renderer app | `frontend/src/App.tsx`, `frontend/src/components/*`, `frontend/src/i18n/*` | Main settings, recording, history, preview, and caption-control UI. Workspace view (Live / Review Desk / Settings) is driven by Zustand. |
| ASR orchestration | `frontend/src/hooks/useASR.ts`, `frontend/src/services/captureManager.ts`, `frontend/src/services/providerSession.ts`, `frontend/src/services/captionBridge.ts` | Resolves provider setup, starts the right audio pipeline, forwards transcript events, and mirrors text to the caption overlay. |
| Provider abstraction | `frontend/src/providers/registry.ts`, `frontend/src/providers/implementations/*` | Normalizes six backends behind one contract and capability model. |
| Session intelligence | `frontend/src/stores/sessionStore.ts`, `frontend/src/services/aiPostProcess.ts`, `frontend/src/components/ReviewDeskView.tsx`, `frontend/src/components/PreviewModal.tsx` | Session persistence, autosave/recovery, AI briefing, Q&A, mind maps, tagging, and speaker label editing. |
| Review Desk UI | `frontend/src/components/review/SessionTabBar.tsx`, `frontend/src/components/review/OverviewTab.tsx`, `frontend/src/components/review/TranscriptTab.tsx`, `frontend/src/components/review/ChatTab.tsx`, `frontend/src/components/review/MindMapTab.tsx`, `frontend/src/components/review/MarkdownRenderer.tsx` | Animated tab bar with keyboard navigation, per-tab content views, GFM Markdown rendering with syntax highlighting, and mind map editing. |
| Shared UI system | `frontend/src/components/ui/*` | Button, Badge, Switch, EmptyState, StatusIndicator, DialogShell primitives with semantic color tokens across five themes. |
| Local model/runtime tooling | `frontend/src/utils/localModelSetup.ts`, `frontend/src/utils/localRuntimeManager.ts`, `frontend/src/components/LocalModelSetupGuide.tsx`, `frontend/src/components/BundledRuntimeSetupGuide.tsx`, `electron/localRuntime.ts` | Detects local services, checks models, supports Ollama pull, imports/downloads `whisper.cpp` assets, and starts/stops the local runtime. |
| Shared contracts | `shared/electronApi.ts`, `electron/preload.ts`, `shared/volcProxyCore.ts` | Typed bridge between renderer and main process plus shared protocol helpers for the embedded Volcengine proxy. |
| Debug and release support | `server/`, `scripts/`, `.github/workflows/release.yml` | Standalone Volc proxy debugging, icon/runtime staging scripts, release-note generation, and tagged multi-platform release builds. |
| Design references | `design-system/delive/MASTER.md` | Product and visual reference material used during UI iteration. Not part of the runtime path. |

## 🔄 Recording Lifecycle

1. `App.tsx` initializes storage, theme, settings, tags, and saved sessions.
2. `useASR` asks `ProviderSessionManager` to resolve the selected provider's capabilities and connect.
3. `CaptureManager` requests system audio through `getDisplayMedia` and chooses either `MediaRecorder` or `AudioWorklet` PCM16 capture.
4. Provider events flow into `sessionStore`, while `CaptionBridge` mirrors stable and non-final text to the floating caption window.
5. `sessionStore` builds session snapshots, autosaves drafts, and restores interrupted work on next launch.
6. Completed sessions open in the preview workspace for transcript review, AI briefing, Q&A, mind map generation, tagging, and export.

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Desktop Shell"
        EM[Electron Main Process]
        WIN[Main Window]
        CAP[Caption Overlay Window]
        DESK[Tray / Shortcut / Auto Launch / Updater]
        SEC[IPC Security / SafeStorage / Diagnostics]
    end

    subgraph "Renderer"
        UI[React App]
        STORES[Zustand Stores]
        CFG[Provider and Runtime Setup]
        PREV[History / Preview / AI Workspace]
    end

    subgraph "Orchestration"
        ASR[useASR]
        CAPMGR[CaptureManager]
        PROVSESS[ProviderSessionManager]
        CAPBR[CaptionBridge]
    end

    subgraph "Capture Pipeline"
        GDM[getDisplayMedia]
        MR[MediaRecorder<br/>WebM / Opus]
        AP[AudioWorklet<br/>PCM16 16kHz]
    end

    subgraph "Provider Layer"
        REG[Provider Registry]
        SON[Soniox]
        VOL[Volcengine]
        GRQ[Groq]
        SIL[SiliconFlow]
        LOA[Local OpenAI-compatible]
        WCP[whisper.cpp Runtime]
    end

    subgraph "Electron Services"
        PROXY[Embedded Volc Proxy]
        RTM[Local Runtime Controller]
    end

    subgraph "Persistence"
        REPO[Session Repository]
        IDB[IndexedDB]
        LS[localStorage]
        SAFE[safeStorage]
    end

    UI --> STORES
    UI --> CFG
    UI --> PREV
    UI --> ASR

    ASR --> CAPMGR
    ASR --> PROVSESS
    ASR --> CAPBR

    CAPMGR --> GDM
    GDM --> MR
    GDM --> AP

    PROVSESS --> REG
    REG --> SON
    REG --> VOL
    REG --> GRQ
    REG --> SIL
    REG --> LOA
    REG --> WCP

    MR --> SON
    MR --> LOA
    AP --> VOL
    AP --> GRQ
    AP --> SIL
    AP --> WCP

    VOL --> PROXY
    WCP --> RTM

    STORES --> REPO
    REPO --> IDB
    REPO --> LS
    CFG --> SAFE

    UI --> EM
    EM --> WIN
    EM --> CAP
    EM --> DESK
    EM --> SEC
    EM --> PROXY
    EM --> RTM
    CAPBR --> CAP

    style UI fill:#61dafb,color:#000
    style EM fill:#334155,color:#fff
    style CAP fill:#f472b6,color:#000
    style REG fill:#f59e0b,color:#000
    style PROXY fill:#10b981,color:#fff
    style RTM fill:#0f766e,color:#fff
    style SEC fill:#ef4444,color:#fff
    style SAFE fill:#a855f7,color:#fff
    style IDB fill:#3b82f6,color:#fff
```

### Architecture Overview

| Layer | Main components | Notes |
|-------|-----------------|-------|
| Desktop shell | Electron main process, main window, caption window, tray, updater, diagnostics | Owns native lifecycle, source picking, caption overlay, and OS integration. |
| Renderer | React UI, Zustand stores, history/preview workspace, settings panels | Handles recording flow, configuration, session review, and user actions. |
| Orchestration | `useASR`, `CaptureManager`, `ProviderSessionManager`, `CaptionBridge` | Keeps provider logic separate from capture and UI. |
| Provider layer | Registry plus 6 implementations | Unifies realtime cloud, windowed batch cloud, local service, and local runtime flows. |
| Electron services | Embedded Volc proxy, local runtime controller, safe-storage IPC, diagnostics IPC | Provides features that the browser environment cannot do directly. |
| Persistence | Session repository, IndexedDB, localStorage, `safeStorage` | Autosaves drafts, restores interrupted sessions, and stores secrets separately from general settings. |
| Shared contracts | Typed preload bridge and shared helper modules | Keeps renderer/main contracts explicit and safer to evolve. |

## 🔌 Supported ASR Providers

| Provider | Type | Transport | Audio path | Highlights |
|----------|------|-----------|------------|------------|
| **Soniox V4** | Cloud | Realtime streaming | `MediaRecorder` (`webm/opus`) → WebSocket | Token-level realtime transcription, realtime translation, bilingual captions, speaker diarization |
| **Volcengine** | Cloud | Realtime streaming | `AudioWorklet` PCM16 → embedded proxy → WebSocket | Chinese-oriented realtime path; proxy injects required headers from Electron |
| **Groq** | Cloud | Windowed batch retranscription | `AudioWorklet` PCM16 → WAV → REST | Whisper `large-v3-turbo` / `large-v3` style flow with quasi-realtime session updates |
| **SiliconFlow** | Cloud | Windowed batch retranscription | `AudioWorklet` PCM16 → WAV → REST | SenseVoice, TeleSpeech, and Qwen Omni-backed transcription flow |
| **Local OpenAI-compatible** | Local service | Windowed batch retranscription | `MediaRecorder` (`webm/opus`) → `/v1/audio/transcriptions` | Works with Ollama or other compatible gateways; supports service/model discovery and optional Ollama pull |
| **Local `whisper.cpp`** | Local runtime | Electron-managed local runtime | `AudioWorklet` PCM16 → local `/inference` | Starts `whisper-server`, manages binary/model assets, and stays fully local |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (`release.yml` uses Node 20 in CI)
- One provider path:
  - **Soniox**: API key from [soniox.com](https://soniox.com)
  - **Volcengine**: APP ID and Access Token
  - **Groq**: API key from [groq.com](https://groq.com)
  - **SiliconFlow**: API key from [siliconflow.cn](https://siliconflow.cn)
  - **Local OpenAI-compatible**: local service exposing `/v1/models` and `/v1/audio/transcriptions`
  - **Local `whisper.cpp`**: `whisper-server` plus a local `.bin` or `.gguf` model, or let DeLive import/download them

### Installation

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
```

### Development

```bash
npm run dev
```

`npm run dev` starts Vite and Electron together. The Volcengine proxy is embedded in the Electron main process, so normal desktop development does not need a separate backend.

For standalone proxy debugging:

```bash
npm run dev:server
```

### Quality Checks

```bash
npm run check
```

`npm run check` runs frontend lint, frontend tests, and a full app build.

To run just the frontend tests:

```bash
npm run test:frontend
```

Current suite status: **184 tests across 22 files** with coverage around provider config, transcript state/stabilization, subtitle export, session lifecycle/repository, storage, and AI post-process parsing.

### Build

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
npm run dist:all
```

Artifacts are written to `release/`.

### Optional: Stage `whisper.cpp` Into Packaged Builds

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
```

If `local-runtimes/whisper_cpp/whisper-server(.exe)` exists at build time, `electron-builder` packages it as an extra resource. End users can still import or download binaries and models later from the UI.

## 📖 Usage

### Typical Recording Flow

1. Open settings and choose a provider.
2. Fill in credentials or local runtime details, then run **Test Config**.
3. Click **Start Recording**.
4. Pick a screen or window and make sure audio sharing is enabled.
5. Watch partial and final text update in the main window and, optionally, the floating caption overlay.
6. Stop recording and open the saved session from History for review, AI actions, or export.

### Caption Overlay

- Toggle the floating caption window from the main UI.
- Adjust font, colors, width, line count, shadow, and position.
- Switch between source, translated, and dual modes when the provider supplies translation output.
- Use draggable/interactive states to reposition the overlay without closing it.

### AI Review Desk

Completed sessions open in a dedicated full-page Review Desk (not a modal) with an animated sliding tab bar and keyboard arrow navigation:

- **Overview tab**: AI briefing — summary, action items, keywords, chapters, title/tag suggestions, and one-click apply
- **Transcript tab**: Timestamped segments in a left gutter, color-coded speaker badges, consecutive same-speaker merging, hover highlight, and SRT/VTT/TXT export
- **Chat tab**: Multi-thread AI conversation — GFM Markdown rendering with syntax-highlighted code blocks (one-click copy), user/AI avatars, hover Copy/Regenerate actions, animated thinking-dots indicator, auto-resizing composer (Enter to send), floating scroll-to-bottom button, and per-thread delete
- **Mind Map tab**: Generate Markmap-compatible Markdown, edit it live, and export SVG or PNG
- **Metadata actions**: apply suggested title/tags and rename speaker labels for diarized sessions

### Local OpenAI-compatible Services

1. Select **Local OpenAI-compatible**.
2. Fill in `Base URL` and `Model`.
3. Use the local-model guide to probe the service and list installed models.
4. If the detected service is Ollama, DeLive can pull the selected model directly from the app.

### Local `whisper.cpp` Runtime

1. Select **Local whisper.cpp**.
2. Prepare the runtime binary by importing an existing `whisper-server` file or downloading a recommended official release asset.
3. Prepare the model by choosing, importing, or downloading a `.bin` / `.gguf` file.
4. Start the runtime or run **Test Config**.
5. Record normally; Electron manages the runtime lifecycle through IPC.

### History, Backup, and Recovery

- Sessions can be renamed, tagged, searched, and exported as TXT, SRT, or VTT.
- Recording drafts are autosaved and incomplete sessions can be restored after an interrupted launch.
- Full local data can be exported/imported for backup or migration.
- Diagnostics export generates a redacted JSON bundle with system info and recent logs for troubleshooting.

## 📁 Project Structure

```text
DeLive/
├── electron/                         # Electron main process, windows, tray, IPC, updater, runtime control
├── frontend/                         # React renderer app, providers, stores, UI components, tests
├── shared/                           # Shared TypeScript contracts for preload/renderer/main and proxy helpers
├── server/                           # Standalone Volcengine proxy used mainly for debugging
├── local-runtimes/                   # Optional packaged runtime assets (for whisper.cpp staging)
├── scripts/                          # Icon generation, runtime fetch/stage, release notes
├── design-system/                    # Design reference material
├── assets/                           # README and branding assets
├── build/                            # Electron-builder icons and packaging resources
├── .github/workflows/release.yml     # Tag-triggered quality + release pipeline
├── README.md
└── package.json
```

Generated outputs such as `dist-electron/`, `release/`, and dependency folders are omitted here.

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop app | Electron 40 |
| Frontend | React 18.3 + TypeScript 5.6 + Vite 6 |
| Styling | Tailwind CSS 3.4 |
| State management | Zustand 4.5 |
| Testing | Vitest 4 |
| Audio processing | `MediaRecorder`, `AudioWorklet`, WAV conversion utilities |
| Desktop services | Electron main-process IPC, Express, `ws` |
| Persistence | IndexedDB, localStorage, Electron `safeStorage` |
| AI review | OpenAI-compatible chat completions for briefing, Q&A, and mind maps |
| Packaging | `electron-builder` |
| Release automation | GitHub Actions tag workflow |

## 🔒 Security

| Feature | Description |
|---------|-------------|
| Context isolation | `contextIsolation: true`, `nodeIntegration: false` |
| Trusted IPC senders | Sensitive handlers verify the caller belongs to a registered trusted window |
| Content Security Policy | CSP is injected at the Electron layer and allows only the required connect targets |
| Navigation guard | Unexpected renderer navigation is blocked |
| Path allowlist | File-path checks are limited to safe roots such as `userData`, home, desktop, downloads, and documents |
| Secret storage | API keys are stored through Electron `safeStorage` when OS encryption is available |
| Diagnostics hygiene | Exported diagnostics redact secret-looking fields before writing the JSON bundle |

## ⌨️ Keyboard Shortcut

| Shortcut | Function |
|----------|----------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Show or hide the main window |

## 🔧 Extending Providers

1. Add a provider implementation under `frontend/src/providers/implementations/`.
2. Define accurate `ASRProviderInfo` metadata, required fields, and capability flags.
3. Register the provider in `frontend/src/providers/registry.ts`.
4. Add config-test logic in `frontend/src/utils/providerConfigTest.ts` if the provider supports validation.
5. For local-service or local-runtime flows, wire model/runtime helpers in `frontend/src/utils/localModelSetup.ts` or `frontend/src/utils/localRuntimeManager.ts`.
6. If the provider needs custom headers or native process control, add the Electron-side support in `electron/`.

## ⚠️ Notes

1. **System requirements**: Windows 10+, macOS 13+, or Linux with PulseAudio loopback support.
2. **Volcengine proxy**: normal desktop usage does not require a separate backend process; Electron starts the proxy internally.
3. **Local OpenAI-compatible mode**: discovery expects `/v1/models`, while transcription expects `/v1/audio/transcriptions`.
4. **`whisper.cpp` mode**: packaged binaries are optional; users can also import or download runtime assets later.
5. **Tray behavior**: closing the main window hides to tray instead of exiting the app.
6. **Auto-launch**: currently supported on Windows and macOS.
7. **Auto-update**: supported on Windows, macOS, and Linux AppImage builds.

### 🛡️ Windows SmartScreen Warning

Windows may show a SmartScreen warning the first time you launch DeLive. That is expected for unsigned or newly distributed apps.

1. Click **More info**.
2. Click **Run anyway**.

You can also inspect the source code directly and verify released binaries independently.

## 📄 License

Apache License 2.0

## 🙏 Acknowledgments

- [Soniox](https://soniox.com) for realtime speech recognition APIs
- [Volcengine](https://www.volcengine.com) for Chinese-focused speech recognition
- [Groq](https://groq.com) for high-performance Whisper inference
- [SiliconFlow](https://siliconflow.cn) for speech and multimodal ASR services
- [Ollama](https://ollama.com) for local model workflows
- [`whisper.cpp`](https://github.com/ggml-org/whisper.cpp) for local open-source runtime support
- [BiBi-Keyboard](https://github.com/BryceWG/BiBi-Keyboard) for multi-provider architecture inspiration

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=XimilalaXiang/DeLive&type=date&legend=top-left)](https://www.star-history.com/#XimilalaXiang/DeLive&type=date&legend=top-left)

**Made by [XimilalaXiang](https://github.com/XimilalaXiang)**

</div>
