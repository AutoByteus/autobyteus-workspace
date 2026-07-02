## What's New
- Delegated agent and team tasks now persist as durable task records, so accepted, active, and awaiting-review work remains visible after frontend reloads, backend restarts, and task runtime cleanup.
- Team run history now reloads delegated tasks through a dedicated task records query, including task content, status, task-run identity, submitted results, reviews, and task-owned reference files.

## Improvements
- Team tab Tasks now uses persisted delegated-task records as the primary display source and uses live task-agent/task-team runtime rows only as enrichment while they are active.
- Nested task-team delegations now keep task records and task ids rooted in the parent team run, so child-team work remains visible from the root run history.
- Task reference previews now fall back to persisted task records when the active task runtime is gone, while staying separate from Team Communication and Agent Artifact references.

## Fixes
- Fixed delegated task rows disappearing after task-agent/task-team settlement, app reload, or machine restart.
- Fixed stale active-task UI naming in the changed Team tab task display path by using delegated-task terminology consistently.
