# API/E2E Testing

## Testing Scope

- Ticket: `voice-input-extension`
- Scope classification: `Medium`
- Workflow state source: `autobyteus-web/tickets/in-progress/voice-input-extension/workflow-state.md`
- Requirements source: `autobyteus-web/tickets/in-progress/voice-input-extension/requirements.md`
- Call stack source: `autobyteus-web/tickets/in-progress/voice-input-extension/future-state-runtime-call-stack.md`
- Design source: `autobyteus-web/tickets/in-progress/voice-input-extension/proposed-design.md`

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | Settings shows `Extensions` and renders the manager | `AV-001` | Passed | 2026-03-08 |
| `AC-002` | `R-001`, `R-003` | Voice Input card renders status and controls | `AV-001`, `AV-002` | Passed | 2026-03-08 |
| `AC-003` | `R-002`, `R-003A`, `R-007` | Install downloads runtime/model and records installed state | `AV-002`, `AV-006`, `AV-007` | Passed | 2026-03-08 |
| `AC-003A` | `R-002A` | Install resolves through AutoByteus-managed release metadata | `AV-002`, `AV-006`, `AV-007` | Passed | 2026-03-08 |
| `AC-003B` | `R-003B` | Install resolves through app-pinned runtime coordinates | `AV-002`, `AV-006` | Passed | 2026-03-08 |
| `AC-004` | `R-004`, `R-006` | Shared composer shows mic only when ready | `AV-004` | Passed | 2026-03-08 |
| `AC-005` | `R-005`, `R-006`, `R-007` | Dictation inserts transcript into draft without auto-send | `AV-005`, `AV-007` | Passed | 2026-03-08 |
| `AC-006` | `R-009` | Failures remain actionable and non-destructive | `AV-003` | Passed | 2026-03-08 |
| `AC-007` | `R-008` | Remove/reinstall lifecycle works | `AV-002` | Passed | 2026-03-08 |
| `AC-008` | `R-010` | Real published runtime build/download/install/transcribe proof closes the handoff gate | `AV-005`, `AV-006`, `AV-007` | Passed | 2026-03-08 |

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Objective/Risk | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | Requirement | `AC-001`, `AC-002` | `R-001`, `R-003` | `UC-001`, `UC-002` | API | Settings surface must expose the managed-extension UX without routing regressions | `Settings -> Extensions` renders and `Voice Input` card shows lifecycle actions | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run pages/__tests__/settings.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Passed |
| `AV-002` | Requirement | `AC-002`, `AC-003`, `AC-003A`, `AC-003B`, `AC-007` | `R-002`, `R-002A`, `R-003`, `R-003A`, `R-003B`, `R-008` | `UC-002`, `UC-003`, `UC-007` | API | Managed extension lifecycle must install/remove from app data using pinned AutoByteus manifest metadata | Install/remove/reinstall succeeds and persists normalized registry state | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/extensionCatalog.spec.ts electron/extensions/__tests__/managedExtensionService.spec.ts` | Passed |
| `AV-003` | Design-Risk | `AC-003`, `AC-006` | `R-002`, `R-009` | `UC-003`, `UC-006` | API | Corrupted installation or runtime/transcription failure must stay actionable instead of breaking the composer | Broken runtime is flagged as `error`; transcription failure leaves draft unchanged and shows feedback | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts` and `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed |
| `AV-004` | Requirement | `AC-004` | `R-004`, `R-006` | `UC-004` | API | Shared composer must expose the mic only when Voice Input is installed/ready | Mic button hidden when unavailable and rendered when ready | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | Passed |
| `AV-005` | Requirement | `AC-005`, `AC-008` | `R-005`, `R-006`, `R-007`, `R-010` | `UC-005`, `UC-008` | E2E | Equivalent app-level proof must validate install, discovery, invoke, and transcript propagation through the renderer bridge | Fixture-backed integration proves install + invoke + draft insertion through the renderer/Electron boundary | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run tests/integration/voice-input-extension.integration.test.ts` | Passed |
| `AV-006` | Requirement | `AC-003`, `AC-003A`, `AC-003B`, `AC-008` | `R-002`, `R-002A`, `R-003B`, `R-010` | `UC-003`, `UC-008`, `UC-009` | E2E | The standalone runtime repository must build and publish the pinned runtime assets independently of the workspace repo | Release `v0.1.1` in `AutoByteus/autobyteus-voice-runtime` publishes the manifest, model, and all four platform binaries | `gh run watch 22818941304 --repo AutoByteus/autobyteus-voice-runtime --exit-status` and `gh release view v0.1.1 --repo AutoByteus/autobyteus-voice-runtime` | Passed |
| `AV-007` | Requirement | `AC-003`, `AC-003A`, `AC-005`, `AC-008` | `R-002`, `R-002A`, `R-005`, `R-010` | `UC-003`, `UC-005`, `UC-009` | E2E | The app-owned install and transcription path must work against the real published manifest from the separate repo, not only fixtures | Real `ManagedExtensionService` downloads published runtime/model assets, installs them into app data, invokes the published `whisper-cli`, and returns transcript text | `say` + `afconvert` WAV sample, then `node --input-type=module -` using `autobyteus-web/dist/electron/extensions/managedExtensionService.js` against `https://github.com/AutoByteus/autobyteus-voice-runtime/releases/download/v0.1.1/voice-input-runtime-manifest.json` | Passed |
| `AV-008` | Cleanup | `N/A` | `N/A` | `N/A` | E2E | The temporary desktop-release exclusion introduced before the repo split must be removed once the runtime moves to its own repository | `release-desktop.yml` matches `origin/personal` again and the workspace repo latest release remains the Electron app release | `diff -u <(git show origin/personal:.github/workflows/release-desktop.yml) .github/workflows/release-desktop.yml`; `gh release list --repo AutoByteus/autobyteus-workspace --limit 3` | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required | Classification | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-08 | `AV-006` | The first standalone-repo workflow dispatch failed immediately because the workflow used invalid GitHub expression syntax (`inputs.runtime_version#v`) instead of doing version normalization in bash | No | `Local Fix` | `6 -> 7` | No | No | No | No | N/A | Yes |
| 2026-03-09 | `AV-012` | Live packaged-app validation of the new settings-level Voice Input test failed with `FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'` even though `ffmpeg` exists at `/opt/homebrew/bin/ffmpeg`; the worker launch path is not inheriting login-shell PATH | Yes | `Local Fix` | `6 -> 7` | Yes | No | No | No | N/A | No |

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints:
  - The local workstation still does not have `cmake`, so the native runtime build was validated through GitHub Actions in `AutoByteus/autobyteus-voice-runtime` rather than through a local compile.
  - This is acceptable for Stage 7 because the real published runtime assets were built successfully in the dedicated CI workflow and then consumed locally by the app code.
