# Docs Sync Report — task-keys-declutter

## Scope

- Ticket: `task-keys-declutter` (Project Task `autobyteus-132`; `task_size=Small`, `architectural_risk=Low`, route: Direct)
- Trigger: API-REV-001 Pass (97.2%) from `/software_engineering_team/api_e2e_engineer`
- Bootstrap base reference: `origin/personal@aa84fd026c`
- Integrated base reference used for docs sync: `origin/personal@aa84fd026c`. The branch was already current (0 behind at delivery start).
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary: Board cards (page and tab) and the Workspaces-tree Task summary no longer show the Task key. The worker-Task answer (`TaskWorkerTaskView`) no longer carries `taskKey`. Keys stay on the Task page, in dependency rows, in the picker, in badges and in URLs.
- Why this should live in long-lived project docs: the web Projects doc and the server Projects doc describe exactly these surfaces and the worker answer's shape.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Worker-Task answer shape | No change (updated in the change) | `{taskId, projectId, description, status}`; the `taskKey` wording was removed |
| `autobyteus-web/docs/projects.md` | Card, tree summary, key surfaces | Updated (in the change + delivery) | The change rewrote the Card and tree-summary text. Delivery fixed the section's opening sentence, which still said every Project Task "shows its readable key" |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `agent_tools.md` | Agent-facing keys | No change | Agents still see and use keys; unaffected |
| `autobyteus-web/docs/agent_execution_architecture.md`, `agent_teams.md` | Links to the tree Task summary | No change | They link to `projects.md#task-summaries-in-the-workspaces-tree`, which the change updated |

Search across `autobyteus-server-ts/docs`, `autobyteus-web/docs` and `docs` for "key line", "<key> <summary>", "leads with its key" and `taskKey` on the worker answer: no stale text remains.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` (§ Task keys and "Depends on") | Correction | "shows its readable key" → "has a readable key", plus where it is shown (Task page chip, dependency rows, picker, badges, URLs) and where it is not (board cards, tree summary) | REQ-001–003 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Where keys appear | Keys appear only where they link to or refer to a Task | `requirements-doc.md` REQ-001–004 | `autobyteus-web/docs/projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Card key line (`project-task-row-key`) | None; the card starts with the summary | `autobyteus-web/docs/projects.md` § Card |
| Key in the tree Task summary, and `TaskWorkerTaskView.taskKey` | Summary only; the field is removed | `autobyteus-web/docs/projects.md` § tree summary; server `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, the release decision (stable vs beta; asked of the user), finalization
