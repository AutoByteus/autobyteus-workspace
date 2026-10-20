# Design Spec — MCP TypeScript SDK v1.x → v2 migration

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (design revision after ARCH-REV-001; requirements basis unchanged at SR-002)
- Approved requirements: `requirements-doc.md` at `SR-002`, approved by the user on 2026-10-20 in the Solution Designer conversation ("…if you think that it will work, then I trust your reasonable decision"), with the user's condition recorded as REQ-013/AC-012.
- Behavior-defining supplements: none
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/investigation-notes.md`
- Authorities read (2026-10-20): `references/architecture-design.md`; `references/design-principles.md` (shared, version updated on 2026-10-20, re-read after the update notices); `templates/design-spec-template.md` (updated); `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/DESIGN.md`; `TESTING.md`; `autobyteus-server-ts/AGENTS.md`. `design-examples.md` not needed. No persisted data, so the Data Migration Guideline does not apply.
- Project design-principle conflicts or discrepancies: none. DESIGN.md rule 8 (no version numbers in current names) is respected: no new names carry `v2`.

## Current-State Read

`autobyteus-ts/src/tools/mcp` owns the MCP client. `McpServerInstanceManager` creates one managed server per agent and server by transport. `StdioManagedMcpServer`/`HttpManagedMcpServer` lazily import the SDK, build the transport and connect a `Client`. `BaseManagedMcpServer` owns the connection lifecycle and the two calls (`listTools`, `callTool` with a 6-minute timeout and the run's signal). After autobyteus-181 these three files are the only production SDK users, with typed imports and no seams. The ownership is healthy.

`autobyteus-server-ts/src` imports no MCP SDK. Its Agent Tools endpoint and `/mcp/gateway` are hand-written JSON-RPC; they reach the SDK only through `autobyteus-ts` when the called tool is an external MCP-origin tool. `ClaudeSdkClient` still carries the unused `createMcpServer`/`createToolDefinition` pair (O-002). Fourteen test files and fixtures use the v1 package as real test servers or as clients of our endpoints (investigation notes, Architecture Investigation Findings).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - Production source: 3 files in `autobyteus-ts/src/tools/mcp/server/` (import paths, one call shape) and 1 dead-code removal in `claude-sdk-client.ts`.
  - Manifests: 2 `package.json` files and `pnpm-lock.yaml`.
  - Tests and fixtures: 14 files (mostly import and class-name changes), plus 3 new test cases.
  - Docs: 2 files.
  - No new owner, API, route, persistence or UI.
- Architectural risk: `High`
- Risk rationale:
  - **Blast radius.** A major-version replacement of the library under every runtime's external MCP path. Every MCP preview, registration and tool call on native, Claude, Codex, AGY and Grok goes through the new client.
  - **Deployment.** New runtime packages enter the packaged desktop app and the Docker image: `@modelcontextprotocol/client`, `@modelcontextprotocol/core`, `jose`, `pkce-challenge`, `eventsource`, `eventsource-parser`.
  - **Residual uncertainty, settled only by validation.** R-002: the packaged app might miss a v2 dependency. R-003: v2 might reject a response from some real server that works on v1.
  - **Bounded by what is not changing.** The wire protocol stays identical (`legacy` negotiation, probe-verified). Ownership, contracts, persistence, security handling and concurrency are unchanged.
- Escalation trigger (→ Design Impact, back to the Solution Designer):
  - a real server that works on 1.32.1 fails on v2. If the cause is the protocol era, REQ-013 applies and the client adopts the needed negotiation;
  - the lockfile or the packaged app cannot resolve the v2 client;
  - a runtime behaves differently;
  - something outside the listed files imports the SDK.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| v2 client typings | client 2.3.1 `index.d.mts` L1892-2098, L2560-2720 | `callTool(params, options)`; `listTools()` aggregates pages; `versionNegotiation` default `legacy` | Call-shape change; no negotiation option set | — |
| v2 stdio / HTTP transports | `stdio.d.mts`; `index.d.mts` L3384-3444 | Same parameters; `requestInit.headers` on every request; `redirectPolicy` default `same-origin` | Loader bodies keep their options | — |
| Compatibility probes | `probes/v2-client-vs-v1-server-probe.mjs`, `published-filesystem-server-probe.mjs` | v2 client in default mode works with v1 and v2 servers (stdio env/cwd, HTTP header, real published servers) | Drop-in on the client side | Other real servers: parity run |
| Test-server shapes | `probes/v2-test-server-shapes-probe.mjs` | `McpServer.registerTool` + `NodeStreamableHTTPServerTransport.handleRequest(req,res,body)`; paged low-level `Server` | Test rewrite shape; AC-005, AC-006 tests | — |
| Our routes vs a v2 `auto` client | `agent-tools-mcp-routes.ts` L22, L87-90, L139-149; `mcp-gateway-routes.ts` L26, L114-117, L159-169; `probes/route-protocol-header-auto-fallback-probe.mjs` | The routes check `mcp-protocol-version` first (missing → 2025-03-26; supported: 2025-03-26, 2025-06-18, 2025-11-25) and answer `2026-07-28` with HTTP 400 + `-32600`, `id: null`. A stand-in with that exact check: `auto` client gets 400 on `server/discover`, then `initialize`, era `legacy`, list and call work | No endpoint change; AC-007 runs against the real routes | Real routes: AC-007 tests |
| Peers | lockfile; `sdk.d.ts` of the Claude Agent SDK | Required peer `^1.29.0`, types only; `autoInstallPeers: true`; npm installs peers | DEC-006: remove the direct v1 dependency | Packaged tree: parity run |
| Packaging | `prepare-server.mjs`, `Dockerfile.monorepo` | Dependencies come from the manifests | No packaging code change | R-002 |

## Intended Change

Swap the MCP client in `autobyteus-ts` from `@modelcontextprotocol/sdk` 1.32.1 to `@modelcontextprotocol/client` 2.3.1. Keep the 2025 handshake. Move all test servers and test clients to the v2 packages. Remove the dead Claude `createMcpServer` path. Add tests for complete tool listing, the unchanged handshake, and v2 clients of our endpoints. Prove parity before/after.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004. Areas:
  - the MCP dependency entries of `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, and `pnpm-lock.yaml`;
  - `autobyteus-ts/src/tools/mcp/server/{base,stdio,http}-managed-mcp-server.ts`;
  - the dead-code removal in `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`;
  - the 14 test files and fixtures in the Final File Responsibility Mapping;
  - `autobyteus-server-ts/docs/modules/mcp_server_management.md` and `agent_execution.md` (the MCP-peer sentence).
