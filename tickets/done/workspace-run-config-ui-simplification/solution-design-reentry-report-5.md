# Solution Design Re-entry Report 5

## Trigger

Fifth delivery-stage user verification feedback for `workspace-run-config-ui-simplification`, captured in:

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-5.md`

The user tested the round-5 delivery-held UI and requested additional refinements before finalization.

## Re-entry Classification

- Primary classification: Design Impact / Requirement Gap.
- Secondary classification: Local Fix for redundant member empty copy and workspace segmented-control alignment.
- Scope: Frontend member card presentation, team-default advanced display policy, shared Thinking default behavior for launch config, workspace selector alignment, localization/tests/docs refresh after implementation.
- Launch/domain impact: No payload/readiness/materialization change intended. Thinking default-on can change the editable launch config value when no explicit config state exists, by design.

## Requested Changes Covered

1. Remove redundant collapsed member-row `No member overrides` chip/copy because `Using team defaults` already communicates default state.
2. Apply selected/expanded/focus framing to the whole member card instead of an inner/header-only frame.
3. Remove `Advanced` disclosure from `Team run defaults` lower/simple model-config fields.
4. Default Thinking ON for thinking-capable models in team defaults and agent/single-agent launch configuration unless explicit current/persisted state exists.
5. Center Workspace Directory Existing/New segmented control while preserving selected-state clarity and behavior.

## Investigation Summary

Current code after round 5 maps the new feedback to these owners:

- `MemberOverrideHeader.vue`: exact owner of the redundant empty chip and current inner header button styling.
- `MemberOverrideItem.vue`: owner of root card shell and expansion state; should own whole-card active/focus frame.
- `TeamRunConfigForm.vue`: team-default caller that should opt into flat advanced display and default-on Thinking.
- `AgentRunConfigForm.vue`: agent launch caller that should opt into default-on Thinking.
- `RuntimeModelConfigFields.vue`: shared editor boundary that needs to forward `advancedDisplayMode` and default-on Thinking opt-in.
- `ModelConfigSection.vue` / `llmThinkingConfigAdapter.ts`: shared schema/provider boundary for default-on Thinking unless explicit state exists.
- `WorkspaceSelector.vue`: shared owner of Existing/New segmented control layout.

## Requirements Updates

Updated `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md` to fifth re-entry status and added/verbalized requirements for:

- no redundant default-state member chip;
- whole-card member active/focus framing;
- flat team-default lower model-config fields;
- Thinking default ON for supported models in team/agent launch configs with explicit-off preservation;
- centered workspace segmented control;
- regression preservation for prior validated behavior and launch semantics.

## Design Updates

Rewrote `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md` using the solution-designer template shape for the fifth re-entry.

Key design decisions for review:

1. Keep prior accepted top-level architecture; this is a targeted re-entry.
2. `MemberOverrideItem.vue` owns whole-card active/focus styling; `MemberOverrideHeader.vue` stops rendering the empty chip and no longer appears as the selected frame owner.
3. `RuntimeModelConfigFields.vue` forwards `advancedDisplayMode`; `TeamRunConfigForm.vue` passes `flat` for team defaults.
4. Default-on Thinking belongs in `llmThinkingConfigAdapter.ts`/`ModelConfigSection.vue`, not duplicated in forms.
5. Launch forms opt into default-on Thinking explicitly, preserving current/persisted explicit off state and read-only historical inspection.
6. `WorkspaceSelector.vue` centers its shared segmented control directly.

## Open Risks / Notes For Review

- Explicit thinking-state detection must be provider-specific and distinguish state keys from tuning keys.
- Mobile launch card also uses `RuntimeModelConfigFields`; architecture/implementation should decide whether it is part of the same launch-edit default-on scope.
- Whole-card focus styling should be subtle and accessible, avoiding an error/warning look.
- Default-on Thinking emits config in editable launch surfaces when no explicit state exists; tests need to prove this does not loop and does not mutate read-only historical views.

## Updated Artifact Package

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/investigation-notes.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-5.md`

## Next Requested Gate

Architecture reviewer should review the fifth-reentry requirements/design for Thinking default-state invariants, shared-component opt-in boundaries, member-card ownership, workspace-selector scope, and implementation readiness before rework resumes.
