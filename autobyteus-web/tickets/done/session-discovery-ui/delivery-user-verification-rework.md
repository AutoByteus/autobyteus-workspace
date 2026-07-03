# Delivery User Verification Rework

## Meta

- Ticket: `session-discovery-ui`
- Created by: `delivery_engineer`
- Created at: `2026-07-01`
- Trigger: User began manual verification at `http://localhost:3002`, confirmed the session-first list is visible, then requested UI polish refinements for the Workspaces session list.
- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Current branch: `codex/session-discovery-ui`
- Worktree: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui`
- Web package path: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web`

## User Feedback Snapshot

Reference screenshot from user:

- `/Users/bingq/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_bya7bvwyfxih21_3d37/temp/RWTemp/2026-07/9b46d3f789a9dc1658dd22e71afa6349/fffaf9218a5d67cc4e3cce57aa612969.png`

User confirmed they can see the new session-first Workspaces list, then requested the following adjustments:

1. Remove the team initials/avatar circle before session rows, such as `SE` / `AW`; do not replace it with another symbol or color. Allocate the freed width to the title and right-side timestamp.
2. Remove the child agent initials/avatar circle before member rows, such as `S` before `solution_designer` or `C` before `code_reviewer`; the full agent/member name is already visible.
3. Simplify the team subtitle line from `Software Engineering Team · 7 roles · coordinator: solution_designer...` to team name plus member count only: `Software Engineering Team (7)`. Remove the coordinator segment entirely.
4. Reduce indentation. Current `folder -> session -> child agent` indentation is too large and compresses title/timestamp width. Use a thinner left vertical guide line to express hierarchy instead of relying on large horizontal offsets.
5. Vertically center the session status dot relative to the full two-line session row height (`title + subtitle`) instead of aligning only to the title line; current dot appears too high.

## Expected Implementation Direction

Likely affected files:

- `components/workspace/history/WorkspaceHistorySessionRow.vue`
- `components/workspace/history/WorkspaceHistoryTeamMemberRows.vue`
- `stores/runHistorySessionLabels.ts`
- `stores/__tests__/runHistorySessionProjection.spec.ts`
- `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- Possibly docs/handoff updates after implementation if behavior text changes materially.

Suggested behavior changes:

- Session rows should keep the status dot but remove the source avatar/initials chip entirely for both team and standalone agent rows, unless implementation confirms the user request was team-only. User examples include both team circles and agent `C` circles, so treating all session source chips as removable is likely correct.
- Team member rows should remove member avatar/initials chips and render only status dot + display name + optional `Team` badge for subteam rows.
- Team subtitle format should be:
  - team: `${teamName} (${memberCount})` when `memberCount > 0`; fallback to `${teamName}` if count is unavailable/zero.
  - agent: keep existing concise agent subtitle unless otherwise impacted, likely `Codex · agent session` is acceptable.
- Shrink session/member left padding/margins and replace large nested offset with a subtle vertical guide for child member/detail rows.
- Center status dot with the full session row body height. In Tailwind terms, likely remove `mt-1`-style title alignment and use an outer flex alignment that centers the dot against the two-line text block.

## Acceptance Criteria For Rework

- AC-RW-001: In the Workspaces session list, session rows no longer show `SE`, `SP`, `PI`, `C`, or other source initials/avatar circles before the title.
- AC-RW-002: Team member/sub-agent rows no longer show role initials/avatar circles before the member name.
- AC-RW-003: Team session subtitle renders as `Team Name (N)`, e.g. `Software Engineering Team (7)`, and does not include `roles` or `coordinator:`.
- AC-RW-004: The visible width available for session titles/timestamps increases relative to the current screenshot; no new leading symbol replaces the removed circles.
- AC-RW-005: Child/team-member hierarchy remains understandable via reduced indentation plus a subtle vertical guide line.
- AC-RW-006: Session status dots are vertically centered relative to the full two-line session row.
- AC-RW-007: Existing row actions and selection behavior remain intact: team session select/open, team member select, terminate/archive/delete/draft remove, and disclosure controls.
- AC-RW-008: Relevant durable tests are updated or added for simplified team subtitle and absence of initials/avatar chips where currently asserted.

## Delivery Status Impact

- Current delivery verification cannot be accepted/finalized until this requested UI rework is implemented and rerun through the normal review/coverage gates.
- Repository finalization remains on hold.

## Existing Delivery Artifacts To Preserve

- Requirements: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/requirements.md`
- Investigation notes: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/investigation-notes.md`
- Design spec: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/design-spec.md`
- Design review report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/design-review-report.md`
- Implementation handoff: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/implementation-handoff.md`
- Code review report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/code-review-report.md`
- Coverage investigation: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/api-e2e-execution-coverage-report.md`
- Docs sync report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/docs-sync-report.md`
- Handoff summary: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/handoff-summary.md`
- Release/deployment report: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/done/session-discovery-ui/release-deployment-report.md`
