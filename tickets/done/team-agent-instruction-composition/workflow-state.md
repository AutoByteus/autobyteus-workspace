# Workflow State

Use this file as the mandatory stage-control artifact for the ticket.
Update this file before every stage transition and before any source-code edit.
Stage movement is controlled by this file's Stage Transition Contract + Transition Matrix.

## Current Snapshot

- Ticket: `team-agent-instruction-composition`
- Current Stage: `10`
- Next Stage: `Archived in tickets/done; branch commit/handoff complete on explicit user verification`
- Code Edit Permission: `Locked`
- Active Re-Entry: `No`
- Re-Entry Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`): `Local Fix (Resolved)`
- Last Transition ID: `T-046`
- Last Updated: `2026-03-09`

## Stage Gates

| Stage | Gate Status (`Not Started`/`In Progress`/`Pass`/`Fail`/`Blocked`) | Gate Rule Summary | Evidence |
| --- | --- | --- | --- |
| 0 Bootstrap + Draft Requirement | Pass | Ticket bootstrap complete + `requirements.md` Draft captured | `tickets/done/team-agent-instruction-composition/requirements.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |
| 1 Investigation + Triage | Pass | `investigation-notes.md` current + scope triage recorded | `tickets/done/team-agent-instruction-composition/investigation-notes.md` |
| 2 Requirements | Pass | `requirements.md` is `Design-ready`/`Refined` | `tickets/done/team-agent-instruction-composition/requirements.md` |
| 3 Design Basis | Pass | Design basis updated for scope (`implementation-plan.md` sketch or `proposed-design.md`) | `tickets/done/team-agent-instruction-composition/proposed-design.md` |
| 4 Runtime Modeling | Pass | `future-state-runtime-call-stack.md` current | `tickets/done/team-agent-instruction-composition/future-state-runtime-call-stack.md` |
| 5 Review Gate | Pass | Runtime review `Go Confirmed` (two clean rounds, no blockers/persisted updates/new use cases) | `tickets/done/team-agent-instruction-composition/future-state-runtime-call-stack-review.md` |
| 6 Implementation | Pass | Runtime guidance wording is now explicitly conditional so `send_message_to` reads as a mechanical tool constraint rather than collaboration policy | `tickets/done/team-agent-instruction-composition/implementation-progress.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |
| 7 API/E2E Testing | Pass | Latest user-requested serialized live Codex plus live Claude validation round completed green on the merged branch | `tickets/done/team-agent-instruction-composition/api-e2e-testing.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |
| 8 Code Review | Pass | Validation-only rerun completed without surfacing new findings; review gate remains clean | `tickets/done/team-agent-instruction-composition/code-review.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |
| 9 Docs Sync | Pass | Docs/no-impact rationale refreshed after the validation-only rerun | `tickets/done/team-agent-instruction-composition/docs-sync.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |
| 10 Handoff / Ticket State | Pass | User verification was received, the ticket is archived under `tickets/done`, and the branch is ready for commit handoff | `tickets/done/team-agent-instruction-composition/handoff-summary.md`, `tickets/done/team-agent-instruction-composition/workflow-state.md` |

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
| 10 | Final handoff complete; ticket move requires explicit user confirmation | stay in `10`/`in-progress` |

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

Note:
- In re-entry paths, Stage 0 means re-open bootstrap controls in the same ticket/worktree (`workflow-state.md`, lock state, artifact baselines); do not create a new ticket folder.
- For Stage 5 failures, record classified re-entry first; then persist artifact updates in the returned upstream stage before running the next Stage 5 round.

## Pre-Edit Checklist (Stage 6 Source-Code Edits)

- Current Stage is `6`: `Historical Yes`
- Code Edit Permission is `Unlocked`: `Historical Yes`
- Stage 5 gate is `Go Confirmed`: `Yes`
- Required upstream artifacts are current: `Yes`
- Pre-Edit Checklist Result: `Historical Pass`
- If current stage re-enters `6`, source edits require a new pass through this checklist.

## Re-Entry Declaration

