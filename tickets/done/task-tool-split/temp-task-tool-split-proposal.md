# Revised Task ee74d72b: Split `create_or_update_task` into `create_task` and `update_task`; no automatic exposure

Replaces the earlier proposal "Remove temp Tasks" (`temp-task-removal-proposal.md`).
Revised with the user in the Solution Designer's conversation on 2026-10-15.

## Root cause (user, 2026-10-15)

Temp Tasks are not the problem. The problem is the tool: `create_or_update_task`
mixes two meanings ("create a work item" and "update my delegated work"), and it
is exposed automatically wherever `delegate_task` is. So every agent is told to
close a Task it never asked for, which reads as strange, and is often forgotten.

## Facts that make this safe

- An unclosed temp Task costs almost nothing: a quiet copy is shut down by the
  system after the idle grace period (default 10 minutes); its conversation is
  kept and it wakes when messaged by run ID. Delegators that never close do not
  leak resources.
- Closing is still useful when an agent wants to end its delegated work right
  away (stop and hide the copies).

## Direction (agreed with the user)

1. **Keep temp Tasks** (Tasks with no Project created by description-only
   delegation). Unclosed temp Tasks may accumulate; that is acceptable ("as the
   platform matures there will be fewer temp Tasks and more Project Tasks").
2. **Split the tool into two, each with one meaning:**
   - `create_task` — create a Project Task (for task managers such as the
     Project Task Manager);
   - `update_task` — update a Task by `task_id` (description and/or status,
     e.g. mark the delegated work DONE, which stops its copies). Works for Project
     Tasks and temp Tasks.
3. **No automatic exposure.** Neither tool is added just because an agent has
   `delegate_task`. The user configures which agents get `create_task` and/or
   `update_task`; the agent's own skill decides when to use them.
4. **Texts follow the agent's actual tools.** The `delegate_task` description,
   its result guidance, the `@` mention note and the collaboration prompts
   mention closing a returned `task_id` with `update_task` only when the agent
   has `update_task`. An agent without it is never told to close anything.

## Constraints

- No change to temp Task creation, Project Tasks, saved-ID delegation, sub-work,
  DONE/CANCELLED closure semantics, reactivation, idle shutdown and wake-up.
- Existing agent definitions and skills that use `create_or_update_task` (for
  example the Project Task Manager) must be migrated or updated so they keep
  working; decide with the user how existing tool configurations are converted.
- Coordinates with Task 259ddae7 (collaboration model document; same prompts and
  tool texts). Order (PM): 259ddae7 → ee74d72b → memory refactor 8641c0ac.

## Done when

- `create_task` and `update_task` exist with single meanings; `create_or_update_task`
  is gone; nothing is exposed automatically.
- Agents without `update_task` are never told to close a Task; agents with it
  can close their temp Tasks.
- Existing agent configurations and the Project Task Manager keep working.
- Docs updated; tests, a beta release, and the user's check in the app.

## Clarification (SR-003, 2026-10-15)

Item 4 is met by tool-neutral shared texts: the `@` note and reactivation errors no longer mention closing for any agent; the closing/reopening guidance lives in `update_task`'s description, which only agents with that tool see (requirements DEC-005).
