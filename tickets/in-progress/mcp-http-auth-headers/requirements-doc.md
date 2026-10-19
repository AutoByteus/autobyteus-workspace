# Requirements Document — Authentication for remote (streamable HTTP) MCP servers

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-http-auth-headers`
- Request / ticket: Project Task `autobyteus-179` (FU-1 of `autobyteus-175`, package `jira-mcp-server-presets`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-19, in the Solution Designer conversation ("FU-1 requirements approved within the Task's direction …").
- Exact approved requirements baseline / solution revision: this document at `SR-001`
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: AutoByteus silently drops the credentials a user configures for a remote (streamable HTTP) MCP server, so any server that requires authentication cannot connect. There are three drops:
  1. headers are passed to the MCP SDK under an option the SDK ignores, so they are never sent (probe P-001);
  2. the form's Token field is not saved, and even when present it is never sent;
  3. the form's JSON view leaves headers out, so switching from Form to JSON and saving from JSON loses them.
- Affected actors: a user adding a remote MCP server in Settings → Tools → MCP (form, JSON view or bulk import); every agent runtime using that server's tools (native, Claude Agent SDK, Codex, AGY, Grok all reach it through the AutoByteus server).
- Desired outcome: what the user configures is what the server receives, on every request.
- Observable definition of success: a local MCP server that requires `Authorization` accepts AutoByteus's connection, tool listing and tool call when the credential is configured as a header or as the token.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior (evidence) | Desired Behavior | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Configured `headers` are saved but never sent (P-001; `http-managed-mcp-server.ts` passes `{url, headers}`; SDK 1.30 reads `requestInit.headers`) | Every request (initialize, list tools, call tool, preview) carries the configured headers | Unauthenticated servers behave as today |
| BEH-002 | User | SCN-002 | Token field: not persisted (`file-provider.ts` `toStandardEntry`), never sent (`types.ts` stores it; no reader) | Token persisted and sent as `Authorization: Bearer <token>` | Form shows the saved token in the password field, as it does for other saved values |
| BEH-003 | User | SCN-003 | Form → JSON view omits headers (`McpServerFormModal.vue` `updateJsonFromForm`) | JSON view shows the headers; saving from JSON keeps them | JSON → Form already keeps headers |
| BEH-004 | User | SCN-004 | Token and an `Authorization` header can both be given; neither works | Both together are rejected with a clear message (DEC-002) | — |
| BEH-005 | User | SCN-001..003 | Errors from an unauthorized server surface as a preview or connect failure | Unchanged | Same error surfaces |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Connect an authenticated remote MCP server | Credentials reach the server | No silent loss |
| Agents (all runtimes) | Use the server's tools | Tool calls authenticate | Per-agent tool selection unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Add or edit a remote HTTP MCP server with auth headers (form, JSON view, bulk import), preview and use its tools | SCN-001, SCN-003 |
| UC-002 | Add or edit a remote HTTP MCP server with the Token field, preview and use its tools | SCN-002, SCN-004 |

### Out Of Scope

- Moving MCP secrets into the vault, and stopping secret values from being returned to the UI (FU-2). This ticket keeps the token in `mcps.json` the same way headers and env values are kept today.
- OAuth (FU-3), Jira presets (FU-4), the work-a-ticket skill (FU-5), MCP gateway exposure (FU-6), and the credential boundary for agent shells (FU-7).
- A headers editor in the form; headers stay editable through the JSON view.
- WebSocket MCP transport. It is not offered by the UI, GraphQL or `mcps.json` persistence; recorded as a follow-up observation only.

### Non-Goals

No change to how unauthorized responses are reported, and no new auth schemes beyond a fixed header or a bearer token.

### Preserved Behavior Boundary

BEH-005; unauthenticated HTTP servers and stdio servers are unchanged; existing `mcps.json` entries load unchanged; per-agent tool selection is unchanged.

### Review Authority

Standard: a blocking finding cites an ID here; anything new is a `Requirement Gap` needing the user's approval.

## Requirements

| ID | Requirement | Behaviors | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Configured headers of a remote HTTP MCP server are sent on every request AutoByteus makes to it: connect/initialize, tool listing (registration and preview) and tool calls, for every agent runtime. | BEH-001 | Must | P-001 | Task |
| REQ-002 | A token entered for a remote HTTP MCP server is saved with the server and sent as `Authorization: Bearer <token>` on every request. A blank token means no token. | BEH-002 | Must | DEC-001 | Task (either/or) |
| REQ-003 | A server configured with both a token and an `Authorization` header (any letter case) is rejected when it is saved, previewed or imported, with a message telling the user to use one of the two. Nothing is silently dropped or overridden. | BEH-004 | Must | DEC-002 | Task "nothing silently dropped" |
| REQ-004 | The form's JSON view includes the server's headers; saving from either view keeps them. | BEH-003 | Must | Investigation | Task "nothing silently dropped" |
| REQ-005 | The form tells the user how the token is sent (as a Bearer token) and that other schemes, such as Basic, go in an `Authorization` header in the JSON view. | BEH-002 | Should | DEC-003 | Atlassian Rovo uses Basic for API tokens |
| REQ-006 | Remote servers without credentials, and stdio servers, behave exactly as before. | BEH-005 | Must | Preserve | Task |
| REQ-007 | Tests use dummy values against a local server only; no real credential appears in code, tests, evidence or logs, and no header or token value is logged. | — | Must | Constraint | Task |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | A local MCP server rejects requests without `Authorization: Bearer test-dummy`; AutoByteus is configured with that header | Connect, list tools and call a tool all succeed; the server sees the header on each request | With a wrong value, preview or connect fails with the server's auth error | `autobyteus-ts` test against a real local SDK server (no SDK mock) |
| AC-002 | REQ-002 | SCN-002 | Same server; AutoByteus is configured with the token `test-dummy` | Same as AC-001; after save and reload from `mcps.json`, the token is present and still sent | Blank token: no `Authorization` header is sent | Core test + server persistence test (save → reload → connect) |
| AC-003 | REQ-003 | SCN-004 | Save, preview or import with both a token and an `authorization` header | Rejected with a message naming both fields | — | Unit tests: config validation; GraphQL/import path |
| AC-004 | REQ-004 | SCN-003 | Open a saved HTTP server with headers, switch to the JSON view, save | The JSON shows the headers; the saved server still has them | — | Web component test |
| AC-005 | REQ-005 | SCN-002 | Open the HTTP form | The hint under the Token field is shown, in English and Chinese | — | Web component test + localization guards |
| AC-006 | REQ-006 | SCN-001 | An unauthenticated local HTTP server; an existing stdio test | Both work as before | — | Existing tests stay green + an unauthenticated case in the new test |
| AC-007 | REQ-001, REQ-002 | SCN-001/002 | A selected agent on a real runtime calls a tool of a header-protected local server | The tool call succeeds | — | API/E2E validation through the AutoByteus server (at least the native runtime; Claude/Codex through the agent-tools endpoint where the environment allows) |
| AC-008 | REQ-007 | all | Repository and evidence scan | Only dummy values; no header or token value in logs | — | Review + scan |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Starting Condition | Steps | Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Connect a server that needs a fixed auth header (e.g. Rovo with `Authorization: Basic …`) | Settings → Tools → MCP, JSON view or bulk import | Remote server requires the header | Paste `{url, headers}`, preview, save; an agent with the selected tools calls one | Tools listed and callable | Wrong value: auth error shown | Supported Normal (Atlassian's documented client config) | jira-mcp-server-presets investigation | REQ-001, AC-001, AC-007 |
| SCN-002 | User | User | Connect a server that takes a bearer token | Form: URL + Token | Server requires `Bearer` | Enter the token, preview, save | Tools listed and callable | Blank token: no header | Supported Normal (form field exists) | `McpServerFormModal.vue` | REQ-002, REQ-005, AC-002, AC-005 |
| SCN-003 | User | User | Edit a saved server | Form → JSON view switch | Server saved with headers | Open, switch to JSON, save | Headers kept | — | Supported Normal | `McpServerFormModal.vue` | REQ-004, AC-004 |
| SCN-004 | User | User | Give both a token and an Authorization header | Form + JSON, or import | — | Save or preview | Clear rejection | — | Supported Explicit Edge (two exposed inputs carry the same header) | Investigation | REQ-003, AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes, minimal (one hint line, JSON view contents). No Product Design was requested.
- Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-007, AC-008 | Security | No header or token value is written to logs or error messages produced by AutoByteus | Review + test assertions on error text |

## Data Continuity And Acceptable Loss

- Persisted data affected: Yes. HTTP entries in `<appDataDir>/mcps.json` may gain a `token` key.
- Must preserve: every existing entry loads and behaves as before. Tokens were never saved before, so no existing entry has one.
- Acceptable loss: none.
- Constraints: the token is kept in plain text like headers and env values today; moving it into the vault is FU-2.

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| `@modelcontextprotocol/sdk` 1.30.0 `StreamableHTTPClientTransport` | Headers via `opts.requestInit.headers` | SDK dist L25-73; probe P-002 | A future SDK change; covered by the real-SDK test |

## Supplemental Artifacts

| Path | Purpose | Status |
| --- | --- | --- |
| `investigation-notes.md` (this package) | Evidence, links to the jira-mcp-server-presets probes | Current |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | All runtimes reach external MCP tools through the AutoByteus server's registry (no runtime receives the raw HTTP config) | `agent_tools_mcp_server.md`; grep found no other HTTP MCP client | Confirmed by code search |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep the Token field (save and send it) or remove it? | The Task allows either | The field is already in the UI, GraphQL input/output and the core config type; users expect it to work; bearer tokens are the most common remote MCP scheme | Keep it and make it work: save it, and send it as `Authorization: Bearer <token>`. Removing it would also touch GraphQL and the web types for no user gain. Storage matches headers today, so there is no new class of exposure; FU-2 moves both into the vault. | Solution Designer | Decided |
| DEC-002 | Token and an `Authorization` header both set | Two inputs for one header | Override either way would silently drop one | Reject with a clear message (case-insensitive header name). Explicit, and matches "nothing silently dropped". | Solution Designer | Decided |
| DEC-003 | How does the user know the token is sent as Bearer? | Rovo API tokens need `Basic` | A label change or a hint | Add one hint line under the field (en + zh-CN), keeping the label. | Solution Designer | Decided |
| DEC-004 | Blank or whitespace token | Form sends `null` for empty; JSON may contain `""` | — | Treat blank as no token; trim surrounding whitespace. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-007 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-007 | SCN-002 |
| REQ-003 | UC-001, UC-002 | BEH-004 | AC-003 | SCN-004 |
| REQ-004 | UC-001 | BEH-003 | AC-004 | SCN-003 |
| REQ-005 | UC-002 | BEH-002 | AC-005 | SCN-002 |
| REQ-006 | UC-001, UC-002 | BEH-005 | AC-006 | SCN-001 |
| REQ-007 | all | — | AC-008 | all |

## Architecture Phase Input

- Scenarios to map: SCN-001..004 across the save, connect/list/call, preview and import paths.
- Preserve: GraphQL schema (token and headers already exist), `mcps.json` shape for existing entries, per-agent tool selection.
- Verify: every place that builds or persists a streamable HTTP config; no runtime bypasses the registry.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: Yes
- Desired and preserved behavior explicit: Yes
- Scope and non-goals clear: Yes
- REQs/ACs testable and traceable: Yes
- Scenarios covered: Yes
- Product design: N/A
- Decisions visible with reasoning: Yes (all decided within the direction; none needs the user)
- Content ready for approval: Yes

### Approved Basis Ready For Design

- Approval recorded: Yes (Solution Designer within the direction, user informed)
- Exact basis recorded: Yes (SR-001)
- Ready for architecture design: Yes
