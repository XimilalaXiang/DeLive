# DeLive Demo Scripts

These scripts demonstrate DeLive's open ecosystem capabilities.

## Prerequisites

1. DeLive app running on your desktop
2. Open API enabled: DeLive Settings > Open API > Enable
3. Python 3.8+

```bash
pip install requests websockets
```

## Authentication

If you set an access token in DeLive Settings, provide it via environment variable:

```bash
export DELIVE_API_TOKEN="dlv_yourTokenHere"
```

All scripts read `DELIVE_API_TOKEN` and `DELIVE_API_URL` (default: `http://localhost:23456`) from environment.

## Scripts

### `live_transcript_monitor.py`

Real-time transcript monitor via WebSocket. Shows live captions as they're spoken.

```bash
python live_transcript_monitor.py
```

### `meeting_analyzer.py`

REST API client that retrieves and displays session data.

```bash
# Analyze the most recent session
python meeting_analyzer.py

# Search for a specific meeting
python meeting_analyzer.py --search "standup"

# List recent sessions
python meeting_analyzer.py --list --limit 10
```

## Architecture

```
DeLive (Electron App)
  |
  |-- REST API (http://localhost:23456/api/v1/)
  |     |-- Bearer token auth (optional)
  |     |-- meeting_analyzer.py
  |     |-- Any HTTP client / automation tool
  |
  |-- WebSocket (ws://localhost:23456/ws/live)
  |     |-- Token via query param or header
  |     |-- live_transcript_monitor.py
  |     |-- OBS subtitle overlay
  |
  |-- MCP Server (stdio)
        |-- DELIVE_API_TOKEN env var
        |-- Claude Desktop / Cursor / Claude Code
        |-- Any MCP-compatible AI agent
```
