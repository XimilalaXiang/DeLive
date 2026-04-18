# 系统概览

DeLive 是一个 Electron 桌面应用，在 **主进程**（Node.js 运行时）和 **渲染进程**（Chromium 浏览器上下文）之间有清晰的分离。

## 架构图

```mermaid
flowchart TB
  subgraph shell["🖥️ 桌面外壳 — Electron 主进程"]
    direction TB
    entry["main.ts → mainWindow · captionWindow · tray · shortcuts"]
    subgraph services["核心服务"]
      direction LR
      volc["🌐 火山引擎代理\n/ws/volc · 端口 23456"]
      api["⚡ API 服务器\n/api/v1/* · /ws/live"]
      runtime["🔧 本地 Runtime\nwhisper.cpp 生命周期"]
    end
    infra["IPC 安全 · safeStorage · 自动更新 · 诊断"]
  end

  shell -->|"IPC (contextBridge)"| renderer

  subgraph renderer["⚛️ 渲染进程 — React SPA"]
    direction TB
    subgraph orchestration["编排层"]
      direction LR
      hooks["useASR\nCaptureManager\nProviderSession"]
      stores["Zustand Stores\nsessionStore · settingsStore\nuiStore · topicStore · tagStore"]
      ui["UI 组件\nLive · Review · Topics\n5 主题 × 2 模式"]
    end
    subgraph data["数据层"]
      direction LR
      providers["Provider 注册表\n(6 种 ASR 后端)"]
      persistence["Session 仓库\nIndexedDB + 内存缓存"]
    end
  end

  renderer -->|"REST API / WebSocket"| ecosystem

  subgraph ecosystem["🌍 外部生态"]
    direction LR
    mcp["MCP 服务器 (stdio)"]
    skill["Agent Skill 定义"]
    ws["WebSocket 客户端"]
  end

  style shell fill:#1e293b,stroke:#0ea5e9,stroke-width:2px,color:#e2e8f0
  style renderer fill:#1e1b2e,stroke:#8b5cf6,stroke-width:2px,color:#e2e8f0
  style ecosystem fill:#1a2e1a,stroke:#10b981,stroke-width:2px,color:#e2e8f0
  style services fill:#0f172a,stroke:#334155,color:#e2e8f0
  style orchestration fill:#1e1b3a,stroke:#4c1d95,color:#e2e8f0
  style data fill:#1e1b3a,stroke:#4c1d95,color:#e2e8f0
  style volc fill:#0c4a6e,stroke:#0ea5e9,color:#e2e8f0
  style api fill:#0c4a6e,stroke:#0ea5e9,color:#e2e8f0
  style runtime fill:#0c4a6e,stroke:#0ea5e9,color:#e2e8f0
  style providers fill:#312e81,stroke:#8b5cf6,color:#e2e8f0
  style persistence fill:#312e81,stroke:#8b5cf6,color:#e2e8f0
  style mcp fill:#064e3b,stroke:#10b981,color:#e2e8f0
  style skill fill:#064e3b,stroke:#10b981,color:#e2e8f0
  style ws fill:#064e3b,stroke:#10b981,color:#e2e8f0
```

## 录制数据流

```mermaid
flowchart LR
  A["👤 用户点击开始"] --> B["useASR 解析\nProvider 配置"]
  B --> C["ProviderSession\n连接后端"]
  C --> D["CaptureManager\ngetDisplayMedia"]
  D --> E["音频管线"]

  E --> F["ASR Provider\n→ 转录事件"]
  F --> G["sessionStore\n→ 自动保存 IndexedDB"]

  G --> H["CaptionBridge\n→ 字幕窗口"]
  G --> I["apiBroadcast\n→ WebSocket 客户端"]

  style A fill:#0ea5e9,color:#fff
  style F fill:#8b5cf6,color:#fff
  style H fill:#f59e0b,color:#fff
  style I fill:#10b981,color:#fff
```

## API 请求流程

