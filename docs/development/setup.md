# Dev Setup

## Prerequisites

- **Node.js** 18+ (CI uses Node 20)
- **npm** (included with Node.js)
- **Git**

## Installation

```bash
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive
npm run install:all
```

`install:all` runs `npm install` in three directories: root, `frontend/`, and `server/`.

::: info
The `mcp/` directory has its own `package.json` but is **not** included in `install:all`. Install it separately if needed:
```bash
cd mcp && npm install
```
:::

## Development

```bash
npm run dev
```

This starts:
1. **Vite dev server** on port 5173 (hot reload for the React frontend)
2. **Electron** main process (with the Volcengine proxy on port 23456)

The `dev` script uses `concurrently` + `wait-on` to ensure Vite is ready before launching Electron.

### Standalone Proxy Debugging

```bash
npm run dev:server
```

Starts only the standalone Volcengine proxy from `server/src/index.ts`. Useful for debugging the proxy independently.

## Quality Checks

```bash
npm run check
```

Runs three steps sequentially:
1. `lint:frontend` — ESLint on `frontend/src/**/*.{ts,tsx}`
2. `test:frontend` — Vitest test suite
3. `build` — Full production build (icons + frontend + electron TypeScript)

### Individual Commands

```bash
npm run lint:frontend    # ESLint only
npm run test:frontend    # Vitest only
npm run build            # Full build only
```

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `NODE_ENV` | Main process | `development` enables DevTools and relaxed CSP |
| Port 5173 | Vite dev server | Frontend hot reload |
| Port 23456 | Electron main | HTTP server (Volc proxy + API) |
