# 安全模型

DeLive 遵循桌面 Electron 应用的纵深防御原则。

## 上下文隔离

渲染进程以严格安全设置运行：

```
contextIsolation: true
nodeIntegration: false
```

渲染进程无法直接访问 Node.js API。与主进程的所有通信通过 `contextBridge` 暴露的 `electronAPI` 对象。

## 可信 IPC

敏感 IPC 处理器通过 `assertTrustedSender` 验证调用者：

1. `registerTrustedWindow(provider)` 注册窗口获取器
2. 每次敏感 IPC 调用时，`isTrustedSender(event)` 检查 `event.sender.id` 是否匹配已注册窗口
3. 仅 **主窗口** 和 **字幕窗口** 被信任

**受保护操作：** safeStorage 读写、诊断导出、开机自启切换、文件选择器、路径存在检查、更新下载/安装、本地 Runtime 管理。

## 内容安全策略

CSP 在 Electron 层通过 `session.webRequest.onHeadersReceived` 注入：

- `script-src` 仅在开发模式下包含 `'unsafe-eval'`
- `connect-src` 仅允许必需的端点（localhost、Provider API）

## 导航守卫

主窗口阻止导航到意外 URL。允许的源：

- `http://localhost:5173`（开发服务器）
- `file:`（生产打包应用）
- `devtools:`（开发工具）

外部 URL 通过 `shell.openExternal` 打开。

## 路径白名单

文件操作限制在安全目录：

- `userData`（Electron 应用数据）
- `home`、`desktop`、`downloads`、`documents`
- `temp`

超出这些根目录的文件路径操作被拒绝。

## 密钥存储

API Key 使用 Electron 的 `safeStorage` API 加密：

1. `safeStorage.encryptString(value)` 生成加密缓冲区
2. 缓冲区写入 `userData/safe-store/ss_<key>` 文件
3. `safeStorage.decryptString(buffer)` 获取明文

使用 OS 密钥链（macOS Keychain、Windows Credential Manager、Linux Secret Service）。

## Open API 安全

本地 REST API 和 WebSocket 有多层安全保护：

| 层 | 行为 |
|----|------|
| **默认禁用** | 显式启用前 API 返回 403 |
| **可选 Bearer Token** | 设置后所有请求必须包含令牌 |
| **仅 localhost** | 服务器绑定到 localhost；网络不可访问 |
| **只读** | 无修改端点；会话无法通过 API 修改 |

::: warning
API 启用但无令牌时，本机上的任何进程都可读取转录数据。这是为本地开发方便而做的有意权衡。
:::

## 无 API 录制控制

`getDisplayMedia()` 需要明确的用户交互（屏幕/窗口选择器）。DeLive 有意不通过 API 暴露 `start_recording` 或 `stop_recording`。这是安全正向决策 — 外部进程无法静默启动音频捕获。

## 诊断卫生

诊断导出（`export-diagnostics` IPC）在写入 JSON 包前脱敏看起来像密钥的字段（API Key、Token）。
