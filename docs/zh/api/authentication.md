# 鉴权

DeLive 的 Open API 必须使用 Bearer Token 鉴权。服务器只监听 `127.0.0.1`，局域网内的其他机器无法访问。

## 设置

1. 前往 **设置 > 通用 > Open API**
2. 开启 **启用 Open API**
3. 开启时会自动生成随机令牌，复制即可；也可以点击 **生成随机令牌** 换一个

## 工作原理

- **API 已禁用** → 所有请求（`/api/v1/health` 除外）返回 `403 Forbidden`
- **API 已启用** → 请求必须携带令牌，缺少或错误返回 `401`
- **API 已启用但清空了令牌** → 在重新设置令牌前，所有请求都返回 `401`
- **请求的 `Host` 头不是本机** → 返回 `403`（防御 DNS rebinding 网页）
- **带浏览器 `Origin` 连接 `/ws/live`** → 返回 `403`，网页无法订阅实时转录

::: info 升级说明
2.3 之前的版本在令牌为空时不鉴权。如果你之前这样开启了 API，DeLive 启动时会自动生成令牌，请到设置里复制它，填到 MCP 或脚本配置中。
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
