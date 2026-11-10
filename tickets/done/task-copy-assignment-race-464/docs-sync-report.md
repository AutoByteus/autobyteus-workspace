# Docs Sync Report

## Scope

- Ticket: `task-copy-assignment-race-464` (Project Task `autobyteus-464`, FU-005 of autobyteus-447)
- Trigger: API/E2E test-code review Pass `CRR-002` after API/E2E Pass `API-REV-001` (reviewed route, `task_size: Small`, `architectural_risk: High`)
- Bootstrap base reference: `origin/personal` @ `c8f303af70`
- Integrated base reference used for docs sync: `origin/personal` @ `16947ba681` (merged as `a966ed4754`, no conflicts; brought in autobyteus-338 run_bash background, autobyteus-12 semantic memory, release-beta-468)
- Post-integration verification reference: `evidence/delivery/DEL-02-focused-unit-and-typecheck.log`, `evidence/delivery/DEL-03-gated-race-suites-summary.log`

## Why Docs Were Updated

- Summary: the root's lifecycle queue now orders a copy's closure release (after DONE/CANCELLED) with the reopening commits of an existing-copy assignment and of a reactivation. Implementation already updated the two module docs and the design case. Docs sync checked them against the integrated final state; no further edit was needed.
- Why this should live in long-lived project docs: future changes to copy lifecycle steps must keep them in the same queue. The ordering rule is the invariant this race broke.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` (existing-copy assignment steps) | changed by this ticket | No change (updated in `c29edfb1f7`) | Step 3 states the queue order: a DONE's release that comes first is settled before the commit; one after finds the copy open and stops nothing |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` (root command queue) | changed by this ticket and by autobyteus-338 in the base | No change | Auto-merged: this ticket's queue paragraph (line 612) and 338's idle-shutdown wording (native `run_bash` background) are both present and consistent |
| `docs/design-cases.md` Case 1 | design case note added by this ticket | No change (updated in `c29edfb1f7`) | — |
| `DESIGN.md` | project design rules | No change | No new principle; Case 1 holds the lesson |
| `TESTING.md` | testing guideline | No change | The suites used (`RUN_AGY_FAILURE_E2E`, scripted AGY) are as documented; no reported discrepancy |
| `RELEASE.md` | release guide | No change | Followed as written |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None in docs sync | — | — | Implementation's updates already match the final state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One queue for every copy transition | A copy's closure release and a reopening step with its commit run in the root's FIFO queue; remote copies are fenced outside it | `design-spec.md` D1–D3 | `agent_team_execution.md`, `projects.md` (implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Closure release outside the root queue; reopening commit after its queue step | Release and commit inside one queue step | `agent_team_execution.md`, `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and finalization under `RELEASE.md`
- Notes: no new follow-up from docs sync. FU-001 (CM-E2E-2 stale words since autobyteus-435) stays in `follow-ups.md`.
