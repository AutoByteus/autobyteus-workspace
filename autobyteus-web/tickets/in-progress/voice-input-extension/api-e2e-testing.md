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
| `AC-003` | `R-002`, `R-003A`, `R-007` | Install downloads runtime/model and records installed state | `AV-002`, `AV-003` | Passed | 2026-03-08 |
| `AC-003A` | `R-002A` | Install resolves through AutoByteus-managed release metadata | `AV-002`, `AV-003` | Passed | 2026-03-08 |
| `AC-003B` | `R-003B` | Install resolves through app-pinned runtime coordinates | `AV-002` | Passed | 2026-03-08 |
| `AC-004` | `R-004`, `R-006` | Shared composer shows mic only when ready | `AV-004` | Passed | 2026-03-08 |
| `AC-005` | `R-005`, `R-006`, `R-007` | Dictation inserts transcript into draft without auto-send | `AV-005` | Passed | 2026-03-08 |
| `AC-006` | `R-009` | Failures remain actionable and non-destructive | `AV-003`, `AV-006` | Passed | 2026-03-08 |
| `AC-007` | `R-008` | Remove/reinstall lifecycle works | `AV-002` | Passed | 2026-03-08 |
| `AC-008` | `R-010` | Automated app-level proof covers install-to-transcription path | `AV-005` | Passed | 2026-03-08 |

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Objective/Risk | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | Requirement | `AC-001`, `AC-002` | `R-001`, `R-003` | `UC-001`, `UC-002` | API | Settings surface must expose the new managed-extension UX without routing regressions | `Settings -> Extensions` renders and `Voice Input` card shows lifecycle actions | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run pages/__tests__/settings.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Passed |
| `AV-002` | Requirement | `AC-002`, `AC-003`, `AC-003A`, `AC-003B`, `AC-007` | `R-002`, `R-002A`, `R-003`, `R-003A`, `R-003B`, `R-008` | `UC-002`, `UC-003`, `UC-007` | API | Managed extension lifecycle must install/remove from app data using pinned AutoByteus manifest metadata | Install/remove/reinstall succeeds and persists normalized registry state | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/extensionCatalog.spec.ts electron/extensions/__tests__/managedExtensionService.spec.ts` | Passed |
| `AV-003` | Design-Risk | `AC-003`, `AC-003A`, `AC-006` | `R-002`, `R-002A`, `R-009` | `UC-003`, `UC-006` | API | Corrupted installation or runtime/transcription failure must stay actionable instead of breaking the composer | Broken runtime is flagged as `error`; transcription failure leaves draft unchanged and shows feedback | `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/managedExtensionService.spec.ts` and `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed |
| `AV-004` | Requirement | `AC-004` | `R-004`, `R-006` | `UC-004` | API | Shared composer must expose the mic only when Voice Input is installed/ready | Mic button hidden when unavailable and rendered when ready | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | Passed |
| `AV-005` | Requirement | `AC-005`, `AC-008` | `R-005`, `R-006`, `R-007`, `R-010` | `UC-005`, `UC-008` | E2E | Equivalent app-level proof must validate install, discovery, invoke, and transcript propagation through the renderer bridge | Real `ManagedExtensionService` installs fixture runtime/model through `window.electronAPI`, then `voiceInputStore` invokes it and appends transcript to draft | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run tests/integration/voice-input-extension.integration.test.ts` | Passed |
| `AV-006` | Requirement | `AC-006` | `R-009` | `UC-006` | API | Renderer failure path must preserve text workflow | Transcription error triggers toast and does not mutate the draft | `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required | Classification | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-08 | None | No Stage 7 scenario failures occurred in the final targeted run set | No | N/A | N/A | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints:
  - Local workstation does not have `cmake`, so actual local `whisper.cpp` compilation from `build-runtime.sh` could not be completed here.
  - This did not block Stage 7 because `AC-008` is defined as app-level validation of the managed install/invoke flow, which is covered by the deterministic fixture runtime scenario in `AV-005`.
- Compensating automated evidence:
  - `AV-005` proves install/discovery/invoke through the app-managed flow.
  - `node --test autobyteus-voice-runtime/tests/generate-manifest.test.mjs` proves manifest generation/checksum contract.
- Residual risk notes:
  - Real runtime packaging should still be validated in CI runners that provide `cmake`.
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
  - Final targeted Stage 7 renderer/integration command:
    - `pnpm -C autobyteus-web exec vitest --config vitest.config.mts run pages/__tests__/settings.spec.ts components/settings/__tests__/VoiceInputExtensionCard.spec.ts components/agentInput/__tests__/AgentUserInputTextArea.spec.ts stores/__tests__/extensionsStore.spec.ts stores/__tests__/voiceInputStore.spec.ts tests/integration/voice-input-extension.integration.test.ts`
  - Final targeted Stage 7 Electron command:
    - `pnpm -C autobyteus-web exec vitest --config electron/vitest.config.ts run electron/extensions/__tests__/extensionCatalog.spec.ts electron/extensions/__tests__/managedExtensionService.spec.ts`
