# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined; revised on 2026-05-31 after API/E2E browser validation found duplicate DeepSeek thinking enablement controls.

## Goal / Problem Statement

Selecting a DeepSeek model for the AutoByteus runtime currently exposes an advanced free-text field labelled `Thinking`. The screenshot shows an enabled `Thinking` toggle, a `Reasoning Effort` dropdown set to `high`, and an empty text input labelled `Thinking`. This is confusing because users are not supposed to type arbitrary text into this field. Investigation shows the field is a provider API object leaking through a schema-driven frontend renderer that does not support nested object parameters.

## Investigation Findings

- `autobyteus-ts/src/llm/supported-model-definitions.ts` defines the DeepSeek V4 schema with two parameters: `reasoning_effort` and a nested object parameter named `thinking` whose nested `type` enum is `enabled | disabled`.
- `autobyteus-ts/src/utils/parameter-schema.ts` serializes that nested object to JSON Schema as a property with `type: "object"` and nested `properties`.
- `autobyteus-web/utils/llmConfigSchema.ts` normalizes top-level JSON Schema properties but does not preserve nested object controls as renderable UI fields.
- `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` renders unsupported/non-enum/non-boolean/non-number schema types with a generic text input. Therefore the top-level `thinking` object becomes a blank text field labelled `Thinking`.
- `autobyteus-web/utils/llmThinkingConfigAdapter.ts` detects any schema containing `reasoning_effort` as `openai`, so DeepSeek is handled using OpenAI toggle semantics. This is inaccurate for DeepSeek because DeepSeek's toggle is `thinking.type` and the OpenAI SDK path must send it through `extra_body.thinking`.
- The OpenAI LLM path was checked: OpenAI uses `OpenAIResponsesLLM` with a flat `openaiReasoningSchema` (`reasoning_effort`, `reasoning_summary`) and adapter-owned conversion into the Responses API `reasoning` object. No OpenAI `thinking` object is exposed to the frontend, matching the user-provided OpenAI screenshot where only `Reasoning Effort` and `Reasoning Summary` dropdowns appear.
- DeepSeek's official docs state that V4 thinking mode is controlled with `thinking.type` (`enabled`/`disabled`), `reasoning_effort` accepts `high`/`max`, thinking defaults to enabled, and when using the OpenAI SDK the `thinking` object is passed inside `extra_body`.
- Kimi and GLM were checked after user follow-up: Kimi currently exposes no model config schema in `supported-model-definitions.ts`, so it does not render thinking controls; `KimiLLM` only injects an internal provider `thinking` object for tool-workflow safety. GLM already uses the correct flat schema pattern (`thinking_type` enum) and `GlmLLM` maps that internally to the provider `thinking` object, so it should not show the weird free-text field.
- API/E2E browser validation after implementation confirmed the raw blank `Thinking` text field is gone, but found a new clarity failure: DeepSeek shows both the basic `Thinking` toggle and an advanced `Thinking Type` dropdown. Both controls represent the same `thinking_type` / `extra_body.thinking.type` enable-disable mode, so the requirements now explicitly make the basic `Thinking` toggle the single DeepSeek enable/disable control and remove `Thinking Type` from Advanced.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / UX Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, scoped to model-config schema/UI/runtime mapping ownership
- Evidence basis: DeepSeek schema exposes provider transport object directly; frontend schema normalizer loses nested object semantics; generic renderer turns unsupported object into text input; thinking toggle adapter misclassifies DeepSeek as OpenAI.
- Requirement or scope impact: The fix must cleanly separate user-editable UI parameters from provider request-shape internals instead of teaching users to fill raw provider objects.

## Recommendations

- Do not ask users to fill the `Thinking` text field. It should be removed or replaced with a constrained control.
- Prefer a provider-safe, flat UI schema key such as `thinking_type` with enum `enabled | disabled`, then normalize it inside `DeepSeekLLM` to the provider/OpenAI-SDK request shape `extra_body: { thinking: { type: ... } }`.
- Update frontend thinking detection so DeepSeek is not treated as OpenAI merely because it has `reasoning_effort`.
- Add a frontend regression test covering the DeepSeek schema: no text input labelled `Thinking`; the thinking mode is represented as a toggle/dropdown and reasoning effort remains constrained to `high | max`.
- Add an `autobyteus-ts` request-shape test proving DeepSeek UI config maps to `reasoning_effort` plus `extra_body.thinking.type`.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The visible bug is small, but the durable fix crosses the model catalog schema owner (`autobyteus-ts`), frontend schema-driven controls (`autobyteus-web`), and DeepSeek runtime request mapping (`autobyteus-ts`).

## In-Scope Use Cases

- UC-001: A user selects AutoByteus runtime and a DeepSeek V4 model and sees only understandable, constrained controls for DeepSeek thinking/reasoning configuration.
- UC-002: A user enables or disables DeepSeek thinking mode without typing raw JSON/object text.
- UC-003: A user selects DeepSeek reasoning effort (`high` or `max`) and the runtime sends the provider-supported value.
- UC-004: Existing valid model configuration controls continue working for non-DeepSeek models.

## Out of Scope

- Broad redesign of the agent definition page.
- Changing DeepSeek multi-turn reasoning-content replay logic except where tests need to confirm request-shape compatibility.
- Adding unrelated DeepSeek model capabilities or changing non-DeepSeek provider schemas.
- Supporting arbitrary nested object editing in `ModelConfigAdvanced.vue` as a general JSON editor.

