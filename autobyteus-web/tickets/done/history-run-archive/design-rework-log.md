# Design Rework Log

## Rework Round 1 — AR-ARCH-001

- Date: 2026-05-01
- Trigger: Architecture review report at `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-review-report.md`
- Finding: Direct archive mutations must reject invalid/path-unsafe IDs before metadata read/write. The policy must live in `AgentRunHistoryService` and `TeamRunHistoryService`, not resolvers, UI, or metadata stores.

## Changes Applied

Updated artifacts:

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-spec.md`

Specific updates:

- Added `FR-ARCH-012` and `AC-ARCH-011` requiring invalid/path-unsafe archive ID rejection before metadata read/write.
- Added investigation evidence from the design review and current code path-safety pattern.
- Added design section `Archive Identity / Path Safety Invariant`.
- Revised archive spines, ownership, boundary encapsulation, interface mapping, dependency rules, migration sequence, and implementation guidance.
- Specified that implementation should adapt existing safe directory resolution or add an equivalent service-level metadata path safety helper.
- Added backend test requirements for unsafe IDs such as traversal, absolute paths, and slash/backslash separators, with assertions that `success=false` and no out-of-root metadata write occurs.

## Current Rework Status

Ready for architecture re-review.
