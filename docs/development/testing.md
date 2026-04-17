# Testing

## Framework

DeLive uses **Vitest** for frontend testing with the following configuration:

- **Environment:** `node` (not jsdom — no DOM APIs in tests)
- **Globals:** `true` (no need to import `describe`, `it`, `expect`)
- **Include pattern:** `src/**/*.test.ts`
- **Alias:** `@` → `frontend/src`

## Running Tests

```bash
npm run test:frontend
```

Or from the frontend directory:

```bash
cd frontend && npx vitest run
```

For watch mode during development:

```bash
cd frontend && npx vitest
```

## Test Coverage

Current suite: **~200 tests across 23 files**.

### What's Tested

| Area | Files | Coverage |
|------|-------|----------|
| Session schema & normalization | `sessionSchema.test.ts` | Schema upgrades, field normalization |
| Session metadata | `sessionMetadata.test.ts` | Title generation, time formatting |
| Session lifecycle | `sessionLifecycle.test.ts` | Draft creation, source meta |
| Session repository | `sessionRepository.test.ts` | Cache operations, persistence |
| Session snapshot | `sessionSnapshot.test.ts` | Content detection, snapshot building |
| Transcript stabilizer | `transcriptStabilizer.test.ts` | Stable prefix detection |
| Windowed transcript | `windowedTranscript.test.ts` | Overlap handling, text merging |
| Transcript state | `transcriptState.test.ts` | Event application |
| Storage utilities | `storage.test.ts`, `backupStorage.test.ts` | ID generation, backup normalization |
| Provider config | `providerConfig.test.ts` | Config building, validation |
| Provider base class | `providers/__tests__/base.test.ts` | State machine, event emitter |
| Windowed batch provider | `providers/__tests__/windowedBatch.test.ts` | Rolling buffer, scheduling, stabilization |
| ASR types | `types/asr/common.test.ts` | Type guards, capability checks |
| Subtitle export | `subtitleExport.test.ts` | SRT/VTT generation |
| Caption line wrap | `captionLineWrap.test.ts` | Text wrapping logic |
| AI post-process | `aiPostProcess.test.ts` | Response parsing |
| Rolling buffer | `rollingAudioBuffer.test.ts` | Buffer management |
| API IPC responder | `useApiIpcResponder.test.ts` | Data transformation |

### What's Not Tested

- **React components** — no `.test.tsx` files (node environment, no jsdom)
- **Electron main process** — not under Vitest
- **MCP server** — separate package, not in CI
- **Integration tests** — no end-to-end API testing

## Writing Tests

Tests follow the pattern:

```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../yourModule'

describe('yourFunction', () => {
  it('should handle normal case', () => {
    expect(yourFunction('input')).toBe('expected')
  })

  it('should handle edge case', () => {
    expect(yourFunction('')).toBeNull()
  })
})
```

## CI Integration

Tests run as part of `npm run check` in both the **CI pipeline** (on push/PR) and the **release pipeline** (before building).
