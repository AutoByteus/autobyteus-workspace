# Solution Design Re-entry Report 4

## Trigger

Fourth delivery-stage user verification feedback for `workspace-run-config-ui-simplification`, captured in:

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-4.md`

The user tested the post-round-3 delivery-held UI and requested final member-override refinements before finalization.

## Re-entry Classification

- Primary classification: Design Impact / Requirement Gap.
- Secondary classification: Local Fix for the `Auto Approve Override` raw localization-key rendering bug.
- Scope: Frontend member override card UI, scoped shared model-config disclosure behavior, localization catalogs, component tests, and downstream docs/handoff refresh after implementation.
- Launch/domain impact: None intended. Readiness and per-member launch materialization remain authoritative and unchanged.

## Requested Changes Covered

1. Fix `Auto Approve Override` so it renders human-readable `Use global`, `Yes`, and `No` and never displays `workspace.components.workspace.config.MemberOverrideItem.auto_approve_use_global`.
2. Hide member-card top field chips while expanded; keep them only as collapsed summaries because expanded fields already show `Overridden` badges.
3. Complete `Model config override` so it shows concrete visible/editable controls or an explicit no-options/unavailable message.
4. Remove the `Advanced` disclosure in member override model-config context; show `Reasoning Effort` and `Fast mode` flat below `Thinking`.
5. Move `Reset to default` to the member-card header, render it only for members with explicit overrides, and require lightweight confirmation before clearing.

## Investigation Summary

The delivery-held code already implements prior re-entry UI changes. The fourth-feedback issues map to these owners:

- `MemberOverrideItem.vue`: owns leaf card header, chips, reset, auto approve selector, and model-config override content. It currently renders chips unconditionally, places reset in the expanded body, references the missing `auto_approve_use_global` key, and can show incomplete model-config content.
- `ModelConfigSection.vue`: owns Thinking/basic/advanced schema rendering. It currently supports default `Advanced` disclosure and an opt-in single-row inline mode, but needs a stronger default-safe flat mode for member override context.
- Workspace localization catalogs: English/Chinese source catalogs define `auto_approve_yes`/`auto_approve_no` but not `auto_approve_use_global`; generated workspace message files also appear stale/missing for these keys.

## Requirements Updates

Updated `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md` to fourth re-entry status and added requirements/acceptance criteria for:

- collapsed-only member header field chips;
- header-only reset visibility and confirmation;
- human-readable, catalog-backed auto approve tri-state labels;
- visible model config override controls or no-options fallback;
- scoped member-only flat advanced rows;
- preserving prior hierarchy, workspace, footer, readiness, and materialization behavior.

## Design Updates

Rewrote `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md` to integrate fourth-feedback decisions.

Key design decisions for review:

1. Do not reopen accepted round-3 top-level architecture; focus on member-card polish and a localized shared-component opt-in.
2. `MemberOverrideItem.vue` should split header interactions so reset is a valid sibling control, not nested inside the expand button.
3. `Reset to default` is visible only when `hasOverride`, works collapsed or expanded, and clears only after confirmation.
4. Header field chips render only while collapsed; expanded forms rely on field-level `Overridden` badges.
5. Add missing `auto_approve_use_global` localization entries and update generated/consumed catalogs as required.
6. `Model config override` must render `ModelConfigSection` controls when schema exists or a clear no-options message when it does not.
7. `ModelConfigSection.vue` gets a default-safe flat advanced mode, passed only from member override context, so `Reasoning Effort` and `Fast mode` show directly below `Thinking` without globally removing `Advanced`.

## Open Risks / Notes For Review

- The reset-header change can create invalid nested buttons if implemented naïvely; the design explicitly requires sibling controls.
- Localization generation may be easy to miss; tests should assert that the raw auto-approve key is absent from rendered UI.
- The flat advanced mode must be opt-in to avoid regressions in agent/team default editors.
- The no-options model-config fallback should be neutral, not warning-styled, unless the inherited model is actually unresolved.

## Updated Artifact Package

- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/investigation-notes.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md`
- `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-4.md`

## Next Requested Gate

Architecture reviewer should review the revised fourth-reentry requirements/design for ownership boundaries, scoped shared-component behavior, reset interaction safety, localization completeness, and implementation readiness before implementation rework resumes.
