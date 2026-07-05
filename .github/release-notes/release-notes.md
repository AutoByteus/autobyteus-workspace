## What's New
- Improved delegated task-team lifecycle cleanup so completed transient child teams are removed from active runtime projections after accepted review settlement.

## Improvements
- Task-team settlement now treats duplicate review/status wakeups as one lifecycle transition per task-team run, preserving deterministic cleanup behavior under racey shutdown timing.
- Backend lifecycle docs now describe the accepted task-team settlement, scoped root offline signal, and snapshot/reload cleanup contract.

## Fixes
- Fixed an intermittent issue where a delegated child team, such as `StudentStudyGroup · task_0001`, could remain visible in the Workspaces team tree after the parent accepted the task result.
- Fixed settlement races where already-stopping or already-offline child runs could reject cleanup and leave stale active task-team handles in backend snapshots.
- Preserved real active termination failures as visible/retryable failures instead of silently hiding active work.
