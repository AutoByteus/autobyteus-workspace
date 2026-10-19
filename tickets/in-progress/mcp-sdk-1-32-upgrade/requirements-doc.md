# Requirements Document — MCP SDK 1.32.1 upgrade and loader cleanup

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-sdk-1-32-upgrade`
- Request / ticket: Project Task `autobyteus-181` (FU-8 of `autobyteus-175`; follow-ups of `autobyteus-179` added)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's approval of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-19 ("autobyteus-181 requirements approved within the Task's direction …").
- Exact approved baseline: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem:
  - AutoByteus runs MCP SDK 1.30.0. Since autobyteus-179 it sends credentials, but this SDK version follows cross-origin redirects, so credentials can follow a redirect to another host.
  - The MCP loaders carry `any` casts, fallbacks and test seams the SDK never needed; this hid the header bug.
  - A WebSocket MCP transport exists in the core that the SDK cannot honour and the product cannot save.
- Desired outcome:
  - Both packages are on SDK 1.32.1, and remote MCP requests never follow a redirect to another origin.
  - The loaders use the SDK's real types with no dead paths.
  - The WebSocket MCP transport is gone.
  - Everything that works today still works.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Stdio/HTTP servers work on SDK 1.30.0 | Same on 1.32.1 | Connect, list and call; 179 auth behavior |
| BEH-002 | Contract | SCN-002 | Cross-origin redirects followed | A cross-origin redirect fails with a clear error; same-origin redirects still work | — |
| BEH-003 | User | SCN-003 | `transport_type: websocket` in bulk JSON import is accepted, its options are ignored, and it is lost on restart | Rejected with an error naming the supported types | stdio and streamable_http import |
| BEH-004 | System | — | Loaders use `any`, fallbacks and `setSdkLoader` seams | Real SDK types, one path each | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Use stdio and HTTP MCP servers on SDK 1.32.1 (all runtimes) | SCN-001 |
| UC-002 | Connect a remote HTTP MCP server whose endpoint redirects | SCN-002 |
| UC-003 | Import MCP JSON that names an unsupported transport | SCN-003 |

### Out Of Scope

- The SDK v2 migration (`autobyteus-182`).
- MCP secrets in the vault (FU-2), OAuth (FU-3), the gateway (FU-6).
- `ClaudeSdkClient.createMcpServer` dead code (follow-up O-002).
- `autobyteus-ts` integration tests that need the external `autobyteus_mcps` toy servers, apart from deleting the WebSocket one.

### Non-Goals

No new transport (no SSE client), and no `redirectPolicy` setting exposed to users.

### Preserved Behavior Boundary

BEH-001: autobyteus-179's AC-001…AC-007 behavior; stdio env/cwd delivery; per-agent tool selection; `mcps.json` shapes.

### Review Authority

Standard: a blocking finding cites an ID here; anything new is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Rationale |
| --- | --- | --- | --- | --- |
| REQ-001 | `autobyteus-ts` and `autobyteus-server-ts` depend on `@modelcontextprotocol/sdk` 1.32.1. The lockfile resolves a single 1.32.1 copy for them and for the Claude Agent SDK and Google GenAI peers. | BEH-001 | Must | Task |
| REQ-002 | A remote HTTP MCP request that is redirected to another origin is not followed; connect, preview or call fails with an error that says the redirect was not followed. A same-origin redirect still works. AutoByteus does not set `redirectPolicy: 'follow'`. | BEH-002 | Must | SDK 1.32.0; Task |
| REQ-003 | Stdio and HTTP MCP servers behave as before on every runtime, including autobyteus-179's credential behavior and stdio `env`/`cwd` delivery. | BEH-001 | Must | Preserve |
| REQ-004 | The stdio and HTTP loaders use the SDK's own types and one construction path each. No `any` casts, export-alias or constructor fallbacks, `client.initialize()` branch, or `setSdkLoader` seams remain. | BEH-004 | Must | Task; 179 follow-up |
| REQ-005 | The WebSocket MCP transport is removed: config type, client, factory branch, exports and tests. Configuring or importing `transport_type: "websocket"` is rejected with an error that lists the supported transports. | BEH-003 | Must | DEC-001 |
| REQ-006 | The stdio client is proven against a real local stdio MCP server (no SDK mock), including env and cwd delivery. All suites are rerun, because a dependency change is a shared foundation. | BEH-001 | Must | TESTING.md |
| REQ-007 | Dummy values only; no real credentials anywhere. | — | Must | Constraint |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Install | `pnpm-lock.yaml` has `@modelcontextprotocol/sdk@1.32.1` and no 1.30.0; both `package.json` files say `1.32.1` | — | Lockfile check |
| AC-002 | REQ-002 | SCN-002 | A local server on port A redirects `/mcp` to a server on port B | Connect fails; the error mentions the unfollowed redirect; server B receives no request | — | `autobyteus-ts` real-SDK test |
| AC-003 | REQ-002 | SCN-002 | A local server redirects `/old` to `/mcp` on the same origin | Connect, list and call succeed | — | Same test file |
| AC-004 | REQ-003 | SCN-001 | autobyteus-179 tests and e2e (headers, token, restart, agent tool call) | All green on 1.32.1 | — | Rerun of the 179 core, server and e2e suites |
| AC-005 | REQ-004 | — | Typecheck and source scan | `autobyteus-ts` and server typecheck pass; no `setSdkLoader`, `initialize?.`, `.default?.Client` or `as any` in `src/tools/mcp/server/` | — | Typecheck + grep |
| AC-006 | REQ-005 | SCN-003 | Bulk import or parse of `{ "transport_type": "websocket", "url": "ws://…" }` | Rejected; message lists `stdio, streamable_http`; nothing saved | — | Core + server tests |
| AC-007 | REQ-006 | SCN-001 | A real stdio MCP fixture server reporting a configured env value and its cwd | Connect, list and call succeed; reported env and cwd match the config | — | Core test |
| AC-008 | REQ-006 | all | Full rerun | Core, server unit/integration/typecheck, web, server e2e incl. gated scripted runtimes as available | Failures diagnosed per TESTING.md Rule 9 | Validation report |
| AC-009 | REQ-007 | all | Scan | Only dummy values | — | Scan |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User + agents | Use MCP tools | Normal use | Configure, preview, save, call | Works as before | — | Supported Normal | 179 package | REQ-001, REQ-003, REQ-006 |
| SCN-002 | Contract | Remote endpoint | Redirect | HTTP 3xx from the endpoint | Same-origin: follow; cross-origin: fail | Credentials never leave the configured origin | Use the final URL | Supported Explicit Edge (SDK 1.32.0 contract) | Release notes | REQ-002 |
| SCN-003 | User | User | Import MCP JSON from elsewhere | Bulk import | JSON names `websocket` | Clear rejection | — | Supported Explicit Edge (bulk import accepts external JSON) | Code | REQ-005 |

## UI, Interaction, And Experience Requirements

- Applicable: No (no UI change; errors surface through the existing preview/import messages). Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| ID | REQ/AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Security | No request (and so no credential) is sent to an origin other than the configured one | AC-002 (server B sees nothing) |

## Data Continuity And Acceptable Loss

- Persisted data affected: No. The `mcps.json` shapes are unchanged. No loadable WebSocket entry can exist (investigation notes), and the user's real file has none.

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` 1.32.1 | Client API unchanged for our use; `redirectPolicy` default `'same-origin'` | Source at tag 1.32.1 |
| `@anthropic-ai/claude-agent-sdk` 0.3.280 peer `^1.29.0`; `@google/genai` 2.24.0 optional peer `^1.25.2` | Accept 1.32.1 | `pnpm-lock.yaml` |

