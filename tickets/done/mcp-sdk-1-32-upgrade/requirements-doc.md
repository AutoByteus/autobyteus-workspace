# Requirements Document — MCP SDK 1.32.1 upgrade and loader cleanup

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `mcp-sdk-1-32-upgrade`
- Request / ticket: Project Task `autobyteus-181` (FU-8 of `autobyteus-175`; follow-ups of `autobyteus-179` added)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's approval of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: SR-001 by the `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user, 2026-10-19. SR-002 additions (REQ-008…REQ-010, AC-010…AC-016) by the `User`, in his own words relayed by `/project_task_manager` on 2026-10-19: "we have to make sure that the mcp upgrade doesn't break. Upgrading a library should make things better instead of breaking things." A further addition the same day: check 3 (our own MCP endpoints), added to the Task's description.
- SR-003 addition (REQ-011, AC-017) by the `User`, in the Solution Designer conversation, 2026-10-19: "just make sure that we are improving, upgrading the library, right? But we should make sure the project MCP still works. So later the testing should at least make sure the different runtime for different MCP still works."
- Exact approved baseline: this document at SR-003
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
- SR-002 (the user's regression request):
  - SR-001's proof used self-made fixtures. The external-toy integration tests did not run, nothing ran against the user's real kind of MCP servers (`uv` stdio), and nothing ran specifically against our own MCP endpoints.
  - The upgrade must be shown not to break them: before (1.30.0) and after (1.32.1), with any difference reported to the user in plain words.

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
| UC-004 | Prove before/after parity on real-world MCP servers and on our own MCP endpoints (SR-002) | SCN-004, SCN-005, SCN-006 |

### Out Of Scope

- The SDK v2 migration (`autobyteus-182`).
- MCP secrets in the vault (FU-2), OAuth (FU-3), the gateway (FU-6).
- `ClaudeSdkClient.createMcpServer` dead code (follow-up O-002).
- Fixing the external-toy integration tests' path resolution permanently (that is `autobyteus-189`). SR-002 only runs them with a test-owned layout.
- Calling tools that act on the outside world (SSH servers, downloads, paid or model-heavy generation) during SR-002 checks.

### Non-Goals

No new transport (no SSE client), and no `redirectPolicy` setting exposed to users.

### Preserved Behavior Boundary

BEH-001: autobyteus-179's AC-001…AC-007 behavior; stdio env/cwd delivery; per-agent tool selection; `mcps.json` shapes.

### Prerequisites

None. Checked: the peer ranges, the Node engine, our use of SDK server APIs, and the SDK's stdio transport (unchanged 1.30.0 → 1.32.1; only `shared/protocol.ts` changed, for the experimental tasks feature we don't use).

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
| REQ-008 | Real-world parity (SR-002). The same checks run on 1.30.0 (pre-upgrade) and on 1.32.1 (current) and give the same result: real `uv`-launched stdio servers of the kind the user runs, an HTTP MCP server, and servers that exit or hang at start. Any difference is reported as a finding. | BEH-001 | Must | User, SR-002 |
| REQ-009 | Own-endpoint parity (SR-002). The code is checked for which of our own MCP endpoints use the SDK, and the answer stated plainly. `create_task`/`update_task` through the Agent Tools MCP server from a Claude run and a Codex run, and a tool call through `/mcp/gateway` from our MCP client, give the same result on 1.30.0 and 1.32.1. | BEH-001 | Must | User, SR-002 check 3 |
| REQ-011 | Runtime × MCP matrix (SR-003). Every agent runtime available on this machine (native AutoByteus, Claude Agent SDK, Codex, AGY, and Grok if installed) uses each kind of MCP tool successfully: our own Agent Tools MCP project tools (`create_task`, `update_task`), an external stdio MCP tool and an external HTTP MCP tool. Same result before (1.30.0) and after (1.32.1). | BEH-001 | Must | User, SR-003 |
| REQ-010 | Safety of the SR-002 checks. Only isolated instances and test-owned data; never the user's running app, `mcps.json` or data. Server definitions are copied with env values removed. `uv` servers run from test-owned copies of their folders, so the user's repositories are not written to. Only read-only or listing tools are called. | — | Must | TESTING.md Rules 2 and data; constraints |

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
| AC-010 | REQ-008 | SCN-004 | `autobyteus-ts/tests/integration/tools/mcp/*` with a test-owned layout that gives them `<repo>/autobyteus_mcps` (for example a symlink in the test worktree to a test-owned copy of the needed toy folders), on the pre-upgrade commit and on current `personal` | Same pass/fail per case on both. A case whose toy server does not exist (the HTTP toy `streamable_http_mcp_toy` is not in `autobyteus_mcps`) is reported as "cannot run on either", not as a pass | A case that differs → finding | Both runs' logs side by side |
| AC-011 | REQ-008, REQ-010 | SCN-005 | Isolated app (worktree build) of each commit. MCP servers added through the product (bulk import of a copied, env-stripped definition pointing at a test-owned copy): `VideoAudioServer` (`video-audio-mcp`, no env), plus `media-downloader` for listing only, plus one HTTP MCP server (a test-owned local one) | Preview lists tools; save; a harmless read-only tool is called by an agent on the native runtime and on one other runtime (Codex or Claude); stop/close leaves no child process. Same on both commits | — | Isolated-app evidence per commit |
| AC-012 | REQ-008 | SCN-005 | A stdio server that exits at start; one that hangs at start (never answers initialize) | Same visible outcome on both commits (error text, time to fail or wait, app still responsive, no orphan process). A hang without a timeout on both is reported as a pre-existing finding | Difference → finding | Isolated-app or server e2e evidence |
| AC-013 | REQ-009 | SCN-006 | Code check | A plain statement of which own endpoints use the SDK: none import it in `autobyteus-server-ts/src`; the Agent Tools MCP server and `/mcp/gateway` are hand-written JSON-RPC; they reach the SDK only when the called tool is an external MCP-origin tool | — | Report |
| AC-014 | REQ-009 | SCN-006 | A Claude run and a Codex run call `create_task` then `update_task` through the Agent Tools MCP server (isolated instance, test-owned project) | The Task is created and updated; the results match between 1.30.0 and 1.32.1 | — | Run evidence per commit |
| AC-015 | REQ-009 | SCN-006 | Our own MCP client (`autobyteus-ts` HTTP client or the SDK client from a test) calls an external MCP-origin tool through `/mcp/gateway` | The same result on both commits | — | Evidence per commit |
| AC-017 | REQ-011 | SCN-007 | Isolated app of each commit; per runtime an agent with the three tool kinds selected | A matrix: rows = runtimes, columns = project tools / external stdio / external HTTP, each cell before and after. Every available cell passes on both. A runtime not available on this machine (e.g. not installed, or no sign-in) is listed as "not run" with the reason, never as a pass | A cell that differs → finding | Matrix in the validation report |
| AC-016 | REQ-008, REQ-009, REQ-011 | all | Report | A plain-words summary for the user: what was run, what matched before and after, what differed (findings), and what could not be run and why | — | Validation report + Solution Designer's message to the user |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User + agents | Use MCP tools | Normal use | Configure, preview, save, call | Works as before | — | Supported Normal | 179 package | REQ-001, REQ-003, REQ-006 |
| SCN-002 | Contract | Remote endpoint | Redirect | HTTP 3xx from the endpoint | Same-origin: follow; cross-origin: fail | Credentials never leave the configured origin | Use the final URL | Supported Explicit Edge (SDK 1.32.0 contract) | Release notes | REQ-002 |
| SCN-004 | Operational | Developer | Run the existing integration tests against real toy servers | Test run | Layout set up, run before and after | Same results | Missing toy → cannot run on either | Supported Normal (existing tests) | Task SR-002 (1) | REQ-008, AC-010 |
| SCN-005 | User | User + agent | Use real `uv` stdio MCP servers and an HTTP server after the upgrade | Normal use | Add, preview, call, stop; broken server at start | Same as before | Exit/hang shows an error | Supported Normal / Explicit Edge (servers that fail at start do happen) | User's server list (command shape only) | REQ-008, AC-011, AC-012 |
| SCN-006 | User | Agents (Claude, Codex) and an external MCP client | Use our own MCP endpoints | Agent run; gateway call | `create_task`/`update_task`; gateway `tools/call` | Same as before | — | Supported Normal | Task SR-002 check 3 | REQ-009, AC-013…AC-015 |
| SCN-007 | User | Agents on each runtime | Use project tools and external MCP tools | Agent run | Each runtime calls `create_task`/`update_task`, an external stdio tool and an external HTTP tool | All work, same as before | Runtime unavailable → reported | Supported Normal | User, SR-003 | REQ-011, AC-017 |
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
| DEC-005 | Which real servers to use in SR-002 | Safety: the user's servers include SSH and paid/model-heavy ones | User's `mcps.json` read for command shape and env key names only | Call tools only on `VideoAudioServer` (no env) and on the toy servers; `media-downloader` list-only (calls download); exclude `ssh_remote`, `ssh_ali` (keys, remote hosts) and `autobyteus-image-audio`, `tts` (API key, heavy models). Use test-owned folder copies so `uv` never writes to the user's repositories | Solution Designer | Decided |
| DEC-006 | What "before" means | Parity | Pre-upgrade commit `bf3c550c18` (personal just before the merge `6990940b8d`) vs current `personal` | Build and run both from separate worktrees | Solution Designer | Decided |
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
| REQ-008 | UC-004 | BEH-001 | AC-010, AC-011, AC-012, AC-016 | SCN-004, SCN-005 |
| REQ-009 | UC-004 | BEH-001 | AC-013, AC-014, AC-015, AC-016 | SCN-006 |
| REQ-010 | UC-004 | — | AC-011 | SCN-005 |
| REQ-011 | UC-004 | BEH-001 | AC-017, AC-016 | SCN-007 |

## Readiness Check

- All content checks: Yes
- Decisions: all decided within the direction; none needs the user
- Approval recorded: Yes. SR-001 by the Solution Designer within the direction; SR-002 by the user (his words relayed by the Project Task Manager)
- Ready for design: Yes
