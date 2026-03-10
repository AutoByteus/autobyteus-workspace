# Workflow State

Use this file as the mandatory stage-control artifact for the ticket.
Update this file before every stage transition and before any source-code edit.
Stage movement is controlled by this file's Stage Transition Contract + Transition Matrix.

## Current Snapshot

- Ticket: `voice-input-mac-recording`
- Current Stage: `10`
- Next Stage: `None (ticket complete)`
- Code Edit Permission: `Locked`
- Active Re-Entry: `No`
- Re-Entry Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`): `Requirement Gap`
- Last Transition ID: `T-020`
- Last Updated: `2026-03-10`

## Stage Gates

| Stage | Gate Status (`Not Started`/`In Progress`/`Pass`/`Fail`/`Blocked`) | Gate Rule Summary | Evidence |
| --- | --- | --- | --- |
| 0 Bootstrap + Draft Requirement | Pass | Ticket bootstrap complete + `requirements.md` Draft captured | `tickets/done/voice-input-mac-recording/requirements.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 1 Investigation + Triage | Pass | `investigation-notes.md` current + scope triage recorded | `tickets/done/voice-input-mac-recording/investigation-notes.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 2 Requirements | Pass | `requirements.md` is `Design-ready`/`Refined` | `tickets/done/voice-input-mac-recording/requirements.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 3 Design Basis | Pass | Design basis updated for scope (`implementation-plan.md` sketch or `proposed-design.md`) | `tickets/done/voice-input-mac-recording/implementation-plan.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 4 Runtime Modeling | Pass | `future-state-runtime-call-stack.md` current | `tickets/done/voice-input-mac-recording/future-state-runtime-call-stack.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 5 Review Gate | Pass | Runtime review `Go Confirmed` (two clean rounds, no blockers/persisted updates/new use cases) | `tickets/done/voice-input-mac-recording/future-state-runtime-call-stack-review.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 6 Implementation | Pass | Plan/progress current + source + unit/integration verification complete + no backward-compat/legacy retention + decoupling preserved + touched-file placement preserved/corrected | `tickets/done/voice-input-mac-recording/implementation-plan.md`, `tickets/done/voice-input-mac-recording/implementation-progress.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 7 API/E2E Testing | Pass | API/E2E test implementation complete + AC scenario gate complete | `tickets/done/voice-input-mac-recording/api-e2e-testing.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 8 Code Review | Pass | Code review gate `Pass`/`Fail` recorded + all changed source files `<=500` effective non-empty lines + `>220` delta-gate assessments recorded + shared-principles/layering + decoupling + module/file placement + no-backward-compat/no-legacy checks satisfied for `Pass` | `tickets/done/voice-input-mac-recording/code-review.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 9 Docs Sync | Pass | Docs updated or no-impact rationale recorded | `tickets/done/voice-input-mac-recording/docs-sync.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |
| 10 Handoff / Ticket State | Pass | Final handoff ready + explicit user verification received + ticket moved to `done` + git finalization/release complete when git repo + ticket state decision recorded | `tickets/done/voice-input-mac-recording/handoff-summary.md`, `tickets/done/voice-input-mac-recording/release-notes.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |

## Stage Transition Contract (Quick Reference)

| Stage | Exit Condition | On Fail/Blocked |
| --- | --- | --- |
| 0 | Bootstrap complete + `requirements.md` is `Draft` | stay in `0` |
| 1 | `investigation-notes.md` current + scope triage recorded | stay in `1` |
| 2 | `requirements.md` is `Design-ready`/`Refined` | stay in `2` |
| 3 | Design basis current for scope | stay in `3` |
| 4 | Runtime call stack current | stay in `4` |
| 5 | Runtime review `Go Confirmed` (two clean rounds with no blockers/no required persisted artifact updates/no newly discovered use cases) | classified re-entry then rerun (`Design Impact`: `3 -> 4 -> 5`, `Requirement Gap`: `2 -> 3 -> 4 -> 5`, `Unclear`: `1 -> 2 -> 3 -> 4 -> 5`) |
| 6 | Source + required unit/integration verification complete, no backward-compatibility/legacy-retention paths remain in scope, decoupling boundaries remain valid (no new unjustified cycles/tight coupling), and touched files have correct module/file placement | local issues: stay in `6`; otherwise classified re-entry (`Design Impact`: `1 -> 3 -> 4 -> 5 -> 6`, `Requirement Gap`: `2 -> 3 -> 4 -> 5 -> 6`, `Unclear`: `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6`) |
| 7 | API/E2E gate closes all executable mapped acceptance criteria (`Passed` or explicit user `Waived`) | `Blocked` on infeasible/no waiver; otherwise classified re-entry |
| 8 | Code review gate decision is `Pass` with all changed source files `<=500` effective non-empty lines, required `>220` delta-gate assessments recorded, and shared-principles/layering + decoupling + module/file placement + no-backward-compat/no-legacy checks satisfied | classified re-entry then rerun |
| 9 | Docs updated or no-impact rationale recorded | stay in `9` |
| 10 | Final handoff is complete, explicit user completion/verification is received, the ticket is moved to `tickets/done/<ticket-name>/`, and, when in a git repository, ticket-branch commit/push + latest-personal-branch update + merge + push + release are complete | stay in `10` |

