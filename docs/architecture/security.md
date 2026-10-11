# Security Model

DeLive follows defense-in-depth principles for a desktop Electron application.

## Context Isolation

The Renderer runs with strict security settings:

```
contextIsolation: true
nodeIntegration: false
```

The Renderer cannot access Node.js APIs directly. All communication with the Main process goes through the `contextBridge`-exposed `electronAPI` object.

## Trusted IPC

Sensitive IPC handlers verify the caller using `assertTrustedSender`:

1. `registerTrustedWindow(provider)` registers a window getter
2. On each sensitive IPC call, `isTrustedSender(event)` checks `event.sender.id` against registered windows
3. Only the **main window** and **caption window** are trusted

**Protected operations:** safeStorage read/write, diagnostics export, auto-launch toggle, file picker, path existence check, update download/install, local runtime management.

## Content Security Policy

CSP is injected at the Electron layer via `session.webRequest.onHeadersReceived`:

- `script-src` includes `'unsafe-eval'` only in development mode
- `connect-src` allows only required endpoints (localhost, provider APIs)

## Navigation Guard

The main window blocks navigation to unexpected URLs. Allowed origins:

- `http://localhost:5173` (development server)
- `file:` (production packaged app)
- `devtools:` (developer tools)

External URLs are opened via `shell.openExternal` instead.

## Path Allowlist

File operations are restricted to safe directories:

- `userData` (Electron app data)
- `home`, `desktop`, `downloads`, `documents`
- `temp`

Any file path operation outside these roots is rejected.

## Secret Storage

API keys are encrypted using Electron's `safeStorage` API:

1. `safeStorage.encryptString(value)` produces an encrypted buffer
2. Buffers are written to files in `userData/safe-store/ss_<key>`
3. `safeStorage.decryptString(buffer)` retrieves the plaintext

This uses the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).

## Open API Security

The local REST API and WebSocket have multiple security layers:

| Layer | Behavior |
|-------|----------|
| **Disabled by default** | API returns 403 until explicitly enabled |
| **Required Bearer token** | Every request must include the token; an empty token refuses all requests |
| **Localhost only** | Server listens on `127.0.0.1` (and `::1`); not accessible from the network |
| **Host / Origin checks** | Non-local `Host` headers get `403` (DNS rebinding); `/ws/live` refuses browser origins |
| **Read-only** | No mutation endpoints; sessions cannot be modified via API |

::: info
Any process on the local machine that has the token can read transcription data. Treat the token like a password.
:::

## No Recording Control via API

`getDisplayMedia()` requires explicit user interaction (screen/window picker). DeLive intentionally does not expose `start_recording` or `stop_recording` over the API. This is a security-positive decision — external processes cannot silently start capturing audio.

## Diagnostics Hygiene

The diagnostics export (`export-diagnostics` IPC) redacts fields that look like secrets (API keys, tokens) before writing the JSON bundle.
