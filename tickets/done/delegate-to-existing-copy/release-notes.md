# Release Notes — Follow-up Tasks Go to the Same Copy

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Added
- A follow-up Task can go to the copy that did the earlier work. Example: a Project Task Manager delegates Task A to a software engineering team, and that team's code reviewer proposes a cleanup. The manager marks A DONE, creates Task B, and delegates B to the **same** team copy by that copy's ID. The team resumes with its conversation and knows what it did on A.
  - Task A stays DONE. It is never reopened.
  - On the Projects board, B shows the reused copy, and A stays DONE.
  - Closing A again never stops the copy while it works on B.
- A copy can be given a new Task only when its current Task is DONE or CANCELLED, and only by the agent that assigned that Task. A busy copy is refused with a reason; it is not queued.
- `list_project_tasks` also lists a Task's closed assignments, so the copy can still be found after its Task is closed.

## Changed
- `delegate_task` results now name each ID for what it is:
  - An Agent copy returns `target_agent_run_id`.
  - A Team copy returns `target_team_run_id` and `target_team_coordinator_agent_run_id`.
  - **A Team result no longer has `target_agent_run_id`.** Use `target_team_coordinator_agent_run_id` to message the team.
- `send_message_to` still takes agent run IDs only. A team run ID is refused, and the refusal names the coordinator's ID to use instead.
- Tool descriptions and agent instructions explain the new IDs and the follow-up flow.

## Agent package update
- The Project Task Manager skill in `AutoByteus/autobyteus-agents` was updated to match. Update the imported agent package together with this release.

## Notes
- No reset or data migration is needed. Saved Tasks and assignments load unchanged.
- Downgrading after a copy has been reused for a second Task is not supported. An older build treats that Task's assignment file as damaged.
