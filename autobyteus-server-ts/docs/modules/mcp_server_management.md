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
`STDIO` and `STREAMABLE_HTTP`). The core config parser
(`McpConfigService` in `autobyteus-ts`) decides an entry's transport with one
rule, for bulk import and for loading `mcps.json` alike:

- an explicit `transport_type` (or the `transportType` alias) is used as given;
- otherwise a non-empty `url` means `streamable_http`, and a non-empty
  `command` means `stdio`. This is the shape the app writes to `mcps.json`, so
  that file's content can be bulk-imported into another install;
- otherwise the entry fails with "needs 'command' (stdio) or 'url'
  (streamable_http), or an explicit 'transport_type'".

Any other `transport_type`, such as `websocket`, is rejected with
`… Valid types are: stdio, streamable_http.`.

Bulk import (`importMcpServerConfigs`) imports each entry on its own. The
result keeps `success`, `message`, `importedCount` and `failedCount`, and adds
`failures`: one `{ serverId, reason }` per entry that was not imported.
Reasons name fields and never contain env, header or token values. A
whole-input error (invalid JSON, no top-level `mcpServers`) returns
`success: false` with its message and an empty `failures` list. At startup, a
stored entry that does not parse is skipped, and the other entries still
register.

## Server Instance Lifetime

An MCP tool call runs on a server instance (a stdio child process or an HTTP
client session) that `McpServerInstanceManager` in `autobyteus-ts` keeps per
agent id and server id. Every runtime uses the AgentRun's `runId` as that agent
id: native runs directly, the others through the Agent Tools MCP endpoint. When a
run is released, `AgentRunResourceManager.release()` starts closing that run's
instances; every way a run ends goes through it (termination, idle shutdown of a
delegated copy, replacement, removal). The close runs in the background: it
never delays or fails the release, and a failed close is logged with the run and
server ids. The manager detaches a run's instances before closing them, so a run
woken right after it ended gets new instances. The `/mcp/gateway` instances are
shared under one scope (`mcp-gateway/default`) and are not tied to any run.
Preview and tool discovery open their own short-lived sessions.

## Verifying An MCP SDK Upgrade

In AutoByteus code, only `autobyteus-ts/src/tools/mcp/server/` imports
`@modelcontextprotocol/sdk`. `autobyteus-server-ts/src` does not: the Agent
Tools MCP server and `/mcp/gateway` are hand-written JSON-RPC, and they reach
the SDK only when the called tool is an external MCP-origin tool. The Claude
Agent SDK and Google GenAI packages also resolve the same SDK copy as a peer
dependency; keep a single copy in `pnpm-lock.yaml`. An SDK upgrade therefore
changes the external-server client path for every runtime. Rerun these with
the new SDK:

- `autobyteus-ts/tests/integration/tools/mcp` (ungated; the command is the
  "Core library MCP integration" row of `TESTING.md`). These tests run the
  MCP client against the repository's own tiny real MCP servers
  (`autobyteus-ts/tests/fixtures/mcp-test-server/`, Python via `uv run`, and
  `mcp-stdio-fixture-server.mjs`, Node) over stdio and streamable HTTP. They
  cover tools, structured content, tool errors, slow calls, env and cwd, exit
  and hang at start, closing, and the auth header. Without `uv`, or when `uv`
  cannot prepare the fixture, the Python cases skip with the reason and the
  Node cases still run. The opt-in `real-user-kind-mcp-server.test.ts`
  (`RUN_REAL_MCP_SERVER_E2E=1`, `AUTOBYTEUS_MCPS_DIR`) also lists the tools of a
  real `uv` server folder from a temp copy.
- `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` and
  `mcp-http-redirect-and-transport.e2e.test.ts` (ungated; need a current
  server build): credentials on every request, the redirect rule and the
  transport set.
- `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` (gated per runtime;
  every case skips without its gate, and a skip is not a pass): each runtime
  calls the project tools `create_task`/`update_task`, an external stdio tool
  (env and cwd checked) and an external HTTP tool (credential checked). Gates:
  `RUN_AGY_FAILURE_E2E` with `ANTIGRAVITY_CLI_COMMAND` (scripted, no model),
  `RUN_LMSTUDIO_E2E` (native), `RUN_CLAUDE_E2E`, `RUN_CODEX_E2E` (live turn),
  `RUN_CODEX_MCP_E2E` (Codex's own MCP client, no model turn) and
  `RUN_GROK_E2E`. The file header lists the options.

## Codex Example

- See `docs/modules/codex_integration.md`
- Import-ready MCP config template: `docs/examples/codex_mcp_import.json`
