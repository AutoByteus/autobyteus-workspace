# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / user-approved for design

## Goal / Problem Statement

Fix the Daily Assistant failure when `Kimi / kimi-k2.7-code-highspeed` is selected, and address the underlying model-configuration design smell exposed by the bug.

The immediate failure is `400 invalid temperature: only 1 is allowed for this model`. The deeper issue is that model defaults, user/run overrides, and provider-fixed constraints are not represented or composed cleanly. In a healthy design, when the user does not explicitly set temperature, the effective temperature should come from model/default configuration, and provider adapters should enforce only true provider invariants rather than compensate for missing model-family config drift.

Also clarify the catalog semantics: `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` are two official Kimi API identifiers for the same Kimi K2.7 Code model family; HighSpeed is the faster serving variant, not an accidental duplicate.

## Investigation Findings

- Screenshot evidence shows `Kimi / kimi-k2.7-code-highspeed` fails with `400 invalid temperature: only 1 is allowed for this model`.
- Official Kimi docs and a live `/models` probe show both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` are real identifiers. Docs describe HighSpeed as the same K2.7 Code model with faster output speed.
- Official Kimi K2.7 Code docs require fixed sampling values: `temperature = 1.0`, `top_p = 0.95`, `n = 1`, `presence_penalty = 0.0`, `frequency_penalty = 0.0`, and tool choice `auto`/`none`.
- `KimiLLM` already enforces those fixed K2.7 values for exact model value `kimi-k2.7-code`, but not for `kimi-k2.7-code-highspeed`.
- The broader config flow is flawed:
  - `LLMModel.defaultConfig` exists, but Kimi K2.7 Code model rows currently store pricing only; they do not encode K2.7 fixed sampling defaults.
  - `LLMConfig` always defaults `temperature` to `0.7`, so it cannot distinguish “user did not set temperature” from “temperature is explicitly 0.7”.
  - `AutoByteusAgentRunBackendFactory` converts persisted run `llmConfig` with `new LLMConfig({ extraParams: llmConfig })`, so run config records are treated as extra parameters rather than parsed into first-class `LLMConfig` fields.
  - Because that conversion constructs a full `LLMConfig`, any non-null run config implicitly creates `temperature: 0.7`, which can override a model default even when the user did not set temperature.
  - User-provided `temperature` currently still reaches requests accidentally via `extraParams.temperature` overwriting earlier config parameters, not because the run config boundary parses it correctly.
- Therefore the bug should not be fixed only by adding one hardcoded high-speed branch; the target design should also tighten effective-config composition and model-family policy ownership.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + configuration-boundary refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `LLMConfig` currently acts as both full effective config and partial override, losing absence semantics. Server runtime wraps user config as `extraParams`, bypassing first-class config parsing. Kimi K2.7 fixed defaults/constraints are hardcoded in adapter for one identifier but not represented as a shared model-family policy used by both catalog rows and adapter normalization.
- Requirement or scope impact: The fix should introduce a clearer effective-config composition path: base defaults -> model defaults -> explicit user/run overrides -> provider invariant enforcement.

## Recommendations

- Create/extend a single owner for effective LLM config composition so runtime launch config is parsed as explicit overrides, not wrapped wholesale into `extraParams`.
- Preserve absence semantics for user/run config: if the user did not set `temperature`, the user config must not implicitly override model temperature with `0.7`.
- Encode Kimi K2.7 Code fixed sampling values as model-family policy/defaults shared by both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed`.
- Keep provider adapter enforcement for true provider invariants: if a user explicitly passes an invalid K2.7 temperature, the Kimi adapter should still coerce/normalize to provider-valid values instead of sending a request that will 400.
- Keep both K2.7 catalog rows because the provider exposes two official identifiers/routes; clarify labels if the UI/catalog can support friendlier names.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User selects `Kimi / kimi-k2.7-code-highspeed` and sends a normal Daily Assistant message without custom temperature.
- UC-002: User selects either K2.7 Code identifier; runtime composes provider-valid fixed sampling parameters.
- UC-003: User/run config explicitly sets a standard LLM field such as `temperature`; the config boundary handles it as an explicit override, not as accidental `extraParams` behavior.
- UC-004: User/run config is absent or lacks `temperature`; model defaults remain authoritative and are not overwritten by an implicit generic `0.7` override.
- UC-005: User opens the model selector/configuration and can understand that K2.7 Code HighSpeed is a high-speed serving variant of K2.7 Code.

## Out of Scope

- Adding unrelated Kimi models.
- Reworking non-AutoByteus runtimes unless investigation finds they share the same config-composition bug.
- Removing either official K2.7 Code row as a supposed duplicate.
- Changing provider pricing beyond preserving existing metadata unless implementation discovers a direct defect.

## Functional Requirements

