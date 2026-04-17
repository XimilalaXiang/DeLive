# AI Review Desk

The Review Desk is a full-page workspace for exploring completed transcription sessions. It opens from the History view and provides four tabs with an animated sliding tab bar.

## Overview Tab

Generates an AI briefing from the transcript using an OpenAI-compatible chat completions endpoint.

**Output includes:**
- **Summary** — concise overview of the session
- **Action items** — extracted tasks and next steps
- **Keywords** — key terms from the discussion
- **Chapters** — logical sections with optional timestamps
- **Title suggestion** — AI-generated session title
- **Tag suggestions** — relevant tags for organization

One-click **Apply** buttons let you accept the suggested title and tags directly.

### Configuration

AI features require an OpenAI-compatible endpoint configured in **Settings > General > AI Post-Process**:

- **Base URL** — defaults to `http://127.0.0.1:11434/v1` (Ollama)
- **Model** — the model to use for generation
- **API Key** — optional, depending on the endpoint
- **Prompt Language** — `zh` (Chinese) or `en` (English)

## Transcript Tab

Displays the full transcript with:

- Timestamped segments in a left gutter
- Color-coded speaker badges (when diarization is available)
- Consecutive same-speaker merging
- Hover highlight for individual segments
- Optional translated text blocks

**Export formats:** TXT, Markdown, SRT, VTT

## Chat Tab

Multi-thread AI conversation about the transcript:

- GFM Markdown rendering with syntax-highlighted code blocks
- One-click code copy
- User/AI avatars
- Hover actions (Copy, Regenerate)
- Animated thinking-dots indicator
- Auto-resizing text composer (Enter to send)
- Floating scroll-to-bottom button
- Per-thread delete

Each question is sent with the transcript context and up to 4 previous Q&A turns for conversation continuity. Answers include optional `citations` referencing specific quotes from the transcript.

## Mind Map Tab

Generate a Markmap-compatible Markdown mind map from the session:

- Live Markdown editor
- Interactive Markmap visualization
- Fullscreen portal mode
- Export to SVG or PNG

The mind map prompt leverages the AI summary, action items, and keywords when available.

## Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `←` / `→` | Switch tabs |
| `Ctrl/Cmd + 1–4` | Jump to specific tab |
| `Escape` | Close the review desk |
