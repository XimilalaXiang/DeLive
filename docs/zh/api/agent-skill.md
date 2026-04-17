# Agent Skill

DeLive 在 `skills/delive-transcript-analyzer/SKILL.md` 提供 Agent Skill 定义，为 AI Agent 提供结构化的使用指南。

## 什么是 Agent Skill？

Agent Skill 是一个 `SKILL.md` 文件，描述工具的能力、配置要求、可用操作和推荐工作流模式。AI Agent（Claude Code、Cursor 等）可以读取此文件来了解如何与 DeLive 交互。

## 工作流模式

Skill 定义了五种推荐工作流模式：

### 模式 1：会议摘要 → 邮件草稿

1. `search_transcripts("weekly standup")`
2. `get_session("<id>")`
3. 使用转录和 AI 摘要起草后续邮件

### 模式 2：讲座笔记 → 学习指南

1. `search_transcripts("machine learning lecture")`
2. `get_session_transcript("<id>")`
3. 提取关键概念，创建闪卡，或生成学习指南

### 模式 3：代码讨论 → 实现

1. `search_transcripts("refactor database layer")`
2. `get_session("<id>")`
3. 提取技术决策和行动项
4. 生成实现代码

### 模式 4：多会话分析

1. `search_transcripts("project alpha")`
2. 获取每个匹配的摘要
3. 综合生成跨会话报告

### 模式 5：实时监控

连接 WebSocket 进行实时转录访问：

```python
import asyncio, websockets, json

async def monitor():
    async with websockets.connect("ws://localhost:23456/ws/live") as ws:
        async for message in ws:
            data = json.loads(message)
            if data["type"] == "transcript":
                print(data["stableText"])

asyncio.run(monitor())
```

## 位置

```
skills/delive-transcript-analyzer/SKILL.md
```

文件使用 YAML frontmatter（包含 `name` 和 `description` 字段），后接 Markdown 格式的说明、工具引用和示例。
