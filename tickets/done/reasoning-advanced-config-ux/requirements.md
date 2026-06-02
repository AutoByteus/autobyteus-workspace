# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Improve the frontend run-configuration UX for individual-agent and agent-team launches so model reasoning controls are visible, internally consistent, and schema-default aware across providers.

The reported Codex/GPT-5.5 example exposes two user-facing inconsistencies:

1. `Advanced` is collapsed by default, so users may not recognize it is clickable and may never discover `Reasoning Effort` or other model settings.
2. The selected model label says `default reasoning: medium`, but after expanding `Advanced`, `Reasoning Effort` is blank instead of showing the effective `medium` default.

The clarified product rule is broader than Codex: the top-level `Thinking` row should reflect the selected model's effective default across providers. If the effective default has reasoning/thinking enabled, `Thinking` should show ON and primary/global `Advanced` should open by default. If the effective default has no reasoning/thinking, `Thinking` should show OFF and primary/global `Advanced` should start collapsed while remaining discoverable and openable. This must apply to other reasoning-capable models as well, including AutoByteus DeepSeek V4 Flash.

## User Clarification Incorporated

On 2026-06-02, after the initial Codex-focused analysis, the user clarified:

- Codex GPT-5.5 default `medium` reasoning means the `Thinking` toggle/state should be ON by default.
- The rule is not Codex-specific; DeepSeek and other providers must be analyzed the same way.
- If a model default already has reasoning, `Advanced` should be open and `Thinking` should be ON.
- If a model default has no reasoning, `Thinking` should be OFF.
- The first refinement briefly treated primary/global `Advanced` as always-open for discoverability, but a post-validation clarification superseded that broader rule.

Post-validation clarification on 2026-06-02:

- `Thinking` ON by default -> primary/global `Advanced` open by default.
- `Thinking` OFF by default -> primary/global `Advanced` collapsed initially.
- User toggles `Thinking` ON -> `Advanced` opens automatically.
- Compact member override sections should not blindly follow global disclosure state; they should remain collapsed by default while syncing inherited effective values/state.

This refinement supersedes both the earlier recommendation to hide the Codex top-level thinking row for effort-only schemas and the later always-open primary/global advanced rule. Codex may still be non-disable-capable if the schema lacks an OFF/`none` value, but its default reasoning state must not render as OFF.

## Investigation Findings

- The frontend path is shared: `RunConfigPanel -> AgentRunConfigForm/TeamRunConfigForm -> RuntimeModelConfigFields -> ModelConfigSection -> ModelConfigAdvanced`.
- For editable agent/team launch forms, `advancedInitiallyExpanded` has historically been false; it is passed as true mainly for read-only existing-run inspection. Therefore new primary/global launches collapse model advanced settings by default.
- Live backend GraphQL for `runtimeKind: "codex_app_server"` returns Codex GPT-5.5 with `reasoning_effort.default_value/default: "medium"` and enum values `low`, `medium`, `high`, `xhigh`.
- Backend Codex normalization already maps app-server model-list reasoning metadata into model display labels and schema defaults. Backend Codex thread bootstrap uses explicit `llmConfig.reasoning_effort` when supplied and otherwise sends `effort: null`, leaving the Codex app-server model default in effect.
- Live backend GraphQL for `runtimeKind: "autobyteus"` returns AutoByteus DeepSeek V4 Flash and Pro with:
  - `thinking_type.default: "enabled"`, enum `enabled | disabled`.
  - `reasoning_effort.default: "high"`, enum `high | max`.
- DeepSeek source code maps flat UI config to provider payload through `extra_body.thinking.type`; when `thinking_type` is `disabled`, it omits `reasoning_effort` rather than sending an unsupported OpenAI-style `none`.
- A provider-wide schema inventory found additional schema-backed cases that must be handled by the same generic rule:
  - AutoByteus OpenAI Responses models expose `reasoning_effort`/`reasoning_summary` defaults of `none`, so they should show `Thinking = OFF` by default even though the same model family under Codex App Server can default to `medium`.
  - AutoByteus Claude models expose `thinking_enabled=false` plus budget/display fields, so `thinking_enabled` is the governing OFF default.
  - Claude Agent SDK runtime models expose `thinking_enabled=false` plus `reasoning_effort=medium`; this mixed shape must be classified as Claude-style, not OpenAI-style, because `thinking_enabled=false` gates the effort field.
  - AutoByteus Gemini API models expose `thinking_level=minimal` and `include_thoughts=false`, so they should show `Thinking = OFF` by default.
  - Browser/RPA Gemini models expose `thinking_level=medium` only, so they should show `Thinking = ON` by default and be disable-capable if `minimal` is in the enum.
  - GLM exposes `thinking_type=enabled`, so it should show `Thinking = ON` by default and be disable-capable when `disabled` is in the enum.
