# Release Notes: Claude Agent SDK Startup and Auto-Approval Fix

- Fixed Claude Agent SDK launches so AutoByteus `autoExecuteTools=true` no longer selects Claude Code `bypassPermissions`, avoiding the root/sudo startup rejection in Docker/server environments.
- Preserved Claude auto-approval through AutoByteus permission callbacks while keeping standard Claude provider permission mode at `default`.
- Improved Claude startup/auth diagnostics so generic process exits surface sanitized actionable causes.
- Added live GraphQL/WebSocket Claude E2E coverage proving workspace and outside-scratch write/delete/shell operations complete without frontend approval prompts when auto-approve is enabled.
- Updated runtime docs to remove stale `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` guidance.
