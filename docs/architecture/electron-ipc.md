# Electron & IPC

## Main Process Initialization

The Electron main process (`electron/main.ts`) initializes in this order:

1. Install log interceptor (500-line ring buffer for diagnostics)
2. Set platform-specific flags (macOS ScreenCaptureKit, Linux PulseAudio loopback)
3. Create caption window controller
4. Register trusted windows (main + caption)
5. Create desktop source and local runtime controllers
6. Request single-instance lock (quit if another instance is running)
7. On `app.whenReady()`:
   - Start HTTP server on port 23456 (Volcengine proxy)
   - Attach API server to the HTTP server
   - Create main window
   - Create system tray
   - Register global shortcuts
   - Set up auto-updater (if supported)
8. Register all IPC handlers

## IPC Modules

| Module | Purpose | Trust Required |
|--------|---------|---------------|
| `appIpc.ts` | Window controls, auto-launch, file picker | Partial (sensitive ops only) |
| `captionIpc.ts` | Caption window text, style, draggable, position | No |
| `safeStorageIpc.ts` | Encrypt/decrypt secrets via OS keychain | Yes |
| `updaterIpc.ts` | Check, download, install updates | Yes (download/install) |
| `diagnosticsIpc.ts` | Export redacted diagnostics JSON | Yes |
| `apiIpc.ts` | Bridge: Main ↔ Renderer for API data | No |
| `localRuntimeIpc.ts` | whisper.cpp binary/model management | Yes |

## Trusted Window Verification

`ipcSecurity.ts` maintains a list of trusted `BrowserWindow` providers. `assertTrustedSender(event, channel)` checks that `event.sender.id` matches one of the registered windows' `webContents.id`.

Only the **main window** and **caption window** are registered as trusted.

## IPC Patterns

### Main → Renderer (Request/Response)

Used by the API bridge (`apiIpc.ts`):

```
Main process (apiServer receives HTTP request)
  → webContents.send('api-get-sessions', { limit, offset })
  → Renderer (useApiIpcResponder) processes request
  → ipcRenderer.send('api-respond-sessions', data)
  → Main process resolves pending Promise
  → HTTP response sent to client
```

The pattern uses a **5-second timeout** with fallback empty data to avoid hanging.

### Renderer → Main (One-Way)

Session lifecycle notifications:

```
Renderer (sessionStore detects session start/end)
  → ipcRenderer.send('api-notify-session-start', { sessionId })
  → Main process (apiIpc.ts) receives notification
  → apiBroadcast broadcasts to WebSocket clients
```

### Renderer → Main (Invoke)

Standard Electron invoke pattern for most operations:

```
Renderer: await window.electronAPI.getAppVersion()
  → ipcMain.handle('get-app-version', () => app.getVersion())
```

## Preload Bridge

`electron/preload.ts` exposes a single `electronAPI` object via `contextBridge.exposeInMainWorld`. This is the **only** way the Renderer communicates with the Main process.

The full API surface is defined in `shared/electronApi.ts` as the `ElectronAPI` TypeScript interface, ensuring type safety across the process boundary.

## Window Configuration

### Main Window

- 1200×800 default, 800×600 minimum
- `frame: false` (custom title bar)
- `contextIsolation: true`, `nodeIntegration: false`
- `backgroundThrottling: false` (keeps recording active when minimized)
- CSP injected via `session.webRequest.onHeadersReceived`
- Navigation restricted to localhost:5173, file:, and devtools: URLs

### Caption Window

- Separate `BrowserWindow` for floating subtitle overlay
- `transparent: true` (Linux uses semi-transparent black)
- `alwaysOnTop: true`, `skipTaskbar: true`
- Click-through when not interacting (`setIgnoreMouseEvents` with `forward: true`)
- Mouse position polling (100ms) to detect hover for temporary interaction
- `focusable` toggled based on interaction state
