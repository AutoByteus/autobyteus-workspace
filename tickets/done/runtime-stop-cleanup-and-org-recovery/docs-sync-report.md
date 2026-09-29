# Docs Sync Report

## Scope

- Ticket: `runtime-stop-cleanup-and-org-recovery`
- Trigger: CRR-004 post-API/E2E test-code review Pass on the reviewed route (`task_size=Medium`, `architectural_risk=High`). The chain is SR-004, ARCH-REV-003, IR-002, CRR-003, API-REV-002 and CRR-004.
- Bootstrap base reference: `origin/personal@5d6179797`
- Integrated base reference used for docs sync: `origin/personal@c84b577399ab4cc8f9c1b3d55b1cadd80c9b4ce6` (1.4.91-beta.6). It was merged into the ticket branch as `c9d8abdf3`.
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh" and "Verification Checks"

## Why Docs Were Updated

- Summary: implementation commit `299875113` already updated the three canonical module docs. Delivery verified them against the final integrated code and fixed one formatting defect that the code reviewer flagged.
- Why this should live in long-lived project docs:
  - AGY stop semantics now differ from the previous "known limitation". AutoByteus stops AGY's background process groups.
  - Team and Org Stop/restore semantics for roots with dead members are a durable runtime contract.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Owns the AGY stop/background contract | No change (already updated in `299875113`) | The previous F-API-001 "known limitation" paragraph is replaced. The following claims were verified against code: `ps -A -o pid=,ppid=,pgid=` with a 2 s timeout (`PS_TIMEOUT_MS`); exclusion of AGY's group, the server's group and pgid ≤ 1; SIGKILL after 1.5 s (`BACKGROUND_GROUP_KILL_DELAY_MS`) on an unref'd timer; the `AGY_BACKGROUND_GROUP_STOP_FAILED` log; and the win32 skip. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team root Stop/restore and member re-activation contract | Updated (formatting) | Content verified, including the `TEAM_RUN_STOP_INCOMPLETE` code. One over-long line was reflowed and the workspace sentence was split into its own paragraph (reviewer note). |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org Stop/restore and crashed-member continuation | No change (already updated in `299875113`) | Verified, including the `AGENT_ORG_STOP_INCOMPLETE` code. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Generic runtime stop text | No change | It has no AGY background-process claims. |
| `README.md`, `autobyteus-web/docs/*`, `docs/*` | Searched for stale "must be stopped manually" / "survives SIGTERM" claims | No change | No stale claims found. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Formatting | Reflowed the paragraph where "A failed first activation keeps the original mode." ran into the pre-existing workspace sentence on one over-long line. The workspace sentence is now its own paragraph. | Readability. Non-blocking cleanup noted by code_reviewer. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY background-group stop | AutoByteus-initiated stops signal AGY-descendant process groups: SIGTERM, then SIGKILL 1.5 s later. Documented limits: crash orphans, self-detaching commands, Windows, SIGTERM-ignoring daemons at quit, and hard kill. | design-spec.md, api-e2e-execution-coverage-report.md | antigravity_cli_runtime.md |
| Dead-member Stop/restore | A member that is no longer published counts as terminated. Failed attempts are not cached. Restore of a registered-but-inactive root completes termination first, and otherwise reports `*_STOP_INCOMPLETE`. | design-spec.md, requirements-doc.md | agent_team_execution.md, agent_orgs.md |
| Crashed-member continuation | After a handle has published once, a re-activation plans as `restore`, so the member continues its persisted provider conversation. | design-spec.md | agent_team_execution.md, agent_orgs.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Known limitation: AGY-backgrounded daemons survive Stop/Terminate" (from agy-background-task-turn-liveness) | AGY background process-group stop in `AgyStreamProcess.stop()` via `agy-background-process-groups.ts` | antigravity_cli_runtime.md |
| `TeamRunService.restoreTeamRun` pre-guard ("already managed") | The manager decides; it completes termination or reports `TEAM_RUN_STOP_INCOMPLETE` | agent_team_execution.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and hold for explicit user verification.
- Notes: from the test-review notes, delivery also corrected N-T3 in a comment only. The live recovery suite's header now says "about 4 minutes" instead of "about 15 minutes", matching the reported runtime of about 3.5 minutes. N-T1 (helper duplication) and N-T2 (the must-be-last ordering comment) are left as non-blocking test-maintenance notes.
