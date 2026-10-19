# Docs Sync Report — task-part-of

## Scope

- Ticket: `task-part-of` (Project Task `autobyteus-171`): a "part of" relationship between Project Tasks.
- Trigger: API/E2E test-code review Pass (CRR-002) from `/software_engineering_team/code_reviewer`; route Large / High, reviewed.
- Bootstrap base reference: `origin/personal` @ `cba6b85122`
- Integrated base reference used for docs sync: `origin/personal` @ `8d40ba3b6c`, merged into `codex/task-part-of` as `afb2b814c2`
- Post-integration verification reference: `handoff-summary.md` and `release-deployment-report.md`, "Initial Delivery Integration Refresh" (DEL-01 to DEL-04)

## Why Docs Were Updated

- Summary: the ticket's implementation commits already updated the three Projects docs (server `projects.md`, `collaboration_model.md` CM-6, web `projects.md`). Delivery checked them against the integrated state and the validated behavior, and found two more server docs that still described the pre-change contract. One of them only went stale because the ticket renamed a heading.
- Why this should live in long-lived project docs: the Project Task tool contract (`part_of`, `partOf`, `parts`, `closedParts`, `TASK_PARENT_INVALID`) is agent-facing and read by later tickets. The cascade on DONE / CANCELLED is a lifecycle rule that changes what one `update_task` does to task agents.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | The model, rules, tool tables, GraphQL and feed for Projects | No change (updated by the ticket) | Checked against API-02, API-03, API-05: parent rules, clear / keep by value, the cascade, `TASK_PART_CLOSE_FAILED`, delete cleanup with `updatedAt` kept, `closedParts`. Accurate. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-6 (closing a Task stops its delegated runs) | No change (updated by the ticket) | The base also changed this file (section 3, Work Journal). The merge kept both, and CM-6 still carries the parts sentence. |
| `autobyteus-web/docs/projects.md` | The board, Task page, tab and editor | No change (updated by the ticket) | Matches API-08 / API-09 (Parts card, Part of card, New part, hint, delete note). |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Lists the Project Task tool arguments and results | Updated | It still described `create_task` / `update_task` without `part_of`, and search results without `partOf` / `parts`. Its link to `projects.md#task-keys-and-depends-on` was also broken by the heading rename. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Links to the renamed Task keys section | Updated | The anchor was fixed. Its `update_task` text concerns Tasks with no Project, which this change does not affect. |
| `autobyteus-web/docs/agent_orgs.md`, `agent_teams.md` | Mention "Depends on" | No change | They mean definition dependencies, which are unrelated. |
| `autobyteus-web/resources/server/docs/**` | A copy of the server docs | No change | It is gitignored build output. |
| `RELEASE.md`, `TESTING.md`, `DESIGN.md` | Process guides | No change | The base's DESIGN.md change ("no compatibility between different software versions") agrees with DEC-009. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Contract sync | `search_project_tasks` result gains `partOf`, `parts`. `create_task` / `update_task` gain `part_of?` (`""` clears on update and is an argument error on create; omitted keeps; one level; `TASK_PARENT_INVALID`; nothing written on refusal). The cascade on DONE / CANCELLED and `closedParts` are described, and projections now list `partOf` / `parts`. The link points to the renamed section. | The doc described the pre-change contract. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Link fix | `projects.md#task-keys-and-depends-on` → `#task-keys-depends-on-and-part-of` | The ticket renamed the heading to `Task keys, "depends on" and "part of"`. A repo-wide search now finds no remaining links to the old anchor. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| "Part of" model and rules | An optional `partOfTaskId` with one level, the same Project and the shared relations lock. Absent means no parent, with no migration. | design-spec.md, requirements-doc.md (DEC-009) | `projects.md` (ticket), `agent_tools_mcp_server.md` (delivery) |
| Cascade on parent close | DONE / CANCELLED closes the open parts through `update()`, so their runs close too. A part that fails is logged and skipped. `closedParts` lists the parts that closed. | design-spec.md DS-003, ARCH-REV-001 | `projects.md`, `collaboration_model.md` CM-6 (ticket), `agent_tools_mcp_server.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TaskDependencyWrites` (`task-dependency-writes.ts`) | `TaskRelationWrites` (`task-relation-writes.ts`) | `projects.md` (ticket) |
| Section `Task keys and "depends on"` | `Task keys, "depends on" and "part of"` | `projects.md`; links fixed in `agent_tools*.md` (delivery) |
| `TASK_DEPENDENCY_CLEANUP_FAILED` log code | `TASK_RELATION_CLEANUP_FAILED` | `projects.md` (ticket) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, archive, finalization (no release).
- Notes: the docs edits are text only. The integrated-state checks cover the code.
