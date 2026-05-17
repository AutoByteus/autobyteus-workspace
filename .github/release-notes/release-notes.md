## Improvements

- Reloaded Codex run history now uses AutoByteus local replay data as the display source, so tool calls remain visible after restarting or reopening a run.
- Codex dynamic and MCP tool activity now preserves tool names, invocation ids, arguments, results, statuses, and Activity rows in reloaded run and team-member histories.
- Same-turn reasoning is persisted before later visible tool or assistant output, improving the continuity of reopened Codex conversations.

## Fixes

- Fixed reloaded Codex histories dropping or misordering dynamic/MCP tool calls after the desktop/backend runtime restarts.
- Fixed focused team-member history projection so it does not silently substitute native Codex thread history when local replay data is missing.
