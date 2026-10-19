# Design Spec — MCP SDK 1.32.1 upgrade and loader cleanup

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction of Task `autobyteus-181` (user informed 2026-10-19).
- Behavior-defining supplements: none
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/tickets/in-progress/mcp-sdk-1-32-upgrade/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/DESIGN.md`, `TESTING.md`, `data_migration_guideline.md` §2.
- Conflicts or discrepancies: none.

## Current-State Read

`autobyteus-ts/src/tools/mcp` owns the MCP client side. `McpConfigService` parses configs into the transport-specific config types. `McpServerInstanceManager` creates one managed server per agent and server, by transport. Each `*ManagedMcpServer` lazily imports the SDK client and transport and opens a session. The ownership is healthy.

The loaders carry machinery the SDK never needed: `any` casts, export-alias and constructor fallbacks, a `client.initialize()` branch, and `setSdkLoader` seams used only by mock tests. The WebSocket branch spans the types, the parser, the factory, a client file and tests. Its transport ignores every option, and the product can neither offer nor persist it. `autobyteus-server-ts` only consumes the parsed configs and the registrar.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - a dependency bump in 2 manifests plus the lockfile;
  - edits in 6 source files of one module (`autobyteus-ts/src/tools/mcp`): 2 loaders, `types.ts`, `config-service.ts`, `server-instance-manager.ts`, 2 index files;
  - 1 source file deleted (WebSocket client);
  - about 7 test files changed or deleted, plus 1 stdio fixture and 1 redirect test added.

  All of it stays inside existing ownership; no new owner, API or persistence.
- Architectural risk: `Low`
- Risk rationale:
  - The SDK minor upgrade is on the maintenance line, and its client API is unchanged for our calls (constructor and `requestInit` checked at the 1.32.1 tag).
  - The one behavior change, refusing cross-origin redirects, is the intended security tightening.
  - The WebSocket removal touches no persisted data, no GraphQL and no UI. `autobyteus-ts` has one workspace consumer.
  - The Claude Agent SDK peer path (`createSdkMcpServer`) is unused in production.
  - The full test rerun covers the shared-foundation change.
- Escalation trigger:
  - the lockfile cannot resolve one 1.32.1 copy;
  - a peer requires a different range;
  - a runtime (Claude, Codex, AGY, Grok) or the packaged Electron/Docker build changes behavior on 1.32.1;
  - something outside `autobyteus-ts/src/tools/mcp` turns out to depend on WebSocket MCP.

  Any of these → Design Impact.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| SDK 1.32.1 `src/client/streamableHttp.ts` L110-187 | Same `(url, opts)` constructor and `requestInit`; `redirectPolicy` default `'same-origin'` | The HTTP loader needs no API change; don't set the policy |
| SDK `client/websocket` 1.30/1.32.1 | Constructor `(url)` only | Remove WebSocket (DEC-001) |
| v2 client package listing | No WebSocket transport | Removal also eases autobyteus-182 |
| Lockfile peer entries | Claude Agent SDK `^1.29.0`, GenAI `^1.25.2` | One shared 1.32.1 copy |
| `grep` of SDK server imports in `src` | None in production | Server-side SDK fixes affect only test servers |

## Intended Change

Bump the SDK to 1.32.1. Reduce the stdio and HTTP loaders to one typed construction path each, with no seams. Delete the WebSocket transport. Replace the mock tests with real-server tests, including a redirect test.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. Areas:
  - the `autobyteus-ts/package.json` and `autobyteus-server-ts/package.json` dependency version, and `pnpm-lock.yaml`;
  - `autobyteus-ts/src/tools/mcp/` (loaders, types, parser, factory, exports);
  - `autobyteus-ts/tests/unit/tools/mcp/` and the WebSocket integration test;
  - one new stdio fixture under `autobyteus-ts/tests/fixtures/`.
- Deliberately left alone:
  - `autobyteus-server-ts` source (it uses no WebSocket and no seams);
  - `BaseManagedMcpServer`'s own `ClientSessionLike` contract (the SDK `Client` satisfies it);
  - the stdio/HTTP integration tests that need the external `autobyteus_mcps` toys;
  - the GraphQL, web and docs layers (none mention WebSocket MCP);
  - `ClaudeSdkClient`.
- Follow-ups:
  - O-002: `ClaudeSdkClient.createMcpServer()` in `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` has no production caller; its only user is `claude-sdk-client.integration.test.ts` L272. Dead code to remove in its own cleanup, or with autobyteus-182.
  - The `autobyteus-ts` stdio/HTTP integration tests depend on a sibling repo (`../autobyteus_mcps`, `uv`). They could be replaced by the self-contained fixtures this ticket adds; a test-hygiene follow-up.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Approved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-003, REQ-006; AC-001, AC-004, AC-007, AC-008 | Configure, preview, call (all runtimes) | Unchanged on 1.32.1 | DS-001 |
| BEH-002 | REQ-002; AC-002, AC-003 | Endpoint redirect | Same-origin followed, cross-origin refused | DS-001 (inside the SDK transport) |
| BEH-003 | REQ-005; AC-006 | Bulk import or parse with `websocket` | Rejected by `parseTransportType` | DS-002 |
| BEH-004 | REQ-004; AC-005 | — | One typed path | DS-001 |

## Relevant Supplemental Task Artifacts

None in this package. Predecessor: `origin/personal:tickets/done/mcp-http-auth-headers/` (autobyteus-179), whose tests are the preserved baseline.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` plus a dependency upgrade
- Current design issue found: `Yes` (local)
- Structural triggers:
  - Legacy-cleanup: fires. Fallback branches exist only for imagined old SDK shapes (`StdioTransport`, `.default`, a single-argument constructor, `initialize()`). SDK 1.30 and 1.32.1 have none of them.
  - Empty indirection: fires. `setSdkLoader` forwards to `import()` only for tests.
  - Shared-base overreach: does not fire (the base class is coherent).
