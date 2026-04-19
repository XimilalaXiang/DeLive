# Settings

DeLive settings are organized into two tabs: **Service** (provider configuration) and **General** (app-wide preferences).

## Service Tab

### Provider Selection

Choose from six ASR providers. Each provider has its own set of configuration fields (API keys, endpoints, models, language hints).

### Config Test

All providers support **Test Config**, a button that verifies credentials and connectivity before recording.

![Settings — Service Tab](/images/screenshot-settings-api.png)

### Local Service Discovery

For **Local OpenAI-compatible**, DeLive can:
- Probe the service at the configured base URL
- List installed models via `/v1/models`
- Pull models from Ollama if detected

### Runtime Setup

For **Local whisper.cpp**, the bundled runtime guide helps you:
- Import or download the `whisper-server` binary
- Import or download a `.bin` / `.gguf` model
- Test the runtime configuration

## General Tab

### Interface Language

Switch between **Chinese** (default) and **English**.

### Color Theme

Five accent palettes: **Cyan**, **Violet**, **Rose**, **Green**, **Amber**. Each supports full light and dark mode. The light/dark toggle is in the top navigation bar.

### AI Post-Process

Configure the OpenAI-compatible endpoint for AI features:

| Field | Description | Default |
|-------|-------------|---------|
| Base URL | Chat completions endpoint | `http://127.0.0.1:11434/v1` |
| Model | Model identifier | — |
| API Key | Optional authentication | — |
| Prompt Language | `zh` or `en` | `zh` |

### Open API

Control external access to DeLive data (Electron only):

| Setting | Description |
|---------|-------------|
| **Enable Open API** | Toggle the local REST API and WebSocket on/off |
| **Access Token** | Optional Bearer token for authentication |
| **Generate Random Token** | Creates a cryptographically random token |
| **Endpoint URLs** | Shows REST and WebSocket URLs with copy buttons |

::: warning
When Open API is enabled with an empty token, any local process can access your transcription data. Set a token for production use.
:::

### Data Management

- **Export** — download all sessions, tags, and settings as JSON
- **Import** — restore from a backup file (overwrite or merge)

### Desktop Integration

- **Auto-launch** — start DeLive on system login (Windows and macOS)
- **Auto-update** — check for updates automatically
- **Diagnostics export** — generate a redacted JSON bundle for troubleshooting
