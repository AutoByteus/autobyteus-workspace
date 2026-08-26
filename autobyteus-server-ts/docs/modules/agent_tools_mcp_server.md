# Agent Tools MCP Server

## Scope

The AutoByteus Agent Tools MCP Server exposes selected server-owned agent tools
and selected configured MCP-origin registry tools to external runtimes through a
session-scoped Streamable HTTP MCP endpoint. It is a server-hosted tool surface
for runtimes that cannot call in-process AutoByteus tool wrappers directly.
Claude Agent SDK and Codex App Server are the first production runtime
materializers: configured Claude runs consume this endpoint through the SDK
`mcpServers` query option, and configured Codex runs consume it through
thread-scoped app-server `config.mcp_servers`.

This module is distinct from both [MCP Server Management](./mcp_server_management.md)
and the [General MCP Gateway](./mcp_gateway.md): MCP Server Management consumes
and registers external MCP servers as AutoByteus tools. The Agent Tools MCP
Server then exposes the agent-definition-selected registered tool names outward
to an MCP client through one runtime-scoped `autobyteus_agent_tools` descriptor.
It does not directly materialize raw external MCP server configs into Codex or
Claude provider-specific config. The General MCP Gateway, by contrast, is the
stable `/mcp/gateway` endpoint for external MCP clients and exposes only current
registered `ToolOrigin.MCP` tools, not AutoByteus internal run tools.

## TS Source

- `src/agent-tools/mcp`
- `src/agent-tools/mcp/providers`
- process host in `src/agent-tools/mcp/agent-tools-mcp-host.ts`
- session authority contract and implementation in
  `src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` and
  `src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts`
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

`AgentToolsMcpHost` owns the process-local registry, catalog, executor,
dispatcher, route dependencies, and `AgentToolMcpSessionAuthorityFactory`.
Every execution family begins a named authority assembly. The assembly is
completed only after the family's exact publication capability and readiness
assertion exist; aborting construction closes any partially assembled ledger.
The completed `ScopedAgentToolMcpSessionAuthority` is the only issuer exposed to
provider factories and the only owner allowed to revoke that scope's sessions.

The authority delegates descriptor creation to `AgentToolMcpSessionService`.
Each issued descriptor includes:

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
time, revocation time, optional execution observer, and redaction-safe
configured MCP source snapshots (`kind`, registered tool name, MCP server id).
Active sessions do not expire from a fixed wall-clock TTL. A request is valid
only while the session is present in the current process-memory registry, is not
revoked, and the bearer token matches the stored token hash.

Sessions are revoked when their owning `AgentRun` is terminated or
unregistered through `AgentRunManager`, when a mixed-team member handle is
disposed, when its execution scope closes, or when the process host closes. A
server/process restart clears the in-memory registry, so descriptors
from the previous process fail with the redacted `404 session_unavailable`
route response. Restored, resumed, or newly started runtime owners must
materialize a fresh descriptor in the current process before they use Agent
Tools MCP.

## Runtime Materialization

Claude Agent SDK materialization is programmatic and live-session scoped. When
the current Claude run has at least one configured, available Agent Tools MCP
tool, `ClaudeSession` creates an Agent Tools MCP session, reuses the private
descriptor while that `ClaudeSession` object remains live, and passes the
materialized SDK config under the reserved server name:

```ts
{
  autobyteus_agent_tools: {
    type: "http",
    url: descriptor.serverUrl,
    headers: descriptor.headers,
  },
}
```

Claude allowed-tool entries are generated from the descriptor's `enabledTools`.
For each enabled canonical tool name, Claude pre-approves both the canonical
name and the provider wire name such as
`mcp__autobyteus_agent_tools__generate_image`. If no supported tool is enabled,
the session does not create an Agent Tools MCP descriptor. Restored or newly
created Claude sessions rematerialize a fresh descriptor instead of persisting,
reusing, or refreshing bearer-token config by expiry.

Codex App Server materialization is also live-session scoped, but uses the app
server thread protocol. When a Codex standalone or team-member run has at least
one configured, available Agent Tools MCP tool, `CodexThreadBootstrapper`
creates an Agent Tools MCP session and passes only a thread-scoped config object
into `thread/start` and `thread/resume`:

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
`.codex/config.toml`, or any other durable project file. If no supported tool is
enabled, Codex does not create the descriptor or pass the MCP server config for
this surface.

## Configured Tool Boundary

The server-side session is the security boundary. `AgentToolMcpCatalog` derives
the enabled MCP tool list from the agent's configured AutoByteus tool exposure,
the server-supported MCP adapters, and the shared tool registry. It snapshots one
source-aware route per enabled wire tool name into the session, either a
`static_adapter` route for a server-owned adapter or a `configured_mcp_tool`
route for a selected registry tool.

Registry definitions with `ToolOrigin.MCP` and `metadata.mcp_server_id` are
eligible only when the registered tool name is selected by the agent definition.
Name-overlap behavior is adapter-policy driven: protected first-party
platform/control adapters such as `send_message_to` and `get_handoff_rules`
reserve their names and block configured MCP collisions, while browser static adapters prefer the
selected configured MCP-origin route. That lets a Docker/remote BrowserServer
MCP tool such as `open_tab` route through its configured MCP source even though
an embedded Electron browser adapter with the same name exists in code. The
session route table also prevents duplicate `tools/list` definitions and makes
`tools/call` use the same source selected during exposure. A client-side
`enabled_tools` field in a runtime config is only a narrowing/materialization
convenience; editing it cannot grant access to tools that the session did not
enable.

