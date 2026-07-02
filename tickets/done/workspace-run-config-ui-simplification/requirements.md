# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / Design-ready — sixth delivery-verification re-entry revision captured on 2026-07-01 PDT.

## Goal / Problem Statement

Improve the AutoByteus Workspace team-run configuration UI so common launch defaults are visible, member overrides are discoverable and navigable, model configuration defaults behave predictably, workspace selection is visually clear, and the final `Run Team` action carries enough context for a confident launch.

The current delivery-held implementation already includes prior accepted changes: team-related controls are grouped under `Team Definition`; `Team run defaults` opens by default and uses a unified card; defaults use `Edit Team Default` copy and direct model-config summaries; team `Auto approve tools` appears before member overrides; the footer has a compact team launch summary; member overrides use independent expandable cards with no redundant empty chip, whole-card framing, human-readable auto-approve labels, model-config content/fallback, flat member model-config fields, and reset confirmation; Thinking defaults ON in team/agent launch config; and read-only/materialization behavior is preserved.

Sixth delivery-stage user verification identified three remaining gaps that must be resolved before finalization:

1. `Workspace Directory` Existing/New segmented control should be left-aligned with the section/form left edge, while each equal-width segment centers its own text/icon horizontally and vertically.
2. The `Run Team` summary strip should keep member/runtime/model and add team auto-approve state, workspace state, and an orange member-override navigation tag when overrides exist. The override tag should include one/two member names when count is one/two, count only for more than two, and click/scroll/focus to relevant member card(s). No tag should render when no overrides exist.
3. Member override model-config Thinking should default ON for effective member runtime/model contexts that support Thinking, such as Claude Agent SDK / Anthropic Sonnet, when no explicit current/persisted thinking state overrides that default.

The UI must still preserve launch semantics: team runs require an effective model before launch, per-member records must still materialize complete runtime/model/config values, and read-only selected/historical inspection must not mutate config.

## Investigation Findings

