# Design Spec — Task keys only where they link or refer

## Solution And Approval Basis

- Current SR: `SR-001`
- Requirements: `requirements-doc.md` SR-001, approved within the direction (user informed 2026-10-17); the user's direction in Task `autobyteus-132`.
- Supplements: predecessor `ui-ux-spec.md`, superseded for the card key line and tree key.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md` (2026-10-17).
- Conflicts: none.

## Current-State Read

`ProjectTaskRow.vue` renders the key line for Project Tasks and the dependency badge. The same component serves the page board and the right-panel tab board. `TaskWorkerTaskSummary.vue` renders the key and the summary from the `TaskWorkerTask` answer, whose `taskKey` exists only for this. Every other key surface is a separate component and is unaffected.

## Task Size And Architectural Risk

- Task size: `Small`. Two components lose a display element. One API field is removed end to end: server model, service line, GraphQL field, web query, store and type. Tests and a doc paragraph are updated.
- Architectural risk: `Low`.
  - Display removal only.
  - The removed GraphQL field has no consumer after the change, and the server and web ship together.
  - No persistence, concurrency, security or ownership change.
- Escalation trigger: any other consumer of the worker `taskKey` turning up, or a request to change other key surfaces.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| `ProjectTaskRow.vue:22-23, 68` | Key line and `taskKey` computed | Remove the line and the computed. Keep the badge's narrowing `'taskKey' in task` |
| `TaskWorkerTaskSummary.vue` | Key span; key in `locateLabel` | Remove both. `locateLabel` = `t('workspace.history.copyTask.locate', { title: label })` |
| Worker `taskKey` plumbing (investigation notes) | Only the tree uses it | Remove end to end |

## Intended Change

Remove the Task key from board cards and from the tree's Task summary, and remove the worker answer's `taskKey`. Every other key surface stays.

## Change Scope

- In scope: UC-001, UC-002.
- Files:
  - web: `components/projects/ProjectTaskRow.vue`, `components/workspace/history/TaskWorkerTaskSummary.vue`, `stores/taskWorkerTaskStore.ts`, `graphql/queries/projectTaskQueries.ts` (`GetTaskWorkerTasks`), `generated/graphql.ts` (the hand-edited `TaskWorkerTaskView` entries), `types/project.ts` (`TaskWorkerTask.taskKey`), `docs/projects.md` (Card bullet; the tree description if present), affected specs;
  - server: `projects/domain/models.ts` (`TaskWorkerTaskView.taskKey`), `projects/services/project-task-service.ts` (`currentTasksOfTaskWorkers`), `api/graphql/types/project-tasks.ts` (`TaskWorkerTaskView.taskKey` field), `tests/unit/projects/task-worker-current-tasks.test.ts` and any schema test.
- Deliberately left alone:
  - `TaskKey.vue`, `TaskKeyChip.vue`, `TaskDependencyBadge.vue`, `TaskDependenciesSection.vue`, `TaskDependencyPicker.vue`, `ProjectsPanelTaskDetail.vue` (keys where they link or refer);
  - tools, URLs, persistence, localization keys (the `locate` string is unchanged; only its parameter changes).
- Follow-ups:
  - the Product design record update (requirements DEC-004, requested through `/project_task_manager`);
  - optional badge-tooltip summaries (DEC-003, only if the user wants it).

## Relevant Behavior And Production-Path Map

| BEH | Path | Change |
| --- | --- | --- |
| BEH-001 | `projectTaskStore` → `ProjectTaskBoard` → `ProjectTaskRow` | No key line |
| BEH-002 | `GetTaskWorkerTasks` → `taskWorkerTaskStore` → `TaskWorkerTaskSummary` | Summary only |
| BEH-004 | `ProjectTaskService.currentTasksOfTaskWorkers` → GraphQL → web | Field removed |

## Task Design Health Assessment

- Change posture: `Behavior Change` (UI).
- Design issue: `No`. Root cause: `No Design Issue Found`.
- Refactor needed now: `No`. Existing owners are correct; dead plumbing removed.

## Legacy Removal Policy

- Removed: the card key line, the tree key span and its label use, and the worker `taskKey` path. Nothing kept for compatibility.

## Persisted Data / State Transition Decision

`Not Affected`: no stored data changes.

## Data-Flow Spine Inventory

| Spine | Path |
| --- | --- |
| DS-001 | `projectTaskStore → ProjectTaskBoard → ProjectTaskRow (summary, preview, badge, files, worker)` |
| DS-002 | `Workspaces tree → GetTaskWorkerTasks → ProjectTaskService.currentTasksOfTaskWorkers → taskWorkerTaskStore → TaskWorkerTaskSummary (summary; locate)` |

## Ownership Map

Unchanged.

## Removal / Decommission Plan

| Item | Why | Scope |
| --- | --- | --- |
| Card key line (`ProjectTaskRow.vue` key `<span>`, `taskKey` computed, `TaskKey` import if unused) | User direction | In This Change |
| Tree key span and the key in `locateLabel` | User direction | In This Change |
| `TaskWorkerTask(View).taskKey`: server model, service assignment, GraphQL field, web query field, store mapping, type, generated types | Dead: after the tree change nothing reads it (`grep` shows only `TaskWorkerTaskSummary.vue` consumed it) | In This Change |
| Tests asserting the removed elements and field | Code no longer exists | In This Change (rewrite to assert absence) |

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| GraphQL `TaskWorkerTaskView` | `taskKey` removed |

## Existing Capability Reuse

Reuse the existing components; no new files.

## Final File Responsibility Mapping

As in Change Scope; no responsibility changes.

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Card | `Implement readable Task keys and "depends on"…` / preview / badge "Blocked by autobyteus-35" / files / worker | Hiding the key with CSS while still fetching / rendering it |
| Tree | `Simplify agent …`, title "Show Task in Projects: Simplify agent …" | Key kept in the tooltip only |

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Keep the worker `taskKey` field "for later" | Rejected (dead code) |
| A setting to show keys on cards | Rejected (not requested) |

## Change / Refactor Sequence

1. Web card.
2. Web tree summary.
3. Worker `taskKey` removal: server, GraphQL, web.
4. Tests and doc.
5. Validation: web unit, server unit / typecheck, isolated instance screenshots (board page, tab board, tree, Task page with chip and dependencies).

## Key Tradeoffs

A badge's key is no longer visible on its target's card (RSK-001). This is accepted per the user's direction. Hover, Task page links and the planned search by key cover finding the Task.

## Risks

Low.

## Guidance For Implementation

- Keep `ProjectTaskRow`'s Project-Task narrowing for the badge (`'taskKey' in task`) or an equivalent check. Temp-task cards never show a badge.
- Tests assert absence: no `project-task-row-key`; no `workspace-task-worker-task-key`; tooltip without key. Tests for the chip, lists, badge and picker keep passing unchanged.
- Update `generated/graphql.ts` by hand, consistent with the predecessor (regeneration is a separate follow-up).
