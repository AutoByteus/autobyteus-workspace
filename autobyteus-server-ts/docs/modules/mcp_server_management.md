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

- `src/mcp-server-management/services/mcp-config-service.ts`: the configure,
  preview, import, delete, list and move sequences, and the service write lock
  that runs every config write one at a time.
- `src/mcp-server-management/services/mcp-server-secret-fields.ts`
  (`McpServerSecretFields`): the only MCP code that writes MCP secrets to the
  vault or reads their state.
- `src/mcp-server-management/services/mcp-secret-suggestion-rule.ts`: the
  secret suggestion rule.
- `src/mcp-server-management/domain/mcp-server-draft.ts`: the server draft every
  save and preview starts from.

## Remote (Streamable HTTP) Server Credentials

A streamable HTTP server entry in `<appDataDir>/mcps.json` may carry two
credential fields:

- `headers`: sent unchanged on every request (initialize, tool listing, tool
  calls). Use it for any fixed header, such as `Authorization: Basic …`.
- `token`: sent as `Authorization: Bearer <token>` on every request. Surrounding
  whitespace is trimmed and a blank token means no token.

Setting both `token` and an `Authorization` header (any letter case) is rejected
on save, preview and import, so neither silently overrides the other. The
effective request headers are derived in one place,
`StreamableHttpMcpServerConfig.requestHeaders(resolved)` in `autobyteus-ts`,
from the values resolved at connect, and the client passes them to the MCP SDK
as `requestInit.headers`. Both are always-secret fields: stored in the vault
(see [Secret Values](#secret-values)).

## Secret Values

An env value (stdio), a header value or the token (HTTP) is either a plain
string or a **secret reference**, `{ "vaultSecretId": "mcp.<uuid>" }`, whose
value is an **MCP secret** in the server's vault (consumer kind `mcpServer`).
`mcps.json` never holds a secret's value. Plain strings stay a supported shape:
they are settings until the user locks or moves them.

- **Which values are secret.** The HTTP `token` and an `Authorization` header
  (any letter case) are always secret: no value of theirs is ever returned, even
  while one is still stored plain. Any other value is secret when the user locks
  its row. The **secret suggestion rule** pre-locks a new row and selects move
  candidates: a name containing `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `PASS`,
  `CREDENTIAL` or `AUTH` (any case), or a value starting with `github_pat_`,
  `ghp_`, `sk-`, `xoxb-`, `glpat-`, `ATATT` or `AKIA`. It is a suggestion only
  (for example `TOKEN_LIMIT=4096` is matched and can be unlocked). The web reads
  it from `mcpSecretSuggestionRule` and never defines it; shared vectors in
  `test-support/fixtures/mcp-secret-suggestion-vectors.json` keep both sides the
  same.
- **Saving (configure, the JSON tab, import).** GraphQL input rows
  (`McpConfigEntryInput {name, secret, value}`, `McpTokenInput {value | keep}`)
  become a server draft: `plain`, `newSecret` (a value to store) or `keep` (what
  is stored for that field); import can also produce `missingSecret` (below),
  which the GraphQL input cannot express. A new secret is saved under a new
  `mcp.<uuid>` before the file is written; the entries the server no longer
  references (replaced, unlocked or removed fields) are removed after the write
  commits; if the write fails, the new entries are removed instead. A save
  writes no backup: only the move does.
- **Showing.** `mcpServers` and the configure result return each env or header
  row as `McpConfigEntry {name, value, state}` and the token as `tokenState`.
  `value` is set only for a plain value of a field that is not always secret.
  The state is `PLAIN`, `CONFIGURED` (entry present), `MISSING` (no entry) or
  `VAULT_UNAVAILABLE` (the vault is not READY); a vault that is not READY never
  fails the query.
- **Using.** A managed MCP server resolves its references when it connects, and
  never earlier, through the `McpSecretResolver` that `server-runtime.ts`
  installs once the vault is initialized (`installRuntimeMcpSecretResolver`).
  A missing entry or an unavailable vault fails the connect with `MCP server
  '<id>' needs secret: <field> (no value is stored | the vault is unavailable).`,
  with no value; there is no plain fallback. A stdio server receives its secrets
  in its process environment, where its own process can read them (the UI says
  so).
- **Preview** never stores anything: new values are used in memory, kept
  secrets are resolved from the saved server's references.
- **Delete** removes the server's vault entries once the file write commits.
- **Move to vault** (`mcpSecretMoveCandidates`, `moveMcpSecretsToVault`): a
  maintenance action the user triggers, never automatic. Candidates are plain
  values of always-secret fields and plain values the rule matches (no value or
  part of one is returned). The move saves each selected value that is still
  plain as a new MCP secret, then the provider, in one locked write, writes the
  backup `mcps.json.backup-before-vault-move-<timestamp>` (mode 0600, next to
  `mcps.json`; it holds the plain values) and rewrites the file with the
  references; the cache follows. If that write fails, the new entries are
  removed and the file is unchanged. After the service lock is released, each
  changed server is added again and its tools are re-registered. The result
  names the backup path, the moved and skipped fields, and servers whose tools
  could not be registered again.
- **Import** stores always-secret values and values the rule matches as MCP
  secrets and lists them in `storedSecrets`. An entry holding a secret reference
  always imports (MDEC-007): when the server with that ID already holds a
  reference at that field, it keeps its own (so re-importing an older copy of
  its file never removes a working secret); any other reference becomes
  `missingSecret`, a fresh `mcp.<uuid>` with no vault entry (state `MISSING`,
  "needs secret"), listed in `needsSecret`. A foreign vault ID is never adopted,
  so no two servers share an entry.

### Redirects

Remote requests follow redirects only within the configured URL's origin. This
is the default `redirectPolicy: 'same-origin'` of `@modelcontextprotocol/client`
2.x, and AutoByteus does not override it. So a credential never leaves the
configured origin:

- A same-origin redirect (for example 307/308 from `/mcp` to `/mcp-new`) is
  followed, and the credentials are sent to the new path.
- A redirect to another origin is not followed. Preview, connect or the tool
  call fails with `HTTP 307 Temporary Redirect: Redirect to <url> not followed;
  use that URL as the endpoint if it is the intended server (redirectPolicy:
  'same-origin')` (the redirect's own status first), and the other origin
  receives no request. Configure the final URL instead.
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
`failures`: one `{ serverId, reason }` per entry that was not imported, and
`storedSecrets`: one `{ serverId, field }` per value stored as an MCP secret, and
`needsSecret`: one per imported secret reference this node does not hold.
Reasons name fields and never contain env, header or token values. A
whole-input error (invalid JSON, no top-level `mcpServers`) returns
`success: false` with its message and empty lists. At startup, a stored entry
that does not parse is skipped with a warning that names the server and the
error (never a value), and the other entries still register.

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

The MCP client is `@modelcontextprotocol/client` (2.x, pinned exactly in
`autobyteus-ts/package.json`). In AutoByteus code, only
`autobyteus-ts/src/tools/mcp/server/` imports it, lazily on first connect.
`autobyteus-server-ts/src` imports no MCP SDK: the Agent Tools MCP server and
`/mcp/gateway` are hand-written JSON-RPC, and they reach the SDK only when the
called tool is an external MCP-origin tool. The client keeps the SDK's default
`legacy` protocol negotiation: `connect()` runs the 2025 `initialize`
handshake (2025-11-25) and starts a stdio server once; AutoByteus sets no
`versionNegotiation`. Tool listing walks every page of a paginating server.

Preview, discovery and tool calls show the SDK's error text, and no AutoByteus
code parses it. The one addition is the HTTP status of a failed remote connect:

- When a remote server answers the connect with an HTTP error, the SDK keeps
  the status on its `SdkHttpError`, not in the message. `HttpManagedMcpServer`
  in `autobyteus-ts` therefore puts it first, followed by the SDK's text:
  `Error: HTTP 401 Unauthorized: Error POSTing to endpoint: <response body>`.
  The reason phrase is left out when the response has none (`HTTP 401: …`). A
  404 with an empty body reads `HTTP 404 Not Found: Error POSTing to endpoint: `.
  The text carries no header or token value. Preview prefixes it with `Failed to
  preview tools for MCP server: `; discovery returns it as the `message` of a
  `success: false` result; a native agent's tool call that has to connect
  reports it inside `Error executing tool '<name>' (ID: …): …`. Agents on AGY,
  Codex and Claude reach the tool through the Agent Tools MCP endpoint, which
  returns the same text as the tool's result with `isError: true`, so their
  turn goes on and the agent reads the reason (see
  [Agent Tools MCP Server](agent_tools_mcp_server.md#supported-tool-families)).
- A failure without an HTTP answer keeps the SDK's or Node's text with no
  status, for example `TypeError: fetch failed` when nothing listens.
- An HTTP error on a session that is already connected (listing tools, a tool
  call) keeps the SDK's text unchanged.
- A stdio server that exits at start fails with `SdkError: Connection closed`.
- A stdio server that does not answer `initialize` fails after 60 seconds (the
  SDK's default request timeout) with `SdkError: Request timed out`.

The v1 SDK worded these as `Streamable HTTP error: Error POSTing to endpoint:
…`, `McpError: MCP error -32000: Connection closed` and `McpError: MCP error
-32001: Request timed out`.

Tests use the v2 packages as devDependencies: `@modelcontextprotocol/server`
and `@modelcontextprotocol/node` for the test servers, `@modelcontextprotocol/client`
for test clients of our own endpoints, and `@modelcontextprotocol/core` for the
spec schemas. The v1 package `@modelcontextprotocol/sdk` stays in
`pnpm-lock.yaml` only as the peer the Claude Agent SDK (and, optionally, Google
GenAI) requires; that peer is used for types only, and AutoByteus does not
depend on it. An SDK upgrade changes the external-server client path for every
runtime. Rerun these with the new SDK:

- `autobyteus-ts/tests/integration/tools/mcp` (ungated; the command is the
  "Core library MCP integration" row of `TESTING.md`). These tests run the
  MCP client against the repository's own tiny real MCP servers
  (`autobyteus-ts/tests/fixtures/mcp-test-server/`, Python via `uv run`, and
  `mcp-stdio-fixture-server.mjs`, Node) over stdio and streamable HTTP. They
  cover tools, structured content, tool errors, slow calls, env and cwd, exit
  and hang at start, closing, and the auth header. The unit tests in
  `autobyteus-ts/tests/unit/tools/mcp` add the 2025 handshake (one stdio start,
  `initialize` first), cancellation, the timeout options and paged tool
  listing. Without `uv`, or when `uv`
  cannot prepare the fixture, the Python cases skip with the reason and the
  Node cases still run. The opt-in `real-user-kind-mcp-server.test.ts`
  (`RUN_REAL_MCP_SERVER_E2E=1`, `AUTOBYTEUS_MCPS_DIR`) also lists the tools of a
  real `uv` server folder from a temp copy.
- `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  and `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts`:
  SDK clients, in default and in `auto` negotiation mode, against our own
  endpoints.
- `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` and
  `mcp-http-redirect-and-transport.e2e.test.ts` (ungated; need a current
  server build): credentials on every request (stored in the vault, resolved
  again after a restart), the redirect rule and the transport set.
- `tests/e2e/tool-management/mcp-secrets-in-vault.e2e.test.ts` (ungated; needs
  a current server build): a plain `mcps.json` from before the vault, the move
  with its backup, a locked save, resolution through `/mcp/gateway` after a
  restart, and no value in any response, output or file.
- `tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts` (gated:
  `RUN_GITHUB_MCP_E2E=1` with `AUTOBYTEUS_TEST_VAULT`): GitHub's remote MCP
  server with its token stored as an MCP secret; see `TESTING.md` "Test vault".
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
