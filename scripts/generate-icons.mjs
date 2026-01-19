/**
 * 图标生成脚本
 * 将 SVG 转换为 PNG 和 ICO 格式
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '../frontend/public/favicon.svg');
const BUILD_DIR = path.join(__dirname, '../build');

// 需要生成的 PNG 尺寸
const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('🎨 开始生成图标...\n');

  // 确保 build 目录存在
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
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
  }

  // 生成主 PNG 图标 (256x256，用于 electron-builder)
  const mainPngPath = path.join(BUILD_DIR, 'icon.png');
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(mainPngPath);
  console.log('✅ 生成主 PNG: icon.png (256x256)');

  // 生成 ICO 文件（包含多种尺寸）
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

  console.log('\n🎉 图标生成完成！');
  console.log('📁 输出目录:', BUILD_DIR);
  console.log('\n生成的文件:');
  console.log('  - icon.png (用于 electron-builder)');
  console.log('  - icon.ico (Windows 应用图标)');
  console.log('  - icon-{size}.png (各种尺寸的 PNG)');
}

generateIcons().catch(error => {
  console.error('❌ 生成图标时出错:', error);
  process.exit(1);
});
