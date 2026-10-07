# Handoff — Architecture Design Complete — `task-card-compact-summary` (SR-002)

- Result: `Architecture Design Complete`; task_size=`Small`; architectural_risk=`Low`. Selected route: direct implementation (no independent architecture review).
- From: Solution Designer (`/solution_designer`), 2026-10-07

## Request and goal
On v1.4.96-beta.4 the user found that Task cards on the Projects boards show the entire description. Agent briefs are long, so one card fills the screen. User: "you shouldn't show the complete content when it's like 10,000 words." The cards must be short and scannable on Project boards and Temp tasks, with no new UI.

## Root cause
`ProjectTaskRow.vue` puts `block` and `line-clamp-2` on the same span. Tailwind emits `display:block` after `display:-webkit-box`, so the intended 2-line clamps (in place since 2026-10-02) never applied. Short fixtures hid it.

## Approval basis
Requirements SR-002 were approved by the user on 2026-10-07 ("…follow the best practice, I mean industry practices…"). Decisions:
- DEC-001: the original 2-line summary + 2-line preview;
- DEC-002 (titles): deferred.

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary`
- Branch `codex/task-card-compact-summary`
- Base `origin/personal@c1e4e3df1`; target `origin/personal`

## Artifacts (absolute)
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/design-spec.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/solution-revision-record.md`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/evidence/temp-tasks-full-content-2026-10-07.png`
- Prior UI/UX spec (unchanged): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`
- Review artifacts: `N/A — not applicable` (direct route)

## Expected output
Implementation per the design-spec file mapping, with:
- unit tests;
- the extended PMU browser probe with ~10,000-word and multi-line fixtures at 1440 and 1024;
- the docs update.

AC-001..006 must be verified.

## Routing record
`get_handoff_rules` (2026-10-07): the Small/Low rule → `/implementation_engineer`.
