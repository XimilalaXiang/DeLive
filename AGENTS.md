# AGENTS.md

## Cursor Cloud specific instructions

**DeLive** is an Electron desktop app for real-time speech-to-text transcription via system audio capture. It is a single product (not a monorepo) with three `package.json` files: root, `frontend/`, and `server/`.

### Key commands

See `package.json` scripts for the full list. Most important:

| Action | Command |
|---|---|
| Install all deps | `npm run install:all` |
| Dev (Vite + Electron) | `npm run dev` |
| Build frontend | `npm run build:client` |
| Build Electron TS | `npm run build:electron` |
| Lint (frontend) | `cd frontend && npm run lint` |
| Standalone proxy (optional) | `npm run dev:server` |

### Non-obvious caveats

- **Electron requires `--no-sandbox`** in the cloud VM container environment. When launching Electron manually, use: `npx cross-env NODE_ENV=development npx electron . --no-sandbox`
- **`npm run dev` will not work as-is** in the cloud VM because the `dev:electron` script does not pass `--no-sandbox`. To run the full dev flow, either start Vite and Electron separately (as above) or modify the electron launch args.
- **D-Bus errors** in the console (e.g. "Failed to connect to the bus") are harmless noise from the headless container and do not affect app functionality.
- **ESLint config is missing** from the repo. The `frontend/package.json` has a `lint` script (`eslint .`) but no `eslint.config.js` file exists, so `npm run lint` in `frontend/` will fail. This is a pre-existing repo issue, not an environment problem.
- **No automated tests** exist in the repo. There are no test scripts, test files, or test frameworks configured.
- **No git hooks** are configured (no Husky, lint-staged, or pre-commit).
- The embedded Volcengine WebSocket proxy starts automatically on port **3001** when Electron launches.
- The Vite dev server runs on port **5173**.
- Persistence is via `localStorage` inside Electron's renderer (no database).
