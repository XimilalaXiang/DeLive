import type { Language } from '../i18n'

export type WhatsNewLine = { zh: string; en: string; ko?: string }

export interface WhatsNewEntry {
  version: string
  date: string
  features: WhatsNewLine[]
  fixes: WhatsNewLine[]
}

const entries: WhatsNewEntry[] = [
  {
    version: '2.3.0',
    date: '2026-09-21',
    features: [
      {
        zh: '韩语界面 — 完整韩语 UI、语言选择器，以及 Electron 托盘与主进程文案（测试预览版 2.3.0-beta.1）',
        en: 'Korean UI — full Korean locale, language picker, and Electron tray/main-process strings (beta preview 2.3.0-beta.1)',
        ko: '한국어 UI — 전체 한국어 인터페이스, 언어 선택, Electron 트레이·메인 프로세스 문자열 (베타 2.3.0-beta.1)',
      },
      {
        zh: 'FunASR / SenseVoice 本地 ASR 与 60DB 云端提供商；Soniox 升级至 V5',
        en: 'FunASR / SenseVoice local ASR and 60DB cloud provider; Soniox upgraded to V5',
        ko: 'FunASR / SenseVoice 로컬 ASR 및 60DB 클라우드 제공자; Soniox V5로 업그레이드',
      },
      {
        zh: 'local_openai 与 sensevoice 支持文件上传转录',
        en: 'File upload transcription for local_openai and sensevoice providers',
        ko: 'local_openai 및 sensevoice에서 파일 업로드 전사 지원',
      },
    ],
    fixes: [
      {
        zh: '提供商文案与启动时主进程语言不再错误回退为中文；用户可见错误全面本地化',
        en: 'Provider strings and main-process language at startup no longer fall back to Chinese; localized user-facing errors',
        ko: '제공자 문자열과 시작 시 메인 프로세스 언어가 더 이상 중국어로 되돌아가지 않음; 사용자 오류 메시지 다국어화',
      },
      {
        zh: 'HypothesisBuffer 单块转录拆分为词级；macOS arm64「应用已损坏」签名修复；动态代理端口',
        en: 'HypothesisBuffer splits single-blob transcripts into words; macOS arm64 damaged-app signing fix; dynamic proxy port',
        ko: 'HypothesisBuffer 단일 블록 전사를 단어 단위로 분할; macOS arm64 손상된 앱 서명 수정; 동적 프록시 포트',
      },
    ],
  },
  {
    version: '2.2.4',
    date: '2026-05-21',
    features: [
      {
        zh: '越南语翻译目标 — 翻译语言下拉菜单和 Soniox 支持语言新增越南语',
        en: 'Vietnamese translation target — Vietnamese added to translation language dropdown and Soniox supported languages',
        ko: '베트남어 번역 대상 — 번역 언어 목록과 Soniox 지원 언어에 베트남어 추가',
      },
      {
        zh: '文件转录国际化 — 文件上传/转录界面全面支持中英双语',
        en: 'File transcription i18n — file upload/transcription UI fully supports bilingual display',
        ko: '파일 전사 i18n — 파일 업로드/전사 UI가 다국어(중·영·한)를 지원',
      },
    ],
    fixes: [
      {
        zh: '修复 macOS 托盘图标过大的问题，使用 16×16 模板图像并正确缩放',
        en: 'Fixed macOS tray icon appearing oversized by using 16×16 template image with proper resize',
        ko: 'Fixed macOS tray icon appearing oversized by using 16×16 template image with proper resize',
      },
      {
        zh: '修复托盘菜单在切换语言后不更新的问题，现在动态重建',
        en: 'Fixed tray menu not updating after language change — now dynamically rebuilds',
        ko: 'Fixed tray menu not updating after language change — now dynamically rebuilds',
      },
      {
        zh: 'Electron 语言持久化从不可靠的 LevelDB 切换到 prefs.json',
        en: 'Electron language persistence switched from unreliable LevelDB to prefs.json',
        ko: 'Electron language persistence switched from unreliable LevelDB to prefs.json',
      },
      {
        zh: '修复文件转录组件中函数类型 i18n key 可能导致的运行时错误',
        en: 'Fixed potential runtime errors from function-valued i18n keys in file transcription components',
        ko: 'Fixed potential runtime errors from function-valued i18n keys in file transcription components',
      },
    ],
  },
  {
    version: '2.1.1',
    date: '2026-05-01',
    features: [],
    fixes: [
      {
        zh: '修复回顾页面所有标签页（转录文本、AI 纠错、概览等）内容过长时无法滚动的问题',
        en: 'Fixed all review tabs (Transcript, AI Correction, Overview, etc.) unable to scroll when content exceeds visible area',
        ko: 'Fixed all review tabs (Transcript, AI Correction, Overview, etc.) unable to scroll when content exceeds visible area',
      },
      {
        zh: '修复测试文件中未使用变量导致的 TypeScript 构建失败',
        en: 'Fixed TypeScript build errors caused by unused variable declarations in test files',
        ko: 'Fixed TypeScript build errors caused by unused variable declarations in test files',
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-04-28',
    features: [
      {
        zh: 'Cloudflare Workers AI 提供商 — 基于 Whisper 的新 ASR 提供商，价格低廉且有免费额度',
        en: 'Cloudflare Workers AI provider — new ASR provider based on Whisper, with low cost and free tier',
        ko: 'Cloudflare Workers AI provider — new ASR provider based on Whisper, with low cost and free tier',
      },
      {
        zh: 'AI 后处理智能文本源选择 — 纠错完成后，后续 AI 功能自动使用纠错文本；可配置偏好',
        en: 'AI post-processing smart text-source selection — AI features auto-use corrected text; configurable preference',
        ko: 'AI post-processing smart text-source selection — AI features auto-use corrected text; configurable preference',
      },
      {
        zh: '文本源状态横幅 — AI 分析、对话、思维导图标签页显示当前使用的文本源',
        en: 'Text-source status banners — AI Analysis, Chat, and Mind Map tabs show which text source is in use',
        ko: 'Text-source status banners — AI Analysis, Chat, and Mind Map tabs show which text source is in use',
      },
      {
        zh: 'Windowed batch 转录重构 — LocalAgreement 策略 + 词级时间戳，输出更稳定',
        en: 'Windowed batch transcription refactored — LocalAgreement strategy with word-level timestamps for stable output',
        ko: 'Windowed batch transcription refactored — LocalAgreement strategy with word-level timestamps for stable output',
      },
    ],
    fixes: [
      {
        zh: '修复 Cloudflare 词级时间戳解析错误',
        en: 'Fixed Cloudflare word timestamp extraction from segments[].words[]',
        ko: 'Fixed Cloudflare word timestamp extraction from segments[].words[]',
      },
      {
        zh: '启用 Cloudflare 反幻觉参数（VAD filter、hallucination_silence_threshold）',
        en: 'Enabled Cloudflare anti-hallucination params (vad_filter, hallucination_silence_threshold)',
        ko: 'Enabled Cloudflare anti-hallucination params (vad_filter, hallucination_silence_threshold)',
      },
      {
        zh: '修复静音检测 — 只检查最近 3 秒而非整个窗口',
        en: 'Fixed silence detection — now checks only last 3 seconds instead of entire window',
        ko: 'Fixed silence detection — now checks only last 3 seconds instead of entire window',
      },
      {
        zh: '移除 Cloudflare 不正确的实时翻译标志',
        en: 'Removed incorrect Cloudflare supportsTranslation capability',
        ko: 'Removed incorrect Cloudflare supportsTranslation capability',
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
        ko: 'AI Transcript Correction — Quick Fix and Review & Fix modes with streaming output',
      },
      {
        zh: 'AI 设置重构 — 获取模型列表、为不同 AI 功能分配指定模型、设置默认模型',
        en: 'AI Settings revamp — fetch model list, assign models per AI feature, set default model',
        ko: 'AI Settings revamp — fetch model list, assign models per AI feature, set default model',
      },
      {
        zh: '纠错后内容支持导出为 TXT 和 Markdown 格式',
        en: 'Export corrected transcript as TXT or Markdown',
        ko: 'Export corrected transcript as TXT or Markdown',
      },
      {
        zh: '录制中热切换 — 录制过程中无需停止即可切换翻译和发言人识别（Soniox）',
        en: 'Live config hot-switch — Toggle translation and speaker diarization during active recording (Soniox)',
        ko: 'Live config hot-switch — Toggle translation and speaker diarization during active recording (Soniox)',
      },
      {
        zh: '录制控件中新增快捷设置面板，一键切换功能',
        en: 'Quick Settings panel in recording controls for one-tap feature toggles',
        ko: 'Quick Settings panel in recording controls for one-tap feature toggles',
      },
    ],
    fixes: [
      {
        zh: '修复纠错数据在应用重启后丢失的问题',
        en: 'Fixed correction data lost on app restart (normalize round-trip)',
        ko: 'Fixed correction data lost on app restart (normalize round-trip)',
      },
      {
        zh: '修复配置切换时 408 超时错误（WebM 文件头时序问题）',
        en: 'Fixed 408 timeout on config switch (WebM header timing)',
        ko: 'Fixed 408 timeout on config switch (WebM header timing)',
      },
      {
        zh: '修复蓝牙设备切换时转录意外停止的问题',
        en: 'Fixed Bluetooth device switch causing recording to stop',
        ko: 'Fixed Bluetooth device switch causing recording to stop',
      },
      {
        zh: '修复音频设备切换后 408 超时错误',
        en: 'Fixed device-change 408 timeout (correct WebM header sequence)',
        ko: 'Fixed device-change 408 timeout (correct WebM header sequence)',
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
        ko: 'Electron main process i18n — tray menu, shortcuts, and update dialogs follow language setting',
      },
      {
        zh: 'Provider 名称、描述和配置字段完全可翻译',
        en: 'Provider names, descriptions, and config fields are fully translatable',
        ko: 'Provider names, descriptions, and config fields are fully translatable',
      },
    ],
    fixes: [
      {
        zh: '21 个文件中 150+ 处硬编码中文替换为 i18n key',
        en: 'Replaced 150+ hardcoded Chinese strings across 21 files with proper i18n keys',
        ko: 'Replaced 150+ hardcoded Chinese strings across 21 files with proper i18n keys',
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

/** Korean UI prefers `ko`; older entries without Korean copy fall back to English (not Chinese). */
export function whatsNewLineText(line: WhatsNewLine, lang: Language): string {
  if (lang === 'zh') return line.zh
  if (lang === 'ko') return line.ko ?? line.en
  return line.en
}
