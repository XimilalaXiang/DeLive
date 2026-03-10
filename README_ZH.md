<div align="center">

<img src="assets/icon.svg" width="128" height="128" alt="DeLive Logo">

# DeLive

**系统音频捕获 | 多 Provider ASR | 本地优先的会话复盘工作台**

[English](./README.md) | 简体中文 | [繁體中文](./README_TW.md) | [日本語](./README_JA.md)

[![版本](https://img.shields.io/github/v/release/XimilalaXiang/DeLive?label=版本&color=blue)](https://github.com/XimilalaXiang/DeLive/releases)
[![许可证](https://img.shields.io/github/license/XimilalaXiang/DeLive?label=许可证&color=green)](https://github.com/XimilalaXiang/DeLive/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://github.com/XimilalaXiang/DeLive/releases)
[![Platform](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://github.com/XimilalaXiang/DeLive/releases)
[![Platform](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](https://github.com/XimilalaXiang/DeLive/releases)
[![下载量](https://img.shields.io/github/downloads/XimilalaXiang/DeLive/total?label=下载量&color=orange)](https://github.com/XimilalaXiang/DeLive/releases)
[![Stars](https://img.shields.io/github/stars/XimilalaXiang/DeLive?style=social)](https://github.com/XimilalaXiang/DeLive)

[核心功能](#-核心功能) • [项目组成](#-项目组成) • [系统架构](#-系统架构) • [支持的 Provider](#-支持的-asr-provider) • [快速开始](#-快速开始)

</div>

DeLive 是一个面向系统音频的桌面转录工作台。它会把电脑正在播放的声音捕获下来，按所选 Provider 的能力选择最合适的转录链路，把会话保存在本地，并在录制结束后继续提供历史检索、AI briefing、单会话问答和思维导图整理能力。

<div align="center">
<img width="800" alt="DeLive 截图" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />
</div>

## 🎯 核心功能

- **真正面向桌面场景的系统音频采集**。网页视频、直播、会议、课程、播客，只要共享系统音频即可接入。
- **6 条 ASR 路径统一在一个 UI 里**。Soniox、火山引擎、Groq、硅基流动、本地 OpenAI-compatible、本地 `whisper.cpp`。
- **按 Provider 能力自动切换音频管线**。根据后端要求在 `MediaRecorder` 和 `AudioWorklet` PCM16 之间切换。
- **同一应用内覆盖 3 种执行模式**。实时流式、窗口批处理重转写、Electron 管理的本地 runtime。
- **完整会话生命周期管理**。草稿会话、录制中自动保存、异常中断后的下次启动恢复、已完成历史记录。
- **悬浮字幕窗**。独立始终置顶窗口，支持原文 / 翻译 / 双语模式、拖动/锁定和样式自定义。
- **Soniox 专属双语与说话人能力**。实时翻译、双语字幕、发言人区分 token、按 speaker 分组的会话预览。
- **面向已完成会话的 AI 复盘工作台**。支持结构化 briefing、标题/标签建议、带引用的会话问答，以及兼容 Markmap 的思维导图并可导出 SVG / PNG。
- **本地模型工作流**。探测本地服务、发现已安装模型、可选 Ollama 一键拉取，以及 `whisper.cpp` binary / 模型导入与下载。
- **本地优先的数据存储**。会话、标签、设置保存在 IndexedDB / localStorage；密钥在系统支持时通过 Electron `safeStorage` 保存。
- **桌面集成能力**。托盘、全局快捷键、开机自启动、更新检查、诊断导出、音源选择器、类型化 preload API。
- **安全加固**。可信窗口 IPC 校验、CSP 注入、导航守卫、路径白名单、诊断信息脱敏、密钥加密存储。

## 🧩 项目组成

| 模块 | 关键文件 | 职责 |
|------|----------|------|
| 桌面壳层 | `electron/main.ts`, `electron/mainWindow.ts`, `electron/captionWindow.ts`, `electron/tray.ts`, `electron/shortcuts.ts` | 启动 Electron，管理主窗、字幕窗、托盘、快捷键、更新和应用生命周期。 |
| 渲染层应用 | `frontend/src/App.tsx`, `frontend/src/components/*`, `frontend/src/i18n/*` | 主界面、设置、录制、历史、预览和字幕控制 UI。 |
| ASR 编排层 | `frontend/src/hooks/useASR.ts`, `frontend/src/services/captureManager.ts`, `frontend/src/services/providerSession.ts`, `frontend/src/services/captionBridge.ts` | 解析 Provider 配置、启动正确的音频采集链路、转发转录事件，并同步到悬浮字幕。 |
| Provider 抽象层 | `frontend/src/providers/registry.ts`, `frontend/src/providers/implementations/*` | 把 6 个后端统一到同一套 contract 和 capability 模型。 |
| 会话智能层 | `frontend/src/stores/sessionStore.ts`, `frontend/src/services/aiPostProcess.ts`, `frontend/src/components/PreviewModal.tsx`, `frontend/src/components/SessionMindMapCard.tsx` | 会话持久化、自动保存/恢复、AI briefing、问答、思维导图、标签和 speaker 名称编辑。 |
| 本地模型 / runtime 工具层 | `frontend/src/utils/localModelSetup.ts`, `frontend/src/utils/localRuntimeManager.ts`, `frontend/src/components/LocalModelSetupGuide.tsx`, `frontend/src/components/BundledRuntimeSetupGuide.tsx`, `electron/localRuntime.ts` | 探测本地服务、检查模型、支持 Ollama 拉取、管理 `whisper.cpp` 资源导入/下载/启动/停止。 |
| 共享契约层 | `shared/electronApi.ts`, `electron/preload.ts`, `shared/volcProxyCore.ts` | 定义 renderer 与 main 的类型化桥接接口，以及火山代理共享协议辅助逻辑。 |
| 调试与发布支持 | `server/`, `scripts/`, `.github/workflows/release.yml` | 独立火山代理调试、图标/运行时预置脚本、release notes 生成、tag 触发的多平台构建发布。 |
| 设计参考 | `design-system/delive/MASTER.md` | 产品与视觉参考资料，不参与运行时逻辑。 |

## 🔄 录制生命周期

1. `App.tsx` 启动后初始化存储、主题、设置、标签和历史会话。
2. `useASR` 调用 `ProviderSessionManager`，根据当前 Provider 的能力解析连接方式。
3. `CaptureManager` 通过 `getDisplayMedia` 获取系统音频，并在 `MediaRecorder` 与 `AudioWorklet` PCM16 之间做选择。
4. Provider 返回的事件写入 `sessionStore`，`CaptionBridge` 同时把稳定文本和非最终文本同步到悬浮字幕窗。
5. `sessionStore` 会持续构建会话快照、自动保存草稿，并在下次启动时恢复被中断的会话。
6. 已完成会话进入历史区，可进一步做转录复盘、AI 摘要、问答、思维导图、标签整理和导出。

## 🏗️ 系统架构

```mermaid
graph TB
    subgraph "桌面壳层"
        EM[Electron 主进程]
        WIN[主窗口]
        CAP[字幕悬浮窗]
        DESK[托盘 / 快捷键 / 自启动 / 更新]
        SEC[IPC 安全 / SafeStorage / Diagnostics]
    end

    subgraph "渲染层"
        UI[React App]
        STORES[Zustand Stores]
        CFG[Provider 与 Runtime 设置]
        PREV[历史 / 预览 / AI 工作台]
    end

    subgraph "编排层"
        ASR[useASR]
        CAPMGR[CaptureManager]
        PROVSESS[ProviderSessionManager]
        CAPBR[CaptionBridge]
    end

    subgraph "采集管线"
        GDM[getDisplayMedia]
        MR[MediaRecorder<br/>WebM / Opus]
        AP[AudioWorklet<br/>PCM16 16kHz]
    end

    subgraph "Provider 层"
        REG[Provider Registry]
        SON[Soniox]
        VOL[Volcengine]
        GRQ[Groq]
        SIL[SiliconFlow]
        LOA[Local OpenAI-compatible]
        WCP[whisper.cpp Runtime]
    end

    subgraph "Electron 服务"
        PROXY[内置火山代理]
        RTM[本地 Runtime 控制器]
    end

    subgraph "持久化"
        REPO[Session Repository]
        IDB[IndexedDB]
        LS[localStorage]
        SAFE[safeStorage]
    end

    UI --> STORES
    UI --> CFG
    UI --> PREV
    UI --> ASR

    ASR --> CAPMGR
    ASR --> PROVSESS
    ASR --> CAPBR

    CAPMGR --> GDM
    GDM --> MR
    GDM --> AP

    PROVSESS --> REG
    REG --> SON
    REG --> VOL
    REG --> GRQ
    REG --> SIL
    REG --> LOA
    REG --> WCP

    MR --> SON
    MR --> LOA
    AP --> VOL
    AP --> GRQ
    AP --> SIL
    AP --> WCP

    VOL --> PROXY
    WCP --> RTM

    STORES --> REPO
    REPO --> IDB
    REPO --> LS
    CFG --> SAFE

    UI --> EM
    EM --> WIN
    EM --> CAP
    EM --> DESK
    EM --> SEC
    EM --> PROXY
    EM --> RTM
    CAPBR --> CAP

    style UI fill:#61dafb,color:#000
    style EM fill:#334155,color:#fff
    style CAP fill:#f472b6,color:#000
    style REG fill:#f59e0b,color:#000
    style PROXY fill:#10b981,color:#fff
    style RTM fill:#0f766e,color:#fff
    style SEC fill:#ef4444,color:#fff
    style SAFE fill:#a855f7,color:#fff
    style IDB fill:#3b82f6,color:#fff
```

### 架构说明

| 层级 | 主要组件 | 说明 |
|------|----------|------|
| 桌面壳层 | Electron 主进程、主窗、字幕窗、托盘、更新、诊断 | 负责原生生命周期、音源选择、字幕叠加和系统集成。 |
| 渲染层 | React UI、Zustand stores、历史/预览工作台、设置面板 | 负责录制流程、配置、会话复盘和用户交互。 |
| 编排层 | `useASR`、`CaptureManager`、`ProviderSessionManager`、`CaptionBridge` | 让采集、Provider 和 UI 解耦。 |
| Provider 层 | 注册表 + 6 个实现 | 同时覆盖实时云端、窗口批处理云端、本地服务和本地 runtime。 |
| Electron 服务 | 内置火山代理、本地 runtime 控制器、safe-storage IPC、diagnostics IPC | 提供浏览器环境无法直接完成的能力。 |
| 持久化 | Session Repository、IndexedDB、localStorage、`safeStorage` | 自动保存草稿、恢复中断会话，并将密钥与普通设置分开存储。 |
| 共享契约 | 类型化 preload bridge 与共享 helper | 让 renderer/main 的接口显式可维护。 |

## 🔌 支持的 ASR Provider

| Provider | 类型 | 传输模式 | 音频路径 | 亮点 |
|----------|------|----------|----------|------|
| **Soniox V4** | 云端 | 实时流式 | `MediaRecorder` (`webm/opus`) → WebSocket | token 级实时转录、实时翻译、双语字幕、多发言人识别 |
| **火山引擎** | 云端 | 实时流式 | `AudioWorklet` PCM16 → 内置代理 → WebSocket | 中文场景友好；代理在 Electron 侧补齐必须 Header |
| **Groq** | 云端 | 窗口批处理重转写 | `AudioWorklet` PCM16 → WAV → REST | 基于 Whisper 的准实时会话更新路径 |
| **硅基流动** | 云端 | 窗口批处理重转写 | `AudioWorklet` PCM16 → WAV → REST | SenseVoice、TeleSpeech、Qwen Omni 等模型路径 |
| **本地 OpenAI-compatible** | 本地服务 | 窗口批处理重转写 | `MediaRecorder` (`webm/opus`) → `/v1/audio/transcriptions` | 适配 Ollama 或其他兼容网关，支持服务/模型探测和可选 Ollama 拉取 |
| **本地 `whisper.cpp`** | 本地 runtime | Electron 管理的本地 runtime | `AudioWorklet` PCM16 → 本地 `/inference` | 直接启动 `whisper-server`，管理 binary 与模型资源，全本地运行 |

## 🚀 快速开始

### 前置要求

- Node.js 18+（CI 中使用 Node 20）
- 任意一种 Provider 路径：
  - **Soniox**：[soniox.com](https://soniox.com) 的 API Key
  - **火山引擎**：APP ID 和 Access Token
  - **Groq**：[groq.com](https://groq.com) 的 API Key
  - **硅基流动**：[siliconflow.cn](https://siliconflow.cn) 的 API Key
  - **本地 OpenAI-compatible**：暴露 `/v1/models` 与 `/v1/audio/transcriptions` 的本地服务
  - **本地 `whisper.cpp`**：`whisper-server` + 本地 `.bin` / `.gguf` 模型，或直接让 DeLive 导入/下载

### 安装

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
```

### 开发

```bash
npm run dev
```

`npm run dev` 会同时启动 Vite 和 Electron。火山引擎代理已内置在 Electron 主进程中，正常桌面开发不需要单独后端。

如需单独调试代理：

```bash
npm run dev:server
```

### 质量检查

```bash
npm run check
```

`npm run check` 会执行前端 lint、前端测试和完整构建。

如果只想跑前端测试：

```bash
npm run test:frontend
```

当前测试状态：**22 个测试文件、184 个测试用例全部通过**，覆盖 Provider 配置、转录状态/稳定化、字幕导出、会话生命周期与仓储、存储以及 AI 后处理解析。

### 打包

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
npm run dist:all
```

构建产物输出到 `release/`。

### 可选：打包时预置 `whisper.cpp`

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
```

如果构建时 `local-runtimes/whisper_cpp/whisper-server(.exe)` 已存在，`electron-builder` 会把它作为额外资源带进安装包。即便没有预置，终端用户也仍然可以在 UI 中自行导入或下载 binary / 模型。

## 📖 使用说明

### 典型录制流程

1. 打开设置，选择一个 Provider。
2. 填写凭据或本地 runtime 信息，并点击 **测试配置**。
3. 点击 **开始录制**。
4. 选择要共享的屏幕或窗口，并确认勾选共享音频。
5. 在主窗口和悬浮字幕窗里查看中间结果与最终结果。
6. 停止录制后，从历史记录打开会话继续复盘、做 AI 操作或导出。

### 悬浮字幕

- 可以从主界面开启或关闭悬浮字幕窗。
- 支持字体、颜色、宽度、行数、阴影和位置调整。
- 当 Provider 返回翻译文本时，可切换原文、翻译、双语三种模式。
- 支持拖动 / 交互状态切换，便于摆放字幕窗位置。

### AI 复盘工作台

已完成会话在预览弹窗里不只是“看转录”：

- **AI briefing**：摘要、行动项、关键词、章节、标题建议、标签建议
- **会话问答**：只针对当前会话提问，回答可带短引用
- **思维导图**：生成兼容 Markmap 的 Markdown，支持编辑后导出 SVG / PNG
- **元数据操作**：一键应用建议标题/标签，对 diarization 会话重命名 speaker

### 本地 OpenAI-compatible 服务

1. 选择 **本地 OpenAI-compatible**。
2. 填写 `Base URL` 和 `Model`。
3. 用本地模型引导探测服务并列出已安装模型。
4. 如果探测出来是 Ollama，DeLive 可以直接一键拉取所选模型。

### 本地 `whisper.cpp` Runtime

1. 选择 **本地 whisper.cpp**。
2. 通过导入现有 `whisper-server` 或下载官方 release 资产准备 runtime binary。
3. 通过选择、导入或下载 `.bin` / `.gguf` 文件准备模型。
4. 启动 runtime 或执行 **测试配置**。
5. 之后录制方式与其他 Provider 一致，Electron 会通过 IPC 管理 runtime 生命周期。

### 历史、备份与恢复

- 会话支持重命名、打标签、搜索，以及导出 TXT、SRT、VTT。
- 录制草稿会自动保存；如果应用中断，下次启动可以恢复未完成会话。
- 支持导入 / 导出全部本地数据，用于备份和迁移。
- 诊断导出会生成一个脱敏 JSON，包含系统信息和最近日志，便于排障。

## 📁 项目结构

```text
DeLive/
├── electron/                         # Electron 主进程、窗口、托盘、IPC、更新、本地 runtime 控制
├── frontend/                         # React 渲染层、Provider、Store、UI 组件、测试
├── shared/                           # preload/renderer/main 共用的 TypeScript 契约与代理 helper
├── server/                           # 主要用于调试的独立火山引擎代理
├── local-runtimes/                   # 可选的预置 runtime 资源（供 whisper.cpp 打包）
├── scripts/                          # 图标生成、runtime 获取/预置、release notes
├── design-system/                    # 设计参考资料
├── assets/                           # README 与品牌素材
├── build/                            # electron-builder 图标与打包资源
├── .github/workflows/release.yml     # tag 触发的质量检查 + 发布流程
├── README.md
└── package.json
```

这里省略了 `dist-electron/`、`release/`、依赖目录等生成产物。

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 桌面应用 | Electron 40 |
| 前端 | React 18.3 + TypeScript 5.6 + Vite 6 |
| 样式 | Tailwind CSS 3.4 |
| 状态管理 | Zustand 4.5 |
| 测试 | Vitest 4 |
| 音频处理 | `MediaRecorder`、`AudioWorklet`、WAV 转换工具 |
| 桌面服务 | Electron 主进程 IPC、Express、`ws` |
| 持久化 | IndexedDB、localStorage、Electron `safeStorage` |
| AI 复盘 | OpenAI-compatible chat completions（briefing / 问答 / 思维导图） |
| 打包 | `electron-builder` |
| 发布自动化 | GitHub Actions tag 工作流 |

## 🔒 安全

| 特性 | 说明 |
|------|------|
| 上下文隔离 | `contextIsolation: true`，`nodeIntegration: false` |
| 可信 IPC 发送者 | 敏感 handler 会校验调用者是否为注册过的可信窗口 |
| 内容安全策略 | 在 Electron 层注入 CSP，只放行必要的连接目标 |
| 导航守卫 | 阻止渲染层意外跳转到非预期 URL |
| 路径白名单 | 文件路径检查仅允许 `userData`、home、desktop、downloads、documents 等安全根目录 |
| 密钥存储 | 系统支持时通过 Electron `safeStorage` 保存 API Key |
| 诊断脱敏 | 导出的诊断 JSON 会先清洗疑似密钥字段 |

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | 显示或隐藏主窗口 |

## 🔧 扩展 Provider

1. 在 `frontend/src/providers/implementations/` 下新增 Provider 实现。
2. 正确声明 `ASRProviderInfo`、必填字段和 capability 标记。
3. 在 `frontend/src/providers/registry.ts` 注册。
4. 如果支持配置验证，在 `frontend/src/utils/providerConfigTest.ts` 增加对应逻辑。
5. 如果是本地服务或本地 runtime 路径，在 `frontend/src/utils/localModelSetup.ts` 或 `frontend/src/utils/localRuntimeManager.ts` 接入配套能力。
6. 如果需要自定义 Header 或原生进程控制，在 `electron/` 侧补充支持。

## ⚠️ 注意事项

1. **系统要求**：Windows 10+、macOS 13+、或具备 PulseAudio loopback 的 Linux。
2. **火山引擎代理**：正常桌面使用无需单独后端，Electron 会自动启动内置代理。
3. **本地 OpenAI-compatible 模式**：模型发现依赖 `/v1/models`，转录依赖 `/v1/audio/transcriptions`。
4. **`whisper.cpp` 模式**：预置 binary 只是可选项，用户也可以运行时后续导入或下载。
5. **托盘行为**：关闭主窗口默认会隐藏到托盘，而不是直接退出。
6. **开机自启动**：当前支持 Windows 和 macOS。
7. **自动更新**：支持 Windows、macOS 和 Linux AppImage。

### 🛡️ Windows SmartScreen 提示

首次运行 DeLive 时，Windows 可能弹出 SmartScreen 警告。这对未签名或新发布的桌面应用是正常现象。

1. 点击 **更多信息**。
2. 点击 **仍要运行**。

也可以直接审查源码，或者自行校验发布产物。

## 📄 许可证

Apache License 2.0

## 🙏 致谢

- [Soniox](https://soniox.com) — 实时语音识别 API
- [火山引擎](https://www.volcengine.com) — 中文语音识别
- [Groq](https://groq.com) — 高性能 Whisper 推理
- [硅基流动](https://siliconflow.cn) — 语音与多模态 ASR 服务
- [Ollama](https://ollama.com) — 本地模型工作流
- [`whisper.cpp`](https://github.com/ggml-org/whisper.cpp) — 本地开源 runtime
- [BiBi-Keyboard](https://github.com/BryceWG/BiBi-Keyboard) — 多 Provider 架构灵感

---

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=XimilalaXiang/DeLive&type=date&legend=top-left)](https://www.star-history.com/#XimilalaXiang/DeLive&type=date&legend=top-left)

**Made by [XimilalaXiang](https://github.com/XimilalaXiang)**

</div>
