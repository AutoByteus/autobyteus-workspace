# autobyteus-473 — Architecture Design Complete (phone background tasks; late viewer sees current tasks)

- Package: `phone-background-tasks-473`, SR-002; task_size `Medium`, architectural_risk `High` (shared runtime contract and GraphQL view across Claude, AutoByteus and Antigravity)
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473`, `codex/phone-background-tasks-473`, `origin/personal` @ `931a1feeb6`; finalization target `origin/personal`. Documents uncommitted; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user; Project Task `autobyteus-473`.
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed). The run status reading "Idle" while a background task runs is split into its own Task (DEC-002), proposed to the PM together with the finding that it is the cause of autobyteus-448's gap (busy-run recorder).

## Review focus

- DS-002: `AgentBackgroundTaskInspection` event-stream variant gains `current()`; Claude (registry view), Antigravity (monitor's running tasks), AutoByteus (`BackgroundProcessManager.list()` + `toAgentBackgroundTask`); GraphQL `AgentBackgroundTaskEventStream.tasks`; the store seeds insert-if-absent so stream events stay the owner of changes.
- DS-001: the phone's Activity gets `MobileBackgroundTasks` on the shared `useBackgroundTaskPanelView`.

## Documents (`/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473/tickets/in-progress/phone-background-tasks-473/`)

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`.

## Route

`get_handoff_rules`: `Architecture Design Complete`, architectural_risk High → `/software_engineering_team/architecture_reviewer`.
