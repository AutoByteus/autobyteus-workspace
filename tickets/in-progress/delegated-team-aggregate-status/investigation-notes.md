# Investigation Notes — Delegated (task) Team aggregate status

## Investigation Meta

- Package identifier: `delegated-team-aggregate-status`
- Request / ticket: Project Task `project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status` on `codex/delegated-team-aggregate-status`
- Resolved base remote / branch / revision: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01` (fetched 2026-10-09; `origin/HEAD` → `origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from the freshly fetched base. Main checkout (`personal`, dirty, 145 commits behind) was not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate): `.claude/skills/solution-designer/SKILL.md`, `references/requirements-engineering.md`, `templates/requirements-doc-template.md`, `templates/investigation-notes-template.md`, `templates/solution-revision-record-template.md`; root `AGENTS.md`; `autobyteus-web/AGENTS.md` (all 2026-10-09)
- Investigation status: Requirements and architecture investigation complete (2026-10-09).

## Initial Request And Clarifications

- Original request: Delegated team copies in the sidebar always show a gray team icon, so they look offline even while members are working. Show the team's aggregate status on its row: blue = any member active, green = alive but idle, gray = whole team offline. Match agent rows and standalone/sub-team rows. Check whether the remembered "coloured team/group icon" code still exists. Settle with the user: coloured icon or a status dot next to it.
- Clarifications received: none yet (DEC-001, DEC-002 open).
- User-supplied facts: screenshot `ctx_c091e4192332__18.png` (2026-10-09). Seven delegated Team rows under the Project Task Manager run all show a slate people-group icon with no status. The middle pane shows that team's `solution designer` as **Running**. The standalone TeamRun under TEAMS shows a status dot.
- Initial ambiguity: whether the remembered coloured icon was ever a status cue; dot vs. coloured icon; whether `error`/`initializing` states are included.

## Product And Domain Understanding

- Product area: Workspaces/Teams sidebar execution tree (`autobyteus-web/components/workspace/history`).
- Delegated ("temporary task") Team: a Team copy started by an agent with `delegate_task` or `@`. It appears as a `transient_execution` row (`transientKind: 'task_team'`) under an Agent run, a Team run, or an Org run.
- Since `delegated-team-member-lazy-activation`, only the coordinator starts. Other members stay `offline` until contacted.

## Source Log

