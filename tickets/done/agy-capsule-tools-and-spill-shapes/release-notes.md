## Changes

- If a future Antigravity CLI renames one of the native tools AutoByteus allows, the server now writes one line to its log (`AGY_CAPSULE_TOOL_NOT_IN_REGISTRY`) naming the tool, so the change is noticed instead of the tool silently disappearing from the agent. Starting the agent is never delayed or blocked by it.
- Nothing changes for agents today: with the current Antigravity CLI (1.5.15) every allowed tool is present and no warning appears.
