# Proposed Task: Remove temp Tasks (Tasks with no Project); only real Project Tasks are Tasks

Proposed by `/software_engineering_team/solution_designer` (team run
`software_engineering_team_8f12b12a8e8843788b9357e7121b3909`, working on Task
`project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601`), agreed with the user in the
Solution Designer's conversation on 2026-10-15. The user asked the Project Task
Manager to create this Task and give it to the team that introduced temp Tasks.

## Origin

Temp Tasks were introduced by ticket `mention-delegation-dismissal` (commit
`a2a7b37bc1`, 2026-10-06; ticket folder `tickets/done/mention-delegation-dismissal/`).
That ticket's goal: `@` leads to `delegate_task` instead of a permanent
collaborator, and "delegated work can be marked done and its row disappears".
It made every description-only `delegate_task` from an agent that is not
working on a Task create a Task with no Project (`<appData>/ad-hoc-tasks/`),
returned its `task_id`, and exposed `create_or_update_task` automatically
wherever `delegate_task` is, so the delegator could mark it DONE. The ticket
does not record which team run implemented it.

## Problem (user, 2026-10-15)

- Delegators often do not close their temp Task. Asking every agent to call
  `create_or_update_task` after delegating is semantically confusing: the agent
  wanted help, not to manage a work item.
- Closing adds little: a quiet copy already goes to sleep after the idle grace
  period (default 10 minutes), freeing its resources; it wakes with its
  conversation when messaged; history is kept; the user can stop it from the UI.
- The user never looks at the Temp tasks list.
- `create_or_update_task` belongs to real task management (the Project Task
  Manager), not to every agent.

## Direction (agreed with the user)

- **Only real Project Tasks are Tasks.** Delegation never creates a Task.
- `delegate_task` with a description from an agent that is not working on a
  Task starts a delegated run linked only to its delegator. No `task_id` is
  returned; there is nothing to close.
- Unchanged: delegating a saved Project Task (`delegate_task` with `task_id`),
  and sub-work (an agent working on a Project Task delegates further; the copy
  belongs to that Project Task and closes with it).
- `create_or_update_task` is no longer exposed automatically wherever
  `delegate_task` is; only agents whose role is task management get it through
  their own configuration (e.g. the Project Task Manager).
- Tool descriptions, the `@` mention note and prompts stop telling agents to
  mark a returned `task_id` DONE.

## Decisions for the user in this Task

1. **Sidebar tidiness.** The original goal was that finished delegated rows
   disappear. Without temp Tasks, sleeping ad-hoc copies stay listed under their
   delegator. Options: keep them listed; collapse or dim sleeping copies; let the
   user dismiss a row; or something else.
2. **Existing temp Tasks** (12 on the user's machine, all DONE): keep them
   readable as history, or remove them. No data loss for runs and conversations
   either way.

## Constraints

- No change to Project Tasks, saved-ID delegation, sub-work, reactivation, idle
  shutdown and wake-up, Settings, Token Meter or the Task locator.
- Coordinates with Task `project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601`
  ("Make collaboration follow one simple model"), which publishes the
  collaboration model document (rule CM-6 will state "a delegated run belongs to
  a Project Task when the work came from one; otherwise it is linked only to its
  delegator") and touches `delegate_task` resolution and the same prompts. Both
  change the same tool descriptions; whichever lands second rebases.
- Related: 17bfe0fe (agent input delivery cleanup, same area); the paused memory
  refactor Task 8641c0ac resumes after both.

## Done when

- No delegation creates a Task; `delegate_task` returns no `task_id` for
  description-only delegation; `create_or_update_task` is not exposed
  automatically; prompts and tool texts match.
- The user's decisions on sidebar tidiness and existing temp Tasks are applied.
- Docs updated (projects.md §Tasks With No Project, agent tools, collaboration
  docs).
- Tests, a beta release, and the user's check in the app.
