# System Overview

DeLive is an Electron desktop application with a clear separation between the **Main process** (Node.js runtime) and the **Renderer process** (Chromium browser context).

## Architecture Diagram

```mermaid
block-beta
  columns 1

  block:shell["🖥️ Desktop Shell — Electron Main Process"]
    columns 3
    entry["main.ts → mainWindow\ncaptionWindow · tray · shortcuts"]
    space
    security["IPC Security · safeStorage\nAuto Updater · Diagnostics"]

    volc["🌐 Volc Proxy\n/ws/volc\nPort 23456"]
    api["⚡ API Server\n/api/v1/*\n/ws/live"]
    runtime["🔧 Local Runtime\nwhisper.cpp\nLifecycle Mgmt"]
  end

  shell -- "IPC (contextBridge)" --> renderer

  block:renderer["⚛️ Renderer — React SPA"]
    columns 3
    hooks["useASR\nCaptureManager\nProviderSession"]
    stores["Zustand Stores\nsessionStore · settingsStore\nuiStore · topicStore · tagStore"]
    ui["UI Components\nLive · Review · Topics\n5 Themes × 2 Modes"]

    providers["Provider Registry\n6 ASR Backends"]
    persistence["Session Repository\nIndexedDB + Memory Cache"]
    space
  end

  renderer -- "REST API / WebSocket" --> ecosystem

  block:ecosystem["🌍 External Ecosystem"]
    columns 3
    mcp["MCP Server\n(stdio)"]
    skill["Agent Skill\nDefinition"]
    ws["WebSocket\nClients"]
  end
```

## Recording Data Flow

```mermaid
flowchart LR
  A["👤 User clicks Start"] --> B["useASR resolves\nProvider config"]
  B --> C["ProviderSession\nconnects backend"]
  C --> D["CaptureManager\ngetDisplayMedia"]
  D --> E["Audio Pipeline"]

  E --> F["ASR Provider\n→ Transcript events"]
  F --> G["sessionStore\n→ autosave IndexedDB"]

  G --> H["CaptionBridge\n→ Caption Window"]
  G --> I["apiBroadcast\n→ WebSocket clients"]

  style A fill:#0ea5e9,color:#fff
  style F fill:#8b5cf6,color:#fff
  style H fill:#f59e0b,color:#fff
  style I fill:#10b981,color:#fff
```

## API Request Flow

```mermaid
sequenceDiagram
  participant C as External Client
  participant S as API Server<br/>(Main Process)
  participant R as Renderer<br/>(React SPA)
  participant DB as IndexedDB<br/>+ Memory Cache

  C->>S: GET /api/v1/sessions
  S->>S: Check Bearer token auth
  S->>R: IPC request via apiIpc
  R->>DB: Read from sessionStore cache
  DB-->>R: Session data (< 5ms)
  R-->>S: IPC reply
  S-->>C: JSON response (< 5s timeout)
```

## Provider Architecture

```mermaid
flowchart TB
  subgraph cloud["☁️ Cloud Providers"]
    soniox["Soniox V4\nReal-time streaming\nTranslation · Diarization"]
    volc["Volcengine\nReal-time streaming\nChinese-oriented"]
    groq["Groq\nWindowed batch\nWhisper large-v3-turbo"]
    silicon["SiliconFlow\nWindowed batch\nSenseVoice · Qwen"]
  end

  subgraph local["💻 Local Providers"]
    openai["OpenAI-compatible\nWindowed batch\nOllama / any endpoint"]
    whisper["whisper.cpp\nElectron-managed\nFully offline"]
  end

  registry["Provider Registry\n(Singleton)"]
  capture["CaptureManager"]

  registry --> soniox & volc & groq & silicon & openai & whisper
  capture -->|"MediaRecorder\n(streaming)"| soniox & volc
  capture -->|"AudioWorklet\nPCM16 (batch)"| groq & silicon & openai & whisper

  style registry fill:#6366f1,color:#fff
  style capture fill:#0ea5e9,color:#fff
  style cloud fill:#f0f9ff,stroke:#0ea5e9
  style local fill:#f0fdf4,stroke:#10b981
```

## Key Architectural Decisions

### IndexedDB in Renderer

All session data lives in the Renderer's IndexedDB with an in-memory cache in `sessionRepository`. The Main process cannot access IndexedDB directly. When the API Server needs data, it sends an IPC request to the Renderer, which responds from the cache (< 5ms latency).

### Single HTTP Server

Port 23456 hosts the Volcengine WebSocket proxy (`/ws/volc`), the REST API (`/api/v1/*`), and the live transcript WebSocket (`/ws/live`) on a single `http.createServer()`.

### MCP as Separate Process

The MCP server is a standalone Node.js script, not embedded in Electron. Claude Desktop launches it as a child process. It communicates with DeLive via the REST API. This design means DeLive and the MCP server can crash independently.

### Provider Registry

Six ASR backends are registered in a singleton `ProviderRegistry`. Each provider implements a common `ASRProvider` contract but uses different audio formats and transport methods. The `CaptureManager` selects the right audio pipeline based on provider capabilities.

## Module Map

| Layer | Key Modules |
|-------|------------|
| Desktop Shell | `main.ts`, `mainWindow.ts`, `captionWindow.ts`, `tray.ts`, `shortcuts.ts` |
| IPC | `appIpc.ts`, `captionIpc.ts`, `safeStorageIpc.ts`, `updaterIpc.ts`, `diagnosticsIpc.ts`, `apiIpc.ts`, `localRuntimeIpc.ts` |
| API | `apiServer.ts`, `apiBroadcast.ts` |
| Proxy | `volcProxy.ts`, `shared/volcProxyCore.ts` |
| Renderer App | `App.tsx`, `components/*`, `i18n/*` |
| Orchestration | `useASR.ts`, `captureManager.ts`, `providerSession.ts`, `captionBridge.ts` |
| Providers | `registry.ts`, `base.ts`, `windowedBatch.ts`, `implementations/*` |
| State | `sessionStore.ts`, `settingsStore.ts`, `uiStore.ts`, `topicStore.ts`, `tagStore.ts`, `transcriptStore.ts` (backward-compat facade) |
| Persistence | `sessionRepository.ts`, `sessionStorage.ts`, `settingsStorage.ts`, `backupStorage.ts` |
| Contracts | `shared/electronApi.ts`, `electron/preload.ts` |
