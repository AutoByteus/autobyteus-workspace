# Antigravity MCP tool presentation

- New Antigravity MCP calls show the actual tool name and its own arguments instead of the provider's `call_mcp_tool` wrapper.
- AutoByteus tools keep their names; third-party tools show `mcp__<server>__<tool>`.
- MCP output containing a JSON object or array is shown as structured data; other output is unchanged.
- Native tools retain their existing behavior. Unusable MCP wrappers retain the provider presentation.
- Previously stored runs are not rewritten.

This release does not include the deferred Team-history, migration or broad test-repair work.
