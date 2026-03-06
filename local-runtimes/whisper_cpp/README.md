Expected bundled binary names for `local_whisper_cpp`:

- Windows: `whisper-server.exe`
- macOS / Linux: `whisper-server`

If these files are present under this directory during packaging, DeLive will include them as extra resources and try to resolve them automatically at runtime.

Build-time staging helper:

```bash
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
npm run stage:whisper-runtime -- --binary C:\path\to\whisper-server.exe --target win32
```

Fetch latest official release asset (currently built-in auto selection is implemented for Windows x64):

```bash
npm run fetch:whisper-runtime -- --target win32
```

For unsupported targets, pass an explicit asset URL:

```bash
npm run fetch:whisper-runtime -- --target linux --asset-url https://example.com/whisper-server-linux.zip
```
