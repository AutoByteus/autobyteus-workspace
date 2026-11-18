# API-15 — AC-010 review: the Project Task Manager skill against the shipped shapes

- Case: API-15 (review). Date 2026-10-25.
- Skill: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty-agents`, commit `82b7bae` (`agents/project-task-manager/skills/project-task-management/SKILL.md`, `agents/project-task-manager/agent-config.json`).
- Shipped shapes: as observed at the real transport in this round: `API-06-get-project-task-worker-scope-receipt.json` (`get_project_task`, `list_project_tasks`, first messages), API-01 (`project-task-boundaries` TTL-API-001/GET-API-001, `project-task-search` hits).

| Skill sentence (SKILL.md line) | Shipped behavior observed | Match |
| --- | --- | --- |
| 21: `search_project_tasks` returns "each with its key, status and title"; "When it returns `meaningSearch`, meaning search was not fully used" | search hit `{taskId, status, title, match}`, no `meaningSearch` when ready; present with `note` when unavailable (`project-task-search`, `project-task-search-model-unavailable`) | Yes |
| 22: `list_project_tasks` "returns short entries: each Task's key, title, status, relations, comment count and open assignments" | `{projectId, tasks:[{taskId, title, status, dependsOn?, partOf?, parts?, commentCount?, assignments?}]}` (API-06 receipt, last result) | Yes |
| 22: "For one Task's full description, comments, context files or closed assignments, call `get_project_task` with its Project and key"; closed assignments of a DONE Task via `get_project_task` | `get_project_task` returns description, comments, `contextFiles` `{name, path}`, `closedAssignments` (GET-API-001; `task-existing-copy-assignment` full Task A) | Yes |
| 52: "read its comments (`get_project_task` shows them)" | comments' texts, oldest first (CMT-API-001) | Yes |
| 56: `create_task` requires the `title` field; fix an older one with `update_task` `title` | `TASK_TITLE_REQUIRED` without/blank; `update_task title` changes it (TTL-API-001) | Yes |
| 69: the worker's first message names `Task: <key> in Project <projectId>` | first messages in the API-06 receipt (new copy and existing copy) | Yes |
| 84: `update_task` "should return no `closedParts` when you close a parent DONE" | `closedParts` absent when nothing was closed (POF-API-001 "repeat of the same status") | Yes |
| 46: lists and search "show each Task's `partOf` and a parent's `parts`" | present when they have a value | Yes |
| `agent-config.json`: `get_project_task` in the PM's tools | exposure is opt-in by definition (SCP-E2E-004: listed → present on MCP and native; not listed → absent) | Yes |

Result: the skill's text matches the shipped shapes (AC-010). No sentence still claims full Tasks in lists, a `summary` field, `meaningSearch: ready`, or `target_agent_run_id: null`.