- The same inventory found model entries whose names contain `thinking`/`reasoning` but whose catalog rows expose no config schema or machine-readable default metadata, including built-in Grok/Kimi reasoning models, some AutoByteus RPA models, and LM Studio local models. The frontend cannot generically prove default thinking state for these from schema; it must not infer from display names. If product needs a visible `Thinking = ON` state for those models, the model catalog/runtime must expose schema-backed or model-metadata-backed reasoning defaults.
- Post-validation clarification changed the disclosure invariant: primary/global advanced settings should no longer open merely because advanced schema parameters exist. They should open initially when the effective thinking state is ON, and should remain initially collapsed when effective thinking is OFF or when no schema-backed thinking state exists.
- The Codex `Reasoning Effort` blank mismatch is frontend-owned: `ModelConfigAdvanced` historically fell back to a `__default__` sentinel when config was undefined even if the schema provided a valid default, while the template omitted the `Default` option when a schema default existed.
- Current implementation state after validation contains changes based on the now-superseded always-open primary/global advanced rule. Those changes must be reworked to match this refined cross-provider disclosure rule.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus local select-default implementation defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed as a small local tightening inside the existing shared model-config utilities/components
- Evidence basis: User screenshots and clarification; frontend source reads; live GraphQL schema probes for Autobyteus, Codex App Server, and Claude Agent SDK runtimes; backend/provider source reads; relevant backend/frontend tests.
- Requirement or scope impact: The target behavior must be schema/default driven and provider-aware without hardcoding GPT-5.5 or DeepSeek model names. It must apply through the shared individual-agent and team-global model-config path, with compact member override disclosure handled separately from inherited effective state.

## Recommendations

- In primary/non-compact agent and agent-team global launch configuration, initialize `Advanced` from effective thinking state: open when effective `Thinking` is ON; collapsed when effective `Thinking` is OFF or unavailable.
- Compute the top-level `Thinking` state from the effective model config value: explicit user config first, otherwise valid schema default, otherwise an OFF/no-reasoning baseline.
- Show `Thinking` ON when effective defaults indicate reasoning/thinking is enabled, including Codex GPT-5.5 `reasoning_effort: medium` and DeepSeek V4 Flash `thinking_type: enabled`.
- Show `Thinking` OFF when effective defaults indicate no reasoning/thinking, such as explicit/default `none`, `disabled`, `false`, or provider-specific minimal/no-thinking values; primary/global `Advanced` should start collapsed for these OFF cases.
- When a user toggles a schema-supported `Thinking` control ON, open `Advanced` automatically. Do not automatically collapse it merely because a user toggles OFF after already inspecting controls.
- Distinguish “thinking is currently ON” from “the UI can disable thinking for this provider/schema.” If a schema has reasoning enabled by default but does not advertise a valid OFF value, the UI must not send unsupported OFF config. It may render the ON state as read-only/non-disable-capable with explanatory helper text while still opening advanced settings for effort selection.
- Render schema defaults as effective UI values. For GPT-5.5, `Reasoning Effort` should display `medium`/`Medium` when config is unset; for DeepSeek V4 Flash, it should display `high` when thinking is enabled and unset.
- Treat `thinking_enabled` as a gating key when it coexists with `reasoning_effort`; effort defaults must not turn Claude-style schemas ON while `thinking_enabled` is effectively false.
- Do not infer thinking state from model/display names such as `*-thinking` or `*-reasoning`; use machine-readable schema/default metadata. Catalog entries that need visible default thinking state must expose that metadata.
- Keep member override sections compact/collapsed by default while syncing effective inherited state/value display; open a member's advanced controls only for explicit member-local ON toggles or explicit member model/runtime changes to an effective ON model.
- Keep backend behavior unchanged unless validation proves a runtime does not honor its advertised default. Current backend metadata and explicit override propagation are the correct source of truth.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens an individual agent run configuration and selects a reasoning-capable model with a reasoning-enabled default, such as Codex GPT-5.5.
- UC-002: A user opens an agent-team global run configuration and selects a reasoning-capable model with a reasoning-enabled default.
- UC-003: A user selects AutoByteus DeepSeek V4 Flash and needs the default `thinking_type=enabled` / `reasoning_effort=high` state to be visible and understandable.
- UC-004: A user selects a model whose default has no reasoning and needs the `Thinking` row to show OFF rather than implying reasoning is active.
- UC-005: A user changes reasoning effort from the model default to a supported non-default value and expects that explicit override to be sent to the runtime/backend.
- UC-006: A user toggles a schema-supported thinking enable/disable control and expects related advanced controls to remain/open visible.
- UC-007: A team member override inherits global model/config and, when inspected or expanded, should display effective schema defaults without materializing unintended member overrides.
- UC-008: A user selects schema-backed Claude, Gemini, GLM, OpenAI, Codex, DeepSeek, or runtime-provided models and expects the same effective-default logic to apply.
- UC-009: A user selects a reasoning-named model whose catalog row has no schema/default metadata; the UI must avoid guessing from the name and should only show a thinking state if the catalog exposes machine-readable metadata.
- UC-010: A user opens primary/global config for a model whose effective thinking state is OFF and expects `Advanced` to start collapsed while remaining openable.
- UC-011: A user inspects team member overrides after changing global model/config and expects inherited effective state/value display to sync without opening every member's advanced section or materializing overrides.

