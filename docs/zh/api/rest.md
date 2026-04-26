# REST API

在设置中启用 Open API 后，DeLive 在端口 **23456** 上暴露本地 REST API。

## Base URL

```
http://localhost:23456/api/v1
```

## 鉴权

配置了令牌时，在 `Authorization` Header 中包含：

```
Authorization: Bearer <your-token>
```

详见 [鉴权](./authentication)。

## 端点

### GET /health

健康检查。**始终可访问**，即使 API 被禁用。

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

列出会话，支持可选过滤和分页。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 在标题和转录中不区分大小写搜索 |
| `limit` | number | 最大返回会话数（默认：20） |
| `offset` | number | 分页偏移量（默认：0） |
| `topicId` | string | 按主题 ID 过滤 |
| `status` | string | 按状态过滤（`recording`、`completed`、`interrupted`） |

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

完整会话详情，包含转录、AI 摘要、思维导图和问答历史。

```bash
curl http://localhost:23456/api/v1/sessions/abc123
```

### GET /sessions/:id/transcript

仅纯文本转录。当 AI 纠错已完成时，额外返回纠错后的文本。

```bash
curl http://localhost:23456/api/v1/sessions/abc123/transcript
```

```json
{
  "sessionId": "abc123",
  "transcript": "Good morning everyone...",
  "translatedTranscript": null,
  "correctedTranscript": "Good morning, everyone..."
}
```

### GET /sessions/:id/summary

AI 摘要、行动项、关键词和思维导图。

```bash
curl http://localhost:23456/api/v1/sessions/abc123/summary
```

```json
{
  "id": "abc123",
  "title": "Daily Standup",
  "postProcess": {
    "summary": "团队讨论了...",
    "actionItems": ["审查 PR #42", "更新文档"],
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

列出所有主题。

```bash
curl http://localhost:23456/api/v1/topics
```

### GET /tags

列出所有标签。

```bash
curl http://localhost:23456/api/v1/tags
```

### GET /status

当前录制状态和应用信息。

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

## 错误响应

| 状态码 | 含义 |
|--------|------|
| `403` | Open API 已禁用 |
| `401` | 无效或缺少 Bearer Token |
| `404` | 会话未找到 |
| `500` | 内部服务器错误 |

## IPC 超时

需要从渲染进程获取数据的 API 请求有 **5 秒超时**。如果渲染进程未及时响应，API 返回空/默认数据，状态码 `200`。
