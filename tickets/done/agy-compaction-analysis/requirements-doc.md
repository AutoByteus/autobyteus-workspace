# Antigravity (AGY) compaction detection and raw-trace rotation — requirements

## Status
- Package agy-compaction-analysis; revision SR-002; status **Approved** (user, 2026-10-04: "kick off the ticket", U03; 100%-proof condition, U04).
- Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis; branch codex/agy-compaction-analysis; base origin/personal @ 517409d40; finalization target origin/personal.
- Evidence: investigation-notes.md A01–A20; probes/. SR-001 draft text is superseded by this baseline (history in solution-revision-record.md).

## Problem
AGY compacts its context automatically. The stream reports each compaction as one `step_update` with `step_type:"checkpoint"`, `state:"DONE"`, a stable `step_index` and `duration_seconds` (proven three times across two conversations, A15, A17). AutoByteus drops this step (A03), so AGY raw traces never rotate and the UI never shows the compaction (A09).

## Behavior
| ID | Current | Desired | Preserved |
|---|---|---|---|
| BEH-A1 | One ever-growing active raw-trace file per AGY run | One archive segment per AGY compaction (AGY ≥ 1.2.16) | Raw-trace format and the shared rotation mechanism |
| BEH-A2 | No compaction shown | One completed compaction activity, with duration, per AGY compaction | Claude/Codex/AutoByteus compaction display |
| BEH-A3 | Older AGY: same as current | Older AGY (< 1.2.16) or unknown version: unchanged, no detection | — |
| BEH-A4 | Reopened AGY history shows the whole run | Reopened history shows work since the latest compaction (same as Claude/Codex) | Archives kept on disk and in the memory API |

## Scenarios
- SCN-A1: AGY auto-compacts during a turn (user_input → checkpoint DONE → agent_response → result). Outcome: one completed compaction, one marker, one archive. (Proven stream shape, A15/A17.)
- SCN-A2: multiple compactions in one conversation, with distinct step indices. Outcome: one marker and one archive each. (A17)
- SCN-A3: the same checkpoint step is delivered twice (defensive). Outcome: idempotent, no second rotation.
- SCN-A4: AGY older than 1.2.16, or the version is unreadable. Outcome: checkpoint ignored as today.

## Requirements and acceptance
| REQ | Outcome | Acceptance |
|---|---|---|
| REQ-A01 | On AGY ≥ 1.2.16, each `checkpoint` step_update with state DONE produces exactly one rotation-eligible compaction boundary and one archive segment. | AC-A01a: replay of the recorded frames (probes/agy-stream-auto-compaction-twice-raw.jsonl) through the converter and memory recorder gives 2 markers and 2 archive segments. AC-A01b: scripted fake-CLI E2E through the real server gives one archive segment and one completed COMPACTION_STATUS. AC-A01c: an opt-in live E2E inducing auto compaction with large messages gives ≥1 archive segment. |
| REQ-A02 | One COMPACTION_STATUS (status "compacted") per checkpoint, carrying duration; no started phase (AGY sends none). | AC-A02: the event carries provider "antigravity", provider_event_id per step, and duration_ms from duration_seconds. |
| REQ-A03 | Metadata = duration only (from the stream). | Covered by AC-A02. |
| REQ-A04 | Detection is active only when the AGY CLI version is ≥ 1.2.16; otherwise checkpoint steps are ignored. | AC-A04: version below 1.2.16 or unparsable → no marker and no rotation; ≥ 1.2.16 → detection. |
| REQ-A05 | Other step types and runtimes unchanged; a duplicate checkpoint is idempotent. | AC-A05: existing AGY/Claude/Codex/memory/history suites pass; a duplicate step_index yields no second archive. |

## Decisions (approved)
DEC-A01 `/compact` in AGY runs unchanged (AGY fakes it; known limitation, follow-up candidate). DEC-A02 observe automatic compaction only. DEC-A03 duration only. DEC-A04 version gate ≥ 1.2.16 (the proven version; older versions untestable). DEC-A05 replay + scripted fake-CLI E2E + opt-in live E2E. Historical AGY raw traces are not rewritten.

## Out of scope
Manual compaction for AGY (not available in AGY 1.2.16); a started phase; failure reporting (not observable); reading AGY transcript summaries; Grok/Codex; UI for archived history.