`tools/list` returns only tools enabled for the resolved session, and
`tools/call` rejects unknown or unconfigured tools before reaching any executor.
Stale configured MCP snapshots fail closed if the current registry definition is
missing, no longer MCP-origin, or no longer belongs to the same MCP server id.

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

## Supported Tool Families

`AgentToolMcpCatalog` is adapter-backed for server-owned tool families and
registry-backed for configured MCP-origin tools. Each server-owned adapter
supplies the MCP tool definition, availability gate, and execution delegate for
one canonical AutoByteus tool name. The default adapter set currently covers:

- `send_message_to`
- `get_handoff_rules`
- browser tools from `src/agent-tools/browser`
- media tools from `src/agent-tools/media`
- task-delegation tools from `src/agent-tools/task-delegation`
- `publish_artifacts`

The catalog filters by the session's resolved effective tool names. That set is
the configured Agent tool set plus the automatic Team collaboration trio when a
valid `MemberTeamContext` exists. A supported tool outside that effective set is
absent from `tools/list` and rejected by `tools/call`.

Configured MCP-origin tools are resolved from the shared `defaultToolRegistry`
rather than by re-reading persisted MCP config in provider runtime code. The
provider-facing tool name is the registered AutoByteus tool name, including any
configured `toolNamePrefix` such as `db_query`. Execution creates the registry
tool and delegates through the existing `GenericMcpTool` / MCP proxy path, so
remote tool-name mapping, transport ownership, connection reuse, and cleanup
remain with MCP Server Management and `autobyteus-ts`.

Family-specific behavior remains owned by the existing family services and
manifests:

- `send_message_to` delegates to the shared `SendMessageToDispatcher`.
  `recipient_address` requires an active `MemberTeamContext` and a rooted `/...` or
  immediate-Team-relative `./...` logical Agent-or-Team address;
  `target_agent_run_id` is a live-only exact active-run selector.
- `get_handoff_rules` delegates to the shared read-only service, takes no
  arguments, and is available only when the sender has active member
  collaboration context. It returns only ordered `{ when, recipient_address }`
  entries for that Agent's outgoing compiled handoffs.
- Embedded Electron browser static adapters reuse the browser manifest,
  parameter schemas, serialization, and `BrowserToolService`. They are available
  only when `BrowserToolService.isBrowserSupported()` is true, which currently
  means the desktop-started server received Browser bridge environment
  variables at startup. Configured MCP-origin browser tools, such as
  BrowserServer MCP tools on Docker/remote nodes, are not gated by
  `BrowserToolService`; they route as configured MCP tools through the registry
  and MCP proxy path.
- Media tools reuse the media manifest, parsers, media-local path policy, and
  `MediaGenerationService`. The MCP session execution context supplies the run
  workspace root, run id, and sender identity used by media execution.
- Task-delegation tools reuse the task-delegation manifest and
  `TaskDelegationToolService`. They are available only for sessions with an
  active `MemberTeamContext`; review feedback uses the canonical
  `review_task_result.comment` field rather than the ordinary-message
  `message` field.
- `publish_artifacts` reuses the published-artifact contract and
  `PublishedArtifactPublicationService`. It publishes against the owning active
  run id and uses session execution context as fallback runtime context for
  workspace, memory, and application-scoped publication.

The MCP result mapper returns standard MCP text content and sets `isError` when
the shared `AgentOperationResult` is not accepted. Configured MCP-origin tools
may also return raw MCP tool results; their `content`, `isError`,
`structuredContent`, and `_meta` fields are preserved for the provider runtime.
This raw envelope behavior is the MCP protocol boundary and must not be changed
by application-facing result projection.

Agent communication adapters use their dedicated mapper so `send_message_to`
and `get_handoff_rules` expose the exact same
`{accepted,code,message,result}` object in MCP text and `structuredContent`.
Their `isError` flag is `true` only for rejected outcomes, and exact operation
codes are not collapsed into provider-specific prose.

For Codex App Server and Claude Agent SDK, route-backed Agent Tools MCP
lifecycle events are normalized to canonical application-facing tool names such
as `send_message_to`, `open_tab`, `generate_image`, `delegate_task`, and
`publish_artifacts`. Provider/server-qualified names such as
`mcp__autobyteus_agent_tools__generate_image`, `autobyteus_agent_tools`, and
bearer/header config details must not leak into frontend events, run history, or
memory read models. Source-confirmed MCP terminal results also pass through the
general effective-result projector at the runtime lifecycle boundary: successful
MCP `content` / `structuredContent` envelopes become effective app-facing
results, and `isError: true` envelopes become failed tool lifecycle events. That
projection applies after provider event conversion has MCP source evidence and
must not be applied to the Agent Tools MCP JSON-RPC route response itself.

## Adding Future Tool Adapters

Future server-owned tools should be added by pairing one adapter definition with
an executor delegate that calls the existing server-owned service or dispatcher.
Do not reimplement business behavior inside the transport route. New adapters
must remain configuration-gated, define any additional context availability
gates explicitly, and add durable route/session/executor coverage.

## Current Out Of Scope

- production runtime MCP config materializers for Claude Code CLI or
  Antigravity CLI;
- persisted MCP sessions or persisted bearer-token reuse across restored runs;
- stale bearer-token config cleanup;
- complex long-lived or resumable SSE server push;
- exposing every local registry tool through Agent Tools MCP;
- using Agent Tools MCP as the general external `/mcp/gateway`;
- direct provider-native external MCP config materialization for configured MCP
  servers; and
- moving native AutoByteus in-process tools to this HTTP MCP route.
