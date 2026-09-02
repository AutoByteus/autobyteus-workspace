# Requirements Document

## Document Status

- Status: `Approved`
- Current requirements revision ID: `RER-002`
- Request / ticket: `HRPC-2026-09-01` — Handoff-rule prompt clarity
- Requirements owner: Requirements Engineer
- Date: 2026-09-02
- Approval state and reference: Approved by the user on 2026-09-02 after confirming the final single-recipient sentence and requesting work to start.

## Problem And Desired Outcome

- Problem: The fixed `AgentTeam Collaboration` instruction tells an Agent to "apply every matching rule" and notify each returned destination. This wrongly suggests fan-out to multiple owners, while a completion or blocker handoff is intended for one recipient selected by the single rule that most specifically applies to the Agent's actual outcome.
- Affected actors or systems: Team-bound Agents across AutoByteus, Codex App Server, and Claude Agent SDK prompt composition; users and downstream owners receiving rule-based handoffs.
- Desired outcome: Replace the multi-recipient instruction with the approved single-recipient wording while preserving the configured handoff-rule tool contract.
- Observable definition of success: A Team-bound Agent is told to select the single most specifically applicable rule, notify only that rule's recipient, never notify additional recipients for the same outcome, and finish normally when no rule applies.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Every Team-bound Agent receives a fixed `Rule-Based Handoffs` block saying to apply every matching rule, notify each returned address, combine same-recipient reasons, and follow distinct recipients in order. | On completion or blocker routing, evaluate returned rules against the actual outcome, select the single rule whose `when` condition most specifically applies, and notify only that rule's recipient. Never notify additional recipients for the same outcome. | Call `get_handoff_rules` at completion/blocker routing time; use the selected rule's exact returned canonical address; use `send_message_to`; finish normally when no rule applies; claim success only after tool confirmation. | `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:119-128`; renderer and docs listed in investigation notes. |
| BEH-002 | Contract | SCN-001 | `get_handoff_rules` returns the caller's ordered possible outgoing rules as `{when, recipient_address}` entries; it does not evaluate conditions. | Preserve the result shape and the Agent-side condition-evaluation boundary. | Read-only, no-argument tool contract; canonical destination per entry; ordered output; empty list when no outgoing rules exist. | `autobyteus-server-ts/src/agent-communication/services/get-handoff-rules-service.ts`; `docs/modules/agent_communication.md:80-99`. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Team-bound Agent | Route its completed or blocked outcome correctly. | Select one most specifically applicable rule and notify exactly one recipient. | The Agent, not the tool, evaluates the natural-language `when` conditions. |
| Configured handoff recipient | Receive outcomes it owns. | Receive a handoff only when its rule is the single most specifically applicable rule. | Canonical recipient addresses and delivery confirmation remain authoritative. |
| Team author | Configure possible outgoing handoff guidance. | Have conditions route one outcome to one recipient. | This task does not redesign team configuration or rule compilation. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Replace the fixed `AgentTeam Collaboration` rule-based handoff wording used for every Team-bound Agent with the approved single-recipient wording.
- `UC-002`: Update prompt-contract verification and directly affected durable documentation to the approved wording.

### Out Of Scope

- Changing the `get_handoff_rules` input/output schema, handoff compilation, canonical addressing, message delivery, task delegation, or task lifecycle.
- Adding backend rule evaluation, priority metadata, or a new rule language.
- Changing team-specific `agent.md`, `team.md`, or `team-config.json` content solely to compensate for the fixed prompt.
- Product Design & Prototyping work; this is non-UI runtime instruction content.

### Non-Goals

- Guaranteeing that an LLM will never misclassify an ambiguous natural-language condition.
- Redesigning unrelated collaboration instructions.
- Treating returned order as a new priority contract; rule selection is based on the condition that most specifically applies to the actual outcome.

### Preserved Behavior Boundary

