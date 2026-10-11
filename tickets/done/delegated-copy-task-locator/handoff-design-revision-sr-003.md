# Handoff — Design revision SR-003 for re-review (delegated-copy-task-locator)

- Result: `Architecture Design Complete` (revised). Classification is unchanged: `task_size=Large`,
  `architectural_risk=High`.
- Route: Large or High → `/software_engineering_team/architecture_reviewer`.
- Responds to: ARCH-REV-001, round 1, Fail (`design-review-report.md`).
- Requirements: unchanged, `Approved` at SR-002. The UI/UX supplement is unchanged (design repo `personal` @ `b08ddf6`,
  user-approved 2026-10-11).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`, branch
  `codex/delegated-copy-task-locator`, base `origin/personal` @ `359d2c0ef`.

## Finding dispositions (all in `design-spec.md`)

| Finding | Disposition | Where |
| --- | --- | --- |
| AR-001 | Fixed. The server read goes through `readTaskChangeView`, so a missing Task or Project → `task: null`. An unexpected error for one worker is logged and that worker answers null; the batch never fails. DS-003 and the store add `project_removed`, which re-reads the workers whose cached Task has that `projectId`. A "Project deleted" example and tests were added (server: deleted Project → null while the other workers still resolve; client: `project_removed` invalidation). | Current-State Read; DS-003 rows; Interface Boundary Mapping; Bounded Local spines; file mapping (store); Examples; Sequence step 1; test guidance |
| AR-002 | Fixed. `AgentRunTaskRows` gets a new `open-run` emit, wired in the section to `selectAgentRun(run)` (clears the selected child, then `onSelectRun`). `select-run` is unchanged. A test was added: the run's own conversation opens. | File mapping (`AgentRunTaskRows`, Section); test guidance |
| AR-003 | Fixed. "Agent and Team hosts" throughout. The reason for ref-counted interest is restated: Agent and Team trees, and several tree instances, list and unlist rows independently. | File mapping (`useTaskWorkerTasks`); Applied Patterns |
| AR-004 | Option A. `drop` is removed from DS-005, the chain and the API. A request that can't finish expires after 10 s. Boards act only when no read of their list is in flight: a just-mounted board waits for its mount read, and an open board uses its live list. A stale snapshot never drives Cancelled or Show all. | DS-005; Bounded Local spine; Interface row; board file rows; test guidance |
| Recommendation (ordering) | Adopted. Per-key read epochs in `taskWorkerTaskStore`, following the `projectTaskStore` pattern. A test checks that a stale response never overwrites a newer one. | DS-003; Bounded Local spine; Applied Patterns; file mapping; tests |

## Package (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-spec.md` (SR-003)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/requirements-doc.md` (Approved, SR-002)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md` (SR-003 entry)
- Prior review: `.../design-review-report.md`, `.../architecture-review-revision-record.md`
- Original design handoff: `.../handoff-architecture-design-complete.md`

## Unchanged constraints

- Tree-row work waits until `codex/delegated-team-aggregate-status` merges (`/project_task_manager` notifies).
- QR-003 row structure; PMU-018 / PMU-019 and the reveal specs must stay green.
- Org-run Task workers are out of scope (a follow-up candidate).

## Expected next action

Architecture re-review of SR-003.
