# Docs Sync Report — task-comments

## Scope

- Ticket: `task-comments`, Project Task `autobyteus-259` Part 1 (add-only comments on Project Tasks), plus `autobyteus-187` (`partsNotClosed`).
- Trigger: API/E2E test-code review Pass (CRR-002) from `/software_engineering_team/code_reviewer`; Medium / High, reviewed route.
- Bootstrap base reference: `origin/personal` @ `786055f3d7`
- Integrated base reference used for docs sync: `origin/personal` @ `d8df12435c`, merged into `codex/task-comments` as `96625b9ba5`
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (DEL-01 to DEL-06)

## Why Docs Were Updated

- Summary: the ticket already updated the three docs that own the changed behavior (server `projects.md`, `agent_tools_mcp_server.md`, web `projects.md`). Delivery checked them against the integrated state and the evidence. Two summary lines elsewhere described the `delegate_task` work packet as only "description, reference files". For a saved Project Task, the work text now also carries the Task's comments (AC-010), so both lines gained a short clause and a link to the canonical section.
- Why this should live in long-lived project docs: the comment thread, `add_comment`, `partsNotClosed` and the Comments block in delegated work are agent-facing contracts that later tickets build on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Owner of the Task model, tools, GraphQL and delegation | No change (updated by the ticket) | "Task comments" matches API-02, API-03 and API-06: numbering, server time, trimmed text, one write with other fields, Temp-task refusal, no delivery to runs. `partsNotClosed` matches API-05. The linked-dispatch Comments block matches API-06 (`workA`, `workC`). |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Tool contract | No change (updated by the ticket) | `add_comment?`, `partsNotClosed`, `commentCount?` present |
| `autobyteus-web/docs/projects.md` | Task page, tab, board search | No change (updated by the ticket) | Matches API-08 and API-09 |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Summarizes the `delegate_task` work packet | Updated | One clause plus a link |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Summarizes the work packet for Team targets | Updated | One clause plus a link |
| `agent_communication.md`, `agent_team_execution.md:562`, `agent_tools.md:362` (`update_task({task_id, status: "DONE"})`) | Mention `update_task` | No change | Still accurate: they concern closing Tasks with no Project |
| `collaboration_model.md` CM-6 | Closing a parent closes its parts | No change | Still true; `partsNotClosed` only reports parts that fail, and is documented in `projects.md` |

Headings: the ticket only added headings ("Task comments", "Comments"), so no link can break.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Contract summary | "For a saved Project Task, the description is followed by the Task's comments as a "Comments:" block", with a link to `projects.md#saved-id-delegation-and-agent-run-resources` | AC-010 changed the work text |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Contract summary | The same clause in the Team work-packet sentence | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Task comments | Add-only, numbered, server-timed; written inside the Task's locked update; no delivery to running workers (FU-002 decides that later) | design-spec.md, requirements-doc.md | `projects.md` (ticket) |
| Comments in delegated work | Saved-Task dispatch appends a "Comments:" block; no IDs or times | design-spec.md | `projects.md` (ticket); `agent_tools.md`, `agent_team_execution.md` (delivery) |

## Removed / Replaced Components Recorded

- None. The change is additive.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, archive, finalization (no release).
- Follow-ups found by delivery: FU-005 (a race in `native-compaction-terminal-drain.test.ts`, outside this ticket), recorded in `follow-ups.md`.