```mermaid
sequenceDiagram
  participant C as 外部客户端
  participant S as API 服务器<br/>(主进程)
  participant R as 渲染进程<br/>(React SPA)
  participant DB as IndexedDB<br/>+ 内存缓存

  C->>S: GET /api/v1/sessions
  S->>S: 检查 Bearer token 鉴权
  S->>R: 通过 apiIpc 发送 IPC 请求
  R->>DB: 从 sessionStore 缓存读取
  DB-->>R: 会话数据 (< 5ms)
  R-->>S: IPC 回复
  S-->>C: JSON 响应 (< 5s 超时)
```

## Provider 架构

```mermaid
flowchart TB
  subgraph cloud["☁️ 云端 Provider"]
    soniox["Soniox V4\n实时流式\n翻译 · 说话人区分"]
    volc["火山引擎\n实时流式\n中文优化"]
    groq["Groq\n窗口批处理\nWhisper large-v3-turbo"]
    silicon["硅基流动\n窗口批处理\nSenseVoice · Qwen"]
  end

  subgraph local["💻 本地 Provider"]
    openai["OpenAI 兼容\n窗口批处理\nOllama / 任意端点"]
    whisper["whisper.cpp\nElectron 管理\n完全离线"]
  end

  registry["Provider 注册表\n(单例)"]
  capture["CaptureManager"]

  registry --> soniox & volc & groq & silicon & openai & whisper
  capture -->|"MediaRecorder\n(流式)"| soniox & volc
  capture -->|"AudioWorklet\nPCM16 (批处理)"| groq & silicon & openai & whisper

  style registry fill:#6366f1,color:#fff
  style capture fill:#0ea5e9,color:#fff
  style cloud fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
  style local fill:#f0fdf4,stroke:#22c55e,stroke-width:2px
```

## 关键架构决策

### Renderer 中的 IndexedDB

所有会话数据存储在渲染进程的 IndexedDB 中，配合 `sessionRepository` 中的内存缓存。主进程无法直接访问 IndexedDB。当 API 服务器需要数据时，通过 IPC 请求渲染进程，后者从缓存响应（< 5ms 延迟）。

### 单一 HTTP 服务器

端口 23456 在一个 `http.createServer()` 上托管火山引擎 WebSocket 代理（`/ws/volc`）、REST API（`/api/v1/*`）和实时转录 WebSocket（`/ws/live`）。

### MCP 作为独立进程

MCP 服务器是独立的 Node.js 脚本，未嵌入 Electron。Claude Desktop 将其作为子进程启动，通过 REST API 与 DeLive 通信。这种设计意味着 DeLive 和 MCP 服务器可以独立崩溃。

### Provider 注册机制

六种 ASR 后端注册在单例 `ProviderRegistry` 中。每个 Provider 实现通用的 `ASRProvider` 契约，但使用不同的音频格式和传输方法。`CaptureManager` 根据 Provider 能力选择合适的音频管线。

## 模块映射

| 层 | 关键模块 |
|----|---------|
| 桌面外壳 | `main.ts`, `mainWindow.ts`, `captionWindow.ts`, `tray.ts`, `shortcuts.ts` |
| IPC | `appIpc.ts`, `captionIpc.ts`, `safeStorageIpc.ts`, `updaterIpc.ts`, `diagnosticsIpc.ts`, `apiIpc.ts`, `localRuntimeIpc.ts` |
| API | `apiServer.ts`, `apiBroadcast.ts` |
| 代理 | `volcProxy.ts`, `shared/volcProxyCore.ts` |
| 渲染应用 | `App.tsx`, `components/*`, `i18n/*` |
| 编排 | `useASR.ts`, `captureManager.ts`, `providerSession.ts`, `captionBridge.ts` |
| Provider | `registry.ts`, `base.ts`, `windowedBatch.ts`, `implementations/*` |
| 状态 | `sessionStore.ts`, `settingsStore.ts`, `uiStore.ts`, `topicStore.ts`, `tagStore.ts`, `transcriptStore.ts`（向后兼容 facade） |
| 持久化 | `sessionRepository.ts`, `sessionStorage.ts`, `settingsStorage.ts`, `backupStorage.ts` |
| 契约 | `shared/electronApi.ts`, `electron/preload.ts` |