- Preserve BEH-002 and the non-fan-out invariants recorded in BEH-001.
- The only intended routing-semantics change is from multi-recipient fan-out to one most specifically applicable rule and one recipient per completion or blocker outcome.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- A scope-changing routing, schema, persistence, security, or lifecycle proposal is a `Requirement Gap` and requires explicit user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The fixed Team collaboration instruction must not tell an Agent to notify every matching or plausibly matching owner. | BEH-001 | Must | Directly addresses the reported confusion and unwanted fan-out. | User request, 2026-09-01 and clarification, 2026-09-02. |
| REQ-002 | The instruction must make the Agent evaluate returned rules against its actual completed or blocked outcome. | BEH-001, BEH-002 | Must | `get_handoff_rules` returns possible conditions and performs no matching. | Current tool contract evidence. |
| REQ-003 | The final normative replacement paragraph must be exactly: "When you finish your own work or are blocked, call `get_handoff_rules`. Evaluate the returned rules against your outcome. Select the single rule whose `when` condition most specifically applies, and notify only its `recipient_address` using `send_message_to`. Do not notify additional recipients for the same outcome. If no rule applies, finish normally." | BEH-001 | Must | Captures the user-approved single-recipient behavior without making rule order an implicit priority system. | User approval, 2026-09-02; DEC-001. |
| REQ-004 | Existing tool/result shapes, canonical-address requirements, no-rule completion behavior, and delivery-confirmation behavior must remain unchanged. | BEH-001, BEH-002 | Must | Keeps the change bounded to prompt semantics. | Current contract and renderer. |
| REQ-005 | The approved fixed wording must remain identical across the shared AutoByteus, Codex App Server, and Claude Agent SDK Team-member prompt path and must be protected by focused tests. | BEH-001 | Should | The current renderer intentionally shares one instruction constant across providers. | Renderer/provider parity tests. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001, BEH-002 / SCN-001 | A Team-bound Agent prompt is rendered. | The `Rule-Based Handoffs` block contains the exact REQ-003 paragraph and contains no "apply every matching rule," distinct-recipient fan-out instruction, or equivalent mandate. | A standalone Agent still receives no AgentTeam collaboration block. | Inspect the rendered prompt and focused exact prompt-contract tests. |
| AC-002 | REQ-003 | BEH-001 / SCN-001 | The Agent finishes its work or is blocked and more than one possible outgoing rule is returned. | The instruction requires selection of the single rule whose condition most specifically applies and notification of only its one recipient. | The Agent is explicitly told not to notify additional recipients for the same outcome; if none applies, it finishes normally. | Exact semantic assertions and a focused scenario-level prompt/test fixture. |
| AC-003 | REQ-004 | BEH-001, BEH-002 / SCN-001 | The wording change is applied. | `get_handoff_rules` still returns ordered `{when, recipient_address}` entries; exact addresses, no-rule behavior, and delivery confirmation remain intact. | No tool-schema, handoff compiler, persistence, or delivery behavior changes occur. | Existing tool unit tests plus focused no-regression checks. |
| AC-004 | REQ-005 | BEH-001 / SCN-001 | Provider-shared and native Team prompts are composed. | All supported Team-member runtime prompt paths contain the same approved collaboration instruction once. | Standalone prompts remain unaffected. | Provider-parity and prompt-contract test suites. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Team-bound Agent and configured Team handoff contract | Route a completed or blocked outcome to one correct next owner. | Agent completes its owned stage or reaches a blocker and calls `get_handoff_rules`. | The Agent has an active Team collaboration context and zero or more configured outgoing rules. | Tool returns possible `{when, recipient_address}` entries; Agent evaluates them against the actual outcome; Agent selects the single rule whose condition most specifically applies; Agent sends one confirmed handoff to only that rule's recipient; if none applies, the Agent finishes. | At most one recipient is notified for the outcome. | Empty outgoing list or no applicable condition results in normal finish; failed delivery is not claimed as successful; additional recipients are not notified for the same outcome. | Supported Normal Scenario | Current Team collaboration prompt, tool service, docs, and explicit user clarification/approval on 2026-09-02. | REQ-001–REQ-005 / AC-001–AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product prototype ticket record and folder (externally owned): N/A — not applicable
- Prototype revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Explicitly unresolved product decisions: N/A — not applicable

## Quality And Non-Functional Requirements

