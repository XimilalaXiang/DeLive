This directory is reserved for local ASR runtimes that may be bundled into packaged builds.

Current runtime layout:

- `local-runtimes/whisper_cpp/whisper-server(.exe)`

Relevant behavior:

- If `whisper-server(.exe)` exists here at build time, `electron-builder` copies it into app resources.
- At runtime, DeLive can still import or download binaries and models into the user data directory.
- User-managed runtime assets are stored separately under the Electron `userData` path, not inside this repository checkout.

Useful commands:

```bash
npm run fetch:whisper-runtime -- --target win32
npm run stage:whisper-runtime -- --binary /path/to/whisper-server --target linux
```

See [`local-runtimes/whisper_cpp/README.md`](./whisper_cpp/README.md) for the `whisper.cpp`-specific notes.
