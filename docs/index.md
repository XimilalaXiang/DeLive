---
layout: home
hero:
  name: DeLive
  text: Desktop Transcription Workspace
  tagline: Capture system audio. Transcribe with fourteen ASR backends. Review with AI — correction, summaries, chat, mind maps. All local-first.
  image:
    src: /logo.svg
    alt: DeLive
  actions:
    - theme: brand
      text: Download v2.2.4
      link: https://github.com/XimilalaXiang/DeLive/releases/latest
    - theme: alt
      text: Get Started →
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/rest
features:
  - icon: 🎙️
    title: Fourteen ASR Backends, One UI
    details: Soniox, Volcengine, ElevenLabs, Mistral AI, Gladia, Deepgram, AssemblyAI, 60db, Cloudflare Workers AI, SiliconFlow, Groq, local OpenAI-compatible, local FunASR / SenseVoice, and local whisper.cpp — three execution modes in one app.
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
    details: Upload audio or video files and transcribe them with any of the fourteen providers, from cloud engines to fully local whisper.cpp and FunASR / SenseVoice. Speaker diarization, word-level timestamps, and language detection where the provider supports them.
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
  <p class="subtitle">Coming in v2.3 (available now as a beta): two new providers, a Korean interface, and file transcription on every provider</p>
  <div class="new-features">
    <div class="new-feature">
      <div class="icon">📁</div>
      <h3>File Transcription on Every Provider</h3>
      <p>All fourteen providers can now transcribe uploaded audio or video, including fully local whisper.cpp (decoded to 16 kHz WAV and sent to <code>whisper-server</code>) and FunASR / SenseVoice. Providers no longer fall back to Soniox, and missing credentials show up as a failed job.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🔊</div>
      <h3>60db</h3>
      <p>New cloud provider with ~40 languages, including Indic languages mixed with English. Live capture runs through the embedded proxy; file jobs use the 60db REST API (up to 10 MB).</p>
    </div>
    <div class="new-feature">
      <div class="icon">🖥️</div>
      <h3>FunASR / SenseVoice</h3>
      <p>New local provider backed by a self-hosted <code>funasr-server</code>. Choose SenseVoice (emotion and audio-event tags), Paraformer, or Fun-ASR-Nano, with no API cost.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🇰🇷</div>
      <h3>Korean Interface</h3>
      <p>Full Korean UI alongside Chinese and English, including tray menu, main-process strings, and localized error messages.</p>
    </div>
    <div class="new-feature">
      <div class="icon">⬆️</div>
      <h3>Soniox V5</h3>
      <p>Soniox integration upgraded from V4 to V5; the real-time model defaults to <code>stt-rt-v5</code>.</p>
    </div>
    <div class="new-feature">
      <div class="icon">⚡</div>
      <h3>ElevenLabs Turbo &amp; Lite</h3>
      <p>Scribe v2 Realtime now offers Turbo and Lite variants next to the standard model.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🎙️</div>
      <h3>Gladia Solaria-3 for Files</h3>
      <p>File and async jobs can use Solaria-3; live streaming stays on Solaria-1.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🔌</div>
      <h3>Resilient Proxy Port</h3>
      <p>The embedded proxy tries ports 23456–23460 and then falls back to a free system port, and the main window opens even if the proxy cannot start.</p>
    </div>
    <div class="new-feature">
      <div class="icon">🧪</div>
      <h3>373 Tests Passing</h3>
      <p>Test suite expanded to 373 tests across 44 files, covering the new providers, file transcription routing, and proxy handshakes.</p>
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