- Trigger Stage (`5`/`6`/`7`/`8`): `10`
- Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`): `Local Fix`
- Required Return Path: `7`
- Required Upstream Artifacts To Update Before Code Edits: `workflow-state.md`
- Resume Condition: `The full serialized live Codex and live Claude backend sweeps are rerun on this branch and Stage 7 evidence is current.`
- Re-Entry Closure Status: `Closed`

Note:
- Stage 5 re-entry normally uses `Design Impact` / `Requirement Gap` / `Unclear` only (not `Local Fix`).
- Stage 6 re-entry uses `Local Fix` (stay in `6`) or non-local classified return path (`Design Impact`/`Requirement Gap`/`Unclear`) before further source edits.

## Transition Log (Append-Only)

| Transition ID | Date | From Stage | To Stage | Reason | Classification | Code Edit Permission After Transition | Evidence Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | 2026-03-09 | 0 | 1 | Bootstrap complete in dedicated worktree; draft requirement captured | N/A | Locked | `requirements.md`, `workflow-state.md` |
| T-002 | 2026-03-09 | 1 | 2 | Investigation recorded; triage confirmed as `Medium` because the change spans session-metadata, codex prompt assembly, and claude prompt/tooling assembly | N/A | Locked | `investigation-notes.md`, `workflow-state.md` |
| T-003 | 2026-03-09 | 2 | 3 | Requirements clarified to `Design-ready`; contract now explicitly requires team instructions plus the current member agent instructions | N/A | Locked | `requirements.md`, `workflow-state.md` |
| T-004 | 2026-03-09 | 3 | 4 | Proposed design completed; responsibility split fixed at bootstrap resolution, shared composition, and runtime-edge mapping | N/A | Locked | `proposed-design.md`, `workflow-state.md` |
| T-005 | 2026-03-09 | 4 | 5 | Future-state runtime model completed and Stage 5 review reached `Go Confirmed` after two clean rounds with no blockers or new use cases | N/A | Locked | `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` |
| T-006 | 2026-03-09 | 5 | 6 | Stage 6 implementation artifacts created and implementation execution formally opened | N/A | Unlocked | `implementation-plan.md`, `implementation-progress.md`, `workflow-state.md` |
| T-007 | 2026-03-09 | 6 | 7 | Source implementation and focused unit/runtime verification completed | N/A | Unlocked | `implementation-progress.md`, `workflow-state.md` |
| T-008 | 2026-03-09 | 7 | 8 | API and GraphQL E2E acceptance coverage completed | N/A | Locked | `api-e2e-testing.md`, `workflow-state.md` |
| T-009 | 2026-03-09 | 8 | 9 | Code review completed with no findings and size/decoupling gates satisfied | N/A | Locked | `code-review.md`, `workflow-state.md` |
| T-010 | 2026-03-09 | 9 | 10 | Docs-sync no-impact rationale recorded and handoff summary completed | N/A | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-011 | 2026-03-09 | 10 | 6 | User requested prompt-format refinement to use explicit team/agent/runtime section naming across Codex and Claude | Local Fix | Unlocked | `workflow-state.md` |
| T-012 | 2026-03-09 | 6 | 7 | Prompt-format refinement implemented and focused validation passed | Local Fix | Unlocked | `implementation-progress.md`, `workflow-state.md` |
| T-013 | 2026-03-09 | 7 | 8 | API/E2E and focused runtime regression validation passed for explicit section naming | Local Fix | Locked | `api-e2e-testing.md`, `workflow-state.md` |
| T-014 | 2026-03-09 | 8 | 9 | Code review reconfirmed explicit team/agent/runtime section separation with no findings | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-015 | 2026-03-09 | 9 | 10 | Docs-sync rationale refreshed and handoff summary updated after prompt-format refinement | Local Fix | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-016 | 2026-03-09 | 10 | 7 | User requested broader Claude and Codex backend validation and clarification on API/E2E prompt verification strength | Local Fix | Locked | `workflow-state.md` |
| T-017 | 2026-03-09 | 7 | 8 | Broader Claude/Codex backend validation completed with all runnable suites green and live transport suites skipped by design | Local Fix | Locked | `api-e2e-testing.md`, `implementation-progress.md`, `workflow-state.md` |
| T-018 | 2026-03-09 | 8 | 9 | Code review notes refreshed to capture remaining live-runtime validation boundary | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-019 | 2026-03-09 | 9 | 10 | Handoff refreshed after broader validation-only pass | Local Fix | Locked | `handoff-summary.md`, `workflow-state.md` |
| T-020 | 2026-03-09 | 10 | 7 | User requested explicit Codex-enabled backend validation with `RUN_CODEX_E2E=1` | Local Fix | Locked | `workflow-state.md` |
| T-021 | 2026-03-09 | 7 | 7 | Live Codex-enabled backend validation executed real Codex transport suites and exposed Stage 7 failures; return path reset to `6 -> 7` for local fix work | Local Fix | Locked | `implementation-progress.md`, `api-e2e-testing.md`, `workflow-state.md` |
| T-022 | 2026-03-09 | 7 | 6 | Failure analysis isolated a code-level regression candidate: single-agent Codex/Claude runtime adapters do not persist agent instructions in runtime metadata, leaving live sessions without definition-derived prompt guidance | Local Fix | Unlocked | `workflow-state.md`, `implementation-progress.md` |
| T-023 | 2026-03-09 | 6 | 7 | Merged the proven Codex stabilization delta into `codex/team-agent-instruction-composition`, synced the live Codex E2E harness, and completed focused merge verification | Local Fix | Unlocked | `implementation-progress.md`, `workflow-state.md` |
| T-024 | 2026-03-09 | 7 | 8 | Explicit live Codex validation reran green on the merged branch, including serialized `RUN_CODEX_E2E=1` coverage | Local Fix | Locked | `api-e2e-testing.md`, `workflow-state.md` |
| T-025 | 2026-03-09 | 8 | 9 | Code review refreshed for the combined prompt-composition plus Codex-stabilization diff with no findings | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-026 | 2026-03-09 | 9 | 10 | Docs-sync and handoff artifacts refreshed after the merged branch reached live Codex-green status | Local Fix | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-027 | 2026-03-09 | 10 | 7 | User requested explicit live Claude SDK validation on the merged branch to confirm the prompt changes under real Claude transport | Local Fix | Locked | `workflow-state.md` |
| T-028 | 2026-03-09 | 7 | 8 | Full live Claude SDK validation completed green on the merged branch under `RUN_CLAUDE_E2E=1` | Local Fix | Locked | `api-e2e-testing.md`, `implementation-progress.md`, `workflow-state.md` |
| T-029 | 2026-03-09 | 8 | 9 | Code review notes refreshed after the successful Claude validation-only pass | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-030 | 2026-03-09 | 9 | 10 | Docs-sync and handoff artifacts refreshed after the merged branch reached live Claude-green status as well | Local Fix | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-031 | 2026-03-09 | 10 | 6 | User verification exposed a local frontend regression: the activity panel resolves `send_message_to` correctly, but the main conversation/grid view falls back to `unknown_tool`; re-enter Stage 6 for a focused fix and Stage 7 rerun | Local Fix | Unlocked | `workflow-state.md` |
| T-032 | 2026-03-09 | 6 | 7 | Implemented the focused frontend placeholder-resolution fix so conversation segments and activity entries can upgrade `unknown_tool` to the concrete tool name when later metadata arrives | Local Fix | Unlocked | `implementation-progress.md`, `workflow-state.md` |
| T-033 | 2026-03-09 | 7 | 8 | Focused frontend regression verification passed: 32 tests green across segment, lifecycle, and activity-store coverage for the `send_message_to` label mismatch | Local Fix | Locked | `api-e2e-testing.md`, `implementation-progress.md`, `workflow-state.md` |
| T-034 | 2026-03-09 | 8 | 9 | Code review refreshed with no findings on the focused frontend delta | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-035 | 2026-03-09 | 9 | 10 | Docs-sync rationale and handoff summary updated after the focused frontend regression fix was revalidated | Local Fix | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-036 | 2026-03-09 | 10 | 6 | User feedback requested softer runtime wording so `send_message_to` reads as a conditional tool-usage rule rather than a collaboration-policy override | Local Fix | Unlocked | `workflow-state.md` |
| T-037 | 2026-03-09 | 6 | 7 | Adjusted the shared runtime wording so `send_message_to` guidance is explicitly conditional and purely mechanical | Local Fix | Unlocked | `implementation-progress.md`, `workflow-state.md` |
| T-038 | 2026-03-09 | 7 | 8 | Focused runtime prompt verification passed across the shared composer plus Claude and Codex renderers after the wording-only change | Local Fix | Locked | `api-e2e-testing.md`, `implementation-progress.md`, `workflow-state.md` |
| T-039 | 2026-03-09 | 8 | 9 | Code review refreshed with no findings on the wording-only runtime prompt delta | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-040 | 2026-03-09 | 9 | 10 | Docs-sync rationale and handoff summary updated after the wording-only runtime prompt refinement was revalidated | Local Fix | Locked | `docs-sync.md`, `handoff-summary.md`, `workflow-state.md` |
| T-041 | 2026-03-09 | 10 | 7 | User requested another full serialized live Codex plus live Claude validation round on the current merged branch | Local Fix | Locked | `workflow-state.md` |
| T-042 | 2026-03-09 | 7 | 8 | Latest serialized live Codex rerun passed at `12/12` files and `70/70` tests, and the serialized live Claude rerun passed at `12/12` files and `87/87` tests | Local Fix | Locked | `api-e2e-testing.md`, `implementation-progress.md`, `workflow-state.md` |
| T-043 | 2026-03-09 | 8 | 9 | Validation-only rerun did not introduce new review findings, so the review gate remains clean | Local Fix | Locked | `code-review.md`, `workflow-state.md` |
| T-044 | 2026-03-09 | 9 | 10 | Docs-sync rationale refreshed after the latest live Codex and live Claude reruns stayed green | Local Fix | Locked | `docs-sync.md`, `workflow-state.md` |
| T-045 | 2026-03-09 | 10 | 10 | Handoff summary refreshed after the latest serialized live Codex and live Claude validation round completed green | Local Fix | Locked | `handoff-summary.md`, `workflow-state.md` |
| T-046 | 2026-03-09 | 10 | 10 | User verified completion, requested commit, and the ticket was archived from `tickets/in-progress` to `tickets/done` before branch handoff | Local Fix | Locked | `handoff-summary.md`, `workflow-state.md` |

## Audible Notification Log (Optional Tracking)

| Date | Trigger Type (`Transition`/`Gate`/`Re-entry`/`LockChange`) | Summary Spoken | Speak Tool Result (`Success`/`Failed`) | Fallback Text Logged |
| --- | --- | --- | --- | --- |
| 2026-03-09 | Transition | Stage 0 and Stage 1 are complete for team-agent-instruction-composition. Work is now in Stage 2 with code edits locked while requirements are refined. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Team agent instruction composition is now through Stage 5. Requirements, design, and runtime review are complete, and the solution is ready for Stage 6 implementation while code edits remain locked until implementation starts. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stage 6 is now active for team agent instruction composition. Implementation has started, code edits are unlocked, and the next step is wiring the shared team plus agent instruction contract through bootstrap, Codex, and Claude. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stages seven through ten are now complete for team agent instruction composition. API and E2E validation, code review, and handoff artifacts are finished, code edits are locked, and the work is ready for your verification. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Re-entry | Stage six is reopened for a local formatting fix. Code edits are unlocked, and the next step is changing the shared prompt sections to explicit team, agent, and runtime instruction names for Codex and Claude. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stage ten is active again for team agent instruction composition. The prompt format refinement is complete, focused validation passed, code edits are locked, and the ticket is ready for user verification. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Re-entry | Stage seven is reopened for a validation-only pass. Code edits remain locked, and the next step is running the broader Claude and Codex backend suites and reassessing API/E2E validation strength. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stage ten is active again after the broader Claude and Codex backend validation pass. All runnable suites are green, live-runtime end-to-end tests were skipped by design, code edits remain locked, and the ticket is ready for user verification. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Re-entry | Stage seven is reopened for a Codex-enabled validation pass. Code edits remain locked, and the next step is running backend tests with `RUN_CODEX_E2E=1` and recording whether live Codex suites actually execute. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Gate | Stage seven failed under live Codex-enabled validation. Real Codex E2E suites executed, backend green status is not confirmed, code edits remain locked, and the next step is local failure analysis before returning to Stage six. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stage six is active again for team-agent-instruction-composition. Code edits are unlocked, the next step is threading single-agent agent instructions into Codex and Claude runtime metadata, and then rerunning live Codex validation. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Transition | Stage ten is active again for team-agent-instruction-composition. The Codex stabilization fixes are merged into this branch, live Codex validation is green, code edits are locked, and the ticket is ready for your verification. | Failed | Local TTS tool reported `mlx-audio` is outdated |
| 2026-03-09 | Re-entry | Stage seven is reopened for a live Claude validation pass. Code edits remain locked, and the next step is running the Claude live SDK suites with RUN_CLAUDE_E2E enabled on the merged branch. | Success | N/A |
| 2026-03-09 | Transition | Stage ten is active again for team-agent-instruction-composition. Live Claude validation is green alongside live Codex, code edits are locked, and the ticket is ready for your verification. | Success | N/A |
| 2026-03-09 | Transition | Stage ten is active again after the focused frontend tool-label fix. Verification passed, code edits are locked, and the ticket is back to waiting for your verification. | Success | N/A |
| 2026-03-09 | Transition | Stage ten is active again after the latest serialized live Codex and live Claude validation rerun. Both suites are green, code edits remain locked, and the ticket is back to waiting for your verification. | Success | N/A |
| 2026-03-09 | Transition | Stage ten archival is complete for team agent instruction composition. User verification was received, the ticket is archived under tickets done, code edits remain locked, and the branch is ready for commit handoff. | Success | N/A |

## Process Violation Log

| Date | Violation ID | Violation | Detected At Stage | Action Taken | Cleared |
| --- | --- | --- | --- | --- | --- |
