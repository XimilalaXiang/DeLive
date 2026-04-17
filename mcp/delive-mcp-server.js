#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const DELIVE_API_BASE = process.env.DELIVE_API_URL || 'http://localhost:23456'
const DELIVE_API_TOKEN = process.env.DELIVE_API_TOKEN || ''

async function callApi(path) {
  const url = `${DELIVE_API_BASE}${path}`
  const headers = { 'Accept': 'application/json' }
  if (DELIVE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${DELIVE_API_TOKEN}`
  }
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      if (response.status === 403) {
        throw new Error('DeLive Open API is disabled. Enable it in DeLive Settings > Open API.')
      }
      if (response.status === 401) {
        throw new Error('DeLive API token is invalid. Set the correct DELIVE_API_TOKEN environment variable.')
      }
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED') {
      throw new Error('DeLive is not running or API is unreachable. Please start DeLive first.')
    }
    throw error
  }
}

const server = new McpServer({
  name: 'delive',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
})

// ─── Tools ───

server.registerTool(
  'search_transcripts',
  {
    description: 'Search DeLive transcription sessions by keyword. Returns matching sessions with metadata.',
    inputSchema: {
      query: z.string().describe('Search keyword to match in session titles and transcript content'),
      limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    },
  },
  async ({ query, limit }) => {
    const data = await callApi(`/api/v1/sessions?search=${encodeURIComponent(query)}&limit=${limit}`)
    const sessions = data.sessions || []

    if (sessions.length === 0) {
      return { content: [{ type: 'text', text: `No sessions found matching "${query}".` }] }
    }

    const lines = sessions.map((s, i) =>
      `${i + 1}. **${s.title}** (${s.date} ${s.time})\n   ID: ${s.id}\n   Status: ${s.status || 'completed'} | Transcript: ${s.transcriptLength} chars | Summary: ${s.hasSummary ? 'Yes' : 'No'}`
    )

    return {
      content: [{
        type: 'text',
        text: `Found ${data.total} session(s) matching "${query}":\n\n${lines.join('\n\n')}`,
      }],
    }
  }
)

server.registerTool(
  'get_session',
  {
    description: 'Get full details of a specific DeLive transcription session including transcript, AI summary, mind map, and Q&A history.',
    inputSchema: {
      sessionId: z.string().describe('The session ID to retrieve'),
    },
  },
  async ({ sessionId }) => {
    const session = await callApi(`/api/v1/sessions/${encodeURIComponent(sessionId)}`)

    const parts = []
    parts.push(`# ${session.title}`)
    parts.push(`**Date:** ${session.date} ${session.time}`)
    parts.push(`**Status:** ${session.status || 'completed'}`)
    if (session.duration) parts.push(`**Duration:** ${Math.round(session.duration / 1000)}s`)
    if (session.providerId) parts.push(`**Provider:** ${session.providerId}`)

    parts.push('\n## Transcript')
    parts.push(session.transcript || '(empty)')

    if (session.translatedTranscript?.text) {
      parts.push('\n## Translated Transcript')
      parts.push(session.translatedTranscript.text)
    }

    if (session.postProcess?.summary) {
      parts.push('\n## AI Summary')
      parts.push(session.postProcess.summary)
    }

    if (session.postProcess?.actionItems?.length) {
      parts.push('\n## Action Items')
      session.postProcess.actionItems.forEach((item, i) => parts.push(`${i + 1}. ${item}`))
    }

    if (session.postProcess?.keywords?.length) {
      parts.push(`\n**Keywords:** ${session.postProcess.keywords.join(', ')}`)
    }

    if (session.mindMap?.markdown) {
      parts.push('\n## Mind Map')
      parts.push(session.mindMap.markdown)
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] }
  }
)