- Deliberately left alone:
  - `McpServerInstanceManager`, `McpConfigService`, `types.ts`, the registrar, the schema mapper: no SDK use, no behavior change;
  - our Agent Tools endpoint and `/mcp/gateway` source: hand-written. A v2 client in default mode sends the same `initialize` as today. In `auto` mode, its `server/discover` probe carries `mcp-protocol-version: 2026-07-28`, which the routes' version check rejects with HTTP 400 and JSON-RPC `-32600` before any dispatcher runs; the v2 client treats that as a legacy signal and falls back to `initialize` (client 2.3.1 `classifyHttpError` → `classifyRpcError`; `probes/route-protocol-header-auto-fallback-probe.mjs`). The AC-007 tests prove this against the real routes;
  - GraphQL, web UI, `mcps.json`;
  - `autobyteus-web/scripts/prepare-server.mjs` and the Dockerfile: they install from the manifests;
  - the Python fixture (`mcp>=2.3`): independent of the TS SDK;
  - the Claude Agent SDK's and Google GenAI's own v1 peer (theirs);
  - error wording (DEC-003);
  - the http→https redirect test (DEC-007).
- Follow-ups: FU-001 (opt into 2026-07-28 negotiation), FU-002 (HTTP status in remote MCP errors), FU-003 (stale `autobyteus-ts/pnpm-lock.yaml`, added by the architecture review).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior / Evidence | Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-002; AC-002, AC-009 | Preview/register stdio server; agent tool call | Works on 1.32.1 | Preserved on v2 | DS-001 |
| BEH-002 | User/System | REQ-003; AC-003 | HTTP server with headers | Headers on every request | Preserved | DS-001 |
| BEH-003 | System | REQ-003; AC-003 | 3xx response | Same-origin rule | Rule preserved; v2 wording | DS-001 (inside the SDK transport) |
| BEH-004 | System | DEC-003; AC-003 | HTTP error | v1 wording | v2 wording | DS-001 |
| BEH-005 | System | REQ-005; AC-005 | Tools list | Page 1 only | All pages | DS-001 (`listRemoteTools`) |
| BEH-006 | System | REQ-004; AC-004 | Tool call | 6-minute timeout, signal | Preserved; options move to the 2nd argument | DS-001 (`callTool`) |
| BEH-007 | Contract | REQ-006, REQ-013; AC-006, AC-012 | Connect | 2025 handshake, one start | Preserved (`legacy`, the SDK default) | DS-001 |
| BEH-008 | Contract | REQ-007; AC-007 | External client → our endpoints | Serves v1-SDK clients | Also v2 clients, default and `auto` | DS-002 |
| BEH-009 | Operational | REQ-008; AC-008 | — | Dead Claude MCP path | Removed | — |
| BEH-010 | Operational | REQ-001, REQ-009; AC-001, AC-009 | Package and start | 1.32.1 | v2 in the packaged app and the image | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/` (5 scripts, `probe-output.txt`) | Compatibility, error text, test-server shapes | REQ-002…007 | Evidence for the API mapping and the test design | Final; evidence only |
| `follow-ups.md` | FU-001, FU-002 | — | Out-of-ticket items | Not sent yet |
| `origin/personal:tickets/done/mcp-sdk-1-32-upgrade/` | Predecessor parity method, matrix suite, docs | REQ-009 | Validation template | Archived |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` (dependency migration) with `Cleanup` (O-002)
- Current design issue found: `No` in the MCP client. `Yes` (local): dead code in `claude-sdk-client.ts`.
- Structural triggers:
  - Legacy cleanup: fires for O-002 (`createMcpServer`/`createToolDefinition`, no production caller; Principle 7 since the ticket touches the SDK-types area and the file).
  - Capability-area reuse: does not fire (no new off-spine concern; the managed servers stay the only SDK adapters).
  - Empty indirection: does not fire. No wrapper around the v2 client is added; the managed servers already are the adapter.
  - Shared-structure tightness: does not fire (`ClientSessionLike` stays `Pick<Client, 'listTools' | 'callTool' | 'close'>`).
  - Persisted-data transition: does not fire (no stored shape changes).