## Functional Requirements

- FR-001: The AutoByteus runtime model-configuration UI must not render a blank free-text input labelled `Thinking` for DeepSeek V4 models.
- FR-002: DeepSeek thinking mode enable/disable must be exposed through the basic `Thinking` toggle as the single authoritative enable/disable control; Advanced must not render a separate `Thinking Type` enable/disable dropdown for DeepSeek.
- FR-003: DeepSeek reasoning effort must be exposed as a constrained setting with valid values `high` and `max`.
- FR-004: The user-facing DeepSeek config shape must not require users or persisted frontend state to contain raw provider nested objects such as `{ thinking: { type: ... } }`.
- FR-005: `autobyteus-ts` must translate the user-facing DeepSeek config into the provider request shape required by the OpenAI SDK path: `reasoning_effort` at request top level and `thinking` under `extra_body`.
- FR-006: Frontend thinking-toggle detection must not classify DeepSeek as OpenAI only because DeepSeek has a `reasoning_effort` field.
- FR-007: Existing OpenAI, Claude, Gemini, Kimi, GLM, Codex, and non-thinking runtime/model config controls must continue to render and sanitize according to their schemas.
- FR-008: Model config Advanced rendering must exclude provider fields whose only user-facing meaning is already owned by the basic `Thinking` toggle, starting with DeepSeek `thinking_type`; for DeepSeek, Advanced should focus on `Reasoning Effort` only.

## Acceptance Criteria

- AC-001: With AutoByteus runtime and `DeepSeek / deepseek-v4-flash` selected, no text input labelled `Thinking` is displayed.
- AC-002: The DeepSeek advanced section displays `Reasoning Effort` as a select/dropdown constrained to `high` and `max`.
- AC-003: DeepSeek thinking mode can be enabled/disabled through the basic `Thinking` toggle; users are not asked to type `enabled`, `disabled`, JSON, arbitrary text, or choose a second Advanced `Thinking Type` control for the same enable/disable mode.
- AC-004: When DeepSeek thinking is enabled and effort is `high`, the runtime request includes `reasoning_effort: "high"` and `extra_body: { thinking: { type: "enabled" } }`.
- AC-005: When DeepSeek thinking is disabled, the runtime request includes `extra_body: { thinking: { type: "disabled" } }` and does not send an invalid `reasoning_effort: "none"` for DeepSeek.
- AC-006: Frontend model-config tests prove the DeepSeek schema does not create the confusing free-text field.
- AC-007: Existing non-DeepSeek model-config tests continue passing, including OpenAI-style reasoning fields and non-thinking parameters such as Codex `service_tier`.
- AC-008: In real browser validation with AutoByteus runtime and `DeepSeek / deepseek-v4-flash`, expanding Advanced shows `Reasoning Effort` but does not show a `Thinking Type` field/dropdown.

## Constraints / Dependencies

- The AutoByteus runtime model catalog originates in `autobyteus-ts` and is delivered to the frontend through `autobyteus-server-ts` GraphQL `availableLlmProvidersWithModels`.
- `ModelConfigAdvanced.vue` is intentionally schema-driven and currently supports enum/select, boolean/toggle, integer/number input, and fallback text input.
- DeepSeek OpenAI SDK integration requires the provider `thinking` object inside `extra_body`, per current official docs.
- Persisted `llmConfig` values are passed as `LLMConfig.extraParams` to `LLMFactory.createLLM`.

## Assumptions

- DeepSeek V4 models should keep thinking enabled by default unless the user explicitly disables it.
- A flat UI/runtime config key such as `thinking_type` is acceptable as the internal user-editable representation, provided `DeepSeekLLM` owns translation to provider request shape.
- Existing persisted configs with `reasoning_effort: "high"` should remain valid; configs containing a raw `thinking` object can be sanitized or migrated by schema replacement without preserving the confusing UI field.

## Risks / Open Questions

- Existing persisted agent definitions might contain `thinking: { type: ... }`; implementation should verify whether a cleanup/migration is needed or whether schema sanitization naturally removes it.
- Browser validation proved that a single basic `Thinking` toggle plus an advanced `Thinking Type` dropdown is confusing. The basic toggle must own enable/disable; Advanced must not repeat the same DeepSeek mode control.
- DeepSeek docs also note that thinking mode ignores some sampling params; this task does not need to redesign sampling controls unless current UI exposes them for DeepSeek in this path.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-002, FR-003, FR-006, FR-007, FR-008
- UC-002: FR-001, FR-002, FR-004, FR-005, FR-006, FR-008
- UC-003: FR-003, FR-005
- UC-004: FR-007, FR-008

## Acceptance-Criteria-To-Scenario Intent

- AC-001 covers the exact confusing field from the user's screenshot.
- AC-002 covers DeepSeek reasoning effort rendering.
- AC-003 covers user comprehension and single-control thinking-mode input.
- AC-008 covers browser-visible removal of the duplicate Advanced `Thinking Type` control.
- AC-004 covers enabled DeepSeek runtime request shape.
- AC-005 covers disabled DeepSeek runtime request shape and rejects OpenAI-style `none` handling for DeepSeek.
- AC-006 covers frontend regression protection.
- AC-007 covers non-DeepSeek regression protection.

## Approval Status

Approved by user on 2026-05-31 via: "coool. since you found the reason, then kickoff the task, have a good design".
