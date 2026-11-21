# Solution Revision Record: cross-node-task-close-591

| SR | Date | Kind | Summary | Status after |
| --- | --- | --- | --- | --- |
| SR-002 | 2026-11-21 | Requirements | DEC-004 decided by the user: like a local closed delegated run, the remote run stops and leaves the peer's run list; REQ-005 and AC-006 rewritten; requirements approved | Approved |
| SR-001 | 2026-11-21 | Requirements | Baseline. Root cause: the delegating node skips remote runs at a Task's close (F-1, the founder's log F-2). REQ-001 … REQ-005; DEC-001 … DEC-003, DEC-005 and DEC-006 decided; DEC-004 (how the stopped run shows on the peer) put to the user | Ready for Approval |

### SR-001

- **Trigger:** Task `autobyteus-591`, from `/project_task_manager`, on the founder's word.
- **Investigation:** `investigation-notes.md`, F-1 … F-8.
- **Next:** the user's answer on DEC-004, then approval and the architecture design.

### SR-002

- **Trigger:** the user's answer: "the resource on the remote node should also be closed just like the task agent and task agent team … otherwise you leave a lot of task agent or task agent team on the remote".
- **Change:** DEC-004 is (b) "as for a local one", not the earlier recommendation (a). REQ-005, AC-006, BEH-004, the UI section and Data Continuity follow.
- **Approval:** DEC-004 by the user; the rest by the Solution Designer within the direction, with the user informed. `Approved`.
- **Next:** architecture investigation and design.
