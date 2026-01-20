# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本文件记录项目的所有重要更改。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
