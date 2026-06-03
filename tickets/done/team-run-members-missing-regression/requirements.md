# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix the regression where opening a Software Engineering Team run in the frontend, with the frontend pointed at the Electron-started backend, shows only `solution_designer` in the selected team-run member display. The selected team run must show the full authoritative team roster while preserving the separate active-execution targeting rules used for task-agent/composer safety.

## Investigation Findings

- Reproduced on 2026-06-02 by running the frontend against the Electron-started backend at `http://localhost:29695`, opening `/workspace`, expanding `autobyteus-workspace-superrepo -> Software Engineering Team`, and clicking the active bug-report team row.
- Screenshot evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/done/team-run-members-missing-regression/reproduction-only-solution-designer.png` shows the selected team run displaying only `solution_designer` in the center workspace and expanded tree/member area.
- Backend GraphQL evidence shows the selected active team run has all six authoritative members in both `memberTree` and `members`: `solution_designer`, `architecture_reviewer`, `implementation_engineer`, `code_reviewer`, `api_e2e_engineer`, `delivery_engineer`. Runtime probe summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/done/team-run-members-missing-regression/runtime-probe-summary.json`.
- Current frontend code drops the other members for live/local team contexts by applying `filterActiveExecutionMemberTree(...)` inside `buildTeamRowsFromContext(...)` and by rendering `TeamGridView` / `TeamSpotlightView` from `flattenActiveExecutionMemberNodesForDisplay(...)` instead of the full topology/roster tree.
- Git history points to the recently merged `codex/runtime-tool-mcp-unification-analysis` ticket. Commit `cc2151f664f1a87785967cde1087da64bb2fd45d` introduced `teamActiveExecutionMembers.ts`, switched `TeamGridView.vue` and `TeamSpotlightView.vue` to active-execution filtering, and added `filterActiveExecutionMemberTree` in `runHistoryTeamRows.ts`. It merged to `personal` via merge commit `9667d376` on 2026-06-02.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The backend/API boundary supplies the full roster; the frontend active-execution projection is being reused as the roster/topology projection in history rows and team workspace views.
- Requirement or scope impact: The fix must restore full roster display without deleting the task-agent active-execution helper entirely, because that helper still owns composer target safety and active task-agent behavior.

## Recommendations

Make a clean separation between:

1. **Team roster/topology projection**: all logical team members and subteam nodes from `AgentTeamContext.memberTree` / persisted `memberTree`; used by history tree expansion, Grid view, Spotlight view, and roster-style member display.
2. **Active execution projection**: coordinator/directly active members plus active task-agent instances; used only for composer target resolution, active-execution focused member fallback, and the task-agent activity bar.

Do not solve this by adding a backend fallback or compatibility read path; the backend payload is already correct for the reproduced scenario.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens the frontend against an Electron-started backend, clicks a Software Engineering Team run row, and sees every team member in the selected run roster/member display.
- UC-002: The expanded team row in the workspace history tree lists all authoritative members for the selected live or historical team run.
- UC-003: Grid and Spotlight team workspace modes use the roster/topology projection so non-active members are still visible as team members.
- UC-004: Active-execution routing for the composer and task-agent activity UI remains protected from stale task-only logical worker rows.
- UC-005: Existing single-agent run detail behavior remains unaffected.

## Out of Scope

- Changing team definitions, agent-team packaging, or backend team-run metadata persistence.
- Redesigning task delegation or task-agent lifecycle semantics.
- Adding backward-compatible alternate roster sources for malformed payloads.
- Changing Electron backend startup behavior.

## Functional Requirements

- REQ-001: The selected Software Engineering Team run must render all six authoritative members: `solution_designer`, `architecture_reviewer`, `implementation_engineer`, `code_reviewer`, `api_e2e_engineer`, and `delivery_engineer`.
- REQ-002: Team roster/history display must be derived from the authoritative team topology (`memberTree`/definition metadata), not from active execution filtering, messages, or current/focused-member activity.
- REQ-003: Grid and Spotlight workspace views must display the full roster/topology, including inactive members with no conversation messages.
- REQ-004: Active-execution filtering must remain available for composer target resolution, stale task-agent route normalization, and task-agent activity surfaces only.
- REQ-005: Backend GraphQL/API behavior must not be changed unless implementation discovers a payload absent in a different scenario; for the reproduced Electron backend path, backend data is already correct.
- REQ-006: Regression coverage must prove that a live team context with a coordinator plus inactive/unmessaged members still displays every roster member.
- REQ-007: Existing protection against previewing task-agent work packets as logical parent conversation content must remain intact.

## Acceptance Criteria

- AC-001: Reproducing the reported scenario shows all six Software Engineering Team members after clicking any Software Engineering Team run row.
- AC-002: `runHistoryTeamRows`/history-tree coverage verifies live `AgentTeamContext.memberTree` rows are not filtered down to only active execution members.
- AC-003: `TeamGridView` coverage verifies inactive/unmessaged logical members render in the grid.
- AC-004: `TeamSpotlightView` coverage verifies inactive/unmessaged logical members remain selectable/visible in secondary or primary roster positions.
- AC-005: Task-agent-specific coverage verifies the task-agent activity bar and active-execution focused route still exclude settled task-only logical worker execution targets.
- AC-006: A browser or component-level validation against the Electron-started backend records that the backend still returns six members and the UI displays six members.
- AC-007: Single-agent run selection and display still pass existing focused tests.

## Constraints / Dependencies

- Must work when the frontend is run separately against the backend started by the Electron app.
- Must preserve existing active-execution task-agent safety behavior; the active-execution helper should be narrowed, not removed blindly.
- No backward-compatibility wrapper or dual roster source should be retained solely to preserve the old incorrect one-member display.
- Keep the fix local to frontend projection/rendering unless implementation finds another payload path that contradicts the current runtime probe.

## Assumptions

- The Software Engineering Team definition contains the six expected members.
- The reproduced Electron backend path is representative of the user-reported bug.
- The prior runtime-tool MCP unification ticket intended to separate active execution from roster/topology, but the current implementation leaked active-execution filtering into roster surfaces.

## Risks / Open Questions

- Grid/Spotlight currently share focus state with active-execution composer targeting. Implementation must avoid reintroducing stale task-agent send targeting while making roster members visible.
- If other team types include nested subteams, tests should cover recursive roster preservation, not only flat teams.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003
- REQ-002 -> UC-001, UC-002, UC-003
- REQ-003 -> UC-003
- REQ-004 -> UC-004
- REQ-005 -> UC-001
- REQ-006 -> UC-001, UC-002, UC-003
- REQ-007 -> UC-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the primary user-visible reproduction.
- AC-002 prevents roster loss in the history tree/live context merge path.
- AC-003 and AC-004 prevent roster loss in team workspace visual modes.
- AC-005 preserves the recently added active-execution/task-agent safety behavior in its proper boundary.
- AC-006 ties automated validation back to the Electron-backend scenario.
- AC-007 guards unrelated single-agent behavior.

## Approval Status

Design-ready from explicit user bug report plus reproduced runtime evidence. No product-level clarification remains open; downstream review should focus on the projection-boundary design and validation scope.
