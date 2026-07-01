# Solution Design Re-entry Report 2

## Trigger

Second delivery-stage user verification feedback for `workspace-run-config-ui-simplification`, captured in:

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-2.md`

The user tested the post-first-reentry UI and requested four additional refinements before delivery finalization:

1. Replace `Change run default(s)` copy with `Edit Team Default`.
2. Give `Team member overrides` a more visually prominent background color.
3. Remove helper text below `Runtime` and `Default LLM Model (Global)`.
4. When `Thinking` is on by default and only one config row is visible, show that row directly instead of hiding it behind `Advanced`.

## Re-entry Classification

- Classification: Design Impact / Requirement Gap.
- Scope: Frontend UI rework, localization, component tests, docs refresh after implementation.
- Launch/domain impact: None intended. Readiness and per-member launch materialization remain authoritative and unchanged.

## Investigation Summary

Current post-first-reentry code already implements:

- Team name, `Team run defaults`, and `Team member overrides` grouped inside `Team Definition` before workspace selection.
- `Team run defaults` open by default.
- Concrete `llmConfig` key/value display in the defaults summary.
- Member override editor collapsed by default in editable team runs.

Remaining gaps found in current code:

- `TeamRunDefaultsSummary.vue` still selects old run-default action keys including `change_run_defaults`; English localization still says `Change run defaults`.
- `TeamMemberOverridesSummary.vue` uses neutral `border-slate-200 bg-slate-50/80`, which does not satisfy the requested stronger visual hierarchy.
- `TeamRunConfigForm.vue` still passes helper text into `RuntimeModelConfigFields.vue` for runtime/model controls.
- `ModelConfigSection.vue` makes `usesAdvancedDisclosure` true whenever any `advancedSchema` exists, so a single thinking-on row still requires `Advanced`.
- `RuntimeModelConfigFields.vue` is shared by team, agent, definition, and mobile launch flows, so the direct-row behavior must be opt-in rather than global.

## Requirements Updates

Updated `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md` to add second-reentry requirements and acceptance criteria:

- Exact editable action copy: `Edit Team Default`.
- Prominent non-warning member override summary card treatment.
- Team-form-only removal of runtime/model helper text.
- Opt-in direct single-row advanced display for the team defaults editor when thinking is effectively on and exactly one visible non-thinking advanced row remains.
- Preservation of default behavior for other shared `RuntimeModelConfigFields` callers.

## Design Updates

Rewrote `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md` to integrate first and second re-entry decisions.

Key design decisions:

1. `TeamRunDefaultsSummary.vue` owns the action-label change and should remove rendered `Change run defaults` / `Change run default` copy.
2. `TeamMemberOverridesSummary.vue` owns the stronger local accent styling.
3. `TeamRunConfigForm.vue` owns caller-scoped helper suppression by omitting/nulling helper text props for the team defaults editor only.
4. `RuntimeModelConfigFields.vue` should receive a default-false prop and forward it to `ModelConfigSection.vue`.
5. `ModelConfigSection.vue` owns the actual predicate for direct single-row display because it already owns thinking state and `advancedSchema`.
6. The direct-row behavior must be enabled only for the team defaults editor; agent run config, definition launch preferences, mobile cards, and member override editors retain existing behavior unless they intentionally opt in later.

## Open Risks / Notes For Review

- Color choice should use a project-consistent blue/indigo accent and avoid warning/error colors.
- The exact English copy `Edit Team Default` is intentionally singular because it came directly from user feedback.
- “One visible config row” is defined as exactly one key in `advancedSchema` after thinking-toggle-owned keys are excluded, with missing historical config still taking priority.
- Existing delivery docs/handoff artifacts will become stale after implementation and should be refreshed in delivery stage.

## Updated Artifact Package

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/investigation-notes.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-2.md`

## Next Requested Gate

Architecture reviewer should review the revised requirements/design for clarity, scope containment, and shared-component boundary safety before implementation rework resumes.
