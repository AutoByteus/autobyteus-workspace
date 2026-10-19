# Handoff — Architecture Design Complete — project-tool-split

- Result: `Architecture Design Complete`
- Package identifier: `project-tool-split`; current revision `SR-002`
- Classification: `task_size=Medium`, `architectural_risk=High` (new public agent tool contracts and protected first-party names; a transition contract across the current and the new app version)
- Route (from handoff rules): independent architecture review → `/software_engineering_team/architecture_reviewer`
- Approval: requirements `Approved` at SR-001 by the Solution Designer within the direction; user informed 2026-10-17. No behavior-defining supplements.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); user go-ahead 2026-10-17 ("let's work on the project tool conversion task now").

## Original request (summary)

Split `create_or_update_project` into `create_project` (name, optional description and workspaces) and `update_project` (by ID: name, description, workspaces; a list replaces all links). No change to project semantics. No automatic exposure. Follow the task-tool-split precedent (`tickets/done/task-tool-split/` on `personal`) and record differences. Existing configurations keep working in the old and new app (an agent listing only `create_or_update_project` keeps a project tool; listing old and new names together works). Remove the old tool once the transition is over: the team proposes when, the user decides. The PTM package update is a separate Task after the release. Done when: tools exist with single meanings, nothing automatic, descriptions/docs match; existing configurations shown working in both apps by evidence; tests and a real-app check in an isolated instance with a test data package (TESTING.md); merged and released with the next beta (not blocking an earlier release), and the user's check in the app.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split`, branch `codex/project-tool-split`
- Base: `origin/personal` @ `8a970f214c` (one docs commit after `v1.5.5-beta.2`); finalization target `origin/personal`
- Ticket folder: `tickets/in-progress/project-tool-split/` (uncommitted)

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/solution-revision-record.md`
- Architecture review artifacts: none yet (first review)

## Key design points for review

- Difference from the precedent (DEC-002): the old tool stays registered and unchanged during the transition, by the user's direction; it dispatches by `project_id` presence onto the new tools' parsers/execution (one validation and service path). The conflict with the "no backward compatibility" principle is recorded in the design spec and bounded by FU-2.
- Old tool's description unchanged (DEC-004); deprecation is in docs and release notes.
- No exposure, service, MCP catalog, persistence or UI change.
- AC-005: probe both versions' tool resolution (release `v1.5.5-beta.2` read-only, and the new build) as in `autobyteus-agents` commit `80825d4`.

## Open items

- DEC-006 (user, outside this ticket): when to remove `create_or_update_project`. Proposal: the first release after the PTM package has dropped the old name.
- Follow-ups: FU-1 (PTM package, PM creates after release), FU-2 (old-tool removal).

## Route record

- `get_handoff_rules` applied 2026-10-17: rule "Large or High → architecture review" matches; sent to `/software_engineering_team/architecture_reviewer`.

## Next expected action

Independent architecture review of SR-002.
