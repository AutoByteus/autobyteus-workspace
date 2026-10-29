# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `claude-anthropic-effort-control` (Project Task `autobyteus-8`)
- Request / ticket: Investigate and fix the missing thinking-effort control for Claude Opus 5.5 on the AutoByteus runtime (autobyteus-ts).
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-29
- Approved by and reference: `User`, in the Solution Designer conversation on 2026-10-29: after the evidence summary and the proposal "effort is its own setting for every Claude model; with thinking off, low/medium/high are offered, xhigh/max are not sent", the user said: "Yeah, since you already did the investigation, go ahead. Then I think the requirement is quite clear." The user had earlier directed in the same conversation: "Whatever the model supports, we should support" and "remove all models below 5 … they are obsolete … remove them now."
- Exact approved requirements baseline / solution revision: this document at `SR-001`.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: On the AutoByteus runtime, no Claude model offers Anthropic's effort control. For `claude-opus-5-5`, Agent Configuration shows "Thinking: Not available for this model" and only a "Thinking display" row, although Opus 5.5 supports five effort levels and effort is its main control for how much it reasons (adaptive thinking cannot be turned off on it). Our catalog never declared an effort parameter (deliberately a non-goal in earlier tickets) and the Anthropic adapter never sends `output_config.effort`. Separately, the user wants the obsolete Claude models below generation 5 (Opus 4.8, Opus 4.7, Sonnet 4.6) removed from the AutoByteus runtime catalog.
- Affected actors or systems: users configuring AutoByteus-runtime agents/runs on Claude models (Agent Configuration, chat composer, run settings); the autobyteus-ts Anthropic adapter; the web thinking menu shared with the Claude Agent SDK runtime's Claude schema.
- Desired outcome: every Claude model in the AutoByteus catalog offers effort with its own supported levels; the chosen effort is sent to Anthropic; the Opus 5.5 Thinking row offers effort instead of "Not available"; Claude rows below generation 5 are gone.
- Observable definition of success: in the run's Agent Configuration on `claude-opus-5-5` (AutoByteus runtime) the Thinking row offers Low/Medium/High/Xhigh/Max with Medium as default, and a run with "Max" sends `output_config: { effort: "max" }`; the model list no longer contains `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Opus 5.5 config schema has only `thinking_display`; web Thinking row reads "Not available for this model". | Opus 5.5 offers effort levels low, medium, high, xhigh, max (default medium) as its Thinking control. | "Thinking display" (omitted/summarized) still offered; adaptive thinking always sent; no thinking off. | investigation-notes SRC-003, SRC-006, SRC-010 |
| BEH-002 | User | SCN-002 | Claude rows with a thinking switch (Opus 5, Fable 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) offer only thinking on/off and display; no effort. Fable 5.1 offers no settings at all. | Each of these rows also offers effort with all five levels (default high; Haiku 5.5 medium). Fable 5.1 offers effort (default high). | Thinking switch meaning and per-model off shape unchanged (Sonnet 5.5 `between_tools`, Haiku 5.5/Sonnet 5 `disabled`, Opus 5/Fable 5 nothing sent). | SRC-003, SRC-004, SRC-008 |
| BEH-003 | System | SCN-001, SCN-002 | The adapter never sends `output_config.effort`; an unknown extra param `reasoning_effort` would be forwarded raw. | When a config carries an effort level the model supports, the request carries `output_config.effort` with that level; with no effort configured nothing is sent (model default applies). | Requests without an effort setting are byte-identical in effort terms to today (no `output_config.effort`). | SRC-004, PRB-001 |
| BEH-004 | User / System | SCN-003 | N/A (no effort today). | Effort is a setting separate from the thinking switch: with thinking on every supported level is available; with thinking off, low/medium/high stay available, xhigh and max are never sent with thinking off. | — | SRC-008, PRB-002 |
| BEH-005 | User / Operational | SCN-004 | Catalog lists `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` (Sonnet 4.6 on a fixed-budget thinking mode). | These three rows are removed from the AutoByteus runtime catalog together with code that only they used. | Generation-5 rows unchanged apart from effort; saved configs naming a removed model fall into the existing unavailable-model handling. | SRC-003, SRC-011, SRC-012 |
| BEH-006 | User | SCN-002 | Claude Agent SDK runtime Claude schemas (`thinking_enabled` + `reasoning_effort`) render in the shared web menu as one list "Off · Low · … · Max" where picking a level turns thinking on. | The shared Claude thinking presentation follows BEH-004 for every Claude schema with a thinking switch, including the Claude Agent SDK runtime's. | Claude Agent SDK backend request mapping unchanged. | SRC-009, SRC-013 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User configuring an agent/run | Control cost/latency vs. depth on Claude models | Effort selectable per run/definition on every Claude model | Must never produce a configuration Anthropic rejects through normal UI use |
| Anthropic Messages API | Contract owner | Receives `output_config.effort` only with supported values/combinations | Rejects invalid levels and xhigh/max with thinking disabled (measured) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Choose an effort level for an AutoByteus-runtime run/definition on any Claude catalog model and have it sent to Anthropic | SCN-001, SCN-002, SCN-003 |
| UC-002 | See and change effort in the shared Claude thinking presentation (composer thinking menu, run settings Thinking row, Agent Configuration form) | SCN-001, SCN-002, SCN-003 |
| UC-003 | Remove obsolete Claude rows below generation 5 from the AutoByteus runtime catalog | SCN-004 |