## Out of Scope

- Adding new models, providers, or reasoning levels.
- Inventing frontend name-based heuristics for models whose catalog rows do not expose machine-readable thinking/reasoning defaults.
- Changing Codex app-server semantics for `defaultReasoningEffort`, `supportedReasoningEfforts`, `turn/start.effort`, or `effort: null`.
- Adding a real Codex OFF state unless the Codex schema/backend advertises a supported OFF/`none` value. The frontend must not invent unsupported runtime values.
- Redesigning workspace, file explorer, terminal, activity, or unrelated agent/team form sections.
- Inferring defaults for read-only historical runs whose backend metadata explicitly lacks `llmConfig`; historical missing-config guard remains in scope only to prevent false persisted-value display.
- Expanding every compact team member override by default, including when a member merely inherits global `Thinking` ON state.

## Functional Requirements

- REQ-001: The individual-agent and agent-team global run configuration UI must initialize advanced model settings from effective thinking state: open by default when effective `Thinking` is ON, and collapsed initially when effective `Thinking` is OFF or unavailable.
- REQ-002: The UI must render schema defaults as effective display values when no explicit config value is present.
- REQ-003: For Codex GPT-5.5, unset `llmConfig.reasoning_effort` with schema default `medium` must display `Reasoning Effort = Medium/medium`.
- REQ-004: For AutoByteus DeepSeek V4 Flash, unset config with schema defaults `thinking_type=enabled` and `reasoning_effort=high` must display `Thinking = ON` and `Reasoning Effort = High/high`.
- REQ-005: The top-level `Thinking` state must be derived from explicit config first and valid schema defaults second across supported provider schema shapes.
- REQ-006: A model whose effective default has no reasoning/thinking must show `Thinking = OFF`.
- REQ-007: A model whose effective default has reasoning/thinking enabled must not show `Thinking = OFF` merely because `llmConfig` is unset.
- REQ-008: The UI must distinguish disable-capable thinking controls from read-only/non-disable-capable thinking state. It must not emit unsupported values such as `reasoning_effort="none"` when the selected schema does not advertise them.
- REQ-009: When a schema-supported thinking toggle is changed from OFF to ON by the user, related advanced controls must become open automatically.
- REQ-010: Explicit user changes to reasoning effort must be reflected in `llmConfig.reasoning_effort` and backend/runtime configuration.
- REQ-011: Default/effective-value rendering must work through the shared model-config path used by individual-agent runs, team global runs, and member override model config displays.
- REQ-012: Non-reasoning models or schema parameters without defaults must preserve current `Default`/unset behavior and must not show stale reasoning selections.
- REQ-013: Read-only historical missing-config behavior must remain guarded: when historical metadata has no `llmConfig`, the UI must continue to avoid inventing a persisted value unless the config was actually recorded.
- REQ-014: Schemas that contain both `thinking_enabled` and `reasoning_effort` must use `thinking_enabled` as the thinking ON/OFF gate; the `reasoning_effort` default must remain an advanced depth value and must not alone turn thinking ON.
- REQ-015: The frontend must not infer thinking state from model identifiers or display names. Reasoning-named models with no config schema or machine-readable default metadata must not show a guessed `Thinking = ON` state; their provider/catalog owner must expose metadata if that state should be visible.
- REQ-016: Compact member override sections must remain collapsed by default even when they inherit effective global `Thinking = ON`; inherited effective values/state must display or become available without materializing `memberOverrides` or explicit member `llmConfig`.
- REQ-017: If a user explicitly toggles `Thinking` ON for a member override, or explicitly selects a member runtime/model whose effective thinking state is ON, that member's advanced controls must open automatically.

