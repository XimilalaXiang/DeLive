# DeLive Provider Expansion TODO

Last updated: 2026-03-06
Owner: Codex + Xiang
Scope: ASR provider extensibility, local provider architecture, local model/runtime management

## Current Snapshot

- [x] Provider abstraction exists:
  - `frontend/src/types/asr/*`
  - `frontend/src/providers/*`
  - `frontend/src/hooks/useASR.ts`
- [x] Runtime pipeline is already capability-driven at the audio input level:
  - `audioInputMode = pcm16 | media-recorder`
- [x] Multi-provider persistence already exists:
  - `settings.currentVendor`
  - `settings.providerConfigs`
- [x] Backward compatibility for legacy Soniox config is still preserved.
- [x] `local_openai` provider already exists and is registered.
- [x] Local service probing / Ollama model pull guide already exists for the first local path.
- [x] Provider configuration UI is now largely metadata-driven for standard fields.
- [x] Provider config test logic has been extracted out of the main settings component.
- [ ] Local provider lifecycle is still thin:
  - no preload / ready-state / unload abstraction
  - no unified model install/import manager
- [ ] No bundled local ASR sidecar/runtime exists yet.
- [ ] No formal provider plugin/extension point exists for providers that need custom UI beyond standard fields.

## Stage 1. Runtime Decoupling

Status: Completed

- [x] `useASR` chooses audio pipeline from provider capability metadata.
- [x] Required config validation is generic via provider metadata.
- [x] Provider registry is the source of truth for available providers.
- [x] Existing Soniox + Volc behavior remains intact.

Acceptance:

- [x] Runtime pipeline is no longer tied to a simple `vendorId === 'volc'` split.
- [x] Soniox / Volc / Local OpenAI can all start through the same hook path.

## Stage 2. Configuration UI Metadata-Driven

Status: Completed in current pass

- [x] Provider selector uses generic configured-state checks.
- [x] `ApiKeyConfig` now uses a unified provider form state instead of one state bucket per vendor.
- [x] Standard provider fields render from `provider.configFields`.
- [x] Password visibility is handled per field key, not per vendor.
- [x] Provider config testing has been moved into a separate utility registry.
- [x] `local_openai` keeps a small provider-specific setup guide as an explicit UX extension.
- [ ] If future providers need complex custom widgets, add a formal extension mechanism instead of reintroducing inline vendor branches.

Acceptance:

- [x] Adding a provider with standard text/password/select/boolean fields no longer requires adding a new JSX branch in `ApiKeyConfig.tsx`.
- [x] Soniox / Volc / Local OpenAI config testing still works after the refactor.

## Stage 3. Local Provider Architecture Upgrade

Status: In progress

- [x] Split local provider strategy into two explicit tracks at the capability metadata level:
  - local service providers
  - bundled local runtime providers
- [x] Introduce a first `LocalRuntimeManager` registry for local service providers.
- [x] Introduce an initial bundled-runtime-oriented manager scaffold and Electron IPC surface.
- [x] Wire `local_openai` onto the new local service/runtime metadata path.
- [x] Add the first runtime-backed local provider path: `local_whisper_cpp`.
- [x] Add runtime-oriented setup UX:
  - bundled runtime status panel
  - file picker for model path / binary path
  - config test path for `local_whisper_cpp`
  - runtime model import
  - runtime model list + click-to-fill
  - runtime binary import to app-managed directory
  - runtime binary / model download by URL
  - official model presets + release/docs quick links
  - official latest release binary asset discovery
  - build-time official runtime fetch script
- [ ] Local service providers:
  - Ollama
  - OpenAI-compatible local HTTP servers
  - self-hosted ASR gateways
- [ ] Bundled local runtime providers:
  - whisper.cpp sidecar
  - faster-whisper sidecar
  - sherpa-onnx sidecar
- [x] Add capability metadata for local-management behavior, for example:
  - requires local service probe
  - supports model discovery
  - supports model install/pull
  - requires bundled runtime
  - supports preload
  - supports manual model import
- [ ] Move local-model concerns fully out of the provider transport implementation itself.
- [ ] Expand the current `LocalRuntimeManager` into a fuller `LocalModelManager` lifecycle.
- [x] Add the first real runtime-backed local provider on top of the bundled runtime scaffold.

Acceptance:

- [ ] A provider can declare whether it connects to an existing local HTTP service or to a bundled sidecar runtime.
- [ ] Local model/runtime lifecycle is no longer embedded ad hoc inside a single provider class.

## Stage 4. Borrow From Reference Projects

Status: Planned

- [ ] Borrow Vibe-style sidecar process management:
  - bundled binary
  - start/stop/status
  - model folder selection
  - GPU selection
  - optional local API endpoint exposure
- [ ] Borrow BiBi-Keyboard-style local model lifecycle:
  - download/import
  - preload
  - ready waiting
  - unload on config change
  - capability-based “configured / unconfigured” checks for local models
- [ ] Decide which reference pattern maps better to each target provider:
  - service-style local provider -> closer to current `local_openai`
  - true bundled local inference -> closer to `vibe`
  - rich local model lifecycle -> closer to `BiBi-Keyboard`

## Stage 5. First Bundled Local Runtime

Status: In progress

- [x] Pick the first bundled runtime target:
  - `whisper.cpp` is the most straightforward candidate
- [ ] Define packaging strategy:
  - binary location
  - model storage path
  - platform differences
- [x] Add packaging/resource layout scaffold for `local-runtimes/`.
- [x] Define DeLive-side transport:
  - local HTTP
  - local WebSocket
  - stdio bridge
- [x] Add basic runtime controls:
  - detect runtime
  - start runtime
  - stop runtime
  - show runtime status
- [ ] Add first-run onboarding:
  - choose/download/import model
  - explain CPU/GPU expectations

Acceptance:

- [ ] User can install or point to one bundled local model and transcribe without depending on an external Ollama/OpenAI-compatible service.

## Stage 6. Provider Test And Extension System

Status: Planned

- [ ] Replace the current internal test utility registry with a more formal provider extension API if needed.
- [ ] Allow a provider to optionally supply:
  - config test function
  - extra setup panel
  - docs link override
  - local setup actions
- [ ] Keep the default path simple for standard providers.

Acceptance:

- [ ] Most providers work from metadata only.
- [ ] Exceptional providers can extend UI/behavior without editing the core settings component.

## Verification

- [x] Frontend build passes: `cd frontend && npm run build`
- [ ] Smoke test in app UI:
  - select Soniox
  - select Volc
  - select Local OpenAI
  - save config
  - run test config
- [ ] Manual regression check:
  - provider switching
  - settings persistence
  - existing localStorage compatibility

## Immediate Next Actions

- [x] Design `LocalRuntimeManager` interface.
- [x] Add provider capability metadata for local runtime/model lifecycle.
- [x] Start Stage 3 implementation.
- [x] Add the first bundled runtime-oriented manager path.
- [x] Decide whether the first bundled runtime should be `whisper.cpp`.
