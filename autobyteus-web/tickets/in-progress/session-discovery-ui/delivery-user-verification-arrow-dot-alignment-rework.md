# Delivery User Verification Rework: Arrow / Status Dot Alignment

## Meta

- Ticket: `session-discovery-ui`
- Created by: `delivery_engineer`
- Created at: `2026-07-01`
- Trigger: Renewed user verification after integrated Round 3 handoff.
- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Current branch: `codex/session-discovery-ui`
- Integrated base: `origin/personal` at `57185192d4b93840dab1fb7134604b1716a600a8`, merged at `9d8475e2895d4fba1b2b24ae21acc1c01b2a8901`
- Worktree: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui`
- Web package path: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web`

## User Feedback Snapshot

Reference screenshot from user:

- `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_cGtSw6/Screenshot 2026-07-01 at 2.02.28 PM.png`

User said the UI is improving and requested the following specific alignment adjustment for the Workspaces session list:

1. Keep the arrow at the far left and strictly horizontally align it with the status dot. The arrow icon and status dot should share the same vertical baseline/center line, with the arrow to the left of the dot and a fixed, consistent gap.
2. Align both arrow and status dot to the title/session-name row only. They should align to the title text baseline/center, not to the combined height of title plus subtitle.
3. For rows with no child content / not expandable, reserve an equal-width placeholder in the arrow position. This keeps all status dots and title text aligned to the same vertical column and removes ragged left edges caused by missing arrows.

## Expected Implementation Direction

Likely affected files:

- `components/workspace/history/WorkspaceHistorySessionRow.vue`
- `components/workspace/history/WorkspaceHistoryTeamMemberRows.vue` only if similar row-alignment helpers are shared or affected
- `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
- `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Possibly snapshot/assertion updates in related session-history tests

Suggested behavior changes:

- Session row leading layout should be a stable grid/flex lane:
  - arrow/disclosure lane with fixed width for all rows;
  - status-dot lane with fixed width/position;
  - title/subtitle content lane;
  - actions/timestamp lane.
- Expandable team/session rows render the actual arrow in the fixed arrow lane.
- Non-expandable rows render an invisible or empty fixed-width placeholder in the same arrow lane.
- Arrow and status dot should align to the first/title line center, not the two-line row block center. This likely means removing the earlier full-row-height centering rule (`h-9`-style centering) and aligning the dot/arrow to the title line (`mt` or grid row alignment) consistently.
- Preserve all prior accepted polish:
  - no session source avatar/initials chips;
  - no member initials/avatar chips;
  - team subtitle remains `Team Name (N)` when count is positive;
  - compact member guide remains;
  - session-first list and transient execution rows remain integrated;
  - row actions, selection, and disclosure behavior remain intact.

## Acceptance Criteria For Rework

- AC-AD-001: All session rows reserve identical left disclosure-lane width, even when the row has no expandable child content.
- AC-AD-002: Status dots align vertically in one consistent column across expandable and non-expandable rows.
- AC-AD-003: Session titles align vertically in one consistent column across expandable and non-expandable rows.
- AC-AD-004: Disclosure arrows and status dots are centered on the session title line, not centered over the full title+subtitle row height.
- AC-AD-005: Arrow-to-dot spacing is fixed and consistent.
- AC-AD-006: Prior Round 3 UI polish remains intact: no source/member chips, compact team subtitles, compact member guide, and preserved actions/selection.
- AC-AD-007: Durable component tests or static assertions cover the disclosure placeholder / consistent leading-lane alignment where practical.

## Delivery Status Impact

- Current renewed user verification is not accepted/final until this requested alignment rework is implemented and rerun through the normal review/coverage gates.
- Repository finalization remains on hold.

## Cumulative Context

- Previous user-verification rework: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-user-verification-rework.md`
- Latest integration blocker/resolution context: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/delivery-base-integration-conflict-blocker.md`
- Requirements: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/requirements.md`
- Investigation notes: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/investigation-notes.md`
- Design spec: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-spec.md`
- Design review report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/design-review-report.md`
- Implementation handoff: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/implementation-handoff.md`
- Code review report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/code-review-report.md`
- Coverage investigation: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/api-e2e-execution-coverage-report.md`
- Docs sync report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/docs-sync-report.md`
- Handoff summary: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/handoff-summary.md`
- Release/deployment report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui/release-deployment-report.md`