| Quality ID | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Compatibility | The wording change must not alter collaboration tool schemas or standalone-Agent prompts. | All supported runtimes. | Focused unit/parity tests. |
| QR-002 | Reliability | The prompt must authorize at most one recipient per completed or blocked outcome. | Multiple possible outgoing handoff entries. | Exact prompt assertion and scenario coverage. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: Existing Team definitions, compiled handoffs, and run history.
- Loss, reset, rebuild, or regeneration that is acceptable: N/A.
- Retention, privacy, compliance, volume, downtime, or operational constraints: N/A.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Shared Team-member prompt composition | The collaboration block is common to AutoByteus, Codex App Server, and Claude Agent SDK Team members. | `member-collaboration-instruction-renderer.ts`; prompt engineering docs; parity tests. | Exact prompt hash must be intentionally updated. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity/tickets/in-progress/handoff-rule-prompt-clarity/investigation-notes.md` | Canonical evidence base. | All | Current | Approved with requirements package. |
| `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity/tickets/in-progress/handoff-rule-prompt-clarity/requirements-revision-record.md` | Requirements-round history. | All | Current | Approved with requirements package. |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The reported problem is caused by the fixed platform prompt rather than a team-specific instruction. | The exact disputed semantics appear in the fixed shared constant. | Confirmed by code search and renderer tracing. | Confirmed |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What rule-selection behavior should replace multi-recipient fan-out? | Determines the authoritative prompt semantics. | Select the single rule whose `when` condition most specifically applies; notify only its recipient; do not make returned order a new priority contract. | User | Resolved and approved, 2026-09-02 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001 | AC-001 | SCN-001 | Investigation notes; user clarification |
| REQ-002 | BEH-001, BEH-002 | AC-001, AC-003 | SCN-001 | Investigation notes |
| REQ-003 | BEH-001 | AC-001, AC-002 | SCN-001 | DEC-001; user approval |
| REQ-004 | BEH-001, BEH-002 | AC-003 | SCN-001 | Investigation notes |
| REQ-005 | BEH-001 | AC-004 | SCN-001 | Investigation notes |

## Downstream Architecture Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001.
- Product and system constraints architecture must preserve: Shared provider instruction parity; unchanged handoff tool and delivery contracts; one recipient per outcome.
- Decisions intentionally deferred to architecture design: None.
- Technical facts architecture should verify: Exact shared constant, renderer use, prompt hash pin, provider parity, directly affected docs.
- Known feasibility or integration risks: A text-only change alters LLM routing guidance; validation must include the exact approved paragraph and absence of the old fan-out instructions.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes` — 2026-09-02
- Requirements package ready for downstream route: `Yes`
- Remaining blocker: None.

## Architecture Design Routing Assessment

- Assessment status: `Complete`
- Assessment owner and date: Requirements Engineer, 2026-09-02
- Preliminary task size: `Small`
- Preliminary architectural risk: `Low`
- Structural surfaces reviewed: Shared collaboration instruction constant, Team-member instruction renderer, provider prompt composition parity, prompt-contract tests, durable prompt documentation.
- Payload/content surfaces reviewed: Exact fixed prompt paragraph, semantic test assertions, pinned prompt hash, documentation wording.
- Structural-impact triggers: `None`
- Evidence paths: `/home/autobyteus/workspace/.codex/worktrees/handoff-rule-prompt-clarity/tickets/in-progress/handoff-rule-prompt-clarity/investigation-notes.md` and the source/test/doc paths recorded there.
- Decision rationale: The approved change replaces fixed prompt content and directly affected verification/documentation within existing shared surfaces. It changes no API/external contract, persistence schema/invariant, security/privacy boundary, concurrency/lifecycle behavior, deployment topology, subsystem ownership, migration, architectural pattern, or structural code organization.
- Selected route: `Implementation Engineer`
- Outcome classification: `Approved Direct-Implementation`
- Direct-route conditions all satisfied: `Yes`
- Architecture design, review, and design-revision artifacts: `N/A — not applicable`
- Downstream re-entry trigger: Implementation must return `Design Impact` if evidence shows the approved wording cannot be delivered through existing shared prompt surfaces without a structural change, or `Requirement Gap` if a new routing policy is proposed.