- Compensating executable evidence:
  - Real standalone release workflow success: run `22818941304` for `v0.1.1`
  - Real published release assets visible via `gh release view v0.1.1 --repo AutoByteus/autobyteus-voice-runtime`
  - Real app-side install/transcribe proof through compiled Electron service against the published manifest
  - Desktop release workflow restored to the original trigger shape and verified against `origin/personal`
- Residual risk notes:
  - `tiny.en-q5_1` on synthetic TTS clips is not always perfectly verbatim, which is expected for a tiny quantized model.
  - Product correctness for install/download/invoke is proven; model-accuracy tuning remains a future quality iteration, not a release blocker for this ticket.
- User waiver for infeasible acceptance criteria recorded: `N/A`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Final targeted Stage 7 Electron/API command:
    - `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/extensionCatalog.spec.ts electron/extensions/__tests__/managedExtensionService.spec.ts`
  - Final targeted Stage 7 renderer/integration command:
    - `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run pages/__tests__/settings.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts tests/integration/voice-input-extension.integration.test.ts`
  - Real standalone release evidence:
    - `gh run watch 22818941304 --repo AutoByteus/autobyteus-voice-runtime --exit-status`
    - `gh release view v0.1.1 --repo AutoByteus/autobyteus-voice-runtime`
  - Cleanup proof:
    - `diff -u <(git show origin/personal:.github/workflows/release-desktop.yml) .github/workflows/release-desktop.yml`
    - `gh release list --repo AutoByteus/autobyteus-workspace --limit 3`
  - Real published-runtime app proof:
    - Published manifest URL: `https://github.com/AutoByteus/autobyteus-voice-runtime/releases/download/v0.1.1/voice-input-runtime-manifest.json`
    - Compiled Electron service installed the runtime and model into app data and returned `Hello world!` from a generated WAV sample.

