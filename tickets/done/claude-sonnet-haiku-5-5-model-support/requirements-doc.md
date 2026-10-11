# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `claude-sonnet-haiku-5-5-model-support`
- Request / ticket: User request — "support two more models from claude in autobyteus-ts" (screenshot: Opus 5.5, Sonnet 5.5, Haiku 5.5)
- Requirements owner: Solution Designer
- Date: session date
- Approval state and reference: Approved by the user in conversation on 2026-10-09 ("approve. i think you are following industry practices"), after the recommendations on DEC-001..DEC-003 were presented
- Exact approved requirements baseline / solution revision: this document as of SR-003 content (REQ-001..REQ-013, AC-001..AC-012), with DEC-001=A, DEC-002=A, DEC-003=A
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: Anthropic released Claude Sonnet 5.5 (`claude-sonnet-5-5`) and Claude Haiku 5.5 (`claude-haiku-5-5`). The autobyteus-ts built-in Anthropic catalog does not offer them. Claude Opus 5.5 is already supported. Adding the IDs to the catalog alone would cause API 400 errors, because the current request policy would send settings these models reject. Sonnet 5.5 would get `thinking: disabled`. Haiku 5.5 would get `temperature: 0`.
- Affected actors or systems: AutoByteus users who configure agents with built-in Anthropic models. The autobyteus-ts LLM layer. Token-usage cost accounting.
- Desired outcome: Both models can be selected from the built-in catalog, with correct metadata and Standard pricing, and agents run on them without provider request errors.
- Observable definition of success: Each model appears once in the catalog, has correct limits and prices, and produces valid Anthropic requests for default, thinking-on and tool-calling turns.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Sonnet 5.5 and Haiku 5.5 cannot be selected | Both can be selected as built-in Anthropic models | Existing Claude rows, including Opus 5.5 and Sonnet 5, are unchanged | investigation-notes Source Log |
| BEH-002 | System | SCN-002, SCN-003 | No supported behavior. If they were added naively, requests would be rejected. | Requests follow each model's documented thinking, sampling and tool-choice rules | Request shaping for every existing Claude model is unchanged | anthropic-llm.ts; Anthropic docs |
| BEH-003 | System | SCN-004 | N/A | Token cost uses the models' Standard prices. Haiku is priced in tiers by prompt size. | Existing cost calculation is unchanged | token-cost-calculator.ts |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Select Claude Sonnet 5.5 or Claude Haiku 5.5 as an agent's built-in LLM | SCN-001 |
| UC-002 | Run agent turns, with or without tool calls, on either model, with thinking off (default) or on | SCN-002, SCN-003 |
| UC-003 | Record token usage cost for either model | SCN-004 |

### Out Of Scope

- Claude Opus 5.5 (already supported).
- Claude Code / Claude Agent SDK / other runtime model lists outside the autobyteus-ts built-in catalog.
- Bedrock / Vertex / Foundry IDs, Batch, Fast mode, regional or data-residency pricing.
- The beta `display: "updates"` thinking mode.
- Computer-use toolset, advisor tool, compaction-on-demand beta, inline tools beta, thinking-binding-controls beta.
- Changing defaults or behavior for any existing model.

### Non-Goals

- Exposing the `effort` parameter (`output_config.effort`) in the model config schema.
- Removing or deprecating Sonnet 5 / Sonnet 4.6.
- Making either model a default or fallback model.

### Preserved Behavior Boundary

- BEH-001/002/003 preserved columns. All existing Anthropic tests keep passing unchanged, apart from the ordered-catalog expectations that must list the two new rows.

### Review Authority

- Blocking findings must cite a REQ/AC/BEH ID below. Anything that adds new behavior is a `Requirement Gap` and needs user approval.

## Requirements

