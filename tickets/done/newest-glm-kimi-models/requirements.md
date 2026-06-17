# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement

Update built-in GLM and Kimi LLM support for the newest provider models, while keeping Kimi K2.6 as the general-purpose Kimi model because Kimi K2.7 is coding-focused.

The refined target is:

- GLM: replace active built-in `glm-5.1` support with official `glm-5.2`.
- Kimi: keep `kimi-k2.6` as the general-purpose Kimi built-in, add official `kimi-k2.7-code` as the coding/agentic Kimi built-in, and remove active `kimi-k2-thinking` support.
- Current-project schema-boundary work is explicitly out of scope. The Daily Assistant/RPA media schema failure is owned by a future RPA project ticket, not by this AutoByteus TS model-catalog ticket.

## Investigation Findings

- Current built-in model ownership is centered in `autobyteus-ts/src/llm/supported-model-definitions.ts`, with provider defaults in `autobyteus-ts/src/llm/api/glm-llm.ts` and `autobyteus-ts/src/llm/api/kimi-llm.ts`.
- Current curated token metadata lives in `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`; `LLMFactory` merges curated metadata and live provider metadata before server/frontend model lists receive `ModelInfo`.
- Current Kimi support registered `kimi-k2.6` and `kimi-k2-thinking`; the refined requirement keeps `kimi-k2.6`, removes `kimi-k2-thinking`, and adds `kimi-k2.7-code` for coding/agentic workflows. The adapter has K2.6-specific safe temperature and tool-workflow thinking-disabling behavior that must remain scoped to K2.6 only.
- Current GLM support registered/defaulted to `glm-5.1`; the adapter maps flat UI `thinking_type` into provider-native top-level `thinking.type`.
- Official Kimi docs identify `kimi-k2.7-code` as the latest/strongest code-focused Kimi model and document fixed/invalid sampling constraints, always-on thinking, 256K context, and preserved reasoning requirements. Official Kimi model docs still identify `kimi-k2.6` as the supported general-purpose Kimi model, so retaining it is product-correct after the user refinement.
- Official GLM docs identify `glm-5.2` as latest flagship, with 1M context, 128K max output, `thinking.type`, and `reasoning_effort: "high" | "max"`.
- The earlier Kimi/Daily Assistant media schema investigation found an RPA public API contract issue: RPA `/models/audio` currently emits `parameter_schema` in snake_case while AutoByteus TS media/tool schema consumers expect camelCase. That problem is not a current-project defect and must be fixed in the RPA project by migrating media model `parameter_schema` responses to the existing camelCase config-schema contract.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Catalog Modernization.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, bounded to model catalog and provider-specific request policy.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure for stale active built-in model IDs and provider-specific behavior that must be split between retained K2.6 and new K2.7 Code.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, bounded to catalog/default/metadata/request-policy cleanup. No current-project parameter-schema refactor is in scope.
- Evidence basis: Old/deprecated model IDs are present in built-in definitions, provider defaults, curated metadata, tests, and docs. Kimi K2.7 Code constraints conflict with K2.6-only automatic disabled-thinking and generic sampling defaults unless `KimiLLM` owns separate request shaping by model ID. GLM 5.2 adds `reasoning_effort` and different metadata limits.
- Requirement or scope impact: Implementation must add K2.7 Code without removing K2.6, remove active `kimi-k2-thinking`, replace GLM 5.1 with GLM 5.2, and keep provider-specific request-shape policy inside the provider adapters.

## Recommendations