- Root cause classification: `No Design Issue Found` for the migration; `Legacy Or Compatibility Pressure` for O-002 only.
- Refactor needed now: `No` for the client structure. `Yes` for the O-002 removal.
- Evidence: investigation notes, Source Log and Architecture Investigation Findings.
- Design response: change imports and the `callTool` options position inside the existing adapters; delete the dead Claude path; migrate the tests in place.
- Refactor rationale: the adapter boundary already isolates the SDK, which is why the migration is three files.
- Deferrals: FU-001, FU-002.

## Terminology

- `legacy` / `auto` negotiation: the v2 client option `versionNegotiation.mode`. `legacy` (default) runs the 2025 `initialize` handshake; `auto` probes `server/discover` first.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: every `@modelcontextprotocol/sdk` import and manifest entry in AutoByteus code; the Claude `createMcpServer`/`createToolDefinition` path.
- Compatibility wrappers, dual paths or legacy fallbacks kept: `None`. v1 stays installed only as the Claude Agent SDK's own peer; no AutoByteus code uses it.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. No reader or writer of `mcps.json`, the vault or run history changes; the in-memory SDK client is not persisted.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…007 | Settings preview/register (GraphQL) or an agent's MCP tool call on any runtime | External MCP server's result back in the run or the preview | `*ManagedMcpServer` via `McpServerInstanceManager` | Every external MCP use; the only production SDK path |
| DS-002 | Primary End-to-End | BEH-008 | External MCP client (Claude/Codex/AGY/Grok CLI, tests) | Tool result from our endpoint | Agent Tools MCP host / `/mcp/gateway` dispatchers | Must keep serving v2-based clients; unchanged source |
| DS-003 | Primary End-to-End | BEH-010 | Release build | Running packaged server with its `node_modules` | `prepare-server.mjs` / Docker build | New packages must arrive |

