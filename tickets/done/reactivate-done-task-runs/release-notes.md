# Release Notes — Continue with the same delegated worker after DONE

## Changed

- **A Task marked DONE can be picked up again with the same worker.**
  - DONE still stops the Task's delegated agents and teams and hides them from the run tree.
  - To continue, the agent that handed out the work first moves the Task back to TODO or IN_PROGRESS. It then messages the worker's run ID, the one `delegate_task` returned; for a team, that is the coordinator's run ID.
  - The worker comes back with its earlier conversation and receives the message. Its row shows up again in the run tree, live and after reload or restart. This works for Agent, Team and Org runs.
  - Helpers that the worker had started stay closed. The worker can start new ones.
  - A later DONE closes the worker again, and the cycle can repeat.
- **Task status stays the agent's job.** The app never changes a Task's status on its own. Setting the status back alone starts nothing. A message sent while the Task is still DONE is refused, with a hint to reopen the Task first.
- Only the agent that handed out the work can bring a worker back. Messages from other agents, or to a team member that is not the coordinator, are refused with guidance.
- `delegate_task` results now also say whether the new copy is an `agent` or a `team` (`target_kind`).
- The tool descriptions agents see now explain the reopen-then-message steps. They no longer describe DONE as final.

## Upgrade notes

- No data migration. Workers closed by earlier versions can be brought back the same way, as long as their Task still exists and their conversation is saved.
- A deleted Task's workers cannot be brought back.
- External agent packages whose skill text says DONE is final should be updated. One example is the agent repository's `project-task-management` skill.
