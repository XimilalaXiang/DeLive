import {
  Sparkles,
  Loader2,
  Type,
  ListTodo,
  Tags,
  BookOpenText,
} from 'lucide-react'
import type { TranscriptSession } from '../../types'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTagStore } from '../../stores/tagStore'
import { isAiPostProcessConfigured } from '../../services/aiPostProcess'

interface AiTabProps {
  session: TranscriptSession
}

export function AiTab({ session }: AiTabProps) {
  const { t } = useUIStore()
  const settings = useSettingsStore((state) => state.settings)
  const generateSessionPostProcess = useSessionStore((state) => state.generateSessionPostProcess)
  const updateSessionTitle = useSessionStore((state) => state.updateSessionTitle)
  const updateSessionTags = useSessionStore((state) => state.updateSessionTags)
  const tags = useTagStore((state) => state.tags)
  const addTag = useTagStore((state) => state.addTag)

  const postProcess = session.postProcess
  const aiConfigured = isAiPostProcessConfigured(settings)
  const aiGenerating = postProcess?.status === 'pending'
  const hasAiContent = Boolean(
    postProcess?.summary?.trim()
    || postProcess?.actionItems?.length
    || postProcess?.keywords?.length
    || postProcess?.chapters?.length,
  )

  const handleGenerateAiBriefing = async () => {
    if (!session || aiGenerating) return
    try {
      await generateSessionPostProcess(session.id)
    } catch (error) {
      console.error('[AiTab] AI post-process failed:', error)
    }
  }

  const handleApplySuggestedTitle = () => {
    if (!session || !postProcess?.titleSuggestion?.trim()) return
    updateSessionTitle(session.id, postProcess.titleSuggestion.trim())
  }

  const handleApplySuggestedTags = () => {
    if (!session || !postProcess?.tagSuggestions?.length) return
    const nextTagIds = new Set(session.tagIds || [])
    const normalizeTagName = (value: string) => value.trim().toLowerCase()
    for (const suggestion of postProcess.tagSuggestions) {
      const name = suggestion.trim()
      if (!name) continue
      const existing = tags.find((tag) => normalizeTagName(tag.name) === normalizeTagName(name))
      const tagId = existing?.id || addTag(name, 'blue').id
      nextTagIds.add(tagId)
    }
    updateSessionTags(session.id, Array.from(nextTagIds))
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-card/90 to-card/60 p-5 space-y-4 border-l-4 border-l-primary/40 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {t.preview.aiBriefing}
            </div>
            {!aiConfigured && (
              <p className="text-xs text-muted-foreground">{t.preview.aiNotConfigured}</p>
            )}
            {postProcess?.status === 'error' && postProcess.error && (
              <p className="text-xs text-destructive">{postProcess.error}</p>
            )}
          </div>
          <button
            onClick={() => void handleGenerateAiBriefing()}
            disabled={!aiConfigured || aiGenerating || !session.transcript.trim()}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !aiConfigured || !session.transcript.trim()
                ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                : aiGenerating
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {aiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.preview.aiGenerating}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {hasAiContent ? t.preview.aiRegenerate : t.preview.aiGenerate}
              </>
            )}
          </button>
        </div>

        {hasAiContent && (
          <div className="grid gap-4">
            {postProcess?.summary && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.preview.aiSummary}
                </div>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {postProcess.summary}
                </p>
              </div>
            )}

            {postProcess?.titleSuggestion && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Type className="w-3.5 h-3.5" />
                  {t.preview.aiTitleSuggestion}
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium text-foreground">{postProcess.titleSuggestion}</div>
                  <button
                    onClick={handleApplySuggestedTitle}
                    disabled={session.title.trim() === postProcess.titleSuggestion.trim()}
                    className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      session.title.trim() === postProcess.titleSuggestion.trim()
                        ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
                        : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {t.preview.aiApplyTitle}
                  </button>
                </div>
              </div>
            )}

            {postProcess?.actionItems && postProcess.actionItems.length > 0 && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListTodo className="w-3.5 h-3.5" />
                  {t.preview.aiActionItems}
                </div>
                <div className="space-y-2">
                  {postProcess.actionItems.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {((postProcess?.keywords && postProcess.keywords.length > 0) || (postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0)) && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Tags className="w-3.5 h-3.5" />
                    {t.preview.aiKeywords}
                  </div>
                  {postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0 && (
                    <button
                      onClick={handleApplySuggestedTags}
                      className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {t.preview.aiApplyTags}
                    </button>
                  )}
                </div>
                {postProcess?.tagSuggestions && postProcess.tagSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{t.preview.aiTagSuggestions}</div>
                    <div className="flex flex-wrap gap-2">
                      {postProcess.tagSuggestions.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success dark:border-success/20 dark:bg-success/10 dark:text-success"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {postProcess?.keywords && postProcess.keywords.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{t.preview.aiKeywords}</div>
                    <div className="flex flex-wrap gap-2">
                      {postProcess.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {postProcess?.chapters && postProcess.chapters.length > 0 && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <BookOpenText className="w-3.5 h-3.5" />
                  {t.preview.aiChapters}
                </div>
                <div className="space-y-2">
                  {postProcess.chapters.map((chapter, index) => (
                    <div
                      key={`${chapter.title}-${index}`}
                      className="rounded-lg border border-border bg-background/70 px-3 py-3"
                    >
                      <div className="text-sm font-medium text-foreground">{chapter.title}</div>
                      {chapter.summary && (
                        <p className="text-xs text-muted-foreground mt-1">{chapter.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
