# Build & Release

## Build Process

```bash
npm run build
```

This runs three steps:
1. **`generate-icons`** — converts `frontend/public/favicon.svg` into PNGs, ICO, and ICNS
2. **`build:client`** — TypeScript check + Vite production build of the React frontend
3. **`build:electron`** — TypeScript compile of the Electron main process

## Platform Builds

```bash
npm run dist:win     # Windows (.exe + portable)
npm run dist:mac     # macOS (.dmg for x64 and arm64)
npm run dist:linux   # Linux (.AppImage + .deb)
npm run dist:all     # All platforms
```

Artifacts are written to `release/`.

### Electron Builder Configuration

The `electron-builder` config lives in the root `package.json` under the `"build"` key:

| Setting | Value |
|---------|-------|
| App ID | `com.delive.app` |
| Product Name | `DeLive` |
| Output | `release/` |
| Windows | NSIS installer + portable, x64 |
| macOS | DMG + ZIP, x64 + arm64 |
| Linux | AppImage + deb, x64 |
| Publish | GitHub (`XimilalaXiang/DeLive`) |

### whisper.cpp Runtime (Optional)

To bundle a whisper.cpp binary in the build:

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
```

If `local-runtimes/whisper_cpp/whisper-server` exists at build time, `electron-builder` packages it as an extra resource.

## CI/CD Pipelines

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push (except tags) and every pull request:

1. Ubuntu runner, Node 20
2. `npm ci` for root, frontend, and server
3. `npm run check` (lint + test + build)

### Release (`.github/workflows/release.yml`)

Triggered by pushing a tag matching `v*`:

**Phase 1: Quality** (Ubuntu)
- Lint, test, and verify build

**Phase 2: Build** (3-platform matrix)
- Windows, macOS, Linux runners
- Full build + `electron-builder --publish never`
- Upload artifacts

**Phase 3: Release** (Ubuntu)
- Download all platform artifacts
- Generate release notes from `CHANGELOG.md`
- Create GitHub Release with all platform files

### Release Files

| Platform | Files |
|----------|-------|
| Windows | `.exe`, `.blockmap`, `latest.yml` |
| macOS | `.dmg`, `.zip`, `latest-mac.yml` |
| Linux | `.AppImage`, `.deb`, `latest-linux.yml` |

## Creating a Release

1. Update `version` in `package.json`
2. Update `CHANGELOG.md` with the new version entry
3. Commit and push
4. Create and push a tag:

```bash
git tag v1.8.0
git push origin v1.8.0
```

The release pipeline will automatically build all platforms and create a GitHub Release.

## Helper Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate-icons.mjs` | SVG → PNG (multiple sizes), ICO, ICNS, Linux icon directory |
| `scripts/fetch-whisper-runtime.mjs` | Download whisper.cpp binary from GitHub releases |
| `scripts/stage-whisper-runtime.mjs` | Copy local binary into packaging directory |
| `scripts/generate-release-notes.mjs` | Parse CHANGELOG.md and generate bilingual release notes |
