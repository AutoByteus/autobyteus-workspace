# Problem Report — Idle shutdown of delegated agents kills their running background tasks

- Reported by: `/software_engineering_team/delivery_engineer` (Claude Agent SDK runtime), 2026-10-08, at the user's request
- Observed while: monitoring the `v1.4.98` stable release workflows (agpl-dual-licensing Slice 2 delivery)
- Requested routing (user): Delivery Engineer → Solution Designer → Project Task Manager, which creates a new Project Task to fix it.
- Status: Problem report only. No fix has been designed or implemented.

## Symptom

- A delegated agent starts a long-running background shell (`run_in_background: true`), e.g. a loop that waits for GitHub release runs, then ends its turn and waits for the completion notification.
- About 10 minutes later the agent run is shut down. The background shell is killed, so its output file contains only `[killed]`.
- The completion notification never arrives. Later the agent sees only "Background shell command didn't finish before the previous session ended".
- Work that depends on the notification silently stalls until a human asks "is it done?".

## Evidence (2026-10-08)

| Watcher task | Started (≈ end of agent turn) | Killed (output file mtime) | Delta | Output |
| --- | --- | --- | --- | --- |
| `b2fxnu6z3` | ~07:40Z | 07:51:12Z | ~10–11 min | `[killed]` |
| `bvayozjre` | ~08:00Z | 08:10:44Z | ~10 min | `[killed]` |

- Output files: `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/c6b4e8b7-e020-47d8-8ccc-318ad4483faf/tasks/{b2fxnu6z3,bvayozjre}.output`. These are temporary and may disappear.
- In both cases the monitored GitHub runs were still `in_progress`, so the loop could not have ended by itself. A failing `gh` call would only keep it looping.

## Likely root cause (from code at `origin/personal` 440a4c948)

- `autobyteus-server-ts/src/config/task-execution-idle-shutdown-setting.ts`: `DEFAULT_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS = 600_000` (10 min). Setting key `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`. This matches the observed delay exactly.
- `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`:
  - `onAgentStatus` (l.228–233): an `idle` status arms the grace timer for every task execution containing the agent.
  - When the timer fires, `onGraceElapsed` calls `adapter.tryShutDownIfQuiet` (l.312–316).
- `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts` `tryShutDownIfQuiet` (l.241–266):
  - "Quiet" means *no active turn, queued input or pending command* (`handle.tryPrepareTerminationIfQuiescent()`).
  - **A runtime-level background task that is still running (Claude Agent SDK `run_in_background` shell, Monitor, etc.) is not part of the quiescence check.** The agent run is terminated, and its process and background children with it.
- Same path for Agent Org roots: `agent-org-execution/services/agent-org-task-execution-adapter.ts` `tryShutDownIfQuiet`.

## Impact

- Any delegated agent or team member that waits on a background task for more than the grace period loses it. Examples are release monitoring, long builds and long test runs.
- The agent believes a notification is coming, but it is never delivered. The work stalls with no error.

## Expected behaviour (for the Solution Designer to refine)

- An agent run with a live background task is not "quiet": idle shutdown is deferred while such tasks run (possibly with an upper bound).
- Alternatively, if shutdown is kept, the background task and its completion notification survive. Restoring the agent then delivers the result.
- At minimum, the agent should be told its background task was killed by idle shutdown, so it is not left waiting.

## Workaround used meanwhile

- Foreground polling (≤10 min per tool call) keeps the agent "running", so it is not shut down.
- Alternatively, raise `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (max 86 400 000).