- REQ-001: `kimi-k2.7-code-highspeed` must not send an invalid temperature; effective outgoing temperature must be `1.0` for Kimi K2.7 Code variants.
- REQ-002: `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` must share one K2.7 Code model-family policy for fixed sampling, thinking, and tool-choice constraints.
- REQ-003: The model registry/default-config layer must be able to express model-specific defaults for Kimi K2.7 Code variants instead of relying only on one-off adapter constants.
- REQ-004: Runtime/user `llmConfig` conversion must preserve explicitness: fields not present in the user/run config must not become implicit overrides.
- REQ-005: Standard LLM config fields in user/run config, including `temperature`, `top_p`, `max_tokens`, penalties, and stop sequences where supported, must be parsed into first-class `LLMConfig` fields rather than only copied into `extraParams`.
- REQ-006: Unknown/provider-specific user config keys must continue to flow through `extraParams` when appropriate.
- REQ-007: Effective config composition must follow this authority order: global/base defaults, then model defaults, then explicit user/run overrides, then provider invariant enforcement.
- REQ-008: Kimi K2.7 Code provider invariants must override invalid explicit user values rather than allowing provider 400s.
- REQ-009: Existing `kimi-k2.6` behavior must remain unchanged.
- REQ-010: The model selector/catalog must not imply that K2.7 Code and K2.7 Code HighSpeed are unrelated models or accidental duplicates; both visible rows must remain tied to their official identifiers.

## Acceptance Criteria

- AC-001: A Daily Assistant configured with `Kimi / kimi-k2.7-code-highspeed` no longer fails with `400 invalid temperature: only 1 is allowed for this model` due to request construction.
- AC-002: Request-capture coverage proves `kimi-k2.7-code-highspeed` sends `temperature: 1.0` when no user temperature is supplied.
- AC-003: Request-capture coverage proves an explicit invalid user temperature for high-speed K2.7 is normalized to provider-valid `1.0`.
- AC-004: Config-composition coverage proves an absent user temperature does not become an implicit `0.7` override over a model default.
- AC-005: Config-composition coverage proves a supported explicit user temperature for a non-fixed model is parsed as first-class `LLMConfig.temperature` and reaches the request correctly.
- AC-006: Unknown provider-specific config keys still flow through `extraParams`.
- AC-007: Existing K2.6 unit coverage still passes or is preserved.
- AC-008: The catalog still exposes both official identifiers (`kimi-k2.7-code`, `kimi-k2.7-code-highspeed`) unless the provider removes one; any display-name change keeps identifier/value unambiguous.
- AC-009: Focused build/test evidence exists for effective config composition plus Kimi K2.7 high-speed request behavior; live provider validation is attempted if credentials are available and classified if blocked.

## Constraints / Dependencies

- Kimi-specific provider invariants belong in the Kimi provider boundary or a Kimi-owned model-family policy, not in the generic OpenAI-compatible request builder.
- Effective config composition must not break provider-specific config schemas such as thinking/reasoning controls.
- No hidden compatibility aliases or duplicate fallback rows should be added.

## Assumptions

- The screenshot failure is caused by outgoing `temperature` not equal to `1.0`, most likely the generic `LLMConfig` default `0.7`.
- Kimi K2.7 Code HighSpeed shares the same fixed-parameter contract as Kimi K2.7 Code.
- Existing tests that store `{ temperature: ... }` in launch config reflect intended support for standard config fields in run/default launch configuration.

## Risks / Open Questions

- Refactoring `LLMConfig` absence semantics may affect multiple providers if done broadly; design should choose a bounded transition path.
- Some providers may rely on current extraParams behavior for standard-looking keys; coverage must distinguish first-class standard config fields from unknown provider-specific fields.
- UI may need a small catalog-label capability if raw identifiers remain too confusing for HighSpeed.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-007, REQ-008, REQ-009
- UC-002: REQ-001, REQ-002, REQ-003, REQ-008
- UC-003: REQ-004, REQ-005, REQ-006, REQ-007
- UC-004: REQ-003, REQ-004, REQ-007
- UC-005: REQ-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001: Exact end-user regression scenario.
- AC-002: No-custom-temperature high-speed default scenario.
- AC-003: Provider-invariant enforcement scenario.
- AC-004: Absence-semantics/model-default preservation scenario.
- AC-005: Standard explicit user override scenario for models where temperature is configurable.
- AC-006: Unknown provider-specific pass-through scenario.
- AC-007: K2.6 non-regression scenario.
- AC-008: Catalog clarity scenario.
- AC-009: Downstream executable evidence scenario.

## Approval Status

User approved the broadened design scope and requested ticket kickoff on 2026-06-26.

## Refinement: Global LLM Config Pattern

User clarified that the default/override/invariant pattern is not Kimi-specific and should apply to all LLM providers. This requirement is accepted as part of the ticket scope.

Global rule:

```text
base framework defaults
-> model registry defaultConfig
-> explicit user/run llmConfig overrides only
-> provider/model invariant enforcement
-> request builder/provider SDK
```

Implications:

- `LLMConfig` passed into provider instances must represent the effective merged config, not a lossy raw user config wrapper.
- Raw user/run `llmConfig` must be treated as a partial override for every provider, preserving absent fields as absent.
- Standard config keys such as `temperature`, `top_p`, `max_tokens`, penalties, stop sequences, and provider schema-backed fields must have consistent semantics across providers.
- Provider-specific invariants remain provider-owned: Kimi K2.7 fixed sampling is the first concrete invariant fixed by this ticket, but the composition boundary must be general.

## Refinement: Default-vs-Override Semantics

User clarified the desired framework semantics:

- If a field is not set by the model and not set by the user, the framework/base default is used.
- If a field is set by the model default and the user does not set it, the model default wins over the framework/base default.
- If a field is user-configurable and the user explicitly sets it, the user value wins over model/default values.
- If a provider/model declares a field as fixed/non-configurable, that is not a normal default; it is an invariant/constraint and user overrides should be blocked, validated, or normalized before the provider request.

Kimi K2.7 temperature is therefore a fixed provider invariant, not merely a preferred default. The registry/policy design should distinguish normal defaults from fixed constraints.
