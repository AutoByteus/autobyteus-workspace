## What's New
- The `create_or_update_project` agent tool is joined by two tools with one meaning each: `create_project` creates a Project (required name, optional description and workspaces), and `update_project` changes a known Project by its `project_id` (name, description and/or workspaces). Results and error codes are the same as before.

## Improvements
- Neither new tool is added to agents automatically. An agent has `create_project` and/or `update_project` only when its definition selects them, on every runtime (AutoByteus, Codex and Claude).

## Upgrade Notes
- `create_or_update_project` is deprecated. It keeps working unchanged for agent definitions that list it, so no agent loses its Project tool when you upgrade. It will be removed in a later release. **Select `create_project` and/or `update_project` in every agent definition that creates or changes Projects**, including the Project Task Manager package in `autobyteus-agents`.
- An agent definition can list `create_or_update_project` together with `create_project` and `update_project`. An earlier release skips the names it does not know and keeps `create_or_update_project`, and this release gives the agent all three, so a package can move to the new tools before every node is upgraded.
- A third-party MCP tool named `create_project` or `update_project` is now replaced by the first-party tool of that name (with a logged warning), as for the other first-party tool names.
