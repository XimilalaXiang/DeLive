# DeLive 🎙️

**[English](./README.md) | [简体中文](./README_ZH.md) | 繁體中文 | [日本語](./README_JA.md)**

[![版本](https://img.shields.io/github/v/release/XimilalaXiang/DeLive?label=版本&color=blue)](https://github.com/XimilalaXiang/DeLive/releases)
[![授權](https://img.shields.io/github/license/XimilalaXiang/DeLive?label=授權&color=green)](https://github.com/XimilalaXiang/DeLive/blob/main/LICENSE)
[![平台](https://img.shields.io/badge/平台-Windows-0078D6?logo=windows)](https://github.com/XimilalaXiang/DeLive/releases)
[![下載量](https://img.shields.io/github/downloads/XimilalaXiang/DeLive/total?label=下載量&color=orange)](https://github.com/XimilalaXiang/DeLive/releases)
[![Stars](https://img.shields.io/github/stars/XimilalaXiang/DeLive?style=social)](https://github.com/XimilalaXiang/DeLive)

**Windows 桌面音訊即時轉錄系統** - 支援多 ASR 服務提供商

擷取您的電腦正在播放的任何聲音（瀏覽器影片、線上會議、Podcast 等），即時轉錄為文字。

<img width="1506" height="975" alt="PixPin_2026-01-19_22-26-21" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />

## ✨ 功能特色

### 🎯 核心功能
- **即時轉錄** - 擷取系統音訊，即時轉換為文字
- **🆕 即時螢幕字幕** - 懸浮字幕視窗，在任何螢幕上顯示即時轉錄
- **多服務商支援** - 支援 Soniox、火山引擎等多個 ASR 服務提供商
- **多語言支援** - 支援中文、英文及 60+ 種語言

### 📝 字幕功能（v1.0.3 新增）
- **懸浮字幕** - 始終置頂的透明視窗，即時顯示轉錄內容
- **自訂樣式** - 調整字體大小、字體類型、文字顏色、背景顏色
- **文字陰影** - 可選文字陰影，提升可讀性
- **拖曳移動** - 滑鼠懸停顯示鎖定按鈕，解鎖後可拖曳調整位置
- **智慧換行** - 根據視窗寬度自動換行
- **行數控制** - 可設定最大顯示行數（1-5 行）

### 📤 匯出與管理
- **歷史記錄** - 按日期/時間分組，支援自訂標題和標籤
- **匯出為 TXT** - 一鍵匯出轉錄內容為文字檔案
- **🆕 匯出為 SRT** - 匯出帶時間戳記的 SRT 字幕檔案
- **資料備份** - 支援匯入/匯出資料，輕鬆遷移

### 🎨 使用者體驗
- **深色/淺色主題** - 支援主題切換，保護眼睛
- **現代化介面** - 無邊框視窗，自訂標題列
- **開機自啟動** - 可選開機自動啟動，最小化到系統匣
- **介面語言** - 支援中英文介面切換
- **自動更新** - 支援自動檢查和下載更新

## 🏗️ 系統架構

```mermaid
graph TB
    subgraph "使用者介面層"
        UI[React 前端]
        EC[Electron 容器]
        CW[字幕視窗<br/>懸浮疊加層]
    end
    
    subgraph "音訊處理層"
        AC[音訊擷取<br/>getDisplayMedia]
        AP[音訊處理器<br/>AudioProcessor]
        MR[MediaRecorder]
    end
    
    subgraph "ASR 抽象層"
        PR[Provider Registry]
        BP[BaseASRProvider]
        
        subgraph "服務提供商"
            SP[Soniox Provider]
            VP[Volc Provider]
            MP[更多提供商...]
        end
    end
    
    subgraph "後端服務層"
        PS[代理伺服器<br/>Express + WS]
        VC[火山引擎代理<br/>volcProxy]
    end
    
    subgraph "外部 ASR 服務"
        SONIOX[Soniox API<br/>WebSocket]
        VOLC[火山引擎 API<br/>WebSocket]
    end
    
    UI --> EC
    EC --> AC
    EC --> CW
    AC --> AP
    AC --> MR
    
    AP -->|PCM 16kHz| VP
    MR -->|WebM/Opus| SP
    
    PR --> BP
    BP --> SP
    BP --> VP
    BP --> MP
    
    SP -->|直連| SONIOX
    VP --> PS
    PS --> VC
    VC -->|帶 Headers| VOLC
    
    BP -->|轉錄內容| CW
    
    style UI fill:#61dafb,color:#000
    style EC fill:#47848f,color:#fff
    style CW fill:#f472b6,color:#000
    style PR fill:#f59e0b,color:#000
    style PS fill:#10b981,color:#fff
    style SONIOX fill:#6366f1,color:#fff
    style VOLC fill:#ef4444,color:#fff
```

### 架構說明

| 層級 | 元件 | 說明 |
|------|------|------|
| **使用者介面層** | React + Electron | 提供現代化的桌面應用程式介面 |
| **字幕視窗** | 透明 BrowserWindow | 可自訂樣式的懸浮字幕疊加層 |
| **音訊處理層** | AudioProcessor / MediaRecorder | 根據 ASR 服務要求處理音訊格式 |
| **ASR 抽象層** | Provider Registry | 統一的 ASR 服務介面，支援動態切換提供商 |
| **後端服務層** | Express + WebSocket | 為需要自訂 Headers 的服務提供代理 |
| **外部服務** | Soniox / 火山引擎 | 實際的語音辨識雲端服務 |

## 🔌 支援的 ASR 服務

| 服務商 | 狀態 | 特點 |
|--------|------|------|
| **Soniox** | ✅ 支援 | 高精度、多語言、直連 WebSocket |
| **火山引擎** | ✅ 支援 | 中文優化、透過代理連線 |
| *更多服務商* | 🔜 規劃中 | 可擴充架構，易於新增提供商 |

## 🚀 快速開始

### 前置需求

- Node.js 18+
- ASR 服務 API 金鑰（任選一個）:
  - [Soniox API 金鑰](https://console.soniox.com)
  - [火山引擎 APP ID 和 Access Token](https://console.volcengine.com/speech/app)

### 安裝

```bash
# 複製專案
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive

# 安裝所有依賴
npm run install:all
```

### 開發模式

```bash
# 啟動後端伺服器（火山引擎需要）
cd server && npm run dev

# 在另一個終端機啟動前端 + Electron
npm run dev
```

### 打包建置

```bash
# 打包 Windows 應用程式
npm run dist:win
```

打包後的檔案位於 `release/` 目錄：
- `DeLive-x.x.x-x64.exe` - 安裝程式
- `DeLive-x.x.x-portable.exe` - 可攜式版本

## 📖 使用步驟

### 基本轉錄
1. **選擇服務商** - 點擊設定，選擇您的 ASR 服務提供商
2. **設定 API 金鑰** - 輸入對應服務商的 API 金鑰
3. **測試設定** - 點擊「測試設定」驗證設定是否正確
4. **開始錄製** - 點擊「開始錄製」按鈕
5. **選擇音訊來源** - 在彈出的視窗中選擇要分享的螢幕/視窗（需勾選「分享音訊」）
6. **即時轉錄** - 系統將自動擷取音訊並顯示轉錄結果
7. **停止錄製** - 點擊「停止錄製」按鈕，轉錄內容將自動儲存到歷史記錄

### 即時螢幕字幕（新功能）
1. **啟用字幕** - 點擊設定中的「顯示字幕」按鈕
2. **自訂樣式** - 點擊設定圖示，調整字體、顏色、背景等
3. **移動字幕** - 滑鼠懸停在字幕上，點擊鎖定圖示解鎖，然後拖曳調整位置
4. **鎖定位置** - 再次點擊鎖定圖示，固定字幕位置
5. **重設位置** - 點擊「重設位置」按鈕，恢復預設位置

### 匯出選項
- **匯出為 TXT** - 點擊匯出按鈕，選擇 TXT 格式
- **匯出為 SRT** - 點擊匯出按鈕，選擇 SRT 格式匯出字幕檔案

## 📁 專案結構

```
DeLive/
├── electron/              # Electron 主程序
│   ├── main.ts               # 主程序進入點
│   └── preload.ts            # 預載入腳本
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/       # UI 元件
│   │   │   ├── CaptionOverlay.tsx  # 字幕視窗元件
│   │   │   ├── CaptionControls.tsx # 字幕設定控制項
│   │   │   └── ...
│   │   ├── hooks/            # 自訂 Hooks
│   │   ├── providers/        # ASR 服務提供商實作
│   │   │   ├── base.ts           # 基礎類別
│   │   │   ├── registry.ts       # 提供商註冊表
│   │   │   └── implementations/  # 各服務商實作
│   │   ├── stores/           # Zustand 狀態管理
│   │   ├── types/            # TypeScript 型別
│   │   │   └── asr/              # ASR 相關型別定義
│   │   ├── utils/            # 工具函式
│   │   │   └── audioProcessor.ts # 音訊處理器
│   │   └── i18n/             # 國際化
│   └── ...
├── server/                # 後端代理服務
│   └── src/
│       ├── index.ts          # Express 伺服器
│       └── volcProxy.ts      # 火山引擎 WebSocket 代理
├── build/                 # 應用程式圖示資源
├── scripts/               # 建置腳本
└── package.json
```

## 🔧 技術堆疊

| 層級 | 技術 |
|------|------|
| 桌面框架 | Electron 40 |
| 前端 | React 18 + TypeScript + Vite |
| 樣式 | Tailwind CSS |
| 狀態管理 | Zustand |
| 後端 | Express + ws |
| ASR 引擎 | Soniox V3 / 火山引擎 |
| 打包工具 | electron-builder |

## ⌨️ 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+Shift+D` | 顯示/隱藏主視窗 |

## 🔧 新增 ASR 服務商

DeLive 採用可擴充的提供商架構，新增服務商只需：

1. 在 `frontend/src/providers/implementations/` 建立新的 Provider 類別
2. 繼承 `BaseASRProvider` 並實作必要方法
3. 在 `registry.ts` 中註冊新提供商
4. 如果服務需要自訂 Headers，在 `server/src/` 新增相應代理

詳細指南請參考現有實作（如 `SonioxProvider.ts` 和 `VolcProvider.ts`）。

## ⚠️ 注意事項

1. **系統需求** - Windows 10/11 64位元
2. **API 配額** - 注意各服務商的 API 使用配額限制
3. **火山引擎** - 需要啟動後端伺服器（`cd server && npm run dev`）
4. **系統匣行為** - 點擊關閉按鈕會最小化到系統匣，右鍵系統匣圖示選擇「結束」完全關閉
5. **字幕視窗** - 字幕視窗始終置頂，鎖定時滑鼠可穿透

## 📄 授權條款

Apache License 2.0

```
Apache 2.0 授權 - 可自由使用、修改和分發，需保留版權聲明
```

## 🙏 致謝

- [Soniox](https://soniox.com) - 提供強大的語音辨識 API
- [火山引擎](https://www.volcengine.com) - 提供中文優化的語音辨識服務
- [BiBi-Keyboard](https://github.com/BryceWG/BiBi-Keyboard) - 多服務商架構參考
- [Electron](https://www.electronjs.org/) - 跨平台桌面應用程式框架
- [React](https://react.dev/) - 使用者介面函式庫
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---

Made with ❤️ by [XimilalaXiang](https://github.com/XimilalaXiang)
