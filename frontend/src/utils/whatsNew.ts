export interface WhatsNewEntry {
  version: string
  date: string
  features: { zh: string; en: string }[]
  fixes: { zh: string; en: string }[]
}

const entries: WhatsNewEntry[] = [
  {
    version: '2.0.2',
    date: '2026-04-25',
    features: [
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
