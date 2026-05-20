# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined.

Scope was explicitly reduced by the user on 2026-05-20: this ticket is only about adding `gemini-3.5-flash` support. Antigravity runtime investigation/support is removed from scope.

## Goal / Problem Statement

Add first-class Google Gemini 3.5 Flash support to `autobyteus-ts` so the server Autobyteus runtime model catalog can surface the model through the existing `autobyteus-ts` LLM model registry.

Official Google docs confirm the model API identifier is exactly `gemini-3.5-flash`.

## Investigation Findings

- Official Gemini model docs last updated 2026-05-19 list stable model code `gemini-3.5-flash`.
- Official model limits: 1,048,576 input/context tokens and 65,536 output tokens.
- The model supports Gemini thinking levels, matching the existing Gemini model config schema in `autobyteus-ts`.
- Existing `autobyteus-ts` model support is centralized in:
  - `autobyteus-ts/src/llm/supported-model-definitions.ts`
  - `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`
  - `autobyteus-ts/src/utils/gemini-model-mapping.ts`
- Server Autobyteus model catalog delegates to `autobyteus-ts` through `LLMFactory.listAvailableModels()`, so no server-only Gemini model list should be added.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Existing Gemini model registry, metadata, config schema, runtime mapping, and server catalog flow are already correctly owned and centralized.
- Requirement or scope impact: Implement as a small model-registry extension; do not introduce runtime/backend changes.

## Recommendations

- Add `gemini-3.5-flash` to `autobyteus-ts/src/llm/supported-model-definitions.ts` using `GeminiLLM`, existing `geminiSchema`, and pricing consistent with the official Gemini 3.5 Flash pricing row.
- Add curated metadata for `gemini-3.5-flash` with official source URL and verified date.
- Add explicit Gemini runtime mapping for API-key and Vertex modes, both preserving the same model ID.
- Extend existing tests for model metadata and Gemini model mapping.
- Do not change global/default Gemini fallback model unless a separate product decision requests it.

## Scope Classification (`Small`/`Medium`/`Large`)

Small.

## In-Scope Use Cases

- UC-GEMINI-001: A user can select `gemini-3.5-flash` from the Gemini model list in the Autobyteus runtime.
- UC-GEMINI-002: Server model catalog queries for the Autobyteus runtime include `gemini-3.5-flash` through the existing `autobyteus-ts` model registry.
- UC-GEMINI-003: Offline/curated metadata reports official context/input/output limits for `gemini-3.5-flash` without a live Google metadata API call.

## Out of Scope

- Antigravity runtime support, Antigravity CLI, Antigravity SDK, and managed Antigravity Agent support.
- Adding any new server runtime kind/backend.
- Building Python bridges or MCP adapters for Antigravity.
- Removing or deprecating existing Gemini preview model entries.
- Changing the default Gemini model globally.

## Functional Requirements

- REQ-GEMINI-001: `autobyteus-ts` must register `gemini-3.5-flash` as a Gemini LLM model with model identifier, display name, value, and canonical name exactly `gemini-3.5-flash`.
- REQ-GEMINI-002: `gemini-3.5-flash` must use provider `LLMProvider.GEMINI` and `GeminiLLM`.
- REQ-GEMINI-003: `gemini-3.5-flash` must reuse the existing Gemini config schema containing `thinking_level` and `include_thoughts`.
- REQ-GEMINI-004: `gemini-3.5-flash` must expose curated metadata with `maxContextTokens=1048576`, `maxInputTokens=1048576`, and `maxOutputTokens=65536`.
- REQ-GEMINI-005: Gemini runtime model mapping must preserve `gemini-3.5-flash` for API-key and Vertex modes.
- REQ-GEMINI-006: Server Autobyteus model catalog must surface `gemini-3.5-flash` through existing `autobyteus-ts` model listing, without server-side duplicate model registration.

## Acceptance Criteria

- AC-GEMINI-001: `LLMFactory.listModelsByProvider(LLMProvider.GEMINI)` includes a model with `model_identifier`, `display_name`, `value`, and `canonical_name` all equal to `gemini-3.5-flash`.
- AC-GEMINI-002: The model info for `gemini-3.5-flash` includes `provider_type: GEMINI`, `runtime: api`, and config schema entries for `thinking_level` and `include_thoughts`.
- AC-GEMINI-003: With Gemini live metadata unavailable, `gemini-3.5-flash` still reports `max_context_tokens=1048576`, `max_input_tokens=1048576`, and `max_output_tokens=65536`.
- AC-GEMINI-004: `resolveModelForRuntime('gemini-3.5-flash', 'llm', 'api_key')` returns `gemini-3.5-flash`.
- AC-GEMINI-005: `resolveModelForRuntime('gemini-3.5-flash', 'llm', 'vertex')` returns `gemini-3.5-flash`.
- AC-GEMINI-006: Server `ModelCatalogService.listLlmModels('autobyteus')` includes `gemini-3.5-flash` via the Autobyteus catalog path.

## Constraints / Dependencies

- Use the exact official model ID `gemini-3.5-flash`.
- Keep implementation in the existing model registry/metadata/mapping owners.
- Do not introduce Antigravity runtime code in this ticket.
- Do not remove old model entries as part of this change.

## Assumptions

- `gemini-3.5-flash` pricing should use the official Gemini 3.5 Flash public pricing row and matches the current Flash pricing shape already used in code.
- Server model visibility follows automatically after `autobyteus-ts` model registry updates.

## Risks / Open Questions

- If Google changes Vertex-specific model naming later, the runtime mapping may need a follow-up update. Current official docs do not require a different Vertex ID.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-GEMINI-001 | UC-GEMINI-001, UC-GEMINI-002 |
| REQ-GEMINI-002 | UC-GEMINI-001 |
| REQ-GEMINI-003 | UC-GEMINI-001 |
| REQ-GEMINI-004 | UC-GEMINI-003 |
| REQ-GEMINI-005 | UC-GEMINI-001 |
| REQ-GEMINI-006 | UC-GEMINI-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-GEMINI-001 | Model registration is visible to model selection. |
| AC-GEMINI-002 | Gemini model-specific configuration remains available. |
| AC-GEMINI-003 | Official metadata is available without live API calls. |
| AC-GEMINI-004 | API-key Gemini runtime uses correct model ID. |
| AC-GEMINI-005 | Vertex Gemini runtime uses correct model ID. |
| AC-GEMINI-006 | Server consumes the package-level model registry correctly. |

## Approval Status

Approved by user scope clarification on 2026-05-20: ticket is only about `gemini-3.5-flash` support.
