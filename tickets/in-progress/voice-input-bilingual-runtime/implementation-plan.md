# Implementation Plan

## Scope Classification

- Classification: `Large`
- Reasoning:
  - The change spans the Electron app, renderer UI/stores, canonical app-data ownership, runtime-worker protocol, and the dedicated runtime repository release lane.

## Plan Maturity

- Current Status: `Implementation Ready`
- Review Gate: `Go Confirmed`

## Implementation Principles

- Keep Voice Input as an optional extension downloaded from release assets.
- Keep runtime releases lightweight; do not publish model archives in GitHub Releases.
- Use the canonical AutoByteus base data root for both `server-data` and `extensions`.
- Separate install from enable; do not re-couple them during implementation.
- Default language mode to `Auto`.
- Use a local managed worker process, not a remote server and not the old one-shot contract.
- Keep the renderer ignorant of filesystem layout and process-management details.
- Keep backend-specific dependency/model bootstrap inside the installed runtime bundle rather than in Electron UI/service layers.
- Do not keep fallback branches for the old `userData` install location or the old English-only runtime contract.
- Treat the dedicated runtime repository as a first-class implementation surface for this ticket.
- Treat real published-release validation as a hard Stage 7 requirement.

## Planned Change Set

| Task ID | Change Area | Files / Modules | Planned Action | Verification |
| --- | --- | --- | --- | --- |
| `T-001` | Canonical app-data root | `autobyteus-web/electron/appDataPaths.ts`, `electron/main.ts`, `electron/logger.ts`, `electron/server/baseServerManager.ts` | Introduce one canonical base-data helper and route extension storage to `~/.autobyteus/extensions` | unit/service tests + targeted compile |
| `T-002` | Extension state model | `autobyteus-web/electron/extensions/types.ts`, `managedExtensionService.ts`, `extensionCatalog.ts` | Add separate install state, enabled state, language mode, backend metadata, and canonical registry persistence | Electron service tests |
| `T-003` | Runtime worker service | `autobyteus-web/electron/extensions/voice-input/voiceInputRuntimeService.ts`, optional `voiceInputWorkerClient.ts` | Keep worker lifecycle management, but change install from release-hosted model download to runtime-owned local bootstrap and structured bootstrap verification | Electron service tests |
| `T-004` | IPC surface | `autobyteus-web/electron/extensionIpcHandlers.ts`, `electron/preload.ts`, `types/electron.d.ts` | Add enable/disable/settings IPC and structured transcription requests | Electron transpile + bridge tests |
| `T-005` | Settings UX | `autobyteus-web/stores/extensionsStore.ts`, `components/settings/ExtensionsManager.vue`, `components/settings/VoiceInputExtensionCard.vue` | Implement install/enable/disable/reinstall/remove state plus language selector and open-folder flow | store/component tests |
| `T-006` | Shared composer integration | `autobyteus-web/stores/voiceInputStore.ts`, `components/agentInput/AgentUserInputTextArea.vue` | Gate mic on installed+enabled+not-error state and suppress draft mutation on no-speech/errors | store/component/integration tests |
| `T-007` | App-side tests | Electron tests, renderer tests, integration tests | Update and expand tests for canonical path, lifecycle separation, language persistence, and no-speech handling | targeted Vitest suites |
| `T-008` | Runtime repository lightweight bundles | `/Users/normy/autobyteus_org/autobyteus-voice-runtime/metadata/runtime-assets.json`, runtime scripts, runtime workflow, runtime tests | Remove model archives from the release lane, publish only worker bundles plus bootstrap metadata, and add runtime-side local bootstrap commands | runtime repo tests + release workflow run |
| `T-009` | Real Stage 7 proof | runtime repo release lane + workspace service proof | Publish the pinned lightweight runtime release and validate install, local bootstrap, enable, and invoke against the real manifest/assets | `gh` release evidence + app-side proof |

## Dependency And Sequencing Map

| Order | Task ID | Depends On | Why This Order |
| --- | --- | --- | --- |
| `1` | `T-001` | none | Canonical path ownership must be fixed before extension persistence and install logic are updated |
| `2` | `T-002` | `T-001` | Lifecycle/UI behavior depends on the richer persisted extension model |
| `3` | `T-003` | `T-002` | Worker lifecycle depends on the new runtime metadata and enabled-state contract |
| `4` | `T-004` | `T-002`, `T-003` | IPC must match the concrete service APIs |
| `5` | `T-005` | `T-004` | Settings UI depends on the finalized lifecycle/settings bridge |
| `6` | `T-006` | `T-004`, `T-005` | Composer behavior depends on the finalized extension state and structured transcription response |
| `7` | `T-007` | `T-001`..`T-006` | App-side tests should verify the completed workspace implementation |
| `8` | `T-008` | design complete | Runtime repository work can proceed in parallel conceptually, but must converge before Stage 7 because manifest/bootstrap semantics change |
| `9` | `T-009` | `T-007`, `T-008` | Final proof requires both the app path and runtime release lane to be ready |