| Date | Type | Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | User | screenshot ctx_c091e4192332__18.png | Reported symptom | Delegated Team rows: slate group icon, no dot, tooltip "Temporary task team · …". A member is Running. | — |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Delegated row renderer (Agent-run and Team-run roots) | `StatusDot` renders only `v-if="row.memberKind === 'agent'"`; a Team row gets an empty status slot plus a static `text-slate-500` people-group icon. | Add team dot here |
| 2026-10-09 | Code | `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` `listTaskRows` (l.256-300) | Builds Agent-run task rows | Task-Team row `currentStatus: null`. Member rows use `contexts.get(id).state.currentStatus`. Children are emitted only while expanded. Closed (DONE) subtrees are hidden. | Aggregate must not depend on expansion |
| 2026-10-09 | Code | `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` (l.229-310) | Builds Team-run navigation rows | `task_team` and `task_team_member` rows carry `currentStatus: null`. Agent rows carry their live context status. | Same gap under Team roots |
| 2026-10-09 | Code | `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` (l.85-107) | Maps navigation rows to transient rows | Passes `execution.currentStatus` (null for Teams). | — |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue`, `workspaceHistoryTeamBranchStatus.ts` | Existing sub-team aggregate | Stable configured sub-team rows get `TeamAggregateStatusDot` via `aggregateTeamBranchAgentStatus`, which scans descendant rows by depth and folds with authority `live`. It explicitly returns `offline` for non-stable rows. | Reusable rule; transient rows excluded |
| 2026-10-09 | Code | `autobyteus-web/utils/agentOrgHistoryRows.ts`, `services/agentOrgExecution/agentOrgTeamBranchStatus.ts`, `WorkspaceAgentOrgHistoryCollection.vue` (l.146-164) | Org roots | Configured Org Team rows show `TeamAggregateStatusDot` + gray group icon. The Org `task_team` row type has no `status`; its renderer shows only the slate icon. Org statuses use authority `live` or `historical`. | Same gap under Org roots |
| 2026-10-09 | Code | `autobyteus-collaboration-stream-contracts/src/team-aggregate-status.ts` | Shared rule | `foldTeamAggregateStatus`: highest rank of offline < idle < error < initializing < running. Unknown values count as offline. `historical` demotes running/initializing to offline. The server's task-execution adapters use it too. | Reuse, no new rule |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/history/TeamAggregateStatusDot.vue`, `common/StatusDot.vue` | Dot presentation | Five-state solid dot (running blue pulse, initializing amber pulse, error red, idle green, offline gray) with localized `team_status_*` label/title. | Reuse |
| 2026-10-09 | Code | `autobyteus-web/components/workspace/common/TeamActivityDot.vue`, `WorkspaceHistoryWorkspaceSection.vue` l.224/281 | Standalone TeamRun / definition rows under TEAMS | Binary dot: blue active, gray inactive. This is the "status dot" the user saw next to the standalone team. | Preserve unchanged |
| 2026-10-09 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts`; `standalone-agent-run-root-manager.ts` l.223 | Status source | The live view carries per-member `agent_statuses`. Inspecting an inactive root returns empty statuses, so every member is offline. | Gray for a stopped host follows naturally |
| 2026-10-09 | Git | `git show c21d312c0` (2026-10-06 "clean delegated-row style") | "Coloured icon" history | Before 2026-10-06 the delegated Team icon was an **indigo bolt in a dashed indigo box**: a fixed colour that marked a *temporary* team, not a status. Commit c21d312c0 made it slate. `d27880bf7` (2026-10-08, restore-team-group-icon) swapped the bolt for the people-group. | Answer to the user's memory |
| 2026-10-09 | Git | `git log -S TeamAggregateStatusDot`, `-G` for status-coloured icon patterns | Has a status-coloured team icon ever existed? | No. Team status was only ever shown by a dot (`TeamAggregateStatusDot` since `dcd0baf8c`/`772c69249`, 2026-08/09). No code colours the team glyph by status. | DEC-001 |
| 2026-10-09 | User | Second screenshot (standalone TeamRun "we need to support two m…") | User points to standalone and Org-internal Team status | Run row dot is **blue** while `solution_designer` is idle (green) and all other members are offline (gray). | Shows the root dot means "alive", not "running" |
| 2026-10-09 | Code | `WorkspaceHistoryWorkspaceSection.vue` l.224-230, l.281-287; `workspaceHistoryTeamDefinitionGroups.ts` | Standalone TeamRun / definition dot | `TeamActivityDot :is-active="team.isActive"` / `group.hasActiveRuns`: binary blue/gray from the run's lifecycle, not computed from members. It never shows green. | DEC-003 |
| 2026-10-09 | Code | `WorkspaceAgentOrgHistoryCollection.vue` l.61, l.146; `agentOrgTeamBranchStatus.ts` | Org root and Org-internal Team | Org root row: binary emerald/gray `run.isActive`. Org-internal (configured) Team row: five-state aggregate from its members' statuses (blue only if a member runs, green when idle, gray when offline). This is the requested rule. | Reference rule |
| 2026-10-09 | Code | `autobyteus-server-ts/src/compositions/project-task-agent-resource-composition.ts` l.36-39; `team-task-execution-adapter.ts` l.177; `standalone-root-task-execution-adapter.ts` l.219-231; `agent-org-task-execution-adapter.ts` l.213 | Server status for a delegated Team | The server already computes a delegated Team's aggregate with `foldTeamAggregateStatus` over its leaf Agent statuses (Project Task worker status). An inactive host answers offline. | Same rule already applies to delegated Teams server-side; the sidebar lacks it |
| 2026-10-09 | Code | `stores/runHistoryTypes.ts` l.215-220 (`TeamTreeNode.isActive`, `members`, `executionRows`); `stores/runHistoryNavigationPatches.ts` l.93-130 | Feasibility of a member aggregate on the standalone TeamRun row (UD-001) | Each TeamRun node already holds its member execution rows. Member statuses are patched from `team_member` status events. So a root-row aggregate can come from data already in the store, with no new request. | Design input if UD-001 confirmed |
| 2026-10-09 | Code | `grep RunningTeamRow\|RunningTeamGroup` | Other `TeamActivityDot` users | `components/workspace/running/*` is mounted only by an e2e fixture, not by the app | Out of scope |
| 2026-10-09 | Doc | `tickets/done/subteam-aggregate-status/requirements-doc.md` | Prior scope | Approved aggregate for nested configured Teams. **Explicitly out of scope: "Adding aggregate dots to transient task-Team rows"**. This is the gap now requested. | Extend scope |
| 2026-10-09 | Doc | `tickets/done/restore-team-group-icon/requirements-doc.md` | Icon identity | Approved: every Team identity glyph is the filled people-group. Colours and statuses are preserved. | A status-coloured glyph would change that identity styling (DEC-001) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | An agent delegates a Team (`delegate_task`/`@`) under an Agent run | The task-Team row appears under the run. Its members appear when it is expanded. | Team row: slate people-group icon, no status, whether expanded or not. Member rows show their own five-state dots. | listTaskRows; WorkspaceTransientExecutionRow; screenshot | High |
| BEH-002 | User | Same, under a Team run (a task Team started by a Team member) | Navigation rows → transient rows | Same: no Team status. | teamExecutionTreeSelectors; runHistoryTeamExecutionRows | High |
| BEH-003 | User | Same, under an Org run | `projectAgentOrgHistoryRows` → Org collection | Task-Team row: slate icon, no status. Configured Org Team rows do have an aggregate dot. | agentOrgHistoryRows; WorkspaceAgentOrgHistoryCollection | High |
| BEH-004 | User | Nested configured Team in a TeamRun | `aggregateTeamBranchAgentStatus` | Five-state aggregate dot before the slate people-group icon, current while collapsed. | subteam-aggregate-status | High |
| BEH-005 | User | Standalone TeamRun / Team definition rows under TEAMS | `TeamActivityDot` | Binary blue/gray activity dot. | TeamActivityDot | High |

## Relevant Codebase And Technical Facts

| Path | Behavior | Requirement Implication | Design Question |
| --- | --- | --- | --- |
| `foldTeamAggregateStatus` (shared contracts) | One rule, five states | Use the same rule for delegated Teams, not a new 3-colour rule | Authority per root: Agent/Team roots use `live` (as sub-teams do); Org uses its existing live/historical source |
| `listTaskRows` | Collapsed children not emitted | The aggregate must be computed from the tree, not from visible rows | Fold descendants in the context |
| Team-run `executionRows` | Every row is present; visibility filtered in the component | The depth scan used for sub-teams works for transient Team rows | Extend `aggregateTeamBranchAgentStatus` or set `currentStatus` in the selector |
| Closed (DONE) subtrees | Hidden from rows | Hidden members must not count | Respect `closedSubtrees` / `isListed` |

## Structural And Payload Surface Inventory

- Payload surfaces: none. No persisted or API data changes.
- Structural surfaces: frontend presentation and projection only (3 row projections, 2 row renderers). Shared fold reused.
- API / persistence / security / concurrency / deployment impact: confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| Screenshot review | PTM Agent run with seven delegated Teams, one with a Running member | No status on any Team row | Confirms BEH-001 | ctx_c091e4192332__18.png |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, 2026-10-09 task | Tell working delegated Teams apart from offline ones at a glance | Direct | REQ-001..004 | Dot vs. coloured icon (DEC-001); include amber/red (DEC-002) |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| `AGENT_STATUS` / root view `agent_statuses` | collaboration-stream-contracts | Per-Agent statuses only. No aggregate Team status event. | view projectors | None. The aggregate stays presentation-only. |

## Persisted Data And State Facts

- Affected stored subject: none. Presentation only.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The user asked to settle dot vs. coloured icon directly (DEC-001).

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56/context/ctx_c091e4192332__18.png` | User | Symptom evidence | BEH-001 | REQ-001 | Final | Evidence only, not normative |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | For a live Agent-run host that is not the selected run, the task tree comes from a one-time inspection, so member statuses may be a snapshot rather than live. | The Team dot would be as fresh as the member dots, not fresher | Existing behavior. The Team dot follows its member rows (REQ-003). | Accepted, not changed |
| R-002 | Risk (corrected twice, 2026-10-09) | **Freshness per root, verified.** (a) **Team runs: live.** Every history load (`fetchRunHistoryTree` → `reconcileDiscoveredActiveRuns`, `stores/runHistoryLoadActions.ts` l.143, l.276-400) opens every active TeamRun (`openTeamRun`, `selectRun: false`) and connects its `/ws/agent-team/:id` stream (`teamRunOpenCoordinator.ts` l.87; existing contexts reconnect at l.380). Active standalone Agent runs likewise get `/ws/agent/:id`. So TeamRun rows and their nested/delegated Team rows receive live `AGENT_STATUS` and lifecycle events. The earlier R-002 claim "snapshot only" was wrong for these. (b) **Delegated Teams under an Agent run: live only once the host was selected** while running in this session. `useAgentRunCollaborationSync` (`AgentWorkspaceView.vue`) attaches `/ws/agent-collaboration/:hostRunId` for the selected host and does not detach on deselection. A host never selected uses one inspection (`AgentRunTaskRows.loadStored`), which is a snapshot. (c) **Org runs: live only once opened** (`agentOrgContextsStore.readInspection` attaches when active; `reconcileRetainedHistory` re-attaches only existing contexts). A never-opened Org has no statuses, so its Team rows read gray, which is existing behavior for Org Team rows. | Gap limited to (b) and (c) | Follow-up candidate: attach collaboration/Org streams for every active run on history load, as Team runs already do | Open — user decision |
| R-001 | Risk | The Agent-run tree emits collapsed children only when expanded. A naive "fold visible rows" would show gray while collapsed. | Collapsed monitoring is the main use | Design folds the tree, not the visible rows. AC-004. | Design input |

Architecture investigation (2026-10-09, after AP-001; authorities: `references/architecture-design.md`, `design-principles.md`, root `DESIGN.md`, root `TESTING.md`):

| Source | Observation | Design implication |
| --- | --- | --- |
| `grep foldTeamAggregateStatus` (all packages) | Shared fold used by 3 server task-execution adapters (Project Task worker status) and by web `agentOrgHistoryRows.exactAgentStatus` (single-agent normalization), `workspaceHistoryTeamBranchStatus.ts`, `agentOrgTeamBranchStatus.ts` | Do not change the shared fold; add a web Team rule that maps initializing→busy and gates by liveness |
| `stores/runHistoryNavigationPatches.ts` l.93-140 | `patchTeamMember` patches one agent row in `team.executionRows`; Team rows are not recomputed | Derive Team status at render time |
| `stores/runHistoryTeamExecutionRows.ts` l.30-48 | `executionRows` has all rows (collapsed included) with closed task rows filtered out; without a context, stable rows with history statuses | Depth scan works for nested, delegated and whole-run status |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` l.102-142, `team-run-live-projection-service.ts` l.20-30 | History list carries live member status snapshots for active Teams; inactive → empty/offline | Unopened live run rows have a basis (snapshot) |
| `services/agentCollaboration/agentRunCollaborationContext.ts` l.41, l.107-110, l.256-300, l.352-360 | `AgentRunTaskTreeRow` type; `isActive`; `listTaskRows` omits collapsed children; `closedSubtrees()` | Count from tree nodes in the context; put status on the display entry |
| `utils/agentOrgHistoryRows.ts` `statusSource`; `services/agentOrgExecution/agentOrgTeamBranchStatus.ts` | authority live/historical, `isListed`; configured Team fold ignores closure | Org Teams: alive = live authority; filter by `isListed` |
| `components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts`, its spec | `hasActiveRuns` read only by the section (and its spec) | Remove with the binary cue |
| `autobyteus-web/docs/agent_execution_architecture.md` l.398-433; `agent_integration_minimal_bridge.md` l.190-201; `agent_teams.md` l.167-173 | Document the binary root cue and "restored Team Active while every Agent Offline" | Docs sync needed; ASM-002 consequence |
| `tests/e2e/{nested-team-aggregate-status,team-activity-presentation,team-group-icon,nested-team-hierarchy}-probe.mjs` | Assert `team-activity-dot` / Team icon rows | Probes to update |

## Requirement Implications

- The aggregate rule and dot already exist; delegated Team rows were left out on purpose in `subteam-aggregate-status` and never added. So this extends an existing rule; no new rule is needed.
- No status-coloured team icon ever existed. The colour the user remembers was the fixed indigo "temporary team" bolt, removed 2026-10-06.

## Notes For Architecture Design

- Three projections: Agent root (`listTaskRows`), Team root (navigation selector or `aggregateTeamBranchAgentStatus`), Org root (`flattenTaskTeam`). Two renderers: `WorkspaceTransientExecutionRow` and the Org collection task-Team button.
- Reuse `foldTeamAggregateStatus` and `TeamAggregateStatusDot`. Respect closed subtrees. Fold regardless of expansion.

## Status Ownership Investigation (2026-10-09, user request: "where is agent status and team status ownership located")

| Fact | Owner (authoritative) | Evidence | Notes |
| --- | --- | --- | --- |
| Native runtime's internal phase (bootstrapping, awaiting LLM, executing tool, …) | `autobyteus-ts` `AgentStatusManager` (`src/agent/status/manager.ts`) | code | Native runtime only; finer than the API status |
| **Agent status** (5-state `offline/initializing/idle/running/error`, every runtime) | **Server `AgentRun`** (`autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` l.145 `getStatusSnapshot`, l.410 `dispatchCanonicalStatus` → `AGENT_STATUS`), internal `AgentTurnLifecycleState` (`agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts`) | code; `docs/design/agent_websocket_streaming_protocol.md` l.163 "Turn lifecycle and status are owned upstream by `AgentRun`" | Single owner per agent |
| Pending-command `initializing` overlay | Executable member handle (`agent-team-execution/services/member-command-status-overlay-store.ts`) | `docs/modules/agent_team_execution.md` l.336-339 | Replaced by AgentRun status |
| Collected agent statuses of a root | `RootTeamRun.getLeafAgentStatusSnapshots` (adds `offline` for dormant tree agents), `AgentOrgRun.getAgentStatusSnapshots`, standalone root snapshot | `root-team-run.ts` l.218-230; `agent-org-run.ts` l.186 | Collectors, not owners |
| **Team root lifecycle** (binary) | `RootTeamRun` (`lifecycle: active/terminating/terminated/persistence_fail_stop`, `isActive()` l.205) → `TEAM_RUN_LIFECYCLE {is_active}` | `agent-team-stream-handler.ts` l.142; protocol doc l.255 | Manager ownership, not activity |
| **Org lifecycle** (binary) | `AgentOrgRun` (`activating/active/terminating/terminated/fail_stop`, l.65, l.179) | code | |
| **Team status (aggregate)** | **No owner.** Deliberately absent from the server contract: `autobyteus-ts/docs/agent_team_streaming_protocol.md` l.14 "There is no public aggregate team status event"; `docs/modules/agent_orgs.md` l.316-318 "presentation-only aggregate … not a persisted Team status or lifecycle authority" | docs | |
| …yet the aggregate is computed in | (1) shared `foldTeamAggregateStatus` (contracts) used by (2) server task adapters ×3 for a delegated Team's Project Task worker status (`team-task-execution-adapter.ts` l.177-185 etc.), (3) web nested-Team rows (`workspaceHistoryTeamBranchStatus.ts`), (4) web Org Team rows (`agentOrgTeamBranchStatus.ts`); plus (5) the web binary `TeamActivityDot` on root rows | code | Duplicated policy; web reconstructs Team membership from tree rows |

Design implication: Team status is a derived fact of a TeamRun's own lifecycle and its own agents. The server `TeamRun` (root, nested and task copies) is the only node that knows its exact membership (including dormant agents via its index), its lifecycle and its closed task executions. The current web design reconstructs those from tree rows (depth scans, closure filters, per-root liveness), which is a `Boundary Or Ownership Issue` by `design-principles.md` §3 even though the rule itself is centralized. See SR-006.

## Product-Wide Validation Of The Server-Owned Status Proposal (2026-10-09)

| Place / concern | Finding (evidence) | Fit / adjustment |
| --- | --- | --- |
| Existing node-level feed | `/ws/projects` (`autobyteus-server-ts/src/api/websocket/projects.ts`, `projects/changes/project-change-publisher.ts`): `connected` first, no replay, broadcast to every client, remote-access auth, **mark → coalesce → read current state → emit**, clients recover by re-reading | Status feed should follow the same pattern (product-consistent, proven) |
| Root-level status hook | `RootTaskExecutionLifecycle.onAgentStatus(agentRunId, status)` (`agent-collaboration/execution/task/root-task-execution-lifecycle.ts` l.232-245) already receives every agent status change in a root and marks Project Task worker status | Natural trigger point for recomputing affected Team/Org statuses; no polling |
| Membership authority | `RootTeamRun.getLeafAgentStatusSnapshots` walks its index incl. dormant agents (l.218-230); `taskExecutionChainFor` gives an agent's containing copies | The root's index answers "what counts", authoritatively |
| Projects board | `ProjectTaskWorkers.vue` shows server worker status via `/ws/projects`; a Team copy = shared fold (starting = amber) | Today inconsistent with the approved sidebar rule (starting = busy). Server-owned Team status makes both read one value |
| Mobile (iOS/Android) | Native shells only wrap the web `/mobile` UI in a WebView (`autobyteus-ios/README.md`). `useMobileWorkCatalog.toStatusLabel` shows "Running" whenever `isActive` (a third meaning) | Same web store serves mobile; fixes this inconsistency too |
| Multiple windows / remote nodes | Feeds are per node, per window binding; `/ws/projects` already handles remote-access auth | Same handling |
| Lifecycle vs status | Docs require root lifecycle, agent status, delegated liveness to stay separate facts (`agent_team_execution.md` l.320-324) | Team status is a new derived fact; `TEAM_RUN_LIFECYCLE` stays and keeps driving Stop/archive. Consistent |
| What else background content streams provide | `ACTIVITY`/`PRESENTATION` navigation effects (`agentStreamMutationEffects.ts`) keep `lastActivityAt` ("1h") and summaries current for every active run | If content streams open only while viewing, the feed must also carry minute-bucketed last activity (and summary changes), or those go stale. Required for phase 2 |
| Agent tools / apps SDK / gateway | No agent/team runtime status exposed (`project-task-tool-contract.ts`; `application-agent-bindings.ts` is binding status) | Not affected |
| Ordering | `RootTeamRun`/`TeamRunEventPublisher` are the live change-sequence authority | Feed entries can carry the root's change sequence for stale-message rejection |

## Worker-Owned Status Check (2026-10-09, user: "the status belongs to the executing workers")

| Executing worker | Server object (verified) | Owns today | Can own its status? |
| --- | --- | --- | --- |
| Any agent (standalone, member, task agent, collaborator agent) | `AgentRun` (`agent-execution/domain/agent-run.ts`) | 5-state status, `AGENT_STATUS` | Already does |
| Any concrete team: root, configured sub-team, delegated task-team copy, collaborator team | `TeamRun`, "Authoritative local facade for exactly one concrete Team execution" (`agent-team-execution/domain/team-run.ts`), backed by `FlatTeamExecutionManager` per TeamRun; child teams are TeamRuns in `taskTeams` / `collaboratorTeams` registries | `isActive()` lifecycle; `getLeafAgentStatusSnapshots()` recursively over its own agents and child TeamRuns, `offline` for unstarted members (`flat-team-execution-manager.ts` l.117-130) | Yes: it has its members, its children and its lifecycle |
| Org | `AgentOrgRun` (`agent-org-execution/domain/agent-org-run.ts`), `getAgentStatusSnapshots()` over direct agents + mounted TeamRuns | binary lifecycle | Yes, same way |
| Event path | Member agent events go to the **root** through root-owned callback ports (`FlatTeamExecutionCallbacks.publishAgentEvent`); `RootTaskExecutionLifecycle.onAgentStatus` sees every change | — | The root stays the event router: it tells the TeamRun(s) containing the agent, which recompute their own status. The root does not own Team status |

Composition: a TeamRun's status = the approved rule over its own direct agents' statuses and its child TeamRuns' statuses, offline when it is not active. Because "highest" composes, this equals the rule over all leaf agents, and each level owns only its own value.

## Refinement: AgentRun Is The Only Executing Unit (2026-10-09, user)

- Verified: every executing worker (standalone agent, team member, task agent, collaborator agent, and every agent inside a task/collaborator/configured team or Org) is an `AgentRun`. `TeamRun` and `AgentOrgRun` execute nothing themselves. They own **membership** (their execution tree/index) and **lifecycle** (alive/stopped), not activity.
- Consequence: the only owned *status* fact is `AgentRun` status. A Team/Org status is a **derived view**: rule(member AgentRun statuses) gated by the container's lifecycle. Publishing it as separate state would create a second authority for the same fact.
- Re-assessment of the web design (SR-003): computing the view in the app with one shared rule from the published tree and agent statuses is not an ownership violation. The real defect is **input freshness** (agent statuses and tree for runs without a live stream), which is a transport problem.
- The shared rule already lives in `@autobyteus/collaboration-stream-contracts` and is evaluated by both the server (Project Task worker status) and the web. Keeping one rule there (with starting = busy and the lifecycle gate) keeps every evaluator consistent.

## Representation Model Proposal (2026-10-09, user: how to represent Team, task Team, task Agent, Org status)

- Two subject kinds only. **Agent** = any AgentRun (standalone, member, task agent, collaborator agent): owned five-state `AgentStatus`. **Container** = any TeamRun (root, configured sub-team, task-team copy, collaborator team) or AgentOrgRun: derived four-state `ContainerStatus` (`busy | error | idle | offline`).
- One shared pure function in `@autobyteus/collaboration-stream-contracts`: `containerStatus({ alive, agents: AgentStatus[], containers: ContainerStatus[] })`. Direct member agents and direct child containers only; children compose upward. Agent → container contribution: running/initializing → busy; error → error; idle → idle; offline → offline.
- Display: same dot palette for both kinds (busy and running blue pulse; initializing amber on agents only; error red; idle green; offline gray). The identity glyph stays separate: avatar for agents, people-group for teams, Org avatar for Orgs.
- Display groupings (Team definition group under TEAMS) are not subjects: the highest of their runs' container statuses.
- Current inconsistencies found: Org root row is a binary emerald/gray dot (`WorkspaceAgentOrgHistoryCollection.vue` l.61); agent definition group rows have no dot while Team definition group rows do (`WorkspaceHistoryWorkspaceSection.vue`). An agent run row shows only its own status, not its delegated children (agents are executors, not containers).

## Integration Overlap With Task b541c02a (2026-10-11)

- `origin/personal` is now `96da4ba32` (includes d110cb612, the Task-summary second line, released v1.5.1-beta.3). Our merge base is `bd45af839`.
- Files changed on both sides (excluding tickets): `TESTING.md`; `autobyteus-web/components/workspace/history/{AgentRunTaskRows,WorkspaceHistoryWorkspaceSection,WorkspaceTeamExecutionTree,WorkspaceTransientExecutionRow}.vue`; `…/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`; `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`; `autobyteus-web/package.json`; `tests/e2e/fixtures/team-activity-presentation.page.vue`; `tests/e2e/nested-team-aggregate-status-probe.mjs`.
- `git merge-tree --write-tree HEAD origin/personal`: one textual conflict (`TESTING.md`); all source files auto-merge. The row component overlap still needs re-run row specs and probes and a rendered check (dot or icon on the name line, summary line under the name).
