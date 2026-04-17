# Project Structure

```
DeLive/
├── electron/                    # Electron main process
│   ├── main.ts                  # App entry, window creation, IPC registration
│   ├── mainWindow.ts            # Main window config and security
│   ├── captionWindow.ts         # Floating caption overlay
│   ├── tray.ts                  # System tray
│   ├── shortcuts.ts             # Global keyboard shortcuts
│   ├── desktopSource.ts         # Screen/window source picker
│   ├── autoUpdater.ts           # Auto-update lifecycle
│   ├── ipcSecurity.ts           # Trusted window verification, CSP, path allowlist
│   ├── appIpc.ts                # App lifecycle IPC handlers
│   ├── captionIpc.ts            # Caption window IPC
│   ├── safeStorageIpc.ts        # Encrypted secret storage
│   ├── updaterIpc.ts            # Update IPC
│   ├── diagnosticsIpc.ts        # Diagnostics export
│   ├── apiIpc.ts                # Open API data bridge (Main ↔ Renderer)
│   ├── apiServer.ts             # REST API + WebSocket server
│   ├── apiBroadcast.ts          # WebSocket client management and broadcasting
│   ├── volcProxy.ts             # HTTP server + Volcengine WebSocket proxy
│   ├── localRuntime.ts          # whisper.cpp process management
│   ├── localRuntimeFiles.ts     # Binary/model download and import
│   ├── localRuntimeShared.ts    # Runtime configuration constants
│   ├── localRuntimeIpc.ts       # Runtime management IPC
│   └── preload.ts               # contextBridge API exposure
│
├── frontend/                    # React renderer app
│   ├── src/
│   │   ├── App.tsx              # Main shell, view routing, global hooks
│   │   ├── components/          # UI components
│   │   │   ├── ui/              # Primitives: Button, Badge, Switch, etc.
│   │   │   ├── settings/        # ServiceSettingsPanel, GeneralSettingsPanel
│   │   │   ├── review/          # TabBar, Tabs, MarkdownRenderer
│   │   │   ├── runtime/         # whisper.cpp runtime UI
│   │   │   ├── ApiKeyConfig.tsx  # Settings orchestrator
│   │   │   ├── TopicsView.tsx   # Topic management
│   │   │   └── ...
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useASR.ts        # Main ASR orchestration hook
│   │   │   └── useApiIpcResponder.ts  # API bridge responder
│   │   ├── providers/           # ASR provider implementations
│   │   │   ├── registry.ts      # Provider registry singleton
│   │   │   ├── base.ts          # BaseASRProvider abstract class
│   │   │   ├── windowedBatch.ts # Windowed batch base class
│   │   │   └── implementations/ # 6 provider implementations
│   │   ├── services/            # Business logic services
│   │   │   ├── captureManager.ts    # Audio capture pipeline
│   │   │   ├── providerSession.ts   # Provider lifecycle
│   │   │   ├── captionBridge.ts     # Caption window text bridge
│   │   │   └── aiPostProcess.ts     # AI briefing, Q&A, mind map
│   │   ├── stores/              # Zustand state management
│   │   │   ├── sessionStore.ts  # Sessions, recording, AI actions
│   │   │   ├── settingsStore.ts # App settings
│   │   │   ├── uiStore.ts       # UI state, theme, language
│   │   │   ├── topicStore.ts    # Topics CRUD
│   │   │   ├── tagStore.ts      # Tags CRUD + filtering
│   │   │   └── transcriptStore.ts # Backward-compat facade
│   │   ├── utils/               # Utilities and storage
│   │   │   ├── sessionRepository.ts  # In-memory cache + IndexedDB
│   │   │   ├── sessionStorage.ts     # IndexedDB operations
│   │   │   ├── settingsStorage.ts    # Settings read/write
│   │   │   ├── backupStorage.ts      # Export/import
│   │   │   └── ...
│   │   ├── types/               # TypeScript type definitions
│   │   │   ├── index.ts         # Core app types
│   │   │   └── asr/             # ASR-specific types
│   │   ├── i18n/                # Internationalization
│   │   │   ├── index.ts         # i18n setup
│   │   │   └── locales/         # zh.ts, en.ts
│   │   └── themes.ts            # 5 color themes with light/dark tokens
│   ├── public/                  # Static assets
│   ├── vite.config.ts           # Vite build config
│   ├── vitest.config.ts         # Test config
│   ├── tailwind.config.js       # Tailwind with semantic tokens
│   └── eslint.config.js         # ESLint flat config
│
├── shared/                      # Shared between main and renderer
│   ├── electronApi.ts           # ElectronAPI interface + data types
│   └── volcProxyCore.ts         # Volcengine proxy protocol
│
├── server/                      # Standalone proxy (debug only)
│   └── src/index.ts             # Express server
│
├── mcp/                         # MCP server for AI agents
│   ├── delive-mcp-server.js     # Standalone stdio MCP server
│   ├── claude_desktop_config.json
│   └── package.json
│
├── skills/                      # Agent skill definitions
│   └── delive-transcript-analyzer/
│       └── SKILL.md
│
├── scripts/                     # Build and release helpers
│   ├── generate-icons.mjs       # SVG → PNG/ICO/ICNS
│   ├── fetch-whisper-runtime.mjs
│   ├── stage-whisper-runtime.mjs
│   └── generate-release-notes.mjs
│
├── docs/                        # VitePress documentation (this site)
├── assets/                      # README screenshots and branding
├── build/                       # Electron-builder icons
├── .github/workflows/           # CI and release pipelines
└── package.json                 # Root package with electron-builder config
```
