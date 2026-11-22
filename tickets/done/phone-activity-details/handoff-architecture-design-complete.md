# Handoff: Architecture Design Complete — autobyteus-590 (phone-activity-details)

- Result: `Architecture Design Complete`, SR-001, task_size `Medium`, architectural_risk `Low` → direct implementation.
- Package: `phone-activity-details` (Project Task autobyteus-590, absorbs autobyteus-586); requested by `/project_task_manager`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details/tickets/in-progress/phone-activity-details`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details`, `codex/phone-activity-details` (see `git log -1`); base `origin/personal` `0da6bfbfc1`; finalization target `origin/personal`. Release only on the founder's word.
- Approval: Solution Designer within the direction; user informed.

## Order

1. 586 first (D-1): exclude `../dist-mobile-demo/**` in `nuxt.config.ts`, confirm no other build output enters the type project, drop `TESTING.md:87`'s workaround sentence, prove the typecheck passes with `dist-mobile-demo/` present.
2. The phone Activity (D-2…D-7).

## Root cause

The phone row's second line is `contextText`, a duplicated rule (live and hydration) that falls back to the tool name and is never recomputed when arguments arrive; the phone has no detail view, and the desktop's details formatting lives inside its components.

## Design

One summary owner (`getToolDisplaySummary`, at render from current arguments; `contextText` removed from the web); shared tool status/details and compaction rows builders used by desktop and phone; phone detail screen under a new route key `activityItem`; background tasks expand on tap. Evidence: unit tests + a `test:e2e:mobile-shell` case on the production phone bundle (DEC-005: physical device untested, low risk).

## Route record

`get_handoff_rules` (2026-11-22): Medium / Low → `/implementation_engineer`.
