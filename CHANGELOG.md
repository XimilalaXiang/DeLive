# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本文件记录项目的所有重要更改。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.0] - 2026-04-17

### Added / 新增
- 🌐 Open API ecosystem — local REST API with 8 endpoints (`/api/v1/sessions`, `/status`, `/topics`, `/tags`, etc.) allowing external programs to access DeLive data
- 🌐 开放 API 生态 — 本地 REST API 提供 8 个端点，允许外部程序访问 DeLive 数据
- 📡 WebSocket live transcript stream at `/ws/live` for real-time caption broadcasting to external clients
- 📡 WebSocket 实时转录流（`/ws/live`），向外部客户端广播实时字幕
- 🤖 Standalone MCP server (`mcp/delive-mcp-server.js`) exposing 6 tools and 2 resources for AI agents (Claude Desktop, Cursor, etc.)
- 🤖 独立 MCP 服务器（`mcp/delive-mcp-server.js`）封装 6 个 Tools 和 2 个 Resources，供 AI Agent 使用
- 🛡️ Open API toggle in Settings with optional Bearer token authentication — API is disabled by default, token supports both REST headers and WebSocket query params
- 🛡️ 设置页新增 Open API 开关与可选 Bearer Token 鉴权 — API 默认关闭，Token 同时支持 REST 请求头和 WebSocket 查询参数
- 📋 Agent Skill definition (`skills/delive-transcript-analyzer/SKILL.md`) providing structured guidance for AI agents
- 📋 Agent Skill 定义文件，为 AI Agent 提供使用 DeLive 的结构化指引
- 🐍 Python demo scripts (`demo/`) for REST API and WebSocket integration examples
- 🐍 Python 演示脚本（`demo/`），展示 REST API 和 WebSocket 集成方式

### Changed / 变更
- 🔌 Default server port changed from 3001 to 23456 to reduce conflicts with common development tools
- 🔌 默认服务端口从 3001 改为 23456，减少与常用开发工具的端口冲突
- 🏗️ Refactored `apiIpc.ts` to internalize `getMainWindow` reference, simplifying the API server's dependency structure
- 🏗️ 重构 `apiIpc.ts`，内置 `getMainWindow` 引用，简化 API 服务器依赖结构
- 📝 Updated README.md and README_ZH.md with Open API documentation, new project structure entries, and security table additions
- 📝 更新中英文 README，新增 Open API 文档、项目结构条目和安全表条目

---

## [1.6.1] - 2026-03-12

### Fixed / 修复
- 🐛 Fixed topic assignment being silently discarded during session persistence — `normalizeTranscriptSession()` was missing the `topicId` field, causing it to be stripped every time a session was cached or saved
- 🐛 修复主题归属在 session 持久化过程中被静默丢弃的问题 — `normalizeTranscriptSession()` 遗漏了 `topicId` 字段，导致每次缓存或保存时该字段被清除

---

## [1.6.0] - 2026-03-12

### Added / 新增
- 📂 Topics feature — organize sessions into project-like topic containers (similar to ChatGPT Projects) with full CRUD, card-grid view, and per-topic detail pages
- 📂 主题功能 — 将录制会话按主题/项目归类（类似 ChatGPT 项目），支持完整 CRUD、卡片网格视图和主题详情页
- 🏷️ Topic picker in Live view — select a topic before recording so sessions are automatically assigned; badge displays current topic with one-click clear
- 🏷️ 录制页主题选择器 — 录制前选择主题，session 自动归类；徽章显示当前主题，一键清除
- 🔀 "Move to Topic" / "Remove from Topic" in Review → Overview tab — reassign existing sessions to topics or move them back to uncategorized
- 🔀 Review → Overview tab 新增"移入主题"/"移出主题"操作，可将已有 session 重新归类或移回未分类
- 🔍 Global search includes topic sessions — searching in Review still finds sessions inside topics
- 🔍 全局搜索包含主题内 session — 在 Review 中搜索仍能找到主题内的 session

