# API / E2E Testing

## Status

- Current Status: `Pass`
- Last Updated: `2026-03-09`

## Stage 7 Goal

Prove that the real `AutoByteus/autobyteus-voice-runtime` release lane publishes the pinned lightweight Voice Input runtime assets and that the Electron-managed Voice Input flow can download, locally bootstrap, enable, and invoke those published assets using the app-owned codepath.

## Scenario Matrix

| Scenario ID | Acceptance Criteria | Proof Type | Status | Notes |
| --- | --- | --- | --- | --- |
| `S7-001` | `AC-017`, `AC-018` | GitHub release evidence | Passed | Release `v0.3.0` exists with four runtime bundles plus the manifest, and no model archives |
| `S7-002` | `AC-017`, `AC-019` | Real app-owned install/bootstrap smoke test | Passed | `Install` downloaded the live runtime bundle, prepared the local model under the extension root, and left Voice Input disabled until explicit enable |
| `S7-003` | `AC-007`, `AC-008`, `AC-010`, `AC-017`, `AC-019` | Real audio transcription smoke test | Passed | English speech, Chinese speech, and silence all behaved correctly against the live `v0.3.0` release |

## Commands Executed

```bash
node --test tests/*.test.mjs
python3 -m unittest tests/test_voice_input_worker.py
pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit
pnpm -C autobyteus-web exec vitest run electron/extensions/__tests__/managedExtensionService.spec.ts tests/integration/voice-input-extension.integration.test.ts electron/extensions/__tests__/extensionCatalog.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts
pnpm -C autobyteus-web test:voice-input-real-release
gh release view v0.3.0 --repo AutoByteus/autobyteus-voice-runtime --json tagName,url,targetCommitish,assets
```

## Evidence Log

- 2026-03-09: Runtime repo verification passed locally with:
  - `node --test tests/*.test.mjs`
  - `python3 -m unittest tests/test_voice_input_worker.py`
- 2026-03-09: App-side compile and targeted tests passed with:
  - `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit`
  - `pnpm -C autobyteus-web exec vitest run electron/extensions/__tests__/managedExtensionService.spec.ts tests/integration/voice-input-extension.integration.test.ts electron/extensions/__tests__/extensionCatalog.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts`
- 2026-03-09: Runtime repo branch `codex/voice-input-bilingual-runtime` was pushed and release [`v0.3.0`](https://github.com/AutoByteus/autobyteus-voice-runtime/releases/tag/v0.3.0) was published from that branch.
- 2026-03-09: `gh release view v0.3.0 --repo AutoByteus/autobyteus-voice-runtime --json tagName,url,targetCommitish,assets` confirmed:
  - target commitish = `codex/voice-input-bilingual-runtime`
  - assets = `voice-input-runtime-darwin-arm64.tar.gz`, `voice-input-runtime-darwin-x64.tar.gz`, `voice-input-runtime-linux-x64.tar.gz`, `voice-input-runtime-win32-x64.tar.gz`, `voice-input-runtime-manifest.json`
  - no release asset name matched `voice-input-model-*`
- 2026-03-09: Remote release digests matched the locally generated `dist/` outputs for all five published assets.
- 2026-03-09: `pnpm -C autobyteus-web test:voice-input-real-release` passed in `101.40s`, proving:
  - install from the live `v0.3.0` manifest
  - local model/bootstrap preparation under the managed extension root
  - explicit enable after install
  - English dictation
  - Chinese dictation
  - silence suppression
