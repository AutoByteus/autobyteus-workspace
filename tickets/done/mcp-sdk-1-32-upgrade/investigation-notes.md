# Investigation Notes — MCP SDK 1.32.1 upgrade and loader cleanup

## Investigation Meta

- Package identifier: `mcp-sdk-1-32-upgrade`
- Request / ticket: Project Task `autobyteus-181` (FU-8 of `autobyteus-175`), with the follow-ups of `autobyteus-179` added
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`, branch `codex/mcp-sdk-1-32-upgrade`
- Resolved base: `origin/personal` @ `436b85ce93f9013b1b1dca4dfa3b662a546fbbb0` (fetched 2026-10-19; contains the autobyteus-179 merge `3a6aa85e28`)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `data_migration_guideline.md` §2 (all read in this conversation, 2026-10-19)
- Investigation status: Complete for design

## Initial Request And Clarifications

- Task: bump `@modelcontextprotocol/sdk` 1.30.0 → 1.32.1 in `autobyteus-ts` and `autobyteus-server-ts`; do not set `redirectPolicy: 'follow'`; remove the dead loader fallbacks and the `setSdkLoader` seams and use the SDK's real types; decide WebSocket (fix or remove). Done when: lockfile updated, full suites rerun, autobyteus-179 auth tests green, dead code gone, WebSocket decided, merged, next beta.
- User approval of the follow-up: "yes please. i think it makes sense for a follow up" (2026-10-19).

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-10-19 | Code | `grep '"@modelcontextprotocol/sdk"' --include=package.json` | Direct dependents: `autobyteus-ts/package.json` L34 and `autobyteus-server-ts/package.json` L37, both `1.30.0` |
| 2026-10-19 | Data | `pnpm-lock.yaml` L655-656, L1353-1356, L8700-8703, L9506-9513 | Peer consumers: `@anthropic-ai/claude-agent-sdk@0.3.280` (peer `^1.29.0`) and `@google/genai@2.24.0` (optional peer `^1.25.2`). Both accept 1.32.1, and both resolve to the workspace's single SDK copy |
| 2026-10-19 | Code | `grep createSdkMcpServer` in `autobyteus-server-ts/src` | Only `runtime-management/claude/client/claude-sdk-client.ts` `createMcpServer()`, which has no production caller (only `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` L272). Claude runs use the HTTP `autobyteus_agent_tools` descriptor. Dead code outside this ticket's files: follow-up |
| 2026-10-19 | Code | `grep mcpToTool` in `autobyteus-ts/src` | `@google/genai`'s MCP helper is unused |
| 2026-10-19 | Code | `grep` of SDK imports in `src` | Production imports only the client side: `client/index.js`, `client/stdio.js`, `client/streamableHttp.js`, `client/websocket.js`. Our agent-tools endpoint and gateway are hand-written JSON-RPC (`agent-tools-mcp-method-dispatcher.ts`), not SDK servers |
| 2026-10-19 | Code | `grep modelcontextprotocol/sdk` in tests | Tests that use the SDK server side: `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts`, `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`, `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts`, `tests/e2e/helpers/collaboration-root-harness.ts`, `tests/fixtures/agy-failure-cli.mjs`, `tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts`, `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` |
| 2026-10-19 | Code | `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` | `any` casts, export-alias fallbacks (`StdioTransport`, `.default`), optional `connect`, `client.initialize()` branch, `createClientInstance` try/catch, `setSdkLoader` seam |
| 2026-10-19 | Code | `…/http-managed-mcp-server.ts` (after 179) | Hand-written `SdkModule` types with `as unknown as` casts and a `setSdkLoader` seam with no caller |
| 2026-10-19 | Code | `…/websocket-managed-mcp-server.ts` | Same fallbacks; builds `headers`, `origin`, `subprotocols`, timeouts and TLS options |
| 2026-10-19 | Contract | SDK 1.30.0 `dist/esm/client/websocket.js` L7-15; 1.32.1 `src/client/websocket.ts` L17-29 | `WebSocketClientTransport` constructor takes **only `url`** and opens `new WebSocket(url, 'mcp')`. Every option AutoByteus builds is ignored |
| 2026-10-19 | Contract | `gh api …/typescript-sdk/contents/packages/client/src/client` (v2) | The v2 client has `stdio`, `sse` and `streamableHttp`, and **no WebSocket transport** |
| 2026-10-19 | Contract | MCP spec 2025-11-25 transports | stdio and Streamable HTTP are the defined transports; WebSocket is not one |
| 2026-10-19 | Code | `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts` L12-15 | GraphQL `McpTransportTypeEnum` = `STDIO`, `STREAMABLE_HTTP` only |
| 2026-10-19 | Code | `autobyteus-web` grep | No WebSocket MCP in the UI; the form's `normalizeTransport` rejects other types |
| 2026-10-19 | Code | `config-service.ts` `parseTransportType`; server `importConfigsFromJson` / `applyAndRegisterConfigsFromJson` | Bulk JSON import with `"transport_type": "websocket"` parses. `toStandardEntry` then writes it in the stdio shape (`command: ""`), which `getAll()` skips on the next load. Mechanically reachable by pasting non-UI JSON into bulk import; it never survives a restart, and its options never take effect |
| 2026-10-19 | Data | user's `~/.autobyteus/server-data/mcps.json`, read-only, key names only | 6 entries, all stdio; no WebSocket entry |
| 2026-10-19 | Code | `grep WebsocketMcpServerConfig\|WebsocketManagedMcpServer\|McpTransportType.WEBSOCKET` outside `autobyteus-ts` | No consumer outside `autobyteus-ts/src/tools/mcp` and its tests. `autobyteus-ts` is not published (npm 404); its only consumer is `autobyteus-server-ts` (`workspace:*`) |
| 2026-10-19 | Contract | 1.32.1 `src/client/streamableHttp.ts` L118-187 | `redirectPolicy` defaults to `'same-origin'`. An unfollowed redirect fails with an error text ending `(redirectPolicy: 'same-origin')` |
| 2026-10-19 | Contract | release notes 1.30.1…1.32.1; `compare/1.30.0...1.32.1` client files | Client changes: redirect policy (`streamableHttp.ts`, `sse.ts`), OAuth issuer binding (`auth.ts`, `auth-extensions.ts`). The server-side fixes (body limit, batch length, omitted arguments) reach only our test servers |
| 2026-10-19 | Contract | `npm view @modelcontextprotocol/sdk@1.32.1 engines` | `node >= 18`, unchanged. Server Docker image is Node 22 |

## Relevant Existing Behavior

| ID | Behavior | Evidence |
| --- | --- | --- |
| BEH-001 | Stdio and HTTP MCP servers connect, list and call tools through the SDK client 1.30.0 | managed servers; 179 tests |
| BEH-002 | HTTP transport follows any redirect, cross-origin included (SDK 1.30 default fetch) | release note 1.32.0 |
| BEH-003 | WebSocket MCP is configurable only through non-UI JSON import, never persists correctly, and ignores its options | rows above |
| BEH-004 | Loaders use `any` casts and fallbacks the SDK never needs; unit tests mock the SDK via `setSdkLoader` | code rows |

## Persisted Data And State Facts

- `mcps.json`: the stdio/HTTP shapes are unchanged by this work. A WebSocket entry cannot exist in loadable form (it is written in the stdio shape with an empty command and skipped on load); the user's real file has none.
- No other persisted data is touched.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | A user's HTTP MCP endpoint redirects cross-origin and stops working | Intended tightening; clear SDK error; guide: use the final URL | Accepted |
| R-002 | Risk | Claude Agent SDK behaves differently on the 1.32.1 peer | Only `createSdkMcpServer` uses it and has no production caller; Claude runtime tests rerun | Mitigated |
| R-003 | Risk | Removing the lazy `import()` changes startup | Keep a typed dynamic `import()` | Avoided |
| O-002 | Observation | `ClaudeSdkClient.createMcpServer` is dead in production | Follow-up | Follow-up |

## Prerequisite Check

Question: does anything have to be fixed before this upgrade can reach its goal safely? Checked:
- peer ranges of `@anthropic-ai/claude-agent-sdk` and `@google/genai`;
- Node engine requirement;
- our use of SDK server APIs (none in production);
- the 179 auth path (unchanged option shape in 1.32.1, `requestInit` at L110/L171).

Result: no prerequisite found.
