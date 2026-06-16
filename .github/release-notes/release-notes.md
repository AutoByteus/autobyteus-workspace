# Release Notes — Streamable MCP Runtime Tools

## What Changed

- Codex and Claude now use the server-hosted `autobyteus_agent_tools` Streamable HTTP MCP gateway for AutoByteus agent tools.
- Unified browser, media, task-delegation, `send_message_to`, and `publish_artifacts` exposure through one run-scoped MCP route.
- Added owner-lifetime MCP sessions with bearer-token descriptors that are revoked with their owning agent run or team member.
- Normalized Agent Tools MCP activity so application events, run history, and memory use canonical tool names rather than provider wire names.
- Added configured MCP-origin tool support for Codex and Claude through the same gateway, preserving registered tool names and MCP result fields.
- Replaced older Codex dynamic-tool and Claude runtime-specific local MCP paths for these migrated tools.

## Validation

- Merged the finalized streamable MCP branch into `origin/personal`.
- User tested the locally built macOS Electron app from `personal` and confirmed it is working.
- Solution designer verified the current `personal` branch contains the intended streamable/server-hosted MCP implementation.
- Targeted MCP/runtime tests passed on `personal`.
- Local macOS ARM64 Electron build from `personal` passed and produced `AutoByteus_personal_macos-arm64-1.3.55` artifacts for user testing.

## Notes

- No manual migration command is required.
- Existing configured MCP tools must still be discovered/registered before assignment to agents.
- Provider runtimes receive run-scoped Agent Tools MCP descriptors; raw external MCP server configs are not copied into Codex or Claude provider-specific config.
