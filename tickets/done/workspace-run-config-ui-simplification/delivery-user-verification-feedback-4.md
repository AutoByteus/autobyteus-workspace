# Delivery User Verification Feedback 4

## Metadata

- Ticket: `workspace-run-config-ui-simplification`
- Captured by: `delivery_engineer`
- Captured at: 2026-07-01 PDT, during delivery user verification after round-4 delivery handoff.
- Worktree: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`
- Branch: `codex/workspace-run-config-ui-simplification`
- Current delivery state before feedback: latest-base integration refresh completed, post-integration checks passed, docs/handoff refreshed, and repository finalization held pending explicit user verification.
- User verification outcome: `Needs Rework`

## Raw User Feedback

1. Bug fix, highest priority: `Auto Approve Override` currently displays the internal localization/variable path `workspace.components.workspace.config.MemberOverrideItem.auto_approve_use_global`; it must display human-readable tri-state options `Use global` / `Yes` / `No` as a dropdown or segmented control, with the current selected value visible.
2. Remove duplicated override-summary information: member-card header chips such as `Runtime` / `Model` / `Model config` duplicate field-level `Overridden` badges in the expanded form. Show the header chips only while the card is collapsed; once expanded, hide the header chips and keep only field-level `Overridden` markers.
3. Complete the `Model config override` field: it currently shows only the title and `Overridden` badge without visible/editable content. It should render concrete visible field/value content consistent with `Runtime Override` and `LLM Model Override` formatting.
4. Remove the `Advanced` collapsed disclosure: the panel currently only contains simple `Reasoning Effort` and `Fast mode` dropdowns, so it should be shown flat directly below the `Thinking` switch to avoid unnecessary clicks.
5. Move `Reset to default` to the member-card header on the same line as the member name and role badge. Show it only when the member has at least one override / the card has an `Overridden` badge. Hide it for members using team defaults. Clicking reset from the header must have lightweight confirmation to prevent accidental clearing, especially while collapsed.

## Delivery Classification

- Primary classification: `Design Impact`
- Secondary classification: `Local Fix`
- Recommended recipient: `solution_designer`
- Rationale:
  - Item 1 is a localized bug in the active UI and likely a local implementation fix.
  - Items 2, 4, and 5 change member-card information hierarchy, disclosure behavior, and reset interaction semantics.
  - Item 3 may require clarifying the intended editable/display surface for explicit member `llmConfig` overrides.
  - Because the feedback changes accepted UI behavior after code review/API-E2E and impacts requirements/design acceptance criteria, the workflow should re-enter through `solution_designer` before implementation resumes.

## Acceptance Criteria To Carry Into Re-entry

- `AC-FB4-001`: `Auto Approve Override` never renders localization keys/internal paths in the UI; it renders human-readable `Use global`, `Yes`, and `No` options and displays the current selected state.
- `AC-FB4-002`: Member-card top override chips render only in collapsed member rows; expanded rows rely on field-level `Overridden` badges and do not duplicate the same chip summary.
- `AC-FB4-003`: `Model config override` renders concrete visible content and, when editable, offers an editing/display affordance consistent with the rest of the member override fields.
- `AC-FB4-004`: `Reasoning Effort` and `Fast mode` are shown directly under `Thinking` without an `Advanced` disclosure in this context.
- `AC-FB4-005`: `Reset to default` appears in the member-card header only when that member has explicit override state; it is hidden for `Using team defaults` members.
- `AC-FB4-006`: Header reset requires lightweight confirmation before clearing member overrides, including while the card is collapsed.
- `AC-FB4-007`: Existing launch-readiness, missing-model blocking, first-send member config materialization, read-only inspection, localization guard, and existing member override tri-state storage semantics remain intact.

## Delivery Impact

- Current refreshed delivery handoff is no longer accepted for finalization.
- Do not move the ticket to `tickets/done/`, push, merge into `personal`, clean up the worktree, or run release/deployment until this feedback is designed, implemented, reviewed, validated, and explicitly re-verified by the user.
