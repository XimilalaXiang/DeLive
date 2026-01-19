# DesktopLive 🎙️

**Windows 桌面音频实时转录系统** - 基于 Soniox V3 ASR

捕获你的电脑正在播放的任何声音（浏览器视频、在线会议、播客等），实时转录为文字。

![DesktopLive Screenshot](./screenshot.png)

## ✨ 功能特性

- 🎯 **实时转录** - 捕获系统音频，即时转换为文字
- 🌍 **多语言支持** - 支持中文、英文及 60+ 种语言
- 📚 **历史记录** - 按日期/时间分组，支持自定义标题
- 📤 **导出功能** - 一键导出为 TXT 文件
- 🎨 **简洁界面** - 浅色主题，清爽易用

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Soniox API 密钥 ([获取地址](https://console.soniox.com))

### 安装

```bash
# 克隆项目
cd DesktopLive

# 安装所有依赖
npm run install:all
```

### 运行

```bash
# 开发模式（同时启动前端和后端）
npm run dev
```

访问 http://localhost:5173

### 使用步骤

1. **配置 API 密钥** - 首次使用会自动弹出设置窗口，输入你的 Soniox API 密钥
2. **开始录制** - 点击"开始录制"按钮
3. **选择音频源** - 在弹出的窗口中选择要共享的标签页/窗口，**确保勾选"共享音频"**
4. **实时转录** - 系统将自动捕获音频并显示转录结果
5. **停止录制** - 点击"停止录制"按钮，转录内容将自动保存到历史记录

## 📁 项目结构

```
DesktopLive/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   ├── stores/       # 状态管理
│   │   ├── types/        # TypeScript 类型
│   │   └── utils/        # 工具函数
│   └── ...
├── server/            # Node.js 后端
│   └── src/
│       └── index.ts      # Express 服务器
└── package.json
```

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 后端 | Node.js + Express |
| ASR 引擎 | Soniox V3 (stt-rt-v3) |

## 📝 API 说明

### 临时 API 密钥

出于安全考虑，前端不会直接使用你的 Soniox API 密钥。而是通过后端生成临时 API 密钥（有效期 5 分钟）用于 WebSocket 连接。

### 音频捕获

使用浏览器的 `getDisplayMedia` API 捕获系统音频。这需要用户手动选择要共享的音频源。

## ⚠️ 注意事项

1. **浏览器支持** - 推荐使用 Chrome/Edge 浏览器
2. **音频选择** - 选择共享时必须勾选"共享音频"选项
3. **API 配额** - 注意 Soniox API 的使用配额限制

## 📄 许可证

MIT License

---

Made with ❤️ using [Soniox](https://soniox.com) Speech-to-Text API
