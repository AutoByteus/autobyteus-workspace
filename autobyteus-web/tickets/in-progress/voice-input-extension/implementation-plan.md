# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Cross-layer feature spanning settings UI, renderer stores, Electron preload/main/services, and mandatory Stage 7 automated proof.

## Plan Maturity

- Current Status: `Implementation Ready`
- Review Gate: `Go Confirmed`

## Implementation Principles

- Keep the base installer unchanged; all runtime/model payloads go to app data.
- Keep native runtime build/release concerns in a dedicated `AutoByteus/autobyteus-voice-runtime` repository, not inside the workspace repo.
- Add a thin managed extension lifecycle instead of a full plugin framework.
- Keep `Voice Input` runtime execution in Electron only; no local speech server.
- Publish voice runtime assets through the separate runtime repository so they cannot affect desktop app release consumers.
- Keep the shared composer as the single integration point for both agent and team messaging.
- Do not reuse the dormant websocket transcription path.
- Treat Stage 7 as mandatory proof of the app-owned install/discovery/invoke contract against the real published runtime release lane.

## Planned Change Set

| Task ID | Change ID(s) | File / Module | Planned Action | Verification |
| --- | --- | --- | --- | --- |
| `T-001` | `C-001`, `C-002` | separate runtime repository + `autobyteus-web/electron/extensions/extensionCatalog.ts` | Extract runtime packaging to its own repository, publish runtime assets there, remove workspace-repo runtime release ownership, and point the app at that separate release lane | repository push + workflow/run validation + script/unit checks |
| `T-002` | `C-009`, `C-010`, `C-011` | `electron/extensions/extensionCatalog.ts`, `managedExtensionService.ts`, `voice-input/voiceInputRuntimeService.ts` | Add pinned runtime catalog, registry persistence, manifest-driven install/remove/discovery, and transcription invocation | Electron-main/service tests |
| `T-003` | `C-012`, `C-013` | `electron/preload.ts`, `types/electron.d.ts`, `electron/main.ts` | Expose typed extension/voice IPC and register handlers | Electron-main/preload tests |
| `T-004` | `C-006` | `stores/extensionsStore.ts` | Add managed extension lifecycle store with initialize/install/remove/reinstall flows | store tests |
| `T-005` | `C-003`, `C-004`, `C-005` | `pages/settings.vue`, `components/settings/ExtensionsManager.vue`, `components/settings/VoiceInputExtensionCard.vue` | Add `Extensions` settings section and voice-input card UI | page/component tests |
| `T-006` | `C-007`, `C-008` | `stores/voiceInputStore.ts`, `components/agentInput/AgentUserInputTextArea.vue` | Add mic button, recording/transcribing state, and draft insertion | store/component/integration tests |
| `T-007` | `C-014` | touched new voice path files | Keep new flow isolated from dormant websocket transcription path | import/reference scan + targeted tests |
| `T-008` | `C-001`..`C-013` | runtime release + test files across runtime/electron/renderer | Add mandatory Stage 7 proof path that ends with real published runtime release validation, using fixture scenarios only as preflight coverage | Stage 7 scenario log + published release evidence |

## Dependency And Sequencing Map

| Order | Task ID | Depends On | Why This Order |
| --- | --- | --- | --- |
| `1` | `T-001` | none | Runtime publication contract must exist before app consumption code is finalized |
| `2` | `T-002` | `T-001` | Electron services depend on the manifest/runtime package contract |
| `3` | `T-003` | `T-002` | Preload/main bridge follows concrete Electron service API |
| `4` | `T-004` | `T-003` | Renderer store depends on stable Electron IPC |
| `5` | `T-005` | `T-004` | Settings UI needs extension lifecycle state/actions |
| `6` | `T-006` | `T-004`, `T-003` | Composer integration depends on extension readiness + transcribe IPC |
| `7` | `T-007` | `T-006` | Validate no accidental reuse of old transcription path |
| `8` | `T-008` | `T-001`..`T-007` | Final automated proof after full flow exists |

## File-Level Definition Of Done

