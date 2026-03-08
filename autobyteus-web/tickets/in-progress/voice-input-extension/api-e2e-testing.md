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
| `AV-001` | Requirement | `AC-001`, `AC-002` | `R-001`, `R-003` | `UC-001`, `UC-002` | API | Settings surface must expose the new managed-extension UX without routing regressions | `Settings -> Extensions` renders and `Voice Input` card shows lifecycle actions | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run pages/__tests__/settings.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Passed |
| `AV-002` | Requirement | `AC-002`, `AC-003`, `AC-003A`, `AC-003B`, `AC-007` | `R-002`, `R-002A`, `R-003`, `R-003A`, `R-003B`, `R-008` | `UC-002`, `UC-003`, `UC-007` | API | Managed extension lifecycle must install/remove from app data using pinned AutoByteus manifest metadata | Install/remove/reinstall succeeds and persists normalized registry state | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/extensionCatalog.spec.ts electron/extensions/__tests__/managedExtensionService.spec.ts` | Passed |
| `AV-003` | Design-Risk | `AC-003`, `AC-006` | `R-002`, `R-009` | `UC-003`, `UC-006` | API | Corrupted installation or runtime/transcription failure must stay actionable instead of breaking the composer | Broken runtime is flagged as `error`; transcription failure leaves draft unchanged and shows feedback | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts` and `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed |
| `AV-004` | Requirement | `AC-004` | `R-004`, `R-006` | `UC-004` | API | Shared composer must expose the mic only when Voice Input is installed/ready | Mic button hidden when unavailable and rendered when ready | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | Passed |
| `AV-005` | Requirement | `AC-005`, `AC-008` | `R-005`, `R-006`, `R-007`, `R-010` | `UC-005`, `UC-008` | E2E | Equivalent app-level proof must validate install, discovery, invoke, and transcript propagation through the renderer bridge | Fixture-backed integration proves install + invoke + draft insertion through the renderer/Electron boundary | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run tests/integration/voice-input-extension.integration.test.ts` | Passed |
| `AV-006` | Requirement | `AC-003`, `AC-003A`, `AC-003B`, `AC-008` | `R-002`, `R-002A`, `R-003B`, `R-010` | `UC-003`, `UC-008`, `UC-009` | E2E | The real runtime release lane must build and publish assets under the dedicated voice-runtime tag namespace | `voice-runtime-v0.1.1` release publishes manifest, model, and all four platform binaries from the dedicated workflow | `gh run watch 22818608625 --repo AutoByteus/autobyteus-workspace --exit-status` and `gh release view voice-runtime-v0.1.1 --repo AutoByteus/autobyteus-workspace` | Passed |
| `AV-007` | Requirement | `AC-003`, `AC-003A`, `AC-005`, `AC-008` | `R-002`, `R-002A`, `R-005`, `R-010` | `UC-003`, `UC-005`, `UC-009` | E2E | The app-owned install and transcription path must work against the real published manifest, not only fixtures | Real `ManagedExtensionService` downloads published runtime/model assets, installs them into app data, invokes the published `whisper-cli`, and returns transcript text | `say` + `afconvert` WAV sample, then `node -` script using `autobyteus-web/dist/electron/extensions/managedExtensionService.js` against `voice-runtime-v0.1.1` | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required | Classification | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-08 | `AV-006` | First real release attempt on `voice-runtime-v0.1.0` failed for `darwin/x64` because the runtime packager allowed `ggml` to use `-march=native` during Apple Silicon cross-compilation, producing an invalid `apple-m1` CPU target for the x64 build | No | `Local Fix` | `6 -> 7` | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints:
  - The local workstation still does not have `cmake`, so the real native runtime build was validated through GitHub Actions rather than through a local compile.
  - This is acceptable for Stage 7 because the real published runtime assets were built successfully in the dedicated CI workflow and then consumed locally by the app code.
- Compensating executable evidence:
  - Real release workflow success: run `22818608625` for `voice-runtime-v0.1.1`
  - Real published release assets visible via `gh release view voice-runtime-v0.1.1 --repo AutoByteus/autobyteus-workspace`
  - Real app-side install/transcribe proof through compiled Electron service against the published manifest
- Residual risk notes:
  - `tiny.en-q5_1` on synthetic TTS clips is not always verbatim, which is expected for a tiny quantized model.
  - End-to-end product correctness for install/download/invoke is proven; model-accuracy tuning remains a future product-quality iteration, not a release blocker for this ticket.
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
  - Real release evidence:
    - `gh run watch 22818608625 --repo AutoByteus/autobyteus-workspace --exit-status`
    - `gh release view voice-runtime-v0.1.1 --repo AutoByteus/autobyteus-workspace`
  - Real published-runtime app proof:
    - Published manifest URL: `https://github.com/AutoByteus/autobyteus-workspace/releases/download/voice-runtime-v0.1.1/voice-input-runtime-manifest.json`
    - Compiled Electron service installed the runtime and model into app data and returned `Hello world!` from a generated WAV sample.
