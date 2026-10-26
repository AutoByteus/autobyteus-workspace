# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agent-tools-mcp-tool-error-result` (Project Task `autobyteus-232`)
- Request / ticket: autobyteus-232. Agents on AGY, Codex and Claude see JSON-RPC `Internal error` instead of the real reason a configured MCP tool failed (FU-001 of autobyteus-223)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-10-24 (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: when a configured (remote or stdio) MCP tool fails, for example because its token was revoked, an agent on AGY, Codex or Claude receives JSON-RPC `-32603 Internal error` from the run's Agent Tools MCP endpoint. It cannot tell the cause. On scripted AGY the whole turn ends with `AGY_TURN_ERROR "Internal error"`. The native AutoByteus runtime already shows `HTTP 401 Unauthorized: …`.
- Desired outcome: the external runtime's agent receives the tool failure as an MCP tool result with `isError: true` and the failure text, the same text the native runtime shows. The text contains no token, header value or secret-bearing URL.
- Observable definition of success: in the revoked-token case on scripted AGY, the turn completes and the agent's tool result contains `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`, and no token value appears on the agent's wire.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | `ConfiguredMcpRegistryToolAdapter.execute` lets a tool failure throw; `dispatchToolsCall` answers JSON-RPC `-32603 Internal error` | The adapter answers a failed call with an `isError` tool result whose text is the failure message | Successful results and remote `isError` results pass through unchanged; protocol errors keep their JSON-RPC answers (invalid params, unknown or disabled tool, invalid request); other adapters unchanged | E-01…E-04, SD-01 |
| BEH-002 | Contract | SCN-001 | Native runtime: the tool failure text states the status (autobyteus-223) | Unchanged; external runtimes now get the same text | Native path untouched | E-05 |
| BEH-003 | Contract | SCN-001 | No message contains a token or header value (autobyteus-179/223 contract, e2e-asserted) | Holds for the new tool result too | — | E-06 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Agent on AGY/Codex/Claude | Act on a tool failure (tell the user to renew a token, try another way) | Reads the real reason | No credentials |
| User | Understand why the agent's tool call failed | The agent and the run view show the reason | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent on AGY, Codex or Claude calls a configured MCP tool that fails; it reads why | SCN-001 |

### Out Of Scope

- Errors of the platform's own Agent Tools (send_message_to, delegate_task, browser, media, …): they already return results or keep their paths.
- The endpoint's protocol answers (autobyteus-226), auth headers (autobyteus-179).
- Redacting text a remote MCP server itself puts in its own response body (same as the native runtime today; residual risk R-01).

### Non-Goals

- New wording or advice for errors; the text is the existing failure message.

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-002; BEH-003.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A configured MCP tool call through the Agent Tools MCP endpoint that fails (the tool's execution throws, or the tool is no longer available for the session at call time) is answered with a successful JSON-RPC response carrying an MCP tool result: `isError: true`, one text content item with the failure message. | BEH-001 | Must | Task direction | Task; DEC-001 |
| REQ-002 | The failure text contains no token, header value or secret-bearing URL; it is the same message the native runtime gives the agent. | BEH-002, BEH-003 | Must | Task "credential-free" | DEC-002 |
| REQ-003 | The revoked-token e2e covers the scripted AGY runtime (mandatory) and Codex and Claude (live, under their gates). | BEH-001 | Must | Task "Done when" | Task |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Precondition / Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001…003 | BEH-001, SCN-001 | Scripted AGY run; the remote server revokes the token; the agent calls the tool | The turn completes (no `ERROR`); the agent's tool result contains `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`; the wire has no token value | — | `mcp-http-auth-agent-tool-call.e2e.test.ts` revoked case on AGY (`RUN_AGY_FAILURE_E2E=1`), from `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts` (fails on base) |
| AC-002 | REQ-001, REQ-002 | BEH-001 | Live Codex and Claude runs (gates `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, signed-in CLIs) | Same: the agent's output or tool result carries the HTTP reason; no token value | If a gate cannot run on the machine, the result is recorded as not run, with the reason (not a pass) | Same e2e, Codex and Claude revoked cases |
| AC-003 | REQ-001 | BEH-001 | Unit: the registry tool throws; the tool is gone at call time; the tool returns a normal or `isError` result | `isError` result with the message; `isError` result with the "no longer available" message; results unchanged | — | Server unit test for the adapter |
| AC-004 | — | BEH-001, BEH-002 | Existing suites | Agent Tools MCP unit tests, the other providers, native revoked case (when its gate runs) unchanged | — | Existing tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Agent on an external runtime | Use a configured MCP tool | Agent tool call via `autobyteus_agent_tools` | Server configured with a token, later revoked (or any tool failure) | call → connect fails → failure | Agent reads the reason | — | Supported Normal Scenario | autobyteus-223 SCN-003; SD-01 | all |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-001, AC-002 | Security | No token or header value on the agent wire | All covered runtimes | e2e asserts `not.toContain(DUMMY)` |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| MCP `tools/call` result with `isError` | Clients present it to the model as a tool error | MCP specification (tool execution errors are reported in the result, protocol errors as JSON-RPC errors); scripted AGY uses `@modelcontextprotocol/client` | Each runtime's own presentation is its own |

## Supplemental Artifacts

| Artifact | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts` | Reproduction | AC-001 | Current | Evidence only |

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where to turn the failure into a result: the configured-MCP adapter, or the dispatcher for every adapter? | Blast radius | Browser and media adapters already catch and return `isError` results in the adapter (E-03); the dispatcher's catch also covers platform tools | In the configured-MCP adapter, like its siblings. The dispatcher keeps `Internal error` for unexpected platform failures, which this Task does not cover. | Solution Designer | Decided |
| DEC-002 | How to make the text credential-free | Security | The text is the existing message the native runtime shows. The autobyteus-179/223 contract keeps tokens and header values out of it (e2e-asserted). The MCP client SDK's HTTP transport messages contain no URL or headers (E-06). | Use the message as is, with no new redaction layer (DESIGN.md: no speculative machinery). Assert "no token on the wire" in every runtime case. Text that a remote server puts in its own response body is outside our control, as it is for the native runtime (R-01). | Solution Designer | Decided |
| DEC-003 | Also the "no longer available for this session" race? | Consistency | Adapter throws it today (`configured-mcp-registry-tool-adapter.ts:39-41`) | Yes: one rule for the adapter, so a failed configured call never reads `Internal error`. The text names only the tool. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001…003 | SCN-001 | SD-01, SD-02 |
| REQ-002 | UC-001 | BEH-002, BEH-003 | AC-001, AC-002 | SCN-001 | E-06 |
| REQ-003 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario: SCN-001. Preserve the protocol answers and the native path.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none
