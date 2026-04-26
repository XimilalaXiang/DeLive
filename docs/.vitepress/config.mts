import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'DeLive',
    description: 'System Audio Capture · Multi-Provider ASR · Local-First AI Review Workspace',
    base: '/',
    head: [
      ['link', { rel: 'icon', href: '/logo.svg' }],
      ['meta', { property: 'og:title', content: 'DeLive — Desktop Transcription Workspace' }],
      ['meta', { property: 'og:description', content: 'Capture system audio, transcribe with ten ASR backends, and review with AI — summaries, chat, mind maps. All local-first.' }],
      ['meta', { property: 'og:image', content: 'https://raw.githubusercontent.com/XimilalaXiang/DeLive/main/assets/header.png' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['script', {}, `
        (function() {
          if (typeof window === 'undefined') return;
          var p = window.location.pathname;
          if (p.startsWith('/zh/')) return;
          if (sessionStorage.getItem('lang-detected')) return;
          sessionStorage.setItem('lang-detected', '1');
          var lang = navigator.language || navigator.userLanguage || '';
          if (lang.startsWith('zh')) {
            window.location.replace('/zh/' + p.slice(1));
          }
        })();
      `],
    ],
    locales: {
      root: {
        label: 'English',
        lang: 'en-US',
        themeConfig: {
          nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'API Reference', link: '/api/rest' },
            { text: 'Architecture', link: '/architecture/overview' },
            { text: 'Development', link: '/development/setup' },
            {
              text: 'v2.0.0',
              items: [
                { text: 'Changelog', link: 'https://github.com/XimilalaXiang/DeLive/blob/main/CHANGELOG.md' },
                { text: 'Download', link: 'https://github.com/XimilalaXiang/DeLive/releases/latest' },
              ],
            },
          ],
          sidebar: {
            '/guide/': [
              {
                text: 'Introduction',
                items: [
                  { text: 'What is DeLive?', link: '/guide/what-is-delive' },
                  { text: 'Getting Started', link: '/guide/getting-started' },
                ],
              },
              {
                text: 'Usage',
                items: [
                  { text: 'Recording', link: '/guide/recording' },
                  { text: 'ASR Providers', link: '/guide/providers' },
                  { text: 'Caption Overlay', link: '/guide/caption' },
                  { text: 'AI Review Desk', link: '/guide/review-desk' },
                  { text: 'Topics & Tags', link: '/guide/topics' },
                  { text: 'Settings', link: '/guide/settings' },
                ],
              },
            ],
            '/api/': [
              {
                text: 'Open API',
                items: [
                  { text: 'REST API', link: '/api/rest' },
                  { text: 'WebSocket', link: '/api/websocket' },
                  { text: 'Authentication', link: '/api/authentication' },
                ],
              },
              {
                text: 'AI Agent Integration',
                items: [
                  { text: 'MCP Server', link: '/api/mcp' },
                  { text: 'Agent Skill', link: '/api/agent-skill' },
                ],
              },
            ],
            '/architecture/': [
              {
                text: 'Architecture',
                items: [
                  { text: 'System Overview', link: '/architecture/overview' },
                  { text: 'Electron & IPC', link: '/architecture/electron-ipc' },
                  { text: 'Provider System', link: '/architecture/providers' },
                  { text: 'Data & Persistence', link: '/architecture/data' },
                  { text: 'Security Model', link: '/architecture/security' },
                ],
              },
            ],
            '/development/': [
              {
                text: 'Development',
                items: [
                  { text: 'Dev Setup', link: '/development/setup' },
                  { text: 'Project Structure', link: '/development/structure' },
                  { text: 'Extending Providers', link: '/development/extending-providers' },
                  { text: 'Testing', link: '/development/testing' },
                  { text: 'Build & Release', link: '/development/build' },
                ],
              },
            ],
          },
        },
      },
      zh: {
        label: '简体中文',
        lang: 'zh-CN',
        link: '/zh/',
        themeConfig: {
          nav: [
            { text: '指南', link: '/zh/guide/getting-started' },
            { text: 'API 参考', link: '/zh/api/rest' },
            { text: '架构', link: '/zh/architecture/overview' },
            { text: '开发', link: '/zh/development/setup' },
            {
              text: 'v2.0.0',
              items: [
                { text: '更新日志', link: 'https://github.com/XimilalaXiang/DeLive/blob/main/CHANGELOG.md' },
                { text: '下载', link: 'https://github.com/XimilalaXiang/DeLive/releases/latest' },
              ],
            },
          ],
          sidebar: {
            '/zh/guide/': [
              {
                text: '介绍',
                items: [
                  { text: '什么是 DeLive？', link: '/zh/guide/what-is-delive' },
                  { text: '快速开始', link: '/zh/guide/getting-started' },
                ],
              },
              {
                text: '使用',
                items: [
                  { text: '录制', link: '/zh/guide/recording' },
                  { text: 'ASR Provider', link: '/zh/guide/providers' },
                  { text: '悬浮字幕', link: '/zh/guide/caption' },
                  { text: 'AI 复盘工作台', link: '/zh/guide/review-desk' },
                  { text: '主题与标签', link: '/zh/guide/topics' },
                  { text: '设置', link: '/zh/guide/settings' },
                ],
              },
            ],
            '/zh/api/': [
              {
                text: '开放 API',
                items: [
                  { text: 'REST API', link: '/zh/api/rest' },
                  { text: 'WebSocket', link: '/zh/api/websocket' },
                  { text: '鉴权', link: '/zh/api/authentication' },
                ],
              },
              {
                text: 'AI Agent 集成',
                items: [
                  { text: 'MCP 服务器', link: '/zh/api/mcp' },
                  { text: 'Agent Skill', link: '/zh/api/agent-skill' },
                ],
              },
            ],
            '/zh/architecture/': [
              {
                text: '架构',
                items: [
                  { text: '系统概览', link: '/zh/architecture/overview' },
                  { text: 'Electron 与 IPC', link: '/zh/architecture/electron-ipc' },
                  { text: 'Provider 系统', link: '/zh/architecture/providers' },
                  { text: '数据与持久化', link: '/zh/architecture/data' },
                  { text: '安全模型', link: '/zh/architecture/security' },
                ],
              },
            ],
            '/zh/development/': [
              {
                text: '开发',
                items: [
                  { text: '开发环境', link: '/zh/development/setup' },
                  { text: '项目结构', link: '/zh/development/structure' },
                  { text: '扩展 Provider', link: '/zh/development/extending-providers' },
                  { text: '测试', link: '/zh/development/testing' },
                  { text: '构建与发布', link: '/zh/development/build' },
                ],
              },
            ],
          },
        },
      },
    },
    themeConfig: {
      logo: '/logo.svg',
      socialLinks: [
        { icon: 'github', link: 'https://github.com/XimilalaXiang/DeLive' },
      ],
      footer: {
        message: 'Released under the Apache 2.0 License.',
        copyright: 'Copyright © 2024-present XimilalaXiang',
      },
      search: {
        provider: 'local',
      },
    },
  })
)
