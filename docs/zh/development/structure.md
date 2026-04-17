# 项目结构

```
DeLive/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 应用入口、窗口创建、IPC 注册
│   ├── mainWindow.ts            # 主窗口配置和安全
│   ├── captionWindow.ts         # 悬浮字幕叠层
│   ├── tray.ts                  # 系统托盘
│   ├── shortcuts.ts             # 全局快捷键
│   ├── desktopSource.ts         # 屏幕/窗口源选择器
│   ├── autoUpdater.ts           # 自动更新生命周期
│   ├── ipcSecurity.ts           # 可信窗口验证、CSP、路径白名单
│   ├── appIpc.ts                # 应用生命周期 IPC 处理器
│   ├── captionIpc.ts            # 字幕窗口 IPC
│   ├── safeStorageIpc.ts        # 加密密钥存储
│   ├── updaterIpc.ts            # 更新 IPC
│   ├── diagnosticsIpc.ts        # 诊断导出
│   ├── apiIpc.ts                # Open API 数据桥接（主进程 ↔ 渲染进程）
│   ├── apiServer.ts             # REST API + WebSocket 服务器
│   ├── apiBroadcast.ts          # WebSocket 客户端管理和广播
│   ├── volcProxy.ts             # HTTP 服务器 + 火山引擎 WebSocket 代理
│   ├── localRuntime.ts          # whisper.cpp 进程管理
│   ├── localRuntimeFiles.ts     # 二进制/模型下载和导入
│   ├── localRuntimeIpc.ts       # Runtime 管理 IPC
│   └── preload.ts               # contextBridge API 暴露
│
├── frontend/                    # React 渲染应用
│   ├── src/
│   │   ├── App.tsx              # 主 Shell、视图路由、全局 hooks
│   │   ├── components/          # UI 组件
│   │   ├── hooks/               # 自定义 React hooks
│   │   ├── providers/           # ASR Provider 实现
│   │   ├── services/            # 业务逻辑服务
│   │   ├── stores/              # Zustand 状态管理
│   │   ├── utils/               # 工具和存储
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── i18n/                # 国际化
│   │   └── themes.ts            # 5 种颜色主题
│   ├── vite.config.ts           # Vite 构建配置
│   ├── vitest.config.ts         # 测试配置
│   ├── tailwind.config.js       # Tailwind 语义令牌
│   └── eslint.config.js         # ESLint flat 配置
│
├── shared/                      # 主进程和渲染进程共享
│   ├── electronApi.ts           # ElectronAPI 接口 + 数据类型
│   └── volcProxyCore.ts         # 火山引擎代理协议
│
├── server/                      # 独立代理（仅调试）
├── mcp/                         # AI Agent 用 MCP 服务器
├── skills/                      # Agent Skill 定义
├── scripts/                     # 构建和发布辅助脚本
├── docs/                        # VitePress 文档（本站）
├── .github/workflows/           # CI 和发布管线
└── package.json                 # 根 package（含 electron-builder 配置）
```
