---
layout: home
hero:
  name: DeLive
  text: 桌面转录工作台
  tagline: 捕获系统音频 · 六大 ASR 后端转录 · AI 复盘 — 摘要、对话、思维导图，全部本地优先
  image:
    src: /logo.svg
    alt: DeLive
  actions:
    - theme: brand
      text: 下载 v2.0.0
      link: https://github.com/XimilalaXiang/DeLive/releases/latest
    - theme: alt
      text: 快速开始 →
      link: /zh/guide/getting-started
    - theme: alt
      text: API 参考
      link: /zh/api/rest
features:
  - icon: 🎙️
    title: 六大 ASR 后端，统一界面
    details: Soniox（实时流式 + 翻译 + 说话人区分）、火山引擎、Groq、硅基流动、本地 OpenAI 兼容、本地 whisper.cpp — 三种执行模式覆盖所有场景。
  - icon: 🧠
    title: AI 复盘工作台
    details: 全页工作台，六个标签页 — AI 纠错（快速纠错 & 逐条审查模式 + 智能文本源选择）、概览（摘要、行动项、关键词、章节）、转录文本导出、AI 分析、多线程对话、Markmap 思维导图。
  - icon: 💬
    title: 悬浮字幕窗
    details: 始终置顶、可拖拽的字幕窗口，支持原文、翻译和双语三种模式。字体、颜色、阴影、背景完全可自定义。
  - icon: 🔒
    title: 本地优先 & 安全
    details: 会话存储在 IndexedDB，密钥通过 safeStorage 加密，上下文隔离、可信窗口 IPC、CSP 注入、导航守卫。数据不离开你的设备。
  - icon: 🌐
    title: 开放 API 与 MCP 生态
    details: 本地 REST API（8 个端点）、实时 WebSocket 流、独立 MCP 服务器（支持 Claude Desktop 和 Cursor）、Agent Skill 定义、Agent Skills 一键调用转录 — AI 集成一步到位。
  - icon: 🎨
    title: 五套主题，明暗切换
    details: 青蓝、紫罗兰、玫瑰、绿色、琥珀五种配色。全新持久化侧栏导航和命令面板（Ctrl+K）。
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
  <h2>功能一览</h2>
  <p class="subtitle">实时转录、AI 复盘、智能归档 — 尽在一个桌面应用</p>
  <div class="screenshot-grid">
    <div class="screenshot-card">
      <img src="/images/screenshot-live.png" alt="实时转录" />
      <div class="caption">实时转录</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-caption-overlay.png" alt="悬浮字幕" />
      <div class="caption">悬浮字幕窗</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-mcp-integration.png" alt="MCP 集成" />
      <div class="caption">MCP 集成</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-overview.png" alt="AI 概览" />
      <div class="caption">AI 概览与 Briefing</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-correction.png" alt="AI 纠错" />
      <div class="caption">AI 转录纠错</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-ai-chat.png" alt="AI 对话" />
      <div class="caption">AI 对话（带引用）</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-mindmap.png" alt="思维导图" />
      <div class="caption">思维导图可视化</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-review-history.png" alt="复盘历史" />
      <div class="caption">复盘与历史</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-topics-view.png" alt="主题管理" />
      <div class="caption">主题归类管理</div>
    </div>
    <div class="screenshot-card">
      <img src="/images/screenshot-settings-api.png" alt="设置" />
      <div class="caption">设置与配置</div>
    </div>
  </div>
</div>

<div class="whats-new">
  <h2>v2.0.0 新特性</h2>
  <p class="subtitle">重大 UI 重构 — 侧栏导航、命令面板、WebDAV 备份等全面升级</p>
  <div class="new-features">
    <div class="new-feature">
      <div class="icon">🧭</div>
      <h3>持久化侧栏导航</h3>
      <p>全新左侧栏，5 个导航项（实况、复盘、主题、字幕、设置），Ctrl+B 折叠。替代原有顶部导航栏。</p>
    </div>
    <div class="new-feature">
      <div class="icon">⌨️</div>
      <h3>命令面板</h3>
      <p>全局命令面板（Ctrl+K / Cmd+K）— 即时搜索并执行任何命令。标题栏搜索框一键唤起。</p>
    </div>
    <div class="new-feature">
      <div class="icon">🌐</div>
      <h3>WebDAV 云端备份</h3>
      <p>完整 WebDAV 支持 — 坚果云、Nextcloud、Alist 及所有标准 WebDAV 服务器。自动 MKCOL 创建目录。</p>
    </div>
    <div class="new-feature">
      <div class="icon">🎬</div>
      <h3>字幕样式编辑器</h3>
      <p>内嵌式字幕自定义 — 字号、字体、文字颜色、背景、阴影、宽度、最大行数及双语模式设置。</p>
    </div>
    <div class="new-feature">
      <div class="icon">⚙️</div>
      <h3>重构的设置面板</h3>
      <p>8 个分组面板 — Provider、外观、字幕样式、AI 后处理、开放 API、云备份、数据管理、关于。</p>
    </div>
    <div class="new-feature">
      <div class="icon">🧪</div>
      <h3>266 个测试通过</h3>
      <p>覆盖 29 个测试文件的完整测试套件。CI 发布流程支持自动预发布检测。品质值得信赖。</p>
    </div>
    <div class="new-feature">
      <div class="icon">🤖</div>
      <h3>AI 转录纠错</h3>
      <p>双模式：直接纠错（流式重写）和先检测后纠错（逐条审查，接受或忽略）。并排对比视图。智能文本源选择，后续 AI 自动使用纠错文本。</p>
    </div>
    <div class="new-feature">
      <div class="icon">🧩</div>
      <h3>Agent Skills</h3>
      <p>安装 DeLive Skill 后，任意 AI Agent 可在对话中一键转录音视频 — 返回转录文本、摘要、思维导图与关键词，无需离开 Agent 界面。</p>
    </div>
  </div>
</div>

<div class="platforms">
  <h2>跨平台支持</h2>
  <p class="subtitle">Windows、macOS（Intel 与 Apple Silicon）、Linux 全平台覆盖</p>
  <div class="platform-badges">
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/Windows-下载-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" /></a>
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/macOS-下载-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" /></a>
    <a href="https://github.com/XimilalaXiang/DeLive/releases/latest"><img src="https://img.shields.io/badge/Linux-下载-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" /></a>
  </div>
</div>
