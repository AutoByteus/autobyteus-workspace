# Delivery User Verification Feedback 5

## Metadata

- Ticket: `workspace-run-config-ui-simplification`
- Captured by: `delivery_engineer`
- Captured at: 2026-07-01 PDT, during renewed delivery user verification after round-5 handoff.
- Worktree: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`
- Branch: `codex/workspace-run-config-ui-simplification`
- Current delivery state before feedback: latest-base refresh completed, post-refresh checks passed, docs/handoff refreshed, and repository finalization held pending explicit user verification.
- User verification outcome: `Needs Rework`

## Raw User Feedback

1. The second-line `No member overrides` chip/copy in collapsed member rows is redundant because the header already says `Using team defaults`. Remove that redundant second-line copy. When an agent/member is selected or expanded, the current internal-looking frame is visually poor; the frame should feel like it belongs to the whole agent/member card rather than an inner header-only/internal frame.
2. In `Team run defaults`, do not show an `Advanced` section/tab/disclosure for the lower content because there is not enough information to justify hiding it behind `Advanced`.
3. `Thinking` mode should default to ON whenever the selected model supports Thinking, both in `Team run defaults` and in agent/single-agent configuration.
4. In `Workspace Directory`, the `Existing` / `New` segmented control should be centered; the current left placement looks awkward.

## Delivery Classification

- Primary classification: `Design Impact`
- Secondary classification: `Local Fix`
- Recommended recipient: `solution_designer`
- Rationale:
  - Item 1 changes member-row visual hierarchy and selection/expanded-frame behavior beyond a text-only cleanup.
  - Item 2 broadens the no-Advanced-disclosure requirement from member override rows to `Team run defaults`.
  - Item 3 changes schema-driven default state semantics for Thinking across team defaults and agent config, requiring careful requirements/design confirmation against persisted/default `llmConfig` semantics.
  - Item 4 changes the accepted workspace segmented-control layout from left-aligned to centered.
  - Because these modify previously reviewed/validated UI behavior and may affect shared model-config behavior, re-enter through `solution_designer` before implementation resumes.

## Acceptance Criteria To Carry Into Re-entry

- `AC-FB5-001`: Collapsed member rows that are using team defaults do not render a redundant second-line `No member overrides` chip/copy when `Using team defaults` is already visible.
- `AC-FB5-002`: Selected/expanded member-card focus or frame styling applies to the whole agent/member card and does not look like an inner/header-only implementation frame.
- `AC-FB5-003`: `Team run defaults` does not hide simple lower model-config fields behind an `Advanced` disclosure; simple fields are shown flat when available.
- `AC-FB5-004`: For models that support Thinking, `Thinking` defaults to ON in both team defaults and single-agent/agent config surfaces unless an explicit persisted/current value says otherwise.
- `AC-FB5-005`: `Workspace Directory` `Existing` / `New` segmented control is centered within its section while preserving the existing strong selected state and existing/new behavior.
- `AC-FB5-006`: Existing validated behavior remains intact: human `Auto Approve Override` labels, collapsed-only override chips for changed fields, model-config content/fallback, reset confirmation, team auto approve ordering, missing-model blocking, read-only inspection, localization guards, and first-send complete member config materialization.

## Delivery Impact

- Current refreshed delivery handoff is no longer accepted for finalization.
- Do not move the ticket to `tickets/done/`, push, merge into `personal`, clean up the worktree, or run release/deployment until this feedback is designed, implemented, reviewed, validated, and explicitly re-verified by the user.
