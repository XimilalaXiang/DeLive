/**
 * electron-builder afterPack 钩子 — 修复 macOS arm64 代码签名
 *
 * 问题：在 Apple Silicon runner 上构建 arm64 应用时，macOS linker 会自动
 * 添加不完整的 ad-hoc 签名（有 CodeDirectory 但无资源封印），导致 Gatekeeper
 * 判定 .app "已损坏"。
 *
 * 修复：打包后用 codesign --force --deep --sign - 重签，使资源封印完整。
 *
 * 参考 Issue: https://github.com/XimilalaXiang/DeLive/issues/15
 */

import { execSync } from 'child_process';
import path from 'path';

export default async function afterPack(context) {
  if (process.platform !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`[fix-mac-signing] 正在重签: ${appPath}`);

  try {
    execSync(
      `codesign --force --deep --sign - "${appPath}"`,
      { stdio: 'inherit' },
    );

    const verify = execSync(
      `codesign --verify --deep --strict --verbose=2 "${appPath}" 2>&1`,
      { encoding: 'utf-8' },
    );
    console.log(`[fix-mac-signing] 验证通过: ${verify.trim() || 'valid on disk'}`);
  } catch (err) {
    console.error('[fix-mac-signing] 签名验证失败:', err.message);
    process.exit(1);
  }
}
