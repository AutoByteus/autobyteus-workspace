# Requirements Document — Universal Team status (delegated Team aggregate status)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `delegated-team-aggregate-status`
- Request / ticket: Project Task `project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56`
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-09
- Approval state and reference: **AP-001, 2026-10-09, in the requirements conversation.** The user proposed the universal rule ("as long as one of the members is busy, the team is busy … all idle, idle … all offline, offline … universal status tracking for teams"). The Solution Designer refined it as: rank busy > error > idle > offline; starting counts as busy; keep error; stopped run is gray; the group row follows the same ranking across its runs; a dot before the icon. The user answered "yesss … of course we're going to keep error … starting as busy … stop the run, of course it's gray", then after the clarification: "I agree with you … when it comes to the team, shows the highest state that any of its members has. I think that's reasonable", and confirmed the group-row meaning ("how the color shows follow the same rule"). The approval covers REQ-001..008, AC-001..011 and SCN-001..005 below. It does not cover release or installed-app changes.
- Exact approved requirements baseline / solution revision: R2 / SR-002 (R1 / SR-001 was never approved; superseded)
- Behavior-defining supplements and their approved versions: None
- Recorded clarification (no new intent; user may object): "anything shown under the Team row" counts toward its status. That means its members, nested Teams and work they delegated, but not closed (DONE) work. This matches the already-approved sub-team and Org-Team aggregate (`subteam-aggregate-status` REQ-002) and the collapsed-row meaning "is anything under this row busy?".

## Problem And Desired Outcome

- Problem: Team rows in the Workspaces tree use three different status meanings. Delegated ("temporary task") Team rows show **no** status: a gray people-group icon, even while members work. Standalone TeamRun rows and Team group rows show **"alive = blue"**: blue whenever the run is running, even when every member is idle, and never green. Nested Team rows and Org-internal Team rows show a **member aggregate**. Blue therefore means "working" on agent and sub-team rows but only "alive" on the standalone run row.
- Affected actors: a user watching Teams in the Workspaces tree under Agent, Team and Org runs and under TEAMS.
- Desired outcome: One universal Team status everywhere. A Team shows the highest state any agent under it has: **busy (blue) > error (red) > idle (green) > offline (gray)**. A starting member counts as busy. A stopped run is always gray. A Team group row shows the highest state across its runs.
- Observable definition of success: (1) The delegated `software engineering team` whose `solution designer` is Running shows a blue dot, also when collapsed. (2) The standalone run "we need to support two m…" with `solution_designer` idle and the rest offline shows green, not blue. (3) A stopped run shows gray.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Delegated Team row under an Agent run: no status. | Universal Team status dot. | Member rows' own dots, slate people-group icon, name, layout, selection, expansion, tooltip identity. | listTaskRows; WorkspaceTransientExecutionRow; screenshot 1 |
| BEH-002 | User | SCN-002 | Delegated Team rows (and Teams nested in them) under a Team run: no status. | Universal Team status dot. | Same. | teamExecutionTreeSelectors |
| BEH-003 | User | SCN-003 | Delegated Team rows under an Org run: no status. | Universal Team status dot. | Same. | agentOrgHistoryRows; Org collection |
| BEH-004 | User | SCN-002, SCN-003 | Nested configured Team rows and Org-internal Team rows: five-state member aggregate (a starting-only Team shows amber). | Universal rule: same, except a starting member now reads busy (blue), and a stopped run reads gray. | Position (dot before the people-group icon), collapsed visibility, accessible status text. | workspaceHistoryTeamBranchStatus; agentOrgTeamBranchStatus |
| BEH-005 | User | SCN-004, SCN-005 | Standalone TeamRun row and Team group row under TEAMS: binary blue (alive) / gray (stopped), from run lifecycle only. | Universal Team status dot. Run row: from its agents, gray when stopped. Group row: highest state across its runs. | Row layout, Stop/archive/delete buttons and their visibility (still driven by the run being alive), avatar, counts, expansion. | TeamActivityDot; WorkspaceHistoryWorkspaceSection; screenshot 2 |
| BEH-006 | User | — | Agent rows (standalone run rows, member rows, task Agent rows) and the Org root row. | Unchanged. The Org root row is an Org, not a Team. | All. | StatusDot; Org collection l.61 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User monitoring Teams | Tell at a glance whether a Team is working, failed, idle or offline | Every Team row uses the same rule and colours as agent rows | Colour must never mean something different on a different Team row |
| Frontend execution tree | Present status accurately | Team status derived only from agent statuses already shown in the tree, gated by the run being alive | No new API, stream event or persisted Team status |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | See a delegated Team's status under an Agent run, expanded or collapsed | SCN-001 |
| UC-002 | See delegated/nested Team status under a Team run | SCN-002 |
| UC-003 | See delegated/Org-internal Team status under an Org run | SCN-003 |
| UC-004 | See a standalone TeamRun's status on its run row | SCN-004 |
| UC-005 | See a Team definition group's status on its group row under TEAMS | SCN-005 |
| UC-006 | See every Team status update as agents start, work, fail, go idle or stop | SCN-001..005 |

