# Authentication

DeLive's Open API requires a Bearer token. The server listens on `127.0.0.1` only, so other machines on your network cannot reach it.

## Setup

1. Go to **Settings > General > Open API**
2. Toggle **Enable Open API** on
3. A random token is generated for you; copy it, or click **Generate Random Token** for a new one

## How It Works

- **API disabled** → all requests (except `/api/v1/health`) return `403 Forbidden`
- **API enabled** → requests must include the token; a missing or wrong token returns `401`
- **API enabled, token field cleared** → every request returns `401` until a token is set
- **Request with a non-local `Host` header** → `403` (blocks DNS-rebinding pages)
- **`/ws/live` with a browser `Origin`** → `403`, so web pages cannot subscribe to live transcripts

::: info Upgrading
Versions before 2.3 accepted requests without a token when the token field was empty. If you had the API enabled that way, DeLive now generates a token on startup: copy it from Settings into your MCP or script configuration.
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
