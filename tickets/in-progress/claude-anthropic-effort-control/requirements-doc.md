# Requirements Document

## Document Status

- Status: `Approved` (SR-002; SR-001 approved basis superseded where marked)
- Current solution revision ID: `SR-003` (requirements text unchanged from SR-002 except DEC-011 and AC-012)
- Package identifier: `claude-anthropic-effort-control` (Project Task `autobyteus-8`)
- Request / ticket: Investigate and fix the missing thinking-effort control for Claude Opus 5.5 on the AutoByteus runtime (autobyteus-ts).
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-29
- Approved by and reference: SR-002 — `User`, Solution Designer conversation 2026-10-29, after the omitted-display investigation (PRB-003): "So you mean that the thinking display is only affecting whether we display it or not … If it only affects whether on the front end we display it or not, then I will not display it. It doesn't give us any help at all." (the one-list change is the user's own request). SR-001 — `User`, in the Solution Designer conversation on 2026-10-29: after the evidence summary and the proposal "effort is its own setting for every Claude model; with thinking off, low/medium/high are offered, xhigh/max are not sent", the user said: "Yeah, since you already did the investigation, go ahead. Then I think the requirement is quite clear." The user had earlier directed in the same conversation: "Whatever the model supports, we should support" and "remove all models below 5 … they are obsolete … remove them now."
- Exact approved requirements baseline / solution revision: SR-001 approved (User, 2026-10-29). SR-002 approved by the User 2026-10-29 (reference above): thinking presentation and display changed by the user while reviewing the rendered menu (reported by the implementation engineer, 2026-10-29, with the user's words: "picking an effort level already means thinking is on … show one list: Off · Low · Medium · High · Xhigh · Max"; "remove the thinking display setting … always send omitted and never show it"; display "doesn't give much benefit").
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: On the AutoByteus runtime, no Claude model offers Anthropic's effort control. For `claude-opus-5-5`, Agent Configuration shows "Thinking: Not available for this model" and only a "Thinking display" row, although Opus 5.5 supports five effort levels and effort is its main control for how much it reasons (adaptive thinking cannot be turned off on it). Our catalog never declared an effort parameter (deliberately a non-goal in earlier tickets) and the Anthropic adapter never sends `output_config.effort`. Separately, the user wants the obsolete Claude models below generation 5 (Opus 4.8, Opus 4.7, Sonnet 4.6) removed from the AutoByteus runtime catalog.
- Affected actors or systems: users configuring AutoByteus-runtime agents/runs on Claude models (Agent Configuration, chat composer, run settings); the autobyteus-ts Anthropic adapter; the web thinking menu shared with the Claude Agent SDK runtime's Claude schema.
- Desired outcome: every Claude model in the AutoByteus catalog offers effort with its own supported levels; the chosen effort is sent to Anthropic; the Opus 5.5 Thinking row offers effort instead of "Not available"; Claude rows below generation 5 are gone.
- Observable definition of success: in the run's Agent Configuration on `claude-opus-5-5` (AutoByteus runtime) the Thinking row offers Low/Medium/High/Xhigh/Max with Medium as default, and a run with "Max" sends `output_config: { effort: "max" }`; the model list no longer contains `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Opus 5.5 config schema has only `thinking_display`; web Thinking row reads "Not available for this model". | Opus 5.5's Thinking control is one list of effort levels Low · Medium · High · Xhigh · Max (default Medium). (SR-002: no Thinking display row.) | Adaptive thinking always sent; no thinking off. | investigation-notes SRC-003, SRC-006, SRC-010 |
| BEH-002 | User | SCN-002 | Claude rows with a thinking switch (Opus 5, Fable 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) offer only thinking on/off and display; no effort. Fable 5.1 offers no settings at all. | Each of these rows offers one Thinking list Off · Low · Medium · High · Xhigh · Max: Off = thinking off; a level = thinking on at that effort (default level high; Haiku 5.5 medium). Fable 5.1 offers the effort list without Off (default high). (SR-002) | Per-model off shape unchanged (Sonnet 5.5 `between_tools`, Haiku 5.5/Sonnet 5 `disabled`, Opus 5/Fable 5 nothing sent). | SRC-003, SRC-004, SRC-008 |
| BEH-003 | System | SCN-001, SCN-002 | The adapter never sends `output_config.effort`; an unknown extra param `reasoning_effort` would be forwarded raw. | When a config carries an effort level the model supports, the request carries `output_config.effort` with that level; with no effort configured nothing is sent (model default applies). | Requests without an effort setting are byte-identical in effort terms to today (no `output_config.effort`). | SRC-004, PRB-001 |
| BEH-004 | User / System | SCN-003 | N/A (no effort today). | SR-002: effort is chosen together with thinking. Off sends the model's thinking-off shape and no effort (model default effort); a level sends thinking on plus that effort. Effort is never sent with thinking off, so the xhigh/max + thinking-off rejection cannot occur. (SR-001's independent effort setting is superseded.) | — | SRC-008, PRB-002 |
| BEH-005 | User / Operational | SCN-004 | Catalog lists `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` (Sonnet 4.6 on a fixed-budget thinking mode). | These three rows are removed from the AutoByteus runtime catalog together with code that only they used. | Generation-5 rows unchanged apart from effort; saved configs naming a removed model fall into the existing unavailable-model handling. | SRC-003, SRC-011, SRC-012 |
| BEH-006 | User | SCN-002 | Claude Agent SDK runtime Claude schemas (`thinking_enabled` + `reasoning_effort`) render in the shared web menu as one list "Off · Low · … · Max" where picking a level turns thinking on. | SR-002: unchanged — the AutoByteus Claude rows now use this same existing list. | Claude Agent SDK presentation and backend unchanged. | SRC-009, SRC-013 |
| BEH-007 | User / System | SCN-001, SCN-002, SCN-005 | Claude schemas expose `thinking_display` (default omitted; Sonnet 5.5 summarized); saved runs carry `thinking_display` (user data: e.g. a `claude-opus-5-5` run and a team run hold `"thinking_display": "omitted"`). | SR-002: no Claude schema exposes a display setting and the web never shows one; requests never send `display`, so Anthropic's default `omitted` applies on every remaining model. Saved runs whose config still holds `thinking_display` keep working. | Thinking content handling otherwise unchanged. | SRC-008, SRC-019, SRC-020 |

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
| UC-004 | Remove the Claude thinking display setting (always Anthropic's default `omitted`) without breaking saved runs | SCN-005 |

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

- BEH-001..BEH-003 preserved columns; REQ-008; AC-008, AC-009, AC-011.
- Invariant: a configuration without an effort setting produces the same Anthropic thinking/effort request as before this change, except that `display` is never sent (REQ-010).

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
| REQ-004 | SR-002: on Claude rows with a thinking switch, thinking and effort are chosen in one list Off · Low · Medium · High · Xhigh · Max. Picking a level turns thinking on at that effort; Off turns thinking off. On rows without a switch (Opus 5.5, Fable 5.1) the list holds the levels only. | BEH-002, BEH-004 | Must | User: "picking an effort level already means thinking is on". | N/A | User (SR-002); DEC-003 |
| REQ-005 | SR-002: with thinking off the request carries the model's thinking-off shape and no `output_config.effort`, whatever effort value the config still holds. | BEH-004 | Must | Off means thinking off at the model's default effort; also makes the xhigh/max + thinking-off 400 impossible (PRB-002). | PRB-002 | DEC-004 |
| REQ-006 | Opus 5.5's Thinking row in run settings / Agent Configuration offers the effort levels (not "Not available for this model"); Fable 5.1 likewise gains a Thinking row with effort. | BEH-001, BEH-002 | Must | Task "Done when": selectable in the run's Agent Configuration. | SRC-010 (menu derivation) | — |
| REQ-007 | `claude-opus-4.8` (`claude-opus-4-8`), `claude-opus-4.7` (`claude-opus-4-7`) and `claude-sonnet-4.6` (`claude-sonnet-4-6`) are removed from the AutoByteus runtime catalog, and code, docs and tests that exist only for them are removed (including the fixed-budget thinking mode and its `thinking_budget_tokens` setting). | BEH-005 | Must | User decision 2026-10-29: obsolete. | N/A | User |
| REQ-008 | Existing behavior is preserved for configs without effort: thinking switch, per-model off shapes, display, sampling stripping, forced-tool-choice rejection and prompt-caching behavior are unchanged. | BEH-001..BEH-003 | Must | Guardrail. | N/A | — |
| REQ-009 | SR-002: the Claude Agent SDK runtime's thinking presentation is unchanged. | BEH-006 | Must | The AutoByteus rows adopt the existing list instead. | SRC-013 | DEC-005 |
| REQ-010 | SR-002: no Claude catalog model exposes a thinking display setting; the web shows no display control for Claude; Anthropic requests never carry `thinking.display` (Anthropic default `omitted` on every remaining model). This includes Sonnet 5.5, whose progress notes between tool calls stop being shown (they were visible only under `summarized`). | BEH-007 | Must | User: display "doesn't give much benefit"; always omitted. | SRC-008 (omitted is the default on all remaining models) | User (SR-002); DEC-008, DEC-010 |
| REQ-011 | Saved runs, definitions and launch configs whose `llmConfig` still holds `thinking_display` (or any other key a Claude schema no longer declares) keep loading, resuming and running on the AutoByteus runtime; the stale key is never sent to Anthropic. No stored data is rewritten. | BEH-007 | Must | Real user data holds `thinking_display` (SRC-019); DESIGN.md rule 7. | SRC-019 | DEC-009 |

## Acceptance Criteria

| AC ID | Related REQ IDs | Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, BEH-002 | AutoByteus model catalog listed (GraphQL/LLMFactory) | Each listed Claude model's config schema contains `reasoning_effort` enum [low, medium, high, xhigh, max] with default medium (Opus 5.5, Haiku 5.5) or high (others). | — | Catalog unit/integration test |
| AC-002 | REQ-003 | BEH-003, SCN-001 | Opus 5.5 with `reasoning_effort: "max"` | Captured request has `output_config: { effort: "max" }` plus adaptive thinking. | Config without `reasoning_effort`: request has no `output_config.effort`. | Adapter unit test; live provider check |
| AC-003 | REQ-003, REQ-005 | BEH-003, BEH-004 | Sonnet 5.5 `thinking_enabled:false, reasoning_effort:"max"`; and `thinking_enabled:true, reasoning_effort:"low"` | Off: request has `thinking:{type:"between_tools"}` and no `output_config.effort` (accepted). On: `thinking:{type:"adaptive"}` (no `display`) and `output_config.effort:"low"`. | — | Adapter unit test; live check |
| AC-004 | REQ-005 | BEH-004, SCN-003 | Config `thinking_enabled:false, reasoning_effort:"max"` on Haiku 5.5 | Request has `thinking:{type:"disabled"}` and no `output_config.effort`; no local error; Anthropic accepts it. | — | Adapter unit test; live check |
| AC-005 | REQ-004, REQ-009, REQ-010 | BEH-002, BEH-004, BEH-006, SCN-003 | Composer thinking menu / run-settings Thinking row on `claude-fable-5` and `claude-sonnet-5-5` (AutoByteus) | One list Off · Low · Medium · High · Xhigh · Max, exactly one checked; picking High writes thinking on + effort high (trigger "High"); Off writes thinking off (trigger "Off"); no Thinking display control anywhere. Claude Agent SDK menus unchanged. | — | Web unit tests; rendered check |
| AC-006 | REQ-006, REQ-010 | BEH-001, SCN-001 | Run settings card / Agent Configuration on `claude-opus-5-5`, AutoByteus runtime | Thinking row shows the effort list with Medium checked by default; "Not available for this model" is not shown; there is no Thinking display row. | — | Web unit test; rendered check |
| AC-007 | REQ-007 | BEH-005, SCN-004 | Model catalog / model menu | `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6` are not listed; repository search outside archived tickets finds no built-in support references. | A saved config naming a removed model shows the existing unavailable-model state, not a crash. | Catalog test; grep audit; existing unavailable-model test |
| AC-008 | REQ-008 | BEH-002, BEH-003 | Existing configs without `reasoning_effort` on each Claude model | Requests identical to pre-change (thinking shape, display, no effort). | — | Existing adapter tests stay green |
| AC-009 | REQ-001, REQ-003 | BEH-002 | One live request per remaining Claude model with an explicit effort | Anthropic accepts each (no 400). | A model refusing is a finding. | Gated live provider test |
| AC-010 | REQ-010 | BEH-007 | Catalog listing; any Claude request | No Claude schema contains `thinking_display`; no request contains `thinking.display`. | — | Catalog + adapter unit tests |
| AC-012 | REQ-011 | BEH-007, SCN-005 | Stopped AutoByteus agent run, team run and AgentOrg run whose stored `llmConfig` holds `thinking_display`; user changes effort in the stopped-run settings and saves | Save succeeds (`UPDATED`); the saved config has the new effort and no `thinking_display`; opening the settings alone does not enable Save or write anything. | An invalid value of a key the schema still declares stays in the draft and blocks Save with its field error (existing behavior). | Web unit test of the shared settings component + server/browser edit-path checks (agent, team, Org) |
| AC-011 | REQ-011 | BEH-007, SCN-005 | A saved AutoByteus run on `claude-opus-5-5` whose config holds `thinking_display:"omitted"` (and one on a switch row) is resumed and sent a message | The run resumes; the request contains neither `thinking_display` nor `display`; no validation error blocks the resume. | — | Adapter unit test + server-level resume test with such a stored config |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run Opus 5.5 at a chosen effort | Agent Configuration / run settings / composer thinking menu | AutoByteus runtime, `claude-opus-5-5` selected | Open Thinking, pick Max, send message | Request carries effort max; response produced | — | Supported Normal Scenario | User screenshot; SRC-010 | REQ-001..003, REQ-006; AC-001, AC-002, AC-006 |
| SCN-002 | User | User | Set effort on another Claude model | same surfaces | e.g. `claude-sonnet-5-5` | Pick effort level, optionally toggle thinking | Effort sent with the chosen thinking state | — | Supported Normal Scenario | SRC-001 | REQ-001..004, REQ-009; AC-001, AC-003, AC-005 |
| SCN-003 | User | User | Combine thinking off with an effort | same surfaces | Model with thinking switch | Turn thinking Off, pick Low (stays Off) or Max (thinking turns On) | Only accepted combinations are sent | Saved off+max config via API → local error | Supported Explicit Edge Scenario (Anthropic contract restricts it) | SRC-008, PRB-002 | REQ-004, REQ-005; AC-004, AC-005 |
| SCN-005 | User | User | Continue an existing run created before this change | Run history → open/resume run | Stored config holds `thinking_display` | Resume, send message | Run continues; display not sent | — | Supported Normal Scenario | SRC-019 | REQ-011; AC-011 |
| SCN-004 | Operational | Maintainer / user | Catalog only lists current Claude models | Model menu | — | Open model menu | No gen-4 Claude rows | Saved config on a removed model → unavailable-model state | Supported Normal Scenario | User decision | REQ-007; AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing schema-driven controls; no Product Design requested)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details (SR-002): Claude schema with switch → the existing merged list "Off · Low · Medium · High · Xhigh · Max" (the presentation the Claude Agent SDK runtime already uses); trigger shows "Off" or the active level. Claude schema without switch (Opus 5.5, Fable 5.1) → per-parameter menu with the effort levels only; trigger shows the effective level. No Thinking display control. (SR-001 DEC-006 superseded.)
- Explicitly illustrative content or permitted variation: exact separator/visual styling of the summary may follow existing menu conventions.
- Required states: thinking Off with effort low/medium/high; thinking On with any level; unset effort shows the model default checked.
- Product decisions that need the user: none open.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, AC-004 | Reliability | No normal-UI path produces an Anthropic 400 from an effort/thinking combination | All Claude catalog models | Unit tests + live check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (saved agent definitions / run configs may name a removed model or hold `thinking_budget_tokens`; saved runs hold `thinking_display` — SRC-019).
- Data that must be preserved: saved definitions and runs stay readable; history and token-usage rows (with captured price snapshots) unchanged.
- Acceptable: a saved definition naming a removed model must be re-pointed by the user to a current model (existing unavailable-model state); stored `thinking_budget_tokens` / `thinking_display` values are no longer meaningful and are ignored (REQ-011); they may remain visible as historical residuals in read-only/historical views (existing behavior).
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
| DEC-003 | Is effort coupled to the thinking switch? | Coupling loses effort-with-thinking-off | SR-001: independent (user). SR-002: user reviewed the rendered independent menu and chose one list ("picking an effort level already means thinking is on") | One list Off · levels; accepted loss: thinking off with a non-default effort (e.g. Haiku 5.5 no thinking at low effort). | User (SR-002) | Decided |
| DEC-004 | What happens to a stored effort when thinking is off? | The web keeps the last level in config when Off is picked (existing merged-menu behavior); API-saved configs may combine off + xhigh/max | (a) refuse locally (implementation engineer's suggestion); (b) don't send effort while off | (b): Off means thinking off at the model default effort, so effort is simply not sent; no state can produce the 400 and no saved config fails. A refusal would fail runs for a value the user cannot see in the one-list UI. SR-001 rule superseded. | Solution Designer | Decided |
| DEC-005 | Claude Agent SDK runtime presentation | Shared web owner | SR-002 returns to the existing one-list presentation | Unchanged for the SDK runtime; its latent Off + stored xhigh/max issue recorded as FU-003. | Solution Designer | Decided |
| DEC-006 | Trigger summary wording | Visible label | SR-002 one list | Existing summary: "Off" or the active level. SR-001 "On · High" superseded. | Solution Designer | Decided |
| DEC-007 | Remove gen-4 Claude rows | Scope | User request | Remove Opus 4.8, Opus 4.7, Sonnet 4.6 and their only-used code. | User | Decided |
| DEC-008 | Remove thinking display | Visible setting | User: always omitted, never shown | Remove `thinking_display` from all Claude schemas and the web; never send `display` (Anthropic default omitted on all remaining models). | User (SR-002) | Decided |
| DEC-009 | Saved configs holding `thinking_display` | Real user runs hold it (SRC-019); a raw-forwarded unknown key would make Anthropic reject the request | (a) keep the key hidden in schemas (a setting with no meaning); (b) rewrite stored data (migration across runs/trees); (c) ignore keys the schema no longer declares when building the request | (c): tolerant reader; no data rewrite, no meaningless setting; historical views keep showing residuals as today. | Solution Designer | Decided |
| DEC-011 | Saved runs holding a key the model no longer declares cannot be saved after a stopped-run edit (CR-FO-001) | REQ-011 edit leg; real user runs | (A) data migration removing `thinking_display` from saved runs; (B) editable model-settings drafts leave out keys the current schema does not declare (invalid values of declared keys keep today's preserve-and-show-error behavior) | B: no history rewrite, covers agent/team/Org edit through the shared component, and prevents the same failure for any future removed setting; the key is already ignored by the runtime; read-only history still lists it as a residual. Doc rule in `autobyteus-web/docs/settings.md` refined accordingly. | User (2026-10-29: "I like option B better") | Decided |
| DEC-010 | Sonnet 5.5 progress notes | Sonnet 5.5 defaulted to `summarized` so its progress notes between tool calls stayed visible (prior ticket) | Always omitted hides them | Accept: display is presentation only (PRB-003); user chose not to display it. | User | Decided |

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
| REQ-010 | UC-002, UC-004 | BEH-007 | AC-005, AC-006, AC-010 | SCN-001, SCN-002 |
| REQ-011 | UC-004 | BEH-007 | AC-011 | SCN-005 |

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

- Approval recorded: SR-001 `Yes`; SR-002 `Yes` (User, 2026-10-29)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
