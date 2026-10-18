## Improvements
- One way to create and one way to change a Project: the deprecated `create_or_update_project` agent tool is removed. `create_project` and `update_project` are unchanged.

## Upgrade Notes
- `create_or_update_project` is removed. Agents that still list it launch normally without it (the name is skipped). **Select `create_project` and/or `update_project` for agents that create or change Projects.**
- A third-party MCP tool named `create_or_update_project` is no longer replaced by a first-party tool.
