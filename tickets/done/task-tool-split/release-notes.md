## What's New
- The single `create_or_update_task` agent tool is split into two tools with one meaning each: `create_task` creates a Project Task, and `update_task` updates any Task by its ID (description, status, context files, closing with DONE or CANCELLED, and reopening). Results and error codes are unchanged.

## Improvements
- No task tool is added to agents automatically any more. An agent that delegates work is no longer told to close the Task its delegation created; the guidance for closing and reopening Tasks now lives in the `update_task` tool description, so only agents you configured with that tool see it. The `@` mention note and the "closed Task" error messages no longer name a task tool either.

## Fixes
- Agents that only want to delegate no longer receive a Task-closing instruction they have no reason to act on.

## Upgrade Notes
- `create_or_update_task` is removed, with no alias. An agent definition that still lists it launches normally but has no task tools (an unknown tool name is skipped with a warning). **Select `create_task` and/or `update_task` in every agent definition that needs task tools**, including the Project Task Manager package in `autobyteus-agents` (ship its update with this release).
- A third-party MCP tool named `create_task` or `update_task` is now replaced by the first-party tool of that name (with a logged warning), as for the other first-party tool names.