| File | Done Criteria | Test Criteria |
| --- | --- | --- |
| separate runtime repository | Produces platform runtime archives, model asset metadata, and manifest JSON for the selected runtime version | packaging script checks pass |
| runtime repository release workflow | Builds/publishes runtime assets in the separate repository with deterministic artifact names and real GitHub release assets | workflow YAML validation and actual release evidence pass |
| `pages/settings.vue` | Renders `Extensions` section and routes query correctly | updated settings page spec passes |
| `components/settings/ExtensionsManager.vue` | Shows extension list and action surfaces | component spec passes |
| `components/settings/VoiceInputExtensionCard.vue` | Renders install/remove/reinstall/status UI | component spec passes |
| `stores/extensionsStore.ts` | Initializes from Electron state and updates lifecycle actions correctly | store spec passes |
| `electron/extensions/extensionCatalog.ts` | Resolves voice-input manifest and platform artifact selection rules | service/unit test passes |
| `electron/extensions/managedExtensionService.ts` | Persists extension registry and lifecycle state under app data | Electron/service tests pass |
| `electron/extensions/voice-input/voiceInputRuntimeService.ts` | Installs runtime/model, validates files, invokes local runtime, cleans temp audio | Electron/service tests pass |
| `electron/preload.ts` + `types/electron.d.ts` | Expose typed extension + transcribe bridge | preload/type tests pass |
| `electron/main.ts` | Registers new IPC handlers and delegates to services | Electron-main tests pass |
| `stores/voiceInputStore.ts` | Handles recording/transcribing/error state and updates draft safely | store/integration tests pass |
| `components/agentInput/AgentUserInputTextArea.vue` | Shows mic action only when ready and preserves send behavior | component/integration tests pass |

## Stage 7 Automated Validation Strategy

### Scenario Map

| Scenario ID | Acceptance Criteria | Level | Planned Proof |
| --- | --- | --- | --- |
| `S7-001` | `AC-001`, `AC-002` | Renderer page/component | Settings shows `Extensions` and `Voice Input` card |
| `S7-002` | `AC-002`, `AC-003`, `AC-003A`, `AC-003B`, `AC-007` | Electron-main/service | Install/remove/reinstall lifecycle with persisted registry and pinned manifest resolution |
| `S7-003` | `AC-003`, `AC-003A`, `AC-003B`, `AC-006` | Electron-main/service | Install failure, corrupted-runtime detection, and manifest/provenance validation |
| `S7-004` | `AC-004` | Renderer integration | Composer mic visibility follows extension readiness |
| `S7-005` | `AC-005` | Renderer integration + Electron mocked bridge | Transcript inserts into current draft without send |
| `S7-006` | `AC-006` | Renderer integration | Permission/runtime/transcription errors remain non-destructive |
| `S7-007` | `AC-007` | Renderer integration | Remove/reinstall updates composer availability |
| `S7-008` | `AC-008` | App-owned end-to-end scenario | Real published runtime-repository release assets are built, downloaded, installed, discovered, invoked, and return transcript through the app flow |

### Proof Strategy

- Use deterministic fixture runtime packages as fast preflight validation so the test harness validates:
  - pinned manifest resolution,
  - download/install/unpack,
  - registry persistence,
  - runtime discovery,
  - process invocation,
  - transcript propagation into draft.
- Final Stage 7 closure additionally requires:
  - committed/pushed workspace branch state,
  - committed/pushed runtime-repository branch state,
  - manual or tag-driven runtime-repository release execution,
  - published GitHub release assets for the pinned runtime version,
  - app-side validation against the published manifest URL.
- Treat speech-model accuracy benchmarking as an external concern; Stage 7 is responsible for verifying the real published release lane and app lifecycle/orchestration behavior.

## Risks To Watch During Implementation

- Official `whisper.cpp` upstream artifacts are not sufficient for a single cross-platform download story; the manifest must remain app-owned.
- Runtime release ownership must stay outside the workspace repository to avoid version coupling or ambiguous “latest” discovery.
- Recording implementation must stay simple and not reintroduce streaming/websocket complexity.
- Composer integration must not regress stop/send behavior or draft persistence.
- The real runtime release may fail on CI runners due to missing toolchain or target-specific packaging issues and must be treated as part of the Stage 7 closure risk, not as post-handoff follow-up.

## UX Refinement Tasks (2026-03-08 Re-Entry)

| Task ID | Change | Files / Areas |
| --- | --- | --- |
| `T-009` | Add optimistic install/reinstall state so the extension card visibly enters `installing` before Electron returns | `stores/extensionsStore.ts`, `components/settings/VoiceInputExtensionCard.vue`, `components/settings/ExtensionsManager.vue` |
| `T-010` | Add `Open Folder` lifecycle action for installed voice input using Electron IPC | `electron/main.ts`, `electron/preload.ts`, `types/electron.d.ts`, `stores/extensionsStore.ts`, `components/settings/VoiceInputExtensionCard.vue`, `components/settings/ExtensionsManager.vue` |
| `T-011` | Add visible recording/transcribing indicator in the shared composer without changing the underlying local-recording pipeline | `components/agentInput/AgentUserInputTextArea.vue`, `stores/voiceInputStore.ts` |
| `T-012` | Extend targeted tests for install-progress UX, open-folder lifecycle action, and recording/transcribing indicator | `components/settings/__tests__/VoiceInputExtensionCard.spec.ts`, `stores/__tests__/extensionsStore.spec.ts`, `components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`, `tests/integration/voice-input-extension.integration.test.ts` |
