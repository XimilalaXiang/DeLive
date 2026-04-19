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

- DeLive 运行中且 **Open API 已启用**（设置 > 通用 > 开放 API）
- Node.js 18+
- 已安装 MCP 服务器依赖：`cd mcp && npm install`

![MCP 集成](/images/screenshot-mcp-integration.png)

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DELIVE_API_URL` | `http://localhost:23456` | DeLive REST API 基础 URL |
| `DELIVE_API_TOKEN` | *(空)* | 鉴权 Bearer Token（在 DeLive 设置中获取） |

## 客户端配置

### Claude Desktop / Claude Code

添加到 Claude Desktop MCP 配置（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "delive": {
      "command": "node",
      "args": ["C:/path/to/DeLive/mcp/delive-mcp-server.js"],
      "env": {
        "DELIVE_API_URL": "http://localhost:23456",
        "DELIVE_API_TOKEN": "在设置中获取的 Token"
      }
    }
  }
}
```

### Cursor

添加到 `.cursor/mcp.json`（项目级）或 `~/.cursor/mcp.json`（全局）：

```json
{
  "mcpServers": {
    "delive": {
      "command": "node",
      "args": ["C:/path/to/DeLive/mcp/delive-mcp-server.js"],
      "env": {
        "DELIVE_API_URL": "http://localhost:23456",
        "DELIVE_API_TOKEN": "在设置中获取的 Token"
      }
    }
  }
}
```

### Cherry Studio

1. 打开 **设置 > MCP 服务器 > 添加**。
2. 选择 **stdio** 类型。
3. 填写：
   - **命令**：`node`
   - **参数**：`C:/path/to/DeLive/mcp/delive-mcp-server.js`
   - **环境变量**：`DELIVE_API_URL=http://localhost:23456`、`DELIVE_API_TOKEN=your-token`
4. 保存并启用开关。

### OpenAI Codex CLI / 其他 MCP 客户端

任何支持 stdio 传输的 MCP 客户端都可以直接启动：

```bash
DELIVE_API_URL=http://localhost:23456 \
DELIVE_API_TOKEN=your-token \
node /path/to/DeLive/mcp/delive-mcp-server.js
```

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
