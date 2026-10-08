# Docs Sync Report — workspace-history-group-archive

## Scope

- Ticket: `workspace-history-group-archive` — "Archive all" from agent / agent team / Agent Org group headers in the Workspaces sidebar.
- Trigger: API/E2E **Pass** from `/software_engineering_team/api_e2e_engineer` (SR-003 / IR-001 / API-REV-001), direct route, `task_size=Medium`, `architectural_risk=Low`.
- Bootstrap base reference: `origin/personal` @ `4a51482a5ef8c678d69a3ffc995d6876fd170a2f`
- Integrated base reference used for docs sync: `origin/personal` @ `4a51482a5ef8c678d69a3ffc995d6876fd170a2f` (re-fetched 2026-10-08T05:27Z; unchanged, already current). Ticket HEAD `dc70e7f44cb0fa07a946776ab88ea5ed809f113e`.
- Post-integration verification reference: `delivery-evidence/dr-001/integration-refresh.log`, `delivery-evidence/dr-001/server-focused.log` (15/15), `delivery-evidence/dr-001/web-focused.log` (138/138).

## Why Docs Were Updated

- Summary: a new server mutation `archiveStoredAgentRunGroup` and a new UI action (group-header "Archive all runs") with all-or-nothing running-run semantics were added. The run-history module doc and the web archive section described only per-run archive.
- Why this should live in long-lived project docs: the server owns group selection so that runs beyond the 6-run cap are included. The all-or-nothing rule and the split between Team/Org (client loop) and agent groups (server mutation) are design decisions. Future changes to archive or the listing cap must preserve them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | GraphQL surface and archive semantics | Updated | New mutation listed; new "Group Archive From A History Header" subsection |
| `autobyteus-web/docs/agent_execution_architecture.md` | Owns "Workspace History Archive And Delete Actions" | Updated | New "Archive All From A Group Header" subsection |
| `autobyteus-web/docs/agent_orgs.md` | Documents Org row Archive/Delete | Updated | Org group-header archive and route cleanup |
| `autobyteus-web/docs/agent_teams.md` | Mentions Team Archive | No change | Only a lifecycle note; Team header behaviour now lives in the shared web section |
| `autobyteus-server-ts/docs/modules/agent_orgs.md`, `agent_team_execution.md`, `standalone_agent_run_root.md` | Per-family archive admission | No change | Server Team/Org archive unchanged; group archive reuses per-run paths |
| `autobyteus-web/docs/localization.md` | New en/zh-CN keys | No change | Keys follow existing catalog conventions; guard/audit pass |
| `TESTING.md` | Baseline test repair commit `dc70e7f44` | No change | Test-only repairs; no new durable command or rule |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | API surface + semantics | `archiveStoredAgentRunGroup(workspaceRootPath, agentDefinitionId)`: server-side selection beyond the cap, blank-input error, all-or-nothing `activeRunIds`, per-run `failedRunIds`, result shape, folders retained, idempotent; Team/Org use per-root mutations | New public mutation and behaviour |
| `autobyteus-web/docs/agent_execution_architecture.md` | UI behaviour + ownership | Group-header icon visibility, blocked toast, confirmation (agent "all runs" vs counted), pending, summary toasts, store dispatch per kind, one refresh per group | New UI action and owner composable |
| `autobyteus-web/docs/agent_orgs.md` | UI behaviour | Org group "Archive all runs" and route cleanup | Org doc enumerates Org history actions |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Server-owned agent group selection | The client sees ≤6 runs per agent; the server selects all unarchived rows by canonical root + definition | design-spec.md (DEC-001, DS-001) | run_history.md |
| All-or-nothing running rule | Any active run → nothing archived (`activeRunIds`). A run that starts after the check → `failedRunIds` | requirements-doc.md SR-003 delta (DEC-003, AC-005/AC-010) | run_history.md, agent_execution_architecture.md |
| Single refresh per group | The store archive cores were split out of the refreshing per-run wrappers | design-spec.md, implementation-handoff.md | agent_execution_architecture.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `archiveTeamRunInHistoryStore` / `archiveAgentOrgRunInHistoryStore` bodies (mutation + cleanup + refresh) | Private `archiveTeamRunRecord` / `archiveAgentOrgRunRecord` cores. Public per-run wrappers keep the refresh; group variants refresh once | agent_execution_architecture.md (group section) |
| Earlier SR-002 design `skippedActiveRunIds` (never shipped) | `activeRunIds` with all-or-nothing semantics | run_history.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary + user-verification hold.
- Notes: Pre-edit doc snapshots are in `delivery-evidence/dr-001/docs-before/`. The open Unclear item (AC-005 long message vs QR-003 short message; the implementation follows QR-003) is carried to the user. The docs describe the implemented QR-003 wording.
