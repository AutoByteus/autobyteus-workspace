# Docs Sync Report — project-tool-split

## Scope

- Ticket: `project-tool-split` (split `create_or_update_project` into `create_project` and `update_project`; old tool kept, deprecated, for the transition)
- Trigger: CRR-002 post-API/E2E test-code review Pass (from `/software_engineering_team/code_reviewer`), after API-REV-001 Pass (95%)
- Bootstrap base reference: `origin/personal` @ `8a970f214c`
- Integrated base reference used for docs sync: `origin/personal` @ `e579e82b7f` (14 commits: delegated-team-aggregate-status, web Team status, plus an AGY failure-fixture routing addition), merged into the ticket branch as `1e8d2b601d` with no conflicts
- Post-integration verification reference: `evidence/delivery/dr-001/` (see `release-deployment-report.md`, Initial Delivery Integration Refresh)

## Why Docs Were Updated

- Summary: the implementation commit `285acae39a` already updated the long-lived docs for the two new tools and the deprecation. Delivery re-read them against the integrated state and found them accurate; no delivery edit was needed.
- Why this should live in long-lived project docs: agent tool names, their exact input contracts and the deprecation of `create_or_update_project` are what users and package authors select in agent definitions, and what FU-2 (removal) will later change.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | canonical tool contract; base also edited this file (status-fold paragraph, line ~819) | No change (already updated in `285acae39a`) | Heading `## Project And Task Agent Tools` (anchor `#project-and-task-agent-tools`) lists `create_project`, `update_project`, deprecated `create_or_update_project`; base's edit is in an unrelated section and merged cleanly. No link to the old anchor `#exactly-five-agent-tools` remains in the repo docs |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP catalog and Project Task Data Tools list | No change (already updated) | catalog list and per-tool bullets match the served descriptions (APP-NEW evidence) |
| `autobyteus-web/docs/projects.md` | user-facing Agent Tools section | No change (already updated) | lists the new tools, marks the old one deprecated, links the server anchor |
| `autobyteus-server-ts/docs/modules/agent_orgs.md`, `autobyteus-web/docs/agent_orgs.md`, `agent_teams.md`, `agent_execution_architecture.md`, `settings.md` | changed by the integrated base | No change | team-status topics; they name no Project tool |
| `TESTING.md` | changed in this branch by API/E2E at the user's direction (`1c7eb70151`, `7af116e8de`) | No change by delivery | reviewed in CRR-002; delivery does not edit it |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none by delivery) | — | The three docs above were updated in `285acae39a` and verified here | — |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One-meaning Project tools | `create_project` `{name, description?, workspaces?}` rejects `project_id`; `update_project` requires `project_id`, at least one change, a supplied `workspaces` list replaces all links | requirements-doc REQ-001/002, design-spec | `server docs/modules/projects.md#project-and-task-agent-tools`, `agent_tools_mcp_server.md` |
| Deprecated `create_or_update_project` | kept unchanged; it runs as `create_project` without `project_id` and as `update_project` with it; to be removed later (FU-2, user's timing, DEC-006) | requirements-doc REQ-004, DEC-002/004/006 | same, plus `autobyteus-web/docs/projects.md` |
| No automatic exposure; first-party name protection | none of the Project tools is added automatically; configured MCP tools named `create_project`/`update_project` are shadowed | REQ-003 | same |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Two-mode `create_or_update_project` as the only Project mutation tool | `create_project` and `update_project`; old name kept, deprecated | `projects.md#project-and-task-agent-tools`, `agent_tools_mcp_server.md`, web `projects.md` |
| Server docs heading "Exactly Five Agent Tools" | "Project And Task Agent Tools" (`#project-and-task-agent-tools`); all in-repo links updated | `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence and the handoff summary, then finalization. The user decided on 2026-10-17 to finalize on the evidence.
- Notes for FU-2 (removal of the old tool): the base added `autobyteus-web/tests/e2e/team-status-live-probe.mjs`, whose manager agent lists `create_or_update_project` (and the already-removed `create_or_update_task`). It works today (the old name is kept) but must move to the new names when FU-2 removes the old tool. Recorded as a follow-up note, not changed here (outside this ticket's scope).
