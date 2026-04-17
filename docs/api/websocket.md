# WebSocket

DeLive provides a real-time WebSocket stream at `/ws/live` that broadcasts transcript updates and session lifecycle events.

## Connection

```
ws://localhost:23456/ws/live
```

### Authentication

If a token is configured, authenticate via query parameter or header:

```
ws://localhost:23456/ws/live?token=your-token
```

Or include the `Authorization: Bearer <token>` header in the upgrade request (supported by most WebSocket libraries but not browser `WebSocket`).

## Message Types

### Transcript Update

Sent during recording whenever caption text changes.

```json
{
  "type": "transcript",
  "stableText": "Hello everyone, let's begin",
  "activeText": " the meeting",
  "translatedStableText": "",
  "translatedActiveText": "",
  "isFinal": false,
  "timestamp": 1713340800000
}
```

| Field | Description |
|-------|-------------|
| `stableText` | Committed/final text |
| `activeText` | Partial/in-progress text (may change) |
| `translatedStableText` | Translation of stable text (if available) |
| `translatedActiveText` | Translation of active text (if available) |
| `isFinal` | `true` when both active fields are empty and stable text is present |
| `timestamp` | Unix milliseconds |

### Session Start

Sent when a new recording session begins.

```json
{
  "type": "session-start",
  "sessionId": "abc123",
  "timestamp": 1713340800000
}
```

### Session End

Sent when a recording session completes.

```json
{
  "type": "session-end",
  "sessionId": "abc123",
  "timestamp": 1713341700000
}
```

## Example: Python Client

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
                print(f"\n--- Session started: {data['sessionId']} ---")
            elif data["type"] == "session-end":
                print(f"\n--- Session ended: {data['sessionId']} ---")

asyncio.run(monitor())
```

## Example: Node.js Client

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

## Connection Lifecycle

- The WebSocket connection stays open as long as both DeLive and the client are running
- Multiple clients can connect simultaneously
- Clients receive all transcript and session events regardless of when they connected
- If DeLive is not recording, connected clients simply receive no transcript messages until recording starts
