# REST API

DeLive exposes a local REST API on port **23456** when the Open API is enabled in Settings.

## Base URL

```
http://localhost:23456/api/v1
```

## Authentication

When a token is configured, include it in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

See [Authentication](./authentication) for details.

## Endpoints

### GET /health

Health check. **Always accessible**, even when the API is disabled.

```bash
curl http://localhost:23456/api/v1/health
```

```json
{
  "status": "ok",
  "version": "1.7.0",
  "apiEnabled": true,
  "liveClients": 0
}
```

### GET /sessions

List sessions with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Case-insensitive search in title and transcript |
| `limit` | number | Max sessions to return (default: 20) |
| `offset` | number | Pagination offset (default: 0) |
| `topicId` | string | Filter by topic ID |
| `status` | string | Filter by status (`recording`, `completed`, `interrupted`) |

```bash
curl "http://localhost:23456/api/v1/sessions?search=standup&limit=5"
```

```json
{
  "sessions": [
    {
      "id": "abc123",
      "title": "Daily Standup",
      "date": "2026-04-17",
      "time": "09:30",
      "status": "completed",
      "duration": 900000,
      "providerId": "soniox",
      "transcriptLength": 4523,
      "hasSummary": true,
      "topicId": null,
      "tagIds": ["tag1"]
    }
  ],
  "total": 1,
  "limit": 5,
  "offset": 0
}
```

### GET /sessions/:id

Full session detail including transcript, AI summary, mind map, and Q&A history.

```bash
curl http://localhost:23456/api/v1/sessions/abc123
```

### GET /sessions/:id/transcript

Plain text transcript only.

```bash
curl http://localhost:23456/api/v1/sessions/abc123/transcript
```

```json
{
  "id": "abc123",
  "title": "Daily Standup",
  "transcript": "Good morning everyone...",
  "translatedTranscript": null
}
```

### GET /sessions/:id/summary

AI summary, action items, keywords, and mind map.

```bash
curl http://localhost:23456/api/v1/sessions/abc123/summary
```

```json
{
  "id": "abc123",
  "title": "Daily Standup",
  "postProcess": {
    "summary": "The team discussed...",
    "actionItems": ["Review PR #42", "Update docs"],
    "keywords": ["sprint", "deployment"],
    "chapters": [],
    "status": "success"
  },
  "mindMap": {
    "markdown": "# Daily Standup\n## Topics\n...",
    "status": "success"
  }
}
```

### GET /topics

List all topics.

```bash
curl http://localhost:23456/api/v1/topics
```

```json
{
  "topics": [
    {
      "id": "topic1",
      "name": "Project Alpha",
      "emoji": "🚀",
      "description": "Main project workspace",
      "sessionCount": 12
    }
  ]
}
```

### GET /tags

List all tags.

```bash
curl http://localhost:23456/api/v1/tags
```

### GET /status

Current recording status and app info.

```bash
curl http://localhost:23456/api/v1/status
```

```json
{
  "version": "1.7.0",
  "recording": false,
  "currentSessionId": null,
  "currentProvider": null,
  "liveClients": 0
}
```

## Error Responses

| Status | Meaning |
|--------|---------|
| `403` | Open API is disabled |
| `401` | Invalid or missing Bearer token |
| `404` | Session not found |
| `500` | Internal server error |

## IPC Timeout

API requests that require data from the renderer process have a **5-second timeout**. If the renderer does not respond in time, the API returns empty/default data with a `200` status.
