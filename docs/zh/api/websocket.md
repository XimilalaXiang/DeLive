# WebSocket

DeLive 在 `/ws/live` 提供实时 WebSocket 流，广播转录更新和会话生命周期事件。

## 连接

```
ws://localhost:23456/ws/live
```

### 鉴权

如果配置了令牌，通过查询参数或 Header 认证：

```
ws://localhost:23456/ws/live?token=your-token
```

或在升级请求中包含 `Authorization: Bearer <token>` Header（大多数 WebSocket 库支持，但浏览器 `WebSocket` 不支持）。

## 消息类型

### 转录更新

录制期间字幕文本变化时发送。

```json
{
  "type": "transcript",
  "stableText": "大家好，我们开始",
  "activeText": "会议吧",
  "translatedStableText": "",
  "translatedActiveText": "",
  "isFinal": false,
  "timestamp": 1713340800000
}
```

| 字段 | 说明 |
|------|------|
| `stableText` | 已提交/最终文本 |
| `activeText` | 部分/进行中的文本（可能变化） |
| `translatedStableText` | 稳定文本的翻译（如可用） |
| `translatedActiveText` | 活跃文本的翻译（如可用） |
| `isFinal` | 当活跃字段为空且稳定文本存在时为 `true` |
| `timestamp` | Unix 毫秒时间戳 |

### 会话开始

新录制会话开始时发送。

```json
{
  "type": "session-start",
  "sessionId": "abc123",
  "timestamp": 1713340800000
}
```

### 会话结束

录制会话完成时发送。

```json
{
  "type": "session-end",
  "sessionId": "abc123",
  "timestamp": 1713341700000
}
```

## 示例：Python 客户端

```python
import asyncio
import json
import websockets

async def monitor():
    url = "ws://localhost:23456/ws/live"
    async with websockets.connect(url) as ws:
        async for message in ws:
            data = json.loads(message)
            if data["type"] == "transcript":
                print(data["stableText"], end="")
            elif data["type"] == "session-start":
                print(f"\n--- 会话开始: {data['sessionId']} ---")
            elif data["type"] == "session-end":
                print(f"\n--- 会话结束: {data['sessionId']} ---")

asyncio.run(monitor())
```

## 示例：Node.js 客户端

```javascript
import WebSocket from 'ws'

const ws = new WebSocket('ws://localhost:23456/ws/live?token=your-token')

ws.on('message', (raw) => {
  const data = JSON.parse(raw)
  if (data.type === 'transcript') {
    process.stdout.write(`\r${data.stableText}${data.activeText}`)
  }
})
```

## 连接生命周期

- WebSocket 连接在 DeLive 和客户端都运行时保持打开
- 多个客户端可同时连接
- 客户端接收所有转录和会话事件，无论何时连接
- 如果 DeLive 未在录制，已连接的客户端在录制开始前不会收到转录消息
