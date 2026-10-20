# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001; approved by the Solution Designer within the Task's direction (user informed in the Solution Designer conversation, 2026-10-20)
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status/tickets/in-progress/mcp-http-error-status/investigation-notes.md`
- Authorities read (2026-10-20): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (repository root), `autobyteus-server-ts/AGENTS.md`, `TESTING.md`; `references/design-examples.md` (Example 1, Common Bad-Practice Patterns 6)
- Project design-principle conflicts or discrepancies: None

## Current-State Read

A remote MCP connection error travels unchanged from the SDK to the GraphQL resolver. The SDK (`@modelcontextprotocol/client` 2.3.1) throws `SdkHttpError` for every non-OK HTTP answer, with `status` and `statusText` on the object, but a message without the status (`Error POSTing to endpoint: <body or redirect hint>`). The resolver renders `String(error)` (BEH-001, BEH-002), and the web shows it verbatim. Agent tool calls reach the same connect (BEH-003). `HttpManagedMcpServer` is the only owner of the SDK HTTP transport; it is healthy and small (23 lines). Evidence: investigation notes, Source Log and Runtime findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: one production file (`autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`, about +10 lines), new cases in one existing unit test file, one new built-server e2e file. No other production change.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: no GraphQL schema, persistence, security, concurrency, deployment or ownership change; only message text of an existing failure gains a prefix. Existing e2e assertions use `toContain` on text that is preserved (investigation notes, Source Log last row).
- Escalation trigger if implementation or validation discovers new impact: a consumer that inspects the thrown error's type/`code` (none found by search), or a remote-server failure in scope that does not arrive as `SdkHttpError` (for example a 401 through `UnauthorizedError`, which would mean an `authProvider` is now set) → return `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Preview-path probe | `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` | Every HTTP case is `SdkHttpError` with `status`/`statusText`; refused is `TypeError` | Wrap only `SdkHttpError`; leave others | None |
| `isInstance` / wrap one-off | investigation notes, Source Log | Branded `SdkHttpError.isInstance` works on the lazily imported class; wrapped text as intended | Use the class from the existing dynamic import | None |
| Code read | `http-managed-mcp-server.ts`, `base-managed-mcp-server.ts`, resolver | Only the HTTP managed server knows the SDK transport; no layer rewrites errors | Owner = `HttpManagedMcpServer` | None |
| Local precedent | `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` L59 | `new Error(text, { cause: error })` | Same wrap pattern | None |

## Intended Change

