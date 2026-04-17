# 开发环境

## 前置条件

- **Node.js** 18+（CI 使用 Node 20）
- **npm**（随 Node.js 附带）
- **Git**

## 安装

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
```

`install:all` 在三个目录中运行 `npm install`：根目录、`frontend/` 和 `server/`。

::: info
`mcp/` 目录有自己的 `package.json` 但 **不** 包含在 `install:all` 中。如需使用请单独安装：
```bash
cd mcp && npm install
```
:::

## 开发

```bash
npm run dev
```

启动：
1. **Vite 开发服务器** 端口 5173（React 前端热重载）
2. **Electron** 主进程（火山引擎代理在端口 23456）

`dev` 脚本使用 `concurrently` + `wait-on` 确保 Vite 就绪后再启动 Electron。

### 独立代理调试

```bash
npm run dev:server
```

仅启动 `server/src/index.ts` 的独立火山引擎代理。

## 质量检查

```bash
npm run check
```

顺序运行三个步骤：
1. `lint:frontend` — 前端 ESLint
2. `test:frontend` — Vitest 测试套件
3. `build` — 完整生产构建（图标 + 前端 + Electron TypeScript）

### 单独命令

```bash
npm run lint:frontend    # 仅 ESLint
npm run test:frontend    # 仅 Vitest
npm run build            # 仅完整构建
```

## 环境变量

| 变量 | 位置 | 用途 |
|------|------|------|
| `NODE_ENV` | 主进程 | `development` 启用 DevTools 和宽松 CSP |
| 端口 5173 | Vite 开发服务器 | 前端热重载 |
| 端口 23456 | Electron 主进程 | HTTP 服务器（火山引擎代理 + API） |
