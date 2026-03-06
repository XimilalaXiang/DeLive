# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本文件记录项目的所有重要更改。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