### Out Of Scope

- Any server, API, stream-event or persisted Team status. The server's Project Task worker status for a delegated Team (shared fold, where a starting coordinator reads "initializing") is unchanged.
- Project Task board worker lines, Memory views, Team catalog/config screens, the Org root row.
- `components/workspace/running/*` (not mounted in the app; see investigation notes).
- Changing Agent status, root lifecycle, Stop/archive/delete availability, lazy member activation, selection, expansion, ordering, labels.
- Making non-selected/stored views live-updating (a Team dot is as fresh as the agent statuses it is built from).

### Non-Goals

- Member counts, progress, or a per-member breakdown on a Team row.
- A new colour palette or icon redesign. The Team icon stays slate; the status is a dot.

### Preserved Behavior Boundary

BEH-006, and the preserved columns of BEH-001..005. REQ-007 and AC-009/AC-010 are no-regression boundaries.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **Universal Team status rule.** A Team's status is the highest state among the agents it counts (REQ-002), ranked busy > error > idle > offline. Busy = any agent running or starting. Otherwise error = any agent in error. Otherwise idle = any agent idle. Otherwise offline. Missing/unknown statuses count as offline. | BEH-001..005 | Must | One meaning per colour; a Team reads like one big agent | AP-001 |
| REQ-002 | **What counts.** A Team row counts every agent shown under it: its members, agents of Teams nested in it, and agents its members delegated, whether the row is expanded or collapsed. It never counts agents of closed (DONE/CANCELLED) work hidden from the tree, or agents outside its subtree. Each agent counts with the same status its own row shows. | BEH-001..005 | Must | Collapsed monitoring; a Team dot never contradicts the rows under it | AP-001; recorded clarification |
| REQ-003 | **Stopped is gray.** When the run that contains the Team is not alive, the Team shows offline, whatever its agents last reported. | BEH-001..005 | Must | A stale member status must not make a stopped Team look busy | AP-001 |
| REQ-004 | **Group row.** A Team definition group row under TEAMS shows the highest state among its listed runs' statuses (REQ-001 ranking). | BEH-005 | Must | Same rule one level up | AP-001 |
| REQ-005 | **Where.** REQ-001..003 apply to every Team row in the Workspaces tree: delegated Team rows and Teams nested in them under Agent, Team and Org runs; nested configured Team rows; Org-internal Team rows; standalone TeamRun rows. REQ-004 applies to Team group rows. | BEH-001..005 | Must | Universal | AP-001 |
| REQ-006 | **Presentation.** The status is a solid dot placed before the unchanged slate people-group icon (run and group rows: in the existing dot position). Colours are the agent status colours: busy blue with pulse, error red, idle green, offline gray. | BEH-001..005 | Must | Matches agent rows and existing nested-Team rows | AP-001 |
| REQ-007 | **Accessible and unchanged otherwise.** Each Team row's accessible label and tooltip state the Team status in words. Nothing else on these rows changes: the icon, name, layout, selection, expansion, focus, Stop/archive/delete buttons and when they appear. | BEH-001..006 | Must | Not colour-only; no regressions | AP-001 |
| REQ-008 | **Live.** Team dots update with the underlying agent statuses and run liveness, without expanding, selecting or refreshing, and without new network requests or polling. | BEH-001..005 | Must | Monitoring | AP-001 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005, REQ-006 | BEH-001, SCN-001 | Live Agent run; a delegated Team whose coordinator is running, others offline | Blue pulsing dot before the slate people-group icon on the Team row | — | Unit + component tests; user verification in desktop app |
| AC-002 | REQ-001 | SCN-001..004 | Agents: idle coordinator + offline members | Green dot | All offline → gray | Unit tests |
| AC-003 | REQ-001 | SCN-001..004 | One agent initializing, none running | Blue dot (busy) | — | Unit tests |
| AC-004 | REQ-001 | SCN-001..004 | One agent in error, one idle, none busy | Red dot | One busy + one error → blue | Unit tests |
| AC-005 | REQ-002, REQ-008 | SCN-001, SCN-002 | Team collapsed; an agent under it goes idle → running | Dot turns green → blue with no expand/refresh | — | Component test with reactive change |
| AC-006 | REQ-002 | SCN-001..003 | A running agent is under the Team but its task is closed (hidden); the rest idle | Green (hidden agent not counted) | — | Unit test |
| AC-007 | REQ-003 | SCN-001..005 | Run not alive while an agent's last known status is running | Gray | — | Unit test per surface |
| AC-008 | REQ-004 | SCN-005 | Group with runs: one stopped, one idle, one busy | Blue; with busy run stopped → green; all stopped → gray | — | Unit/component test |
| AC-009 | REQ-005, REQ-006 | BEH-004, BEH-005, SCN-002..005 | Team-run root with nested and delegated Teams; Org run with internal and delegated Teams; TEAMS group and run rows | Every Team row has exactly one Team status dot; agent rows and the Org root row unchanged | — | Component tests + browser probe update |
| AC-010 | REQ-007 | BEH-001..006 | Any Team row | aria-label/title include the status word; Stop/archive/delete buttons appear exactly as before | — | Existing regression suites + new assertions |
| AC-011 | REQ-001..008 | SCN-001, SCN-004 | The user's real setup in the desktop app (worktree build) | Delegated Team with a running member is blue; idle standalone run is green; stopped run is gray | — | Explicit user verification |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Know which delegated Teams are working | Workspaces tree under an Agent run (e.g. Project Task Manager) | The agent delegated Teams (`delegate_task`/`@`) | Look at the run's Team rows, collapsed or expanded | Each Team row's dot follows REQ-001..003 | Host stopped → gray | Supported Normal Scenario | Screenshot 1 | REQ-001..003, 005..008; AC-001..007 |
| SCN-002 | User | User | Same | Tree under a Team run | Team members delegated Teams; configured nested Teams | Same | Same | Same | Supported Normal Scenario | teamExecutionTreeSelectors | AC-005, AC-009 |
| SCN-003 | User | User | Same | Tree under an Org run | Org Teams; delegated Teams | Same | Same | Same | Supported Normal Scenario | agentOrgHistoryRows | AC-009 |
| SCN-004 | User | User | Know whether a standalone Team run is working | TEAMS → Team group → run row | A standalone TeamRun, alive or stopped | Look at the run row | Dot follows REQ-001..003 | Restored-but-not-started Team (all offline) → gray, Stop still available | Supported Normal Scenario | Screenshot 2; agent_teams.md "Active while every configured Agent remains Offline" | AC-002, AC-007, AC-011 |
| SCN-005 | User | User | Know whether any run of a Team definition is working | TEAMS → Team group row | Group with several runs | Look at the group row, collapsed | Highest state across runs | All stopped → gray | Supported Normal Scenario | workspaceHistoryTeamDefinitionGroups | AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement / runnable UI reference / design repository / UI/UX spec / Product ticket / design revision / UI/UX confirmation / visual baseline: N/A — not applicable (no Product Design requested)
- Normative details: REQ-006 (dot before the slate people-group icon; agent status colours; blue pulses).
- Illustrative content: screenshot names and counts.
- Required states: busy, error, idle, offline; collapsed and expanded.
- Unresolved product decisions: none.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-007 | Accessibility | Status available as text (aria-label/title) | All Team rows | Component tests |
| QR-002 | REQ-008 | Performance | No added network request or polling; status derived from in-memory rows | — | Code review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Per-agent `AGENT_STATUS` / `agent_statuses`; root lifecycle `is_active` | Unchanged; Team status derived on the client | view projectors; agent_teams.md | None |
| Shared `foldTeamAggregateStatus` | Unchanged; also used by server worker status and Org agent rows | investigation notes | Changing it would alter Org agent rows and server worker status → not changed |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56/context/ctx_c091e4192332__18.png` | Screenshot 1, delegated rows | BEH-001 | Final | Evidence only |
| `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/eb8d3dfe-7b82-4daa-9b3b-007fa8435aeb/images/1.png` | Screenshot 2, standalone run row blue while idle | BEH-005 | Final (temporary path) | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A Team dot is as fresh as the agent statuses it is built from. Verified (investigation R-002): standalone TeamRun rows and Teams inside them are live (every active TeamRun gets a live stream on history load). Delegated Teams under an Agent run are live once that run has been selected in this session; before that they show a one-time snapshot. Teams inside an Org are live once the Org has been opened; before that they read gray. | Avoids widening scope | Remaining gap (Agent-run hosts never selected, Orgs never opened) proposed as a follow-up | Open — user decision |
| ASM-002 | A restored Team run that is alive but has no started member reads gray (all offline) while its Stop button remains. | Direct consequence of REQ-001 | Accepted under AP-001 ("if all of them are offline, the team is offline") | Accepted |

## Open Decisions And Questions

| ID | Question | Status |
| --- | --- | --- |
| DEC-001 | Dot vs. coloured icon | Resolved by AP-001: dot before the slate icon |
| DEC-002 | Five vs. three colours | Resolved by AP-001: busy (incl. starting) blue, error red, idle green, offline gray |
| DEC-003 | Standalone run/group rows | Resolved by AP-001: universal rule applies |
| DEC-004 | Presentation (REQ-006), reopened 2026-10-11 by user feedback during AC-011: dot before the slate icon (A, shipped), coloured people-group icon (B, the user's original idea), or a status badge on the icon (C)? | Open: user decision. Comparison mock: presentation-options/team-status-options.html / .png. AC-011 not passed; Delivery holds iso-51775-c59d. Choosing B or C changes REQ-006 (renewed approval) and needs a design and implementation revision |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001..006 | BEH-001..005 | AC-001..004 | SCN-001..005 |
| REQ-002 | UC-001..004, UC-006 | BEH-001..005 | AC-005, AC-006 | SCN-001..004 |
| REQ-003 | UC-001..005 | BEH-001..005 | AC-007 | SCN-001..005 |
| REQ-004 | UC-005 | BEH-005 | AC-008 | SCN-005 |
| REQ-005 | UC-001..005 | BEH-001..005 | AC-009 | SCN-001..005 |
| REQ-006 | UC-001..005 | BEH-001..005 | AC-001, AC-009 | SCN-001..005 |
| REQ-007 | UC-001..005 | BEH-001..006 | AC-010 | SCN-001..005 |
| REQ-008 | UC-006 | BEH-001..005 | AC-005 | SCN-001..005 |

## Architecture Phase Input

- Scenarios: SCN-001..005.
- Constraints: presentation-only; no change to the shared fold (used by server worker status and Org agent rows); independent of expansion; exclude closed work; gate by run liveness; one web owner of the Team rule.
- Deferred to architecture: owner of the Team rule; per-surface computation points; renderer changes; removal of the binary Team dot from the tree.
- Verify: Team-run rows for collapsed subtrees exist in `executionRows`; navigation patches update agent rows without recomputing Team rows (derive at render time).
- Risks: R-001 (Agent-run tree omits collapsed children).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (AP-001)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