## UX Refinement Re-Entry Validation (2026-03-08)

### Additional Scenario Coverage

| Scenario ID | Acceptance Criteria | Status | Command / Harness | Notes |
| --- | --- | --- | --- | --- |
| `AV-009` | `AC-003C`, `AC-003D` | Passed | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/extensionsStore.spec.ts` plus `pnpm -C autobyteus-web transpile-electron` | Settings now shows immediate install progress and exposes `Open Folder` for installed Voice Input |
| `AV-010` | `AC-006A` | Passed | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run components/agentInput/__tests__/AgentUserInputTextArea.spec.ts stores/__tests__/voiceInputStore.spec.ts tests/integration/voice-input-extension.integration.test.ts` | Shared composer now shows visible recording/transcribing state while dictation is active |

### Gate Outcome For Re-Entry

- Stage 7 reopened for the UX refinement: `Yes`
- All newly added executable acceptance criteria passed: `Yes`
- Additional blockers introduced: `No`

## Live Diagnostics Re-Entry Validation (2026-03-09)

### Additional Scenario Coverage

| Scenario ID | Acceptance Criteria | Status | Command / Harness | Notes |
| --- | --- | --- | --- | --- |
| `AV-011` | `AC-003E` | Passed | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts` plus `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/extensionsStore.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Install now exposes manifest/download/extract/bootstrap phases to the settings UI without fake percentage claims when the backend cannot provide them |
| `AV-012` | `AC-006B`, `AC-006C` | Passed | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web exec vitest --config vitest.config.mts run components/settings/__tests__/VoiceInputExtensionCard.spec.ts stores/__tests__/voiceInputStore.spec.ts tests/integration/voice-input-extension.integration.test.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | Settings page now supports a direct voice test flow and the store distinguishes `no-speech`, `empty-transcript`, and runtime-error outcomes |

### Gate Outcome For Re-Entry

- Stage 7 reopened for the live diagnostics delta: `Yes`
- All newly added executable acceptance criteria passed: `Yes`
- Additional blockers introduced: `No`
- Residual risk:
  - A fresh packaged-app microphone smoke is still required after rebuild to prove the real desktop binary now behaves correctly with live microphone hardware.

## Packaged-App PATH Re-Entry Validation Plan (2026-03-09)

### Planned Additional Scenario Coverage

| Scenario ID | Acceptance Criteria | Planned Command / Harness | Goal |
| --- | --- | --- | --- |
| `AV-013` | `AC-006B`, `AC-006C` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts` plus the new runtime-spawn env regression case | Prove the Voice Input runtime spawn path receives login-shell PATH enrichment |
| `AV-014` | `AC-006B`, `AC-006C` | Rebuild macOS desktop app, launch packaged build, rerun `Settings -> Extensions -> Voice Input -> Test Voice Input` on the user machine | Prove packaged-app microphone test no longer fails on missing `ffmpeg` when Homebrew installs it outside the default GUI PATH |

### Current Re-Entry Status

| Scenario ID | Acceptance Criteria | Status | Command / Harness | Notes |
| --- | --- | --- | --- | --- |
| `AV-013` | `AC-006B`, `AC-006C` | Passed | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts electron/extensions/__tests__/voiceInputRuntimeService.spec.ts` | Targeted Electron validation now proves the PATH-enrichment helper and managed extension regression suite both pass after the worker-launch env fix |
| `AV-014` | `AC-006B`, `AC-006C` | Passed | Rebuilt artifact at `/Users/normy/autobyteus_org/autobyteus-worktrees/voice-input-bilingual-runtime/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.2.27.dmg`; user ran `Settings -> Extensions -> Voice Input -> Test Voice Input` in the packaged app and confirmed it works | Live packaged-app verification closed successfully after the PATH-enrichment fix |

### Gate Outcome For PATH Re-Entry

- Stage 7 reopened for the packaged-app PATH fix: `Yes`
- Targeted Electron regression checks passed: `Yes`
- Live packaged-app microphone test after rebuild passed: `Yes`
- Additional blockers introduced: `No`
