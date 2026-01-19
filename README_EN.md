# DeLive 🎙️

**[中文](./README.md) | English**

**Windows Desktop Audio Real-time Transcription** - Powered by Soniox V3 ASR

Capture any audio playing on your computer (browser videos, online meetings, podcasts, etc.) and transcribe it to text in real-time.

<img width="1506" height="975" alt="PixPin_2026-01-19_22-26-21" src="https://github.com/user-attachments/assets/f0d26fe3-ae9c-4d24-8b5d-b12f2095acb7" />

## ✨ Features

- 🎯 **Real-time Transcription** - Capture system audio and convert to text instantly
- 🌍 **Multi-language Support** - Supports Chinese, English, and 60+ languages
- 📚 **History Records** - Grouped by date/time, with custom titles and tags
- 📤 **Export Function** - One-click export to TXT files
- 🎨 **Dark/Light Theme** - Theme switching to protect your eyes
- 🖥️ **Modern UI** - Frameless window with custom title bar
- 🚀 **Auto Start** - Optional auto-start at login, minimize to tray
- 💾 **Data Backup** - Import/export data for easy migration
- 🌐 **Interface Language** - Supports Chinese and English interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Soniox API Key ([Get it here](https://console.soniox.com))

### Installation

```bash
# Clone the project
git clone https://github.com/XimilalaXiang/DeLive.git
cd DeLive

# Install all dependencies
npm run install:all
```

### Development Mode

```bash
# Start development mode (Frontend + Electron)
npm run dev
```

### Build

```bash
# Build Windows application
npm run dist:win
```

Built files are located in the `release/` directory:
- `DeLive-x.x.x-x64.exe` - Installer
- `DeLive-x.x.x-portable.exe` - Portable version

## 📖 Usage

1. **Configure API Key** - Settings window will pop up on first use, enter your Soniox API key
2. **Start Recording** - Click the "Start Recording" button
3. **Select Audio Source** - Choose the screen/window to share in the popup
4. **Real-time Transcription** - The system will automatically capture audio and display transcription results
5. **Stop Recording** - Click "Stop Recording", transcription will be automatically saved to history

## 📁 Project Structure

```
DeLive/
├── electron/          # Electron main process
│   ├── main.ts           # Main process entry
│   └── preload.ts        # Preload script
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom Hooks
│   │   ├── stores/       # Zustand state management
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── ...
├── build/             # App icon resources
├── scripts/           # Build scripts
└── package.json
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 40 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| ASR Engine | Soniox V3 (stt-rt-v3) |
| Bundler | electron-builder |

## ⌨️ Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl+Shift+D` | Show/Hide main window |

## 📝 API Notes

### API Key

Your Soniox API key is stored locally in localStorage and is used directly to establish a connection with the Soniox WebSocket service. The key is only stored on your device and is never uploaded to any server.

### Audio Capture

Uses the browser's `getDisplayMedia` API to capture system audio, no need to install virtual audio devices. Make sure to check "Share audio" when selecting screen share.

## ⚠️ Notes

1. **System Requirements** - Windows 10/11 64-bit
2. **API Quota** - Be aware of Soniox API usage limits
3. **Tray Behavior** - Clicking the close button minimizes to tray, right-click the tray icon and select "Exit" to fully close

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Soniox](https://soniox.com) - Powerful speech recognition API
- [Electron](https://www.electronjs.org/) - Cross-platform desktop application framework
- [React](https://react.dev/) - User interface library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

Made with ❤️ by [XimilalaXiang](https://github.com/XimilalaXiang)
