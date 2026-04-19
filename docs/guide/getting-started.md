# Getting Started

## Download

Get the latest release from [GitHub Releases](https://github.com/XimilalaXiang/DeLive/releases/latest).

| Platform | Files |
|----------|-------|
| Windows | `.exe` installer, portable `.exe` |
| macOS | `.dmg` (Intel x64 and Apple Silicon arm64) |
| Linux | `.AppImage`, `.deb` |

## First Launch

1. **Open DeLive** — on first launch you'll be taken to the Settings page.
2. **Choose a provider** — select an ASR backend from the Service tab.
3. **Enter credentials** — fill in the required API key or configure a local service.
4. **Test configuration** — click **Test Config** to verify connectivity.
5. **Start recording** — go to the Live view, click **Start Recording**, pick a screen/window with audio sharing enabled.

![Live Transcription View](/images/screenshot-live.png)

::: tip Windows SmartScreen
Windows may show a SmartScreen warning on first launch. Click **More info** → **Run anyway**. This is normal for newly distributed unsigned apps.
:::

## System Requirements

- **Windows** 10+
- **macOS** 13+
- **Linux** with PulseAudio loopback support
- At least one ASR provider configured (cloud API key or local service)

## Provider Quick Setup

### Cloud Providers

| Provider | What You Need |
|----------|--------------|
| Soniox | API key from [soniox.com](https://soniox.com) |
| Volcengine | APP ID and Access Token |
| Groq | API key from [groq.com](https://groq.com) |
| SiliconFlow | API key from [siliconflow.cn](https://siliconflow.cn) |

### Local Providers

| Provider | What You Need |
|----------|--------------|
| Local OpenAI-compatible | A service exposing `/v1/models` and `/v1/audio/transcriptions` (e.g. Ollama) |
| Local whisper.cpp | `whisper-server` binary + a `.bin` or `.gguf` model — or let DeLive download them |

## Building from Source

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
npm run dev
```

`npm run dev` starts Vite and Electron together. The Volcengine proxy runs inside the Electron main process.
