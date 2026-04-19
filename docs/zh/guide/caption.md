# 悬浮字幕

DeLive 提供一个悬浮字幕窗口，以始终置顶的叠层形式显示实时转录文本。

## 特性

- **始终置顶** — 保持在所有其他窗口之上
- **鼠标穿透** — 非交互时，鼠标事件穿透到下层窗口（Windows 和 macOS）
- **三种显示模式** — 仅原文、仅翻译文、双行显示（两者兼有）
- **完全可定制** — 字号、字体、文字颜色、背景颜色、文字阴影、最大行数和宽度
- **可拖动** — 切换拖动模式以重新定位窗口

![悬浮字幕](/images/screenshot-caption-overlay.png)

![字幕样式自定义](/images/screenshot-caption-style.png)

## 显示模式

| 模式 | 说明 |
|------|------|
| `source` | 显示原始转录文本 |
| `translated` | 仅显示翻译文本（Provider 支持翻译时） |
| `dual` | 双行显示原文和翻译文本 |

::: tip
翻译功能目前仅通过开启了 `translationEnabled` 的 **Soniox V4** 提供。其他 Provider 仅显示原文。
:::

## 工作原理

1. ASR Provider 发出转录事件（部分文本和最终文本）
2. `CaptionBridge` 去重并通过 IPC 将文本转发到字幕窗口
3. 字幕窗口使用配置的样式渲染文本
4. 仅当内容实际变化时才发送更新（对稳定文本、活跃文本、翻译文本和 `isFinal` 标志去重）

## 技术细节

- 字幕窗口是独立的 `BrowserWindow`，设置 `transparent: true`（Linux 使用半透明黑色背景替代）
- Windows 上使用分层窗口技巧（`backgroundColor: '#01000001'`）启用透明
- 窗口定位在包含主窗口的显示器底部居中
- 鼠标交互检测每 100ms 轮询光标位置，当光标进入字幕区域时临时启用交互
- 切换 `setFocusable` 以防止字幕在正常使用时抢夺键盘焦点
