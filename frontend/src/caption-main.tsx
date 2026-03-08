/**
 * 字幕窗口入口文件
 * 这是一个独立于主应用的渲染进程入口
 */

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { CaptionOverlay } from './components/CaptionOverlay'
// 使用专门的字幕样式，确保透明背景
import './caption.css'

ReactDOM.createRoot(document.getElementById('caption-root')!).render(
  <StrictMode>
    <CaptionOverlay />
  </StrictMode>,
)
