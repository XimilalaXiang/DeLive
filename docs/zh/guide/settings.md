# 设置

DeLive 设置分为两个标签页：**服务**（Provider 配置）和 **通用**（应用全局偏好设置）。

## 服务标签页

### Provider 选择

从十种 ASR Provider 中选择。每个 Provider 有各自的配置字段（API Key、端点、模型、语言提示）。

### 配置测试

所有 Provider 都支持 **测试配置** 按钮，在录制前验证凭证和连通性。

![设置 — 服务标签页](/images/screenshot-settings-api.png)

### 本地服务发现

对于 **本地 OpenAI 兼容**，DeLive 可以：
- 在配置的 Base URL 处探测服务
- 通过 `/v1/models` 列出已安装的模型
- 检测到 Ollama 时可拉取模型

### Runtime 设置

对于 **本地 whisper.cpp**，内置的 Runtime 指南帮助你：
- 导入或下载 `whisper-server` 二进制文件
- 导入或下载 `.bin` / `.gguf` 模型
- 测试 Runtime 配置

## 通用标签页

### 界面语言

在 **中文**（默认）和 **英文** 之间切换。

### 颜色主题

五种配色方案：**青蓝**、**紫罗兰**、**玫瑰**、**绿色**、**琥珀**。每种都支持完整的明暗模式。明暗切换在顶部导航栏中。

### AI 后处理

配置用于 AI 功能的 OpenAI 兼容端点：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| Base URL | Chat completions 端点 | `http://127.0.0.1:11434/v1` |
| 模型 | 模型标识符 | — |
| API Key | 可选认证 | — |
| 提示语言 | `zh` 或 `en` | `zh` |

### Open API

控制对 DeLive 数据的外部访问（仅 Electron）：

| 设置 | 说明 |
|------|------|
| **启用 Open API** | 开关本地 REST API 和 WebSocket |
| **访问令牌** | 可选 Bearer Token 认证 |
| **生成随机令牌** | 创建加密安全的随机令牌 |
| **端点 URL** | 显示 REST 和 WebSocket URL，带复制按钮 |

::: warning
当 Open API 启用但令牌为空时，任何本地进程都可以访问你的转录数据。在生产使用中请设置令牌。
:::

### 数据管理

- **导出** — 将所有会话、标签和设置下载为 JSON
- **导入** — 从备份文件恢复（覆盖或合并）

### 桌面集成

- **开机自启** — 系统登录时启动 DeLive（Windows 和 macOS）
- **自动更新** — 自动检查更新
- **诊断导出** — 生成脱敏的 JSON 包用于故障排查
