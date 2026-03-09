# Implementation Progress

This document tracks the reopened Stage 6 execution for `voice-input-bilingual-runtime` after the user rejected release-hosted model assets.

## Kickoff Preconditions Checklist

- Workflow state current before source edits: `Yes`
- `workflow-state.md` showed `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed: `Large`
- Investigation/design/runtime-review artifacts current: `Yes`
- Runtime review reached `Go Confirmed`: `Yes`
- Unresolved blocking findings at implementation kickoff: `No`

## Planned Execution Table

| Task ID | Change Area | Status | Verification Target | Notes |
| --- | --- | --- | --- | --- |
| `T-001` | Canonical app-data root | Completed (reused) | helper/service tests | The canonical `~/.autobyteus` path work remains valid and should not be regressed |
| `T-002` | Extension state model | Completed (reused) | Electron service tests | Install/enable/disable/language state remains the desired product model |
| `T-003` | Runtime worker service | Completed | Electron service tests | Install now downloads only the runtime bundle and invokes local runtime `prepare` bootstrap for dependency/model setup |
| `T-004` | IPC surface | Completed | Electron transpile + targeted tests | The Electron bridge remained compatible; no extra renderer API was needed for the local bootstrap redesign |
| `T-005` | Settings UX | Completed | store/component tests | Existing install/enable/language UX remained valid after the installer contract change |
| `T-006` | Shared composer integration | Completed | store/component/integration tests | Composer behavior stayed stable while the runtime install path changed underneath it |
| `T-007` | App-side tests | Completed | targeted Vitest suites | Tests were updated to use local runtime prepare flows instead of release-hosted model archives |
| `T-008` | Runtime repository lightweight bundles | Completed | runtime repo tests + release run | Runtime release assets now contain only bundles + manifest; model archives were removed and local bootstrap was added |
| `T-009` | Real Stage 7 proof | Completed | `gh` release evidence + app proof | Published release `v0.3.0` stayed lightweight and passed the live install/bootstrap/enable/transcribe proof |

## Progress Log

- 2026-03-09: The ticket was reopened from handoff because the user rejected the heavy GitHub Release model-asset design.
- 2026-03-09: Investigation, requirements, proposed design, runtime modeling, and review were refreshed around lightweight runtime releases plus install-time local bootstrap.
- 2026-03-09: Stage 6 restarted with code edits unlocked. The canonical storage-root fix and install/enable UI lifecycle remain valid; the active implementation focus is removing release-hosted model payloads and shifting bilingual bootstrap to the installed runtime.
- 2026-03-09: App-side runtime install logic was refactored so the manifest only supplies worker-bundle coordinates plus upstream model metadata. `Install` now calls a local runtime `prepare` command instead of downloading model archives from GitHub Releases.
- 2026-03-09: Runtime repo packaging was slimmed down by deleting `scripts/download-model.py`, removing model archives from the release workflow, adding install-time model bootstrap to `voice_input_worker.py`, and keeping IPv4-safe download behavior for local machine bootstrap.
- 2026-03-09: Targeted verification passed:
  - `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit`
  - `pnpm -C autobyteus-web exec vitest run electron/extensions/__tests__/managedExtensionService.spec.ts tests/integration/voice-input-extension.integration.test.ts electron/extensions/__tests__/extensionCatalog.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts`
  - `node --test tests/*.test.mjs`
  - `python3 -m unittest tests/test_voice_input_worker.py`
- 2026-03-09: Real runtime release `v0.3.0` was published from `AutoByteus/autobyteus-voice-runtime` and validated. The live release asset list contained only four runtime bundles plus the manifest, and `pnpm -C autobyteus-web test:voice-input-real-release` passed in `101.40s` with local install-time bilingual bootstrap.
