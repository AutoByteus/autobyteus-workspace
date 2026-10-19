# MCP Server Management

## Scope

MCP server configuration persistence, discovery, and tool registration for
external MCP servers that AutoByteus consumes.

This is the consumer/import side of MCP. Two server-hosted outbound MCP
surfaces reuse the registered tools it creates:

- the [Agent Tools MCP Server](./agent_tools_mcp_server.md) under
  `src/agent-tools/mcp`, which exposes agent-definition-selected tools through a
  run-scoped `autobyteus_agent_tools` descriptor; and
- the [General MCP Gateway](./mcp_gateway.md) under `src/mcp-gateway`, which
  exposes all current registered `ToolOrigin.MCP` tools through the stable
  `/mcp/gateway` endpoint for external MCP clients.

After this subsystem discovers and registers external MCP tools as
`ToolOrigin.MCP` definitions with `metadata.mcp_server_id`, agent definitions
select those registered tool names in the same `toolNames` list as local tools.
Native AutoByteus executes them through the existing registry-created MCP tool
path. Codex App Server and Claude Agent SDK receive the same selected registered
names through the run-scoped `autobyteus_agent_tools` MCP descriptor instead of
through direct provider-native copies of the raw external MCP server config.
External desktop MCP clients that need the general gateway should use
`/mcp/gateway` with `AUTOBYTEUS_MCP_GATEWAY_TOKEN` configured for non-local
access.

## TS Source

- `src/mcp-server-management`
- `src/agent-tools/mcp-server-management`
- `src/api/graphql/types/mcp-server.ts`
- `src/startup/mcp-loader.ts`

## Main Service

- `src/mcp-server-management/services/mcp-config-service.ts`

## Remote (Streamable HTTP) Server Credentials

A streamable HTTP server entry in `<appDataDir>/mcps.json` may carry two
credential fields, stored as the user entered them:

- `headers`: sent unchanged on every request (initialize, tool listing, tool
  calls). Use it for any fixed header, such as `Authorization: Basic …`.
- `token`: sent as `Authorization: Bearer <token>` on every request. Surrounding
  whitespace is trimmed and a blank token means no token.

Setting both `token` and an `Authorization` header (any letter case) is rejected
on save, preview and import, so neither silently overrides the other. The
effective request headers are derived in one place,
`StreamableHttpMcpServerConfig.requestHeaders()` in `autobyteus-ts`, and the
client passes them to the MCP SDK as `requestInit.headers`. Both values are
currently stored in plain text, like stdio `env` values.

### Redirects

Remote requests follow redirects only within the configured URL's origin. This
is the default `redirectPolicy: 'same-origin'` of `@modelcontextprotocol/sdk`
1.32.x, and AutoByteus does not override it. So a credential never leaves the
configured origin:

- A same-origin redirect (for example 307/308 from `/mcp` to `/mcp-new`) is
  followed, and the credentials are sent to the new path.
- A redirect to another origin is not followed. Preview, connect or the tool
  call fails with `Redirect to <url> not followed (redirectPolicy:
  'same-origin')`, and the other origin receives no request. Configure the
  final URL instead.
- 301/302 on a POST are not followed even within the origin; this is the
  SDK's contract.

## Supported Transports

External MCP servers use `stdio` or `streamable_http` (GraphQL offers only
`STDIO` and `STREAMABLE_HTTP`). Any other `transport_type` in MCP JSON, such as
`websocket`, is rejected when the core config parser reads it, as in bulk
import, with `… Valid types are: stdio, streamable_http.`. A bulk import reports such
entries in its failed count, and the per-entry reason is in the server log. At
startup, a stored entry that does not parse as one of these transports is
skipped, and the other entries still register.

## Codex Example

- See `docs/modules/codex_integration.md`
- Import-ready MCP config template: `docs/examples/codex_mcp_import.json`