### Changed / 变更
- 🧭 Navigation bar now includes a Topics tab between Review and Settings
- 🧭 导航栏在 Review 和 Settings 之间新增 Topics 标签页
- 📋 Review view now hides sessions that belong to a topic (they live inside their topic's detail view); search mode still shows all
- 📋 Review 视图默认隐藏已归入主题的 session（它们在主题详情页中查看）；搜索模式下仍显示全部

---

## [1.5.1] - 2026-03-11

### Added / 新增
- 🧠 AI Chat now renders Markdown responses with full GFM support: headings, lists, tables, bold/italic, and syntax-highlighted code blocks with one-click copy
- 🧠 AI 对话现已支持 Markdown 渲染：标题、列表、表格、粗体/斜体，以及带语法高亮和一键复制的代码块
- 👤 Added user and AI avatars to chat messages for clearer visual distinction
- 👤 对话消息新增用户和 AI 头像，视觉区分更清晰
- 📋 Added hover action bar on chat messages: Copy and Regenerate for AI replies, Copy for user messages
- 📋 对话消息新增悬停操作栏：AI 回复支持复制和重新生成，用户消息支持复制
- ⬇️ Added floating "Scroll to bottom" button in chat when scrolled up
- ⬇️ 对话向上滚动时显示浮动"滚动到底部"按钮
- 🗑️ Added delete button for conversation threads in AI Chat
- 🗑️ AI 对话新增删除对话线程按钮
- 🎬 Added animated sliding indicator on Review tab bar with keyboard arrow navigation
- 🎬 Review 标签栏新增滑动动画指示器，支持键盘左右箭头切换
- ♿ Added ARIA tablist/tab/tabpanel roles and keyboard navigation to Review tabs
- ♿ 为 Review 标签页添加 ARIA tablist/tab/tabpanel 角色和键盘导航

### Changed / 变更
- 💬 Redesigned AI Chat input: auto-resizing textarea (1–6 rows), Enter to send, compact status-aware send button
- 💬 重新设计 AI 对话输入框：自动伸缩文本区域（1–6 行）、Enter 发送、紧凑的状态感知发送按钮
- ⏳ Replaced spinner loading state with animated thinking dots indicator
- ⏳ 将旋转加载指示器替换为跳动圆点思考动画
- 📝 Polished TranscriptTab: timestamps in left gutter, color-coded speaker badges, consecutive same-speaker merging, hover highlight, improved translation separator
- 📝 优化转录文本标签页：左侧时间戳、彩色说话人标签、连续同一说话人合并、悬停高亮、翻译分隔线改进
- 🎨 Chat messages now use max-w-3xl centered layout for better readability
- 🎨 对话消息改为 max-w-3xl 居中布局，提升可读性

### Fixed / 修复
- 🐛 Fixed Session Library title truncation caused by invisible action buttons reserving layout space
- 🐛 修复 Session Library 标题被不可见操作按钮占位导致的截断问题
- 🐛 Fixed mind map text barely visible in dark mode by forcing foreground color on SVG text elements
- 🐛 修复暗色模式下思维导图文字几乎不可见的问题，强制 SVG 文字使用前景色
- 🐛 Fixed "New Conversation" button in AI Chat having no effect due to useEffect immediately resetting the active thread
- 🐛 修复 AI 对话"新建对话"按钮无效的问题，原因是 useEffect 立即重置了活动线程
- 🐛 Fixed Today/Yesterday date groups in Session Library not responding to fold/unfold toggle
- 🐛 修复 Session Library 中"今天"/"昨天"日期分组无法折叠/展开的问题
- 🐛 Adjusted Live page transcript container: wider (max-w-5xl) and shorter height to eliminate unnecessary scrolling
- 🐛 调整 Live 页转录容器：加宽至 max-w-5xl，缩短高度以消除多余滚动

---

## [1.5.0] - 2026-03-11

### Added / 新增
- 🎨 Built a shared UI component library: Button, Badge, Switch, EmptyState, StatusIndicator, and DialogShell for consistent styling across the app
- 🎨 构建共享 UI 组件库：Button、Badge、Switch、EmptyState、StatusIndicator 和 DialogShell，统一全局样式
- 🎯 Added `warning`, `success`, `info` semantic color tokens across all five themes (light & dark)
- 🎯 为全部五套主题（亮/暗模式）新增 `warning`、`success`、`info` 语义色彩 token
- 🖥️ Introduced workspace view switching (live / review / settings) via Zustand, replacing modal-based navigation
- 🖥️ 基于 Zustand 引入工作区视图切换（live / review / settings），替代原有弹窗式导航
- ♿ Added `aria-label` to 20+ icon-only buttons and fixed hover-only action visibility for keyboard/touch users
- ♿ 为 20+ 图标按钮添加 `aria-label`，修复仅 hover 可见的操作按钮对键盘/触屏用户的可访问性

### Changed / 变更
- 🏗️ Overhauled homepage: removed verbose descriptions, promoted TranscriptDisplay as primary stage, compacted header with Badge status indicators
- 🏗️ 重构首页：删除冗长说明文案，将 TranscriptDisplay 升级为主舞台，头部压缩为 Badge 状态指示
- 🔄 Refactored PreviewModal and ApiKeyConfig into dual-mode components (modal / full-page view), enabling dedicated Review Desk and Settings workspace views
- 🔄 将 PreviewModal 与 ApiKeyConfig 重构为双模式组件（弹窗/全页视图），支持独立的 Review Desk 与 Settings 工作区
- 🎛️ Restyled RecordingControls from a large centered button to a compact horizontal control bar
- 🎛️ 将录制控件从大尺寸居中按钮重构为紧凑水平控制条
- 🎨 Replaced hardcoded Tailwind color classes with semantic design tokens across 16 component files
- 🎨 在 16 个组件文件中将硬编码 Tailwind 颜色类替换为语义设计 token
- 📝 Unified minimum font size to 12px (`text-xs`), eliminating `text-[10px]`/`text-[11px]` anti-patterns
- 📝 统一最小字号为 12px（`text-xs`），消除 `text-[10px]`/`text-[11px]` 反模式
- ⚡ Shortened animation durations (reveal-up 500→250ms, fade 400→200ms) and compressed stagger delays
- ⚡ 缩短动画时长（reveal-up 500→250ms，fade 400→200ms）并压缩交错延迟
- 🔍 HistoryPanel: instant debounced search, simplified export actions, always-visible action buttons
- 🔍 历史面板：即时防抖搜索、精简导出操作、操作按钮始终可见
- 🌊 Marked Cyan as recommended brand theme with star indicator in settings
- 🌊 在设置中将 Cyan 标记为推荐品牌主题色并添加星标

### Fixed / 修复
- 🐛 Fixed content clipping in Settings and Review Desk views caused by incorrect flex layout and missing TitleBar spacing
- 🐛 修复 Settings 和 Review Desk 视图因 flex 布局错误与 TitleBar 间距缺失导致的内容遮挡
- 🐛 Fixed whisper.cpp repeating the last phrase during audio silence/pause by adding PCM16 RMS silence detection that skips enqueueing silent chunks
- 🐛 修复 whisper.cpp 在音频静音/暂停时循环重复最后一句的问题，通过 PCM16 RMS 静音检测跳过静音帧入队
- 🔧 Added comprehensive `prefers-reduced-motion` coverage for all animations
- 🔧 为所有动画添加完整的 `prefers-reduced-motion` 覆盖

---

## [1.4.4] - 2026-03-10

### Added / 新增
- 💬 Added session-level AI Q&A with persistent ask history, transcript-grounded answers, citation snippets, and support for multiple conversation threads inside a single saved session
- 💬 新增会话级 AI 问答，支持持久化问答历史、基于 transcript 的回答、引用片段，以及单个会话内的多对话线程
- 🧠 Added AI-generated session mind maps using Markmap-compatible Markdown with local editing, live preview, and session persistence
- 🧠 新增 AI 思维导图功能，基于 Markmap-compatible Markdown 生成，支持本地编辑、实时预览与会话持久化
- 🖼️ Added mind map export actions for SVG and PNG directly from session preview
- 🖼️ 新增会话详情中的思维导图 SVG / PNG 导出能力
- 🧪 Added session schema coverage for Q&A and mind map payloads, increasing frontend coverage from 180 to 184 tests
- 🧪 新增会话 schema 对问答与思维导图数据的测试覆盖，前端测试总数从 180 提升到 184

### Changed / 变更
- ✨ Upgraded the session AI panel into a more conversation-like chat experience inspired by modern AI chat products, with suggestions, fixed composer area, and threaded context switching
- ✨ 将会话 AI 面板升级为更接近现代 AI 产品的对话体验，支持建议问题、固定输入区和多线程上下文切换
- 🗺️ Reworked mind map export sizing and cropping based on actual rendered SVG bounds to avoid partial exports and excessive whitespace
- 🗺️ 基于实际渲染后的 SVG 边界重写思维导图导出尺寸与裁切逻辑，避免只导出部分内容或出现大面积留白

---

## [1.4.3] - 2026-03-10

### Added / 新增
- 🤖 Added AI post-process settings for OpenAI-compatible briefing generation, including configurable base URL, model, optional API key, and output language
- 🤖 新增 AI 后处理设置，支持配置 OpenAI-compatible briefing 生成的 Base URL、模型、可选 API Key 与输出语言
- ✨ Added session-level AI briefing flow with structured `summary`, `actionItems`, `keywords`, and `chapters` persisted into `postProcess`
- ✨ 新增会话级 AI briefing 工作流，结构化生成 `summary`、`actionItems`、`keywords` 与 `chapters`，并写回 `postProcess`
- 🧪 Added AI post-process parser coverage and post-process lifecycle tests, increasing frontend coverage from 176 to 180 tests
- 🧪 新增 AI 后处理解析测试与 post-process 生命周期测试，前端测试总数从 176 提升到 180

### Changed / 变更
- 🪟 Updated the history preview modal to surface AI briefing cards and allow one-click generate / regenerate actions alongside transcript review
- 🪟 更新历史预览弹窗，新增 AI briefing 卡片，并支持在查看 transcript 时一键生成 / 重新生成
- 🔐 Extended safeStorage and backup settings handling to cover AI post-process credentials and configuration
- 🔐 扩展 safeStorage 与备份设置处理链路，覆盖 AI 后处理凭据与配置

---

## [1.4.2] - 2026-03-08

### Added / 新增
- 🌐 Added Soniox bilingual caption flow across transcript, preview, overlay, and session persistence
- 🌐 新增 Soniox 双语字幕流，贯通主转录区、预览弹窗、悬浮字幕与会话持久化
- 🗣️ Added Soniox speaker diarization UI with speaker-grouped transcript and preview segments
- 🗣️ 新增 Soniox 多发言人识别界面，支持按说话人分组展示实时转录与预览分段
- 🧪 Added `windowedBatch` provider batching utility and unit tests for replay-style ASR backends
- 🧪 新增 `windowedBatch` provider 批处理工具与单元测试，用于回放式 ASR 后端

### Changed / 变更
- 🧱 Completed P0 provider and storage foundations by extracting shared Volc proxy core plus modular settings / session / secret storage helpers
- 🧱 完成 P0 provider 与存储基础设施收尾：抽离共享火山代理核心，并拆分 settings / session / secret storage 辅助模块
- 🔄 Extended the Soniox realtime pipeline to carry translation and speaker metadata through provider session, caption bridge, and stored transcript sessions
- 🔄 扩展 Soniox 实时链路，使翻译与说话人元数据贯通 provider session、caption bridge 与转录会话存储

### Fixed / 修复
- 🎛️ Scoped bilingual caption mode to Soniox so unsupported providers no longer expose the toggle or mixed behavior
- 🎛️ 将双语字幕模式限制为 Soniox，避免不支持的 provider 暴露开关或出现混合行为

---

## [1.4.1] - 2026-03-08

### Added / 新增
- 🧪 Added rolling-audio and caption-wrap tests, increasing frontend coverage from 129 to 146 tests
- 🧪 新增滚动音频缓冲与字幕换行测试，前端测试总数从 129 提升到 146

### Changed / 变更
- ✅ Added frontend quality gates: runnable ESLint v9 config, root `check` script, and GitHub Actions lint/test/build validation before packaging
- ✅ 增加前端质量闸门：补齐可运行的 ESLint v9 配置、根级 `check` 脚本，以及 GitHub Actions 在打包前执行 lint/test/build 校验
- ♻️ Replaced unbounded session replay buffers for Groq / SiliconFlow / Local OpenAI-compatible / whisper.cpp with rolling transcription windows
- ♻️ 将 Groq / SiliconFlow / Local OpenAI-compatible / whisper.cpp 的无限累积重转写缓冲改为滚动转写窗口
- 🗂️ Extended transcript session schema for future translation, speaker, segment, source-meta, and post-process data
- 🗂️ 扩展转录会话 schema，为后续翻译、说话人、分段、来源元数据与后处理结果预留字段
- 🧩 Split `ApiKeyConfig`, `BundledRuntimeSetupGuide`, and `electron/localRuntime.ts` into smaller focused modules to improve maintainability
- 🧩 拆分 `ApiKeyConfig`、`BundledRuntimeSetupGuide` 与 `electron/localRuntime.ts`，降低单文件复杂度并提升可维护性

### Fixed / 修复
- 🖥️ Reworked caption rendering to use a stable-text plus active-text model so partial updates only affect the live tail instead of reflowing the whole visible block
- 🖥️ 重构字幕渲染为“稳定文本 + 活动文本”模型，partial 更新只影响最后的活动尾部，不再反复重排整个可见字幕块
- 📏 Updated caption line wrapping to use measured visual width instead of a fixed character-count estimate
- 📏 字幕换行改为基于真实测量宽度，而不是固定字符数估算

---

## [1.4.0] - 2026-03-08

### Added / 新增
- 🏗️ Split monolithic `transcriptStore` into `uiStore`, `settingsStore`, `sessionStore`, `tagStore` with backward-compatible facade
- 🏗️ 将单体 `transcriptStore` 拆分为 `uiStore`、`settingsStore`、`sessionStore`、`tagStore`，保留向后兼容外观层
- 🔬 Split monolithic `useASR` hook into `CaptureManager`, `CaptionBridge`, `ProviderSessionManager` services; deleted obsolete `useSoniox`
- 🔬 将单体 `useASR` hook 拆分为 `CaptureManager`、`CaptionBridge`、`ProviderSessionManager` 服务；删除废弃的 `useSoniox`
- 🧪 Added Vitest framework with 129 unit tests covering `providerConfig`, `subtitleExport`, `transcriptStabilizer`, `storage`, and `BaseASRProvider`
- 🧪 引入 Vitest 测试框架，编写 129 个单元测试覆盖核心纯函数和类逻辑
- ⚡ Migrated audio processing from deprecated `ScriptProcessorNode` to `AudioWorklet` with automatic fallback
- ⚡ 将音频处理从已废弃的 `ScriptProcessorNode` 迁移至 `AudioWorklet`，支持自动回退
- 🩺 One-click diagnostics export — collects system info, redacted config, and last 500 log entries into a JSON file
- 🩺 一键导出诊断包 — 收集系统信息、脱敏配置和最近 500 条日志到 JSON 文件

### Security / 安全
- 🔒 IPC sender verification — all sensitive IPC handlers now validate the caller is a trusted window
- 🔒 IPC 发送者验证 — 所有敏感 IPC handler 现在验证调用者为可信窗口
- 🛡️ Content Security Policy (CSP) injected into main window with safe `connect-src` for local models
- 🛡️ 主窗口注入内容安全策略 (CSP)，为本地模型配置安全的 `connect-src`
- 🚫 Navigation guard blocks unexpected URL loads; path allowlist for `path-exists` IPC
- 🚫 导航守卫阻止意外 URL 加载；`path-exists` IPC 增加路径白名单
- 🔐 API keys encrypted via Electron `safeStorage` (Windows DPAPI / macOS Keychain) with transparent migration
- 🔐 API 密钥通过 Electron `safeStorage`（Windows DPAPI / macOS Keychain）加密存储，支持透明迁移

### Changed / 变更
- 🗄️ Unified persistence: settings and tags now dual-write to localStorage (fast sync) + IndexedDB (durable backup), with auto-restore on localStorage loss
- 🗄️ 统一持久化：settings 和 tags 现在双写 localStorage（快速同步）+ IndexedDB（持久备份），localStorage 丢失时自动恢复
- 📦 IndexedDB schema upgraded from v1 to v2 with automatic migration
- 📦 IndexedDB schema 从 v1 升级到 v2，支持自动迁移

---

## [1.3.5] - 2026-03-07

### Changed / 变更
- Refactored `electron/main.ts` into focused modules for proxy, updater, caption window, tray, shortcuts, desktop source, app IPC, and local runtime orchestration
- 将 `electron/main.ts` 进一步拆分为更聚焦的模块：代理、更新、字幕窗口、托盘、快捷键、桌面源、通用 IPC 与本地 runtime 编排
- `electron/main.ts` was reduced from a giant multi-domain file to a much thinner application-composition entry
- `electron/main.ts` 从一个超大多职责文件收缩为更薄的应用组装入口

### Fixed / 修复
- Improved Volcengine error reporting so DNS / network failures surface as actionable messages instead of raw `ENOTFOUND`
- 优化火山引擎错误提示，DNS / 网络失败现在会显示可操作的信息，而不是原始 `ENOTFOUND`

---

## [1.3.4] - 2026-03-07

### Added / 新增
- 💾 Recording autosave and interrupted-session recovery prompt
- 💾 新增长录制自动保存与中断会话恢复提示

### Changed / 变更
- 🗄️ Transcript session persistence now uses IndexedDB as the primary store with legacy localStorage migration
- 🗄️ 转录会话持久化改为以 IndexedDB 为主存，并自动迁移旧 localStorage 数据
- 🧭 Provider transport metadata now distinguishes realtime, session-replay, and local-runtime paths in shared ASR logic and provider selection UI
- 🧭 Provider 传输元数据现在在共享 ASR 逻辑与服务商选择界面中区分实时、整段重转写与本地运行时路径

### Fixed / 修复
- ♻️ Capture restart now follows explicit provider restart policy instead of guessing from audio input mode
- ♻️ 采集重启流程现在遵循明确的 provider restart 策略，不再根据音频输入模式误判
- 🎙️ Local OpenAI-compatible sessions no longer reconnect unnecessarily during capture restart
- 🎙️ 修复本地 OpenAI-compatible 会话在采集重启时不必要重连的问题

---

## [1.3.3] - 2026-03-07

### Fixed / 修复
- 🖥️ Caption window no longer closes unexpectedly when clicking caption text, lock button, main-window close, or minimize
- 🖥️ 修复字幕文字、锁按钮、主窗口关闭与最小化时字幕意外消失的问题
- 🖱️ Prevented click-through from the caption overlay into the main-window caption toggle
- 🖱️ 阻止字幕窗口点击穿透到主界面的字幕开关按钮
- 📌 Reinforced caption overlay topmost behavior during main window hide, minimize, restore, and show transitions
- 📌 增强主窗口隐藏、最小化、恢复、显示过程中的字幕置顶稳定性
- 🎙️ SiliconFlow Qwen Omni models now route to the correct multimodal endpoint instead of the ASR-only endpoint
- 🎙️ 修复硅基流动 Qwen Omni 模型错误调用 ASR 接口的问题，改为走正确的多模态接口
- 📝 Groq and SiliconFlow transcript updates now stabilize incremental text instead of rewriting the whole sentence on each poll
- 📝 修复 Groq 与 SiliconFlow 轮询转写整段回滚的问题，改为稳定增量文本输出

### Changed / 变更
- 🏷️ SiliconFlow model labels now distinguish `[ASR]` and `[Multimodal]` routes in settings
- 🏷️ 硅基流动模型在设置中新增 `[ASR]` 与 `[多模态]` 路由标识
- 🧭 Groq and SiliconFlow are no longer marked as true streaming providers in the UI
- 🧭 Groq 与硅基流动在界面中不再标记为真正流式提供商

---

## [1.3.2] - 2026-03-06

### Added / 新增
- 🔌 Groq cloud ASR provider - Whisper large-v3-turbo / large-v3 via Groq API
- 🔌 Groq 云端 ASR 服务商 - 通过 Groq API 使用 Whisper large-v3-turbo / large-v3
- 🔌 SiliconFlow cloud ASR provider - SenseVoice, TeleSpeech, Qwen Omni models
- 🔌 硅基流动云端 ASR 服务商 - 支持 SenseVoice、TeleSpeech、Qwen Omni 模型
- 📜 Node.js-based release notes generator reading from CHANGELOG.md
- 📜 基于 Node.js 的发布说明生成器，从 CHANGELOG.md 读取内容

### Fixed / 修复
- 🖥️ Caption window white-flash on Windows eliminated via ready-to-show pattern
- 🖥️ 通过 ready-to-show 模式消除 Windows 上字幕窗口的白色闪烁
- 🖥️ Caption text now properly cleared between recording sessions
- 🖥️ 录制会话之间字幕文本现在正确清除
- 🖥️ Caption window follows main window display on multi-monitor setups
- 🖥️ 多显示器环境下字幕窗口跟随主窗口所在显示器
- 🖥️ Caption state (text, style, draggable) synced on window recreation
- 🖥️ 字幕窗口重建时同步状态（文本、样式、拖拽）
- 🎨 Caption style settings now properly merge with defaults for new fields
- 🎨 字幕样式设置现在正确合并默认值以支持新字段

### Changed / 变更
- 📄 License changed from MIT to Apache-2.0
- 📄 许可证从 MIT 更改为 Apache-2.0
- 📝 All README translations refreshed for v1.3.2
- 📝 所有 README 翻译已为 v1.3.2 更新
- 📝 Local-runtimes documentation clarified (build-time vs runtime assets)
- 📝 本地运行时文档已澄清（构建时资产与运行时资产）

---

## [1.3.0] - 2026-03-02

### Added / 新增
- 🍎 macOS support - Native traffic light integration, ScreenCaptureKit audio capture, DMG distribution
- 🍎 macOS 支持 - 原生红绿灯集成、ScreenCaptureKit 音频捕获、DMG 分发
- 🐧 Linux support - AppImage/DEB packages, PulseAudio loopback, auto-update for AppImage
- 🐧 Linux 支持 - AppImage/DEB 包、PulseAudio 回环捕获、AppImage 自动更新
- 🖥️ Cross-platform caption window - Transparent overlay on Win/Mac, composited fallback on Linux
- 🖥️ 跨平台字幕窗口 - Win/Mac 透明叠加层、Linux 合成器回退
- 🎨 Multi-color theme system - Cyan/Violet/Rose/Green/Amber theme palette
- 🎨 多色主题系统 - 青色/紫色/玫瑰/绿色/琥珀色主题

### Fixed / 修复
- 🔧 `setIgnoreMouseEvents` forward option guard for Linux compatibility
- 🔧 `setIgnoreMouseEvents` forward 选项 Linux 兼容性守卫
- 📦 Platform-specific extraResources to avoid packaging unnecessary icons
- 📦 平台专属 extraResources 避免打包不必要的图标
- 🖼️ ICNS generation skip on non-macOS platforms
- 🖼️ 非 macOS 平台跳过 ICNS 生成
- 🔤 Linux CJK font fallback in caption.html
- 🔤 caption.html 中 Linux CJK 字体回退
- ⌨️ globalShortcut.register() try-catch for Linux environments
- ⌨️ globalShortcut.register() 为 Linux 环境添加 try-catch
- 💬 dialog.showMessageBox TypeScript type fix when mainWindow is destroyed
- 💬 dialog.showMessageBox 主窗口销毁时的 TypeScript 类型修复

---

## [1.0.2] - 2026-01-20

### Added / 新增
- 🎬 SRT/VTT subtitle export - Export transcriptions as subtitle files
- 🎬 SRT/VTT 字幕导出 - 将转录内容导出为字幕文件
- ⏱️ Token timestamp support - Save timing information for subtitle generation
- ⏱️ Token 时间戳支持 - 保存时间信息用于字幕生成

---

## [1.0.1] - 2026-01-20

### Added / 新增
- 🔄 Auto-update feature - Check and download updates from GitHub Releases
- 🔄 自动更新功能 - 从 GitHub Releases 检查和下载更新
- ⚙️ "Auto-check updates on startup" setting toggle
- ⚙️ "启动时自动检查更新"设置开关
- 📄 Traditional Chinese README (README_TW.md)
- 📄 繁体中文 README (README_TW.md)
- 🤖 GitHub Actions workflow for automated releases
- 🤖 GitHub Actions 自动发布工作流

### Fixed / 修复
- 🔇 Silent handling of 404 errors when no release exists
- 🔇 当没有发布版本时静默处理 404 错误

---

## [1.0.0] - 2026-01-19

### Added / 新增
- 🎯 Real-time audio transcription with system audio capture
- 🎯 实时音频转录，支持系统音频捕获
- 🔌 Multi-ASR provider support (Soniox, Volcengine)
- 🔌 多 ASR 服务商支持（Soniox、火山引擎）
- 🌍 Multi-language support (60+ languages)
- 🌍 多语言支持（60+ 种语言）
- 📚 History records with tags and search
- 📚 历史记录管理，支持标签和搜索
- 📤 Export to TXT files
- 📤 导出为 TXT 文件
- 🎨 Dark/Light theme support
- 🎨 深色/浅色主题支持
- 🖥️ Modern frameless window UI
- 🖥️ 现代化无边框窗口界面
- 🚀 Auto-start at login option
- 🚀 开机自启动选项
- 💾 Data import/export for backup
- 💾 数据导入/导出备份功能
- 🌐 Chinese and English interface
- 🌐 中英文界面支持

---

## How to use this file / 如何使用此文件

When releasing a new version:
发布新版本时：

1. Add a new section at the top with the version number and date
   在顶部添加新的版本号和日期

2. List changes under appropriate categories:
   在适当的分类下列出更改：
   - **Added** / 新增 - New features
   - **Changed** / 变更 - Changes in existing functionality
   - **Deprecated** / 废弃 - Soon-to-be removed features
   - **Removed** / 移除 - Removed features
   - **Fixed** / 修复 - Bug fixes
   - **Security** / 安全 - Security improvements

3. Update the version in `package.json`
   更新 `package.json` 中的版本号

4. Create and push a git tag
   创建并推送 git tag
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```
