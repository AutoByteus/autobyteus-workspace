# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-http-error-status`
- Request / ticket: Project Task "Show the HTTP status in remote MCP connection errors" (FU-002 of autobyteus-182 / `tickets/done/mcp-sdk-v2-migration/follow-ups.md`)
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's conversation message of 2026-10-20 announcing the approval of SR-001 (see `solution-revision-record.md` SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None. Evidence probe: `probes/http-status-message.probe.test.ts` and `probes/probe-output.txt` (evidence only, not behavior-defining)

## Problem And Desired Outcome

- Problem: when a remote (streamable HTTP) MCP server answers with an HTTP error, the message the user sees in the MCP server form (Preview) or after Save/Reload (discover and register) has no HTTP status. A 401 reads `Failed to preview tools for MCP server: SdkHttpError: Error POSTing to endpoint: unauthorized`; a 404 with an empty body reads `… Error POSTing to endpoint: ` with nothing after it. The status is only on the error object (`SdkHttpError.status`), which no layer reads. So a user cannot tell a missing or wrong token (401/403) from a wrong URL (404) or a broken server (500).
- Affected actors or systems: the user configuring a remote MCP server in the Tools settings (web UI and desktop app); the AutoByteus server's MCP client (`autobyteus-ts` managed MCP servers); agents whose MCP tool calls reach the same client.
- Desired outcome: every such message states the HTTP status, so the cause can be read from the message alone.
- Observable definition of success: a 401, 403, 404 and 500 answer from a remote MCP server each produce a preview message and a discover/register message that contain `HTTP 401`, `HTTP 403`, `HTTP 404` and `HTTP 500` respectively, verified by automated tests.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Preview of a remote MCP server that answers with an HTTP error returns the GraphQL error `Failed to preview tools for MCP server: SdkHttpError: Error POSTing to endpoint: <body>`; no status | The message contains the HTTP status and its reason phrase, e.g. `HTTP 401 Unauthorized`, followed by the SDK's text | The `Failed to preview tools for MCP server:` prefix; the SDK's text (response body or redirect hint); the web shows the message verbatim | `probes/probe-output.txt` (Reproduced); `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` L96-107 |
| BEH-002 | User | SCN-002 | Save & sync / reload of a saved remote server returns `discoverAndRegisterMcpServerTools { success: false, message: "SdkHttpError: Error POSTing to endpoint: <body>" }`; no status | The message contains the HTTP status and reason phrase as in BEH-001 | `success: false`, empty `discoveredTools`; the SDK's text | Same path through `McpToolRegistrar` (Read); resolver L140-158 |
| BEH-003 | System | SCN-003 | An agent's MCP tool call that has to connect to a remote server that answers with an HTTP error fails with the same status-less SDK message | Same message with the status (one client, one rule) | Tool-call failure handling and result shape | `GenericMcpTool` → `McpServerProxy` → `BaseManagedMcpServer.connect` (Read) |
| BEH-004 | User/System | SCN-001, SCN-002 | Failures without an HTTP answer (connection refused `TypeError: fetch failed`, DNS, timeouts, stdio launch errors, config validation errors) have their own text | Unchanged: no HTTP status is invented | Their current text | `probes/probe-output.txt` row `refused` (Reproduced) |
| BEH-005 | Contract | SCN-001, SCN-002 | Error messages never contain the token or header values (autobyteus-179 e2e tests assert this) | Unchanged | No credential in any message or log | `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` L143-148 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User configuring a remote MCP server | Connect a server and fix a failing configuration | Tell an auth problem (401/403) from a wrong URL (404) or a server fault (5xx) by reading the message | No credential in the message |
| Agent (any runtime using configured MCP tools) | Call a remote MCP tool | A failed connect reports the status like the settings screen does | Tool-call behavior otherwise unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Preview a remote MCP server's tools from the MCP server form | SCN-001 |
| UC-002 | Save & sync, or reload the schema of, a saved remote MCP server (discover and register its tools) | SCN-002 |
| UC-003 | An agent's tool call that connects to a remote MCP server | SCN-003 |

### Out Of Scope

