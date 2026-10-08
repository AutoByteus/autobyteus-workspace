# Docs Sync Report

## Scope

- Ticket: `task-closed-status` (SR-004, IR-001, API-REV-001)
- Trigger: API/E2E Pass (95%) from `/software_engineering_team/api_e2e_engineer`, direct route (`task_size=Medium`, `architectural_risk=Low`); architecture review, code review and test-code review are `Not Applicable`
- Bootstrap base reference: `origin/personal` @ `3a2496c95b16b0f7e0cedc7afdf615ada00b2267`
- Integrated base reference used for docs sync: `origin/personal` @ `ace86bf1fb2e5e533e6f7b706179726a2db3bf8f` (13 new commits: idle-shutdown-background-tasks and the `v1.4.99-beta.1` release), merged into the ticket branch as `19a85ba3c`; re-integrated with `origin/personal` @ `b5e0da5081273d116d7edd2422c91a4402375913` (8 more commits: archived-open-run-disappears and `v1.4.99-beta.2`) as `151a67f19`, a clean merge whose only doc overlap was `autobyteus-web/docs/chat.md` (base's archived-run paragraph; no Task-status content)
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; logs in `delivery-evidence/`

## Why Docs Were Updated

- Summary: the implementation (`17e4299a6`) already synced the server and web docs for CANCELLED. A delivery review of the integrated state found three remaining DONE-only statements that are now untrue because CANCELLED uses the same terminal closure path (`isTerminalTaskStatus` → `closeAndWrite`): one came in with the base merge, one was an older damaged-file paragraph, and one was a stale code comment. The single merge conflict in `prompt_engineering.md` was resolved so that the doc matches the merged collaboration prompt word for word.
- Why this should live in long-lived project docs: the docs are the canonical description of Task status semantics, of the agent-facing collaboration prompt (a doc-to-source parity test pins it) and of damaged-resource behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Primary Task status/closure doc (REQ-014) | Updated | Implementation's CANCELLED sections verified accurate; the damaged-file paragraph (Q-3) corrected in delivery |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Merge conflict; mirrors the collaboration prompt | Updated | Conflict resolved as a union: base's background-task clause plus the ticket's CANCELLED wording; identical to the source |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Changed by the base merge (idle shutdown) | Updated | "Task DONE release" → "Task DONE or CANCELLED release" |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Mention-note DONE guidance | No change | Accurately quotes the mention-note text (`collaborator-mention-note.ts` L49 says DONE); changing that note is outside the approved scope |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Tool enums | No change | Implementation update verified (CANCELLED listed) |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Feed status values | No change | Implementation update verified |
| `autobyteus-server-ts/docs/modules/agent_execution.md`, `agent_tools.md`, `antigravity_cli_runtime.md` | Changed by the base merge | No change | Background-task idle wording; no Task status claims |
| `autobyteus-web/docs/projects.md` | Board, toggle, pills, Temp tasks (REQ-014) | No change | Implementation update verified against PMU-017 screenshots and the component sources |
| `autobyteus-web/docs/chat.md`, `autobyteus-web/AGENTS.md` | Implementation-touched | No change | Verified |
| `autobyteus-web/docs/agent_teams.md` | Changed by the base merge | No change | Background-task idle wording only |
| `autobyteus-web/components/projects/ProjectCard.vue` (comment) | Stale comment flagged by API/E2E (residual 3) | Updated | Comment only; no behavior change |
| `TESTING.md` | Updated by API/E2E | No change | The remaining DONE-only lines describe specific DONE test cases and the frozen three-status released reader, which is correct |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Merge resolution | Delegated Agents paragraph: a quiet copy is not shut down "while it has a running background task", and a copy whose Task is `DONE` or `CANCELLED` is stopped | The doc must equal the merged `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` (parity assertion) |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Correction | The root-stop fence and the "Task DONE or CANCELLED" release do not consult background tasks | CANCELLED stops copies through the same closure (REQ-002) |
| `autobyteus-server-ts/docs/modules/projects.md` | Correction | Damaged file: changes to an open status keep working; "assign, DONE and CANCELLED" fail with `TASK_AGENT_RESOURCES_UNAVAILABLE` | `isTerminalTaskStatus` routes CANCELLED through `closeAndWrite`, which needs the resource file |
| `autobyteus-web/components/projects/ProjectCard.vue` | Comment | "Open Tasks are those To Do or In Progress; Done and Cancelled Tasks are not open." | REQ-011; the old comment said "not Done" |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Terminal Task status | DONE and CANCELLED are both terminal through one rule (`isTerminalTaskStatus`): closure, stop, assignment refusal, reactivation refusal | `design-spec.md` | `autobyteus-server-ts/docs/modules/projects.md` (implementation), now with the damaged-file case |
| Cancelled display | Hidden by default; the "Cancelled (N)" toggle before Refresh; muted pill; open count = TODO + IN_PROGRESS | `requirements-doc.md` DEC-002 | `autobyteus-web/docs/projects.md` |
| Collaboration prompt | Idle shutdown with background tasks and CANCELLED stop/reopen in one paragraph | merge of both tickets | `autobyteus-server-ts/docs/modules/prompt_engineering.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/utils/projects/taskStatusLabelKey.ts` | `autobyteus-web/utils/projects/taskStatusPresentation.ts` (labels, pills, lanes, open count) | `autobyteus-web/docs/projects.md` |
| Three-status assumption in the released migration reader | Frozen `readReleasedTaskFileV1` (`released-project-folder-v1.ts`) | `TESTING.md`, `autobyteus-server-ts/docs/modules/projects.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold
- Notes: R-002 (the external Project Task Manager skill does not know CANCELLED) is an approved out-of-scope follow-up; it is not in this repository.