| ID | Requirement | BEH | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Add a built-in Anthropic catalog row for `claude-sonnet-5-5`, with name, value and canonical name all `claude-sonnet-5-5`. Limits: 1,000,000 context/input and 128,000 max output. Input: text + image. Provenance: Anthropic model page, verified on the implementation date. | BEH-001 | Must | Official ID/specs | Anthropic Sonnet 5.5 overview |
| REQ-002 | Add a built-in Anthropic catalog row for `claude-haiku-5-5`. Same identity rules as REQ-001. Limits: 1,000,000 context/input and 128,000 max output. Input: text + image. | BEH-001 | Must | Official ID/specs | Anthropic Haiku 5.5 overview |
| REQ-003 | Sonnet 5.5 Standard pricing (USD per MTok): input 2, output 10, cache read 0.10, 5-minute cache write 2.50, 1-hour cache write 4. Pricing effective date: 2026-09-28. | BEH-003 | Must | Cost accounting | Anthropic pricing |
| REQ-004 | Haiku 5.5 Standard pricing is tiered by prompt size. Prompts ≤100,000 tokens: input 0.10, output 0.50, cache read 0.01, 5m write 0.125, 1h write 0.20. Prompts >100,000 tokens: input 0.50, output 2.50, cache read 0.05, 5m write 0.625, 1h write 1.00. Prompt size for tier selection counts all input tokens, including cache reads and writes. Pricing effective date: 2026-10-07. | BEH-003 | Must | Cost accounting | Anthropic pricing page (Long context pricing) |
| REQ-005 | Both models offer the same user-facing thinking controls as Sonnet 5: an on/off `thinking_enabled` toggle (default off) and `thinking_display` (`omitted`/`summarized`). Neither model exposes a fixed thinking-budget setting. | BEH-002 | Must | Consistent UX; provider rejects manual budgets | DEC-002 |
| REQ-006 | Sonnet 5.5, thinking off: the request uses the model's lowest thinking setting, `thinking: {type: "between_tools"}`, with no other thinking fields. It never sends `thinking: {type: "disabled"}`. | BEH-002 | Must | Provider returns 400 for `disabled` | Sonnet 5.5 what's new; DEC-002 |
| REQ-007 | Haiku 5.5, thinking off: the request sends `thinking: {type: "disabled"}`. | BEH-002 | Must | Provider supports `disabled` at default effort | Haiku 5.5 what's new; DEC-002 |
| REQ-008 | Either model, thinking on: the request sends `thinking: {type: "adaptive"}`. It adds `display: "summarized"` when the display setting is `summarized`. Default display: Sonnet 5.5 `summarized`, Haiku 5.5 `omitted`. | BEH-002 | Must | Sonnet 5.5 progress notes between tool calls are empty under `omitted` | DEC-003 |
| REQ-009 | Requests to either model never include `temperature`, `top_p` or `top_k`. The adapter does not inject its default temperature. A caller-supplied fixed-budget thinking shape (`{type: "enabled", budget_tokens}`) is never sent to either model. | BEH-002 | Must | Provider 400s | Docs |
| REQ-010 | A Sonnet 5.5 request with a forced `tool_choice` (`any` or `tool`) fails before the provider call with a clear error. `auto` and `none` are allowed. | BEH-002 | Should | Provider 400 → clearer local error; same as the Opus 5.5 precedent | Sonnet 5.5 what's new |
| REQ-011 | Tool-calling turns on either model preserve the model's native thinking blocks unmodified when the conversation continues after tool results. This is the same signed-turn behavior Claude models already have. | BEH-002 | Must | Thinking blocks are bound to model and conversation | Docs; existing native-turn support |
| REQ-012 | Request shaping, schemas and pricing for all existing Claude rows stay unchanged. In particular, `claude-sonnet-5` keeps sending `disabled` when thinking is off, and `claude-opus-5-5` keeps its adaptive-only behavior. | BEH-002 | Must | Regression safety | Existing tests |
| REQ-013 | autobyteus-ts catalog documentation lists both rows with their request-policy and pricing notes. | BEH-001 | Should | Docs sync | provider_model_catalogs.md |

## Acceptance Criteria

