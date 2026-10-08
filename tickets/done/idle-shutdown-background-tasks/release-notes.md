# Release Notes — Delegated Agents Keep Running While Their Background Task Runs

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- A delegated agent or team that starts a background task and then goes quiet is no longer shut down after the idle grace period (default 10 minutes) while the task is still running. Examples are a Claude `run_in_background` command and an Antigravity background step. The task can now finish, and the agent receives the result and reports back to whoever delegated the work. Before this fix, the task was killed when the copy was shut down.
- After the background task ends (completed, failed or stopped), the normal grace period starts again, and the quiet copy is shut down when it elapses. Memory is still released once the work is done.

## Unchanged
- Delegated copies with nothing running are still shut down after the grace period. A message to the copy's run ID restores it with its conversation.
- Marking the Task DONE, stopping the root run, or stopping the server still stops the copy and its background tasks immediately.
- Codex, AutoByteus (native) and ACP agents report no background tasks, so their behavior is unchanged.

## Notes
- No time limit applies while a background task runs. A background command that never ends keeps its copy running until the Task is DONE, the root is stopped, or the server stops.
- The agent-facing collaboration instructions now state this rule.
- No settings, data migration or reset.
