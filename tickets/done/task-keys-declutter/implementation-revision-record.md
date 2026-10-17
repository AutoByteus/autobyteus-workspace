# Implementation Revision Record — task-keys-declutter

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md` (SR-001, direct route) | N/A | `Initial Baseline` | SR-001 | Card key line, tree key and the worker answer's `taskKey` removed; local checks pass; ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Keys only where they link or refer: no card key line, no tree key, no worker `taskKey`

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `handoff-architecture-design-complete.md`, SR-001 (Small / Low, direct implementation).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result:
  - board cards (page and right-panel tab) start with the summary;
  - the Workspaces-tree Task summary shows only the summary, with tooltip and name "Show Task in Projects: <summary>";
  - the worker answer has no `taskKey` anywhere;
  - every other key surface is unchanged.
- Related solution revision IDs: SR-001. Architecture review, code review, API/E2E, delivery: N/A.
- Why recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-004; REQ-001 to REQ-004; AC-001 to AC-004 (AC-005 is for validation).
- Implementation delta:
  - `ProjectTaskRow.vue`: key line, `taskKey` computed and `TaskKey` import removed. The badge keeps its Project-Task check `'taskKey' in task`.
  - `TaskWorkerTaskSummary.vue`: identical to its version before `task-keys-and-dependencies` (`d3686fd072~1`): summary only, and the `locate` title is the summary.
  - Worker `taskKey` removed end to end:
    - server: `TaskWorkerTaskView` in `domain/models.ts`, `currentTasksOfTaskWorkers` in `project-task-service.ts`, GraphQL `TaskWorkerTaskView.taskKey` in `api/graphql/types/project-tasks.ts`;
    - web: `GetTaskWorkerTasks` query, `taskWorkerTaskStore` mapping, `TaskWorkerTask` type, `generated/graphql.ts` (by hand, as in the predecessor).
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run".
- Next recipient or routing: API/E2E engineer (direct route, Small / Low), per handoff rules.
- Remaining limitations or risks: RSK-001 (accepted): a badge names a key that no card shows.
