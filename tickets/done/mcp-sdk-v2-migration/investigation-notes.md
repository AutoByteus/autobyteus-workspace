# Investigation Notes — MCP TypeScript SDK v1.x → v2 migration

## Investigation Meta

- Package identifier: `mcp-sdk-v2-migration`
- Request / ticket: Project Task `autobyteus-182` (FU-9 of `autobyteus-175`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-20
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`, branch `codex/mcp-sdk-v2-migration`
- Resolved base: `origin/personal` @ `dc530fdcb0` (fetched 2026-10-20; contains the autobyteus-181 merge `6990940b8d` and the stable v1.5.7 release record)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (2026-10-20): `references/requirements-engineering.md`, `references/ticket-scope.md`; predecessor package `tickets/done/mcp-sdk-1-32-upgrade/` (investigation notes, design spec, handoff summary). Design gate (2026-10-20, after the skill updates): `references/architecture-design.md`, `references/design-principles.md` (shared, updated version), `DESIGN.md`, `TESTING.md`, `templates/design-spec-template.md` (updated), `references/handoff.md`
- Investigation status: Complete for design

## Initial Request And Clarifications

- Original request (Task text): move from `@modelcontextprotocol/sdk` v1.x to the v2 packages (`@modelcontextprotocol/client` 2.3.1), following the official upgrade guide. Investigation and design first: import paths, transport and client APIs, the agent-tools and gateway servers if they use SDK types. Implementation only after the user approves the plan.
- Added 2026-10-19 from the autobyteus-181 delivery: clean up O-002 (`ClaudeSdkClient.createMcpServer()`, dead in production) here or just before. Low priority: a local test of the SDK's same-host http→https redirect, if the migration touches the transports.
- Done when: the user approves the migration plan (what changes, risk, order relative to OAuth). Then both packages run on the v2 client with stdio, streamable HTTP with authentication, tools list and call working; tests rerun; merged; a beta; the user's check.
- User constraint carried from autobyteus-181 SR-002 (the user's words, 2026-10-19): "we have to make sure that the mcp upgrade doesn't break. Upgrading a library should make things better instead of breaking things." The user expects checks against real MCP servers and against our own MCP endpoints.

## Product And Domain Understanding

- Product area: MCP client in `autobyteus-ts` (connects AutoByteus to external MCP servers), used by every runtime; AutoByteus's own MCP endpoints in `autobyteus-server-ts` (Agent Tools MCP server, `/mcp/gateway`).
- Affected actors: users who configure MCP servers; agents on the native, Claude Agent SDK, Codex, AGY and Grok runtimes that call MCP tools; external MCP clients that connect to our endpoints; maintainers.
- Terminology: "legacy era" = MCP protocol revisions up to 2025-11-25 (the `initialize` handshake); "modern era" = revision 2026-07-28 (`server/discover`, stateless requests). "v1" = `@modelcontextprotocol/sdk` 1.x; "v2" = the split packages `@modelcontextprotocol/{client,server,core,node,…}` 2.x.

## Source Log

| Date | Type | Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | Code | `grep -rln @modelcontextprotocol` (repo, no `node_modules`/`tickets`) | Find every SDK user | Production: only `autobyteus-ts/src/tools/mcp/server/{base,http,stdio}-managed-mcp-server.ts`. Tests/fixtures: 7 files in `autobyteus-server-ts/tests`, 3 in `autobyteus-ts/tests` (list below) | — |
| 2026-10-20 | Code | `autobyteus-ts/src/tools/mcp/server/*.ts` | Current API use | `import('@modelcontextprotocol/sdk/client/index.js')`, `…/client/stdio.js`, `…/client/streamableHttp.js`; `new Client({name:'autobyteus',version:'1.0.0'})`; `new StdioClientTransport({command,args,env,cwd})`; `new StreamableHTTPClientTransport(url, { requestInit: { headers } })`; `client.listTools()`; `client.callTool({name,arguments}, undefined, {timeout: 6 min, signal})`; `close()`; type `Pick<Client,'listTools'|'callTool'|'close'>` | v2 `callTool` drops the result-schema argument |
| 2026-10-20 | Code | `grep "McpError\|StreamableHTTPError\|ErrorCode\.\|UnauthorizedError\|redirectPolicy"` in `autobyteus-ts/src`, `autobyteus-server-ts/src`, `autobyteus-web` | Do we depend on SDK error classes or texts? | No production code inspects SDK error classes or codes; errors are surfaced as their message text | Error text changes are visible but not parsed |
| 2026-10-20 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` L70-83; `src/mcp-gateway/mcp-gateway-method-dispatcher.ts` L69-82 | Do our endpoints use SDK types? | No. Hand-written JSON-RPC: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `ping`; anything else gets `-32601 Method not found`. **Correction (SR-004, ARCH-REV-001 AR-001):** before the dispatcher, the routes check `mcp-protocol-version` (`agent-tools-mcp-routes.ts` L22, L87-90, L139-149; `mcp-gateway-routes.ts` L26, L114-117, L159-169): missing → 2025-03-26; supported 2025-03-26/2025-06-18/2025-11-25; anything else → HTTP 400 + JSON-RPC `-32600` (`id: null`). So a v2 `auto` client's `server/discover` (header `2026-07-28`) gets 400/-32600, not `-32601` | They reach the SDK only when the called tool is an external MCP-origin tool |
| 2026-10-20 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` L37-51, L295-353; `grep createMcpServer\|createToolDefinition` | O-002 | `createMcpServer()` and `createToolDefinition()` and the `createSdkMcpServer` entries of `ClaudeSdkFunctionName`/`ClaudeSdkModuleLike` have no production caller; only `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` L247-300 uses them | Dead code in a file of the ticket's area |
| 2026-10-20 | Data | `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json` | Dependency shape | Both list `"@modelcontextprotocol/sdk": "1.32.1"` under `dependencies` (server: no production import; it serves tests and is the Claude Agent SDK's peer). `zod ^4.3.6` in both | v2 needs `zod ^4.2.0`: satisfied |
| 2026-10-20 | Data | `pnpm-lock.yaml` L650-656, L1351-1358, settings `autoInstallPeers: true`; `npm view @anthropic-ai/claude-agent-sdk@0.3.304 peerDependencies`; `npm view @google/genai@2.30.0 peerDependencies` | Peers | Claude Agent SDK (0.3.280 used; latest 0.3.304) has a **required** peer `@modelcontextprotocol/sdk ^1.29.0`; Google GenAI an **optional** peer `^1.25.2`. Neither offers a v2 peer yet | v1 stays in the tree as the Claude Agent SDK's peer |
| 2026-10-20 | Code | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.280…/sdk.d.ts` L4-10; prior grep of its `*.mjs` (autobyteus-181 SR-002) | What the peer is used for | Only `import type` (CallToolResult, ElicitResult, JSONRPCMessage, McpServer, ToolAnnotations) in `sdk.d.ts`; the runtime bundle does not import the SDK. Both packages use `skipLibCheck: true` | The v1 peer is types-only |
| 2026-10-20 | Code | `autobyteus-web/scripts/prepare-server.mjs` L186-275 | Desktop packaging | `pnpm deploy`, then `npm install` + `npm prune --omit=dev` in the staging folder (npm resolves the manifest, not the pnpm lockfile) | The packaged app must get the v2 client and its deps (`jose`, `cross-spawn`, `eventsource`, `eventsource-parser`, `pkce-challenge`, `@modelcontextprotocol/core`) |
| 2026-10-20 | Runtime | `ELECTRON_RUN_AS_NODE=1 Electron -p process.versions` (Electron 42.4.1) | Node engine | Node 24.16.0. Server Docker image `node:22-bookworm`. v2 requires Node ≥ 20 | No runtime prerequisite |
| 2026-10-20 | Code | `autobyteus-ts/tsconfig.json`, `autobyteus-server-ts/tsconfig.json` | Module resolution | `module`/`moduleResolution` `NodeNext` | v2 subpath exports (`@modelcontextprotocol/client/stdio`) resolve |
| 2026-10-20 | Doc | `autobyteus-server-ts/docs/modules/mcp_server_management.md` L114-147 "Verifying An MCP SDK Upgrade" | Required verification | Names the suites to rerun after an SDK upgrade (core MCP integration with the Python and Node fixtures, the two HTTP e2e files, the gated runtime × MCP matrix) | Follow it; update its wording for v2 |
| 2026-10-20 | Contract | `npm view @modelcontextprotocol/{client,server,core,node,express,codemod}`; `npm view @modelcontextprotocol/client time` | Versions | client/server/core 2.3.1 (2026-10-05), node 2.1.1, all `engines.node >=20`; v2.0.0 released 2026-07-27; `@modelcontextprotocol/sdk` latest stays 1.32.1 | — |
| 2026-10-20 | Contract | v1.32.1 `README.md` L3-7 | Support window | "v1.x … the maintenance line. It implements the MCP spec up to 2025-11-25. Support for the 2026-07-28 spec is not planned for v1.x … continues to receive bug fixes and security updates for at least six months after the v2 release (2026-07-27)" → about 2027-01-27 at the earliest | Deadline |
| 2026-10-20 | Web | `ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2` | Official guide | Package split; `@modelcontextprotocol/client/stdio`; spec methods drop the result schema; `McpError`→`ProtocolError`, `StreamableHTTPError`→`SdkHttpError` (HTTP status in `.status`); server: `registerTool` only, Node HTTP transport is `NodeStreamableHTTPServerTransport` in `@modelcontextprotocol/node`; schemas in `@modelcontextprotocol/core`; OAuth error consolidation (`OAuthError`), issuer stamps, `AuthProvider`; codemod `npx @modelcontextprotocol/codemod v1-to-v2 .` | — |
| 2026-10-20 | Contract | `@modelcontextprotocol/client@2.3.1` `dist/index.d.mts` L1892-2048 (`ClientOptions`), L2089-2098, L2560-2720 (`callTool`, `listTools`), `index-B-4n9P0J.d.mts` L1836-1881 (`RequestOptions`) | Client API | `callTool(params, options?)` with `timeout`, `signal`; `listTools()` without cursor **walks every page** (cap `listMaxPages` 64) and caches the aggregate (default TTL 0 = always refetched); `versionNegotiation` **defaults to `'legacy'`**: "connect() runs the plain 2025 sequence, byte-identical to today's behavior"; `'auto'` probes `server/discover` and on the SDK stdio transport spawns "a short-lived sibling process … (one extra spawn per connect)" | Decisions DEC-002, DEC-004 |
| 2026-10-20 | Contract | v1.32.1 `dist/esm/client/index.js` L554-559 | v1 listing | `listTools(params)` sends one `tools/list` request and returns that page only | Paginating servers currently lose tools after page 1 |
| 2026-10-20 | Contract | `@modelcontextprotocol/client@2.3.1` `dist/stdio.d.mts`, `dist/stdio.mjs` L65-201 vs v1.32.1 `client/stdio.js` | Stdio parity | Same parameters (`command`, `args`, `env` merged over the default safe env, `cwd`, `stderr`, `maxBufferSize`), `shell:false`, same close sequence (stdin end, 2 s, SIGTERM, 2 s, SIGKILL) | — |
| 2026-10-20 | Contract | client `index.d.mts` L3384-3444; `src-WCy6ifGf.mjs` L6821-6875 vs v1.32.1 `shared/transport.js` L39-110 | HTTP parity | `requestInit.headers` sent on every request; transport-managed headers (`Authorization` from an `authProvider`, `mcp-session-id`, `mcp-protocol-version`) win over same-named entries; `redirectPolicy` default `'same-origin'`; same origin rule incl. same-host http→https on default ports; new error wording | — |
| 2026-10-20 | Code | test files using the SDK | Test surface | Client side (v1 `Client` + `StreamableHTTPClientTransport` against our endpoints): `agent-tools-mcp-routes.integration.test.ts`, `mcp-gateway-routes.integration.test.ts`, `mcp-run-session-cleanup.e2e.test.ts`, `mcp-http-redirect-and-transport.e2e.test.ts`, `mcp-http-auth-remote-server.e2e.test.ts`, `collaboration-root-harness.ts`, `tests/fixtures/agy-failure-cli.mjs`. Server side (v1 `McpServer`, `StreamableHTTPServerTransport`, `StdioServerTransport`): `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` (variadic `mcp.tool`), `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`, `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` (variadic `mcp.tool`), the stdio fixture inside `mcp-gateway-routes.integration.test.ts` L98-115. Schema: `ToolSchema` from `…/sdk/types.js` in `collaboration-result-contracts.test.ts` | v2 equivalents: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@modelcontextprotocol/core` |
| 2026-10-20 | Code | `autobyteus-ts/tests/fixtures/mcp-test-server/pyproject.toml` | Real non-TS server | Python fixture uses `mcp>=2.3,<3` (official Python SDK) | Real-server coverage independent of the TS SDK |
| 2026-10-20 | Contract | `npm view @modelcontextprotocol/server-filesystem@2026.8.31 / @2.0.0 dependencies` | Published servers of both lines | 2026.8.31 depends on `@modelcontextprotocol/sdk ^1.30.0`; 2.0.0 (latest) on `@modelcontextprotocol/server ^2.3.1`. `server-everything` 2.0.0 is v2 too | Usable as real v1- and v2-based servers in validation |
| 2026-10-20 | Contract | `isWithinOrigin` in v1.32.1 and v2.3.1 (rows above) | Task's low-priority test | Same-host http→https is followed only when both URLs use default ports (80→443) | A local test needs privileged ports and a trusted TLS certificate (DEC-007) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger / Contract | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Settings → MCP server (stdio): preview, save/register; agent tool call on any runtime | `McpServerInstanceManager` → `StdioManagedMcpServer` → SDK v1 `Client` + `StdioClientTransport` | Tools listed; calls return content/structured content/tool errors; configured env and cwd reach the child; exit-at-start fails fast, hang-at-start fails after the wait; close leaves no orphan | autobyteus-181 SR-002 parity report; `mcp_server_management.md` L125-135 | High |
| BEH-002 | User/System | Same for streamable HTTP with configured headers | `HttpManagedMcpServer` → `StreamableHTTPClientTransport(url, {requestInit:{headers}})` | Headers on every POST/GET/DELETE; 401 fails the preview with the SDK error text | autobyteus-179 tests; probe | High |
| BEH-003 | System | HTTP endpoint redirects | SDK transport | Same-origin followed with credentials; cross-origin refused with `Redirect to <url> not followed (redirectPolicy: 'same-origin')` | `mcp-http-redirect-and-transport.e2e.test.ts` L146-152 | High |
| BEH-004 | System | HTTP error status (401/403/404/500) | SDK transport | Error text `Streamable HTTP error: Error POSTing to endpoint: <body>` | probe `probes/probe-output.txt` | High |
| BEH-005 | System | Tools list | `listRemoteTools()` → `client.listTools()` | First page only; a paginating server's later tools are missing | v1 `client/index.js` L554-559 | High (code) |
| BEH-006 | System | Tool call | `callTool(..., undefined, {timeout: 360000, signal})` | 6-minute timeout; run cancellation aborts the call | `base-managed-mcp-server.ts` L105-121 | High |
| BEH-007 | Contract | Handshake | v1 client | Legacy `initialize`, `mcp-protocol-version: 2025-11-25`; one process per stdio connect | probe | High |
| BEH-008 | Contract | External MCP clients (Claude, Codex, AGY, Grok, tests) → `/agent-tools` MCP and `/mcp/gateway` | Hand-written JSON-RPC | Serve legacy-era clients; unknown methods → `-32601` | dispatcher rows | High |
| BEH-009 | Operational | Claude runtime | Claude Agent SDK with HTTP `autobyteus_agent_tools` descriptor | Its MCP peer is types-only; `createMcpServer` unused | rows above | High |
| BEH-010 | Operational | Packaged desktop app / Docker image | `prepare-server.mjs` npm install; Docker build | Starts with SDK 1.32.1 | autobyteus-181 DR-002 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/{base,stdio,http}-managed-mcp-server.ts` | Only production SDK users | Small source change | Typed `import()` of `@modelcontextprotocol/client` and `/stdio`; `callTool` options position |
| `autobyteus-ts/tests/unit/tools/mcp/base-managed-mcp-server.test.ts` | Mocks the session | Assertion on the call shape changes | — |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` (509 lines) | Claude SDK adapter | O-002 removal shrinks it | Keep `resolveFunction` union consistent |
| Test files listed in the Source Log | Real test servers and SDK clients | Move to v2 packages (devDependencies) | `NodeStreamableHTTPServerTransport.handleRequest(req, res, parsedBody)` shape |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Upgrade verification guide, redirect wording | Docs sync | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `mcps.json`: unchanged shapes (no reader/writer change).
- Packages and lockfile: `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `pnpm-lock.yaml`.

### Structural Surfaces

- MCP client adapters in `autobyteus-ts/src/tools/mcp/server/`; Claude SDK adapter; test servers/clients; desktop packaging (`prepare-server.mjs`, unchanged logic).

### Potential Structural Impacts To Investigate

- API or external-contract change: the wire protocol stays 2025-11-25 in `legacy` mode (DEC-002); visible error texts change (DEC-003).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none (same header handling and redirect rule). OAuth is not added.
- Concurrency or lifecycle change: none expected (same transport lifecycle); `auto` mode would add a probe process per stdio connect (not proposed).
- Deployment change: new transitive packages in the packaged app.
- Confirmed absent: SDK use in our own MCP endpoints.

## Runtime, Probe, Or Reproduction Findings

All probes in `probes/` (scripts and `probe-output.txt`), run 2026-10-20 in scratch folders under `/tmp`, dummy values only.

| Method | Scenario | Observation | Implication |
| --- | --- | --- | --- |
| `probes/v2-client-vs-v1-server-probe.mjs` | v2 client 2.3.1 → v1 1.32.1 servers, stdio and HTTP, default and `auto` mode | Default mode: stdio works, env `dummy-123` and cwd reach the child, **1 spawn**; HTTP works with `Authorization` on every POST and the GET, protocol `2025-11-25`, era `legacy`. `auto`: stdio **2 spawns** (connect 242 ms vs 118 ms for a Node server); HTTP one extra `2026-07-28` probe POST, then falls back to legacy | Default mode is a drop-in; `auto` has a per-connect cost (DEC-002) |
| `probes/http-error-text-v1-vs-v2-probe.mjs` | 401/403/404/500, cross-origin redirect, connection refused | v1 `StreamableHTTPError: Streamable HTTP error: Error POSTing to endpoint: <body>` (`.code` = status). v2 `SdkHttpError: Error POSTing to endpoint: <body>` (`.status` = status). Redirect: v2 `Redirect to <url> not followed; use that URL as the endpoint if it is the intended server (redirectPolicy: 'same-origin')`. Refused: `TypeError: fetch failed` on both | Visible wording changes (DEC-003); redirect e2e assertion L146 changes, L152 still matches |
| `probes/published-filesystem-server-probe.mjs` | v2 client → published `server-filesystem` 2026.8.31 (v1 SDK) and 2.0.0 (v2 SDK) over stdio | Both: 14 tools, `read_text_file` returns the file. Default mode: legacy `2025-11-25` on both. `auto`: legacy with the v1 server, **modern `2026-07-28`** with the v2 server | v2 client is compatible with real servers of both lines |

## Stakeholder And User Evidence

| Source | Need / Constraint | Strength | Implication |
| --- | --- | --- | --- |
| User, autobyteus-181 SR-002 (2026-10-19) | "Upgrading a library should make things better instead of breaking things"; check real servers and our own endpoints | Strong, explicit | Before/after parity validation is required (REQ-009) |
| User, 2026-10-19 (FU-9 approval) | Migrate before v1 support ends; ideally before/with OAuth | Explicit | Order decision DEC-001 |
| Task Done-when | User approves the plan (what changes, risk, order relative to OAuth); beta and the user's check | Explicit | Approval is the user's (step 2) |

## External Contracts, Standards, And Dependencies

| Contract | Version | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| `@modelcontextprotocol/client` | 2.3.1 | Node ≥ 20, zod ^4.2.0, ESM+CJS | npm | New transitive deps in the packaged app |
| `@modelcontextprotocol/server`, `/node`, `/core` | 2.3.1 / 2.1.1 / 2.3.1 | Test servers and spec schemas | npm, guide | `/node` brings `hono` + `@hono/node-server` (dev only) |
| `@modelcontextprotocol/sdk` | 1.32.1 | Maintenance until ≥ 2027-01-27; spec ≤ 2025-11-25 | v1 README | Stays only as the Claude Agent SDK's peer |
| `@anthropic-ai/claude-agent-sdk` | 0.3.280 (latest 0.3.304) | Required peer `@modelcontextprotocol/sdk ^1.29.0` | lockfile, npm | Types-only use |
| MCP spec | 2025-11-25 (legacy), 2026-07-28 (modern) | v2 speaks both; legacy by default | client docs | — |

## Persisted Data And State Facts

- Affected stored subject: none. `mcps.json` shapes, the vault and run history are untouched.

## Product Design Request Context

- Product Design request: `Not stated`. No UI change.

## Product Design Findings

N/A.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` (5 scripts + `probe-output.txt`) | Solution Designer | Compatibility, error-text and test-server-shape evidence | Evidence only | BEH-002..008, DEC-002/003, AC-005..007 | Final | Not behavior-defining |
| `tickets/done/mcp-sdk-1-32-upgrade/` (on `personal`) | Predecessor | Parity method (SR-002/003), matrix suite, docs | Reference | REQ-009 | Archived | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | Users see different SDK error wording (no "Streamable HTTP error:" prefix; longer redirect advice) | Visible text | Accepted (DEC-003); docs and tests updated | Accepted |
| R-002 | Risk | Packaged app misses a v2 transitive dependency | MCP would fail only in the packaged app | Packaged isolated-app parity (REQ-009) | Open → validation |
| R-003 | Risk | v2 validates server responses more strictly than v1 for some real server. Known case RR-001 (ARCH-REV-001 MP-001, reviewer script): v2's default validator rejects a tool `outputSchema` declaring draft-04 ("unsupported dialect"); v1 1.32.1 accepted it; only that tool's calls would fail | A server that works today could fail | Before/after parity on real servers of both SDK lines and Python; the parity run records each server's `outputSchema` `$schema` | Open → validation |
| R-006 | Note | Python fixture uses the Python SDK `mcp>=2.3`; unaffected | — | — | Closed |
| R-004 | Risk | Other in-flight work edits `autobyteus-ts/src/tools/mcp/server/` (FU-2 vault, FU-3 OAuth) | Merge conflicts | Sequence by DEC-001 | Open |
| R-005 | Risk | A later OAuth `authProvider` token overrides a configured `Authorization` header (v2 precedence) | FU-3 design | Recorded for FU-3 | Note |
| U-001 | Unknown | Whether some real server the user runs paginates `tools/list` | DEC-004 changes visible tool counts only for such servers | Counts recorded in parity | Open → validation |

## Architecture Investigation Findings

Gathered 2026-10-20 after the user's approval (SR-002).

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `@modelcontextprotocol/node@2.1.1` `dist/index.d.mts` L112-179 | `new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })`; `handleRequest(req, res, parsedBody?)`, the same call shape as v1's `StreamableHTTPServerTransport` | Test HTTP servers change import and class name only |
| `@modelcontextprotocol/server@2.3.1` `createMcpHandler-D4NN8WsG.d.mts` L2941, L3245-3384, L2540 | `McpServer.registerTool(name, { inputSchema: z.object(...) \| raw shape (deprecated overload) }, handler)`; variadic `.tool()` gone; low-level `Server` with `setRequestHandler('tools/list', handler)` | Rewrite `mcp.tool(...)` (2 files) to `registerTool`; use `z.object` (not the deprecated raw-shape overload); a paginating server is a low-level `Server` |
| `probes/v2-test-server-shapes-probe.mjs` (output in `probes/probe-output.txt`) | (1) v2 `McpServer` + Node transport: tools listed, `structuredContent {sum:5}`. (2) Paged `tools/list` (2 pages): the v2 client returns all 4 tools. (3) A hand-written JSON-RPC server answering like ours (`-32601` for unknown methods): `legacy` → `initialize` first; `auto` → `server/discover` (−32601) then `initialize`, era `legacy`, tools listed | AC-005 is testable as designed. Probe (3) does **not** model our routes' protocol-version check (ARCH-REV-001 AR-001); see the next row |
| `probes/route-protocol-header-auto-fallback-probe.mjs` (SR-004; output in `probes/probe-output.txt`) | A stand-in with our routes' exact first check (400 + `-32600`, `id: null` for an unsupported `mcp-protocol-version`), then the dispatcher. `legacy`: `initialize` (no header → 2025-03-26 accepted), era legacy, list and call work. `auto`: `server/discover` with `2026-07-28` → 400/-32600, then `initialize`, era `legacy`, version `2025-11-25`, list and call work. Consistent with client 2.3.1 `classifyHttpError` → `classifyRpcError` (a 4xx other than 401/403 with a JSON-RPC error body other than `-32022` is a legacy signal) | AC-007 (against the real routes) is expected to pass with no endpoint change |
| `claude-sdk-client.ts` L228, L260, L316-349, L395, L445-450, L478 (`grep -n "callSdkFunction\|asObject\|asString"`) | `callSdkFunction` has one caller (L345, inside `createMcpServer`); `asObject` is also used at L478 (`tryGetSupportedModelsFromQueryControl`), `asString` at L228/L260/L395 | Remove `callSdkFunction` with O-002; keep both imports |
| `grep -rn createToolDefinition autobyteus-server-ts/src autobyteus-server-ts/tests` | Also matches an unrelated local helper in `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` L59/L102 | The AC-008 grep for that name is limited to `src/runtime-management` and `tests/integration/runtime-management` |
| `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` | Node twin of the Python fixture; `MCP_TEST_SERVER_PID_FILE` overwrites (one pid) | A start counter needs an append-mode marker (`MCP_TEST_SERVER_START_LOG`) |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` L55-110 | Records every request's HTTP and JSON-RPC method (`received`, `rpcMethods`) | AC-006 (HTTP: first method `initialize`, no `server/discover`) fits the existing helper |
| `autobyteus-ts/tests/unit/tools/mcp/base-managed-mcp-server.test.ts` L55-65 | Asserts `callTool({name, arguments}, undefined, {timeout})` | Changes to `callTool({name, arguments}, {timeout})` |
| `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` L93-115 | Writes a v1 stdio server script under `tests/.tmp` (resolves server-ts `node_modules`) | Script imports become `@modelcontextprotocol/server` and `/server/stdio`; server-ts needs the server package as devDependency |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` L100-106 | Scripted AGY CLI (separate Node process, resolves server-ts `node_modules`) uses v1 client | Imports become `@modelcontextprotocol/client`; server-ts needs the client package as devDependency |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` L282-330 | Real-loopback SDK client test against the Agent Tools endpoint; tools with `outputSchema` (`oneOf`) | Move to v2 client; add the `auto` case (AC-007) |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` L247-300 | Only user of `createToolDefinition`/`createMcpServer` (live Claude test) | Remove that case with the dead code |
| `autobyteus-server-ts/docs/modules/agent_execution.md` L698-699 | States "exact direct peers … `@modelcontextprotocol/sdk@1.30.0`" (already stale: 1.32.1) | Becomes false after DEC-006; update in this ticket (REQ-011) |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` L50-70, L114-147 | Names `@modelcontextprotocol/sdk` 1.32.x, the v1 redirect text, the upgrade verification list | Update for v2 |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` L15-26 | `pnpm install --no-frozen-lockfile` in the image build | Docker image takes the new packages from the workspace manifests |
| `autobyteus-web/scripts/prepare-server.mjs` L186-275 (unchanged) | npm install of the deployed server manifest + packed `autobyteus-ts` tarball; npm 7+ installs required peers | The packaged app gets `@modelcontextprotocol/client` via `autobyteus-ts`, and v1 only as the Claude Agent SDK's peer; verify in the packaged parity run |

Exact test/fixture inventory to migrate (14 files): see `design-spec.md` Final File Responsibility Mapping.

## Requirement Implications

- The change is a client-library swap with a small production surface (3 files) but a wide blast radius (every runtime's external MCP tools). The user's explicit parity expectation makes before/after validation a requirement, not an option.
- v2's default `legacy` negotiation keeps the wire protocol identical, so "nothing breaks" is provable; opting into 2026-07-28 is a separate decision with a per-connect cost.
- Three visible differences come with v2 itself: error wording, all-pages tool listing, and (only if opted in) the modern protocol.
- OAuth (FU-3) would be built on v2's changed OAuth API; building it on v1 first would mean doing it twice.

## Notes For Architecture Design

- Map SCN-001..SCN-005 to the managed-server spine (unchanged ownership).
- Verify `NodeStreamableHTTPServerTransport.handleRequest` signature and `McpServer.registerTool` with zod raw shapes vs `z.object` in v2 for the test servers.
- Decide the devDependency set per package (`@modelcontextprotocol/server`, `/node`, `/core`, `/client` for server-ts tests).
- Confirm `pnpm install` leaves exactly one `@modelcontextprotocol/sdk` copy (the peer) and that no AutoByteus file imports it.
