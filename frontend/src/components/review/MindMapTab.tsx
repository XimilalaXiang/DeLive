import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Network,
  RefreshCw,
  Save,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import { isAiPostProcessConfigured } from '../../services/aiPostProcess'
import {
  buildMindMapExportBaseName,
  exportMindMapPng,
  exportMindMapSvg,
} from '../../utils/mindMapExport'

interface MindMapTabProps {
  session: TranscriptSession
}

interface MarkmapTransformerLike {
  transform: (content: string) => { root: unknown }
}

interface MarkmapInstanceLike {
  setData: (data: unknown) => Promise<void>
  fit: () => Promise<void>
  destroy: () => void
}

export function MindMapTab({ session }: MindMapTabProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const generateSessionMindMap = useSessionStore((state) => state.generateSessionMindMap)
  const updateSessionMindMap = useSessionStore((state) => state.updateSessionMindMap)
  const [draftMarkdown, setDraftMarkdown] = useState(session.mindMap?.markdown || '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const fullscreenSvgRef = useRef<SVGSVGElement | null>(null)
  const fullscreenTransformerRef = useRef<MarkmapTransformerLike | null>(null)
  const fullscreenMarkmapRef = useRef<MarkmapInstanceLike | null>(null)
  const transformerRef = useRef<MarkmapTransformerLike | null>(null)
  const markmapRef = useRef<MarkmapInstanceLike | null>(null)

  useEffect(() => {
    setDraftMarkdown(session.mindMap?.markdown || '')
    setActionError(null)
  }, [session.id, session.mindMap?.markdown])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    if (!draftMarkdown.trim()) {
      markmapRef.current?.destroy()
      markmapRef.current = null
      svg.innerHTML = ''
      setRenderError(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        if (!transformerRef.current || !markmapRef.current) {
          const [{ Transformer }, { Markmap }] = await Promise.all([
            import('markmap-lib'),
            import('markmap-view'),
          ])

          if (cancelled || !svgRef.current) return

          transformerRef.current = new Transformer()
          markmapRef.current = Markmap.create(svgRef.current, {
            autoFit: true,
            fitRatio: 0.92,
            maxWidth: 240,
            initialExpandLevel: 3,
            paddingX: 12,
            spacingVertical: 6,
            embedGlobalCSS: true,
          }) as MarkmapInstanceLike
        }

        const { root } = transformerRef.current.transform(draftMarkdown)
        await markmapRef.current.setData(root)
        await markmapRef.current.fit()
        if (!cancelled) setRenderError(null)
      } catch (error) {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : 'Failed to render mind map')
        }
      }
    })()

    return () => { cancelled = true }
  }, [draftMarkdown])

  useEffect(() => () => {
    markmapRef.current?.destroy()
    markmapRef.current = null
  }, [])

  // Render mind map in fullscreen SVG
  useEffect(() => {
    if (!isFullscreen) {
      fullscreenMarkmapRef.current?.destroy()
      fullscreenMarkmapRef.current = null
      fullscreenTransformerRef.current = null
      return
    }

    const svg = fullscreenSvgRef.current
    if (!svg || !draftMarkdown.trim()) return

    let cancelled = false

    void (async () => {
      try {
        if (!fullscreenTransformerRef.current || !fullscreenMarkmapRef.current) {
          const [{ Transformer }, { Markmap }] = await Promise.all([
            import('markmap-lib'),
            import('markmap-view'),
          ])
          if (cancelled || !fullscreenSvgRef.current) return

          fullscreenTransformerRef.current = new Transformer()
          fullscreenMarkmapRef.current = Markmap.create(fullscreenSvgRef.current, {
            autoFit: true,
            fitRatio: 0.95,
            maxWidth: 300,
            initialExpandLevel: 4,
            paddingX: 16,
            spacingVertical: 8,
            embedGlobalCSS: true,
          }) as MarkmapInstanceLike
        }

        const { root } = fullscreenTransformerRef.current.transform(draftMarkdown)
        await fullscreenMarkmapRef.current.setData(root)
        await fullscreenMarkmapRef.current.fit()
      } catch {
        // Fullscreen render errors are non-critical
      }
    })()

    return () => { cancelled = true }
  }, [isFullscreen, draftMarkdown])

  // Escape to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isFullscreen])

  const aiConfigured = isAiPostProcessConfigured(settings)
  const generating = session.mindMap?.status === 'pending'
  const hasTranscript = Boolean(session.transcript.trim())
  const hasMindMap = Boolean(draftMarkdown.trim())
  const isDirty = draftMarkdown.trim() !== (session.mindMap?.markdown || '').trim()
  const exportBaseName = useMemo(
    () => buildMindMapExportBaseName(session.mindMap?.title || session.title),
    [session.mindMap?.title, session.title],
  )

  const handleGenerate = async () => {
    try {
      setActionError(null)
      await generateSessionMindMap(session.id)
    } catch (error) {
      console.error('[MindMapTab] mind map generation failed:', error)
      setActionError(error instanceof Error ? error.message : 'Mind map generation failed')
    }
  }

  const handleSave = () => {
    setActionError(null)
    updateSessionMindMap(session.id, {
      markdown: draftMarkdown,
      title: session.mindMap?.title || session.title,
      status: 'success',
      error: undefined,
      updatedAt: Date.now(),
    })
  }

  const handleCopy = async () => {
    try {
      setActionError(null)
      await navigator.clipboard.writeText(draftMarkdown)
    } catch (error) {
      console.error('[MindMapTab] copy markdown failed:', error)
      setActionError(error instanceof Error ? error.message : 'Copy markdown failed')
    }
  }

  const handleExportSvg = () => {
    if (!svgRef.current) return
    setActionError(null)
    exportMindMapSvg(svgRef.current, exportBaseName)
    setShowExportMenu(false)
  }

  const handleExportPng = async () => {
    if (!svgRef.current) return
    try {
      setActionError(null)
      await exportMindMapPng(svgRef.current, exportBaseName)
      setShowExportMenu(false)
    } catch (error) {
      console.error('[MindMapTab] export PNG failed:', error)
      setActionError(error instanceof Error ? error.message : 'Export PNG failed')
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-5 py-3">
        <button
          onClick={() => void handleGenerate()}
          disabled={!aiConfigured || !hasTranscript || generating}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !aiConfigured || !hasTranscript
              ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
              : generating
                ? 'border border-primary/30 bg-primary/10 text-primary'
                : 'border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.preview.mindMapGenerating}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {hasMindMap ? t.preview.mindMapRegenerate : t.preview.mindMapGenerate}
            </>
          )}
        </button>

        <div className="h-5 w-px bg-border" />

        <button
          onClick={() => setShowEditor(!showEditor)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          {showEditor ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          {t.preview.mindMapMarkdown}
        </button>

        {hasMindMap && isDirty && (
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Save className="w-4 h-4" />
            {t.preview.mindMapSave}
          </button>
        )}

        {hasMindMap && (
          <>
            <button
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Copy className="w-4 h-4" />
              {t.preview.mindMapCopyMarkdown}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Download className="w-4 h-4" />
                {t.common.export}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1 w-32 rounded-lg border border-border bg-card p-1 shadow-lg">
                    <button
                      onClick={handleExportSvg}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      SVG
                    </button>
                    <button
                      onClick={() => void handleExportPng()}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      PNG
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {hasMindMap && (
          <>
            <div className="h-5 w-px bg-border" />
            <button
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </>
        )}

        {!aiConfigured && (
          <p className="ml-2 text-xs text-muted-foreground">{t.preview.aiNotConfigured}</p>
        )}
        {!hasTranscript && (
          <p className="ml-2 text-xs text-muted-foreground">{t.preview.mindMapNoTranscript}</p>
        )}
        {session.mindMap?.status === 'error' && session.mindMap.error && (
          <p className="ml-2 text-xs text-destructive">{session.mindMap.error}</p>
        )}
      </div>

      {actionError && (
        <div className="mx-5 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel (collapsible) */}
        {showEditor && (
          <div className="w-[380px] shrink-0 border-r border-border overflow-hidden flex flex-col p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              {t.preview.mindMapMarkdown}
            </div>
            <textarea
              value={draftMarkdown}
              onChange={(event) => setDraftMarkdown(event.target.value)}
              placeholder={t.preview.mindMapMarkdownPlaceholder}
              className="flex-1 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
        )}

        {/* Mind map preview (takes remaining space) */}
        <div className="flex-1 relative overflow-hidden bg-background/40 dark:bg-muted/20 markmap-container">
          {hasMindMap ? (
            <svg ref={svgRef} className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Network className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{t.preview.mindMapEmpty}</p>
                <p className="text-xs text-muted-foreground">{t.preview.mindMapEmptyHint}</p>
              </div>
            </div>
          )}

          {renderError && (
            <div className="absolute inset-x-3 bottom-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {renderError}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Network className="w-4 h-4 text-primary" />
              {t.preview.mindMapTitle}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Minimize2 className="w-4 h-4" />
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-background/40 dark:bg-muted/20 markmap-container">
            <svg ref={fullscreenSvgRef} className="h-full w-full" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
