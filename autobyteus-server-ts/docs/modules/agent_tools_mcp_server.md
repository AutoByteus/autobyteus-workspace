# Agent Tools MCP Server

## Scope

The AutoByteus Agent Tools MCP Server exposes selected server-owned agent tools
to external runtimes through a session-scoped Streamable HTTP MCP endpoint. It
is a server-hosted tool surface for runtimes that cannot call in-process
AutoByteus tool wrappers directly. Claude Agent SDK and Codex App Server are the
first production runtime materializers: configured Claude runs consume this
endpoint through the SDK `mcpServers` query option, and configured Codex runs
consume it through thread-scoped app-server `config.mcp_servers`.

This module is distinct from [MCP Server Management](./mcp_server_management.md):
MCP Server Management consumes and registers external MCP servers as AutoByteus
tools, while the Agent Tools MCP Server exposes AutoByteus-owned tools outward
to an MCP client.

## TS Source

- `src/agent-tools/mcp`
- `src/agent-tools/mcp/providers`
- Claude runtime materializer in
  `src/agent-execution/backends/claude/agent-tools-mcp`
- Codex runtime materializer in
  `src/agent-execution/backends/codex/agent-tools-mcp`
- route registration in `src/server-runtime.ts`
- run/member lifecycle revocation hooks in:
  - `src/agent-execution/services/agent-run-manager.ts`
  - `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`

## Public Endpoint

Generated runtime descriptors use the reserved MCP server name
`autobyteus_agent_tools` and the Streamable HTTP transport:

```text
/mcp/agent-tools/:sessionId
```

The same endpoint handles the MCP Streamable HTTP methods:

- `POST` for JSON-RPC requests, notifications, and client responses.
- `GET` for SSE compatibility with Streamable HTTP clients.
- `OPTIONS` for local preflight handling.
- `DELETE` currently returns `405 Method Not Allowed`; AutoByteus run/member
  lifecycle remains the owner of session revocation.

The route validates loopback-only `Origin` values when an origin header is
present, requires a bearer capability token for authenticated methods, redacts
unavailable or token-mismatched sessions as `404`, and supports the negotiated
MCP protocol versions recognized by the route dispatcher.

## Session And Descriptor Ownership

`AgentToolMcpSessionService` creates session descriptors for runtime
materializers. The descriptor includes:

- `name: "autobyteus_agent_tools"`
- `transport: "streamable_http"`
- `serverUrl`
- bearer `Authorization` header
- `enabledTools`

The secret descriptor is only for the runtime session that will consume it.
Logs, diagnostics, and handoffs should use the redacted descriptor shape, which
redacts both the bearer token and the session id in the URL.

`AgentToolMcpSessionRegistry` stores only the token hash, owner identity, sender
context, runtime kind, configured exposure snapshot, enabled tool list, creation
time, expiry time, and optional execution observer. The default session TTL is
12 hours. Sessions are revoked when their owning `AgentRun` is unregistered and
when a mixed-team member handle is disposed.

## Runtime Materialization

Claude Agent SDK materialization is programmatic and live-session scoped. When
the current Claude run is configured for `send_message_to`, `ClaudeSession`
creates or refreshes an Agent Tools MCP session, keeps the secret descriptor only
in private session memory, and passes the materialized SDK config under the
reserved server name:

```ts
{
  autobyteus_agent_tools: {
    type: "http",
    url: descriptor.serverUrl,
    headers: descriptor.headers,
  },
}
```

The matching Claude `allowedTools` entry is
`mcp__autobyteus_agent_tools__send_message_to`. If `send_message_to` is not
configured, the session does not create an Agent Tools MCP descriptor or expose
that allowed tool. Restored or refreshed Claude sessions rematerialize a fresh
descriptor instead of persisting or reusing bearer-token config files.

Codex App Server materialization is also live-session scoped, but uses the app
server thread protocol. When a Codex standalone or team-member run is configured
for `send_message_to`, `CodexThreadBootstrapper` creates an Agent Tools MCP
session and passes only a thread-scoped config object into `thread/start` and
`thread/resume`:

```ts
{
  mcp_servers: {
    autobyteus_agent_tools: {
      url: descriptor.serverUrl,
      http_headers: descriptor.headers,
      enabled_tools: descriptor.enabledTools,
      startup_timeout_sec: 5,
    },
  },
}
```

Codex must not materialize this bearer-bearing descriptor through shared
process-wide launch flags, `CODEX_APP_SERVER_ARGS*`, trusted
`.codex/config.toml`, or any other durable project file. If `send_message_to` is
not configured, Codex does not create the descriptor or pass the MCP server
config for this surface.

## Configured Tool Boundary

The server-side session is the security boundary. `AgentToolMcpCatalog` derives
the enabled MCP tool list from the agent's configured AutoByteus tool exposure
and the server-supported MCP providers. A client-side `enabled_tools` field in a
runtime config is only a narrowing/materialization convenience; editing it
cannot grant access to tools that the session did not enable.

`tools/list` returns only tools enabled for the resolved session, and
`tools/call` rejects unknown or unconfigured tools before reaching any executor.

## JSON-RPC Methods

The v1 endpoint handles:

- `initialize`
- notifications such as `notifications/initialized` with `202 Accepted`
- `tools/list`
- `tools/call`
- `resources/list` with an empty resource list
- `resources/templates/list` with an empty template list
- `ping`

Malformed JSON, invalid JSON-RPC envelopes, unsupported protocol versions, bad
content negotiation, bad origins, missing bearer tokens, and unavailable
sessions fail before tool execution.

## Supported Tools In V1

The first supported MCP tool is `send_message_to`.

`SendMessageToMcpDefinitionProvider` reuses the shared
`src/agent-communication` public contract and parameter schema. Tool execution
delegates through `AgentToolMcpToolExecutor` to the shared
`SendMessageToDispatcher`, so selector semantics remain identical to the native
AutoByteus local wrapper and the Codex/Claude Agent Tools MCP projections:

- `recipient_name` requires an active `MemberTeamContext` and routes through
  team-local delivery.
- `target_agent_run_id` is a live-only exact active-run selector.

The MCP result mapper returns standard MCP text content and sets `isError` when
the shared `AgentOperationResult` is not accepted.

For Codex App Server and Claude Agent SDK, route-backed `send_message_to`
lifecycle events are normalized to the canonical application-facing tool name
`send_message_to`. Provider/server-qualified names such as
`mcp__autobyteus_agent_tools__send_message_to`, `autobyteus_agent_tools`, and
bearer/header config details must not leak into frontend events, run history, or
memory read models.

## Future Tool Adapters

Future server-owned tools should be added by pairing:

1. a definition provider that maps the canonical tool contract/schema into MCP
   tool metadata, and
2. an executor path that delegates to the existing server-owned service or
   dispatcher.

Do not reimplement business behavior inside the transport route. Browser,
media, task-delegation, publish-artifacts, or other future tools must remain
configuration-gated and should add durable route/session/executor coverage when
they become supported on this MCP surface.

## Out Of Scope For V1

- production runtime MCP config materializers for Claude Code CLI or
  Antigravity CLI;
- persisted MCP sessions or persisted bearer-token reuse across restored runs;
- stale bearer-token config cleanup;
- complex long-lived or resumable SSE server push; and
- non-`send_message_to` server-owned MCP adapters.
