## What's New
- Team work now uses server-managed task delegation only; the old Team Task Plan workflow and empty Task Plan panel have been removed.

## Improvements
- Team screens now focus on messages, activity, ToDo, and active task-agent work instead of showing legacy task-plan state.
- Dedicated task updates now use the clearer `TASK_DELEGATION_EVENT` realtime protocol name.

## Compatibility Notes
- Legacy native `autobyteus-ts` TaskPlan APIs, native task-plan stream events, and old local team-task tool names are removed. Use server task-delegation tools for team work and personal ToDo tools for private checklists.
