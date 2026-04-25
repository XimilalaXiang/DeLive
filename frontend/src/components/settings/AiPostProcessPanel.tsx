import { useState, useCallback, useMemo } from 'react'
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'
import { Switch } from '../ui'
import type { Translations } from '../../i18n'
import type { AiFeatureKey, AiPostProcessConfig } from '../../types'
import { fetchAvailableModels } from '../../services/aiPostProcess'

interface AiPostProcessPanelProps {
  t: Translations
  language: string
  aiPostProcessConfig: AiPostProcessConfig
  updateAiPostProcessConfig: (config: Partial<AiPostProcessConfig>) => void
}

const AI_FEATURES: { key: AiFeatureKey; labelZh: string; labelEn: string }[] = [
  { key: 'briefing', labelZh: 'AI 摘要', labelEn: 'AI Briefing' },
  { key: 'chat', labelZh: 'AI 对话', labelEn: 'AI Chat' },
  { key: 'mindmap', labelZh: 'AI 思维导图', labelEn: 'AI Mind Map' },
  { key: 'correction', labelZh: 'AI 纠错', labelEn: 'AI Correction' },
]

export function AiPostProcessPanel({
  t,
  language,
  aiPostProcessConfig,
  updateAiPostProcessConfig,
}: AiPostProcessPanelProps) {
  const cfg = aiPostProcessConfig
  const isZh = language === 'zh'
  const [showApiKey, setShowApiKey] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [fetchError, setFetchError] = useState('')
  const [modelSearch, setModelSearch] = useState('')

  const effectiveDefault = cfg.defaultModel?.trim() || cfg.model?.trim() || ''
  const selected = cfg.selectedModels ?? []

  const filteredModels = useMemo(() => {
    const all = cfg.availableModels ?? []
    const q = modelSearch.trim().toLowerCase()
    if (!q) return all
    return all.filter((m) => m.toLowerCase().includes(q))
  }, [cfg.availableModels, modelSearch])

  const handleFetchModels = useCallback(async () => {
    const baseUrl = cfg.baseUrl?.trim()
    if (!baseUrl) return
    setFetchStatus('loading')
    setFetchError('')
    try {
      const models = await fetchAvailableModels(baseUrl, cfg.apiKey)
      updateAiPostProcessConfig({ availableModels: models })
      setFetchStatus('success')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
      setFetchStatus('error')
    }
  }, [cfg.baseUrl, cfg.apiKey, updateAiPostProcessConfig])

  const toggleModelSelected = useCallback(
    (modelId: string) => {
      const next = selected.includes(modelId)
        ? selected.filter((m) => m !== modelId)
        : [...selected, modelId]
      const patch: Partial<AiPostProcessConfig> = { selectedModels: next }
      if (cfg.defaultModel === modelId && !next.includes(modelId)) {
        patch.defaultModel = next[0] || ''
      }
      updateAiPostProcessConfig(patch)
    },
    [selected, cfg.defaultModel, updateAiPostProcessConfig],
  )

  const setDefaultModel = useCallback(
    (modelId: string) => {
      const patch: Partial<AiPostProcessConfig> = { defaultModel: modelId }
      if (!selected.includes(modelId)) {
        patch.selectedModels = [...selected, modelId]
      }
      updateAiPostProcessConfig(patch)
    },
    [selected, updateAiPostProcessConfig],
  )

  const setFeatureModel = useCallback(
    (feature: AiFeatureKey, modelId: string) => {
      updateAiPostProcessConfig({
        modelAssignment: {
          ...(cfg.modelAssignment || {}),
          [feature]: modelId || undefined,
        },
      })
    },
    [cfg.modelAssignment, updateAiPostProcessConfig],
  )

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          {t.settings.aiPostProcessTitle}
        </label>
        <p className="text-xs text-muted-foreground">{t.settings.aiPostProcessDesc}</p>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">{t.settings.aiPostProcessEnable}</p>
            <p className="text-xs text-muted-foreground">{t.settings.aiPostProcessEnableDesc}</p>
          </div>
          <Switch
            checked={!!cfg.enabled}
            onChange={(val) => updateAiPostProcessConfig({ enabled: val })}
            aria-label={t.settings.aiPostProcessEnable}
          />
        </div>
      </section>

      {/* API connection */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted-foreground" />
          {isZh ? 'API 连接' : 'API Connection'}
        </label>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t.settings.aiBaseUrl}</label>
          <input
            type="text"
            value={cfg.baseUrl || ''}
            onChange={(e) => updateAiPostProcessConfig({ baseUrl: e.target.value })}
            placeholder="http://127.0.0.1:11434/v1"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Key className="w-3.5 h-3.5" />
            {t.settings.aiApiKey}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={cfg.apiKey || ''}
              onChange={(e) => updateAiPostProcessConfig({ apiKey: e.target.value })}
              placeholder={t.settings.aiApiKeyPlaceholder}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t.settings.aiApiKeyDesc}</p>
        </div>

        <button
          onClick={() => void handleFetchModels()}
          disabled={!cfg.baseUrl?.trim() || fetchStatus === 'loading'}
          className={`inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-md transition-colors w-full
            ${fetchStatus === 'loading'
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : fetchStatus === 'success'
                ? 'bg-success/10 text-success border border-success/50'
                : fetchStatus === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
        >
          {fetchStatus === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : fetchStatus === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isZh ? '获取模型列表' : 'Fetch Model List'}
        </button>

        {fetchStatus === 'error' && fetchError && (
          <p className="text-xs text-destructive">{fetchError}</p>
        )}
      </section>

      {/* Model list */}
      {(cfg.availableModels?.length ?? 0) > 0 && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            {isZh ? '可用模型' : 'Available Models'}
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {selected.length}/{cfg.availableModels!.length} {isZh ? '已选' : 'selected'}
            </span>
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder={isZh ? '搜索模型...' : 'Search models...'}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="max-h-60 overflow-y-auto rounded-lg border border-input divide-y divide-border">
            {filteredModels.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                {isZh ? '无匹配模型' : 'No matching models'}
              </div>
            )}
            {filteredModels.map((modelId) => {
              const isSelected = selected.includes(modelId)
              const isDefault = effectiveDefault === modelId
              return (
                <div
                  key={modelId}
                  className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => toggleModelSelected(modelId)}
                >
                  <div
                    className={`flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>

                  <span className={`flex-1 truncate font-mono text-xs ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {modelId}
                  </span>

                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDefaultModel(modelId)
                      }}
                      title={isZh ? '设为默认模型' : 'Set as default'}
                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                        isDefault
                          ? 'text-yellow-500'
                          : 'text-muted-foreground/40 hover:text-yellow-500'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {effectiveDefault && (
            <p className="text-xs text-muted-foreground">
              {isZh ? '默认模型：' : 'Default: '}
              <span className="font-mono text-foreground">{effectiveDefault}</span>
            </p>
          )}
        </section>
      )}

      {/* Feature model assignment */}
      {selected.length > 0 && (
        <section className="workspace-panel-muted p-4 space-y-3">
          <label className="text-sm font-medium leading-none flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            {isZh ? '功能模型分配' : 'Model Assignment'}
          </label>
          <p className="text-xs text-muted-foreground">
            {isZh
              ? '为每个 AI 功能指定模型，留空则使用默认模型'
              : 'Assign a model per feature, or leave empty to use default'}
          </p>

          <div className="space-y-2">
            {AI_FEATURES.map(({ key, labelZh, labelEn }) => {
              const assigned = cfg.modelAssignment?.[key] || ''
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium w-28 shrink-0">
                    {isZh ? labelZh : labelEn}
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={assigned}
                      onChange={(e) => setFeatureModel(key, e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm font-mono appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">
                        {isZh ? `默认 (${effectiveDefault || '未设置'})` : `Default (${effectiveDefault || 'not set'})`}
                      </option>
                      {selected.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Prompt language */}
      <section className="workspace-panel-muted p-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground">{t.settings.aiPromptLanguage}</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateAiPostProcessConfig({ promptLanguage: 'zh' })}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
              (cfg.promptLanguage || 'zh') === 'zh'
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => updateAiPostProcessConfig({ promptLanguage: 'en' })}
            className={`flex-1 h-9 px-3 text-sm font-medium rounded-md transition-all ${
              (cfg.promptLanguage || 'zh') === 'en'
                ? 'bg-primary/10 text-primary border-2 border-primary ring-2 ring-primary/20'
                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            English
          </button>
        </div>
      </section>
    </div>
  )
}
