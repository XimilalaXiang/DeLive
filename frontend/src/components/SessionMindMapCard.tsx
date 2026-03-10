import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Network,
  RefreshCw,
  Save,
} from 'lucide-react'
import type { TranscriptSession } from '../types'
import { useSettingsStore } from '../stores/settingsStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { isAiPostProcessConfigured } from '../services/aiPostProcess'
import {
  buildMindMapExportBaseName,
  exportMindMapPng,
  exportMindMapSvg,
} from '../utils/mindMapExport'

interface SessionMindMapCardProps {
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

export function SessionMindMapCard({ session }: SessionMindMapCardProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const generateSessionMindMap = useSessionStore((state) => state.generateSessionMindMap)
  const updateSessionMindMap = useSessionStore((state) => state.updateSessionMindMap)
  const [draftMarkdown, setDraftMarkdown] = useState(session.mindMap?.markdown || '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
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

          if (cancelled || !svgRef.current) {
            return
          }

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
        if (!cancelled) {
          setRenderError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : 'Failed to render mind map')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [draftMarkdown])

  useEffect(() => () => {
    markmapRef.current?.destroy()
    markmapRef.current = null
  }, [])

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
      console.error('[SessionMindMapCard] mind map generation failed:', error)
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
      console.error('[SessionMindMapCard] copy markdown failed:', error)
      setActionError(error instanceof Error ? error.message : 'Copy markdown failed')
    }
  }

  const handleExportSvg = () => {
    if (!svgRef.current) return
    setActionError(null)
    exportMindMapSvg(svgRef.current, exportBaseName)
  }

  const handleExportPng = async () => {
    if (!svgRef.current) return
    try {
      setActionError(null)
      await exportMindMapPng(svgRef.current, exportBaseName)
    } catch (error) {
      console.error('[SessionMindMapCard] export PNG failed:', error)
      setActionError(error instanceof Error ? error.message : 'Export PNG failed')
    }
  }

  return (
    <div className="not-prose mb-6 rounded-xl border border-border bg-card/70 p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Network className="w-3.5 h-3.5" />
            {t.preview.mindMapTitle}
          </div>
          {!aiConfigured && (
            <p className="text-xs text-muted-foreground">
              {t.preview.aiNotConfigured}
            </p>
          )}
          {!hasTranscript && (
            <p className="text-xs text-muted-foreground">
              {t.preview.mindMapNoTranscript}
            </p>
          )}
          {session.mindMap?.status === 'error' && session.mindMap.error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {session.mindMap.error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={handleSave}
            disabled={!hasMindMap || !isDirty}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !hasMindMap || !isDirty
                ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Save className="w-4 h-4" />
            {t.preview.mindMapSave}
          </button>
          <button
            onClick={() => void handleCopy()}
            disabled={!hasMindMap}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !hasMindMap
                ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Copy className="w-4 h-4" />
            {t.preview.mindMapCopyMarkdown}
          </button>
          <button
            onClick={handleExportSvg}
            disabled={!hasMindMap}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !hasMindMap
                ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Download className="w-4 h-4" />
            SVG
          </button>
          <button
            onClick={() => void handleExportPng()}
            disabled={!hasMindMap}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !hasMindMap
                ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                : 'border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
            }`}
          >
            <Download className="w-4 h-4" />
            PNG
          </button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {actionError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {t.preview.mindMapMarkdown}
          </div>
          <textarea
            value={draftMarkdown}
            onChange={(event) => setDraftMarkdown(event.target.value)}
            placeholder={t.preview.mindMapMarkdownPlaceholder}
            className="min-h-[360px] w-full rounded-lg border border-input bg-background px-3 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Network className="w-3.5 h-3.5" />
            {t.preview.mindMapPreview}
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-border bg-white">
            {hasMindMap ? (
              <svg ref={svgRef} className="h-[360px] w-full" />
            ) : (
              <div className="flex h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <Network className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800">
                    {t.preview.mindMapEmpty}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.preview.mindMapEmptyHint}
                  </p>
                </div>
              </div>
            )}

            {renderError && (
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {renderError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
