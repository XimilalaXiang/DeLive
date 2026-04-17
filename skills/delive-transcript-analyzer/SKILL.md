---
name: delive-transcript-analyzer
description: "Analyze, summarize, and extract insights from DeLive transcription sessions. TRIGGER when: user mentions DeLive, transcription sessions, meeting transcripts, live captions, or audio transcription analysis; user wants to search, retrieve, summarize, or process recorded transcripts; user asks about meeting notes, action items, or discussion summaries from DeLive. Requires DeLive app running locally with its MCP server or REST API."
---

# DeLive Transcript Analyzer

Analyze and extract insights from real-time transcription sessions captured by DeLive, a desktop app for live speech-to-text.

## Prerequisites

- **DeLive** must be running locally (REST API at `http://localhost:23456`)
- For MCP integration, the DeLive MCP server must be configured (see Setup below)

## Setup

### Option A: MCP Server (recommended for Claude Desktop / Claude Code)

The DeLive MCP server provides direct tool access. Add to your MCP config:

```json
{
  "mcpServers": {
    "delive": {
      "command": "node",
      "args": ["<PATH_TO_DELIVE>/mcp/delive-mcp-server.js"]
    }
  }
}
```

### Option B: REST API (for any client)

DeLive exposes a local REST API when running:

- Base URL: `http://localhost:23456/api/v1/`
- WebSocket live stream: `ws://localhost:23456/ws/live`

## Available Tools (via MCP)

| Tool | Purpose |
|------|---------|
| `search_transcripts` | Find sessions by keyword in title or transcript content |
| `get_session` | Full session with transcript, AI summary, mind map, Q&A |
| `get_session_transcript` | Lightweight: just the transcript text |
| `get_session_summary` | AI summary, action items, keywords, mind map |
| `get_recording_status` | Check if DeLive is currently recording |
| `list_topics` | List topic categories for organizing sessions |

## Available Resources (via MCP)

| Resource URI | Description |
|-------------|-------------|
| `delive://sessions/recent` | Most recent 10 sessions (metadata) |
| `delive://status` | Current app and recording status |

## Workflow Patterns

### Pattern 1: Meeting Summary to Email Draft

1. Search for the relevant meeting: `search_transcripts("weekly standup")`
2. Get the full session: `get_session("<session_id>")`
3. Use the transcript and AI summary to draft a follow-up email

### Pattern 2: Lecture Notes to Study Guide

1. Find the lecture: `search_transcripts("machine learning lecture")`
2. Get the transcript: `get_session_transcript("<session_id>")`
3. Extract key concepts, create flashcards, or generate a structured study guide

### Pattern 3: Code Discussion to Implementation

1. Search for the discussion: `search_transcripts("refactor database layer")`
2. Get session details: `get_session("<session_id>")`
3. Extract technical decisions and action items from the summary
4. Generate implementation code based on the discussed approach

### Pattern 4: Multi-Session Analysis

1. Search broadly: `search_transcripts("project alpha")`
2. Retrieve summaries for each matching session
3. Synthesize a cross-session report: timeline, decisions made, open items

### Pattern 5: Real-Time Monitoring

Connect to the live WebSocket for real-time transcript access:

```python
import asyncio
import websockets
import json

async def monitor():
    async with websockets.connect("ws://localhost:23456/ws/live") as ws:
        async for message in ws:
            data = json.loads(message)
            if data["type"] == "transcript":
                print(data["stableText"])

asyncio.run(monitor())
```

## REST API Reference

All endpoints return JSON. Base URL: `http://localhost:23456`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Server health and version |
| GET | `/api/v1/sessions` | List sessions (params: `search`, `limit`, `offset`, `topicId`, `status`) |
| GET | `/api/v1/sessions/:id` | Full session detail |
| GET | `/api/v1/sessions/:id/transcript` | Transcript text only |
| GET | `/api/v1/sessions/:id/summary` | AI summary and mind map |
| GET | `/api/v1/topics` | All topics |
| GET | `/api/v1/tags` | All tags |
| GET | `/api/v1/status` | Recording state and app info |

## Tips

- **Search is case-insensitive** and matches both title and transcript content
- Sessions with `status: "completed"` have full transcripts; `"recording"` means in-progress
- The `hasSummary` field in session listings indicates whether AI post-processing has been run
- Use `limit` and `offset` for pagination when there are many sessions
- The live WebSocket at `/ws/live` broadcasts both transcript updates and session lifecycle events (`session-start`, `session-end`)

## Error Handling

If DeLive is not running, all API calls will fail with a connection error. Check:
1. DeLive app is open and running
2. The built-in server is active (check `http://localhost:23456/api/v1/health`)
3. For MCP: the MCP server process can reach DeLive on localhost
