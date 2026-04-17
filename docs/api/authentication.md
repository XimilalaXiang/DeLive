# Authentication

DeLive's Open API supports optional Bearer token authentication to prevent unauthorized local access.

## Setup

1. Go to **Settings > General > Open API**
2. Toggle **Enable Open API** on
3. Enter a token or click **Generate Random Token**

## How It Works

- **API disabled** → all requests (except `/api/v1/health`) return `403 Forbidden`
- **API enabled, no token** → all requests are accepted without authentication
- **API enabled, token set** → requests must include the token

::: warning
When enabled with an empty token, any process on your machine can read your transcription data. Always set a token if you're on a shared machine.
:::

## REST API

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer dlv_your_token_here" \
  http://localhost:23456/api/v1/sessions
```

## WebSocket

Two authentication methods:

**Query parameter** (works in browsers):
```
ws://localhost:23456/ws/live?token=dlv_your_token_here
```

**Authorization header** (works in most WebSocket libraries):
```javascript
const ws = new WebSocket('ws://localhost:23456/ws/live', {
  headers: { Authorization: 'Bearer dlv_your_token_here' }
})
```

## MCP Server

The MCP server reads the token from the `DELIVE_API_TOKEN` environment variable:

```json
{
  "mcpServers": {
    "delive": {
      "command": "node",
      "args": ["/path/to/DeLive/mcp/delive-mcp-server.js"],
      "env": {
        "DELIVE_API_TOKEN": "dlv_your_token_here"
      }
    }
  }
}
```

## Error Responses

| Status | Body | Meaning |
|--------|------|---------|
| `403` | `{ "error": "API is disabled..." }` | Open API is turned off in Settings |
| `401` | `{ "error": "Unauthorized" }` | Missing or invalid token |

WebSocket connections with invalid authentication are rejected during the HTTP upgrade with the same status codes.
