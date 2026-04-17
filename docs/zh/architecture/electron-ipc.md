# Electron 与 IPC

## 主进程初始化

Electron 主进程（`electron/main.ts`）按以下顺序初始化：

1. 安装日志拦截器（500 行环形缓冲区用于诊断）
2. 设置平台特定标志（macOS ScreenCaptureKit、Linux PulseAudio loopback）
3. 创建字幕窗口控制器
4. 注册可信窗口（主窗口 + 字幕窗口）
5. 创建桌面源和本地 Runtime 控制器
6. 请求单实例锁（如有其他实例运行则退出）
7. `app.whenReady()` 时：
   - 在端口 23456 启动 HTTP 服务器（火山引擎代理）
   - 将 API 服务器附加到 HTTP 服务器
   - 创建主窗口
   - 创建系统托盘
   - 注册全局快捷键
   - 设置自动更新器（如支持）
8. 注册所有 IPC 处理器

## IPC 模块

| 模块 | 用途 | 需要信任 |
|------|------|---------|
| `appIpc.ts` | 窗口控制、开机自启、文件选择器 | 部分（仅敏感操作） |
| `captionIpc.ts` | 字幕窗口文本、样式、拖拽、位置 | 否 |
| `safeStorageIpc.ts` | 通过 OS 密钥链加解密密钥 | 是 |
| `updaterIpc.ts` | 检查、下载、安装更新 | 是（下载/安装） |
| `diagnosticsIpc.ts` | 导出脱敏诊断 JSON | 是 |
| `apiIpc.ts` | 桥接：主进程 ↔ 渲染进程的 API 数据 | 否 |
| `localRuntimeIpc.ts` | whisper.cpp 二进制/模型管理 | 是 |

## 可信窗口验证

`ipcSecurity.ts` 维护可信 `BrowserWindow` 提供者列表。`assertTrustedSender(event, channel)` 检查 `event.sender.id` 是否匹配已注册窗口的 `webContents.id`。

仅 **主窗口** 和 **字幕窗口** 被注册为可信。

## IPC 模式

### 主进程 → 渲染进程（请求/响应）

API 桥接（`apiIpc.ts`）使用：

```
主进程（apiServer 收到 HTTP 请求）
  → webContents.send('api-get-sessions', { limit, offset })
  → 渲染进程（useApiIpcResponder）处理请求
  → ipcRenderer.send('api-respond-sessions', data)
  → 主进程解析待处理的 Promise
  → HTTP 响应发送给客户端
```

该模式使用 **5 秒超时** 并以空数据回退以避免挂起。

### 渲染进程 → 主进程（单向）

会话生命周期通知：

```
渲染进程（sessionStore 检测到会话开始/结束）
  → ipcRenderer.send('api-notify-session-start', { sessionId })
  → 主进程（apiIpc.ts）接收通知
  → apiBroadcast 广播到 WebSocket 客户端
```

### 渲染进程 → 主进程（Invoke）

大多数操作的标准 Electron invoke 模式：

```
渲染进程: await window.electronAPI.getAppVersion()
  → ipcMain.handle('get-app-version', () => app.getVersion())
```

## Preload 桥接

`electron/preload.ts` 通过 `contextBridge.exposeInMainWorld` 暴露单一 `electronAPI` 对象。这是渲染进程与主进程通信的 **唯一** 方式。

完整 API 表面在 `shared/electronApi.ts` 中定义为 `ElectronAPI` TypeScript 接口，确保跨进程边界的类型安全。

## 窗口配置

### 主窗口

- 默认 1200×800，最小 800×600
- `frame: false`（自定义标题栏）
- `contextIsolation: true`、`nodeIntegration: false`
- `backgroundThrottling: false`（最小化时保持录制活跃）
- 通过 `session.webRequest.onHeadersReceived` 注入 CSP
- 导航限制为 localhost:5173、file: 和 devtools: URL

### 字幕窗口

- 独立的 `BrowserWindow` 用于悬浮字幕叠层
- `transparent: true`（Linux 使用半透明黑色）
- `alwaysOnTop: true`、`skipTaskbar: true`
- 非交互时鼠标穿透（`setIgnoreMouseEvents` 配合 `forward: true`）
- 鼠标位置轮询（100ms）检测悬停以临时启用交互
- 根据交互状态切换 `focusable`