## Assumptions

| ID | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | No user relies on WebSocket MCP | GraphQL/UI do not offer it; it cannot persist; the user's file has none |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | WebSocket: fix or remove? | The Task leaves it to the team | The SDK transport takes only a URL, so headers, TLS and origin cannot be passed; v2 has no WebSocket client; the MCP spec defines no WebSocket transport; the product offers it nowhere and cannot persist it | **Remove.** Fixing it would mean writing our own non-standard transport for a feature nobody can use, and v2 would drop it anyway. Easy to re-add later if a real server needs it. | Solution Designer | Decided |
| DEC-002 | Static imports or typed dynamic `import()`? | Startup behavior | Current code loads the SDK lazily | Keep the lazy load as a typed `await import(...)` with the SDK's own types; no behavior change, no casts | Solution Designer | Decided |
| DEC-003 | Allow cross-origin redirects? | Credential safety | Task says not to | No; keep the SDK default `'same-origin'` | Solution Designer (per Task) | Decided |
| DEC-004 | Replace the mock-based unit tests | The seams go away | Real fixture servers (stdio script; in-process HTTP, as in 179) | Real-server tests | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002 |
| REQ-003 | UC-001 | BEH-001 | AC-004 | SCN-001 |
| REQ-004 | UC-001 | BEH-004 | AC-005 | — |
| REQ-005 | UC-003 | BEH-003 | AC-006 | SCN-003 |
| REQ-006 | UC-001 | BEH-001 | AC-007, AC-008 | SCN-001 |
| REQ-007 | all | — | AC-009 | all |

## Readiness Check

- All content checks: Yes
- Decisions: all decided within the direction; none needs the user
- Approval recorded: Yes (Solution Designer within the direction, user informed)
- Ready for design: Yes
