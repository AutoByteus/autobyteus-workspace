# Data Model — SR-023 (APPROVED as REQ-BL-009 / SD-AP-003, 2026-10-05; authoritative for design-spec.md SR-023)

## Principles (user direction)
1. **The execution tree never knows about Tasks.** Team, Org and standalone tree files record runs, nesting, creator (`delegatorAgentRunId`) and source. That is their state before this ticket, with no `taskLifetime` field.
2. **The Task side alone records which runs were started for a Task.** These records live in a separate Projects file, `task_runs.json`.
3. **Neither side stores the other's facts.** `task_runs.json` holds references to runs (host root, run IDs) and the Task-level facts about them (why the run was started, did it start, is it closed). It never holds nesting, liveness or stop results. Those stay in the runtime; liveness and stopping are in memory only.
4. **No migration.** The released `projects.json` and context folders keep their released layout and meaning. `task_runs.json` is new and has never shipped. A per-Project folder layout is deferred to a possible separate ticket.

## Files
```
<appData>/projects/
├── projects.json         Projects + Tasks metadata. Exactly the released shape.
├── task_runs.json        NEW. For each Task: every run started for it.
├── task_context_files/   unchanged
└── task_context_drafts/  unchanged
```

## task_runs.json
A JSON object keyed by Task ID (Task IDs are unique across all Projects). A missing file means no Task has runs.

```jsonc
{
  "project_task_efdc…": {
    "runs": [
      {
        "role": "assigned",                                   // Manager delegate_task(task_id)
        "assignedBy": "project_task_manager_882a…",
        "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
        "run": { "kind": "team", "teamRunId": "packet_team_e86b…",
                 "coordinatorAgentRunId": "coordinator_2e35…" },
        "linkedAt": "2026-10-04T06:58:02.880Z",
        "start": "started",
        "closedAt": "2026-10-04T06:58:24.968Z"               // set by DONE
      },
      {
        "role": "broughtIn",                                  // owned run's send_message_to started a copy
        "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
        "run": { "kind": "agent", "agentRunId": "helper_9a1…" },
        "linkedAt": "2026-10-04T06:58:10.114Z",
        "start": "started",
        "closedAt": "2026-10-04T06:58:24.968Z"
      },
      {
        "role": "assigned",                                   // after reopen: a new, open run
        "assignedBy": "project_task_manager_882a…",
        "hostRoot": { "kind": "agent", "runId": "project_task_manager_882a…" },
        "run": { "kind": "agent", "agentRunId": "writer_77d2…" },
        "linkedAt": "2026-10-05T09:12:40.003Z",
        "start": "failed",
        "startError": { "code": "TASK_DISPATCH_FAILED", "message": "…" },
        "closedAt": null
      }
    ]
  }
}
```

### Fields of a run
| Field | Meaning |
| --- | --- |
| `role` | Why the run exists. `assigned`: the Manager's `delegate_task` with `task_id`. `delegated`: an open Task-owned run's `delegate_task` without `task_id`. `broughtIn`: an open Task-owned run's `send_message_to` started a new copy. ("collaborator" stays reserved for the user's @.) |
| `assignedBy` | Only on `assigned`: the Manager run that made the assignment. |
| `hostRoot` | The top-level run the user started, which hosts this run: `{kind: agent \| agent_team \| agent_org, runId}`. Everything started from one assignment shares its hostRoot. When the user chats with the Manager directly, it is the Manager's own run. |
| `run` | `{kind: agent, agentRunId}` or `{kind: team, teamRunId, coordinatorAgentRunId}`. A Team's members belong to the Team in the runtime and are not listed. |
| `linkedAt` | When the link was written: before the run's resources are acquired. |
| `start` | `starting` (written before resources are acquired, so DONE never misses a startup) → `started` (the copy exists and took its first work; for `broughtIn`, it was created) or `failed` (with `startError`). Set once. It never tracks messages, liveness or stopping. |
| `closedAt` | `null` while open. DONE sets it on every open run of the Task. **A closed run is closed forever**: it cannot be messaged, woken or restored. |

### Rules (checked on every read and write; invalid data gives a clear error and is never reset)
- One entry per Task, by construction (keyed object).
- A run (`agentRunId` / `teamRunId`) appears at most once in the whole file. Tasks never share a run.
- `assignedBy` exists only on `assigned`; `startError` exists only when `start` is `failed`.
- `delegated` / `broughtIn` runs are added only while the creating run is open.
- A helper is reused only among the same Task's **open** runs.
- Never stored: release/stop state or errors, liveness, nesting or creator lineage, addresses, run descriptions or files.

## Operations
| Operation | projects.json | task_runs.json |
| --- | --- | --- |
| Manager `delegate_task(task_id)` | Task must exist and not be DONE | add an `assigned` run `starting` **before** resources; then `started` / `failed` |
| An open owned run delegates or brings in a copy | — | add `delegated` / `broughtIn` `starting` **before** resources; then `started` / `failed` |
| DONE | status DONE (**second** write) | set `closedAt` on all open runs (**first** write); then ask each hostRoot to stop those runs (runtime; not stored) |
| Repeated DONE | — | no change; stopping is requested again for all closed runs; roots stop whatever is still live |
| Reopen + delegate | status change | new `assigned` run with `closedAt: null` |
| Delete Task / Project | metadata + context removed (unchanged) | **entries kept**: history and the closed-forever rule survive |
| Server restart | — | closed runs still cannot be woken or restored |

- **DONE write order:** closing first is the safe order. A crash in between leaves the runs blocked from new input with the status not yet DONE, and repeating DONE completes it.
- **Why Delete keeps entries:** without a Task mark in the tree, this file is the only thing linking a run to its Task. If Delete removed the entries, a DONE-then-deleted Task's runs would look like ordinary unlinked copies and could be woken again.

## Removed from the current code (IR-012)
- the `{taskLifetimes}` record in projects.json and its decoder branch
- lifetimes/work periods as a stored concept
- the `taskLifetime` field in tree records, schemas, mutators and indexes
- per-run dispatch `reserved/admitted/delivered`, `cleanup`, the shared `error`, and `recordCleanup`
- F07 reconciliation
- SR-022 per-message acceptance recording
