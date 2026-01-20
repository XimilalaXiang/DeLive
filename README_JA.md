# DeLive 🎙️

**[English](./README.md) | [简体中文](./README_ZH.md) | [繁體中文](./README_TW.md) | 日本語**

[![バージョン](https://img.shields.io/github/v/release/XimilalaXiang/DeLive?label=バージョン&color=blue)](https://github.com/XimilalaXiang/DeLive/releases)
[![ライセンス](https://img.shields.io/github/license/XimilalaXiang/DeLive?label=ライセンス&color=green)](https://github.com/XimilalaXiang/DeLive/blob/main/LICENSE)
[![プラットフォーム](https://img.shields.io/badge/プラットフォーム-Windows-0078D6?logo=windows)](https://github.com/XimilalaXiang/DeLive/releases)
[![ダウンロード](https://img.shields.io/github/downloads/XimilalaXiang/DeLive/total?label=ダウンロード&color=orange)](https://github.com/XimilalaXiang/DeLive/releases)
[![Stars](https://img.shields.io/github/stars/XimilalaXiang/DeLive?style=social)](https://github.com/XimilalaXiang/DeLive)

**Windows デスクトップ音声リアルタイム文字起こしシステム** - マルチASRプロバイダー対応

パソコンで再生されている音声（ブラウザ動画、オンライン会議、ポッドキャストなど）をキャプチャし、リアルタイムでテキストに変換します。

<img width="1506" height="975" alt="PixPin_2026-01-19_22-26-21" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />

## ✨ 機能

### 🎯 コア機能
- **リアルタイム文字起こし** - システム音声をキャプチャし、即座にテキストに変換
- **🆕 リアルタイム画面字幕** - フローティング字幕ウィンドウで、どの画面でもライブ文字起こしを表示
- **マルチプロバイダー対応** - Soniox、火山エンジンなど複数のASRサービスに対応
- **多言語対応** - 中国語、英語、日本語など60以上の言語をサポート

### 📝 字幕機能（v1.0.3で追加）
- **フローティング字幕** - 常に最前面に表示される透明ウィンドウでリアルタイム文字起こしを表示
- **カスタマイズ可能なスタイル** - フォントサイズ、フォントファミリー、テキスト色、背景色を調整
- **テキストシャドウ** - 読みやすさを向上させるオプションのテキストシャドウ
- **ドラッグで移動** - ホバーでロックボタンを表示、ロック解除でドラッグして位置を調整
- **自動改行** - ウィンドウ幅に基づいたインテリジェントな改行
- **最大行数制御** - 最大表示行数（1-5行）を設定可能

### 📤 エクスポートと管理
- **履歴記録** - 日付/時間でグループ化、カスタムタイトルとタグをサポート
- **TXTにエクスポート** - ワンクリックで文字起こしをテキストファイルにエクスポート
- **🆕 SRTにエクスポート** - タイムスタンプ付きのSRT字幕ファイルとしてエクスポート
- **データバックアップ** - インポート/エクスポートで簡単な移行

### 🎨 ユーザーエクスペリエンス
- **ダーク/ライトテーマ** - テーマ切り替えで目の保護
- **モダンなUI** - フレームレスウィンドウ、カスタムタイトルバー
- **自動起動** - ログイン時の自動起動、トレイへの最小化をサポート
- **インターフェース言語** - 中国語と英語のインターフェースをサポート
- **自動更新** - GitHub Releasesからの自動チェックとダウンロード更新

## 🏗️ システムアーキテクチャ

```mermaid
graph TB
    subgraph "ユーザーインターフェース層"
        UI[React フロントエンド]
        EC[Electron コンテナ]
        CW[字幕ウィンドウ<br/>フローティングオーバーレイ]
    end
    
    subgraph "音声処理層"
        AC[音声キャプチャ<br/>getDisplayMedia]
        AP[音声プロセッサ<br/>AudioProcessor]
        MR[MediaRecorder]
    end
    
    subgraph "ASR抽象化層"
        PR[Provider Registry]
        BP[BaseASRProvider]
        
        subgraph "サービスプロバイダー"
            SP[Soniox Provider]
            VP[Volc Provider]
            MP[その他のプロバイダー...]
        end
    end
    
    subgraph "バックエンドサービス層"
        PS[プロキシサーバー<br/>Express + WS]
        VC[火山エンジンプロキシ<br/>volcProxy]
    end
    
    subgraph "外部ASRサービス"
        SONIOX[Soniox API<br/>WebSocket]
        VOLC[火山エンジン API<br/>WebSocket]
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
    
    SP -->|直接接続| SONIOX
    VP --> PS
    PS --> VC
    VC -->|ヘッダー付き| VOLC
    
    BP -->|文字起こし| CW
    
    style UI fill:#61dafb,color:#000
    style EC fill:#47848f,color:#fff
    style CW fill:#f472b6,color:#000
    style PR fill:#f59e0b,color:#000
    style PS fill:#10b981,color:#fff
    style SONIOX fill:#6366f1,color:#fff
    style VOLC fill:#ef4444,color:#fff
```

### アーキテクチャ概要

| レイヤー | コンポーネント | 説明 |
|----------|--------------|------|
| **ユーザーインターフェース** | React + Electron | モダンなデスクトップアプリケーションインターフェース |
| **字幕ウィンドウ** | 透明 BrowserWindow | カスタマイズ可能なスタイルのフローティング字幕オーバーレイ |
| **音声処理** | AudioProcessor / MediaRecorder | ASRサービスの要件に基づいて音声フォーマットを処理 |
| **ASR抽象化** | Provider Registry | 統一されたASRサービスインターフェース、動的なプロバイダー切り替えをサポート |
| **バックエンドサービス** | Express + WebSocket | カスタムヘッダーが必要なサービス用のプロキシ |
| **外部サービス** | Soniox / 火山エンジン | 実際の音声認識クラウドサービス |

## 🔌 対応ASRサービス

| プロバイダー | ステータス | 特徴 |
|-------------|----------|------|
| **Soniox** | ✅ 対応 | 高精度、多言語、直接WebSocket接続 |
| **火山エンジン** | ✅ 対応 | 中国語最適化、プロキシ経由接続 |
| *その他のプロバイダー* | 🔜 計画中 | 拡張可能なアーキテクチャ、新しいプロバイダーの追加が容易 |

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- ASRサービスAPIキー（いずれかを選択）:
  - [Soniox APIキー](https://console.soniox.com)
  - [火山エンジン APP IDとAccess Token](https://console.volcengine.com/speech/app)

### インストール

```bash
# プロジェクトをクローン
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive

# すべての依存関係をインストール
npm run install:all
```

### 開発モード

```bash
# バックエンドサーバーを起動（火山エンジン使用時に必要）
cd server && npm run dev

# 別のターミナルでフロントエンド + Electronを起動
npm run dev
```

### ビルド

```bash
# Windowsアプリケーションをビルド
npm run dist:win
```

ビルドされたファイルは `release/` ディレクトリにあります：
- `DeLive-x.x.x-x64.exe` - インストーラー
- `DeLive-x.x.x-portable.exe` - ポータブル版

## 📖 使い方

### 基本的な文字起こし
1. **プロバイダーを選択** - 設定をクリックしてASRサービスプロバイダーを選択
2. **APIキーを設定** - 対応するプロバイダーのAPIキーを入力
3. **設定をテスト** - 「設定をテスト」をクリックして設定を確認
4. **録音を開始** - 「録音開始」ボタンをクリック
5. **音声ソースを選択** - 共有する画面/ウィンドウを選択（「音声を共有」にチェック）
6. **リアルタイム文字起こし** - システムが自動的に音声をキャプチャして結果を表示
7. **録音を停止** - 「録音停止」をクリック、文字起こしは履歴に自動保存

### リアルタイム画面字幕（新機能）
1. **字幕を有効化** - 設定で「字幕を表示」ボタンをクリック
2. **スタイルをカスタマイズ** - 設定アイコンをクリックしてフォント、色、背景などを調整
3. **字幕を移動** - 字幕ウィンドウにホバーし、ロックアイコンをクリックしてロック解除、ドラッグして位置を調整
4. **位置をロック** - ロックアイコンを再度クリックして字幕を固定
5. **位置をリセット** - 「位置をリセット」ボタンをクリックしてデフォルト位置に戻す

### エクスポートオプション
- **TXTにエクスポート** - エクスポートボタンをクリックしてTXTフォーマットを選択
- **SRTにエクスポート** - エクスポートボタンをクリックしてSRTフォーマットを選択して字幕ファイルとしてエクスポート

## 📁 プロジェクト構造

```
DeLive/
├── electron/              # Electronメインプロセス
│   ├── main.ts               # メインプロセスエントリ
│   └── preload.ts            # プリロードスクリプト
├── frontend/              # Reactフロントエンド
│   ├── src/
│   │   ├── components/       # UIコンポーネント
│   │   │   ├── CaptionOverlay.tsx  # 字幕ウィンドウコンポーネント
│   │   │   ├── CaptionControls.tsx # 字幕設定コントロール
│   │   │   └── ...
│   │   ├── hooks/            # カスタムフック
│   │   ├── providers/        # ASRプロバイダー実装
│   │   │   ├── base.ts           # 基底クラス
│   │   │   ├── registry.ts       # プロバイダーレジストリ
│   │   │   └── implementations/  # プロバイダー実装
│   │   ├── stores/           # Zustand状態管理
│   │   ├── types/            # TypeScript型定義
│   │   │   └── asr/              # ASR関連の型定義
│   │   ├── utils/            # ユーティリティ関数
│   │   │   └── audioProcessor.ts # 音声プロセッサ
│   │   └── i18n/             # 国際化
│   └── ...
├── server/                # バックエンドプロキシサービス
│   └── src/
│       ├── index.ts          # Expressサーバー
│       └── volcProxy.ts      # 火山エンジンWebSocketプロキシ
├── build/                 # アプリアイコンリソース
├── scripts/               # ビルドスクリプト
└── package.json
```

## 🔧 技術スタック

| レイヤー | 技術 |
|----------|------|
| デスクトップフレームワーク | Electron 40 |
| フロントエンド | React 18 + TypeScript + Vite |
| スタイリング | Tailwind CSS |
| 状態管理 | Zustand |
| バックエンド | Express + ws |
| ASRエンジン | Soniox V3 / 火山エンジン |
| バンドラー | electron-builder |

## ⌨️ キーボードショートカット

| ショートカット | 機能 |
|--------------|------|
| `Ctrl+Shift+D` | メインウィンドウの表示/非表示 |

## 🔧 新しいASRプロバイダーの追加

DeLiveは拡張可能なプロバイダーアーキテクチャを使用しています。新しいプロバイダーを追加するには：

1. `frontend/src/providers/implementations/` に新しいProviderクラスを作成
2. `BaseASRProvider` を継承し、必要なメソッドを実装
3. `registry.ts` に新しいプロバイダーを登録
4. サービスがカスタムヘッダーを必要とする場合、`server/src/` にプロキシを追加

詳細なガイダンスについては、既存の実装（`SonioxProvider.ts` と `VolcProvider.ts`）を参照してください。

## ⚠️ 注意事項

1. **システム要件** - Windows 10/11 64ビット
2. **APIクォータ** - 各プロバイダーのAPI使用制限に注意
3. **火山エンジン** - バックエンドサーバーの起動が必要（`cd server && npm run dev`）
4. **トレイ動作** - 閉じるボタンをクリックするとトレイに最小化、トレイアイコンを右クリックして「終了」を選択で完全に閉じる
5. **字幕ウィンドウ** - 字幕ウィンドウは常に最前面に表示され、ロック時はマウスが透過

## 📄 ライセンス

Apache License 2.0

```
Apache 2.0 ライセンス - 著作権表示を保持すれば自由に使用、変更、配布可能
```

## 🙏 謝辞

- [Soniox](https://soniox.com) - 強力な音声認識API
- [火山エンジン](https://www.volcengine.com) - 中国語最適化音声認識サービス
- [BiBi-Keyboard](https://github.com/BryceWG/BiBi-Keyboard) - マルチプロバイダーアーキテクチャの参考
- [Electron](https://www.electronjs.org/) - クロスプラットフォームデスクトップアプリケーションフレームワーク
- [React](https://react.dev/) - ユーザーインターフェースライブラリ
- [Tailwind CSS](https://tailwindcss.com/) - CSSフレームワーク

---

Made with ❤️ by [XimilalaXiang](https://github.com/XimilalaXiang)