- Worktree: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`.
- Branch: `codex/workspace-run-config-ui-simplification`, tracking `origin/personal`.
- Current HEAD: `ff088189392fe0dc1238a8b21e74cf90bfed6ded`; integrated base recorded by delivery: `origin/personal` at `57185192d4b93840dab1fb7134604b1716a600a8`.
- Delivery artifacts and implementation files are dirty because round-6 work had passed checks and delivery then recorded verification feedback 6; no finalization, push, merge, cleanup, release, or deployment has occurred.
- `WorkspaceSelector.vue` currently wraps the mode pill in `class="mb-3 flex justify-center"`, which centers the whole control. Buttons are content-width, not guaranteed equal-width. Feedback 6 asks for left-aligned control and centered contents inside equal-width segments.
- `TeamRunLaunchSummary.vue` currently renders only member count, runtime, and model chips. `teamRunConfigPresentation.ts` currently exposes only `memberCount`, `runtimeLabel`, and `modelIdentifier` for launch summary.
- `RunConfigPanel.vue` owns the sticky footer and already renders `TeamRunLaunchSummary.vue`; it has access to effective team config, active team definition, workspace store, pending workspace input mode/path, and can call into the rendered `TeamRunConfigForm.vue` via a typed component ref.
- `TeamRunConfigForm.vue` owns the member override section expansion state and recursive member tree; it is the right owner to expose a focus/navigation method that expands the section and scrolls/focuses relevant member cards without letting footer summary query internal DOM directly.
- `MemberOverrideTree.vue` owns recursive traversal and `MemberOverrideItem.vue` owns leaf card shell. Leaf cards need stable route-key anchors/data attributes/focusability for navigation.
- `MemberOverrideItem.vue` passes `ModelConfigSection` for effective member model config but does not pass the round-5 default-on Thinking opt-in. As a result, member override contexts can show supported Thinking OFF even though team/agent launch defaults now opt in.
- `ModelConfigSection.vue` and `llmThinkingConfigAdapter.ts` already own provider-aware default-on Thinking when opted in. The member fix should reuse that boundary rather than duplicating Claude/Anthropic logic in `MemberOverrideItem.vue`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Enhancement with a local correctness bug in member override Thinking defaults.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes. Feedback 6 adds footer-to-form navigation behavior and expands launch summary data ownership; member Thinking default reveals an opt-in propagation gap in the shared model-config boundary.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for footer summary navigation; Missing Invariant/Local Implementation Defect for member override Thinking default opt-in; Local Implementation Defect for workspace segment alignment.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to existing frontend owners and presentation utilities.
- Evidence basis: `delivery-user-verification-feedback-6.md` plus source inspection of `WorkspaceSelector.vue`, `RunConfigPanel.vue`, `TeamRunLaunchSummary.vue`, `teamRunConfigPresentation.ts`, `TeamRunConfigForm.vue`, `MemberOverrideTree.vue`, `MemberOverrideItem.vue`, `RuntimeModelConfigFields.vue`, `ModelConfigSection.vue`, and `llmThinkingConfigAdapter.ts`.
- Requirement or scope impact: Add sixth re-entry acceptance criteria while preserving validated behavior from all prior rounds.

## Recommendations

- Update `WorkspaceSelector.vue` directly: left-align the mode control wrapper and make the two segment buttons equal width with `inline-flex items-center justify-center` content alignment.
- Extend `TeamRunLaunchSummaryPresentation` in `teamRunConfigPresentation.ts` to include auto-approve state, workspace summary, and optional member override tag data with route keys.
- Keep `TeamRunLaunchSummary.vue` display-only: render summary items separated by `·`; render the member override tag as an orange button only when overrides exist; emit a `focus-overrides` event with route keys.
- Let `RunConfigPanel.vue` own footer click handling and summary derivation inputs, but delegate member-card navigation to a public method exposed by `TeamRunConfigForm.vue`.
- Let `TeamRunConfigForm.vue` expand the member override section and focus/scroll relevant cards using route-key anchors owned by `MemberOverrideTree.vue`/`MemberOverrideItem.vue`.
- Pass `default-thinking-on-when-supported` from `MemberOverrideItem.vue` to its member `ModelConfigSection`, preserving explicit member/global off state and read-only no-mutation behavior through the existing model-config boundary.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium within frontend UI scope. The changes are localized but introduce footer-to-form navigation and extend presentation DTOs/tests.

## In-Scope Use Cases

- See the Workspace Directory Existing/New segmented control aligned to the section left edge while each segment has centered icon/text and equal width.
- Review Run Team summary with member count, runtime, model, auto-approve state, and workspace state.
- See an orange member override summary tag only when overrides exist.
- For one or two overrides, see names in the override tag; for more than two, see count only.
- Click the override tag and have the UI expand/open member overrides, scroll/focus to relevant member card(s), and preserve nested member identity.
- Open a member override card with effective Claude Agent SDK / Anthropic Sonnet (or any thinking-capable model) and see Thinking default ON when no explicit thinking state exists.
- Preserve explicit Thinking off states, read-only inspection, reset confirmation, flat model-config fields, and launch materialization.

## Out of Scope

- Changing backend run/team APIs or payload shapes.
- Changing `MemberConfigOverride` shape.
- Adding new model schema definitions or provider catalogs.
- Changing launch readiness policy.
- Replacing all product segmented controls with a design-system component.
- Adding footer summary navigation for non-team/agent-run summaries beyond this team override tag.
- Persisting run-level edits back into team definitions beyond existing flows.

## Functional Requirements

- `REQ-001`: The team-run form must preserve prior accepted section order and launch semantics.
- `REQ-002`: Workspace Directory Existing/New segmented control must be left-aligned with the section/form left edge.
- `REQ-003`: Existing/New segment buttons must have equal width, and their icon/text content must be centered horizontally and vertically inside each segment.
- `REQ-004`: Workspace selector selected, disabled, error, locked, existing-mode guidance, and existing/new event behavior must remain unchanged.
- `REQ-005`: Run Team summary must retain member count, runtime, and model items.
- `REQ-006`: Run Team summary must add team auto-approve state, rendering a human-readable On/Off value based on the effective team-level `autoExecuteTools` setting.
- `REQ-007`: Run Team summary must add workspace state, distinguishing existing workspace with name when available from new workspace mode/path state; if neither is ready, it must show a clear required/unset state without becoming the readiness authority.
- `REQ-008`: Summary items must be visually consistent with the existing compact chip/pill style and separated with `·`.
- `REQ-009`: Run Team summary must render an orange member override tag only when meaningful member overrides exist.
- `REQ-010`: The override tag label must include member names when there are one or two meaningful overrides and count-only text when there are more than two meaningful overrides.
- `REQ-011`: The override tag must carry stable member route keys, not only display names, so nested member identity is preserved.
- `REQ-012`: Clicking the override tag must expand/open the member override section if needed and scroll/focus to the relevant member card(s), at minimum the first matching card, without breaking nested member identities.
- `REQ-013`: Footer summary display must not own member override section state directly; it must delegate navigation through the team form boundary.
- `REQ-014`: Member override leaf cards must expose stable route-key anchors/focus targets for navigation.
- `REQ-015`: Member override `ModelConfigSection` must default Thinking ON when the effective member runtime/model supports Thinking and no explicit current/persisted thinking state exists.
- `REQ-016`: Member override Thinking default-on behavior must reuse the existing `ModelConfigSection` / `llmThinkingConfigAdapter.ts` provider-aware boundary and must not duplicate provider-specific logic in member components.
- `REQ-017`: Explicit current/persisted Thinking state must be preserved in member override context, including explicit off states inherited from global config or set in member `llmConfig`.
- `REQ-018`: Member override Thinking default-on behavior must not mutate read-only selected/historical config or disabled forms.
- `REQ-019`: Existing validated behavior must remain intact: no redundant member empty chip, whole-card member framing, flat team/member model-config fields, human auto-approve labels, reset confirmation, missing-model blocking, read-only inspection, localization guards, and first-send complete member config materialization.
- `REQ-020`: Tests must cover sixth-feedback behavior: workspace segment alignment, expanded Run Team summary data, override tag rendering/navigation, and member override Thinking default ON.

## Acceptance Criteria

- `AC-001`: Given Workspace Directory renders, the Existing/New segmented control wrapper is left-aligned with the form field edge, not centered.
- `AC-002`: Given Workspace Directory renders, `Existing` and `New` buttons have equal width and use centered flex alignment for icon/text both horizontally and vertically.
- `AC-003`: Given the Run Team footer summary renders, it still includes member count, runtime, and model.
- `AC-004`: Given team auto approve is off/on, the Run Team footer summary includes `Auto approve: Off` / `Auto approve: On` or equivalent localized text.
- `AC-005`: Given an existing workspace is selected, the Run Team footer summary includes workspace state with existing mode and workspace name when available, e.g. `Workspace: Existing (Temp Workspace)`.
- `AC-006`: Given new workspace mode is active, the Run Team footer summary includes `Workspace: New` or equivalent localized text.
- `AC-007`: Given no meaningful member overrides exist, the Run Team footer summary does not render an override tag.
- `AC-008`: Given one meaningful member override exists, the Run Team footer summary renders an orange clickable tag with count and that member name.
- `AC-009`: Given two meaningful member overrides exist, the override tag renders both member names.
- `AC-010`: Given more than two meaningful member overrides exist, the override tag renders count-only text and does not list all names.
- `AC-011`: Given the override tag is clicked while member overrides are collapsed, the member override section expands and the first relevant member card is scrolled/focused.
- `AC-012`: Given overridden members are nested inside subteams, clicking the override tag targets route-key-specific leaf cards rather than ambiguous display-name matches.
- `AC-013`: Given a member override card uses effective runtime `Claude Agent SDK` and model `Anthropic / Sonnet` with no explicit thinking state, the Thinking switch initializes ON.
- `AC-014`: Given any member override effective model supports Thinking and no explicit thinking state exists, Thinking initializes ON through the shared model-config boundary.
- `AC-015`: Given a member or inherited global config explicitly disables Thinking for that effective model, the member override Thinking switch remains OFF and is not overwritten by default-on logic.
- `AC-016`: Given read-only selected/historical team config, member override Thinking default-on logic does not emit mutations.
- `AC-017`: Given prior validated behavior, human `Auto Approve Override` labels, reset confirmation, flat model-config fields, missing-model blocking, read-only inspection, localization guards, and first-send complete member config materialization remain intact.

## Constraints / Dependencies

- `RunConfigPanel.vue` owns the footer and may hold a ref to `TeamRunConfigForm.vue`; it must not query member-card internals directly.
- `TeamRunConfigForm.vue` owns member override section expansion and member-card navigation/focus orchestration.
- `TeamRunLaunchSummary.vue` should remain display-only and emit events, not mutate config or scroll DOM itself.
- `teamRunConfigPresentation.ts` owns summary facts and labels/data but must not become a DOM/navigation owner.
- `ModelConfigSection.vue` / `llmThinkingConfigAdapter.ts` remain the provider-aware Thinking boundary.
- Workspace selector changes are shared for agent/team forms.

## Assumptions

- “Override exists” means `hasMeaningfulMemberOverride(override)` is true.
- “Member names” in the override tag can use the existing active override display-name logic, but route keys must be kept for navigation.
- “Existing workspace name” should prefer workspace/store display name; if unavailable, fallback to metadata/path/id without blocking launch.
- Member override default-on Thinking can materialize a member `llmConfig` override when the effective member model differs from team defaults and no explicit thinking state exists; this is acceptable because the user-visible member effective config is ON.

## Risks / Open Questions

- Footer summary tag navigation may require `nextTick`/DOM focus after expanding the member override section; tests should use stable data attributes rather than timing assumptions.
- If multiple overridden cards are targeted, focusing all simultaneously is impossible; implementation should scroll/focus the first and may visually pulse/highlight all targeted cards.
- Workspace summary labels should stay compact; long workspace names should truncate in UI while preserving full title/accessible text if needed.

## Requirement-To-Use-Case Coverage

- Workspace alignment: `REQ-002` through `REQ-004`.
- Footer summary content and override tag: `REQ-005` through `REQ-014`.
- Member override Thinking default: `REQ-015` through `REQ-018`.
- Regression preservation: `REQ-019` and `REQ-020`.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` and `AC-002`: workspace segmented-control visual and alignment scenarios.
- `AC-003` through `AC-006`: expanded footer summary content scenarios.
- `AC-007` through `AC-012`: member override tag display and navigation scenarios.
- `AC-013` through `AC-016`: member override Thinking default-on and explicit-state preservation scenarios.
- `AC-017`: prior validated behavior regression guard.

## Approval Status

Design-ready for architecture review after sixth delivery-verification re-entry. User verification is not complete; delivery finalization remains blocked until implementation, review, API/E2E validation, and renewed user verification pass.