- Root cause classification: `Legacy Or Compatibility Pressure`
- Refactor needed now: `Yes`, bounded to the loaders and WebSocket removal.
- Evidence: investigation Source Log.
- Design response: one typed path per loader; delete the WebSocket transport end to end; real-server tests replace seam-based mocks.
- Deferrals: O-002 and the external-toy integration tests (Change Scope follow-ups).

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: listed in the Removal Plan.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `mcps.json`.
- Change: none to stdio or HTTP shapes. WebSocket entries cannot exist in loadable form: they would be written in the stdio shape with an empty command and skipped by `getAll()`. The user's file has none.
- Decision: `Not Affected`.
- Rationale: no reader or writer change for supported shapes. Migration guideline §2: (1) no migration; (2) availability unaffected; (3) source shapes inspected: stdio and HTTP, and the user's file read for key names only; (4)–(8) N/A; (9) AC-006 proves the rejection; (10) no new mechanism.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002/004 | Agent tool call, registration or preview | Remote or stdio MCP server result | `*ManagedMcpServer` (via `McpServerInstanceManager`) | Every MCP use |
| DS-002 | Primary | BEH-003 | MCP JSON (bulk import or stored) | Config object or rejection | `McpConfigService.parseMcpConfigDict` | Which transports exist |

## Primary Execution Spine(s)

