## What's New
- Agent Tools MCP now keeps a stable run-derived local endpoint across supported Agent and Team stop/restore cycles for Codex and Claude runtimes.

## Improvements
- Agent Tools runs on one dedicated process-local loopback listener instead of the user-selected Studio or standalone HTTP listener.
- Codex and Claude share the same tokenless, headerless run-session activation contract with fresh execution context on restore.
- Direct, Team-member, and stop-all termination now share one exact-run finalization boundary before stop can report success.

## Fixes
- Restored Team members no longer retain an unusable random Agent Tools session or report successful stop while the old live session remains registered.
- Cancelled or rejected termination keeps the current run/session active for retry, while accepted termination removes the exact session and attached resources before completion.

## Compatibility And Data
- Existing Agent/Team history remains directly usable; no schema migration, credential sidecar, vault entry, or memory-sync transition is required.
- The external `/mcp/gateway` endpoint and its optional bearer-token policy are unchanged.
