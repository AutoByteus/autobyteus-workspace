# Investigation Notes

## Investigation Meta

- Package identifier: `mcp-http-error-status`
- Request / ticket: Project Task "Show the HTTP status in remote MCP connection errors" (FU-002 of autobyteus-182, `tickets/done/mcp-sdk-v2-migration/follow-ups.md`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status`, branch `codex/mcp-http-error-status`
- Resolved base remote / branch / revision: `origin/personal` at `66d834b0acc3caa4e81d2e62c34d35ff0ad38bd1` (fetched 2026-10-20)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created with `git worktree add -b codex/mcp-http-error-status … origin/personal`; `pnpm install --frozen-lockfile` succeeded
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-20): requirements gate `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; design gate `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, project `DESIGN.md`, `autobyteus-server-ts/AGENTS.md`, `TESTING.md` (test layers)
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: where the MCP preview/registration error becomes the GraphQL message, include `SdkHttpError.status` (e.g. "HTTP 401: …"). Done when a 401, 403, 404 and 500 from a remote MCP server each show their status in the message the user sees, with tests.
- Clarifications received: None needed.
- User-supplied facts and constraints: small, not urgent; pre-existing on SDK 1.32.1.
- Initial ambiguity: exact wording; which surfaces. Decided in `requirements-doc.md` DEC-001…DEC-004.

## Product And Domain Understanding

- Product area: Tools settings → MCP servers (remote streamable HTTP servers); MCP tool calls by agents.
- Affected actors or systems: user configuring a server; agent tool calls through the same client.
- Existing user or operational purpose: preview a server's tools before saving; save & discover; reload a saved server's tools.
- Relevant terminology: "preview" = GraphQL `previewMcpServerTools`; "discover/register" = `discoverAndRegisterMcpServerTools`; "managed MCP server" = `autobyteus-ts` `BaseManagedMcpServer` subclasses that own one SDK client.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | Doc | `tickets/done/mcp-sdk-v2-migration/probes/probe-output.txt`, `http-error-text-v1-vs-v2-probe.mjs` | Origin evidence | v1 and v2 both lose the status in the message; v2 has it on `.status` | — |
| 2026-10-20 | Code | `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` L96-107, L140-158 | Where the message is built | Preview: `throw new Error(\`Failed to preview tools for MCP server: ${String(error)}\`)`; discover: `message: String(error)` | — |
| 2026-10-20 | Code | `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` L90-113 | Path to the client | Delegates to `McpToolRegistrar.registerServer` / `listRemoteTools`, no error handling | — |
| 2026-10-20 | Code | `autobyteus-ts/src/tools/mcp/tool-registrar.ts` L85-160; `server-instance-manager.ts` L58-67 | Path to the client | `fetchToolsFromServer` → `managedDiscoverySession` → `server.listRemoteTools()`; errors pass unchanged | — |
| 2026-10-20 | Code | `autobyteus-ts/src/tools/mcp/server/base-managed-mcp-server.ts`, `http-managed-mcp-server.ts` | Owner of the SDK client | `HttpManagedMcpServer.createClientSession` builds transport + `Client` and `await client.connect(transport)`; base `connect()` rethrows after cleanup | — |
| 2026-10-20 | Code | `autobyteus-ts/src/tools/mcp/tool.ts`, `server/proxy.ts`; `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` | Agent tool-call path | Agent calls → `GenericMcpTool` → `McpServerProxy` → instance `callTool` → `connect()` when not connected | — |
| 2026-10-20 | Code | `autobyteus-web/components/tools/McpServerFormModal.vue` L136-138, L498-557; `stores/toolManagementStore.ts` L229-245, L320-341 | What the user sees | GraphQL error messages joined and shown verbatim; discover `message` shown in a toast | — |
| 2026-10-20 | Contract | `@modelcontextprotocol/client` 2.3.1 `dist/index-B-4n9P0J.d.mts` L263-292; `dist/index.mjs` L5547-5552, L5764-5793 | Error shape | `SdkHttpError` exported, `status`/`statusText` getters, data `{status, statusText, text}`; message `Error POSTing to endpoint: ${redirect hint ?? body}`; 401 goes through `UnauthorizedError` only when an `authProvider` is set (we never set one) | — |
| 2026-10-20 | Command | `pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch` | Reproduce through our real path | See Runtime findings | — |
| 2026-10-20 | Command | node one-off against `client/dist/index.mjs`: 404 server, `SdkHttpError.isInstance(e)`, `instanceof`, `new Error(…, { cause })` | Design premise | `isInstance: true`, `instanceof: true`, `status 404`, `statusText "Not Found"`; wrapped `String()` = `Error: HTTP 404 Not Found: Error POSTing to endpoint: ` | — |
| 2026-10-20 | Code | `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` L59 | Local precedent | Same wrap pattern `new Error(\`${error.message} (…)\`, { cause: error })` | — |
| 2026-10-20 | Code | `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts`; `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` L143-148, `mcp-http-redirect-and-transport.e2e.test.ts` L146-156 | Existing assertions | Real-SDK unit tests; e2e asserts `Failed to preview tools for MCP server`, `Redirect to … not followed`, `(redirectPolicy: 'same-origin')`, no token values — all stay true with a prefix | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Preview in the MCP server form | Web → GraphQL `previewMcpServerTools` → `McpConfigService.previewMcpServerTools` → `McpToolRegistrar.listRemoteTools` → `managedDiscoverySession` → `HttpManagedMcpServer.connect` → SDK | `Failed to preview tools for MCP server: SdkHttpError: Error POSTing to endpoint: <body>` | probe (Reproduced) | High |
| BEH-002 | User | Save & sync / reload | Web → `discoverAndRegisterMcpServerTools` → `registerServer` → same discovery session | `{ success: false, message: "SdkHttpError: Error POSTing to endpoint: <body>" }` | Code (Read); same client path as BEH-001 | High |
| BEH-003 | System | Agent tool call | `GenericMcpTool._execute` → `McpServerProxy.callTool` → instance `callTool` → `connect()` | Same SDK error | Code (Read) | High |
| BEH-004 | User/System | Failures without an HTTP answer | Same paths | `TypeError: fetch failed` etc. | probe `refused` (Reproduced) | High |
| BEH-005 | Contract | No credential in messages | Same paths | Token/header values never in messages | e2e tests (Read) | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` (23 lines) | Lazily imports the SDK, builds the HTTP transport and client, connects | The only place that knows it talks HTTP through the SDK | Natural owner for turning an SDK HTTP failure into a status-bearing error |
| `autobyteus-ts/src/tools/mcp/server/base-managed-mcp-server.ts` | Transport-generic connect/list/call lifecycle | Unchanged | Should not learn SDK HTTP types |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` | Prefixes and stringifies errors | Unchanged | Putting SDK knowledge here would couple the GraphQL layer to the SDK and miss tool calls |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: None.
- Existing readers, writers, or contracts that consume them: N/A.
- Evidence paths: N/A.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: one runtime module (`http-managed-mcp-server.ts`); GraphQL schema unchanged; message text changes.
- Existing structural surfaces that can support the approved behavior: `HttpManagedMcpServer.createClientSession`.
- Evidence paths: above.

### Potential Structural Impacts To Investigate

- API or external-contract change: message text only; no schema change. Confirmed.
- Persistence schema or invariant change: Absent.
- Security or privacy boundary change: Absent (status code and reason phrase carry no credential).
- Concurrency or lifecycle change: Absent (connect failure path and cleanup unchanged).
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Absent.
- Confirmed absent, present, or unknown: confirmed as listed.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Probe through `McpToolRegistrar.listRemoteTools` with the real SDK against local `node:http` servers | 401/403/404/500, empty-body 404, cross-origin 307, refused | All HTTP cases: `SdkHttpError`, code `CLIENT_HTTP_NOT_IMPLEMENTED`, `status` and `statusText` set, message without status; empty-body 404: `Error POSTing to endpoint: ` (nothing after); 307: redirect hint; refused: `TypeError: fetch failed`, no status | Reproduced | REQ-001…REQ-004; DEC-001 (reason phrase) | `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` |
| node one-off with `SdkHttpError.isInstance` and the wrap | 404 | Identity checks work on the dynamically imported class; wrap renders `Error: HTTP 404 Not Found: Error POSTing to endpoint: ` | Reproduced | Design premise | command in Source Log (script not kept) |

- Temporary diagnostics: None (no source edits; the probe is outside `src`).
- Reproduction for implementation to start from: `probes/http-status-message.probe.test.ts`, command `pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch` (from the worktree root). It prints the messages; after the fix its `graphqlMessage` values contain `HTTP <status> <reason>`. The durable failing tests are the new unit cases (design spec).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| autobyteus-182 follow-up FU-002 (Solution Designer) | Tell a missing token from a wrong URL | Reproduced probe | REQ-001…REQ-003 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `@modelcontextprotocol/client` | 2.3.1 (pinned in `autobyteus-ts/package.json`) | `SdkHttpError` with `status`, `statusText`; branded `isInstance` | d.mts, index.mjs, probes | Wording of the SDK message may change in later versions; not relied on |

## Persisted Data And State Facts

- Affected stored or external subject: None. Remaining fields: N/A.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. Remaining fields: N/A.

## Product Design Findings

N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/mcp-http-error-status/probes/http-status-message.probe.test.ts` | Solution Designer | Reproduction of the current messages through the real preview path | Investigation | REQ-001…REQ-004 | Current | Evidence only |
| `tickets/in-progress/mcp-http-error-status/probes/probe-output.txt` | Solution Designer | Probe output (2026-10-20, before the fix) | Investigation | same | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | HTTP errors after a successful connect (e.g. a session ended with 404 on a later `tools/call`) also lack the status | Not part of the reported problem; every reproduced 401/403/404/500 case fails at connect | Out of scope; no evidence a user meets it | Closed (out of scope) |

## Architecture Investigation Findings

- Execution spine: Web → GraphQL resolver → `McpConfigService` (server) → `McpToolRegistrar` → `McpServerInstanceManager.managedDiscoverySession` → `HttpManagedMcpServer.connect` (base) → `createClientSession` → SDK `Client.connect` → remote server. The agent tool-call spine joins at `BaseManagedMcpServer.connect` via `callTool`.
- Owner of SDK-transport knowledge: `HttpManagedMcpServer` (only file importing `StreamableHTTPClientTransport`). It loads the SDK lazily; the same dynamic import can supply `SdkHttpError`.
- Error propagation: no layer between the SDK and the resolver catches or rewrites errors except the resolver itself. Base `connect()` runs cleanup and rethrows the same object.
- Existing tests use the real SDK (no mock), so a wrapper is testable directly.

## Requirement Implications

- The reason phrase was added to DEC-001 because of the empty-body 404 row.
- Tool calls were included (DEC-002) because they share the same connect.

## Notes For Architecture Design

- Map SCN-001…SCN-003 onto the single connect boundary.
- Preserve: base lifecycle and cleanup, lazy SDK load, existing e2e assertions, credential-free messages.
