# General MCP Gateway

## Scope

The General MCP Gateway exposes the AutoByteus registry's configured MCP-origin
tools to external MCP clients through one stable Streamable HTTP endpoint:

```text
/mcp/gateway
```

Use this endpoint for external MCP clients such as Cursor, Antigravity, Claude
Code, or another Streamable HTTP MCP client that should call tools AutoByteus has
imported from configured MCP servers.

This gateway is intentionally separate from the run-scoped
[Agent Tools MCP Server](./agent_tools_mcp_server.md):

- `/mcp/gateway` is a process-level external gateway for registered
  `ToolOrigin.MCP` tools only.
- `/mcp/agent-tools/:sessionId` is a runtime/session-scoped surface on a
  separate process-local loopback listener. It may expose selected AutoByteus
  internal tools plus selected configured MCP-origin tools for that run.

The gateway does not expose AutoByteus internal/run-dependent tools such as
`send_message_to`, task delegation, media tools, browser tools, or
`publish_artifacts`.

## TS Source

- `src/mcp-gateway`
- route registration in `src/server-runtime.ts`
- MCP server import and proxy ownership in `src/mcp-server-management` and
  `autobyteus-ts`

## Endpoint And Methods

`/mcp/gateway` uses the MCP Streamable HTTP transport shape:

- `POST` handles JSON-RPC requests, notifications, and client responses.
- `GET` returns a small SSE compatibility response for Streamable HTTP clients.
- `OPTIONS` handles local CORS preflight.
- `DELETE` and other unsupported methods return `405 Method Not Allowed`.

The v1 JSON-RPC method set is intentionally small:

- `initialize`
- notifications such as `notifications/initialized` with `202 Accepted`
- `tools/list`
- `tools/call`
- `resources/list` with an empty resource list
- `resources/templates/list` with an empty template list
- `ping`

Malformed JSON, invalid JSON-RPC envelopes, unsupported MCP protocol versions,
bad content negotiation, bad origins, unauthorized requests, and missing or
non-MCP-origin tools fail before tool execution.

## Access Model

Production or non-local use should configure a gateway bearer token with:

```env
AUTOBYTEUS_MCP_GATEWAY_TOKEN=replace-with-a-long-random-token
```

When this environment variable is set, every non-`OPTIONS` gateway request must
include the matching bearer token:

```http
Authorization: Bearer replace-with-a-long-random-token
```

When `AUTOBYTEUS_MCP_GATEWAY_TOKEN` is not set, the gateway is available only to
local loopback requests. The request must come from a loopback client address
and use a loopback/localhost `Host` header. Remote-style requests without a
configured token are rejected. This no-token mode exists for local development
and local desktop clients only; do not rely on it for LAN, tailnet, or public
access.

CORS origin handling is also local-only: if an `Origin` header is present, it
must be a loopback HTTP/HTTPS origin.

## Tool Scope And Execution

`tools/list` reads the current shared tool registry and returns only definitions
whose `origin` is `ToolOrigin.MCP`. Results are sorted by registered tool name
and use each tool's current registered argument schema as the MCP input schema.

`tools/call` re-checks the current registry definition for the requested name
before execution. Calls fail closed when the tool is missing, has changed away
from `ToolOrigin.MCP`, or otherwise cannot be created as the current MCP-origin
tool.

Allowed tool calls execute through the existing registry-created MCP tool path:

```text
McpToolRegistrar -> GenericMcpTool / McpServerProxy -> external MCP server
```

This keeps remote tool-name mapping, transport ownership, connection reuse, and
cleanup with MCP Server Management and `autobyteus-ts`. The gateway supplies the
execution scope id `mcp-gateway/default`; it does not create or require an
`AgentRun` session.

The first gateway version exposes all currently registered MCP-origin tools to a
client that passes the access gate. It does not implement per-client profiles,
per-user subsets, persisted gateway sessions, or token-management UI.

## Client Configuration Example

Use the server base URL that matches the client network path:

```json
{
  "mcpServers": {
    "autobyteus": {
      "type": "streamable-http",
      "url": "http://localhost:8000/mcp/gateway",
      "headers": {
        "Authorization": "Bearer <configured gateway token>"
      }
    }
  }
}
```

For local no-token development, omit `headers.Authorization` and keep the client
connected through loopback, for example `http://localhost:8000/mcp/gateway`.

## Frontend Visibility

The web Settings / Tools area includes an **MCP Gateway** panel under the MCP
management tabs. The panel displays:

- the resolved `/mcp/gateway` endpoint based on the configured server base URL;
- a Streamable HTTP client config snippet;
- bearer-token guidance; and
- the current list/count of exposed MCP-origin tools.

The panel's tool list is informational. It fetches `tools(origin: MCP)` through
the existing GraphQL tools query and does not grant gateway access or manage the
gateway token.

## Current Out Of Scope

- exposing AutoByteus internal/run-scoped tools through `/mcp/gateway`;
- replacing `/mcp/agent-tools/:sessionId` for Claude SDK or Codex runtime
  materialization;
- gateway profiles, per-client tool subsets, user/principal models, or token
  management UI;
- persisted gateway sessions or durable bearer-token materialization files; and
- automated launch validation for external desktop clients such as Cursor,
  Antigravity, or Claude Code.