## Primary Execution Spine(s)

- DS-001: `GraphQL preview/register or Agent tool call → McpToolRegistrar / McpTool → McpServerInstanceManager → StdioManagedMcpServer | HttpManagedMcpServer (v2 Client + StdioClientTransport | StreamableHTTPClientTransport) → BaseManagedMcpServer.listRemoteTools / callTool → external MCP server`
- DS-002: `External MCP client → Fastify route (session/access, mcp-protocol-version check) → agent-tools / gateway method dispatcher → catalog / tool executor → (MCP-origin tool) DS-001`
- DS-003: `release build → pnpm deploy + npm install (prepare-server) | pnpm install (Docker) → packaged server node_modules → server start`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The instance manager picks the managed server by transport. It imports `@modelcontextprotocol/client` (and `/stdio`) on first use, builds the transport with the same options as today, and connects a `Client` in the default (`legacy`) negotiation. The base class lists tools (all pages now) and calls tools with `{ timeout, signal }` as the second argument. | instance manager, managed servers, SDK client | `*ManagedMcpServer` | none new |
| DS-002 | Unchanged. An external client on SDK v2 in default mode sends `initialize` as today. In `auto` mode it first POSTs `server/discover` with `mcp-protocol-version: 2026-07-28`; the route's protocol-version check (before the dispatcher) answers HTTP 400 with JSON-RPC `-32600` (`id: null`), which the v2 client classifies as a legacy server, so it falls back to `initialize` (with no version header → 2025-03-26 accepted) and negotiates 2025-11-25. | routes (version check), dispatchers | endpoint hosts | — |
| DS-003 | Unchanged logic. `autobyteus-ts`'s manifest brings the v2 client; npm/pnpm add the Claude Agent SDK's v1 peer. | packaging | build scripts | — |

## Spine Actors / Main-Line Nodes

`McpServerInstanceManager`, `StdioManagedMcpServer`, `HttpManagedMcpServer`, `BaseManagedMcpServer`, v2 `Client` and transports; our endpoint dispatchers (DS-002, unchanged).

## Ownership Map

Unchanged. Each managed server owns its SDK client construction and transport options. `BaseManagedMcpServer` owns the connection lifecycle and the list/call calls. `ClaudeSdkClient` keeps owning the Claude SDK adapter, minus the dead MCP path.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No facade added or changed (`tools/mcp/index.ts` and `server/index.ts` export no SDK types).

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `@modelcontextprotocol/sdk` in `autobyteus-ts/package.json` and `autobyteus-server-ts/package.json` | Replaced by the v2 packages; no AutoByteus code imports it after this change | `@modelcontextprotocol/client` (deps) and test packages (devDeps) | v1 remains only as the Claude Agent SDK's auto-installed peer |
| v1 imports in the 3 managed-server files and 14 test/fixture files | Same | v2 imports | — |
| `ClaudeSdkClient.createMcpServer()` (L305-350), `createToolDefinition()` (L289-303), `"createSdkMcpServer"` in `ClaudeSdkFunctionName` (L40), `createSdkMcpServer` in `ClaudeSdkModuleLike` and its `default` (L45, L49) | Dead: in server-ts `src` the names occur only in their definitions; the only caller is the live integration test L247-300; `resolveFunction(sdk, "createSdkMcpServer")` (L310) is the only string lookup and is inside `createMcpServer` | — | — |
| `ClaudeSdkClient.callSdkFunction()` (L445-450) | Dead once `createMcpServer` goes: its only caller is L345 (`grep -n callSdkFunction`) | — | — |
| Kept, not dead: the `asObject` and `asString` imports | `asObject` is still used at L478 (`tryGetSupportedModelsFromQueryControl`); `asString` at L228, L260, L395 | — | Corrects ARCH-REV-001 AR-002's note that `asObject` becomes unused |
| The `createMcpServer` case in `claude-sdk-client.integration.test.ts` (L247-300) | Tests removed code | — | Keep the file's other cases |

