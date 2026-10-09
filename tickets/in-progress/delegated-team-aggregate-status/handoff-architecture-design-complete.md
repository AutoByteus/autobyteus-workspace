# Handoff — Architecture Design Complete (direct implementation route)

- Package: `delegated-team-aggregate-status`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-003` (requirements R2 / SR-002 approved, AP-001, 2026-10-09)
- task_size: `Medium` · architectural_risk: `Low`. Rationale: web-only, presentation-only derivation from data already in the renderer; about 12 source files plus specs and probes; no API, stream, persistence, security, concurrency, deployment or ownership-boundary change. Shared contract fold unchanged.
- Route: handoff rule "Small or Medium and Low" → `/software_engineering_team/implementation_engineer` (direct implementation; no independent architecture review). Architecture review artifacts: `N/A — not applicable`.

## Original request

Project Task `project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56` from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): delegated Team rows in the sidebar always show a gray Team icon and look offline while members work. Show the Team's aggregate status. Make it consistent with agent and Team rows, cover it with tests, and have the user verify it in the desktop app.

## Approved outcome (summary; authority is requirements-doc.md)

One **universal Team status** on every Team row of the Workspaces tree: delegated Teams (Agent, Team, Org roots) and Teams nested in them, nested configured Teams, Org-internal Teams, standalone TeamRun rows, and Team group rows under TEAMS.

- A Team shows the highest state among the agents shown under it (collapsed included, closed work excluded): **busy (running or starting) blue > error red > idle green > offline gray**.
- A Team in a run that is not alive is gray.
- A group row shows the highest state across its runs.
- Presentation: a dot before the unchanged slate people-group icon. The binary "alive = blue" cue on TEAMS run/group rows is replaced.

## Artifacts (absolute paths)

- Requirements (Approved R2): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/solution-revision-record.md`
- Evidence screenshots (not normative): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56/context/ctx_c091e4192332__18.png`; screenshot 2 (temporary path) `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/eb8d3dfe-7b82-4daa-9b3b-007fa8435aeb/images/1.png`
- Product Design artifacts: `N/A — not applicable`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status`, branch `codex/delegated-team-aggregate-status`
- Base: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01` (fetched 2026-10-09)
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted in the worktree.

## Constraints and key design points

- Do not change `@autobyteus/collaboration-stream-contracts` `foldTeamAggregateStatus`. It is used by server Project Task worker status and by Org single-agent normalization.
- One rule owner: `resolveTeamStatus(statuses, runAlive): TeamStatus` in `autobyteus-web/utils/workspaceTeamAggregateStatus.ts`. No Team row may fold statuses directly.
- Team-run rows: derive at render time from `team.executionRows` (navigation patches update only agent rows).
- Agent-root task Teams: count from the context's tree nodes (collapsed children are not emitted), respect `closedSubtrees()`, gate by `isActive`.
- Org: `runAlive = authority === 'live'`, filter by `isListed`.
- Stop/archive/delete buttons and their visibility unchanged.
- Validation per `TESTING.md`; never the user's installed app or `~/.autobyteus` data. AC-011 is explicit user verification on an isolated worktree build.
- Docs sync passages and follow-up dead-code removal (running/* + TeamActivityDot) are listed in the design spec.

## Open risks / assumptions

- ASM-001: Team dots are as fresh as the agent statuses they are built from (non-subscribed runs show the last snapshot).
- ASM-002: an alive Team with no started member reads gray (approved consequence).
- Recorded clarification in requirements (anything shown under a Team row counts). It matches the earlier approved sub-team rule and has been surfaced to the user.

## Next expected action

Implementation Engineer implements per design-spec.md, runs implementation-scoped checks and produces the implementation handoff.

## Route record

- 2026-10-09: `get_handoff_rules` applied; matching rule "Small or Medium and Low". Sent to `/software_engineering_team/implementation_engineer` (accepted, run `implementation_engineer_e16f952d9cc04beca9bbe300a2ad3ad1`).