## File-Level Definition Of Done

| File / Module | Done Criteria | Test Criteria |
| --- | --- | --- |
| `electron/appDataPaths.ts` | Canonical helper returns consistent base, server-data, extensions, and logs paths | helper test passes |
| `electron/main.ts` | Extension service is constructed from canonical data root, not `userData` | Electron compile + service test passes |
| `electron/extensions/types.ts` | Types represent install state, enabled state, language mode, and structured runtime responses | type/compile checks pass |
| `electron/extensions/managedExtensionService.ts` | Install/enable/disable/remove/reinstall persist correctly under canonical extensions root | Electron service tests pass |
| `electron/extensions/voice-input/voiceInputRuntimeService.ts` | Worker lifecycle, runtime-bundle install, local bootstrap verification, temp-file cleanup, and no-speech result handling work | Electron service tests pass |
| `electron/preload.ts` + `types/electron.d.ts` | New lifecycle/settings/transcription bridge compiles cleanly | Electron transpile passes |
| `stores/extensionsStore.ts` | Renderer state reflects install and enable separately and persists language mode via Electron | store tests pass |
| `components/settings/VoiceInputExtensionCard.vue` | Card renders correct controls for each lifecycle state and language selector | component tests pass |
| `stores/voiceInputStore.ts` | Draft updates only on usable transcripts and uses the structured request/response contract | store/integration tests pass |
| `components/agentInput/AgentUserInputTextArea.vue` | Mic button gating and visible activity feedback match enabled-state behavior | component/integration tests pass |
| runtime repo v2 scripts/workflow | Dedicated repo publishes lightweight bilingual worker bundles + manifest for all supported targets and no model archives in release assets | runtime repo tests + GitHub release evidence pass |

## Stage 7 Automated Validation Strategy

### Scenario Map

| Scenario ID | Acceptance Criteria | Level | Planned Proof |
| --- | --- | --- | --- |
| `S7-001` | `AC-001`, `AC-002`, `AC-003`, `AC-005`, `AC-015` | Renderer + Electron API | Settings and lifecycle controls reflect install/enable/disable/reinstall/remove correctly |
| `S7-002` | `AC-004`, `AC-015` | Electron service | Canonical path installation, remove, and reinstall behavior |
| `S7-003` | `AC-006` | Renderer store/API | Language selector persists `Auto/English/Chinese` |
| `S7-004` | `AC-011`, `AC-013`, `AC-014` | Renderer component/integration | Mic visibility and visible activity/error feedback |
| `S7-005` | `AC-007`, `AC-012`, `AC-014` | Renderer integration + Electron mock | English transcript updates draft without send |
| `S7-006` | `AC-008`, `AC-009`, `AC-010`, `AC-012`, `AC-014` | Electron API + integration | Chinese/mixed/no-speech behavior through structured runtime responses |
| `S7-007` | `AC-016` | Runtime repo + app consumption | Platform/backend manifest contract matches MLX and `faster-whisper` bundle strategy |
| `S7-008` | `AC-017`, `AC-018`, `AC-019` | Real release + app-side proof | Published runtime assets stay lightweight and the real app-owned path performs local bootstrap, install, enable, and invoke |

### Proof Strategy

- Use fixture-backed bundles and worker stubs for fast local API/integration coverage.
- Use the real runtime repository release workflow and GitHub Releases for closure.
- Validate the real app-side proof against the compiled Electron services or equivalent app-owned install/invoke path.
- Assert that the published release asset list does not contain model archives.
- Assert that install-time model preparation happened locally on the validation machine.
- Do not accept fixture-only success as ticket closure.

## Risks To Watch During Implementation

- MLX bundle bootstrap may differ enough from the `faster-whisper` bootstrap that the runtime manifest or verification code needs a more explicit schema.
- Worker lifecycle and structured transport may expose platform-specific startup quirks that were hidden by one-shot execution.
- The storage-root correction touches multiple Electron entrypoints and can easily drift again if not centralized.
- Stage 7 depends on runtime repo publication and upstream model bootstrap behavior, so workspace work cannot be treated as complete in isolation.