## Acceptance Criteria

- AC-001: Given Codex runtime and `OpenAI / GPT-5.5 (default reasoning: medium)`, when an agent-team global launch config is opened, `Advanced` is open and the reasoning controls are visible without an initial click.
- AC-002: Given the same Codex team config with unset `llmConfig.reasoning_effort`, the top-level `Thinking` state is ON and `Reasoning Effort` displays `Medium/medium`, not blank and not `low`.
- AC-003: Given an individual-agent launch config with the same Codex runtime/model/schema, the same open advanced, ON thinking state, and visible `Medium` default behavior applies.
- AC-004: Given AutoByteus runtime and `deepseek-v4-flash` with unset config, the top-level `Thinking` state is ON, `Advanced` is open in primary/global config, and `Reasoning Effort` displays `High/high`.
- AC-005: Given a primary/global schema whose effective default is disabled/no-thinking, the top-level `Thinking` state is OFF and `Advanced` is collapsed initially.
- AC-006: Given a schema that does not advertise a valid OFF value, the UI does not emit unsupported OFF config when the user interacts with or inspects the thinking control.
- AC-007: Given a schema with a real thinking enable/disable value, changing the toggle from OFF to ON emits the provider-correct config and opens advanced model controls.
- AC-008: Given a user changes `Reasoning Effort` to another supported value such as Codex `high`/`xhigh` or DeepSeek `max`, the launch config emits/persists that explicit value.
- AC-009: Given a non-reasoning advanced schema such as only Codex `service_tier`, `Advanced` is collapsed initially, existing `Default` option behavior remains available when expanded, and no stale reasoning state is shown.
- AC-010: Existing read-only selected-run behavior continues to pass: advanced settings remain inspectable and missing historical config still renders `Not recorded for this historical run`.
- AC-011: Given Claude Agent SDK or another Claude-style primary/global schema with `thinking_enabled=false` and `reasoning_effort=medium`, the top-level `Thinking` state is OFF, `Advanced` is collapsed initially, and `Reasoning Effort` displays `Medium/medium` only as an advanced depth default when expanded.
- AC-012: Given a primary/global Gemini schema with `thinking_level=medium` and no `include_thoughts`, the top-level `Thinking` state is ON and `Advanced` opens by default; given `thinking_level=minimal` and `include_thoughts=false`, `Thinking` is OFF and `Advanced` is collapsed initially.
- AC-013: Given GLM `thinking_type=enabled`, the top-level `Thinking` state is ON and can be toggled OFF only if `disabled` is advertised.
- AC-014: Given a model identifier/display name containing `thinking` or `reasoning` but no schema/default metadata, the UI does not infer a fake `Thinking = ON` state from the name and primary/global `Advanced` is not opened by a name-only inference.
- AC-015: Given a member inherits global `Thinking = ON`, its effective state/value display updates but its advanced controls remain collapsed until the user explicitly expands or configures that member.
- AC-016: Given a user explicitly toggles `Thinking` ON for a member override or explicitly selects an effective-ON member model, that member's advanced controls open and no inherited/default values are materialized unless the user made an explicit member override.
- AC-017: Backend unit coverage for Codex model normalization/explicit effort propagation and DeepSeek thinking payload mapping remains stable; no backend regression is introduced.

## Constraints / Dependencies

