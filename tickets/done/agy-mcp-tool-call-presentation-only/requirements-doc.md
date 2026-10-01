# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `agy-mcp-tool-call-presentation-only`
- Parent ticket / inherited history: `agy-mcp-tool-call-presentation`; SR-001..005 and specialist reports are historical parent-ticket context. SR-006 establishes this new original-only release ticket.
- Request / ticket: Show the real MCP tool name and arguments for Antigravity runs instead of `call_mcp_tool`
- Requirements owner: Solution Designer
- Date: 2026-10-01
- Approval state and reference: Approved by the user in conversation on 2026-09-30 ("I agree, for the old history runs, leave them alone. No need to update."), accepting the Solution Designer's stated suggestions for DEC-001..005
- Exact approved requirements baseline / solution revision: SR-006 reinstates SR-002 behavior and decisions, with the scope separation below explicitly approved on 2026-10-01. See `user-original-scope-approval-20261001.md` for the exact user statement and proposal accepted.
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: In Antigravity (AGY) runs every MCP tool call appears in the Activity panel and conversation as the generic `call_mcp_tool`, with the real tool name and arguments buried inside a wrapper (`ServerName`, `ToolName`, `Arguments`). The user cannot see at a glance which tool ran. Other runtimes show the real tool (for example `send_message_to`).
- Affected actors or systems: Users observing AGY runs (standalone, Team and Org members); server consumers of tool events.
- Desired outcome: An AGY MCP tool call is presented as the tool that was actually called, with that tool's own arguments.
- Observable definition of success: For the screenshot case, the Activity item is titled `delegate_task` and its Arguments section shows `{description, recipient_address}` only.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | AutoByteus agent tools called by AGY show as `call_mcp_tool` with wrapper arguments | Shown under the tool's canonical name (e.g. `delegate_task`, `send_message_to`) with the tool's own arguments | Status, timing, invocation identity and result content | Investigation notes BEH-001 |
| BEH-002 | System | SCN-002 | Tools on other MCP servers show as `call_mcp_tool` | Shown under a name identifying the server and tool (format per DEC-002) with the tool's own arguments | Same as BEH-001 | Investigation notes BEH-002 |
| BEH-003 | System | SCN-001 | AGY native tools show under their native names | Unchanged | Entire behavior | Investigation notes BEH-003 |
| BEH-004 | System | SCN-003 | A failed MCP call shows as a failed `call_mcp_tool` | Failure is shown under the real tool name with the real arguments | Failed/denied classification and error text | Investigation notes BEH-004 |
| BEH-005 | System | SCN-001 | Only AGY's native `generate_image` triggers native image path resolution | Unchanged: an MCP tool that happens to be named `generate_image` is never treated as AGY's native image tool | Entire behavior | Investigation notes BEH-005 |
| BEH-006 | User | SCN-004 | Stored AGY runs replay the stored tool name | Runs recorded before this change keep showing `call_mcp_tool` (DEC-004) | Stored runs remain readable | Investigation notes BEH-006 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User observing an AGY run | Understand what the agent did | Real tool name and arguments visible without expanding a wrapper | Same look as other runtimes for AutoByteus tools |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Presenting an AGY call to an AutoByteus agent tool | SCN-001, SCN-003 |
| UC-002 | Presenting an AGY call to a tool on another MCP server | SCN-002, SCN-003 |
| UC-003 | Presenting an AGY MCP call whose wrapper is incomplete | SCN-003 |

### Out Of Scope

- SR-005's additional Team history preflight and migration retry/frozen-classifier changes; broad server test-failure repairs; collaborator host-composition recovery API-F001. Preserve these separately, without shipping or silently deleting them.
- REQ-008..011, AC-009..014, BEH-007..010, SCN-005..007 and UC-004..006 are **deferred/excluded from this release**, not renumbered or declared satisfied. Historical authorities remain in `recovery-evidence/scope-reset-sr006/pre-sr006-requirements-doc.md` and cumulative SR-005 history.

- Hiding or merging the native `view_file` schema lookups AGY performs before an MCP call.
- Changing how other runtimes (Codex, Claude, Grok, AutoByteus) name or present tools.
- Rewriting already-stored runs.
- Changing how AGY is configured to reach MCP servers, or which tools it is granted.
- Frontend layout or styling of Activity items.

### Non-Goals

- Making every unrelated repository test green or treating every inherited failure as part of this ticket. Do not remove/weaken tests to hide failures. Record inherited failures and prove their separation from the AGY delta; regressions caused by this change must be resolved before release.
- Reverting changes already in latest origin/personal. The release delta is AGY-only, not a rollback of upstream product functionality.

- Guaranteeing the presentation for future AGY versions that change the undocumented wrapper shape beyond the fallback in REQ-004.

### Preserved Behavior Boundary

