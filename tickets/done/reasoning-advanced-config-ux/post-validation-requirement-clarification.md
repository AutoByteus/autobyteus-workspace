# Post-Validation Requirement Clarification

## Trigger

After API/E2E validation passed under the reviewed design, the user clarified the desired reasoning/advanced disclosure journey.

Date: 2026-06-02
Classification: Requirement Gap / Design Impact

## Current Validated Behavior

The validated implementation currently uses this primary/global rule:

- If a selected model has advanced schema parameters, the primary/global `Advanced` section opens by default.
- This applies even when the effective `Thinking` state is OFF.
- If thinking is ON by default, the `Thinking` row shows ON and advanced controls are open.
- If thinking is OFF by default but enable-capable, the `Thinking` row shows OFF and advanced controls are still open.
- Member override compact advanced sections stay collapsed by default while displaying inherited effective values when expanded; expanding inherited defaults does not materialize member overrides.

## User-Clarified Desired Primary/Global Journey

The user clarified this is the desired behavior:

1. `Thinking` ON by default -> `Advanced` open by default.
2. `Thinking` OFF by default -> `Advanced` collapsed initially.
3. User toggles `Thinking` ON -> `Advanced` opens automatically.

This supersedes the previous broader discoverability-first rule that primary/global advanced settings should generally open whenever advanced schema parameters exist.

## Member Override Recommendation

Member override behavior should sync effective values with primary/global config, but should not blindly sync disclosure/expanded state.

Recommended member behavior:

- Non-overridden members should inherit and display the effective global runtime/model/thinking state.
- Member advanced controls should remain compact/collapsed by default to avoid expanding many repeated member forms.
- If a member inherits global `Thinking` ON, the member row/card can show a concise inherited `Thinking ON` state, but its advanced controls should remain collapsed until the user focuses/expands that member.
- If the user explicitly toggles `Thinking` ON for a member override, that member's advanced controls should open automatically.
- If the user explicitly changes a member's runtime/model to a model whose effective thinking state is ON, it is reasonable to open that member's advanced controls because the user is actively configuring that member.
- Expanding a member's inherited/default advanced values must not materialize `memberOverrides` or inherited/default `llmConfig`.
- If global config changes, non-overridden member effective display should update; explicitly overridden member fields should remain overridden and visibly marked as such.

## Impact

The current implementation passed validation for the reviewed requirement, but it does not match the new primary/global rule for models whose effective thinking state is OFF. The implementation should be revisited before delivery.

Likely required changes:

- Update `ModelConfigSection` advanced default-open logic so primary/global advanced is initially open only when effective thinking is ON, unless another caller explicitly requests expansion.
- Keep advanced collapsed when thinking is OFF by default.
- Ensure supported `Thinking` toggle interactions still set `showAdvancedParams = true` when toggled ON.
- Preserve member compact behavior and inheritance/non-materialization guarantees.
- Update focused tests for OpenAI Responses OFF, Claude SDK OFF, Gemini API OFF, and any non-thinking advanced schema to expect collapsed initial advanced in primary/global config.
- Retain tests where Codex GPT-5.5, DeepSeek enabled/high, Gemini RPA medium-only, and GLM enabled default to advanced open.

## Affected Existing Artifacts

- Validation report passed under superseded criteria: `/Users/normy/autobyteus_org/autobyteus-worktrees/reasoning-advanced-config-ux/tickets/done/reasoning-advanced-config-ux/api-e2e-validation-report.md`
- Requirements/design likely need refinement before implementation rework.