When the SDK's `Client.connect` fails with `SdkHttpError`, `HttpManagedMcpServer` throws `new Error("HTTP <status>[ <statusText>]: <SDK message>", { cause: sdkError })` instead. Everything above it is unchanged; the resolver's existing prefixes now carry the status.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Area: the HTTP managed MCP server's connect in `autobyteus-ts`; tests in `autobyteus-ts` (unit) and `autobyteus-server-ts` (built-server e2e).
- Deliberately left alone: the GraphQL resolver and its message prefixes (they already render the error; adding SDK knowledge there would couple the API layer to the SDK and miss tool calls); `BaseManagedMcpServer` (transport-generic); `StdioManagedMcpServer`; `listTools`/`callTool` after a successful connect (U-001: not the reported problem); the web UI (shows messages verbatim); the SDK's own text.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-005; AC-001, AC-003, AC-005 | Preview in the MCP server form | Status-less message (probe) | Message gains `HTTP <status> <reason>:` | DS-001 |
| BEH-002 | User | REQ-001, REQ-003; AC-002, AC-005 | Save & sync / reload | Same | Same | DS-002 |
| BEH-003 | System | REQ-006; AC-006 | Agent tool call that connects | Same | Same | DS-003 |
| BEH-004 | User/System | REQ-004; AC-004 | Failures without an HTTP answer | `fetch failed` etc. | Unchanged (not `SdkHttpError`, passed through) | DS-001…003 |
| BEH-005 | Contract | REQ-005; AC-001, AC-005 | No credentials in messages | e2e asserts | Unchanged (status/reason carry no credential) | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` | Reproduction | REQ-001…REQ-004 | Before-state; rerun after the fix to show the new messages | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (message text)
- Current design issue found: `No`
- Structural triggers: none fire. Plausible ones ruled out: *Capability-area reuse* — the error translation lands in the existing SDK-transport owner, not a new helper; *Authoritative boundary* — the resolver keeps depending only on `McpConfigService` and does not learn SDK types; *Repeated coordination* — one call site (connect).
- Root cause classification: `Local Implementation Defect` — the transport owner passes the SDK's HTTP failure through without the one fact (status) the user needs.
- Refactor needed now: `No`
- Evidence: `http-managed-mcp-server.ts` is small and single-purpose; no other layer handles these errors.
- Design response: translate at the owner's connect.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk: post-connect HTTP errors (U-001) keep the SDK text; no evidence a user meets them; outside the approved scope.

## Terminology

- `reason phrase`: the HTTP status text of the response (`SdkHttpError.statusText`, e.g. `Not Found`); can be empty (e.g. HTTP/2).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: None.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — only error message text changes; nothing is stored.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | BEH-001, BEH-004, BEH-005 | MCP server form, Preview | Error box | `HttpManagedMcpServer` (error text) | Preview message |
| DS-002 | `Primary End-to-End` | BEH-002 | Save & sync / reload | Toast | same | Discover message |
| DS-003 | `Primary End-to-End` | BEH-003 | Agent tool call | Tool failure | same | Tool-call message |

## Primary Execution Spine(s)

- DS-001: `Web form Preview -> GraphQL previewMcpServerTools -> McpConfigService -> McpToolRegistrar.listRemoteTools -> McpServerInstanceManager.managedDiscoverySession -> HttpManagedMcpServer.connect/createClientSession -> SDK Client.connect -> remote server`
- DS-002: `Web Save/Reload -> GraphQL discoverAndRegisterMcpServerTools -> McpConfigService -> McpToolRegistrar.registerServer -> (same as DS-001 from managedDiscoverySession)`
- DS-003: `Agent tool call -> GenericMcpTool -> McpServerProxy -> BaseManagedMcpServer.callTool -> connect -> HttpManagedMcpServer.createClientSession -> SDK Client.connect`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The remote server answers initialize with an HTTP error; the SDK throws `SdkHttpError`; `HttpManagedMcpServer` rethrows it as an `Error` whose message starts with the status; base `connect` cleans up and rethrows; the resolver prefixes it | managed server, resolver | `HttpManagedMcpServer` | none |
| DS-002 | Same failure, reported as `discoverAndRegisterMcpServerTools.message` | same | same | none |
| DS-003 | Same failure, surfaced as the tool call's error | same | same | none |

## Spine Actors / Main-Line Nodes

Web form, GraphQL resolver, `McpConfigService`, `McpToolRegistrar`, `McpServerInstanceManager`, `BaseManagedMcpServer`/`HttpManagedMcpServer`, SDK `Client`.

## Ownership Map

- `HttpManagedMcpServer`: owns the SDK HTTP transport and client creation, and now the translation of the SDK's HTTP failure into the error it reports.
- `BaseManagedMcpServer`: connect/close lifecycle and cleanup (unchanged).
- Resolver: GraphQL message prefixes (unchanged).

## Thin Entry Facades / Public Wrappers

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| None | No dead code in `http-managed-mcp-server.ts` (every line is reached by connect) | — | — |

## Return Or Event Spine(s)

The error return path is the subject of this change: `SDK Client.connect throws SdkHttpError -> HttpManagedMcpServer wraps -> BaseManagedMcpServer.connect cleanup + rethrow -> managedDiscoverySession finally close -> McpToolRegistrar -> McpConfigService -> resolver message -> web`.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

None. The translation is a few lines inside the owner, not a separate concern.

## Ownership Boundaries

`HttpManagedMcpServer` is the boundary for SDK HTTP specifics. Nothing above it may import or inspect `SdkHttpError`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `HttpManagedMcpServer` (via `BaseManagedMcpServer.connect`) | SDK `Client`, `StreamableHTTPClientTransport`, `SdkHttpError` | instance manager, proxy | Resolver or `McpConfigService` checking `SdkHttpError` | Improve the managed server's reported error |

## Dependency Rules

- Allowed: `http-managed-mcp-server.ts` → `@modelcontextprotocol/client` (existing dynamic import, now also `SdkHttpError`).
- Forbidden: `autobyteus-server-ts` production code importing `SdkHttpError` for this purpose; a static (top-level) value import of the SDK in `http-managed-mcp-server.ts` (keeps the lazy load).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `HttpManagedMcpServer.createClientSession()` (protected) | one remote MCP server | create a connected client; on an HTTP failure reject with the status-bearing error | the instance's config | Signature unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `createClientSession()` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Module-local function | `withHttpStatus(error: SdkHttpError): Error` (suggested) | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Translate an SDK HTTP failure | `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | Extend | Already owns the SDK transport | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` MCP client (`src/tools/mcp/server`) | SDK HTTP failure text | DS-001…003 | `HttpManagedMcpServer` | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | MCP client | `HttpManagedMcpServer` | HTTP client creation incl. its failure text | One owner, a few lines | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None (one call site) | — | — | — | — | — | — |

## Shared Structure / Data Model Tightness Check

N/A — no shared structure; no new error class (nothing reads a status field; the original `SdkHttpError` stays reachable as `cause`).

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | MCP client | `HttpManagedMcpServer` | as above | as above | No |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | MCP client tests | — | real-SDK cases for the status text | existing file for this class | existing local-server helpers |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (new) | server e2e | — | preview + discover through the built server for 401/403/404/500 | one journey family | `startBuiltTestServer` and helpers from `tests/e2e` like `mcp-http-redirect-and-transport.e2e.test.ts` |

## Applied Patterns

Adapter-style error translation at the SDK boundary, inside the existing adapter (`HttpManagedMcpServer`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | File (Modify) | `HttpManagedMcpServer` | catch `SdkHttpError` from `client.connect` and rethrow with the status | SDK transport owner | a top-level value import of the SDK; handling of non-HTTP errors |
| `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` | File (Modify) | tests | new cases (below) | tests for this class | SDK mocks |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` | File (Add) | tests | AC-001, AC-002 through GraphQL | e2e home of MCP tool-management journeys | real tokens |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/` | Off-spine adapter (transport) | Yes | Low | Existing folder |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Wrap at the owner | see code shape below | resolver: `if (SdkHttpError.isInstance(error)) …` in `mcp-server.ts` | Keeps SDK types out of the API layer and covers tool calls |
| Message | `Failed to preview tools for MCP server: Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`; empty reason → `HTTP 401: Error POSTing …`; empty body → `HTTP 404 Not Found: Error POSTing to endpoint: ` | `HTTP 401: SdkHttpError: …` (class name inside the text) | Fixes the exact text for tests |

Code shape (illustrative):

```ts
const { Client, StreamableHTTPClientTransport, SdkHttpError } = await import('@modelcontextprotocol/client');
// … transport and client as today …
try {
  await client.connect(transport);
} catch (error) {
  // The SDK keeps the HTTP status on the error, not in its message.
  throw SdkHttpError.isInstance(error) ? withHttpStatus(error) : error;
}
return client;

