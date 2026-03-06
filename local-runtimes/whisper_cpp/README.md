`whisper.cpp` support in DeLive has two asset locations:

1. **Build-time bundled asset**
   - Repository path: `local-runtimes/whisper_cpp/whisper-server(.exe)`
   - If present during packaging, it is copied into the final app resources.

2. **Runtime-managed assets**
   - Stored under Electron `userData/local-runtimes/whisper_cpp/`
   - DeLive can import or download binaries and models here from the setup UI.
   - Managed model files are stored under `models/`.

Expected canonical binary names:

- Windows: `whisper-server.exe`
- macOS / Linux: `whisper-server`

Build helpers:

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
npm run stage:whisper-runtime -- --binary C:\path\to\whisper-server.exe --target win32
```

Runtime notes:

- The provider launches `whisper-server` through Electron IPC.
- Model files can be `.bin` or `.gguf`.
- If no bundled binary is available, users can still import an existing binary or download one from the in-app setup guide.
