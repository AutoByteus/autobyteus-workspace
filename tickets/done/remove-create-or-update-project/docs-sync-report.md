# Docs Sync Report — remove-create-or-update-project

## Scope

- Ticket: `remove-create-or-update-project` (remove the deprecated `create_or_update_project` agent tool; `create_project`/`update_project` unchanged)
- Trigger: CRR-003 post-API/E2E test-code review Pass (from `/software_engineering_team/code_reviewer`), after API-REV-001 Pass (96%)
- Bootstrap base reference: `origin/personal` @ `2f211340ee`
- Integrated base reference used for docs sync: `origin/personal` @ `f3124db10f` (16 commits: standalone NFS extraction, PB-001 input-state cadence fix, unused-import cleanups), merged as `8b3a202d27` with no conflicts
- Post-integration verification reference: `evidence/delivery/dr-001/`

## Why Docs Were Updated

- Summary: the change commit `6ba0389741` removed the old tool from the long-lived docs. Delivery re-read them on the integrated state and found them accurate. Delivery made no doc edit.
- Why this lives in long-lived docs: agent tool names and contracts are what users and package authors select.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | canonical tool contract | No change (updated in `6ba0389741`) | `## Project And Task Agent Tools` lists only the six Project/Task tools; no deprecation or transition text remains; anchor `#project-and-task-agent-tools` intact, and every in-repo link resolves |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP catalog | No change (updated) | catalog and per-tool bullets list `create_project`/`update_project` only |
| `autobyteus-web/docs/projects.md` | user-facing Agent Tools section | No change (updated) | the old name is not mentioned (DEC-005) |
| Docs changed by the integrated base (`RELEASE.md` NFS section, NFS and server docs) | base changes | No change | name no Project tool; no file overlaps this ticket |
| `.github/release-notes/release-notes.md` | DEC-004 | No change by delivery | it is the **v1.5.5** stable release's notes (last written by `696e09b374`), so "still works but deprecated" is true for v1.5.5. A beta uses generated notes and leaves it alone. A stable v1.5.6 needs cumulative notes since v1.5.5 that include this removal (see `release-deployment-report.md`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none by delivery) | — | the three docs above were updated in `6ba0389741` and verified here | — |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Project mutation tools | only `create_project` and `update_project` exist; unknown configured names (including the removed one) are skipped without an error | requirements-doc REQ-001/002, DEC-005 | `projects.md#project-and-task-agent-tools`, `agent_tools_mcp_server.md`, web `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `create_or_update_project` (deprecated since project-tool-split), `CreateOrUpdateProjectTool`, its contract entry and dispatch rule | `create_project`, `update_project` | the same three docs; the ticket's `release-notes.md` announces the removal |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization and beta `v1.5.6-beta.2`, decided by the user on 2026-10-18.
