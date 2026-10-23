# Docs Sync Report — task-agent-several-tasks

## Scope

- Ticket: `task-agent-several-tasks`, Project Task `autobyteus-275`: a task agent may hold several Tasks given by `delegate_task`.
- Trigger: API/E2E test-code review Pass (CRR-005) from `/software_engineering_team/code_reviewer`; Small / High, reviewed route.
- Bootstrap base reference: `origin/personal` @ `3b09fbe308`
- Integrated base reference used for docs sync: the same. `origin/personal` had not moved (fetched 2026-10-23), so there was nothing to integrate.
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh"

## Why Docs Were Updated

- Summary: the ticket updated the server docs that own the rule: `collaboration_model.md` (CM-6 and a status row), `projects.md` and `agent_team_execution.md`. Delivery checked them. The web doc's "Task root line" was still true but incomplete: one root can now appear on several Task pages, the help line under "Assigned to" changed (AC-011), and a closed Task's root reads Offline while the same team still works on another open Task (the approved residual risk). One paragraph was added.
- Why this should live in long-lived project docs: what the app shows for a team with several open Tasks would otherwise look like a bug (Offline on one page, live on another).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-6 (closing stops delegated runs) | No change (updated by the ticket) | The status row states the several-open-Tasks rule |
| `autobyteus-server-ts/docs/modules/projects.md` | Owner of assignment, current Task and closure | No change (updated by the ticket) | "Its current Task is its newest open one"; matches API-05 SEV-002 (sub-work under the newest Task) |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team copies and delegation | No change (updated by the ticket) | — |
| `autobyteus-web/docs/projects.md` "Task root line" | What the Task page shows for a root | Updated | One paragraph: several Task pages per root, the new help line, Offline on a closed Task's page |
| `autobyteus-server-ts/docs/modules/agent_tools.md:365` | "marks it DONE …, which stops the copy" | No change | About Temp tasks (description-only delegation), unchanged by this ticket (DEC-010) |
| `autobyteus-server-ts/docs/modules/agent_communication.md` "Stop" | Stopping a copy | No change | The user's stop, not Task closure |
| Docs mentioning "busy" (run status) | Search for the removed busy refusal | No change | All about run status, unrelated |

The ticket renamed no headings.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Behavior description | Added a paragraph to "Task root line": one agent or team can hold several open Tasks; the help line (`projects.root.help`) says it stops when its last open Task is Done or Cancelled; a closed Task's root reads Offline while that Task's page for another open Task shows it live | AC-010 and AC-011; ARCH-REV-003 residual risk |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The `delegate_task` refusal "This task agent still works on Task A (TODO/IN_PROGRESS) …" | Acceptance, with a message naming the other open Tasks | `projects.md` (ticket) |
| "One current Task per copy" (closing it stops the copy) | A copy holds several open Tasks; it stops when its last open Task closes; its current Task is its newest open one | `collaboration_model.md`, `projects.md` (ticket); web `projects.md` (delivery) |
| Help line "When the Task is Done, this agent or team stops." | "This agent or team stops when its last open Task is Done or Cancelled." | web `projects.md` (delivery) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: the user's check (required by the Task's "Done when"), then archive and finalization (no release).
