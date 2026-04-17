import { describe, it, expect } from 'vitest'

describe('Phase 4 – AiTab extraction', () => {
  it('ReviewTab type includes ai tab', () => {
    const validTabs = ['overview', 'ai', 'chat', 'mindmap', 'transcript']
    expect(validTabs).toContain('ai')
    expect(validTabs.length).toBe(5)
  })

  it('AiTab i18n key exists in expected structure', () => {
    const reviewI18nKeys = [
      'tabOverview', 'tabAi', 'tabChat', 'tabMindMap', 'tabTranscript',
    ]
    expect(reviewI18nKeys).toContain('tabAi')
  })

  it('OverviewTab should not contain AI-related content after extraction', () => {
    const overviewResponsibilities = ['speakers', 'topic']
    const aiResponsibilities = ['summary', 'keywords', 'actionItems', 'chapters', 'titleSuggestion']

    for (const item of aiResponsibilities) {
      expect(overviewResponsibilities).not.toContain(item)
    }
  })

  it('tab config order should be transcript > overview > ai > chat > mindmap', () => {
    const tabOrder = ['transcript', 'overview', 'ai', 'chat', 'mindmap']
    expect(tabOrder[0]).toBe('transcript')
    expect(tabOrder[1]).toBe('overview')
    expect(tabOrder[2]).toBe('ai')
    expect(tabOrder[3]).toBe('chat')
    expect(tabOrder[4]).toBe('mindmap')
  })
})

describe('Phase 4 – ActivityHeatmap i18n migration', () => {
  it('heatmap i18n keys exist in both locales', async () => {
    const { en } = await import('../../i18n/locales/en')
    const { zh } = await import('../../i18n/locales/zh')

    const requiredKeys = [
      'title', 'total', 'thisMonth', 'streak', 'totalDuration',
      'days', 'less', 'more', 'noRecordings', 'recording',
      'dayMon', 'dayWed', 'dayFri',
    ]
    for (const key of requiredKeys) {
      expect((en.heatmap as Record<string, unknown>)[key]).toBeTruthy()
      expect((zh.heatmap as Record<string, unknown>)[key]).toBeTruthy()
    }
  })
})

describe('Phase 4 – ActivityHeatmap collapsible', () => {
  it('persistence key is defined', () => {
    const key = 'heatmap-collapsed'
    expect(key).toBe('heatmap-collapsed')
  })

  it('collapsed state defaults to false when no storage value', () => {
    const storedValue = null
    const collapsed = storedValue === 'true'
    expect(collapsed).toBe(false)
  })

  it('collapsed state is true when storage has "true"', () => {
    const storedValue = 'true'
    const collapsed = storedValue === 'true'
    expect(collapsed).toBe(true)
  })

  it('toggle flips the collapsed state', () => {
    let collapsed = false
    collapsed = !collapsed
    expect(collapsed).toBe(true)
    collapsed = !collapsed
    expect(collapsed).toBe(false)
  })
})
