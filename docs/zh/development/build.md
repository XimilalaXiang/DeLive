# 构建与发布

## 构建流程

```bash
npm run build
```

运行三个步骤：
1. **`generate-icons`** — 将 `frontend/public/favicon.svg` 转换为 PNG、ICO 和 ICNS
2. **`build:client`** — TypeScript 检查 + React 前端 Vite 生产构建
3. **`build:electron`** — Electron 主进程 TypeScript 编译

## 平台构建

```bash
npm run dist:win     # Windows (.exe + 便携版)
npm run dist:mac     # macOS (.dmg，x64 和 arm64)
npm run dist:linux   # Linux (.AppImage + .deb)
npm run dist:all     # 所有平台
```

产物写入 `release/`。

### Electron Builder 配置

`electron-builder` 配置在根 `package.json` 的 `"build"` 键下：

| 设置 | 值 |
|------|---|
| App ID | `com.delive.app` |
| 产品名称 | `DeLive` |
| 输出 | `release/` |
| Windows | NSIS 安装包 + 便携版，x64 |
| macOS | DMG + ZIP，x64 + arm64 |
| Linux | AppImage + deb，x64 |
| 发布 | GitHub（`XimilalaXiang/DeLive`） |

### whisper.cpp Runtime（可选）

在构建中打包 whisper.cpp 二进制文件：

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
```

如果构建时 `local-runtimes/whisper_cpp/whisper-server` 存在，`electron-builder` 将其打包为额外资源。

## CI/CD 管线

### 持续集成（`.github/workflows/ci.yml`）

每次 push（标签除外）和 PR 时运行：

1. Ubuntu runner，Node 20
2. `npm ci` 安装根目录、frontend 和 server
3. `npm run check`（lint + 测试 + 构建）

### 发布（`.github/workflows/release.yml`）

推送匹配 `v*` 的标签时触发：

**阶段 1：质量检查**（Ubuntu）
- Lint、测试和验证构建

**阶段 2：构建**（3 平台矩阵）
- Windows、macOS、Linux runner
- 完整构建 + `electron-builder --publish never`
- 上传产物

**阶段 3：发布**（Ubuntu）
- 下载所有平台产物
- 从 `CHANGELOG.md` 生成发布说明
- 创建包含所有平台文件的 GitHub Release

## 创建发布

1. 更新 `package.json` 中的 `version`
2. 更新 `CHANGELOG.md` 的新版本条目
3. 提交并推送
4. 创建并推送标签：

```bash
git tag v1.8.0
git push origin v1.8.0
```

发布管线将自动构建所有平台并创建 GitHub Release。

## 辅助脚本

| 脚本 | 用途 |
|------|------|
| `scripts/generate-icons.mjs` | SVG → PNG（多尺寸）、ICO、ICNS、Linux 图标目录 |
| `scripts/fetch-whisper-runtime.mjs` | 从 GitHub releases 下载 whisper.cpp 二进制 |
| `scripts/stage-whisper-runtime.mjs` | 将本地二进制复制到打包目录 |
| `scripts/generate-release-notes.mjs` | 解析 CHANGELOG.md 生成双语发布说明 |
