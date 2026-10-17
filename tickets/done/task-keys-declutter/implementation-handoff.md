# Implementation Handoff — task-keys-declutter (SR-001)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Small / Low); independent architecture review not selected.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/requirements-doc.md` (SR-001; REQ-001–004, AC-001–005, DEC-001–004)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/design-spec.md`
- Supplemental task artifacts: the user's screenshot (path in the requirements); predecessor `ui-ux-spec.md` (superseded for the card key line and tree key).
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Board cards (Projects page and right-panel tab) no longer show a key line. The Workspaces-tree Task summary is back to exactly its form before `task-keys-and-dependencies`: summary only, with tooltip and accessible name "Show Task in Projects: <summary>". The Task worker answer's `taskKey`, used only by that tree key, is removed end to end. Keys stay in:
- the Task page and tab chip;
- the Depends on / Required by rows;
- the badge and its tooltip;
- the picker;
- tools and URLs.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence: 2 components lose a display element. One GraphQL field is removed, and nothing else consumed it (`grep` for `taskKey` in the web tree: only `TaskWorkerTaskSummary.vue` read the worker answer's key). No persistence, concurrency, security or ownership change. No production source file grows (55 insertions / 66 deletions overall, mostly tests).
- Selected route: `Direct API/E2E` (from `get_handoff_rules`).
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`. No other consumer of the worker `taskKey` was found, and no other key surface changed.

### Lightweight self-review

- Diff read line by line. The card keeps the badge's Project-Task check (`'taskKey' in task`; `ProjectTask` still has `taskKey`). Temp-task cards get no badge, as before.
- `TaskWorkerTaskSummary.vue` is byte-identical to `d3686fd072~1` (before keys).
- The server `TaskWorkerTaskView` model and the GraphQL type match their pre-keys shape; the `currentTasksOfTaskWorkers` line is restored verbatim.
- `TaskKey.vue` is still used by the chip, the badge, the dependency rows and the picker, so it is not dead. The `workspace.history.copyTask.locate` string is unchanged; only its parameter changed.
- No compatibility leftovers: no CSS hiding, no optional field kept "for later".

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No key line on cards; badge, preview, files, worker line unchanged | `autobyteus-web/components/projects/ProjectTaskRow.vue`: key `<span>`, `taskKey` computed and `TaskKey` import removed | Done; one component serves both boards |
| BEH-002 | Tree summary only; title / name "Show Task in Projects: <summary>" | `autobyteus-web/components/workspace/history/TaskWorkerTaskSummary.vue` | Done; identical to before keys |
| BEH-003 | Other key surfaces unchanged | none touched (`TaskKey`, `TaskKeyChip`, `TaskDependencyBadge`, `TaskDependenciesSection`, `TaskDependencyPicker`, `ProjectsPanelTaskDetail`) | Preserved; their specs pass unchanged |
| BEH-004 | Worker answer has no `taskKey` | server `projects/domain/models.ts`, `projects/services/project-task-service.ts` (`currentTasksOfTaskWorkers`), `api/graphql/types/project-tasks.ts`; web `graphql/queries/projectTaskQueries.ts`, `stores/taskWorkerTaskStore.ts`, `types/project.ts`, `generated/graphql.ts` (by hand) | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- Web source: `components/projects/ProjectTaskRow.vue`, `components/workspace/history/TaskWorkerTaskSummary.vue`, `stores/taskWorkerTaskStore.ts`, `graphql/queries/projectTaskQueries.ts`, `types/project.ts`, `generated/graphql.ts`.
- Server source: `src/projects/domain/models.ts`, `src/projects/services/project-task-service.ts`, `src/api/graphql/types/project-tasks.ts`.
- Docs:
  - `autobyteus-web/docs/projects.md`: the Card bullet, and the "Task summaries in the Workspaces tree" paragraph;
  - `autobyteus-server-ts/docs/modules/projects.md`: the "Current Task of a Task worker" section and the `taskWorkerTasks` GraphQL bullet.
- Tests:
  - web: `components/projects/__tests__/TaskKeysAndDependencies.spec.ts` (card: no key line, starts with the summary, badge key kept); `components/workspace/history/__tests__/TaskWorkerTaskSummaryRow.spec.ts` (summary only, en and zh-CN title / name without key); fixtures in `TaskWorkerTaskSummaryHosts.spec.ts` and `stores/__tests__/taskWorkerTaskStore.spec.ts`;
  - server: `tests/unit/api/graphql/project-tasks-schema.test.ts` (`TaskWorkerTaskView` fields are exactly `description, projectId, status, taskId`; query without the key); `tests/unit/projects/task-worker-current-tasks.test.ts`; `tests/unit/projects/project-task-keys-and-dependencies.test.ts` (the worker answer has no `taskKey` property).
  - Browser probes:
    - `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (PT-E2E-017): no key line on any card, including a new one. With long keys, the card shows only its badge's key, full in the tooltip, number visible.
    - `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-020, PMU-025): summary text only, without the Task's key; title / name "Show Task in Projects: <summary>" in en and zh-CN. These are the pre-keys assertions plus explicit no-key checks.

## Important Assumptions

None beyond the design.

## Known Risks

- RSK-001 (accepted by the user's direction): a badge names a key that no card shows. Hovering the badge, Task page links and the planned search by key (Task 8865a11e) cover finding it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (UI). Root cause: No Design Issue Found. Refactor decision: No Refactor Needed.
- Implementation matched the reviewed assessment: `Yes`. Routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead code in touched files removed: `Yes` (the worker `taskKey` path, the card's `taskKey` computed and `TaskKey` import).
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes` (every production file shrinks).

## Persisted Data Transition Check

- Approved decision: `Not Affected`. No stored data changes.

## Environment Or Dependency Notes

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter`, branch `codex/task-keys-declutter`, base `origin/personal@aa84fd026c`. Changes are uncommitted; no commit was made.
- `pnpm install`, server `prebuild` + `build` and web `nuxt prepare` were run in this new worktree.

## Local Implementation Checks Run

Logs are in `tickets/in-progress/task-keys-declutter/evidence/implementation/`:

- `pnpm -C autobyteus-server-ts typecheck`: pass.
- `pnpm -C autobyteus-server-ts test:unit` (clean env): 715 files / 5,811 tests pass (4 files / 7 tests skipped by their gates).
- `pnpm -C autobyteus-web test:nuxt --run`: 632 files / 4,471 tests pass (2 files / 5 tests skipped), no failures.
- `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`: pass.

## Frontend Rendered-Result Check

- Affected surfaces: Projects page board cards, right-panel Projects tab board cards, Workspaces-tree Task summaries (Agent host and Team host), plus the unchanged Task page chip and dependency rows.
- References: the requirements (REQ-001–003), the user's screenshot, and the predecessor spec for every unchanged key surface.
- Rendered surface: the repository's browser probes, run against this worktree's built server and Nuxt dev server, in headless Chrome with a probe-owned data root (TESTING.md "Browser probes"):
  - `projects-feature-probe.mjs`: all 17 cases pass after the probe's long-key assertion update (`probe-projects-feature-2/`). The first run (`probe-projects-feature/`) failed only that assertion, which still expected the removed card key line;
  - `project-manager-ux-probe.mjs`: Pass (`probe-project-manager-ux/`).
- Inspected:
  - board cards start with the summary, with "Blocked by keys-board-1 +1" and "Dependency cancelled: keys-board-3" badges (`PT-E2E-017-board-badges.png`);
  - Task page chip with "Copied", and Depends on / Required by rows by key (`PT-E2E-017-task-page-copied.png`);
  - tree summaries without keys under Agent and Team hosts (`pmu-020-rows-*.png`);
  - the tab board without key lines next to the located summary (`pmu-021-located-docked.png`);
  - zh-CN title and name (PMU-025);
  - the long-key card showing only its badge key (PT-E2E-017).
- Issues found and corrected: none in the product. The probe's long-key assertion still expected the removed card key line; it now asserts the badge-only key.
- Remaining unverified: the isolated desktop instance screenshots (AC-005) are for validation.

## Downstream Coverage Hints / Suggested Scenarios

- Isolated instance (AC-005): Projects page board and right-panel tab board with keyed Tasks, including a blocked one; Workspaces tree with delegated copies of a Project Task and of a Temp task (summary text only; hover title); Task page with chip and dependencies.
- API: the `taskWorkerTasks` query without `taskKey`; requesting `taskKey` on `TaskWorkerTaskView` is now a schema error.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-005 isolated desktop instance screenshots; the beta release and the user's check stay with delivery (Done-when).
- The Product design record update (DEC-004) is routed through `/project_task_manager`, not this team.
