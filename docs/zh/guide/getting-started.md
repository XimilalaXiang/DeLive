# 快速开始

## 下载

从 [GitHub Releases](https://github.com/XimilalaXiang/DeLive/releases/latest) 获取最新版本。

| 平台 | 文件 |
|------|------|
| Windows | `.exe` 安装包、便携版 `.exe` |
| macOS | `.dmg`（Intel x64 和 Apple Silicon arm64） |
| Linux | `.AppImage`、`.deb` |

## 首次启动

1. **打开 DeLive** — 首次启动会自动跳转到设置页面。
2. **选择 Provider** — 在「服务」标签页中选择 ASR 后端。
3. **填写凭证** — 输入 API Key 或配置本地服务。
4. **测试配置** — 点击 **测试配置** 验证连通性。
5. **开始录制** — 进入 Live 页面，点击 **开始录制**，选择一个启用了音频共享的屏幕/窗口。

![实时转录界面](/images/screenshot-live.png)

::: tip Windows SmartScreen
Windows 可能在首次启动时显示 SmartScreen 警告。点击 **更多信息** → **仍要运行**。这对未签名的新分发应用是正常现象。
:::

## 系统要求

- **Windows** 10+
- **macOS** 13+
- **Linux** 需 PulseAudio loopback 支持
- 至少配置一个 ASR Provider（云端 API Key 或本地服务）

## Provider 快速配置

### 云端 Provider

| Provider | 需要什么 |
|----------|---------|
| Soniox | [soniox.com](https://soniox.com) 的 API Key |
| 火山引擎 | APP ID 和 Access Token |
| Groq | [groq.com](https://groq.com) 的 API Key |
| 硅基流动 | [siliconflow.cn](https://siliconflow.cn) 的 API Key |

### 本地 Provider

| Provider | 需要什么 |
|----------|---------|
| 本地 OpenAI 兼容 | 暴露 `/v1/models` 和 `/v1/audio/transcriptions` 的服务（如 Ollama） |
| 本地 whisper.cpp | `whisper-server` 二进制文件 + `.bin` 或 `.gguf` 模型 — 或让 DeLive 自动下载 |

## 从源码构建

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
npm run dev
```

`npm run dev` 同时启动 Vite 和 Electron。火山引擎代理在 Electron 主进程内运行。
