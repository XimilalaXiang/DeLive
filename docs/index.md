---
layout: home
hero:
  name: DeLive
  text: Desktop Transcription Workspace
  tagline: Capture system audio. Transcribe with twelve ASR backends. Review with AI — correction, summaries, chat, mind maps. All local-first.
  image:
    src: /logo.svg
    alt: DeLive
  actions:
    - theme: brand
      text: Download v2.2.2
      link: https://github.com/XimilalaXiang/DeLive/releases/latest
    - theme: alt
      text: Get Started →
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/rest
features:
  - icon: 🎙️
    title: Twelve ASR Backends, One UI
    details: Soniox, Volcengine, ElevenLabs, Mistral AI, Gladia, Deepgram, AssemblyAI, Cloudflare Workers AI, SiliconFlow, Groq, local OpenAI-compatible, and local whisper.cpp — three execution modes in one app.
  - icon: 🧠
    title: AI Review Desk
    details: Full-page workspace with four tabs — Transcript (with AI side panel), Summary (overview, action items, keywords), multi-thread Chat with streaming output, and Markmap mind maps. AI Correction with smart text-source selection.
  - icon: 💬
    title: Floating Caption Overlay
    details: Always-on-top, draggable subtitle window with source, translated, and dual-line bilingual modes. Fully customizable font, color, shadow, and background.
  - icon: 🔒
    title: Local-First & Secure
    details: Sessions in IndexedDB, secrets in Electron safeStorage, context isolation, trusted-window IPC, CSP injection, and navigation guards. Your data never leaves your machine.
  - icon: 🌐
    title: Open API & MCP Ecosystem
    details: Local REST API (8 endpoints), real-time WebSocket streaming, standalone MCP server for Claude Desktop and Cursor, Agent Skill definition, and Agent Skills for one-call transcription inside any agent.
  - icon: 📁
    title: File Transcription
    details: Upload audio or video files and transcribe them offline using ten cloud ASR engines. Supports speaker diarization, word-level timestamps, and multi-language detection.
  - icon: 🎨
    title: Eight Themes, Light & Dark
    details: Violet, Cyan, Rose, Green, Amber, Pink, Slate, and Orange accent palettes — each with full light and dark mode. New persistent sidebar navigation and Command Palette (Ctrl+K).
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #0ea5e9 30%, #6366f1);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #0ea5e940 50%, #6366f140 50%);
  --vp-home-hero-image-filter: blur(44px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}

.screenshots {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 0;
}

.screenshots h2 {
  text-align: center;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.screenshots .subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin-bottom: 32px;
  font-size: 1.05rem;
}

.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .screenshot-grid {
    grid-template-columns: 1fr;
  }
}

.screenshot-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  transition: transform 0.2s, box-shadow 0.2s;
}

.screenshot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.screenshot-card img {
  width: 100%;
  display: block;
}

.screenshot-card .caption {
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-1);
}

.whats-new {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px;
}

.whats-new h2 {
  text-align: center;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.whats-new .subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin-bottom: 32px;
  font-size: 1.05rem;
}

.new-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .new-features {
    grid-template-columns: 1fr;
  }
}

.new-feature {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.new-feature .icon {
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.new-feature h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.new-feature p {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
}

.platforms {
  max-width: 1152px;
  margin: 0 auto;
  padding: 24px 24px 64px;
  text-align: center;
}

.platforms h2 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.platforms .subtitle {
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
  font-size: 1.05rem;
}

.platform-badges {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.platform-badges a img {
  height: 40px;
}
</style>

<div class="screenshots">
  <h2>See It In Action</h2>
  <p class="subtitle">Real-time transcription, AI review, and more — all in one desktop app</p>
  <div class="screenshot-grid">
    <div class="screenshot-card">
      <img src="/images/screenshot-live.png" alt="Live Transcription" />
      <div class="caption">Live Transcription</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-caption-overlay.png" alt="Caption Overlay" />
      <div class="caption">Floating Caption Overlay</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-mcp-integration.png" alt="MCP Integration" />
      <div class="caption">MCP Integration</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-overview.png" alt="AI Overview" />
      <div class="caption">AI Overview & Briefing</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-correction.png" alt="AI Correction" />
      <div class="caption">AI Transcript Correction</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-chat.png" alt="AI Chat" />
      <div class="caption">AI Chat with References</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-mindmap.png" alt="Mind Map" />
      <div class="caption">Mind Map Visualization</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-review-history.png" alt="Review History" />
      <div class="caption">Review & History</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-topics-view.png" alt="Topics" />
      <div class="caption">Topics Organization</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-settings-api.png" alt="Settings" />
      <div class="caption">Settings & Configuration</div>
    </div>
  </div>
</div>

<div class="whats-new">
  <h2>What's New</h2>
  <p class="subtitle">Premium UI overhaul, eight color themes, AI streaming chat, real-time waveform, and more</p>
  <div class="new-features">
    <div class="new-feature">
      <div class="icon">📁</div>
      <h3>File Transcription</h3>
      <p>Upload audio or video files and transcribe them offline. Ten cloud ASR engines supported — Soniox, Volcengine, ElevenLabs, Mistral, Gladia, Deepgram, AssemblyAI, Cloudflare, SiliconFlow, and Groq — with speaker diarization and word-level timestamps.</p>
    </div>
    <div class="new-feature">
      <div class="icon">☁️</div>
      <h3>Cloudflare Workers AI</h3>
      <p>New ASR provider — Whisper-based transcription via Cloudflare Workers AI. Low cost with generous free tier, VAD filter, and anti-hallucination.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🎙️</div>
      <h3>Gladia Realtime ASR</h3>
      <p>Solaria-1 real-time streaming with sub-300ms latency and 100+ language support. Embedded proxy handles session init and authentication.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🤖</div>
      <h3>AI Correction Enhancements</h3>
      <p>Persisted correction streaming text across tab switches, real-time progress display (character count, elapsed time), and improved AI analysis status tracking.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🧠</div>
      <h3>Smart Text-Source Selection</h3>
      <p>AI post-processing now auto-selects corrected transcript when available. Configurable preference (Auto / Always Original / Always Corrected) with real-time status banners.</p>
    </div>
    <div class="new-feature">
      <div class="icon">📋</div>
      <h3>Reordered Provider List</h3>
      <p>Provider selection reordered to: Soniox, Volcengine, ElevenLabs, Mistral AI, Gladia, Deepgram, AssemblyAI, Cloudflare, SiliconFlow, Groq, Local OpenAI, whisper.cpp.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🧪</div>
      <h3>314 Tests Passing</h3>
      <p>Expanded test suite with 314 tests across 32 files, including AI correction, hypothesis buffer, PCM/WAV encoding, and all previous coverage areas.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🔄</div>
      <h3>Refactored Windowed Batch</h3>
      <p>WindowedBatchTranscriptionProvider base class extracted — shared logic for interval-based retranscription, silence detection, and hypothesis buffer management.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🌍</div>
      <h3>Electron Main Process i18n</h3>
      <p>Main process tray menu, dialog titles, and system notifications now respect the user's language setting.</p>
    </div>
  </div>
</div>

<div class="platforms">
  <h2>Cross-Platform</h2>
  <p class="subtitle">Available on Windows, macOS (Intel & Apple Silicon), and Linux</p>
  <div class="platform-badges">
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/Windows-Download-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" /></a>
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/macOS-Download-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" /></a>
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/Linux-Download-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" /></a>
  </div>
</div>
