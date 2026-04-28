export interface WhatsNewEntry {
  version: string
  date: string
  features: { zh: string; en: string }[]
  fixes: { zh: string; en: string }[]
}

const entries: WhatsNewEntry[] = [
  {
    version: '2.1.0',
    date: '2026-04-28',
    features: [
      {
        zh: 'Cloudflare Workers AI 提供商 — 基于 Whisper 的新 ASR 提供商，价格低廉且有免费额度',
        en: 'Cloudflare Workers AI provider — new ASR provider based on Whisper, with low cost and free tier',
      },
      {
        zh: 'AI 后处理智能文本源选择 — 纠错完成后，后续 AI 功能自动使用纠错文本；可配置偏好',
        en: 'AI post-processing smart text-source selection — AI features auto-use corrected text; configurable preference',
      },
      {
        zh: '文本源状态横幅 — AI 分析、对话、思维导图标签页显示当前使用的文本源',
        en: 'Text-source status banners — AI Analysis, Chat, and Mind Map tabs show which text source is in use',
      },
      {
        zh: 'Windowed batch 转录重构 — LocalAgreement 策略 + 词级时间戳，输出更稳定',
        en: 'Windowed batch transcription refactored — LocalAgreement strategy with word-level timestamps for stable output',
      },
    ],
    fixes: [
      {
        zh: '修复 Cloudflare 词级时间戳解析错误',
        en: 'Fixed Cloudflare word timestamp extraction from segments[].words[]',
      },
      {
        zh: '启用 Cloudflare 反幻觉参数（VAD filter、hallucination_silence_threshold）',
        en: 'Enabled Cloudflare anti-hallucination params (vad_filter, hallucination_silence_threshold)',
      },
      {
        zh: '修复静音检测 — 只检查最近 3 秒而非整个窗口',
        en: 'Fixed silence detection — now checks only last 3 seconds instead of entire window',
      },
      {
        zh: '移除 Cloudflare 不正确的实时翻译标志',
        en: 'Removed incorrect Cloudflare supportsTranslation capability',
      },
    ],
  },
  {
    version: '2.0.2',
    date: '2026-04-25',
    features: [
      {
        zh: 'AI 转录纠错 — 支持「直接纠错」和「先检测后纠错」两种模式，流式输出纠正结果',
        en: 'AI Transcript Correction — Quick Fix and Review & Fix modes with streaming output',
      },
      {
        zh: 'AI 设置重构 — 获取模型列表、为不同 AI 功能分配指定模型、设置默认模型',
        en: 'AI Settings revamp — fetch model list, assign models per AI feature, set default model',
      },
      {
        zh: '纠错后内容支持导出为 TXT 和 Markdown 格式',
        en: 'Export corrected transcript as TXT or Markdown',
      },
      {
        zh: '录制中热切换 — 录制过程中无需停止即可切换翻译和发言人识别（Soniox）',
        en: 'Live config hot-switch — Toggle translation and speaker diarization during active recording (Soniox)',
      },
      {
        zh: '录制控件中新增快捷设置面板，一键切换功能',
        en: 'Quick Settings panel in recording controls for one-tap feature toggles',
      },
    ],
    fixes: [
      {
        zh: '修复纠错数据在应用重启后丢失的问题',
        en: 'Fixed correction data lost on app restart (normalize round-trip)',
      },
      {
        zh: '修复配置切换时 408 超时错误（WebM 文件头时序问题）',
        en: 'Fixed 408 timeout on config switch (WebM header timing)',
      },
      {
        zh: '修复蓝牙设备切换时转录意外停止的问题',
        en: 'Fixed Bluetooth device switch causing recording to stop',
      },
      {
        zh: '修复音频设备切换后 408 超时错误',
        en: 'Fixed device-change 408 timeout (correct WebM header sequence)',
      },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-04-21',
    features: [
      {
        zh: 'Electron 主进程 i18n 模块，托盘菜单、快捷键、更新对话框跟随语言设置',
        en: 'Electron main process i18n — tray menu, shortcuts, and update dialogs follow language setting',
      },
      {
        zh: 'Provider 名称、描述和配置字段完全可翻译',
        en: 'Provider names, descriptions, and config fields are fully translatable',
      },
    ],
    fixes: [
      {
        zh: '21 个文件中 150+ 处硬编码中文替换为 i18n key',
        en: 'Replaced 150+ hardcoded Chinese strings across 21 files with proper i18n keys',
      },
    ],
  },
]

export function getWhatsNewForVersion(version: string): WhatsNewEntry | undefined {
  const major = version.replace(/-.*$/, '')
  return entries.find((e) => e.version === major)
}

export function getAllWhatsNew(): WhatsNewEntry[] {
  return entries
}