BEH-003, BEH-005, the preserved columns of BEH-001/002/004, and BEH-006.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | For an AGY MCP call to the AutoByteus agent tools server, every tool event for that call (start, success, failure, denial) carries the tool's canonical bare name, identical to the name shown for the same tool in other runtimes. | BEH-001, BEH-004 | Must | User request; parity with other runtimes | User request 2026-09-30 |
| REQ-002 | For every AGY MCP call whose name is presented per REQ-001 or REQ-003, the arguments presented are exactly the arguments passed to the MCP tool, without the `ServerName` / `ToolName` / `Arguments` wrapper. An empty argument set is presented as empty. | BEH-001, BEH-002, BEH-004 | Must | User request | User request 2026-09-30 |
| REQ-003 | For an AGY MCP call to any other MCP server, every tool event carries the name `mcp__<server>__<tool>`, which cannot be mistaken for an AutoByteus platform tool. | BEH-002, BEH-004 | Must | Real tool visible without colliding with platform tool semantics | DEC-001, DEC-002 |
| REQ-004 | If an AGY `call_mcp_tool` step does not provide a usable server name and tool name, the call is presented as it is today (`call_mcp_tool` with the provider's parameters) and the run continues without error. | BEH-001, BEH-002 | Must | Provider shape is undocumented | RSK-001 |
| REQ-005 | AGY native tool presentation and native image handling are unchanged; an MCP tool is never treated as an AGY native tool because of its name. AutoByteus media tools called through MCP are recognized by the platform under their canonical names, as in other runtimes (DEC-005). | BEH-003, BEH-005 | Must | Preserve existing behavior | Existing unit test |
| REQ-006 | The name and arguments of one call are the same in its start event and its terminal event. | BEH-001, BEH-002, BEH-004 | Must | One Activity item per call, no relabelling mid-call | Investigation (both steps carry full parameters) |
| REQ-007 | The result of an unwrapped AGY MCP call keeps today's `{provider_state, output}` shape. When the tool's output text is a JSON object or array, `output` is presented as that structured JSON; any other output is presented unchanged. | BEH-001, BEH-002 | Must | Parity with how other runtimes present MCP results | DEC-003 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-006 | BEH-001 / SCN-001 | AGY run calls `delegate_task` on the AutoByteus agent tools server with `description` and `recipient_address` | Start and success events carry tool name `delegate_task` and arguments `{description, recipient_address}`; the Activity panel shows one item titled `delegate_task` with those arguments | — | Converter unit test; live AGY run observed in the app |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | AGY run calls `send_message_to` | Item is titled `send_message_to`, same as for a Codex or Claude run | — | Unit test; live run |
| AC-003 | REQ-002, REQ-003 | BEH-002 / SCN-002 | AGY run calls tool `echo_args` on a third-party server `shape-test` with nested arguments | Name is `mcp__shape-test__echo_args`; arguments equal the nested object the server received | — | Unit test with probe-derived fixture |
| AC-004 | REQ-002 | BEH-001 / SCN-001 | MCP call with no arguments | Arguments presented as an empty object | — | Unit test |
| AC-005 | REQ-001, REQ-002, REQ-006 | BEH-004 / SCN-003 | MCP tool returns an error | The failed (or denied) event carries the real tool name and arguments and the provider's error message | — | Unit test with probe-derived fixture |
| AC-006 | REQ-004 | SCN-003 | `call_mcp_tool` step with missing or blank `ToolName` or `ServerName` | Presented as `call_mcp_tool` with provider parameters; no exception; run continues | — | Unit test |
| AC-007 | REQ-005 | BEH-003, BEH-005 / SCN-001 | Native `view_file`, `run_command`, native `generate_image`; and an MCP tool named `generate_image` | Native items unchanged; native image path resolution runs only for the native tool | — | Existing and extended unit tests |
| AC-008 | REQ-007 | BEH-001 | Successful MCP call returning JSON object text; another returning plain text | First: `output` is the structured object; second: `output` is the unchanged text; both keep `provider_state` | — | Unit test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | AGY model in an AutoByteus-managed run | Agent uses an AutoByteus agent tool | Run with AGY runtime and agent tools enabled | Run active | Model calls the tool through AGY's MCP call; tool executes; user watches Activity | Item shows the real tool name and arguments | Native tools in the same turn are unaffected | Supported Normal Scenario | User screenshot; investigation BEH-001 | REQ-001, 002, 005, 006 / AC-001, 002, 004, 007 |
| SCN-002 | System | AGY model | Agent uses a tool from another MCP server available to AGY | AGY discovers a user/workspace-configured MCP server | Run active | Same as SCN-001 | Item shows server-qualified real tool name and arguments | — | Supported Normal Scenario (AGY reads user/workspace MCP config; scope subject to DEC-001) | Probe; prior ticket investigation | REQ-002, 003 / AC-003 |
| SCN-003 | System | MCP server / AGY provider | An MCP call fails, is denied, or arrives with an incomplete wrapper | Same as SCN-001/002 | Run active | Provider reports ERROR, or omits the tool name | Failure shown under the real name; incomplete wrapper falls back to today's presentation | — | Supported Normal Scenario (failure); Supported Explicit Edge Scenario (incomplete wrapper, RSK-001) | Probe error step | REQ-004, 006 / AC-005, 006 |
| SCN-004 | User | User | Reopen an AGY run recorded before this change | Select the run in history | Stored run exists | History replays stored events | Old items still read `call_mcp_tool` | — | Supported Normal Scenario | DEC-004 | BEH-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — no new UI; existing Activity items display different name and argument values.
- All prototype-specific fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-006 | Reliability | An unexpected wrapper shape never fails the turn | Any `call_mcp_tool` step | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — new AGY runs store the real tool name and arguments in existing fields.
- Data or state that must be preserved: Existing stored runs remain readable and unchanged.
- Loss, reset, rebuild, or regeneration that is acceptable: Old runs keep the `call_mcp_tool` presentation (DEC-004).
- Retention, privacy, compliance, volume, downtime, or operational constraints: None identified.
- Unknowns requiring downstream investigation: None for requirements.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AGY CLI stream step for `call_mcp_tool` | Provides `ServerName`, `ToolName`, `Arguments` on start and terminal steps | Probes on AGY 1.2.10 and 1.2.14 | Undocumented; RSK-001 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/` | Raw provider evidence | REQ-001..004 | Complete | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user wants server events changed (so every consumer sees the real tool), not a frontend-only relabel | Determines where names are interpreted | Confirm with approval | Confirmed by approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Are tools on non-AutoByteus MCP servers in scope? | Scope of REQ-003 | **Decided: all MCP calls are unwrapped.** | User | Resolved 2026-09-30 |
| DEC-002 | How are non-AutoByteus tools named? | A bare name like `write_file` or `generate_image` would be read by the server as a platform tool and create wrong Files entries | **Decided: `mcp__<server>__<tool>`**; AutoByteus agent tools keep bare canonical names. | User | Resolved 2026-09-30 |
| DEC-003 | Should the result presentation change? | Today the result is `{provider_state, output}` with `output` as raw text, so JSON results appear as an escaped string | **Decided: keep `{provider_state, output}`; show JSON object/array text as structured JSON in `output`.** | User | Resolved 2026-09-30 |
| DEC-004 | Should runs recorded before the change be relabelled? | Old history keeps `call_mcp_tool` | **Decided: no; old runs are left alone** (explicit user statement). | User | Resolved 2026-09-30 |
| DEC-005 | With real names, AutoByteus media tools called through MCP (`generate_image`, `edit_image`, `generate_speech`, `generate_video`) will be recognized by the server as generated-output tools, as in other runtimes, and may add entries to Files. Accept? | Visible side effect beyond the label | **Decided: accept.** | User | Resolved 2026-09-30 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-004 | AC-001, AC-002, AC-005 | SCN-001, SCN-003 | Probe |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004 | AC-001, AC-003, AC-004, AC-005 | SCN-001, SCN-002, SCN-003 | Probe |
| REQ-003 | UC-002 | BEH-002, BEH-004 | AC-003 | SCN-002 | Probe |
| REQ-004 | UC-003 | BEH-001, BEH-002 | AC-006 | SCN-003 | — |
| REQ-005 | UC-001 | BEH-003, BEH-005 | AC-007 | SCN-001 | Existing unit test |
| REQ-006 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004 | AC-001, AC-005 | SCN-001, SCN-003 | Probe |
| REQ-007 | UC-001, UC-002 | BEH-001, BEH-002 | AC-008 | SCN-001 | Probe |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-004 (after approval).
- Product and system constraints architecture must preserve: BEH-003, BEH-005, BEH-006; event schema unchanged.
- Decisions intentionally deferred to architecture design: where the unwrap lives; reuse of the shared agent-tools naming helper; whether server details are redacted from AGY payloads as in Codex.
- Technical facts architecture should verify: UNK-001; any code keyed on `call_mcp_tool`.
- Known feasibility or integration risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

## SR-006 release-candidate constraints and readiness

Approval captured before revised architecture. Latest origin/personal is the required base; only AGY production projection and directly relevant tests/docs are in the release delta. All excluded source/tests and uncommitted work remain preserved in the expanded worktree. The new isolated candidate must receive current implementation checks and API/E2E validation, including live/rendered AGY behavior, native-tool preservation, replay and old-history continuity per repository testing rules. Earlier combined or original passes are historical evidence, not acceptance of the new candidate. Delivery owns refreshed user verification and applicable finalization/release gates. No blanket full-suite pass or risk waiver is implied. No Product supplement or unresolved intended-behavior decision.
