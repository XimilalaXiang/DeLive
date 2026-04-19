# What is DeLive?

DeLive is a desktop transcription workspace that captures system audio, routes it through the ASR backend that fits the job, keeps everything on your machine, and turns completed transcripts into a searchable AI-powered review workspace.

## Key Capabilities

### Multi-Provider ASR

DeLive supports **six ASR backends** behind a single unified interface:

| Provider | Type | Mode | Highlights |
|----------|------|------|------------|
| **Soniox V4** | Cloud | Real-time streaming | Token-level transcription, real-time translation, bilingual captions, speaker diarization |
| **Volcengine** | Cloud | Real-time streaming | Chinese-oriented; embedded proxy handles required headers |
| **Groq** | Cloud | Windowed batch | Whisper large-v3-turbo with quasi-realtime updates |
| **SiliconFlow** | Cloud | Windowed batch | SenseVoice, TeleSpeech, and Qwen Omni models |
| **Local OpenAI-compatible** | Local | Windowed batch | Works with Ollama or any `/v1/audio/transcriptions` endpoint |
| **Local whisper.cpp** | Local | Electron-managed runtime | Fully offline; DeLive manages the binary and model lifecycle |

### AI Review Desk

After recording, sessions open in a full-page review workspace with four tabs:

- **Overview** — AI briefing with summary, action items, keywords, chapters, title/tag suggestions
- **Transcript** — Timestamped segments with speaker badges, export to TXT/Markdown/SRT/VTT
- **Chat** — Multi-thread AI conversation with GFM Markdown rendering and code highlighting
- **Mind Map** — Generate and edit Markmap-compatible Markdown, export SVG/PNG

![Review History](/images/screenshot-review-history.png)

### Open Ecosystem

DeLive exposes its data through a local API:

- **REST API** — 8 endpoints for sessions, topics, tags, and recording status
- **WebSocket** — Real-time transcript streaming at `/ws/live`
- **MCP Server** — Standalone stdio server for Claude Desktop, Cursor, and other AI agents
- **Agent Skill** — Structured guidance for AI agents to use DeLive's capabilities

### Local-First Architecture

- Sessions stored in IndexedDB with an in-memory cache
- API keys encrypted via Electron `safeStorage`
- Context isolation, trusted IPC verification, CSP injection
- Open API disabled by default with optional Bearer token authentication

## Platforms

DeLive runs on **Windows**, **macOS**, and **Linux**.

| Platform | Formats |
|----------|---------|
| Windows | `.exe` installer, portable `.exe` |
| macOS | `.dmg` (Intel x64 and Apple Silicon arm64) |
| Linux | `.AppImage`, `.deb` |
