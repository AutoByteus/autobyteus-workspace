# MCP Server Management

## Scope

MCP server configuration persistence, discovery, and tool registration for
external MCP servers that AutoByteus consumes.

This is the consumer/import side of MCP. The server-hosted AutoByteus Agent
Tools MCP Server lives under `src/agent-tools/mcp` and is documented separately
in [Agent Tools MCP Server](./agent_tools_mcp_server.md). After this subsystem
discovers and registers external MCP tools as `ToolOrigin.MCP` definitions with
`metadata.mcp_server_id`, agent definitions select those registered tool names
in the same `toolNames` list as local tools. Native AutoByteus executes them
through the existing registry-created MCP tool path. Codex App Server and Claude
Agent SDK receive the same selected registered names through the run-scoped
`autobyteus_agent_tools` MCP descriptor instead of through direct provider-native
copies of the raw external MCP server config.

## TS Source

- `src/mcp-server-management`
- `src/agent-tools/mcp-server-management`
- `src/api/graphql/types/mcp-server.ts`
- `src/startup/mcp-loader.ts`

## Main Service

- `src/mcp-server-management/services/mcp-config-service.ts`

## Codex Example

- See `docs/modules/codex_integration.md`
- Import-ready MCP config template: `docs/examples/codex_mcp_import.json`
