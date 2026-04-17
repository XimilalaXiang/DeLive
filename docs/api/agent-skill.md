# Agent Skill

DeLive provides an Agent Skill definition at `skills/delive-transcript-analyzer/SKILL.md` that gives AI agents structured guidance on how to use DeLive's capabilities.

## What is an Agent Skill?

An Agent Skill is a `SKILL.md` file that describes a tool's capabilities, setup requirements, available actions, and recommended workflow patterns. AI agents (Claude Code, Cursor, etc.) can read this file to understand how to interact with DeLive.

## Workflow Patterns

The skill defines five recommended workflow patterns:

### Pattern 1: Meeting Summary → Email Draft

1. `search_transcripts("weekly standup")`
2. `get_session("<id>")`
3. Use the transcript and AI summary to draft a follow-up email

### Pattern 2: Lecture Notes → Study Guide

1. `search_transcripts("machine learning lecture")`
2. `get_session_transcript("<id>")`
3. Extract key concepts, create flashcards, or generate a study guide

### Pattern 3: Code Discussion → Implementation

1. `search_transcripts("refactor database layer")`
2. `get_session("<id>")`
3. Extract technical decisions and action items
4. Generate implementation code

### Pattern 4: Multi-Session Analysis

1. `search_transcripts("project alpha")`
2. Retrieve summaries for each match
3. Synthesize a cross-session report

### Pattern 5: Real-Time Monitoring

Connect to the WebSocket for live transcript access:

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

## Location

```
skills/delive-transcript-analyzer/SKILL.md
```

The file uses YAML frontmatter with `name` and `description` fields, followed by Markdown-formatted instructions, tool references, and examples.