server.registerTool(
  'get_session_transcript',
  {
    description: 'Get only the plain text transcript of a specific session. Use this for lightweight retrieval when you only need the transcript text.',
    inputSchema: {
      sessionId: z.string().describe('The session ID'),
    },
  },
  async ({ sessionId }) => {
    const data = await callApi(`/api/v1/sessions/${encodeURIComponent(sessionId)}/transcript`)

    const parts = [`Session: ${data.sessionId}`, '', data.transcript || '(empty)']
    if (data.translatedTranscript) {
      parts.push('\n--- Translated ---\n')
      parts.push(data.translatedTranscript)
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] }
  }
)

server.registerTool(
  'get_session_summary',
  {
    description: 'Get the AI-generated summary, action items, keywords, and mind map for a specific session.',
    inputSchema: {
      sessionId: z.string().describe('The session ID'),
    },
  },
  async ({ sessionId }) => {
    const data = await callApi(`/api/v1/sessions/${encodeURIComponent(sessionId)}/summary`)

    const parts = [`Session: ${data.sessionId}`]

    if (data.postProcess) {
      if (data.postProcess.summary) {
        parts.push('\n## Summary')
        parts.push(data.postProcess.summary)
      }
      if (data.postProcess.actionItems?.length) {
        parts.push('\n## Action Items')
        data.postProcess.actionItems.forEach((item, i) => parts.push(`${i + 1}. ${item}`))
      }
      if (data.postProcess.keywords?.length) {
        parts.push(`\n**Keywords:** ${data.postProcess.keywords.join(', ')}`)
      }
    } else {
      parts.push('\nNo AI summary available for this session.')
    }

    if (data.mindMap?.markdown) {
      parts.push('\n## Mind Map')
      parts.push(data.mindMap.markdown)
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] }
  }
)

server.registerTool(
  'get_recording_status',
  {
    description: 'Check the current recording status of DeLive — whether it is idle, recording, or in another state.',
    inputSchema: {},
  },
  async () => {
    const status = await callApi('/api/v1/status')
    const lines = [
      `**Recording:** ${status.isRecording ? 'Yes' : 'No'}`,
      `**State:** ${status.recordingState}`,
      `**App Version:** ${status.version}`,
    ]
    if (status.currentSessionId) {
      lines.push(`**Active Session:** ${status.currentSessionId}`)
    }
    lines.push(`**Live WS Clients:** ${status.liveClients}`)

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }
)

server.registerTool(
  'list_topics',
  {
    description: 'List all topics (categories) used to organize transcription sessions in DeLive.',
    inputSchema: {},
  },
  async () => {
    const data = await callApi('/api/v1/topics')
    const topics = data.topics || []

    if (topics.length === 0) {
      return { content: [{ type: 'text', text: 'No topics found.' }] }
    }

    const lines = topics.map((t, i) => `${i + 1}. ${t.emoji} **${t.name}** (ID: ${t.id})${t.description ? `\n   ${t.description}` : ''}`)
    return { content: [{ type: 'text', text: `Topics:\n\n${lines.join('\n')}` }] }
  }
)

// ─── Resources ───

server.registerResource(
  'recent-sessions',
  'delive://sessions/recent',
  { description: 'Most recent 10 transcription sessions (metadata only)', mimeType: 'application/json' },
  async () => {
    const data = await callApi('/api/v1/sessions?limit=10')
    return {
      contents: [{
        uri: 'delive://sessions/recent',
        mimeType: 'application/json',
        text: JSON.stringify(data.sessions || [], null, 2),
      }],
    }
  }
)

server.registerResource(
  'app-status',
  'delive://status',
  { description: 'Current DeLive app and recording status', mimeType: 'application/json' },
  async () => {
    const status = await callApi('/api/v1/status')
    return {
      contents: [{
        uri: 'delive://status',
        mimeType: 'application/json',
        text: JSON.stringify(status, null, 2),
      }],
    }
  }
)

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[DeLive MCP] Server running on stdio')
  console.error(`[DeLive MCP] API base: ${DELIVE_API_BASE}`)
  console.error(`[DeLive MCP] Auth: ${DELIVE_API_TOKEN ? 'Bearer token configured' : 'No token (open access)'}`)
}

main().catch((error) => {
  console.error('[DeLive MCP] Fatal error:', error)
  process.exit(1)
})
