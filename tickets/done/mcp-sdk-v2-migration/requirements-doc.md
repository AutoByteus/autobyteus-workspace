# Requirements Document — MCP TypeScript SDK v1.x → v2 migration

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (approved basis). SR-004 clarified only the verification wording of AC-001 and AC-008 after ARCH-REV-001; no behavior change
- Package identifier: `mcp-sdk-v2-migration`
- Request / ticket: Project Task `autobyteus-182` (FU-9 of `autobyteus-175`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: the User, Solution Designer conversation 2026-10-20: "I think you understand that you did a deep investigation, right? So I trust that you can make a good plan. Of course, if something is broken because we upgraded library and the but the protocol is no longer compatible, then of course we have to improve, right? We might have to update our protocol to conform to the newest, but if you think that it will work, then I trust your reasonable decision." Approves the plan with both recommendations (DEC-001 (a), DEC-002 `legacy`) and adds the condition recorded in DEC-002 and REQ-013.
- Exact approved requirements baseline / solution revision: `SR-002` (SR-001 content plus the user's condition: DEC-001/DEC-002 decided, REQ-013, AC-012)
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: AutoByteus's MCP client runs on `@modelcontextprotocol/sdk` 1.32.1, the v1.x maintenance line. v1.x implements the MCP spec only up to 2025-11-25 and gets bug and security fixes only until at least 2027-01-27 (six months after v2's 2026-07-28 release). The 2026-07-28 spec and the reworked OAuth API are v2-only.
- Affected actors or systems: users who configure MCP servers; agents on every runtime that call external MCP tools; external MCP clients of our Agent Tools endpoint and `/mcp/gateway`; maintainers.
- Desired outcome: both packages use the v2 client (`@modelcontextprotocol/client` 2.3.1). Every MCP feature that works today works the same afterwards, shown by a before/after comparison. The dead Claude `createMcpServer` path is gone.
- Observable definition of success: no AutoByteus source or test imports `@modelcontextprotocol/sdk`; the MCP suites and the before/after parity checks pass with the same results as on 1.32.1, apart from the approved differences (DEC-003, DEC-004); merged; a beta; the user's check.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current Behavior | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001, SCN-002 | Stdio MCP servers: preview, register, call; env and cwd reach the child; exit/hang at start fail; close leaves no orphan (SDK 1.32.1) | Same on the v2 client | All outcomes | investigation BEH-001 |
| BEH-002 | User/System | SCN-001, SCN-002 | Streamable HTTP with configured headers on every request; 401 fails clearly | Same | All outcomes | probe; autobyteus-179 tests |
| BEH-003 | System | SCN-003 | Same-origin redirects followed with credentials; cross-origin refused, error names the target | Same rule; v2 wording of the message | The rule and the target in the message | probe |
| BEH-004 | System | SCN-001 | HTTP failures read `Streamable HTTP error: Error POSTing to endpoint: <body>` | v2 wording `Error POSTing to endpoint: <body>` (DEC-003) | The response body in the message | probe |
| BEH-005 | System | SCN-001 | Tools list returns only the first page of a paginating server | All pages (DEC-004) | Non-paginating servers: identical list | v1/v2 source |
| BEH-006 | System | SCN-002 | Tool calls time out after 6 minutes; run cancellation aborts them; tool errors and structured content are returned | Same | All | `base-managed-mcp-server.ts` |
| BEH-007 | Contract | SCN-001, SCN-002 | Client speaks MCP 2025-11-25 (`initialize`), one process per stdio connect | Per DEC-002 (recommended: same) | Per DEC-002 | probe |
| BEH-008 | Contract | SCN-004 | Our Agent Tools endpoint and `/mcp/gateway` serve legacy-era MCP clients | Same, also for clients built on SDK v2 in default or `auto` mode | All | dispatcher code |
| BEH-009 | Operational | SCN-005 | `ClaudeSdkClient.createMcpServer()`/`createToolDefinition()` exist without a production caller | Removed | Claude runtime behavior | O-002 |
| BEH-010 | Operational | SCN-005 | Packaged desktop app and Docker image start and use MCP on 1.32.1 | Same on v2 | All | autobyteus-181 DR-002 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User configuring MCP servers | Connect real servers (Python/uv, Node, Docker, remote HTTP with a token) | Nothing that works today stops working | User's words: an upgrade must not break things |
| Agents on all runtimes | Call external MCP tools | Same results | — |
| External MCP clients (Claude, Codex, AGY, Grok) | Use our Agent Tools endpoint and gateway | Same results, also for v2-based clients | — |
| Maintainers | Stay on a supported SDK line; build OAuth once | v2 in place before v1 support ends, before FU-3 | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Configure, preview and register a stdio or streamable HTTP MCP server | SCN-001, SCN-003 |
| UC-002 | An agent on any runtime calls an external MCP tool | SCN-002 |
| UC-003 | An external MCP client uses our Agent Tools endpoint or `/mcp/gateway` | SCN-004 |
| UC-004 | Maintainer: dependency set, dead code, packaging and verification of the SDK change | SCN-005 |

### Out Of Scope

- OAuth sign-in for remote MCP servers (FU-3), MCP secrets in the vault (FU-2), Jira presets (FU-4/FU-5), gateway exposure (FU-6).
- Opting into the 2026-07-28 protocol (`versionNegotiation: 'auto'`), per DEC-002 (FU-001), unless REQ-013 applies.
- Rewriting our hand-written Agent Tools endpoint or gateway on the SDK's server classes, or adding 2026-07-28 support to them.
- New MCP features the v2 client offers (resources, prompts, elicitation, sampling, `listChanged` subscriptions, response caching hints).
- The Claude Agent SDK's and Google GenAI's own peer dependency on v1 (owned by those packages).
- Wrapping or rewording SDK error messages.

### Non-Goals

- No change to `mcps.json`, GraphQL, the web UI or the transport set (stdio, streamable HTTP).
- No performance goal beyond "no slower than today" for connect, list and call.

### Preserved Behavior Boundary

- BEH-001, BEH-002, BEH-006, BEH-008, BEH-010 fully; BEH-003 rule; BEH-007 per DEC-002. AC-002…AC-006, AC-009 protect them.
- Invariant: on the same machine and inputs, every parity check gives the same result before and after, except the differences approved in DEC-003 and DEC-004.

### Prerequisites

None. Checked: Node engine (Electron 42 runs Node 24.16, Docker Node 22; v2 needs ≥ 20), zod (^4.3.6; v2 needs ^4.2.0), TypeScript module resolution (`NodeNext`), peers (the Claude Agent SDK's v1 peer stays satisfied), SDK use in our own endpoints (none), real-server compatibility (probes).

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | None | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The MCP client in both packages is `@modelcontextprotocol/client` 2.3.1 (exact pin). No AutoByteus source, test or fixture imports `@modelcontextprotocol/sdk`; neither package lists it as a dependency. It may remain in the lockfile only as another package's peer. | all | Must | Supported line; one client | Task; DEC-006 |
| REQ-002 | Stdio MCP servers keep BEH-001: connect, list, call, env and cwd delivery, failure at start (exit, hang), close without orphan processes. | BEH-001 | Must | Parity | User constraint |
| REQ-003 | Streamable HTTP keeps BEH-002 and BEH-003: configured headers on every request, a clear failure on 401, the same-origin redirect rule with the target named in the error. | BEH-002, BEH-003 | Must | Parity; autobyteus-179/181 | Task |
| REQ-004 | Tool calls keep the 6-minute timeout, cancellation, tool errors and structured content. | BEH-006 | Must | Parity | — |
| REQ-005 | Listing a server's tools returns all its tools, across pages. | BEH-005 | Should | Correct per spec | DEC-004 |
| REQ-006 | Protocol negotiation follows DEC-002 (recommended: the 2025 handshake, as today; no extra probe process or request). | BEH-007 | Must | Parity and cost | DEC-002 |
| REQ-007 | Our Agent Tools endpoint and `/mcp/gateway` keep serving MCP clients built on SDK v2, in default and in `auto` negotiation mode. | BEH-008 | Must | Own endpoints (user's check 3 in autobyteus-181) | — |
| REQ-008 | The unused Claude `createMcpServer`/`createToolDefinition` path and its test are removed. | BEH-009 | Should | O-002 | Task addition |
| REQ-009 | The change is validated before/after (1.32.1 at the base commit vs the v2 branch), as in autobyteus-181 SR-002/SR-003: the MCP suites of "Verifying An MCP SDK Upgrade"; real servers (the Python fixture; a published v1-based and a v2-based Node server; test-owned copies of the user's kind of `uv` servers); a token HTTP server; exit/hang servers; `/mcp/gateway`; the runtime × MCP matrix; packaged isolated apps. A plain-words report lists each check, before, after, same/different. | all | Must | User's explicit expectation | User 2026-10-19 |
| REQ-010 | Validation never touches the user's `~/.autobyteus`, running app or MCP folders (copies only), uses dummy values, and makes no paid, download or SSH tool calls. | — | Must | Safety, as autobyteus-181 REQ-010 | — |
| REQ-011 | Docs name the v2 packages and the v2 error wording ("Verifying An MCP SDK Upgrade", redirects). | BEH-003, BEH-004 | Should | Docs truthfulness | — |
| REQ-012 | Delivery ships a beta and waits for the user's check. | — | Must | Task Done-when | Task |
| REQ-013 | If any validation shows a server that works on 1.32.1 but fails on v2 because of the protocol era or negotiation, it is a defect of this ticket: the client adopts the protocol handling that makes it work (for example `auto` negotiation), not a follow-up. | BEH-007 | Must | User's condition | User 2026-10-20 |

## Acceptance Criteria

| AC ID | REQ IDs | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-005 | `pnpm install`; grep for `@modelcontextprotocol/sdk` in AutoByteus code and manifests (`*.ts`, `*.mjs`, `*.js`, `package.json`; not `node_modules`, `tickets`, `dist`, docs) | Both manifests pin `@modelcontextprotocol/client` 2.3.1; grep finds no import, manifest entry or code comment naming the v1 package; any remaining copy in the root `pnpm-lock.yaml` is only a peer of another package | Any AutoByteus import → fail | Command output |
| AC-002 | REQ-002 | BEH-001, SCN-001/002 | Core MCP integration and unit suites (Node and Python fixtures) | Pass, same cases as on 1.32.1 (connect, list, call, env, cwd, exit/hang at start, close) | — | Suite logs before/after |
| AC-003 | REQ-003 | BEH-002/003, SCN-003 | `mcp-http-auth-remote-server.e2e.test.ts`, `mcp-http-redirect-and-transport.e2e.test.ts`, the autobyteus-ts HTTP tests | Header on every request; 401 fails; same-origin followed; cross-origin refused, other origin receives nothing, error names the target | — | Suite logs |
| AC-004 | REQ-004 | BEH-006 | Unit/integration: slow call, cancellation, tool error, structured content | Same outcomes; the 6-minute timeout and the signal reach the SDK call | — | Tests |
| AC-005 | REQ-005 | BEH-005 | A test server that pages `tools/list` | All tools listed | — | New test |
| AC-006 | REQ-006 | BEH-007 | Stdio connect to a fixture that records its starts; HTTP connect recording request headers | Per DEC-002 (recommended: one start; first request is `initialize`; `mcp-protocol-version: 2025-11-25`) | — | Test |
| AC-007 | REQ-007 | BEH-008, SCN-004 | v2 client (default and `auto`) → Agent Tools endpoint and `/mcp/gateway` | Connects (legacy era), lists, calls | — | Integration tests |
| AC-008 | REQ-008 | BEH-009 | grep for the removed Claude MCP path (`createMcpServer`, `createSdkMcpServer`, `callSdkFunction` in server-ts `src` and `tests`; `createToolDefinition` in `src/runtime-management` and `tests/integration/runtime-management`) | None; Claude runtime suites still pass | — | grep (exact commands in design-spec Change Sequence step 7), suites |
| AC-009 | REQ-009, REQ-010 | all | Before/after parity runs | Report with every check same, or a difference approved here; anything not run is named with its cause | An unapproved difference is a defect of this ticket | Report |
| AC-010 | REQ-011 | — | Docs review | v2 package names and wording | — | Docs sync |
| AC-011 | REQ-012 | — | Delivery | Beta published; the user's check recorded | — | Delivery report |
| AC-012 | REQ-013 | BEH-007 | Parity report | States per real server whether the era/negotiation mattered; any protocol-caused failure is fixed in this ticket and rerun | A protocol-caused failure left open → fail | Report |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Contract | Goal | Trigger | Start | Steps | Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User in Settings → MCP Servers | Add a server and see its tools | Preview / save | Server config (stdio or HTTP + headers) | Preview lists tools; save registers them | Tools available to agents | Bad command, exit/hang at start, 401, unreachable: clear error | Supported Normal Scenario | product UI; 179/181 | REQ-002/003/005/006; AC-002/003/005/006 |
| SCN-002 | System | Agent on native, Claude, Codex, AGY or Grok | Use an external MCP tool | Agent tool call | Registered tool | Call → result in the run | Result shown | Tool error, timeout, cancellation | Supported Normal Scenario | runtime matrix suite | REQ-002/004; AC-002/004/009 |
| SCN-003 | System | Remote server | Redirected endpoint | HTTP 3xx | HTTP server config | Follow within origin only | Works or clear refusal | Cross-origin refused | Supported Explicit Edge Scenario (security rule, autobyteus-181) | e2e | REQ-003; AC-003 |
| SCN-004 | Contract | External MCP client | Use our endpoints | MCP connect | AutoByteus running | initialize/list/call | Tools work | — | Supported Normal Scenario | endpoint tests | REQ-007; AC-007 |
| SCN-005 | Operational | Maintainer / release | Ship the change | Build, package, release | Branch | install, build, package, run | App starts, MCP works | — | Supported Normal Scenario | RELEASE.md | REQ-001/008/009/012; AC-001/008/009/011 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (only SDK error wording shown in existing error areas changes; DEC-003)
- Product design fields: N/A — not applicable

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-006; AC-006, AC-009 | Performance | Stdio connect starts the server process once; connect/list/call times within the noise of the before run | Parity runs | Report timings |
| QR-002 | REQ-001; AC-009 | Compatibility | Packaged desktop app (macOS) and server build start and use MCP | Isolated app | Parity run |
| QR-003 | REQ-003, REQ-010 | Security | No change to credential handling or redirect rule; dummy values only | All tests | AC-003 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. `mcps.json`, the vault and run history are untouched.

## External Contracts And Dependencies

| Contract | Requirement | Evidence | Risk |
| --- | --- | --- | --- |
| `@modelcontextprotocol/client` 2.3.1 | Node ≥ 20, zod ^4.2 | npm | R-002 packaging |
| MCP spec 2025-11-25 | Wire protocol kept (DEC-002) | client docs | — |
| Claude Agent SDK peer `^1.29.0` | Keeps a v1 copy in the tree, types only | lockfile | none at run time |

## Supplemental Artifacts

| Artifact | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `probes/` | Compatibility and error-text evidence | REQ-002/003/006 | Final | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | v2's default mode sends the same wire traffic as v1 (SDK: "byte-identical") | Parity | Probe (headers, protocol version); AC-006, AC-009 | Partly verified |
| ASM-002 | The Claude Agent SDK does not load the v1 SDK at run time | Leaving its peer alone is safe | autobyteus-181 grep; Claude runtime suites | Verified (code) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | When, relative to OAuth (FU-3) and the other Jira follow-ups? | OAuth's API changed in v2; v1 support ends ≥ 2027-01-27 | (a) now, on its own; (b) together with FU-3; (c) later | **(a) now.** The production change is 3 files plus tests and is cheap to prove with the before/after method. Bundling it with OAuth would mix a parity-only change with new behavior and make regressions harder to attribute. FU-3 is not a Task yet, so it can then be built once, on v2. FU-2 (vault) and FU-4 (presets) don't depend on the SDK line and can come in any order after. | User | Decided by the user 2026-10-20: (a) now |
| DEC-002 | Should the client opt into the 2026-07-28 protocol (`auto` negotiation) now? | Wire behavior and cost per connect | Default `legacy` = today's handshake (probe: 1 spawn, `2025-11-25`). `auto` = modern with v2 servers, but on stdio **every connect spawns the server twice** (probe: 2 spawns); costly for `uv`/Docker servers and per-run sessions; HTTP gets one extra request | **Keep `legacy` (the SDK's own default) in this ticket.** It keeps the migration provably non-breaking. Few servers speak 2026-07-28 yet, and none of our features needs it. Opting in, globally or per server, becomes a follow-up when a server needs it (FU-001). | User | Decided by the user 2026-10-20: `legacy`, **on the condition** that if validation shows a real server that no longer works because of the protocol era, the client moves to the newer protocol (REQ-013) |
| DEC-003 | Keep v2's error wording or reword it to v1's? | Users see the text in preview errors | v2 drops the "Streamable HTTP error:" prefix and adds advice to the redirect message (probe) | Accept v2 wording. Nothing parses it, the new redirect text is more helpful, and rewording SDK errors would add an owner for text we don't own. Tests and docs follow the new text. | Solution Designer | Decided |
| DEC-004 | Accept all-pages tool listing? | A paginating server shows more tools | v1 returns page 1 only; v2 walks all pages (cap 64) | Accept. The spec defines pagination; today's behavior silently drops tools. Non-paginating servers (all seen so far) are unchanged. | Solution Designer | Decided |
| DEC-005 | Test servers: move to v2 server packages or keep v1 for them? | Tests should not pin us to the deprecated line, but must show compatibility with v1-based servers | v2 `@modelcontextprotocol/server`/`node`/`core` as devDependencies; v1-server compatibility via the parity run with a published v1-based server (`server-filesystem` 2026.8.31) and the Python fixture | Move all test servers and clients to v2. Prove compatibility with the v1 line in the parity run against real published servers, not with a v1 devDependency. | Solution Designer | Decided |
| DEC-006 | Remove `@modelcontextprotocol/sdk` from both manifests? | The Claude Agent SDK needs it as a peer | Peer is types-only; pnpm `autoInstallPeers` and npm both install required peers | Remove it from both manifests. No AutoByteus code uses it, and the peer stays satisfied by the package managers. AC-001 checks that it is present only as a peer. | Solution Designer | Decided |
| DEC-007 | Add the local same-host http→https redirect test (Task, low priority)? | Coverage | Needs ports 80/443 and a trusted TLS certificate; the rule is the SDK's own and unchanged in v2 (source) | Not added. It can't run portably in CI or on dev machines. The cross-origin and same-origin redirect tests stay. | Solution Designer | Decided |
| DEC-008 | O-002 here or before? | Same SDK types area | Task allows either | Here. It's small, and it removes the last AutoByteus code touching the SDK's in-process server types. | Solution Designer | Decided |
| DEC-009 | Use v2's `authProvider` for static tokens? | Auth path | `requestInit.headers` supports any header name (today's behavior) | Keep `requestInit.headers`. `authProvider` belongs to FU-3 (OAuth). Note for FU-3: a provider token overrides a configured `Authorization` header (R-005). | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-004 | all | AC-001 | SCN-005 |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-002, AC-009 | SCN-001, SCN-002 |
| REQ-003 | UC-001 | BEH-002, BEH-003 | AC-003 | SCN-001, SCN-003 |
| REQ-004 | UC-002 | BEH-006 | AC-004 | SCN-002 |
| REQ-005 | UC-001 | BEH-005 | AC-005 | SCN-001 |
| REQ-006 | UC-001, UC-002 | BEH-007 | AC-006 | SCN-001, SCN-002 |
| REQ-007 | UC-003 | BEH-008 | AC-007 | SCN-004 |
| REQ-008 | UC-004 | BEH-009 | AC-008 | SCN-005 |
| REQ-009 | UC-001…UC-004 | all | AC-009 | all |
| REQ-010 | UC-004 | — | AC-009 | SCN-005 |
| REQ-011 | UC-004 | BEH-003, BEH-004 | AC-010 | SCN-005 |
| REQ-012 | UC-004 | — | AC-011 | SCN-005 |
| REQ-013 | UC-001, UC-002 | BEH-007 | AC-012 | SCN-001, SCN-002 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-005 (after approval).
- Constraints: the wire protocol per DEC-002; the same header and redirect handling; no `mcps.json`/GraphQL/UI change; dummy values only.
- Deferred to design: the exact devDependency set per package; the shape of the test-server rewrites; the paginating test server; where the start-count check lives.
- Technical facts to verify: `NodeStreamableHTTPServerTransport.handleRequest` signature; `registerTool` with raw shapes vs `z.object`; one lockfile v1 copy as the peer only; packaged app contents.
- Known risks: R-002 (packaging), R-003 (stricter validation with some real server).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the user, 2026-10-20)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no behavior-defining supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
