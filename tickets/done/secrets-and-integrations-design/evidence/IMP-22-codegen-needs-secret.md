# IMP-22 — codegen after SR-008 (needsSecret)
# Command: node /tmp/244-codegen/run.mjs <worktree> (startBuiltTestServer; BACKEND_GRAPHQL_BASE_URL=… pnpm -C autobyteus-web codegen; server stopped, runtime removed)
# Commit: server at 4505158d77 (dist rebuilt); output committed in fc6032999e
# Environment: macOS Darwin 25.5.0, Node v22.23.1
# Date: 2026-10-26

- Codegen succeeded. Compared with the committed file: 88 hunks; 3 contain `needsSecret` (the `ImportMcpServerConfigsResult` field, the mutation result type, the import document) and were applied by original line number (7 insertions, 1 deletion).
- No other MCP-related hunk differs: the round-1 hand-applied MCP hunks match fresh codegen exactly. The remaining hunks are unrelated drift and were not committed.
