# Release Notes — agy-empty-mcp-config-activation

## Fixed

- **Antigravity CLI runtime:** Agents, teams and orgs on `antigravity_cli` no longer fail with "Failed to prepare agent run" when `~/.gemini/config/mcp_config.json` (or the workspace `.agents/mcp_config.json`) is empty or whitespace-only. AGY tooling can create that empty file. It is now treated as "no MCP servers configured", which matches `agy` itself. User config files are still never modified. Malformed JSON and a same-name server conflict still stop activation, as before.
