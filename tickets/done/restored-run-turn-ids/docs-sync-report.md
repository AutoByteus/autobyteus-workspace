# Docs Sync Report

## Scope

- Ticket: `restored-run-turn-ids` (Project Task `autobyteus-526`, part of `autobyteus-530`), **round 1**: unique turn ids across restores (FU-002 of autobyteus-448), one identity per platform notice (SR-002), and the restart reminder card's time in the viewer's zone. `task_size: Medium`, `architectural_risk: High` (SR-002). Route: architecture review → implementation → code review → API/E2E → test-code review.
- Trigger: code reviewer handoff after CRR-003, 2026-11-18.
- Bootstrap base reference: `origin/personal` @ `2e9ac1e65b` (beta.10).
- Integrated base reference used for docs sync: `origin/personal` @ `bd2053ee51` (18 commits: autobyteus-517 item 1, autobyteus-524 round 2), merged as `bca734f83e`.
- Post-integration verification reference: `evidence/DEL-post-integration/` (`release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the change already documents the turn-id rule (`autobyteus-ts/docs/agent_memory_design.md`), notice identity (server `agent_execution.md`, web `agent_execution_architecture.md`) and the card's local time (server `restart_resume.md`). Delivery checked them against the merged code (`TurnTracker.continuingAfter`, `MemoryManager` line 117, `SystemTaskNotificationSegment.vue`). It added the card's local time to the web doc's `SYSTEM_TASK_NOTIFICATION` row, which until then said only that the display text is not rewritten.
- Why this should live in long-lived project docs: turn ids and notice ids are the keys every replay, stream buffer and web view groups by; future work on restores or notices builds on them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/agent_memory_design.md` | turn ids continue after the highest stored `turn_NNNN`, archived segments included; older runs keep duplicates | No change (updated by implementation) | matches `turn-tracker.ts` and `memory-manager.ts` |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`, `turn_terminology.md` | describe turn identity | No change | consistent: `MemoryManager.startTurn()` still creates the id |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | one `message_id` per notice on the message, stored trace, projection and streams; `null` for older traces. Also changed by the base (autobyteus-524 r2) | No change (updated by implementation; merged cleanly) | — |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | the card's local time; the agent's text stays UTC | No change (updated by implementation) | — |
| `autobyteus-web/docs/agent_execution_architecture.md` | `SYSTEM_TASK_NOTIFICATION` adds nothing for a shown id | Updated | the same row now names the card's local time (`utils/restartReminderLocalTime.ts`) |
| `autobyteus-web/docs/settings.md` | the stale duplicate (autobyteus-338 FU-001); the implementation updated its copy of the row | No change | — |
| `GLOSSARY.md` | restart reminder | No change | the entry does not state a time format; there is no platform notice entry to update |
| `DESIGN.md`, `TESTING.md`, `RELEASE.md` | project documents | No change | no ticket report recorded a discrepancy; the strict contract's new required field follows DESIGN.md rule 9 (no cross-version compatibility) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | accuracy | the `SYSTEM_TASK_NOTIFICATION` row: the restart reminder card shows the stored UTC time in the viewer's zone | REQ-003; the row said only that the display text is not rewritten |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| a restored native run's `TurnTracker` restarting at `turn_0001` | `TurnTracker.continuingAfter(stored ids)` | `agent_memory_design.md` |
| notices without identity across the snapshot and live paths | one `message_id` per notice on every copy; the web adds no notice it already shows | server `agent_execution.md`, web `agent_execution_architecture.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization per `RELEASE.md`, archive of the round's ticket folder, cleanup (the handoff's "each round ends with cleanup and a record copy").