- The SDK's own message text (response body, redirect hint) is kept as is; trimming or summarising long HTML bodies is not part of this ticket.
- Errors that are not HTTP answers (connection refused, DNS, TLS, timeouts, stdio servers, JSON/config validation).
- Mapping statuses to advice ("check your token") or new UI elements; the web keeps showing the server message verbatim.
- MCP clients that are not ours (Codex, Claude Code, other runtimes connecting to MCP servers themselves).
- Our own MCP endpoints (`/mcp/gateway`, Agent Tools route) and the OAuth `authProvider` flow (not used by AutoByteus).

### Non-Goals

- No new GraphQL fields (such as a separate `status` field); the status is part of the message text.

### Preserved Behavior Boundary

BEH-001…BEH-003 preserved columns; BEH-004 and BEH-005 entirely; REQ-004, REQ-005. Existing e2e assertions on `Failed to preview tools for MCP server`, the redirect message `Redirect to … not followed` / `(redirectPolicy: 'same-origin')` and the credential-free messages keep passing.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a remote MCP server answers an MCP request with an HTTP error status, the failure our MCP client reports states that status as `HTTP <status>`, followed by the reason phrase when the response has one (e.g. `HTTP 404 Not Found`), followed by the SDK's own text | BEH-001, BEH-002, BEH-003 | Must | The user's need; the reason phrase keeps an empty-body answer readable | Task "What"; DEC-001 |
| REQ-002 | The preview message (GraphQL `previewMcpServerTools` error) carries the REQ-001 text | BEH-001 | Must | Task "Done when" | Task |
| REQ-003 | The discover/register message (`discoverAndRegisterMcpServerTools.message`) carries the REQ-001 text | BEH-002 | Must | Task "Done when" (registration) | Task |
| REQ-004 | A failure that is not an HTTP answer keeps its current text, without a status | BEH-004 | Must | Do not invent a status | DEC-003 |
| REQ-005 | No message contains a token or header value; the existing prefixes and SDK text stay | BEH-001, BEH-002, BEH-005 | Must | Preserved contract (autobyteus-179) | Preserved |
| REQ-006 | An agent tool call whose connect to a remote MCP server fails with an HTTP error reports the REQ-001 text | BEH-003 | Should | Same client and same failure read the same everywhere | DEC-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-005 | BEH-001 / SCN-001 | A local HTTP server answers every request with 401, 403, 404 or 500; preview through GraphQL | The GraphQL error message contains `Failed to preview tools for MCP server`, `HTTP 401` / `HTTP 403` / `HTTP 404` / `HTTP 500` respectively, and the SDK text (`Error POSTing to endpoint`) | No token value in the message | Built-server e2e test, one case per status |
| AC-002 | REQ-001, REQ-003 | BEH-002 / SCN-002 | Same servers, saved config; `discoverAndRegisterMcpServerTools` | `success: false` and the message contains the matching `HTTP <status>` | — | Built-server e2e test, one case per status |
| AC-003 | REQ-001 | BEH-001 / SCN-001 | A 404 with an empty body | The message contains `HTTP 404 Not Found` | — | Unit or integration test |
| AC-004 | REQ-004 | BEH-004 | Connection refused (nothing listens), and a stdio server that fails | Message unchanged (e.g. `fetch failed`), contains no `HTTP ` status prefix | — | Unit/integration test |
| AC-005 | REQ-005 | BEH-005 | Existing e2e suites `mcp-http-auth-remote-server` and `mcp-http-redirect-and-transport` | Still pass unchanged; the cross-origin redirect message still contains `Redirect to … not followed` and `(redirectPolicy: 'same-origin')` (and now also its `HTTP 307` status) | — | Rerun existing suites |
| AC-006 | REQ-006 | BEH-003 / SCN-003 | A managed HTTP server whose connect gets a 401 during a tool call | The tool call fails with a message containing `HTTP 401` | — | Unit test on the managed server / tool-call path |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User in Tools → MCP servers | Check a remote server before saving | MCP server form, Preview | A streamable HTTP server config with URL and maybe a token | User enters URL/token, clicks Preview; the server answers 401/403/404/500 | Red error box shows the message with `HTTP <status> <reason>` | Refused connection: current `fetch failed` text | Supported Normal Scenario | `McpServerFormModal.vue` L136-138, `toolManagementStore.ts` L229-245 | REQ-001, REQ-002, REQ-005; AC-001, AC-003, AC-004, AC-005 |
| SCN-002 | User | User in Tools → MCP servers | Save a server and load its tools, or reload a saved one | Save & sync in the form; reload in the tools workspace | Saved remote config | Save → discover/register; the server answers with an HTTP error | Toast/message with `HTTP <status> <reason>` | As SCN-001 | Supported Normal Scenario | `McpServerFormModal.vue` L540-557; `ToolsManagementWorkspace.vue` | REQ-001, REQ-003; AC-002, AC-005 |
| SCN-003 | System | Agent run | Call a configured remote MCP tool | Agent tool call (AutoByteus runtime, or Agent Tools MCP for other runtimes) | Server registered earlier, now rejects (e.g. token revoked) | Tool call → connect → HTTP error | Tool failure text contains `HTTP <status>` | — | Supported Normal Scenario | `tool.ts`, `proxy.ts`, `configured-mcp-registry-tool-adapter.ts` | REQ-006; AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (message text only; the web shows the server message verbatim, no UI change)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): None

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005 / AC-001, AC-005 | Security | No token or header value appears in any message | All in-scope surfaces | Existing and new e2e assertions |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: N/A
- Loss, reset, rebuild, or regeneration that is acceptable: N/A
- Retention, privacy, compliance, volume, downtime, or operational constraints: N/A
- Unknowns requiring downstream investigation: None

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `@modelcontextprotocol/client` 2.3.1 `SdkHttpError` | Exported; has `status` and `statusText` getters; `SdkHttpError.isInstance()` / branded `instanceof`. Thrown for POST and SSE GET HTTP errors, including the unfollowed-redirect case | `dist/index-B-4n9P0J.d.mts` L284-292; `dist/index.mjs` L5547-5552, L5788-5793; probe (Reproduced) | The SDK's message wording may change in later versions; the status prefix does not depend on it |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` | Reproduction of the current messages through the real preview path | REQ-001…REQ-004 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | AutoByteus never passes an OAuth `authProvider`, so a 401 always arrives as `SdkHttpError` (not `UnauthorizedError`) | Otherwise a 401 would take another SDK path | `http-managed-mcp-server.ts` builds the transport with `requestInit` only (Read); probe 401 row (Reproduced) | Confirmed |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Exact form of the status in the message | Users read it | (a) `HTTP 401: …` (Task example); (b) `HTTP 401 Unauthorized: …` with the response's reason phrase. Probe: a 404 with an empty body reads `Error POSTing to endpoint: ` — nothing after the colon | (b): the code is what the Task asks for and stays first; the reason phrase (from the SDK's `statusText`) makes the code readable for users who do not know codes and fills the empty-body case. When the response has no reason phrase (e.g. HTTP/2), just `HTTP 401: …`. Within the Task's example and direction | Solution Designer | Decided |
| DEC-002 | Only preview/registration, or every place our client reports the failure? | Consistency vs. scope | Preview, discover and agent tool calls all go through the same managed MCP server connect | One client, one rule: the same failure should read the same in settings and in an agent's tool result; it costs no extra surface. Include tool calls (REQ-006) | Solution Designer | Decided |
| DEC-003 | What about failures without an HTTP status? | Avoid misleading text | Refused/DNS/timeout/stdio have no status | Leave them unchanged (REQ-004) | Solution Designer | Decided |
| DEC-004 | Keep the SDK text after the status? | Redirect hint and body are useful | Existing redirect e2e asserts on it | Keep it unchanged after the status (REQ-005) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 | BEH-001…003 | AC-001, AC-002, AC-003, AC-006 | SCN-001…003 | probe |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 | probe |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 | — |
| REQ-004 | UC-001, UC-002 | BEH-004 | AC-004 | SCN-001, SCN-002 | probe `refused` row |
| REQ-005 | UC-001, UC-002 | BEH-001, BEH-002, BEH-005 | AC-001, AC-005 | SCN-001, SCN-002 | — |
| REQ-006 | UC-003 | BEH-003 | AC-006 | SCN-003 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-003.
- Product and system constraints architecture must preserve: BEH-004, BEH-005; existing e2e assertions; the lazy SDK load of `http-managed-mcp-server.ts`.
- Decisions intentionally deferred to architecture design: where the status is added (resolver vs. MCP client boundary) and how the original error is kept.
- Technical facts architecture should verify: whether HTTP errors also arise after connect (listTools/callTool) and should share the rule.
- Known feasibility or integration risks: None.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