/** The SDK's HTTP failure with its status first in the message, e.g. "HTTP 401 Unauthorized: Error POSTing to endpoint: …". */
function withHttpStatus(error: SdkHttpError): Error {
  const status = error.statusText ? `HTTP ${error.status} ${error.statusText}` : `HTTP ${error.status}`;
  return new Error(`${status}: ${error.message}`, { cause: error });
}
```

`SdkHttpError` as a type in the helper's signature needs `import type { Client, SdkHttpError } from '@modelcontextprotocol/client'` at the top (type-only, so the lazy load stays).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the old status-less text alongside (e.g. a separate GraphQL `status` field) | Callers parsing the old text | Rejected | Text gains a prefix; no parser of this text exists (web shows it verbatim) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add the unit cases (they fail first): for a local server answering 401, 403, 404, 500 → `connect()` rejects with a message starting `HTTP 401 Unauthorized: Error POSTing to endpoint`, `HTTP 403 Forbidden: …`, `HTTP 404 Not Found: …`, `HTTP 500 Internal Server Error: …`; its `cause` is the SDK error (`SdkHttpError.isInstance(cause)`, `cause.status`); state is `FAILED`. Empty-body 404 → `HTTP 404 Not Found: Error POSTing to endpoint: ` (AC-003). Nothing listening → message has no `HTTP ` prefix, unchanged SDK/fetch text (AC-004). A never-connected instance's `callTool` against a 401 server → rejects with `HTTP 401` (AC-006). Extend the existing wrong-credential and cross-origin-redirect cases to expect `HTTP 401` / `HTTP 307` while keeping their current assertions.
2. Change `http-managed-mcp-server.ts` as above.
3. Add `mcp-http-error-status.e2e.test.ts`: a plain `node:http` server per status (401/403/404/500, small text body), built test server, GraphQL `previewMcpServerTools` → error message contains `Failed to preview tools for MCP server` and `HTTP <status>`; `configureMcpServer` + `discoverAndRegisterMcpServerTools` → `success: false`, message contains `HTTP <status>`; a dummy token value never appears in responses (AC-001, AC-002).
4. Rerun existing `mcp-http-auth-remote-server` and `mcp-http-redirect-and-transport` e2e and the `autobyteus-ts` MCP unit/integration tests (AC-005); rerun the probe to record the after-state.

## Key Tradeoffs

- Plain `Error` with `cause` instead of a new error class: no caller needs a typed status; the visible text then reads `Error: HTTP 401 …` after the resolver's `String(error)`, a little plainer than the old `SdkHttpError: …`. Changing the resolver to `error.message` would drop the class name for other failures too (`TypeError: fetch failed`), which REQ-004 keeps unchanged.
- Connect only, not `listTools`/`callTool` after connect: covers every reproduced case with one call site (U-001).

## Risks

- A later SDK may move the status or change `SdkHttpError`; the unit tests use the real SDK and would catch it.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/mcp-http-error-status/probes/http-status-message.probe.test.ts`; command (from the worktree root) `pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch`. After the fix, its `graphqlMessage` values contain `HTTP <status> <reason>` (the `refused` row unchanged). The new unit cases from step 1 are the durable failing tests.
- E2E needs current builds: `pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build` (see the header of `mcp-http-redirect-and-transport.e2e.test.ts`).
- Values: dummy only.