## Return Or Event Spine(s) (If Applicable)

N/A. Responses return on the same request path; no new events.

## Bounded Local / Internal Spines (If Applicable)

N/A. The connect lifecycle in `BaseManagedMcpServer` is unchanged.

## Off-Spine Concerns Around The Spine

None added.

## Ownership Boundaries

Only `autobyteus-ts/src/tools/mcp/server/*` imports the MCP client package in production. Our endpoints never import the SDK. Tests may import the v2 server/client/core packages as test infrastructure.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `*ManagedMcpServer` | v2 `Client`, transports, negotiation option | instance manager, registrar | Other production modules importing `@modelcontextprotocol/*` | Extend the base class API |

## Dependency Rules

- `autobyteus-ts` `dependencies`: `@modelcontextprotocol/client` `2.3.1` (exact pin, as today). `devDependencies`: `@modelcontextprotocol/server` `2.3.1`, `@modelcontextprotocol/node` `2.1.1`.
- `autobyteus-server-ts` `dependencies`: no MCP SDK package. `devDependencies`: `@modelcontextprotocol/client` `2.3.1`, `@modelcontextprotocol/server` `2.3.1`, `@modelcontextprotocol/node` `2.1.1`, `@modelcontextprotocol/core` `2.3.1`.
- Server-ts production code gets the client only through `autobyteus-ts` (`workspace:*`).
- Never import `@modelcontextprotocol/core-internal` or `@modelcontextprotocol/sdk` in AutoByteus code.
- Do not set `versionNegotiation`, `redirectPolicy`, `fetch` or `authProvider` on the client or transport (defaults: `legacy`, `same-origin`).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `BaseManagedMcpServer.listRemoteTools()` | one server's tools | all tools | server id | Unchanged signature; returns all pages |
| `BaseManagedMcpServer.callTool(name, args, { signal })` | one tool call | call with timeout/signal | tool name | Unchanged signature; inner SDK call changes shape |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `listRemoteTools` | Yes | Yes | Low | None |
| `callTool` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Managed servers, fixtures | unchanged names; no `v2` in any name (DESIGN.md rule 8) | Yes | Low | None |
| Fixture start marker | env `MCP_TEST_SERVER_START_LOG` | Yes | Low | Matches `MCP_TEST_SERVER_PID_FILE` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Real HTTP test server | in-process server in `http-managed-mcp-server.test.ts` | Extend | Add the paging server and the handshake assertion there |
| Real stdio test server | `mcp-stdio-fixture-server.mjs` | Extend | Add `MCP_TEST_SERVER_START_LOG` |
| v2 client of our endpoints | existing SDK-client cases in the two endpoint integration tests | Extend | Add an `auto` case |
| Before/after parity | autobyteus-181 SR-002/003 method, `mcp-runtime-tool-matrix.e2e.test.ts`, "Verifying An MCP SDK Upgrade" | Reuse | Same method, user-requested |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-ts` MCP client (`src/tools/mcp/server`) | SDK client construction and calls | DS-001 | Extend (modify) |
| `autobyteus-server-ts` Claude runtime client | dead-code removal | — | Remove |
| Test infrastructure (both packages) | real test servers and clients | DS-001, DS-002 | Modify |
| Docs | SDK naming, wording, verification | — | Modify |

## Draft File Responsibility Mapping

See the final mapping (no extraction changed it).

## Reusable Owned Structures Check

N/A. No repeated structure appears. The test servers stay local to their tests, as today. A shared test-server helper across packages was considered and not needed: each server is a few lines and has a different purpose (auth, redirects, paging, stdio twin).

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ClientSessionLike` = `Pick<Client,'listTools'\|'callTool'\|'close'>` | Yes | No | Low | Type now from `@modelcontextprotocol/client` |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/package.json` | deps: replace `@modelcontextprotocol/sdk` with `"@modelcontextprotocol/client": "2.3.1"`; devDeps: add `"@modelcontextprotocol/server": "2.3.1"`, `"@modelcontextprotocol/node": "2.1.1"` |
| `autobyteus-server-ts/package.json` | deps: remove `@modelcontextprotocol/sdk`; devDeps: add `client` 2.3.1, `server` 2.3.1, `node` 2.1.1, `core` 2.3.1 |
| `pnpm-lock.yaml` | `pnpm install`; one `@modelcontextprotocol/client@2.3.1`; `@modelcontextprotocol/sdk` only under the Claude Agent SDK (and GenAI optional-peer resolution if pnpm keeps it) |
| `autobyteus-ts/src/tools/mcp/server/base-managed-mcp-server.ts` | `import type { Client } from '@modelcontextprotocol/client'`; `callTool({ name, arguments }, { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS, signal })` |
| `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` | `Promise.all([import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/stdio')])`; type import updated; options unchanged |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | `const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client')`; options unchanged; comment names the v2 defaults (same-origin redirects, 2025 handshake) |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Remove the O-002 items (Removal Plan) |
| `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` | `McpServer` from `@modelcontextprotocol/server`, `StdioServerTransport` from `@modelcontextprotocol/server/stdio`, `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node`; `inputSchema`/`outputSchema` as `z.object({...})`; new env `MCP_TEST_SERVER_START_LOG=<path>` appends `<pid>\n` on every start (before the mode branch); header updated |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | v2 server imports; `mcp.tool('echo', …)` → `registerTool('echo', { description }, …)`; keep all 179/181 cases (adjust any v1 wording); add AC-006 HTTP case (first JSON-RPC method `initialize`, no `server/discover`, header `mcp-protocol-version: 2025-11-25` after init); add AC-005 case: a low-level `Server` paging `tools/list` (2 pages) → `listRemoteTools()` returns all |
| `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` | Add AC-006 stdio case: connect + list + call against the fixture with `MCP_TEST_SERVER_START_LOG` → exactly one start line |
| `autobyteus-ts/tests/unit/tools/mcp/base-managed-mcp-server.test.ts` | Assert `callTool({ name, arguments }, { timeout })`; add one assertion that a passed signal reaches the options (AC-004) |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | v2 server + Node transport; `registerTool` |
| `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` | Client from `@modelcontextprotocol/client`; the inline stdio script imports `@modelcontextprotocol/server` and `/server/stdio`, `z.object`; add AC-007 `auto` case against the real gateway route over loopback: connect succeeds with `getProtocolEra() === 'legacy'` and `getNegotiatedProtocolVersion() === '2025-11-25'`, list and call work. Optionally also assert, through a test-owned `fetch` wrapper passed to the test transport or a Fastify `onResponse` hook, that the `server/discover` POST got 400 and the next request was `initialize` |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Client from `@modelcontextprotocol/client`; add AC-007 `auto` case against the real Agent Tools route over loopback, with the same assertions as the gateway case (legacy era, 2025-11-25, list, call; 400-then-`initialize` optional) |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` | Client imports |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | Client imports; L146 expects `Redirect to ${other.url} not followed` and, separately, `(redirectPolicy: 'same-origin')` (v2 inserts advice between them); header comment wording |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | Client imports |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Client imports |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Client imports (`@modelcontextprotocol/client`) |
| `autobyteus-server-ts/tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts` | `import { ToolSchema } from '@modelcontextprotocol/core'` |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Remove the `createMcpServer` case and imports only it used |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | L50-70: name `@modelcontextprotocol/client` 2.x and the v2 redirect message; L114-147: v2 package names, the v1 copy kept only as the Claude Agent SDK's peer (types only), and that the client keeps the 2025 handshake by default |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | L698-699: the Claude Agent SDK's `@modelcontextprotocol/sdk` peer is installed by the package manager (types only); AutoByteus does not depend on it directly |

## Applied Patterns (If Any)

Adapter (managed servers around the SDK client), unchanged.

## Target Subsystem / Folder / File Mapping

Existing folders only. No new files: the new test cases go into existing test files.

## Folder Boundary Check

N/A. No folder changes.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Stdio loader | `const [{ Client }, { StdioClientTransport }] = await Promise.all([import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/stdio')]);` | `import('@modelcontextprotocol/sdk/client/stdio.js')`; a static top-level import (would load the SDK on module import) | Keeps lazy loading |
| Tool call | `client.callTool({ name, arguments: args }, { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS, signal })` | `client.callTool(params, undefined, { timeout })` (v1 shape: in v2 the 2nd argument is the options, so the timeout would be lost) | Silent loss of the 6-minute timeout and cancellation |
| Client construction | `new Client({ name: 'autobyteus', version: '1.0.0' })` | `new Client(info, { versionNegotiation: { mode: 'auto' } })` | DEC-002: no second server start |
| Test HTTP server | `const t = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined }); await mcp.connect(t); await t.handleRequest(req, res, body);` | keeping `@modelcontextprotocol/sdk/server/streamableHttp.js` | REQ-001 |
| Tool registration | `mcp.registerTool('echo', { description: 'Echo', inputSchema: z.object({ text: z.string() }) }, handler)` | `mcp.tool('echo', handler)`; raw-shape `inputSchema: { text: z.string() }` (deprecated overload) | v2 API |
| Paging server | low-level `new Server(info, { capabilities: { tools: {} } })` + `setRequestHandler('tools/list', ({ params }) => params?.cursor ? { tools: page2 } : { tools: page1, nextCursor: 'p2' })` | mocking the SDK client | Real behavior (`probes/v2-test-server-shapes-probe.mjs`) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `@modelcontextprotocol/sdk` as a devDependency for v1 test servers | Show v1-server compatibility | Rejected (DEC-005) | Parity run against a published v1-based server and the Python fixture |
| Keep `@modelcontextprotocol/sdk` in server-ts `dependencies` "for the Claude peer" | Peer satisfaction | Rejected (DEC-006) | Package managers install the required peer |
| Wrap SDK errors to keep v1 wording | Visible text | Rejected (DEC-003) | v2 wording; docs/tests updated |
| Opt into `auto` negotiation with a legacy fallback | 2026 spec | Rejected now (DEC-002) | FU-001; REQ-013 if a server needs it |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Manifests per Dependency Rules; `pnpm install`; check AC-001 in the root `pnpm-lock.yaml`: it has `@modelcontextprotocol/client@2.3.1`, and `@modelcontextprotocol/sdk` only as a peer. The stale `autobyteus-ts/pnpm-lock.yaml` is not used by workspace installs; leave it alone (FU-003).
2. Change the three managed-server files; `pnpm -C autobyteus-ts build` and typecheck.
3. Migrate the Node fixture and the `autobyteus-ts` unit tests; add the AC-005/AC-006 cases; run `pnpm -C autobyteus-ts test` and the core MCP integration (`env -i … vitest run tests/integration/tools/mcp`).
4. Remove the O-002 code and its test case; server `typecheck`.
5. Migrate the server-ts tests and fixtures; add the AC-007 cases; run server `test:unit`, `test:integration:prepare` + `test:integration`, the two MCP HTTP e2e files and `mcp-run-session-cleanup.e2e.test.ts` on a current server build.
6. Docs.
7. Final greps:
   - AC-001: the command in Guidance For Implementation. It also catches header comments that still name the v1 package, such as the fixture header "Node, `@modelcontextprotocol/sdk`" and the auth helper's "Real `@modelcontextprotocol/sdk` server". Reword those comments for v2.
   - AC-008: `grep -rn "createMcpServer\|createSdkMcpServer\|callSdkFunction" autobyteus-server-ts/src autobyteus-server-ts/tests` and `grep -rn "createToolDefinition" autobyteus-server-ts/src/runtime-management autobyteus-server-ts/tests/integration/runtime-management` both return nothing. The unrelated local helper `createToolDefinition` in `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` stays.

Validation (API/E2E, REQ-009/AC-009/AC-012) uses the autobyteus-181 SR-002/SR-003 method:
- **Before:** `origin/personal` @ `dc530fdcb0` (SDK 1.32.1). **After:** this branch. Each runs in its own worktree, build and packaged isolated app.
- **Suites:** "Verifying An MCP SDK Upgrade", and the gated runtime × MCP matrix (scripted AGY, Claude, Codex MCP, Grok, native LM Studio where available).
- **Real servers through the product:**
  - the Python fixture;
  - published `@modelcontextprotocol/server-filesystem` 2026.8.31 (v1 SDK) and 2.0.0 (v2 SDK), installed into test-owned temp folders, rooted in a temp folder;
  - test-owned copies of the user's kind of `uv` servers (as in 181);
  - a token HTTP server;
  - exit-at-start and hang-at-start servers.
- **Our endpoints:** `/mcp/gateway` and the Agent Tools endpoint.
- **Record:** tool counts, call results, error texts, connect/list/call timings (QR-001), no orphan processes after stop, and that the packaged app contains `@modelcontextprotocol/client` (QR-002). For each real server, also record its tools' `outputSchema` `$schema` dialect, if any (RR-001).
- **Report:** a same/different table. Any protocol-caused failure is fixed in this ticket (REQ-013). Safety follows REQ-010 and TESTING.md.

## Key Tradeoffs

- **Default negotiation instead of `auto`.** Zero wire change and one server start per connect, at the price of not using 2026-07-28 yet (FU-001).
- **Drop the direct v1 dependency instead of keeping it explicit.** AutoByteus code has a single SDK line, and v1 stays only where a third party requires it.
- **v2 test servers instead of v1 ones.** Our tests no longer pin the deprecated line; v1-server compatibility is shown with real published servers in the parity run.

## Risks

- R-001: error wording changes (accepted).
- R-002: packaged-app dependency gap. Mitigated by the packaged before/after run.
- R-003: v2 stricter with some real server. Mitigated by real-server parity; REQ-013 if protocol-caused. Known case (RR-001, from ARCH-REV-001 MP-001): v2's default JSON Schema validator rejects a tool `outputSchema` declaring draft-04, which v1 accepted. Only that tool's calls would fail. Whether any real server does this is unclear, so the parity run records each server's dialect. If a server that works today fails this way, it is a defect of this ticket (AC-009), handled through the escalation trigger, not REQ-013.
- R-004: concurrent edits to `tools/mcp/server` by FU-2/FU-3. Mitigated by doing this first (DEC-001).
- R-005: for FU-3, an `authProvider` token overrides a configured `Authorization` header.

## Guidance For Implementation

- **Prove the call-shape change first.** With the v1 3-argument call left in place against v2, the `slow` tool test with a short timeout or the signal test must fail. Then fix it.
- **No negotiation options.** Don't add `versionNegotiation`, `redirectPolicy`, `fetch` or `authProvider` options.
- **Lazy loading.** Keep the dynamic `import()`, so importing the module does not load the SDK.
- **Values.** Dummy values only in tests and logs.
- **Build order.** `pnpm -C autobyteus-ts build` before the server suites; `test:integration:prepare` after the SDK change (`autobyteus-server-ts/AGENTS.md`).
- **The codemod.** `npx @modelcontextprotocol/codemod@latest v1-to-v2 <package>` may be used for the import rewrites. Review its `package.json` edits against Dependency Rules, and grep for `@mcp-codemod-error`.
- **AC-001 check.** `grep -rn "@modelcontextprotocol/sdk" --include=*.ts --include=*.mts --include=*.js --include=*.mjs --include=*.cjs --include=*.vue --include=package.json --exclude-dir=node_modules --exclude-dir=tickets --exclude-dir=dist .` must return nothing. The docs may still name the v1 package as the Claude Agent SDK's peer.
