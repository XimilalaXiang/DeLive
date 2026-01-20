// English language pack
import type { Translations } from './zh'

export const en: Translations = {
  // App info
  app: {
    name: 'DeLive',
    subtitle: 'Real-time Desktop Audio Transcription',
    footer: 'Open Source on',
  },

  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    export: 'Export',
    import: 'Import',
    confirm: 'OK',
    done: 'Done',
    create: 'Create',
    settings: 'Settings',
    configureApi: 'Configure API',
    today: 'Today',
    yesterday: 'Yesterday',
    characters: 'characters',
    items: 'items',
    tags: 'tags',
  },

  // Settings page
  settings: {
    title: 'API Settings',
    subtitle: 'Configure speech recognition service',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    apiKeyHint: 'Get your API key at',
    languageHints: 'Language Hints',
    languageHintsPlaceholder: 'zh, en',
    languageHintsDesc: 'Comma-separated language codes, e.g., zh, en, ja, ko',
    dataManagement: 'Data Management',
    dataManagementDesc: 'Export data for backup or migration. You can choose to overwrite or merge when importing.',
    exportData: 'Export Data',
    importData: 'Import Data',
    dataExported: 'Data exported',
    invalidBackupFile: 'Invalid backup file format',
    importConfirm: (sessions: number, tags: number) => 
      `Backup file contains ${sessions} sessions and ${tags} tags.\n\nClick "OK" to overwrite existing data\nClick "Cancel" to merge data (keep existing, add new)`,
    importedOverwrite: (sessions: number, tags: number) => 
      `Imported ${sessions} sessions and ${tags} tags`,
    importedMerge: (sessions: number, tags: number) => 
      `Merged data: added ${sessions} new sessions and ${tags} new tags`,
    importFailed: 'Failed to parse file. Please ensure it is a valid JSON file.',
    launchSettings: 'Launch Settings',
    autoLaunch: 'Start at Login',
    autoLaunchDesc: 'Automatically start and minimize to tray when system boots',
    // Language settings
    interfaceLanguage: 'Interface Language',
    interfaceLanguageDesc: 'Choose the display language for the app interface',
    languageChinese: '中文',
    languageEnglish: 'English',
    // ASR provider settings
    asrProvider: 'Speech Recognition Service',
    asrProviderDesc: 'Choose a speech recognition provider. Different providers have different features and pricing.',
    // API test
    testConfig: 'Test Configuration',
    testing: 'Testing...',
    testSuccess: 'Configuration verified!',
    testFailed: 'Configuration verification failed',
  },

  // Provider related
  provider: {
    streaming: 'Streaming',
    needConfig: 'Config needed',
    cloudProviders: 'Cloud Services',
    localProviders: 'Local Models',
    soniox: 'Soniox V3',
    sonioxDesc: 'High-precision real-time speech recognition, supports 60+ languages',
    openai: 'OpenAI Whisper',
    openaiDesc: 'High-quality speech recognition, supports multiple languages and audio formats',
    volc: 'Volcengine',
    volcDesc: 'ByteDance speech recognition service, optimized for Chinese',
  },

  // Recording controls
  recording: {
    startRecording: 'Start Recording',
    stopRecording: 'Stop Recording',
    starting: 'Starting...',
    stopping: 'Stopping...',
    selectSource: 'Please select a tab in the popup window and check',
    shareAudio: 'Share audio',
    capturingAudio: 'Capturing audio',
    waitingForAudio: 'Waiting for audio input... Make sure the page has sound',
    configureApiFirst: 'Please configure API key in settings first',
    clickToConfigureApi: '↑ Please click "Configure API" in the top right corner',
  },

  // Transcript display
  transcript: {
    title: 'Live Transcription',
    connecting: 'Connecting to Soniox...',
    selectAudioSource: 'Please select an audio source to share in the popup',
    listening: 'Listening for audio...',
    resultsWillAppear: 'Transcription results will appear here in real-time',
    noContentTitle: 'No content showing?',
    noContentTips: [
      'Check if the page is playing sound',
      'Make sure "Share audio" is checked when sharing',
      'Check F12 console for errors',
    ],
    ready: 'Ready',
    clickToStart: 'Click the button below to start recording',
    transcribed: 'Transcribed',
    liveUpdating: 'Live updating',
    scrollPaused: 'Scroll paused',
    scrollToBottom: 'Scroll to bottom',
  },

  // History
  history: {
    title: 'History',
    searchPlaceholder: 'Search title or content, press Enter to confirm...',
    noRecords: 'No history records',
    noMatchingRecords: 'No matching records',
    noSearchResults: (query: string) => `No records found containing "${query}"`,
    deleteConfirm: 'Are you sure you want to delete this record?',
    editTitle: 'Edit title',
    exportTxt: 'Export TXT',
  },

  // Tags
  tag: {
    tags: 'Tags',
    createNew: 'Create new tag',
    manageTags: 'Manage tags',
    tagName: 'Tag name',
    noTags: 'No tags',
    noTagsHint: 'No tags yet. Add them in history records.',
    deleteConfirm: (name: string) => `Delete tag "${name}"? This will remove it from all sessions.`,
    filter: 'Filter:',
    clearFilter: 'Clear filter',
  },

  // Preview modal
  preview: {
    noContent: 'This record has no transcription content',
    totalCharacters: 'Total',
    exportTxt: 'Export TXT',
  },

  // Source picker
  sourcePicker: {
    title: 'Select Content to Capture',
    subtitle: 'Choose a screen or window for audio capture',
    refresh: 'Refresh list',
    loading: 'Loading available screens and windows...',
    screens: 'Screens',
    windows: 'Windows',
    noSources: 'No available screens or windows found',
    captureHint: 'System audio from the selected screen/window will be captured',
    startCapture: 'Start Capture',
    loadFailed: 'Failed to load desktop sources:',
    selectFailed: 'Failed to select source',
  },

  // API related prompts
  api: {
    needConfig: 'ASR Service Configuration Required',
    needConfigDesc: 'Please click "Configure API" button in the top right corner, select a speech recognition provider, and enter the corresponding API key to get started.',
  },

  // Title bar
  titleBar: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },

  // Session default title
  session: {
    defaultTitle: (time: string) => `Transcript ${time}`,
  },
}
