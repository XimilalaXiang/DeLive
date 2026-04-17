# MCP 服务器

DeLive 包含一个独立的 MCP（Model Context Protocol）服务器，将转录数据作为工具和资源暴露给 Claude Desktop、Cursor 等 AI Agent。

## 架构

MCP 服务器是一个轻量级 Node.js 脚本（`mcp/delive-mcp-server.js`），它：

1. 作为 **子进程** 由 MCP 客户端（如 Claude Desktop）启动
2. 使用 **stdio** 传输（标准 MCP 协议）
3. 调用 DeLive 的 **REST API**（`http://localhost:23456`）获取数据
4. 将 MCP 工具调用转换为 HTTP 请求并格式化响应

```
MCP 客户端（Claude Desktop）
    ↕ stdio
DeLive MCP 服务器（node 进程）
    ↕ HTTP
DeLive 应用（Electron，端口 23456）
```

## 配置

### 前置条件

- DeLive 运行中且 **Open API 已启用**
- Node.js 18+

### Claude Desktop 配置

添加到 Claude Desktop MCP 配置（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "delive": {
      "command": "node",
      "args": ["/path/to/DeLive/mcp/delive-mcp-server.js"],
      "env": {
        "DELIVE_API_URL": "http://localhost:23456",
        "DELIVE_API_TOKEN": "your-token-from-settings"
      }
    }
  }
}
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DELIVE_API_URL` | `http://localhost:23456` | DeLive REST API 基础 URL |
| `DELIVE_API_TOKEN` | *(空)* | 鉴权 Bearer Token |

## 工具

### search_transcripts

按关键词在标题或转录内容中搜索会话。

| 参数 | 类型 | 必需 | 默认 | 说明 |
|------|------|------|------|------|
| `query` | string | 是 | — | 搜索关键词 |
| `limit` | number | 否 | 10 | 最大结果数 |

### get_session

获取完整会话详情，包含转录、AI 摘要、思维导图和问答历史。

| 参数 | 类型 | 必需 |
|------|------|------|
| `sessionId` | string | 是 |

### get_session_transcript

仅获取转录文本（轻量级）。

| 参数 | 类型 | 必需 |
|------|------|------|
| `sessionId` | string | 是 |

### get_session_summary

获取 AI 摘要、行动项、关键词和思维导图。

| 参数 | 类型 | 必需 |
|------|------|------|
| `sessionId` | string | 是 |

### get_recording_status

检查 DeLive 是否正在录制以及应用状态。

*无参数。*

### list_topics

列出所有主题分类。

*无参数。*

## 资源

| URI | 说明 |
|-----|------|
| `delive://sessions/recent` | 最近 10 个会话（元数据） |
| `delive://status` | 当前应用和录制状态 |

## 错误处理

| 场景 | MCP 错误信息 |
|------|-------------|
| DeLive 未运行 | "DeLive is not running or API is unreachable. Please start DeLive first." |
| API 已禁用 | "DeLive Open API is disabled. Enable it in DeLive Settings > Open API." |
| 令牌无效 | "DeLive API token is invalid. Set the correct DELIVE_API_TOKEN environment variable." |
| 请求超时 | 所有 HTTP 调用 10 秒超时 |
