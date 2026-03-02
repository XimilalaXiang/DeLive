/**
 * 图标生成脚本
 * 将 SVG 转换为 PNG、ICO 和 ICNS 格式
 * 支持 Windows (.ico)、macOS (.icns) 和 Linux (icons/) 图标
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '../frontend/public/favicon.svg');
const BUILD_DIR = path.join(__dirname, '../build');
const ICONS_DIR = path.join(BUILD_DIR, 'icons');

// 需要生成的 PNG 尺寸
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('🎨 开始生成图标...\n');

  // 确保 build 目录存在
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // 确保 icons 目录存在 (Linux)
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // 读取 SVG 文件
  const svgBuffer = fs.readFileSync(SVG_PATH);
  console.log('✅ 已读取 SVG 文件:', SVG_PATH);

  // 生成各种尺寸的 PNG
  const pngPaths = [];
  for (const size of SIZES) {
    const outputPath = path.join(BUILD_DIR, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    pngPaths.push(outputPath);
    console.log(`✅ 生成 PNG: icon-${size}.png`);

    // 同时拷贝到 icons/ 目录 (Linux freedesktop 规范: {size}x{size}.png)
    const linuxIconPath = path.join(ICONS_DIR, `${size}x${size}.png`);
    fs.copyFileSync(outputPath, linuxIconPath);
  }
  console.log('✅ Linux 图标目录已生成: build/icons/');

  // 生成主 PNG 图标 (256x256，用于 electron-builder)
  const mainPngPath = path.join(BUILD_DIR, 'icon.png');
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(mainPngPath);
  console.log('✅ 生成主 PNG: icon.png (256x256)');

  // 生成 ICO 文件（包含多种尺寸）- Windows
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoPngPaths = icoSizes.map(size => path.join(BUILD_DIR, `icon-${size}.png`));

  try {
    const icoBuffer = await pngToIco(icoPngPaths);
    const icoPath = path.join(BUILD_DIR, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('✅ 生成 ICO: icon.ico (包含 16, 32, 48, 64, 128, 256 尺寸)');
  } catch (error) {
    console.error('❌ 生成 ICO 失败:', error.message);
    process.exit(1);
  }

  // 生成 ICNS 文件 - macOS
  await generateIcns(svgBuffer);

  console.log('\n🎉 图标生成完成！');
  console.log('📁 输出目录:', BUILD_DIR);
  console.log('\n生成的文件:');
  console.log('  - icon.png (用于 electron-builder)');
  console.log('  - icon.ico (Windows 应用图标)');
  if (process.platform === 'darwin') {
    console.log('  - icon.icns (macOS 应用图标)');
  }
  console.log('  - icon-{size}.png (各种尺寸的 PNG)');
  console.log('  - icons/{size}x{size}.png (Linux 图标)');
}

/**
 * 生成 macOS .icns 文件
 * 在 macOS 上使用 iconutil，其他平台跳过（CI 各平台只构建自己的目标）
 */
async function generateIcns(svgBuffer) {
  if (process.platform !== 'darwin') {
    console.log('⏭️ 跳过 ICNS 生成（非 macOS 平台，macOS 构建在 macOS CI 上使用 iconutil）');
    return;
  }

  const icnsPath = path.join(BUILD_DIR, 'icon.icns');

  try {
    const iconsetDir = path.join(BUILD_DIR, 'icon.iconset');
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    const iconsetSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' },
    ];

    for (const { size, name } of iconsetSizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsetDir, name));
    }

    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);

    fs.rmSync(iconsetDir, { recursive: true, force: true });

    console.log('✅ 生成 ICNS: icon.icns (使用 iconutil)');
  } catch (error) {
    console.warn('⚠️ iconutil 失败，使用 1024x1024 PNG 作为 ICNS fallback:', error.message);
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(icnsPath);
    console.log('✅ 生成 ICNS fallback: icon.icns (electron-builder 将自动处理)');
  }
}

generateIcons().catch(error => {
  console.error('❌ 生成图标时出错:', error);
  process.exit(1);
});
