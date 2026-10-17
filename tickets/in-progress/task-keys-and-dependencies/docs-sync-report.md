# Docs Sync Report

## Scope

- Ticket: `task-keys-and-dependencies` (`task_size=Large`, `architectural_risk=High`, route: Reviewed)
- Trigger: CRR-003 Pass (test-code review) from `/software_engineering_team/code_reviewer`, after API-REV-001 Pass (95.6%)
- Bootstrap base reference: `origin/personal@c600028072`
- Integrated base reference used for docs sync: `origin/personal@e579e82b7f`, merged into `codex/task-keys-and-dependencies` as `97fdd0f7e2` (checkpoint `d3686fd072`)
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh; logs in `evidence/delivery/`

## Why Docs Were Updated

- Summary: Project Tasks now have a permanent readable key (`<prefix>-<number>`) and a stored "depends on" list. Agents see and use the key as the Task ID. Task pages use key URLs, and a startup migration keys released data. The implementation already updated the Projects module docs, the collaboration docs and the web Projects doc. Delivery found three spots outside those files that still described the old Task-ID contract, and corrected them.
- Why this should live in long-lived project docs: the key is now the agent-facing Task ID across every Task tool and `delegate_task`, and `depends_on` is a new tool input. Readers of the tool contract docs would otherwise learn the long-ID-only contract.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Owner doc for Projects persistence, keys, dependencies, migration, tools, GraphQL | No change (updated in the change) | Checked against the integrated state. The base-merged Team status paragraph merged cleanly beside the ticket's edits |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Refusal / undelivered-work texts name Tasks by key | No change (updated in the change) | — |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Agent-facing Task ID wording | No change (updated in the change) | — |
| `autobyteus-web/docs/projects.md` | Keys, badges, picker, Dependencies card, key URLs, tree summary | Updated (delivery) | Routes table still described `:taskId` as the long ID only |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP projection of `create_task` / `update_task` | Updated (delivery) | Omitted `depends_on`, key as Task ID and `dependsOn` in projections |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` `task_id` modes | Updated (delivery) | Now says a Project Task's `task_id` is its key or long ID |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `task_id` / `update_task` for Tasks with no Project | No change | Tasks with no Project keep their ID; text is accurate |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_teams.md` | Tree Task-worker rows link to the Task summary | No change | They link to `projects.md#task-summaries-in-the-workspaces-tree`, which the change updated |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | The new migration; the base changed checklist item 3 and acceptance item 5 today (`8a970f214c`) | No change | Compliance check recorded below and in the delivery report |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Routes table | `:taskId` is a Task reference, canonically the key; edit route is a key URL | Matches REQ-022 and the Key URLs section of the same doc |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Tool contract | `create_task` / `update_task` take `depends_on`; `task_id` is a key (any case) or long ID; `TASK_DEPENDENCY_INVALID`; projections carry the key as `taskId` and `dependsOn` keys | Matches REQ-018–020 and the tool manifest |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` modes | Project Task `task_id` = key or long ID; Temp task keeps its ID | Matches REQ-019 / AC-022 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Task keys | Prefix rule, never-reused numbers, retired prefixes, the key as the agent-facing ID, and the long ID kept as the stored identity | `design-spec.md`, `requirements-doc.md` | `projects.md` § Task keys and "depends on" (in change) |
| Dependencies | One stored relationship; validation (no self, no loop, same Project); derived "Blocked by" / "Required by"; informs only | `design-spec.md` | `projects.md` (in change), `autobyteus-web/docs/projects.md` |
| Migration `20261017_project_task_keys_v1` | Plan order, frozen shapes, dispositions, no lockout, retry recognition | `design-spec.md` Migration Plan | `projects.md` § Task keys for released data (in change) |
| Tool contract | `depends_on`, key-or-long-ID inputs, key outputs | `design-spec.md` SR-002 | `agent_tools_mcp_server.md`, `agent_tools.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Long-ID Task page URLs (`/projects/<id>/tasks/project_task_…`) | Key URLs; long-ID URLs open the Task and are replaced by the key URL | `autobyteus-web/docs/projects.md` § Key URLs, routes table |
| Long `taskId` as the agent-facing Task ID | The key (long ID still accepted as input) | `projects.md` § The agent-facing Task ID; `agent_tools_mcp_server.md` |

## Migration Guideline Check (base change merged at delivery)

The base commit `8a970f214c` (merged at delivery) now requires two things. First, a **shape inventory** of released source data, mapped to fixtures. Second, fixtures must be hand-built and never copied from real user data. This ticket was designed against the guideline at `c600028072`. Delivery checked it against the new text:

| Released source shape (at `c600028072`, per-folder layout) | Covering fixture / evidence |
| --- | --- |
| Valid `project.json` without links; with released link extras (`workspaceId`, `addedAt`) | `project-task-keys-v1-app-data-migration.test.ts` `seedReleased` (project_a with link extras, project_b/c without) |
| Task statuses TODO / IN_PROGRESS / DONE / CANCELLED | same fixture (task_a/b/z/y) |
| Equal `createdAt` ties (ordering by `taskId`) | same fixture (task_a / task_b at the same time) |
| Name collisions after prefix rule ("AutoByteus" / "AutoByteus!") | same fixture (project_c); DSK-002 |
| Diacritics / long names | unit prefix-rule tests; DSK-002 ("Café Ops", 39-char name) |
| Invalid `project.json`, invalid `task.json`, Task file naming another Project | test "preserves an invalid project.json and an invalid task.json…" |
| Residue folder without `project.json` (deleted Project with a kept task folder; found on the user node) | same test ("residue folders are not candidates") |
| Task with a context file | DSK-001 (written by the released 1.5.5-beta.1 build), DSK-002 (bytes unchanged) |
| Already-keyed / partially keyed data (retry) | tests "keeps a Project that cannot be keyed…", "refuses to overwrite…", "a second start changes nothing"; R4b startup E2E |

- Real user data was read only read-only, for names and counts (investigation notes, 2026-10-17). No migration or startup ever ran on it or on a copy of it. The upgrade data was written by the released build on an owned root. This meets the new acceptance item 5.
- The ticket records shapes and counts across the investigation notes and design spec, not as one inventory table. The table above is that inventory at delivery. Every shape found has a covering fixture, so delivery judges the substance met. No design change is needed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, handoff summary, archive, finalization (no release by default)
- Notes: the delivery doc edits in `agent_tools_mcp_server.md` and the server `projects.md` tool section conflict with project-tool-split (`a716a4632e`), which rewrote the same sections. When that merge is resolved (DR-001, Local Fix), the combined docs must keep both: the new `create_project` / `update_project` tools, and the Task tools with keys and `depends_on`. Delivery re-checks the docs in DR-002.
- Generated `autobyteus-web/generated/graphql.ts` was hand-edited for this ticket's fields only; regeneration remains a follow-up (no docs impact).
