# 录制

## 典型流程

1. 打开设置，选择一个 Provider（详见 [ASR Provider](./providers)）。
2. 填写凭证（详见 [API Key 获取指引](./api-keys)），运行 **测试配置**。
3. 在 Live 页面点击 **开始录制**。
4. 选择一个屏幕或窗口 — 确保启用了 **音频共享**。
5. 观察部分文本和最终文本在主窗口及可选悬浮字幕窗中实时更新。
6. 点击 **停止录制**。会话被保存，可在历史记录中查看。

![实时转录](/images/screenshot-live.png)

## 音频捕获

DeLive 通过 `getDisplayMedia` 的 loopback 音频捕获 **系统音频**。捕获管线根据 Provider 自动选择合适的音频路径：

| 音频模式 | 格式 | 使用者 |
|---------|------|--------|
| `MediaRecorder` | WebM/Opus 块 | Soniox、本地 OpenAI 兼容 |
| `AudioWorklet` PCM16 | 16 kHz 单声道原始 PCM | 火山引擎、Groq、硅基流动、whisper.cpp |

::: info
你必须选择一个屏幕或窗口来共享。DeLive 捕获你所选来源的音频 — 浏览器标签页、会议应用、媒体播放器或任何其他播放源。
:::

## 会话生命周期

会话经历以下状态：

```
idle → starting → recording → stopping → completed
                     ↓
                interrupted（应用崩溃/强制退出）
                     ↓
              下次启动时恢复
```

- **草稿会话** 在录制开始时创建，每 1.2 秒自动保存。
- **中断会话** 在下次启动时检测，可恢复或忽略。
- **已完成会话** 出现在历史记录列表中，支持复盘、AI 处理和导出。

## 设备变更

如果录制过程中音频设备发生变化（如插入耳机），DeLive 根据 Provider 的 `captureRestartStrategy` 处理：

- **`reconnect-session`**（Soniox）— 断开 Provider 连接并重新建立新会话
- **`reuse-session`**（其他所有）— 仅重启捕获管线，保持 Provider 连接

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | 显示/隐藏主窗口 |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | 切换录制 |