- Use backend-provided model config schema, and only future explicit model-level metadata if added, as the source of truth; do not hardcode GPT-5.5, DeepSeek V4 Flash, `*-thinking`, `*-reasoning`, or provider-specific model names in UI behavior.
- Keep agent/team parity by changing the shared `RuntimeModelConfigFields` / `ModelConfigSection` / `ModelConfigAdvanced` path rather than duplicating fixes in individual forms.
- Preserve member override inheritance semantics; inherited global config must not become an explicit member override merely because the UI displays an inherited/effective default.
- Preserve non-thinking `Default` option behavior for fields such as Codex `service_tier`.
- Existing Nuxt tests require `pnpm -C autobyteus-web exec nuxt prepare` before direct Vitest execution in a fresh worktree.

## Assumptions

- For current Codex app-server models, `turn/start.effort = null` means the Codex runtime uses the model default advertised by `defaultReasoningEffort`.
- GPT-5.5 currently advertises default reasoning `medium` and supported efforts `low`, `medium`, `high`, `xhigh`.
- DeepSeek V4 Flash currently advertises default `thinking_type=enabled` and `reasoning_effort=high`.
- Some reasoning-named built-in/custom/local models currently expose no machine-readable thinking defaults; this UI design treats those as metadata gaps rather than inferring from names.
- Product intent is to make reasoning state visible and consistent; where a provider cannot disable thinking through schema, the UI should not invent unsupported off semantics.

## Risks / Open Questions

- Codex GPT-5.5 currently exposes effort levels but no advertised OFF/`none` value. The refined UX should show thinking ON because default reasoning is medium, but true user-disabling remains impossible unless the schema/backend adds a supported OFF value.
- A broader provider-thinking cleanup may still be desirable because provider schemas represent thinking with different keys (`reasoning_effort`, `reasoning_summary`, `thinking_type`, `thinking_enabled`, `thinking_budget_tokens`, `thinking_display`, `thinking_level`, `include_thoughts`), but this task should keep the shared adapter focused and schema-driven.
- Reasoning-named models without schema/default metadata cannot be fixed generically by frontend display logic. If those should show `Thinking = ON`, the provider/catalog owner must add machine-readable metadata or schema.
- Mobile and definition launch preference surfaces reuse parts of the same shared component path; implementation should validate that conditional primary/global advanced disclosure and compact member disclosure remain usable there.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 |
| REQ-002 | UC-001, UC-002, UC-003, UC-007 |
| REQ-003 | UC-001, UC-002 |
| REQ-004 | UC-003 |
| REQ-005 | UC-001, UC-002, UC-003, UC-004 |
| REQ-006 | UC-004 |
| REQ-007 | UC-001, UC-002, UC-003 |
| REQ-008 | UC-001, UC-005, UC-006 |
| REQ-009 | UC-006 |
| REQ-010 | UC-005 |
| REQ-011 | UC-001, UC-002, UC-003, UC-007 |
| REQ-012 | UC-004 |
| REQ-013 | UC-007 |
| REQ-014 | UC-004, UC-008 |
| REQ-015 | UC-009 |
| REQ-016 | UC-011 |
| REQ-017 | UC-011 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Team-run discoverability for the collapsed-advanced screenshot scenario |
| AC-002 | Correct Codex effective reasoning default and ON thinking state |
| AC-003 | Individual-agent parity |
| AC-004 | DeepSeek cross-provider default-thinking behavior |
| AC-005 | No-reasoning defaults render OFF |
| AC-006 | Guard provider schemas that cannot disable thinking |
| AC-007 | Real toggle-to-open behavior where the provider schema supports it |
| AC-008 | Explicit override propagation |
| AC-009 | Guard non-reasoning defaults such as Fast mode |
| AC-010 | Preserve selected-run/history behavior |
| AC-011 | Claude mixed-schema gating precedence and OFF disclosure collapse |
| AC-012 | Gemini variants: API default OFF/collapsed and RPA default ON/open |
| AC-013 | GLM default ON and schema-supported OFF |
| AC-014 | No name-based fake thinking state or name-only open behavior |
| AC-015 | Member inherited ON state remains compact |
| AC-016 | Explicit member-local ON action opens member advanced without unintended materialization |
| AC-017 | Confirm backend remains stable and source-of-truth metadata is intact |

## Approval Status

Refined from explicit user clarification on 2026-06-02. No separate approval round was requested; downstream review should route any remaining requirement gap back to `solution_designer`.
