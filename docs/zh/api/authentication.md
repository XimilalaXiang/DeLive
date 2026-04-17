# 鉴权

DeLive 的 Open API 支持可选的 Bearer Token 鉴权，防止未授权的本地访问。

## 设置

1. 前往 **设置 > 通用 > Open API**
2. 开启 **启用 Open API**
3. 输入令牌或点击 **生成随机令牌**

## 工作原理

- **API 已禁用** → 所有请求（`/api/v1/health` 除外）返回 `403 Forbidden`
- **API 已启用，无令牌** → 所有请求无需认证即可接受
- **API 已启用，已设令牌** → 请求必须包含令牌

::: warning
启用但令牌为空时，你机器上的任何进程都可以读取转录数据。在共享机器上请务必设置令牌。
:::

## REST API

在 `Authorization` Header 中包含令牌：

```bash
curl -H "Authorization: Bearer dlv_your_token_here" \
  http://localhost:23456/api/v1/sessions
```

## WebSocket

两种认证方式：

**查询参数**（浏览器可用）：
```
ws://localhost:23456/ws/live?token=dlv_your_token_here
```

**Authorization Header**（大多数 WebSocket 库可用）：
```javascript
const ws = new WebSocket('ws://localhost:23456/ws/live', {
  headers: { Authorization: 'Bearer dlv_your_token_here' }
})
```

## MCP 服务器

MCP 服务器从 `DELIVE_API_TOKEN` 环境变量读取令牌：

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

## 错误响应

| 状态码 | Body | 含义 |
|--------|------|------|
| `403` | `{ "error": "API is disabled..." }` | Open API 在设置中已关闭 |
| `401` | `{ "error": "Unauthorized" }` | 缺少或无效的令牌 |

鉴权无效的 WebSocket 连接在 HTTP 升级阶段以相同状态码拒绝。
