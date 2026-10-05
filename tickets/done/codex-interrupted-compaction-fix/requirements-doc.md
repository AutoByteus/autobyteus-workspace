# Codex interrupted-compaction fix — requirements

## Status
- Package codex-interrupted-compaction-fix; revision SR-002; status **Approved** (user, 2026-10-04: "bootstrap a new ticket to work on … the interrupted-compaction fix … no need to approve now its clear", U03).
- Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix; branch codex/codex-interrupted-compaction-fix; base origin/personal @ 03d5db06b; finalization target origin/personal.
- Evidence: investigation-notes.md C01–C16; probes/. SR-001 draft (package codex-compaction-analysis) offered REQ-C02 (/compact), deferred to a later cross-runtime ticket, and REQ-C03 (historical display), rejected as not valuable (U02).

## Problem
When a Codex compaction is interrupted or otherwise abandoned, Codex ends the turn (e.g. `turn/completed` status "interrupted") without sending `item/completed` for the contextCompaction item (proven live, C10/C11). AutoByteus never closes the compaction, so the live UI and reopened history show a compaction "started" that never ends. There are 32 real cases (C06). Rotation of completed compactions is correct and stays unchanged (C04).

## Behavior
| ID | Current | Desired | Preserved |
|---|---|---|---|
| BEH-C1 | An abandoned compaction stays "started" in the UI and in raw traces | It ends as failed/interrupted (same activity), with a reason, and no rotation | Completed compactions rotate exactly as today |
| BEH-C2 | Run terminate during compaction leaves it open | Closed as failed before the run's events stop | Terminate behavior otherwise unchanged |

## Scenarios
- SCN-C1: interrupt during automatic compaction (item/started X → turn/completed interrupted). Outcome: started(X) then failed(X, "interrupted"); no archive; the next turn's compaction Y pairs normally. (Proven C10.)
- SCN-C2: interrupt during manual compaction (compact turn). Same outcome. (Proven C11.)
- SCN-C3: a turn ends with status completed or failed while X is still open (not observed; defensive). Outcome: failed(X) with the matching reason.
- SCN-C4: Codex app server closes, or a terminal runtime/turn error occurs, while X is open. Outcome: failed(X).
- SCN-C5: the run is terminated while X is open. Outcome: failed(X) is emitted before listeners detach.
- SCN-C6: normal compaction (started → completed). Outcome unchanged: one completed activity, one archive.

## Requirements and acceptance
| REQ | Outcome | Acceptance |
|---|---|---|
| REQ-C01 | Every Codex compaction that started is eventually closed: completed (unchanged) or failed when its turn/run ends first (turn/completed of any status, terminal turn/runtime error, app-server close, run terminate). The close uses the same provider_event_id (item id), status "failed", rotation_eligible false and an error_message naming the reason. | AC-C01a: replaying probes/codex-interrupt-auto-raw.jsonl and probes/codex-interrupt-manual-raw.jsonl through the Codex converter and memory recorder gives started+failed markers for the same id, no archive for it, and a later normal pair with exactly one archive. AC-C01b: unit coverage for the completed-status, failed-status, terminal-error, app-server-close and terminate paths. AC-C01c: web/history show one activity ending as failed (no stuck started). AC-C01d: an opt-in live E2E (RUN_CODEX_E2E=1) interrupts an automatic compaction (lowered model_auto_compact_token_limit) through AutoByteus and observes the failed close. |
| REQ-C04 | No regression: completed compactions, rotation, dedupe, Claude/AGY paths and existing history unchanged; no data migration; the 32 historical cases are not rewritten. | AC-C04: existing Codex, memory, history, Claude and AGY suites pass. |

## Out of scope
`/compact` handling (later cross-runtime ticket); display fix for historical abandoned markers; Codex compaction metadata (not provided by Codex); compaction failure from the model side (not reproducible).