- DS-001: `Agent (any runtime) / GraphQL preview → McpToolRegistrar / registry MCP tool → McpServerInstanceManager.getServerInstance → StdioManagedMcpServer | HttpManagedMcpServer.createClientSession → SDK Client + StdioClientTransport | StreamableHTTPClientTransport → MCP server`
- DS-002: `Bulk import JSON / mcps.json → McpConfigService.parseMcpConfigDict → parseTransportType → StdioMcpServerConfig | StreamableHttpMcpServerConfig (or error)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The instance manager picks the client by transport (stdio or HTTP only). The client imports the SDK lazily with real types, builds the transport and connects. The SDK 1.32.1 transport handles redirects by origin. | `*ManagedMcpServer` |
| DS-002 | The transport type is validated against the enum, which now has two members, so `websocket` gets the existing clear error. | `McpConfigService` |

## Spine Actors / Main-Line Nodes

`McpConfigService`, `McpServerInstanceManager`, `StdioManagedMcpServer`, `HttpManagedMcpServer`, SDK `Client` and transports.

## Ownership Map

Unchanged. Each managed server owns its SDK adapter. `types.ts` owns config shapes. `config-service.ts` owns parsing. `server-instance-manager.ts` owns transport → client selection.

## Thin Entry Facades / Public Wrappers

`tools/mcp/index.ts` and `tools/mcp/server/index.ts` are re-export facades; they drop the WebSocket exports.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `StdioManagedMcpServer.sdkLoader` / `setSdkLoader`, hand types `ClientLike` and `SdkModule`, `any` casts, `StdioTransport`/`.default` aliases, optional `connect`, `client.initialize()` branch, `createClientInstance` try/catch | Dead: SDK 1.30/1.32.1 export `Client` and `StdioClientTransport` by name; `Client` has no `initialize`; `connect` always exists; `new Client(info)` never needs a retry | `const [{ Client }, { StdioClientTransport }] = await Promise.all([import(…index.js), import(…stdio.js)])`; `new Client({ name: 'autobyteus', version })`; `await client.connect(transport)` | In This Change |
| `HttpManagedMcpServer.sdkLoader` / `setSdkLoader`, hand types, `as unknown as` casts | Dead: no caller after 179 | Typed `import()` of `Client` and `StreamableHTTPClientTransport` | In This Change |
| `websocket-managed-mcp-server.ts` (file) | WebSocket transport removed (DEC-001) | — | In This Change |
| `McpTransportType.WEBSOCKET`, `WebsocketMcpServerConfig(Data)` in `types.ts` | Same | — | In This Change |
| WebSocket entries in `config-service.ts` (`TRANSPORT_SPECIFIC_PARAMS_KEY_MAP`, `TRANSPORT_TYPE_NAME`, construction branch, the `catch` rethrow special case) | Same | — | In This Change |
| `case McpTransportType.WEBSOCKET` in `server-instance-manager.ts` | Same | — | In This Change |
| WebSocket exports in `tools/mcp/index.ts`, `tools/mcp/server/index.ts` | Same | — | In This Change |
| `tests/unit/tools/mcp/websocket-managed-mcp-server.test.ts`, `tests/integration/tools/mcp/websocket-managed-mcp-server.test.ts`; WebSocket cases in `types.test.ts`, `config-service.test.ts`, `server-instance-manager.test.ts` | Tests for removed code | A rejection case in `config-service.test.ts` (AC-006) | In This Change |
| Mock-based `stdio-managed-mcp-server.test.ts` (uses `setSdkLoader`) | Seam removed | Real stdio fixture test (AC-007) | In This Change |
| `ClaudeSdkClient.createMcpServer` | Dead: no production caller | — | Follow-up (O-002) |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

None new.

## Ownership Boundaries

Unchanged. Only `autobyteus-ts/src/tools/mcp/server/*` imports SDK client modules.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| `*ManagedMcpServer` | SDK client and transport construction | Tests or other modules swapping the SDK via static setters; other modules importing SDK client modules |

## Dependency Rules

- `server/*` may import `@modelcontextprotocol/sdk/client/*` with its real types.
- No `any` or `as unknown as` around SDK values.
- `autobyteus-server-ts` keeps depending on the SDK directly, only for its tests (fixture servers), at the same 1.32.1 version.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `McpTransportType` | Becomes `STDIO`, `STREAMABLE_HTTP` |
| `BaseMcpConfig` union in parse results | `StdioMcpServerConfig \| StreamableHttpMcpServerConfig` |
| `StdioManagedMcpServer` / `HttpManagedMcpServer` | Public `setSdkLoader` / `sdkLoader` removed (no production caller; grep) |

## Interface Boundary Check

All singular and explicit; no change in identity shape.

## Main Domain Subject Naming Check

No renames.

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Real HTTP test server | Reuse the 179 in-process server pattern in `tests/unit/tools/mcp/http-managed-mcp-server.test.ts` |
| Real stdio server | New small fixture `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` (SDK `McpServer` + `StdioServerTransport`; a tool `report_env_and_cwd` returning a named env var and `process.cwd()`) |

## Subsystem / Capability-Area Allocation

One area: `autobyteus-ts` MCP tools (Extend/Remove), plus the dependency manifests.

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

| Structure | Action |
| --- | --- |
| `McpTransportType` and the config union | Tightened to the two real transports |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json` | `"@modelcontextprotocol/sdk": "1.32.1"` (exact pin, like today) |
| `pnpm-lock.yaml` | `pnpm install`; one `@modelcontextprotocol/sdk@1.32.1` entry; the peers of the Claude Agent SDK and GenAI resolve to it |
| `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` | Typed lazy import, one path, no seam |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | Typed lazy import, no seam, no casts; `new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers: config.requestHeaders() } })` (no `redirectPolicy`) |
| `autobyteus-ts/src/tools/mcp/server/websocket-managed-mcp-server.ts` | Delete |
| `autobyteus-ts/src/tools/mcp/types.ts` | Remove `WEBSOCKET` and the WebSocket config types |
| `autobyteus-ts/src/tools/mcp/config-service.ts` | Remove the WebSocket branches |
| `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | Remove the WebSocket case |
| `autobyteus-ts/src/tools/mcp/index.ts`, `…/server/index.ts` | Remove the WebSocket exports |
| `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` | New stdio fixture server |
| `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` | Rewrite against the fixture: connect, list, call; env value and cwd match the config; an unknown command fails cleanly |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | Keep the 179 cases. Add redirect cases: a cross-origin redirect (two in-process servers on different ports) fails and server B sees no request; a same-origin `/old → /mcp` redirect works |
| `autobyteus-ts/tests/unit/tools/mcp/{types,config-service,server-instance-manager}.test.ts` | Drop WebSocket cases; add the `websocket` rejection case (message lists `stdio, streamable_http`) |
| `autobyteus-ts/tests/unit/tools/mcp/websocket-managed-mcp-server.test.ts`, `autobyteus-ts/tests/integration/tools/mcp/websocket-managed-mcp-server.test.ts` | Delete |

## Applied Patterns

Adapter (managed servers), unchanged.

## Target Subsystem / Folder / File Mapping

Existing folders only; one fixture added under `tests/fixtures/`.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Loader | `const [{ Client }, { StdioClientTransport }] = await Promise.all([import('@modelcontextprotocol/sdk/client/index.js'), import('@modelcontextprotocol/sdk/client/stdio.js')]); const client = new Client({ name: 'autobyteus', version: '1.0.0' }); await client.connect(new StdioClientTransport({ command, args, env, cwd }));` | `(m as any).Client ?? (m as any).default?.Client`, `try { new C(info) } catch { new C() }`, `if (client.initialize) …` |
| Redirect | SDK default `'same-origin'` | `redirectPolicy: 'follow'` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep `setSdkLoader` for future mocks | Rejected | Real-server tests |
| Keep WebSocket types "for later" | Rejected | Re-add when a real server needs it (v2 has no client for it) |
| Keep export-alias fallbacks for old SDKs | Rejected | Exact-pinned SDK, real names |

## Change / Refactor Sequence

1. Bump both manifests, `pnpm install`, and check the lockfile (AC-001).
2. Rewrite the stdio and HTTP loaders; typecheck `autobyteus-ts`.
3. Remove WebSocket across types, parser, factory, exports and tests.
4. Add the stdio fixture and test, and the HTTP redirect tests.
5. Build `autobyteus-ts`; run the full core suite, then the server `typecheck`, `test:unit`, `test:integration:prepare` and `test:integration`, the web tests, and the server e2e for MCP (179's `mcp-http-auth-*`), plus the gated scripted runtime suites available locally.

## Key Tradeoffs

- Removing WebSocket rather than fixing it: we lose a non-functional, non-spec option and avoid writing our own transport.
- Typed lazy import rather than static import: no startup change, and still fully typed.

## Risks

- R-001: an endpoint that redirects cross-origin stops working. The intended tightening; the error says the redirect was not followed.
- R-002: the Claude Agent SDK peer change. No production use of its in-process MCP server; the Claude runtime suites rerun.

## Guidance For Implementation

- Prove failure first: the redirect test should fail on 1.30.0 (the cross-origin redirect is followed and server B is reached), then pass on 1.32.1.
- Keep error messages value-free; dummy values only.
- `pnpm -C autobyteus-ts build` before the server suites.
- Check that `grep -rn "setSdkLoader\|initialize?\|\.default?\.\|as any\|WEBSOCKET\|Websocket" autobyteus-ts/src/tools/mcp` returns nothing (AC-005).
