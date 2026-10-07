# Handoff — Architecture Design Complete — `projects-always-on` (SR-003: flag removal + Projects tab)

- Result: `Architecture Design Complete`; task_size=`Medium` (was Small in SR-002); architectural_risk=`Low`; direct implementation route
- From: Solution Designer (`/solution_designer`), 2026-10-07

## Request and goal
The user: "first we need to remove this feature flag now and projects always on." Remove the per-node `ENABLE_PROJECTS` UI flag completely, so Projects is always available on desktop. Mobile stays hidden through its runtime gate. The Applications flag is untouched.

## SR-003 change (2026-10-07)
The user folded a **Projects tab in the right panel** into this ticket: first in the tab row (before Files); project/Temp tasks picker; live board; worker click opens the conversation in the center; Task details inside the tab. See requirements "SR-003 Addition" and design "SR-003 Addition". The SR-002 flag-removal work in progress stays valid.

## Approval basis
Requirements SR-002 were approved by the user on 2026-10-07. DEC-001 (user): an already stored `ENABLE_PROJECTS` value is just not read: no migration or deletion (it may appear in Advanced as an inert, deletable custom setting).

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on`
- Branch `codex/projects-always-on`
- Base `origin/personal@93d1b18b4`; target `origin/personal`

## Artifacts (absolute)
- /Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/solution-revision-record.md
- Review artifacts: `N/A — not applicable` (direct route)

## Expected output
- The clean-cut removal per the design-spec change list.
- A repo-wide check for `ENABLE_PROJECTS|projectsCapability` outside `tickets/done` is empty.
- Tests and probes pass, including the stored-`false` node case (AC-002).
- Docs updated.

## Routing record
`get_handoff_rules` (2026-10-07): the Small/Low rule → `/implementation_engineer`.
