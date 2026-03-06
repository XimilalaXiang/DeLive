# DeLive 字幕与 Provider 修复复盘

日期: 2026-03-07

## 背景

本轮处理了三条连续问题链:

1. 硅基流动 `Qwen/Qwen3-Omni-30B-A3B-*` 模型调用失败。
2. Groq / SiliconFlow 字幕体验差，表现为“伪流式”整段回滚。
3. 字幕窗口在关闭/最小化主窗口、点击字幕或点击锁按钮时表现异常，用户感知为“字幕消失”。

## 现象

### 1. SiliconFlow Qwen 模型报错

- `FunAudioLLM/SenseVoiceSmall` 和 `TeleAI/TeleSpeechASR` 可调用。
- 两个 Qwen 模型返回:

```json
{"code":30000,"message":"Illegal operation.","data":null}
```

### 2. Groq / SiliconFlow 字幕体验差

- 字幕不是原生实时流。
- 每隔一段时间整段文本被重写。
- 前文反复抖动、回滚，直到结束时才整体收敛。

### 3. 字幕窗口异常消失

- 主窗口右上角关闭时，有时字幕正常保留。
- 主窗口最小化时，用户感知为字幕也“没了”。
- 点字幕或点锁按钮时，字幕有时会立刻消失。
- 使用快捷键 `Ctrl+Shift+D` 切换主窗口时，字幕通常正常。

## 根因分析

### 1. SiliconFlow Qwen 模型路由错误

- 代码把四个硅基流动模型都发到了 `/v1/audio/transcriptions`。
- 但 Qwen3-Omni 的音频输入应走多模态 `/v1/chat/completions`。
- 导致 Qwen 模型在错误接口上被拒绝。

### 2. 伪流式实现方式导致整段重写

- Groq 和 SiliconFlow 采用“分段轮询 + 全量重转写”策略。
- 每次轮询都把整段识别结果当作新的 partial 输出。
- 结果不是“前文稳定、尾部波动”，而是“整段一起改”。

### 3. 字幕窗口并未总是被真正关闭

通过 `caption-debug.log` 复盘，确认了关键事实:

- 主窗口关闭按钮路径:
  - `ipc.window-close`
  - `mainWindow.close`
  - `mainWindow.hide`
  - 此时 `captionWindow` 仍然是 `exists:true, visible:true`
- 主窗口最小化路径:
  - `ipc.window-minimize`
  - `mainWindow.minimize`
  - 此时 `captionWindow` 仍然是 `exists:true, visible:true`

因此“主窗口操作直接关闭字幕窗口”不是主因。

真正导致字幕被关掉的是:

- `ipc.caption-toggle { source:"main-caption-controls-toggle", shouldEnable:false }`

也就是主页面里的字幕开关按钮被触发了，而不是字幕窗口自己的关闭按钮。

进一步判断:

- 点锁时日志显示的是 `toggleCaptionDraggable`，并非直接关字幕。
- 但随后出现 `main-caption-controls-toggle` 触发关字幕，说明存在点击穿透或误触发主页面控件的问题。

## 修复内容

### 1. SiliconFlow 模型分流

- Qwen Omni 走 `/chat/completions` + `audio_url`
- SenseVoice / TeleSpeech 继续走 `/audio/transcriptions`
- UI 中增加模型标签:
  - `[多模态]`
  - `[ASR]`

### 2. Groq / SiliconFlow 伪流式稳定化

- 新增 `TranscriptStabilizer`
- 把连续两次完整转写的稳定前缀提取出来
- 只将稳定部分升级为 `final`
- 只让尾部未稳定部分继续作为 `partial`

结果:

- 前文更早固化
- 尾部波动范围缩小
- 停止录制时不再整段重排

### 3. 字幕窗口输入模式与层级修复

- 主窗口可见时，字幕窗口不再对主页面做鼠标穿透
- 鼠标进入字幕区域时主动请求交互态
- 主窗口 `show/hide/minimize/restore` 时主动刷新字幕窗口可见性与输入模式
- 增加 topmost 强化:
  - 立即置顶
  - 延迟再次置顶

### 4. 主进程增加防误触保护

- 当 `caption-toggle(false)` 的来源是主页面字幕开关
- 且当前鼠标坐标位于字幕窗口范围内
- 则判定为点击穿透，忽略这次关闭请求

### 5. 增强诊断日志

- 新增 `caption-debug.log`
- 记录:
  - 主窗口关闭/最小化/显示/恢复
  - 字幕窗口显示/关闭/聚焦
  - `caption-toggle` 调用来源
  - 字幕输入模式切换
  - 点击穿透拦截

日志路径:

`C:\Users\xiang\AppData\Roaming\DeLive\logs\caption-debug.log`

## 验证

已完成:

- `npm run build`
- `npm run dist:win`

并基于主进程日志确认:

- 右上角关闭不会直接销毁字幕窗口
- 最小化不会直接销毁字幕窗口
- 误关闭来源已定位为 `main-caption-controls-toggle`
- 最新修复后，关闭/最小化路径中字幕窗口持续保持 `visible:true`

## 当前结论

本轮修复的核心收益:

- Qwen 模型可按正确接口调用
- Groq / SiliconFlow 字幕体验显著稳定
- 字幕误关闭问题从“主窗口动作怀疑”收敛为“点击穿透”，并已在主进程加保护
- 主窗口关闭/最小化后的字幕层级恢复逻辑已补齐

## 剩余风险

- Windows 透明窗口和鼠标事件模型仍可能存在极少数边角行为差异。
- 如果后续仍出现“看起来消失”，更可能是 Z-order / DWM 层级问题，而不是字幕窗口被真正关闭。
- 当前日志体系已足以继续定位这类剩余问题。

## 建议

- 若后续继续优化字幕体验，可考虑把字幕窗口的 hover/interactive 探测改为更明确的命中区域判定，而不是依赖轮询与透明窗口事件混合策略。
- 若计划发布正式版本，建议后续同步补一版 CHANGELOG 和版本号。
