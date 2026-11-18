# Docs Sync Report — agent-tool-results-omit-empty (autobyteus-260)

`task_size` Large · `architectural_risk` High · reviewed route.

## Scope

- Ticket: autobyteus-260, `agent-tool-results-omit-empty`
- Trigger: code reviewer handoff after CRR-006 (source review of the DR-001 fix), API-REV-003 Pass (95%), CRR-007 (test-code review Not Applicable)
- Bootstrap base reference: `origin/personal@fc06a7355d`
- Integrated base reference used for docs sync: `origin/personal@84dc0b2156` (merges `54cd6803f4` of `63a36d00d8` and `3531463a04` of `84dc0b2156`)
- Post-integration verification reference: `evidence/DEL-02-integrated-server-typecheck-and-unit.log` (see `release-deployment-report.md`)

## Why Docs Were Updated

- Summary: implementation already updated the long-lived docs for the one tool result rule, Task titles, `get_project_task`, short lists, the titles migration and `list_available_agent_runtimes` (IR-001 to IR-004). Delivery reviewed them against the integrated state. It fixed the remaining AC-009 wording: a Task's one-line name was called "summary" in three PMU lines of the web Projects doc (API-14).
- Why this should live in long-lived project docs: AC-009 makes "title" the only name for a Task's one-line name (GLOSSARY "Title" / "Summary").

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | AC-009 wording (API-14), titles in the UI | Updated | lines 694–706. The "Task summaries in the Workspaces tree" section names `TaskWorkerTaskSummary`, a summary in the GLOSSARY sense, so it stays. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | the one result rule; `list_available_agent_runtimes` after DR-001 | No change | the rule is at line 44; the runtimes tool's null-field omission is at lines 231–232 (`7c60cb4909`) |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | report shape after DR-001 | No change | line 146: "its null values are left out" |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | `get_project_task`, result shapes | No change | lines 255, 330 |
| `autobyteus-server-ts/docs/modules/projects.md` | title field, titles migration, `get_project_task` | No change | lines 112–124, 512, 547–565 |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `send_message_to` results without the null rule | No change | updated in the ticket |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | rollback after a migration | No change | §4 already says what release notes must say; the release notes follow it |
| `GLOSSARY.md` | Title / Summary terms; merge with Agent Runtimes | No change (merge resolved) | both sections kept in merge `54cd6803f4` |
| `docs/design-cases.md` | SR-012 Case 8 | No change | committed in `269dbc209f` |
| `autobyteus-web/docs/settings.md` | Model Routing reads GraphQL, not the tool | No change | GraphQL keeps its nulls |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Wording (PMU-013, PMU-014) | "summary" → "main line (the title, or a Temp task's first line)" for card text and the delete confirmation | AC-009: a Task's one-line name is its title, never a summary. "Main line" is the doc's own term (line 127). |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One tool result rule | every platform tool result goes through `toToolResultJson` / `toAgentToolsMcpStructuredJsonResult`, enforced by `tests/architecture/agent-tool-result-boundaries.test.ts`; a new tool must use them (DR-001 showed why) | design spec, DR-001 | `agent_tools.md` (already there) |
| Titles migration rollback | rolling back after the titles migration is unsupported | design spec Migration Plan | release notes; `data_migration_guideline.md` §4 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| per-family serializers (`json-utils`, `toJsonString`, `toBrowserJsonString`, `toTaskDelegationJsonString`, `toMediaJsonString`) | `toToolResultJson` (autobyteus-ts) and the MCP structured helper | `agent_tools.md` |
| `search_project_tasks` `summary` | `title` | `projects.md` (server), `agent_tools_mcp_server.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification record, handoff summary, archive, finalization, beta.
