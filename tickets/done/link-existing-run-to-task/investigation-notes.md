# Investigation Notes

## Investigation Meta

- Package identifier: `link-existing-run-to-task`
- Request / ticket: Project Task `autobyteus-11` from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Link an existing agent or team run to a Project Task (no new copy, no new work)". The user's go-ahead 2026-10-18.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task`
- Repository mode: `Git`
- Task worktree / branch: same / `codex/link-existing-run-to-task`
- Resolved base: `origin` / `personal` / `2f211340ee` (fetched 2026-10-18)
- Finalization target: `origin` / `personal`
- Bootstrap result: `git worktree add -b codex/link-existing-run-to-task <path> origin/personal` succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Authorities read: `references/requirements-engineering.md` (read in this conversation, 2026-10-17); `AGENTS.md`; `DESIGN.md` (rules 1–8).
- Investigation status: requirements-phase investigation complete.

## Initial Request And Clarifications

- Original request: the Task text (problem, wanted, decisions for the team, done when). The user: "assigning one task to one existing agent team run, a team run I started standalone … it might be easier."
- User-supplied constraint: a run the user started by hand must not be stopped when its Task closes (to confirm).
- Real case: Task `autobyteus-10` "Work Journal (Step 1B)", `project_task_0b4afc66-…`, IN_PROGRESS since 2026-10-08, no `agent_run_resources.json` (read-only check 2026-10-18); its worker is a Solution Designer run the user started by hand.

## Product And Domain Understanding

- Today a Task gets an assignee only through `delegate_task`, which starts a new copy (or gives a saved Task to an existing copy by run id).
- A Task **owns** its assigned copies (`docs/modules/projects.md` §Ownership; Collaboration Model CM-6): DONE / CANCELLED closes their entries and stops them; a closed run receives no input and is never woken (§DONE and CANCELLED, step 3); Task-owned copies are scoped in messaging (`agent_communication.md` §Task-linked message scope); runs a Task-owned run delegates become that Task's sub-work; workers cannot assign (`TASK_AGENT_RESOURCE_OWNED_SENDER`); reactivation is by the assigner messaging the copy.
- A user-started run (standalone agent run, team run) is unowned: never checked against Task data.

## Source Log

| Date | Source Type | Exact Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-18 | Doc | `autobyteus-server-ts/docs/modules/projects.md` §Agent Run Resources, §Current Task of a copy / worker, §Ownership, §DONE and CANCELLED, §Reactivation, §Task roots | assignment model | entries `assigned` / `delegated` / legacy `broughtIn` in `agent_run_resources.json`; one open entry per copy; Task root = latest `assigned` entry; root status via the hosting root's `taskExecutionStatus`; locator `taskWorkerTasks` via `rootTaskLocationOf` |
| 2026-10-18 | Doc | `docs/design/collaboration_model.md` CM-6, CM-7 | ownership contract | every delegated run belongs to one Task; closing stops it; the coordinating run coordinates its lifecycle |
| 2026-10-18 | Doc | `docs/modules/agent_communication.md` §Task-linked message scope | messaging | Task-owned copies of different Tasks cannot message each other; a closed sender / recipient fails |
| 2026-10-18 | Data (read-only) | `~/.autobyteus/server-data/projects/project_a1377344-…/tasks/project_task_0b4afc66-…/` | real case | `task.json` (key `autobyteus-10`, IN_PROGRESS), `context/`, no `agent_run_resources.json` |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Work started before its Task exists | user starts a run; later creates a Task | the Task cannot name its worker; board shows it unassigned | Task text; real case |
| BEH-002 | System | `delegate_task(task_id)` | new copy, `assigned` entry, Task root | owned: closed and stopped on DONE | projects.md |
| BEH-003 | User | board / Task page / run | root view, `taskWorkerTasks` locator | assignee and live status shown for copies only | projects.md §Task roots |

## Persisted Data And State Facts

- Subject: `agent_run_resources.json` per Task (append-only entries; open / closed).
- A link would add a new kind of entry; older builds may treat an unknown entry as a damaged file (downgrade after use unsupported) — architecture to decide the shape.
- No migration expected (new records only).

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| Task text (PTM) | the user / PTM | direction | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-001 | Unknown | live status source for a user-started run on the board (it is a root, not a task execution) | architecture | Open |
| U-002 | Unknown | which runs a picker lists (history rows) | architecture | Open |
| R-001 | Risk | linking blurs ownership rules (stop, fencing, message scope, sub-work) | DEC-001: linked, not owned | Open |
| R-002 | Risk | Task 6fb6e21b (workspace for delegated copies) shares "Task, run and workspace stay consistent" | linking never moves a workspace (DEC-009) | Open |

## Requirement Implications

A link must give visibility (board, Task page, locator) without ownership (no stop, no fencing, no message scope,
no sub-work ownership), and be possible from the app and from a tool.

## Architecture Investigation Findings (2026-10-18)

- `task-execution-resource-schema.ts:13-24`: roles `assigned` / `delegated` / `broughtIn`; an unknown role makes the
  file invalid (an older build would treat a Task with a `linked` entry as damaged).
- `task-execution-resource-service.ts`: `ownerOf`, `isOpen`, `releasableByHostRoot`, `closedTaskExecutionsIn`,
  `rootTaskLocationOf`, `latestAssignment` all read one owned index.
- `task-root-view-builder.ts:7-46`; `compositions/project-task-execution-resource-composition.ts:39`: worker status via
  the hosting root's `taskExecutionStatus`; `active-collaboration-root-directory.ts:30-37` root boundary methods.
- Web: `TaskWorkerTaskSummary.vue` (Task line), used in `WorkspaceTransientExecutionRow.vue:96`; grouping in
  `stores/runHistoryNavigationProjection.ts` (workspace → agent / team definition → run); nested rows only from a run's
  collaboration tree (`AgentRunTaskRows.vue`), stop root = that run.
- Tools: `agent-tools/project-tasks/project-task-tool-{contract,native-tools,manifest}.ts`; `update_task` takes `task_id`
  (key or long id).
