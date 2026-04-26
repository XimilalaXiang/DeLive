# 什么是 DeLive？

DeLive 是一个桌面转录工作台：捕获系统音频，路由到最合适的 ASR 后端，数据保留在本机，并将转录结果转化为可搜索、AI 驱动的复盘工作区。

## 核心能力

### 多 Provider ASR

DeLive 在统一界面下支持 **十种 ASR 后端**：

| Provider | 类型 | 模式 | 亮点 |
|----------|------|------|------|
| **Soniox V4** | 云端 | 实时流式 | Token 级转录、实时翻译、双语字幕、说话人分离 |
| **火山引擎** | 云端 | 实时流式 | 中文优化；内置代理处理所需 Header |
| **Groq** | 云端 | 窗口批处理 | Whisper large-v3-turbo，准实时更新 |
| **硅基流动** | 云端 | 窗口批处理 | SenseVoice、TeleSpeech、通义千问 Omni 模型 |
| **Mistral AI** | 云端 | 实时流式 | Voxtral Realtime；内置代理处理认证 |
| **Deepgram** | 云端 | 实时流式 | Nova-3 / Nova-2 流式 ASR；最适合英语和多语言 |
| **AssemblyAI** | 云端 | 实时流式 | Universal-3 Pro 流式；针对英语优化 |
| **ElevenLabs** | 云端 | 实时流式 | Scribe v2 Realtime；90+ 种语言含中文 |
| **本地 OpenAI 兼容** | 本地 | 窗口批处理 | 兼容 Ollama 或任何 `/v1/audio/transcriptions` 端点 |
| **本地 whisper.cpp** | 本地 | Electron 托管运行时 | 完全离线；DeLive 管理二进制文件和模型生命周期 |

### AI 复盘工作台

录制结束后，会话进入全页复盘工作区，包含六个标签：

- **转录** — 带时间戳的分段，支持说话人标记，可导出 TXT/Markdown/SRT/VTT
- **AI 纠错** — 直接纠错（流式重写）或先检测后纠错（逐条审查、接受/忽略）；智能文本源选择
- **概览** — AI 摘要、行动项、关键词、章节、标题/标签建议
- **AI 分析** — 基于配置 AI 模型的深度分析
- **对话** — 多线程 AI 对话，支持 GFM Markdown 渲染和代码高亮
- **思维导图** — 生成并编辑 Markmap 兼容 Markdown，导出 SVG/PNG

![复盘历史](/images/screenshot-review-history.png)

### 开放生态

DeLive 通过本地 API 暴露数据：

- **REST API** — 8 个端点，覆盖会话、主题、标签和录制状态
- **WebSocket** — 在 `/ws/live` 进行实时转录推流
- **MCP 服务器** — 独立 stdio 服务器，供 Claude Desktop、Cursor 等 AI Agent 使用
- **Agent Skill** — 为 AI Agent 提供结构化使用指南
- **Agent Skills** — 安装 DeLive Skill 后，任意 Agent 一键转录，返回转录文本、摘要、思维导图与关键词

### 本地优先架构

- 会话存储在 IndexedDB，配合内存缓存
- API 密钥通过 Electron `safeStorage` 加密
- 上下文隔离、可信 IPC 校验、CSP 注入
- Open API 默认关闭，可选 Bearer Token 鉴权

## 支持平台

DeLive 运行于 **Windows**、**macOS** 和 **Linux**。

| 平台 | 格式 |
|------|------|
| Windows | `.exe` 安装包、便携版 `.exe` |
| macOS | `.dmg`（Intel x64 和 Apple Silicon arm64） |
| Linux | `.AppImage`、`.deb` |