### Out Of Scope

- Per-message (mid-conversation) effort (`mid-conversation-output-config` beta).
- Task budgets beta, fast mode, `display: "updates"` beta.
- Changing any model's thinking-off request shape (e.g. making Opus 5 "Off" send `disabled`), or the Fable 5 toggle semantics (recorded as follow-up FU-001).
- Claude Agent SDK runtime backend request mapping and its dynamic model discovery.
- Non-Anthropic providers and any non-Claude model removal.
- Bedrock/Vertex/Foundry routing.

### Non-Goals

- No automatic effort recommendation per workload; defaults equal Anthropic's API defaults.

### Preserved Behavior Boundary

- BEH-001..BEH-003 preserved columns; REQ-008; AC-008, AC-009.
- Invariant: a configuration without an effort setting produces the same Anthropic request as before this change.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every Claude model in the AutoByteus catalog exposes an effort setting whose levels are exactly the levels Anthropic documents for that model: `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-haiku-5-5` → low, medium, high, xhigh, max. | BEH-001, BEH-002 | Must | User: "whatever the model supports, we should support". | Anthropic effort doc (SRC-001); PRB-001 measured all five on Opus 5.5 | User direction; DEC-001 |
| REQ-002 | The effort setting's default equals the model's API default: medium for Opus 5.5 and Haiku 5.5, high for the others. | BEH-001, BEH-002 | Must | A default that differs from the API would mislabel what is sent when nothing is chosen. | SRC-001 | DEC-002 |
| REQ-003 | When a run's config holds a supported effort level, the Anthropic request carries `output_config.effort` with that level; when no effort is configured, no effort is sent. | BEH-003 | Must | The configured value must reach the provider; unset keeps current behavior. | PRB-001 | — |
| REQ-004 | Effort is independent of the thinking switch: changing low/medium/high does not change the thinking state, and turning thinking on/off does not change low/medium/high. | BEH-004, BEH-006 | Must | Effort affects all output, with or without thinking (SRC-001). | PRB-002 (Sonnet 4.6/5.5 accepted effort ≤ high with thinking off/variants) | User approval; DEC-003 |
| REQ-005 | Xhigh and max are never sent with thinking off: choosing xhigh or max while thinking is off turns thinking on; turning thinking off while xhigh or max is chosen sets effort to high; a config that still combines thinking off with xhigh/max (e.g. saved via API) fails locally with a clear message instead of reaching Anthropic. | BEH-004 | Must | Anthropic rejects these combinations on Sonnet 5.5, Haiku 5.5 and Opus 5 (SRC-008, PRB-002). | PRB-002 measured the 400 | DEC-004 |
| REQ-006 | Opus 5.5's Thinking row in run settings / Agent Configuration offers the effort levels (not "Not available for this model"); Fable 5.1 likewise gains a Thinking row with effort. | BEH-001, BEH-002 | Must | Task "Done when": selectable in the run's Agent Configuration. | SRC-010 (menu derivation) | — |
| REQ-007 | `claude-opus-4.8` (`claude-opus-4-8`), `claude-opus-4.7` (`claude-opus-4-7`) and `claude-sonnet-4.6` (`claude-sonnet-4-6`) are removed from the AutoByteus runtime catalog, and code, docs and tests that exist only for them are removed (including the fixed-budget thinking mode and its `thinking_budget_tokens` setting). | BEH-005 | Must | User decision 2026-10-29: obsolete. | N/A | User |
| REQ-008 | Existing behavior is preserved for configs without effort: thinking switch, per-model off shapes, display, sampling stripping, forced-tool-choice rejection and prompt-caching behavior are unchanged. | BEH-001..BEH-003 | Must | Guardrail. | N/A | — |
| REQ-009 | The shared web Claude thinking presentation (schemas with `thinking_enabled`) applies REQ-004/REQ-005 for every runtime that uses it, including the Claude Agent SDK runtime. | BEH-006 | Should | One concept, one presentation; prevents the same rejected combination there. | SRC-013 | DEC-005 |