## Transition Matrix (Reference)

| Trigger | Required Transition Path | Gate Result |
| --- | --- | --- |
| Normal forward progression | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10` | Pass |
| Stage 5 blocker (`Design Impact`) | `3 -> 4 -> 5` | Fail |
| Stage 5 blocker (`Requirement Gap`) | `2 -> 3 -> 4 -> 5` | Fail |
| Stage 5 blocker (`Unclear`) | `1 -> 2 -> 3 -> 4 -> 5` | Fail |
| Stage 6 failure (`Local Fix`) | stay in `6` | Fail |
| Stage 6 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 6 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 6 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6` | Fail |
| Stage 7 failure (`Local Fix`) | `6 -> 7` | Fail |
| Stage 7 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7` | Fail |
| Stage 7 infeasible criteria without explicit user waiver | stay in `7` | Blocked |
| Stage 8 failure (`Local Fix`) | `6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Design Impact`) | `1 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Requirement Gap`) | `2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 8 failure (`Unclear`/cross-cutting root cause) | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` | Fail |
| Stage 10 awaiting explicit user verification | stay in `10` | In Progress |
| Stage 10 archival/repository finalization blocked | stay in `10` | Blocked |

## Pre-Edit Checklist (Stage 6 Source-Code Edits)

- Current Stage is `6`: `No`
- Code Edit Permission is `Unlocked`: `No`
- Stage 5 gate is `Go Confirmed`: `Yes`
- Required upstream artifacts are current: `Yes`
- Pre-Edit Checklist Result: `Fail`
- If `Fail`, source code edits are prohibited.

## Re-Entry Declaration

- Trigger Stage (`5`/`6`/`7`/`8`):
- Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`):
- Required Return Path:
- Required Upstream Artifacts To Update Before Code Edits:
- Resume Condition:

## Transition Log (Append-Only)

