# DeLive 🎙️

**Windows 桌面音频实时转录系统** - 基于 Soniox V3 ASR

捕获你的电脑正在播放的任何声音（浏览器视频、在线会议、播客等），实时转录为文字。

<img width="1506" height="975" alt="PixPin_2026-01-19_22-26-21" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />

## ✨ 功能特性

- 🎯 **实时转录** - 捕获系统音频，即时转换为文字
- 🌍 **多语言支持** - 支持中文、英文及 60+ 种语言
- 📚 **历史记录** - 按日期/时间分组，支持自定义标题和标签
- 📤 **导出功能** - 一键导出为 TXT 文件
- 🎨 **深色/浅色主题** - 支持主题切换，保护眼睛
- 🖥️ **现代化界面** - 无边框窗口，自定义标题栏
- 🚀 **开机自启动** - 可选开机自动启动，最小化到托盘
- 💾 **数据备份** - 支持导入/导出数据，轻松迁移

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Soniox API 密钥 ([获取地址](https://console.soniox.com))

### 安装

```bash
# 克隆项目
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive

# 安装所有依赖
npm run install:all
```

### 开发模式

```bash
# 启动开发模式（前端 + Electron）
npm run dev
```

### 打包构建

```bash
# 打包 Windows 应用
npm run dist:win
```

打包后的文件位于 `release/` 目录：
- `DeLive-x.x.x-x64.exe` - 安装程序
- `DeLive-x.x.x-portable.exe` - 便携版

## 📖 使用步骤

1. **配置 API 密钥** - 首次使用会自动弹出设置窗口，输入你的 Soniox API 密钥
2. **开始录制** - 点击"开始录制"按钮
3. **选择音频源** - 在弹出的窗口中选择要共享的屏幕/窗口
4. **实时转录** - 系统将自动捕获音频并显示转录结果
5. **停止录制** - 点击"停止录制"按钮，转录内容将自动保存到历史记录

## 📁 项目结构

```
DeLive/
├── electron/          # Electron 主进程
│   ├── main.ts           # 主进程入口
│   └── preload.ts        # 预加载脚本
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── stores/       # Zustand 状态管理
│   │   ├── types/        # TypeScript 类型
│   │   └── utils/        # 工具函数
│   └── ...
├── server/            # Node.js 后端（临时 API 密钥生成）
├── build/             # 应用图标资源
├── scripts/           # 构建脚本
└── package.json
```

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 40 |
| 前端 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 后端 | Node.js + Express |
| ASR 引擎 | Soniox V3 (stt-rt-v3) |
| 打包工具 | electron-builder |

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` | 显示/隐藏主窗口 |

## 📝 API 说明

### 临时 API 密钥

出于安全考虑，前端不会直接使用你的 Soniox API 密钥。而是通过后端生成临时 API 密钥（有效期 5 分钟）用于 WebSocket 连接。

### 音频捕获

使用 Electron 的 `desktopCapturer` API 配合系统音频回环（loopback）捕获桌面音频，无需安装虚拟音频设备。

## ⚠️ 注意事项

1. **系统要求** - Windows 10/11 64位
2. **API 配额** - 注意 Soniox API 的使用配额限制
3. **托盘行为** - 点击关闭按钮会最小化到托盘，右键托盘图标选择"退出"完全关闭

## 📄 许可证

MIT License

## 🙏 致谢

- [Soniox](https://soniox.com) - 提供强大的语音识别 API
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

Made with ❤️ by [XimilalaXiang](https://github.com/XimilalaXiang)
