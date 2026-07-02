# Delivery User Verification Feedback 3

## Context

- Ticket: `workspace-run-config-ui-simplification`
- Worktree: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`
- Branch: `codex/workspace-run-config-ui-simplification`
- Feedback captured by: `delivery_engineer`
- Timestamp: 2026-07-01 09:47 PDT
- Stage: Fresh round-3 post-rework delivery user-verification hold, before repository finalization.
- Previous re-entry artifacts:
  - `delivery-user-verification-feedback.md`
  - `solution-design-reentry-report.md`
  - `delivery-user-verification-feedback-2.md`
  - `solution-design-reentry-report-2.md`

## User Feedback

The user tested the round-3 UI and said it is improving, then requested another refinement pass. The request has eight overall layout/flow refinements plus a member override card redesign.

### Form layout and hierarchy refinements

1. Remove the outer border container around the `Team Definition` through `Team member overrides` area. Make the `Team Definition` title typography match `Workspace Directory`, `Auto approve tools`, and `Skill Access`. Use consistent large spacing between the four top-level sections. Keep the shallow backgrounds on `Team run defaults` and `Team member overrides`, and add slight indentation to show they belong to `Team Definition`. Use smaller internal spacing inside `Team Definition` (for example 16px) and rely on spacing rather than an outer border to express hierarchy.
2. Merge the currently separate `Team run defaults` summary card and the expanded white editor card into a single card. The editor content should appear as an internal expanded area below the summary, separated only by an internal divider if needed. Clicking `Hide Team Default` should collapse only the editor area while the summary remains visually in the same card.
3. Align the `Auto approve tools` toggle with the title row rather than vertically centering it against the entire description block. Put the description text below the title and let it span the row width.
4. Remove the green `Workspace: Temp Workspace` text because it is redundant.
5. Add a small summary above/near the `Run Team` button, such as member count, model, and runtime, so users do not need to scroll up to review key launch configuration before clicking.
6. Change the `Existing` / `New` workspace segmented control from a full-width equal two-column control to a left-aligned content-width pill. Strengthen selected state with solid dark-blue background plus white text, and use transparent/gray styling for unselected state.
7. Move `Auto approve tools` before `Team member overrides` because member-level `Auto-execute: Use global` is an override of the global team auto-approve setting. Users should see the team global setting before member overrides. The user suggested placing it inside the `Team run defaults` card or directly adjacent to it with other team-level defaults.
8. Rename and clarify member-level `Auto-execute` as an override of the team-level `Auto approve tools` setting. Replace the unclear blue square/minus icon with a clear three-state selector (`Use global` / `Yes` / `No`). Suggested field name: `Auto Approve Override`. Add an info icon explaining it follows or overrides the team `Auto approve tools` setting.

### Team member overrides expanded-card redesign

1. Each member card should default to a one-line summary row: member name, role label, status text (`Using team defaults` in gray or `Custom overrides` in blue), and an expand arrow. Clicking expands the full edit form. Multiple member cards may be expanded at the same time.
2. In an expanded member card, fields that are actually overridden should have a left color bar or an `Overridden` label. Unmodified fields should keep the default style.
3. Fix unsupported Thinking behavior: when the model does not support Thinking, the Thinking switch should show disabled gray state rather than highlighted on. When the model supports Thinking, Thinking should reflect the default selected state.
4. Add a `Reset to default` shortcut button in the top right of each expanded member card to clear all overrides for that member.

Reference screenshot supplied by user:

- `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_BqnWHn/Screenshot 2026-07-01 at 9.47.53 AM.png`

## Delivery Classification

- Classification: `Design Impact` / `Requirement Gap`
- Recommended recipient: `solution_designer`
- Why:
  - Items 1, 2, 5, 6, and 7 change the form information architecture and hierarchy beyond delivery/docs-only scope.
  - Items 3, 4, and 8 change specific component presentation and naming semantics that need requirements, localization, and tests.
  - The member card redesign is a larger behavior/UI change to the recursive member override editor, including new expansion state, per-field override indicators, reset behavior, and thinking-state correction.
  - The unsupported Thinking correction may indicate either a local display bug or a shared model-config interpretation gap and should be investigated by design before implementation.

## Suggested Design Questions For Re-entry

1. What are the final top-level sections and exact order? Proposed order from user feedback appears to be: `Team Definition` -> `Workspace Directory` -> `Skill Access` -> sticky `Run Team` area, with `Auto approve tools` moved into or directly after `Team run defaults` before member overrides.
2. Should `Auto approve tools` live inside the `Team run defaults` card, directly below it as a sibling in `Team Definition`, or inside a broader `Team defaults` grouping?
3. What exact compact run summary should appear above the `Run Team` button? Candidate fields: member count, model, runtime, workspace, auto-approve state.
4. Should the workspace segmented control styling be local to `WorkspaceSelector.vue`, or should a reusable small segmented-control pattern be introduced?
5. How should the member override one-line summary render role labels for direct members versus nested subteams/leaves?
6. Should member cards start all collapsed in editable mode and all expanded in read-only inspection, or should read-only use the same one-line default with explicit expansion?
7. What exact field-level override indicators are required for runtime, model, model config, auto approve override, workspace, and skill access if applicable?
8. How should `Reset to default` behave for nested/member route keys, read-only mode, and partially overridden states?
9. Does unsupported Thinking highlighted-on state reproduce in shared model config components outside team members? If yes, scope may extend beyond this ticket's team-run form.
10. What exact copy should replace `Auto-execute` and the three-state labels in English and Chinese catalogs?

## Current Delivery State

- Delivery finalization remains held.
- No commit, push, merge, ticket archival, cleanup, release, or deployment has been performed.
- Current delivery artifacts (`docs-sync-report.md`, `handoff-summary.md`, `delivery-release-deployment-report.md`) will become historical/stale if this feedback is implemented and must be refreshed afterward.