| Transition ID | Date | From Stage | To Stage | Reason | Classification | Code Edit Permission After Transition | Evidence Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-000 | 2026-03-10 | 0 | 0 | Ticket bootstrap started in dedicated worktree and draft requirements were captured for the macOS Voice Input recording investigation. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/requirements.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-001 | 2026-03-10 | 0 | 1 | Bootstrap completed. The next step is Stage 1 investigation of the macOS microphone capture path, including permissions, device selection, renderer recording, and handoff into transcription. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-002 | 2026-03-10 | 1 | 2 | Investigation completed. The defect is narrowed to the renderer capture-activation path and/or macOS packaged microphone entitlement gap, and requirements refinement is next. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/investigation-notes.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-003 | 2026-03-10 | 2 | 3 | Requirements are design-ready for a small-scope fix covering recorder activation and macOS packaging entitlement correctness. The next step is the Stage 3 design basis. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/requirements.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-004 | 2026-03-10 | 3 | 4 | The small-scope design basis is complete. Runtime modeling is next for successful recorder activation, failed audio-context activation, and packaged macOS microphone entitlement behavior. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/implementation-plan.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-005 | 2026-03-10 | 4 | 5 | Runtime modeling is complete. The next step is review of the localized fix path until the gate reaches Go Confirmed. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/future-state-runtime-call-stack.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-006 | 2026-03-10 | 5 | 6 | Runtime review reached Go Confirmed. Implementation artifacts are initialized, code edits are now unlocked, and the next step is the localized store and build changes with targeted verification. | N/A | Unlocked | `tickets/in-progress/voice-input-mac-recording/future-state-runtime-call-stack-review.md`, `tickets/in-progress/voice-input-mac-recording/implementation-plan.md`, `tickets/in-progress/voice-input-mac-recording/implementation-progress.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-007 | 2026-03-10 | 6 | 7 | Implementation completed and the targeted Voice Input store regression suite passed. The workflow has advanced to Stage 7, which is blocked only on fresh packaged-macOS validation on the affected machines. | N/A | Unlocked | `tickets/in-progress/voice-input-mac-recording/implementation-progress.md`, `tickets/in-progress/voice-input-mac-recording/api-e2e-testing.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-008 | 2026-03-10 | 7 | 8 | The user installed the new local Apple Silicon build and confirmed that Test Voice Input works on the previously failing Mac. The next step is the code review gate. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/api-e2e-testing.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-009 | 2026-03-10 | 8 | 9 | Code review passed with no blocking findings. The next step is docs synchronization. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/code-review.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-010 | 2026-03-10 | 9 | 10 | Docs sync is complete and the ticket is ready for handoff. User verification has already been received; repository finalization was not performed in this turn. | N/A | Locked | `tickets/in-progress/voice-input-mac-recording/docs-sync.md`, `tickets/in-progress/voice-input-mac-recording/handoff-summary.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-011 | 2026-03-10 | 10 | 2 | The user added a robustness requirement: the settings-level Voice Input test needs explicit frontend recovery when it gets wedged. Requirements were reopened for a recovery-focused pass. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/requirements.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-012 | 2026-03-10 | 2 | 3 | Recovery requirements are design-ready. The next step is updating the small-scope design basis for watchdog and reset behavior. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/implementation-plan.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-013 | 2026-03-10 | 3 | 5 | Runtime modeling and review were refreshed for the recovery path, and the fix remains Go Confirmed. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/future-state-runtime-call-stack.md`, `tickets/in-progress/voice-input-mac-recording/future-state-runtime-call-stack-review.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-014 | 2026-03-10 | 5 | 6 | The workflow re-entered Stage 6 for the recovery watchdog and explicit reset implementation. | Requirement Gap | Unlocked | `tickets/in-progress/voice-input-mac-recording/implementation-progress.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-015 | 2026-03-10 | 6 | 7 | The recovery watchdog and reset implementation completed, and the targeted store plus settings-card test suites passed. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/implementation-progress.md`, `tickets/in-progress/voice-input-mac-recording/api-e2e-testing.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-016 | 2026-03-10 | 7 | 8 | The user explicitly confirmed the ticket is done once the frontend reset path exists, so the Stage 7 gate is accepted and the next step is code review. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/api-e2e-testing.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-017 | 2026-03-10 | 8 | 9 | Code review passed with no blocking findings after the recovery pass. The next step is docs sync. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/code-review.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-018 | 2026-03-10 | 9 | 10 | Docs sync is complete, release notes are written, and explicit user verification has been received. The next step is ticket archival and repository finalization. | Requirement Gap | Locked | `tickets/in-progress/voice-input-mac-recording/docs-sync.md`, `tickets/in-progress/voice-input-mac-recording/handoff-summary.md`, `tickets/in-progress/voice-input-mac-recording/release-notes.md`, `tickets/in-progress/voice-input-mac-recording/workflow-state.md` |
| T-019 | 2026-03-10 | 10 | 10 | The user confirmed completion, so the ticket folder was moved from `tickets/in-progress` to `tickets/done` before repository finalization. | Requirement Gap | Locked | `tickets/done/voice-input-mac-recording/workflow-state.md` |
| T-020 | 2026-03-10 | 10 | 10 | Repository finalization is complete. The ticket branch was pushed, merged into `personal`, and released as `v1.2.36`, so Stage 10 now passes. | Requirement Gap | Locked | `tickets/done/voice-input-mac-recording/handoff-summary.md`, `tickets/done/voice-input-mac-recording/release-notes.md`, `tickets/done/voice-input-mac-recording/workflow-state.md` |

## Audible Notification Log (Optional Tracking)

| Date | Trigger Type (`Transition`/`Gate`/`Re-entry`/`LockChange`) | Summary Spoken | Speak Tool Result (`Success`/`Failed`) | Fallback Text Logged |
| --- | --- | --- | --- | --- |
| 2026-03-10 | Transition | Stage one investigation is now active for the voice input mac recording ticket. Bootstrap is complete, code edits remain locked, and the next step is to trace the microphone capture path on macOS. | Success | N/A |
| 2026-03-10 | Transition | Stages one and two are complete for the voice input mac recording ticket. The workflow is now in stage three design, code edits remain locked, and the next step is to write the small-scope fix plan for recorder activation and macOS packaging entitlement. | Success | N/A |
| 2026-03-10 | Transition | Stages three through five are complete for the voice input mac recording ticket. Stage six implementation is now active, code edits are unlocked, and the next step is the localized recorder-startup and macOS entitlement fix with targeted verification. | Success | N/A |
| 2026-03-10 | Transition | Stage six implementation is complete for the voice input mac recording ticket. Stage seven is now blocked only on a fresh packaged macOS validation run on an affected machine, and no further code edits should happen until that verification result is known. | Success | N/A |
| 2026-03-10 | Transition | The ticket has been reopened for a small robustness pass. Stage six is active again, code edits are unlocked, and the next step is to add a dead-recording watchdog plus a reset mechanism in the settings UI. | Success | N/A |
| 2026-03-10 | Transition | Stage ten is complete for the voice input mac recording ticket. The branch has been merged into personal, release v1.2.36 is published, and the ticket is fully closed. | Success | N/A |

## Process Violation Log

| Date | Violation ID | Violation | Detected At Stage | Action Taken | Cleared |
| --- | --- | --- | --- | --- | --- |

None.
