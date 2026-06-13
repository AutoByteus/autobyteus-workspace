# MCP Server Management

## Scope

MCP server configuration persistence, discovery, and tool registration for
external MCP servers that AutoByteus consumes.

This is the consumer/import side of MCP. The server-hosted AutoByteus Agent
Tools MCP Server lives under `src/agent-tools/mcp` and is documented separately
in [Agent Tools MCP Server](./agent_tools_mcp_server.md); it exposes configured
AutoByteus-owned tools outward to external MCP clients.

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
