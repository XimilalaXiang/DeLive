// 中文语言包
export const zh = {
  // 应用信息
  app: {
    name: 'DeLive',
    subtitle: '桌面音频实时转录',
    footer: '开源于',
  },

  // 通用
  common: {
    save: '保存',
    cancel: '取消',
    close: '关闭',
    delete: '删除',
    edit: '编辑',
    export: '导出',
    import: '导入',
    confirm: '确定',
    done: '完成',
    create: '创建',
    settings: '设置',
    configureApi: '配置 API',
    today: '今天',
    yesterday: '昨天',
    characters: '字符',
    items: '条',
    tags: '标签',
  },

  // 设置页面
  settings: {
    title: 'API 设置',
    subtitle: '配置语音识别服务',
    apiKey: 'API 密钥',
    apiKeyPlaceholder: '输入你的 API 密钥',
    apiKeyHint: '获取你的 API 密钥',
    languageHints: '语言提示 (Language Hints)',
    languageHintsPlaceholder: 'zh, en',
    languageHintsDesc: '用逗号分隔的语言代码，例如: zh, en, ja, ko',
    dataManagement: '数据管理',
    dataManagementDesc: '导出数据以备份或迁移到其他设备，导入时可选择覆盖或合并现有数据',
    exportData: '导出数据',
    importData: '导入数据',
    dataExported: '数据已导出',
    invalidBackupFile: '无效的备份文件格式',
    importConfirm: (sessions: number, tags: number) => 
      `检测到备份文件包含 ${sessions} 条会话和 ${tags} 个标签。\n\n点击"确定"将覆盖现有数据\n点击"取消"将合并数据（保留现有，添加新数据）`,
    importedOverwrite: (sessions: number, tags: number) => 
      `已导入 ${sessions} 条会话和 ${tags} 个标签`,
    importedMerge: (sessions: number, tags: number) => 
      `已合并数据：新增 ${sessions} 条会话和 ${tags} 个标签`,
    importFailed: '文件解析失败，请确保是有效的JSON文件',
    launchSettings: '启动设置',
    autoLaunch: '开机自动启动',
    autoLaunchDesc: '系统启动时自动运行并最小化到托盘',
    // 语言设置
    interfaceLanguage: '界面语言',
    interfaceLanguageDesc: '选择应用界面显示的语言',
    languageChinese: '中文',
    languageEnglish: 'English',
    // ASR 提供商设置
    asrProvider: '语音识别服务',
    asrProviderDesc: '选择语音识别服务提供商，不同提供商有不同的特性和价格',
    // API 测试
    testConfig: '测试配置',
    testing: '正在测试...',
    testSuccess: '配置验证成功！',
    testFailed: '配置验证失败',
  },

  // 提供商相关
  provider: {
    streaming: '流式',
    needConfig: '需配置',
    cloudProviders: '云端服务',
    localProviders: '本地模型',
    soniox: 'Soniox V3',
    sonioxDesc: '高精度实时语音识别，支持 60+ 种语言',
    openai: 'OpenAI Whisper',
    openaiDesc: '高质量语音识别，支持多种语言和音频格式',
    volc: '火山引擎',
    volcDesc: '字节跳动旗下语音识别服务，支持中文优化',
  },

  // 录制控制
  recording: {
    startRecording: '开始录制',
    stopRecording: '停止录制',
    starting: '正在启动...',
    stopping: '正在停止...',
    selectSource: '请在弹出的窗口中选择标签页，并勾选',
    shareAudio: '共享音频',
    capturingAudio: '正在捕获音频',
    waitingForAudio: '等待音频输入... 请确保页面有声音',
    configureApiFirst: '请先在设置中配置 API 密钥',
    clickToConfigureApi: '↑ 请先点击右上角配置 API 密钥',
  },

  // 转录显示
  transcript: {
    title: '实时转录',
    connecting: (provider: string) => `正在连接 ${provider}...`,
    selectAudioSource: '请在弹出窗口中选择要共享的音频源',
    listening: '正在监听音频...',
    resultsWillAppear: '转录结果将实时显示在这里',
    noContentTitle: '没有内容显示？',
    noContentTips: [
      '检查页面是否正在播放声音',
      '确认共享时勾选了"共享音频"',
      'F12 控制台查看是否有报错',
    ],
    ready: '准备就绪',
    clickToStart: '点击下方按钮开始录制',
    transcribed: '已转录',
    confirmed: '已确认',
    liveUpdating: '实时更新中',
    scrollPaused: '已暂停滚动',
    scrollToBottom: '回到底部',
  },

  // 历史记录
  history: {
    title: '历史记录',
    searchPlaceholder: '搜索标题或内容，按回车确认...',
    noRecords: '暂无历史记录',
    noMatchingRecords: '没有匹配的记录',
    noSearchResults: (query: string) => `未找到包含"${query}"的记录`,
    deleteConfirm: '确定要删除这条记录吗？',
    editTitle: '编辑标题',
    exportTxt: '导出TXT',
    exportSrt: '导出SRT字幕',
    exportVtt: '导出VTT字幕',
  },

  // 标签
  tag: {
    tags: '标签',
    createNew: '创建新标签',
    manageTags: '管理标签',
    tagName: '标签名称',
    noTags: '暂无标签',
    noTagsHint: '暂无标签，在历史记录中添加',
    deleteConfirm: (name: string) => `确定删除标签"${name}"吗？此操作会从所有会话中移除该标签。`,
    filter: '筛选:',
    clearFilter: '清除筛选',
  },

  // 预览弹窗
  preview: {
    noContent: '此记录没有转录内容',
    totalCharacters: '共',
    exportTxt: '导出 TXT',
  },

  // 源选择器
  sourcePicker: {
    title: '选择要捕获的内容',
    subtitle: '选择一个屏幕或窗口进行音频捕获',
    refresh: '刷新列表',
    loading: '正在获取可用的屏幕和窗口...',
    screens: '屏幕',
    windows: '窗口',
    noSources: '未找到可用的屏幕或窗口',
    captureHint: '选择后将捕获该屏幕/窗口的系统音频',
    startCapture: '开始捕获',
    loadFailed: '加载桌面源失败:',
    selectFailed: '选择源失败',
  },

  // API 相关提示
  api: {
    needConfig: '需要配置 ASR 服务',
    needConfigDesc: '请点击右上角的"配置 API"按钮，选择一个语音识别服务提供商并输入相应的 API 密钥以开始使用。',
  },

  // 标题栏
  titleBar: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭',
  },

  // 会话默认标题
  session: {
    defaultTitle: (time: string) => `转录 ${time}`,
  },

  // 自动更新
  update: {
    checking: '正在检查更新...',
    available: '发现新版本',
    newVersion: '新版本',
    readyToDownload: '可供下载',
    downloadNow: '立即下载',
    upToDate: '已是最新版本',
    downloading: '正在下载更新...',
    downloaded: '更新已下载完成',
    readyToInstall: '版本',
    installPrompt: '已准备就绪，点击安装',
    installNow: '立即安装并重启',
    error: '更新失败',
    retry: '重试',
    checkForUpdates: '检查更新',
  },

  // 实时字幕
  caption: {
    title: '实时字幕',
    showCaption: '显示字幕',
    hideCaption: '隐藏字幕',
    enable: '开启实时字幕',
    disable: '关闭实时字幕',
    adjustPosition: '调整位置',
    lockPosition: '锁定位置',
    resetPosition: '重置位置',
    settings: '字幕设置',
    styleSettings: '样式设置',
    fontSize: '字体大小',
    fontFamily: '字体',
    textColor: '文字颜色',
    backgroundColor: '背景颜色',
    textShadow: '文字阴影',
    maxLines: '最大行数',
    width: '字幕宽度',
    preview: '预览效果',
    dragHint: '拖拽调整字幕位置',
    lockHint: '字幕位置已锁定',
  },
}

export type Translations = typeof zh