## Acceptance Criteria

| AC ID | Related REQ IDs | Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, BEH-002 | AutoByteus model catalog listed (GraphQL/LLMFactory) | Each listed Claude model's config schema contains `reasoning_effort` enum [low, medium, high, xhigh, max] with default medium (Opus 5.5, Haiku 5.5) or high (others). | — | Catalog unit/integration test |
| AC-002 | REQ-003 | BEH-003, SCN-001 | Opus 5.5 with `reasoning_effort: "max"` | Captured request has `output_config: { effort: "max" }` plus adaptive thinking. | Config without `reasoning_effort`: request has no `output_config.effort`. | Adapter unit test; live provider check |
| AC-003 | REQ-003, REQ-004 | BEH-003, BEH-004 | Sonnet 5.5 `thinking_enabled:false, reasoning_effort:"low"` | Request has `thinking:{type:"between_tools"}` and `output_config.effort:"low"`; accepted by Anthropic. | — | Adapter unit test; live check |
| AC-004 | REQ-005 | BEH-004, SCN-003 | Config `thinking_enabled:false, reasoning_effort:"max"` on a model with a thinking switch | Adapter fails locally before the SDK call with a message naming the conflict; nothing is sent. | — | Adapter unit test |
| AC-005 | REQ-004, REQ-005, REQ-009 | BEH-004, BEH-006, SCN-003 | Web thinking menu for a Claude schema with switch + effort | Menu offers thinking Off/On and a separate effort group; picking Low while Off keeps Off; picking Max while Off turns thinking on; turning Off with Max selected sets High. | — | Web unit tests (adapter + menu) |
| AC-006 | REQ-006 | BEH-001, SCN-001 | Run settings card / Agent Configuration on `claude-opus-5-5`, AutoByteus runtime | Thinking row shows the effort menu with Medium checked by default; "Not available for this model" is not shown; Thinking display row remains. | — | Web unit test; browser probe of the run settings |
| AC-007 | REQ-007 | BEH-005, SCN-004 | Model catalog / model menu | `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` are not listed; repository search outside archived tickets finds no built-in support references. | A saved config naming a removed model shows the existing unavailable-model state, not a crash. | Catalog test; grep audit; existing unavailable-model test |
| AC-008 | REQ-008 | BEH-002, BEH-003 | Existing configs without `reasoning_effort` on each Claude model | Requests identical to pre-change (thinking shape, display, no effort). | — | Existing adapter tests stay green |
| AC-009 | REQ-001, REQ-003 | BEH-002 | One live request per remaining Claude model with an explicit effort | Anthropic accepts each (no 400). | A model refusing is a finding. | Gated live provider test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run Opus 5.5 at a chosen effort | Agent Configuration / run settings / composer thinking menu | AutoByteus runtime, `claude-opus-5-5` selected | Open Thinking, pick Max, send message | Request carries effort max; response produced | — | Supported Normal Scenario | User screenshot; SRC-010 | REQ-001..003, REQ-006; AC-001, AC-002, AC-006 |
| SCN-002 | User | User | Set effort on another Claude model | same surfaces | e.g. `claude-sonnet-5-5` | Pick effort level, optionally toggle thinking | Effort sent with the chosen thinking state | — | Supported Normal Scenario | SRC-001 | REQ-001..004, REQ-009; AC-001, AC-003, AC-005 |
| SCN-003 | User | User | Combine thinking off with an effort | same surfaces | Model with thinking switch | Turn thinking Off, pick Low (stays Off) or Max (thinking turns On) | Only accepted combinations are sent | Saved off+max config via API → local error | Supported Explicit Edge Scenario (Anthropic contract restricts it) | SRC-008, PRB-002 | REQ-004, REQ-005; AC-004, AC-005 |
| SCN-004 | Operational | Maintainer / user | Catalog only lists current Claude models | Model menu | — | Open model menu | No gen-4 Claude rows | Saved config on a removed model → unavailable-model state | Supported Normal Scenario | User decision | REQ-007; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing schema-driven controls; no Product Design requested)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: Claude schema with switch → thinking menu shows Off/On, then the effort group (labels from the schema: "Reasoning effort", levels Low · Medium · High · Xhigh · Max), then Thinking display; trigger summary shows the thinking state and the effective effort (e.g. "On · High", "Off · Low"). Claude schema without switch (Opus 5.5, Fable 5.1) → existing per-parameter menu with the effort levels; trigger shows the effective level. (DEC-006)
- Explicitly illustrative content or permitted variation: exact separator/visual styling of the summary may follow existing menu conventions.
- Required states: thinking Off with effort low/medium/high; thinking On with any level; unset effort shows the model default checked.
- Product decisions that need the user: none open.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, AC-004 | Reliability | No normal-UI path produces an Anthropic 400 from an effort/thinking combination | All Claude catalog models | Unit tests + live check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (saved agent definitions / run configs may name a removed model or hold `thinking_budget_tokens`).
- Data that must be preserved: saved definitions and runs stay readable; history and token-usage rows (with captured price snapshots) unchanged.
- Acceptable: a saved definition naming a removed model must be re-pointed by the user to a current model (existing unavailable-model state); a stored `thinking_budget_tokens` value is no longer meaningful.
- Constraints: no startup lockout (DESIGN.md rule 7).
- Unknowns: none material; architecture confirms the reader behavior.

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Anthropic Messages API `output_config.effort` | Values low/medium/high/xhigh/max; per-model availability and defaults; xhigh/max rejected with thinking disabled/between_tools on Sonnet 5.5, Haiku 5.5, Opus 5 | SRC-001, SRC-008, PRB-001, PRB-002 | Anthropic may change levels; catalog is the single place to update |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Remaining models not probed live (Fable 5.1, Fable 5, Opus 5, Sonnet 5, Haiku 5.5) accept their documented levels | Docs say so | AC-009 live check | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which Claude models get effort? | Scope | All catalog models support effort (SRC-001) | All remaining catalog Claude models, each with its documented levels. | User ("whatever the model supports") | Decided |
| DEC-002 | Default level | Visible default must match what is sent when unset | API defaults per model | Use the API default so "unset" and "default" mean the same; Anthropic documents explicit default == omitted. | Solution Designer | Decided |
| DEC-003 | Is effort coupled to the thinking switch? | Coupling loses effort-with-thinking-off | Effort applies to all output (SRC-001); Claude SDK UI couples them today | Independent setting; user approved. | User | Decided |
| DEC-004 | How to avoid the xhigh/max + thinking-off rejection | Must not produce 400s | Per-model rules differ (Opus 5/Fable 5 send nothing when off; Sonnet 5 docs show no restriction), measured 400 on Sonnet 5.5 | One uniform rule for every Claude model with a switch: xhigh/max need thinking on (pick → turns on; turn off → becomes high; stale saved combo → local error). Simple, predictable, and never wrong; costs only the odd "off + extra-high" combo on three models. | Solution Designer | Decided |
| DEC-005 | Apply the new presentation to Claude Agent SDK runtime schemas too? | Shared web owner; same concept | Same keys; SDK backend already sends effort independently of thinking | Yes — one presentation per concept, and it prevents the same rejected combo there. | Solution Designer (consistency across similar surfaces) | Decided |
| DEC-006 | Trigger summary wording | Visible label | Existing pattern shows one value | Show thinking state and effort ("On · High") for switch schemas; keep single level for no-switch schemas. | Solution Designer | Decided |
| DEC-007 | Remove gen-4 Claude rows | Scope | User request | Remove Opus 4.8, Opus 4.7, Sonnet 4.6 and their only-used code. | User | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-009 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-001 | SCN-001, SCN-002 |
| REQ-003 | UC-001 | BEH-003 | AC-002, AC-003, AC-009 | SCN-001, SCN-002 |
| REQ-004 | UC-001, UC-002 | BEH-004 | AC-003, AC-005 | SCN-003 |
| REQ-005 | UC-001, UC-002 | BEH-004 | AC-004, AC-005 | SCN-003 |
| REQ-006 | UC-002 | BEH-001, BEH-002 | AC-006 | SCN-001 |
| REQ-007 | UC-003 | BEH-005 | AC-007 | SCN-004 |
| REQ-008 | UC-001 | BEH-001..003 | AC-008 | SCN-001, SCN-002 |
| REQ-009 | UC-002 | BEH-006 | AC-005 | SCN-002, SCN-003 |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-004.
- Constraints: Anthropic contract (SRC-001, SRC-008); preserved request shapes (REQ-008); no startup lockout.
- Deferred to architecture: config key name; where the per-model effort facts live; how the web adapter expresses the independent effort group and the xhigh/max rule; local-error placement; removal inventory.
- Technical facts to verify: server schema validation flow; unavailable-model handling for removed IDs; dead code after Sonnet 4.6 removal.
- Risks: shared web presentation also changes the Claude Agent SDK runtime UI (accepted, DEC-005).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (User, 2026-10-29)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
