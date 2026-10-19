# Investigation Notes — task-keys-declutter

## Investigation Meta

- Package identifier: `task-keys-declutter`
- Request: Project Task `autobyteus-132` from `/project_task_manager`, 2026-10-17
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter`
- Repository mode: `Git`
- Branch `codex/task-keys-declutter`, base `origin/personal@aa84fd026c` (fetched 2026-10-17); finalization target `origin/personal`
- Bootstrap: worktree created; no blocker
- Current SR: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (all read earlier in this conversation, 2026-10-17)
- Status: complete

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-10-17 | User | Screenshot `ctx_b7b473c521dd__56.png` | Every card has a key line ("autobyteus-59" …); tree summaries lead with keys ("autobyteus-14 Simplify agent …", "autobyteus-agents-2 Analyze…") |
| 2026-10-17 | Code | `grep -rln "TaskKey\b\|taskKey" autobyteus-web/components autobyteus-web/pages` | Key surfaces: `ProjectTaskRow.vue` (card line, lines 22-23, 68), `TaskWorkerTaskSummary.vue` (tree), `TaskKeyChip.vue` (Task page, `ProjectsPanelTaskDetail.vue`), `TaskDependenciesSection.vue`, `TaskDependencyBadge.vue`, `TaskDependencyPicker.vue`, `TaskKey.vue` |
| 2026-10-17 | Code | `TaskWorkerTaskSummary.vue` | Key span plus key in `locateLabel` (`workspace.history.copyTask.locate`, "Show Task in Projects: {{title}}") |
| 2026-10-17 | Code | `autobyteus-web/stores/taskWorkerTaskStore.ts:64`, `graphql/queries/projectTaskQueries.ts:47`, `types/project.ts:93`; server `project-task-service.ts:229`, `api/graphql/types/project-tasks.ts:160`, `domain/models.ts` (`TaskWorkerTaskView`) | Worker answer `taskKey`, consumed only by the tree summary |
| 2026-10-17 | Code | `ProjectTaskRow.vue:27` | Badge uses `'taskKey' in task` as the Project-Task narrowing; it must stay correct when the key line goes |
| 2026-10-17 | Doc | `autobyteus-web/docs/projects.md` "Task keys and "Depends on"" (Card bullet) | Describes the card key line; update |
| 2026-10-17 | Code | Tests referencing the removed elements (`project-task-row-key`, `workspace-task-worker-task-key`, worker `taskKey`): ProjectTaskBoard, TaskKeysAndDependencies, TaskWorkerTaskSummary specs, `taskWorkerTaskStore.spec.ts`, server `task-worker-current-tasks.test.ts` (19 lines) | Update |

## Relevant Existing Behavior

As in requirements BEH-001 to BEH-004.

## Persisted Data

Not affected.

## Product Design Findings

- Predecessor spec (Approved 2026-10-17) normative items DEC-001 and DEC-008 are superseded by the user's direction in the Task. The Product record is externally owned; requested via the delegating Task manager (requirements DEC-004).

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| User screenshot (path in requirements) | User | Evidence | — |
| Predecessor `ui-ux-spec.md` | Product | Still normative except as superseded | Approved |

## Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| RSK-001 | Risk | A badge names a key that no card shows | Hover list, Task page links, search-by-key Task 8865a11e; optional tooltip summaries offered to the user (DEC-003) |

## Architecture Investigation Findings

- Owners: card = `ProjectTaskRow.vue`; tree = `TaskWorkerTaskSummary.vue`; worker answer = `ProjectTaskService.currentTasksOfTaskWorkers` → GraphQL `TaskWorkerTaskView` → web `taskWorkerTaskStore`. There is no structural issue.