1. Make a clean-cut GLM replacement: one active GLM entry (`glm-5.2`) replacing `glm-5.1`.
2. For Kimi, register two explicit active built-ins with distinct purposes: `kimi-k2.6` for general-purpose Kimi use and `kimi-k2.7-code` for coding/agentic workflows. Remove `kimi-k2-thinking`.
3. Update provider constructors intentionally: `new GlmLLM()` defaults to `glm-5.2`; `new KimiLLM()` should keep defaulting to the general-purpose `kimi-k2.6` unless implementation/product review decides the coding-focused model should become the default.
4. Keep provider-specific request-shape constraints inside `GlmLLM` and `KimiLLM`, not in callers or the shared OpenAI-compatible request builder except for small hooks required to let a provider adapter supply a normalized request config.
5. Update metadata, tests, and docs in the same change; treat `glm-5.1` and `kimi-k2-thinking` as stale active support unless they appear only in archival `tickets/done` artifacts or explicit negative assertions.
6. Do not add compatibility aliases, fallback model rows, old-model wrappers, or current-project schema-boundary compatibility code for this scope.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A caller lists built-in GLM models and sees `glm-5.2`, not `glm-5.1`.
- UC-002: A caller lists built-in Kimi models and sees both `kimi-k2.6` and `kimi-k2.7-code`, and does not see `kimi-k2-thinking`.
- UC-003: Direct construction of `new GlmLLM()` uses `glm-5.2`; direct construction of `new KimiLLM()` continues to use the general-purpose `kimi-k2.6` unless explicitly passed `kimi-k2.7-code`.
- UC-004: GLM user/runtime config can express GLM 5.2 thinking enablement and reasoning effort in a schema-driven way.
- UC-005: Kimi K2.6 requests keep K2.6-safe normalization, while Kimi K2.7 Code requests do not send provider-invalid K2.6 defaults such as automatic `thinking: { type: "disabled" }`.
- UC-006: Model metadata and docs report the new models' context/output constraints based on official sources.

## Out of Scope

- Adding support for the separate Kimi high-speed API identifier `kimi-k2.7-code-highspeed` unless the implementation team validates that the product wants a third Kimi row.
- Reworking shared tool/parameter schema parsing or OpenAI-compatible tool schema normalization in this current AutoByteus TS project.
- Fixing the Daily Assistant/RPA media schema failure in this current project; that fix belongs in the RPA project public media-model API contract.
- Adding dynamic discovery for GLM model metadata.
- Migrating persisted historical run records; history may contain old IDs as historical data, but active built-in catalogs must not advertise them.
- Updating archival `tickets/done` evidence/log artifacts.

## Functional Requirements

- FR-001: The built-in GLM model catalog must register `glm-5.2` as the only active built-in GLM LLM model for this scope.
- FR-002: The built-in GLM provider default used by `new GlmLLM()` must be `glm-5.2`.
- FR-003: GLM 5.2 metadata must include docs-backed context/output limits: 1,000,000 context/input tokens and 128,000 output tokens.
- FR-004: GLM 5.2 config schema must support `thinking_type: "enabled" | "disabled"` and `reasoning_effort: "high" | "max"` with default effort aligned to official guidance (`max`).
- FR-005: `GlmLLM` must keep owning provider request-shape conversion from flat UI/config keys into provider-native request fields and must not leak flat-only `thinking_type` into the provider request.
- FR-006: The built-in Kimi model catalog must register `kimi-k2.6` and `kimi-k2.7-code` as distinct active built-in Kimi LLM models for this scope.
- FR-007: The built-in Kimi provider default used by `new KimiLLM()` must remain the general-purpose `kimi-k2.6`; callers can explicitly select `kimi-k2.7-code` for coding/agentic workflows.
- FR-008: Kimi K2.6 and Kimi K2.7 Code metadata must include docs-backed 256,000-token context length.
- FR-009: `KimiLLM` must keep K2.6-safe request shaping only for `kimi-k2.6` and apply K2.7 Code-safe request normalization only for `kimi-k2.7-code`, including avoiding provider-invalid disabled thinking and generic default sampling values for K2.7 Code.
- FR-010: Active tests and docs must be updated so `glm-5.1` and `kimi-k2-thinking` are not asserted or described as supported current built-ins; `kimi-k2.6` remains supported.
- FR-011: No compatibility aliases, fallback model rows, or old-model wrappers may be added for `glm-5.1` or `kimi-k2-thinking`; Kimi K2.6 support must be an explicit first-class model row, not an alias or fallback.

## Acceptance Criteria