| AC | REQ | BEH/SCN | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | List the built-in supported models | Exactly one `claude-sonnet-5-5` row and one `claude-haiku-5-5` row exist under Anthropic, with 1M/1M/128K limits and image support | — | Unit test |
| AC-002 | REQ-003 | BEH-003 / SCN-004 | Read the Sonnet 5.5 default pricing config | Prices match REQ-003 | — | Unit test |
| AC-003 | REQ-004 | BEH-003 / SCN-004 | Cost a Haiku 5.5 usage at ≤100k and at >100k gross input tokens (gross includes cache reads and writes; e.g. 60k uncached + 50k cache-read = >100k tier) | The matching tier's prices are applied to every dimension | — | Unit test (catalog tiers) + server calculator test or evidence |
| AC-004 | REQ-005, REQ-006 | SCN-002 | Sonnet 5.5 request with default config | Payload has `thinking: {type: "between_tools"}` and no other thinking fields. There is no `temperature`. | — | Mocked-SDK unit test |
| AC-005 | REQ-005, REQ-007 | SCN-002 | Haiku 5.5 request with default config | Payload has `thinking: {type: "disabled"}` and no `temperature` | — | Mocked-SDK unit test |
| AC-006 | REQ-008 | SCN-002 | Thinking turned on, display at its default and set explicitly | Sonnet 5.5: `{type: "adaptive", display: "summarized"}` by default. Haiku 5.5: `{type: "adaptive"}` by default and `{type: "adaptive", display: "summarized"}` when set. Switching display updates the payload. | — | Unit test |
| AC-007 | REQ-009 | SCN-002 | Caller passes temperature/top_p/top_k or a manual budget thinking shape | None of these reach the payload, or the request is rejected locally. Neither model ever receives a 400-inducing shape. | — | Unit test |
| AC-008 | REQ-010 | SCN-003 | Sonnet 5.5 request with `tool_choice: {type: "any"}` or `{type: "tool"}` | Fails locally with a clear error. No SDK call is made. | `auto` and `none` pass through | Unit test |
| AC-009 | REQ-011 | SCN-003 | Tool-use turn followed by a tool-result continuation | The thinking blocks from the next request's assistant turn are byte-identical to the ones the provider returned | — | Unit test (native-turn continuation) |
| AC-010 | REQ-012 | — | Existing test suite | All existing Anthropic tests pass. Only the expected catalog-order lists change. | — | Test run |
| AC-011 | REQ-001..REQ-009 | SCN-002, SCN-003 | Live Anthropic API smoke test (when a key is available) | Plain and tool-calling turns succeed for both models | Recorded as skipped if no key | Live integration test |
| AC-012 | REQ-013 | — | Docs review | Catalog doc lists both models with their policy and pricing notes | — | Review |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alt/Error | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | AutoByteus user | Use a new Claude model | Model picker / agent config | Anthropic key configured | Open the model list → choose Sonnet 5.5 or Haiku 5.5 | The model is selectable with its limits and prices | — | Supported Normal | Catalog flow | REQ-001..004 / AC-001..003 |
| SCN-002 | System | Agent runtime | Plain chat turn | Agent receives user input | Model selected | Build the request → call the Messages API → stream text (and thinking if on) | Valid request; response streamed | Provider error surfaces as today | Supported Normal | anthropic-llm.ts | REQ-005..009 / AC-004..007 |
| SCN-003 | System | Agent runtime | Tool-calling turn | Model emits tool_use | Tools configured | tool_use → tool result → continuation with the preserved native turn | Continuation is accepted; progress notes are visible | Forced tool_choice is rejected locally | Supported Normal | native-turn code; docs | REQ-010, REQ-011 / AC-008, AC-009 |
| SCN-004 | System | Token accounting | Cost a turn | Usage observation | Pricing from the catalog | The usage is costed against the catalog price or tier | Correct USD cost | — | Supported Normal | token-cost-calculator.ts | REQ-003, REQ-004 / AC-002, AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (catalog-driven; existing UI renders schema). Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| QR | REQ/AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-006..010 / AC-004..008 | Compatibility | No adapter-generated request shape for either model may be one that the Anthropic docs say returns 400 | Unit tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (new catalog rows only).

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Anthropic Messages API (Sonnet 5.5) | `between_tools` instead of `disabled`; no manual budget, sampling params or forced tool_choice; history must stay append-only | Anthropic docs: whats-new-sonnet-5-5 | Docs may change |
| Anthropic Messages API (Haiku 5.5) | `disabled` OK at ≤ high effort; no manual budget, sampling params or prefill | Anthropic docs: whats-new-haiku-5-5 | — |
| `@anthropic-ai/sdk` typings | The `between_tools` thinking type may not be in the installed SDK types | Architecture to verify | May need a cast or SDK bump |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The "two more models" are Sonnet 5.5 and Haiku 5.5, because Opus 5.5 is already supported | Confirmed (DEC-001) |

## Open Decisions And Questions

| ID | Question | Options / Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | Confirm scope: Sonnet 5.5 + Haiku 5.5 | Recommended: yes | Decided: Yes (user approval 2026-10-09) |
| DEC-002 | Default thinking for the new models | (A, recommended) Same as Sonnet 5: the toggle defaults to off and sends the lowest setting (Sonnet 5.5 `between_tools`, Haiku 5.5 `disabled`), so latency and cost stay low. (B) Follow Anthropic's default: adaptive always on unless the user turns it off. | Decided: A (user approval 2026-10-09). The user can switch it per run in the frontend Thinking menu. |
| DEC-003 | Default thinking display for Sonnet 5.5 when thinking is on | (A, recommended) `summarized`, so the progress notes Sonnet 5.5 writes between tool calls stay visible. (B) `omitted`, the same as other Claude rows. The user can still change it either way. | Decided: A (user approval 2026-10-09) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001, REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-003, REQ-004 | UC-003 | BEH-003 | AC-002, AC-003 | SCN-004 |
| REQ-005..009 | UC-002 | BEH-002 | AC-004..007, AC-011 | SCN-002 |
| REQ-010, REQ-011 | UC-002 | BEH-002 | AC-008, AC-009, AC-011 | SCN-003 |
| REQ-012 | UC-002 | BEH-002 | AC-010 | — |
| REQ-013 | UC-001 | BEH-001 | AC-012 | — |

## Architecture Phase Input

- Map SCN-002/003 to the `applyAnthropicRequestParams` policy path. The current prefix family matching misclassifies `claude-sonnet-5-5`.
- Verify: SDK typing for `between_tools`; that the server's gross input tokens include cache tokens for the Haiku tier boundary; that there is no assistant prefill; that native-turn preservation is generic.
- Deferred to design: how per-model request policy is represented. Today it is a family list plus an Opus 5.5 special case.

## Readiness Check

- Current behavior is backed by evidence: Yes. Desired and preserved behavior are explicit: Yes. Scope is clear: Yes. Testable and traceable: Yes. Scenarios covered: Yes. Product design: N/A. Open decisions visible: Yes.
- Content ready for user approval: Yes. Remaining content blocker: None.
- User approval received: Yes (2026-10-09). Exact basis recorded: Yes. Approved package ready for architecture design: Yes.
