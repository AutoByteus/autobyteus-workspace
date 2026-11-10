# Handoff — Architecture Design Complete, round 2 (autobyteus-435, SR-002)

## Result

- Classification: `Architecture Design Complete` (revised after ARCH-REV-001 Fail / Design Impact)
- Package: `small-follow-ups-batch-435` (Task `autobyteus-435`)
- Solution revision: `SR-002`; classification unchanged: `task_size=Medium`, `architectural_risk=High`
- Next expected action: architecture re-review of SR-002 (DS-006 above all).

## What changed (by finding)

- **AR-001** — DS-006 write now has two entry forms: row tap, and Create run (`onLaunched(runId)` → `openRun({ replace: true, rowKey: agentRunRowKey(runId) })`). `agentRunRowKey` in `utils/runListProjection.ts` is the one writer of `agent:<id>` (the projection's two keys use it). Every `openRun` call names its subject with exactly one of `orgQuery`/`rowKey`. The phone's New run launches agent runs only (`useMobileRunSetupController.ts:17-19`). Test: launch → route has `row`.
- **AR-002** — DS-006 restore is now steps 1–7, owned by `useMobileSubjectRestore` (the shell only creates it in setup and reads `restoring`): `restoring` set synchronously in setup before the immediate subject-less-view watch, with `opening.begin(key)` so "Opening…" shows (DEC-015); readiness per kind — top-level: the first history read succeeded (`runHistoryStore.error === null` after `initialLoad`, which itself always resolves); Team member: `tree.revealRow(key)` over `entry.team.executionRows`; delegated task row: `collaboration.inspect(host)` settled, then `revealRow`. Not found after readiness → list; a failed read → list with its connection state (DEC-014, recorded with reasoning: a pending restore could not be ended by the list's Retry or poll). No timer.
- **AR-003** — DS-004 records the phone's other sockets and how each closes; FU-003 records `NodeChangeFeed` retrying credential-refusal closes.
- **AR-004** — the inactive digest's meaning is written per state (active: tree-filtered root set; inactive: the Task index's closed executions hosted by the run, not filtered by its stored tree).

## Approval basis

Requirements SR-002 approved by the Solution Designer within the direction, user informed in the conversation (2026-11-10). REQ-005 clarified (both entry forms; "Opening…"; outcomes after reads settle or fail); new AC-005-5…7; DEC-014, DEC-015. No `Needs user` decision.

## Workspace

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`, base `origin/personal` @ `310fc27452`; finalization target `origin/personal`. Ticket documents in `tickets/in-progress/small-follow-ups-batch-435/` (uncommitted).

## Artifacts

- requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (SR-002 entry), follow-ups.md (FU-001…003), design-review-report.md and architecture-review-revision-record.md (reviewer-owned, round 1), all in the ticket folder above.

## Route

Handoff rules applied (2026-11-10): "Architecture Design Complete with … architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