- AC-001: `LLMFactory.listModelsByProvider(LLMProvider.GLM)` returns a GLM built-in with `model_identifier`, `display_name`, `value`, and `canonical_name` equal to `glm-5.2`, and does not include `glm-5.1`.
- AC-002: `LLMFactory.listModelsByProvider(LLMProvider.KIMI)` returns active Kimi built-ins for both `kimi-k2.6` and `kimi-k2.7-code`, and does not include `kimi-k2-thinking`.
- AC-003: GLM model info exposes `max_context_tokens: 1000000`, `max_input_tokens: 1000000`, `max_output_tokens: 128000`, and a config schema containing `thinking_type` and `reasoning_effort`.
- AC-004: A `GlmLLM` request configured with `thinking_type: "enabled"` and `reasoning_effort: "max"` sends provider-native `thinking: { type: "enabled" }` plus `reasoning_effort: "max"`, and does not send `thinking_type`.
- AC-005: A `GlmLLM` request configured with `thinking_type: "disabled"` sends provider-native disabled thinking and does not send a stale `reasoning_effort` value.
- AC-006: Direct `new GlmLLM()` sends `model: "glm-5.2"` in unit/integration request capture.
- AC-007: Direct `new KimiLLM()` sends `model: "kimi-k2.6"` in unit/integration request capture, preserving the general-purpose default.
- AC-008: Explicit Kimi K2.7 Code non-tool and tool requests do not auto-inject `thinking: { type: "disabled" }`, while K2.6 tool-workflow safety behavior remains covered for `kimi-k2.6`.
- AC-009: Kimi K2.7 Code request normalization prevents the shared default `LLMConfig.temperature = 0.7` from being sent as a provider-invalid value; any fixed K2.7 sampling keys sent by the adapter must match official allowed fixed values.
- AC-010: Active docs mention `glm-5.2`, `kimi-k2.6`, and `kimi-k2.7-code` with their provider-specific purposes/request-shape constraints; active docs no longer describe `glm-5.1` or `kimi-k2-thinking` as supported current built-ins.
- AC-011: Repository search over active source/tests/docs, excluding archival `tickets/done` and generated build outputs, finds no active support references to removed built-in IDs (`glm-5.1`, `kimi-k2-thinking`) except in explicit negative assertions.

## Constraints / Dependencies

- Official GLM docs are temporally unstable; the implementation should preserve the verification date in curated metadata/docs.
- Official Kimi docs distinguish `kimi-k2.7-code` from `kimi-k2.7-code-highspeed`; this scope chooses the non-highspeed coding model and retains `kimi-k2.6` for general-purpose use.
- The shared OpenAI-compatible request builder still applies generic `LLMConfig.temperature`; Kimi adapter normalization must compensate locally for K2.7 Code constraints.
- Frontend model config UI is schema-driven. If GLM schema gains `reasoning_effort`, schema detection/toggle tests may need updates so the UI does not misrepresent GLM thinking controls.

## Assumptions

- The requester wants Kimi K2.6 retained because Kimi K2.7 is coding-focused; high-speed K2.7 remains out of scope.
- Historical run records and archived ticket evidence are not considered active model support.
- Official model IDs are lower-case API values: `glm-5.2` and `kimi-k2.7-code`.

## Risks / Open Questions

- Kimi K2.7 Code requires preserving `reasoning_content` during multi-step tool-call loops; the current renderer/history model may already preserve provider-native reasoning, but API/E2E must validate this for Kimi.
- Kimi K2.7 Code rejects non-default sampling parameters; adapter policy must decide whether to override invalid generic defaults silently or omit them when possible.
- Kimi pricing table was not fully visible in the text snapshot of the official pricing page; implementation should avoid inventing pricing values unless it can verify them from an official rendered/source path.
- The RPA media schema bug is tracked outside this ticket. Do not reintroduce current-project schema-boundary changes as part of model-catalog delivery.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-001 | UC-001 |
| FR-002 | UC-003 |
| FR-003 | UC-006 |
| FR-004 | UC-004 |
| FR-005 | UC-004 |
| FR-006 | UC-002 |
| FR-007 | UC-003 |
| FR-008 | UC-006 |
| FR-009 | UC-005 |
| FR-010 | UC-001, UC-002, UC-006 |
| FR-011 | UC-001, UC-002, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | GLM catalog replacement visibility |
| AC-002 | Kimi catalog dual-purpose visibility |
| AC-003 | GLM metadata/config schema correctness |
| AC-004 | GLM enabled-thinking provider request shape |
| AC-005 | GLM disabled-thinking provider request shape |
| AC-006 | Direct GLM adapter default correctness |
| AC-007 | Direct Kimi adapter general-purpose default correctness |
| AC-008 | Kimi K2.6 retained behavior plus K2.7-safe behavior |
| AC-009 | Kimi K2.7 provider-safe sampling behavior |
| AC-010 | Documentation consistency |
| AC-011 | Clean-cut no-old-model support enforcement |

## Approval Status

User approved the refined model-catalog scope and later clarified that the RPA media schema failure must be fixed in the RPA project, not through current-project schema-boundary changes. This document has been reverted to that corrected scope.
