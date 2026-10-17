# Design Spec — Universal Team status in the Workspaces tree

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: R2 / SR-002, AP-001 (2026-10-09, requirements conversation; see `requirements-doc.md` Document Status)
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/investigation-notes.md`
- Authorities read (2026-10-09): `references/architecture-design.md`, `design-principles.md`, `templates/design-spec-template.md`; project `DESIGN.md` (root) and `TESTING.md` (root); `autobyteus-web/AGENTS.md`. `design-examples.md` not used.
- Project design-principle conflicts or discrepancies: Docs describe the binary Team cue as intended (`autobyteus-web/docs/agent_execution_architecture.md` §"Workspace presentation…" l.404-433, `agent_integration_minimal_bridge.md` l.196-201, `agent_teams.md` l.167-173). AP-001 supersedes them; they must be updated in docs sync (listed below). No conflict with `DESIGN.md`.

## Current-State Read

Team status on Team rows is computed in four unrelated ways (investigation notes, Source Log):

1. **Nested configured Team rows in a Team run**: `WorkspaceTeamExecutionTree.vue` calls `aggregateTeamBranchAgentStatus(team.executionRows, row)` (`workspaceHistoryTeamBranchStatus.ts`), which scans descendant rows by depth and folds with the shared `foldTeamAggregateStatus(…, 'live')`. It returns offline for any non-stable row, so transient (delegated) Team rows are excluded. It is not gated by run liveness.
2. **Org-internal Team rows**: `projectAgentOrgTeamBranchStatus` (`services/agentOrgExecution/agentOrgTeamBranchStatus.ts`) folds members + all task-execution agents with the Org's `live`/`historical` authority. It does not skip closed (DONE) task executions.
3. **Standalone TeamRun / Team group rows** (`WorkspaceHistoryWorkspaceSection.vue` l.224, l.281): `TeamActivityDot` with `team.isActive` / `group.hasActiveRuns`. Binary.
4. **Delegated Team rows**: no status. Agent root: `AgentRunCollaborationContext.listTaskRows` sets `currentStatus: null`. Its children are emitted only while expanded. Team root: `teamExecutionTreeSelectors` sets `currentStatus: null`. Org root: `AgentOrgHistoryTaskTeamRow` has no status. Both renderers (`WorkspaceTransientExecutionRow.vue`, Org collection task-team button) draw only the slate icon.

The shared `foldTeamAggregateStatus` (collaboration-stream-contracts) is also used by the server for Project Task worker status and by `agentOrgHistoryRows.exactAgentStatus` to normalize a *single agent's* status. It must therefore stay unchanged. Team-run navigation patches (`runHistoryNavigationPatches.patchTeamMember`) update one agent row in `team.executionRows` without recomputing anything else. So a Team status must be derived at render time from current rows, not stored on a row.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 12 web source files (one rule owner, three per-root projections, five renderers/containers, one type, localization) plus their colocated specs and three browser probes. No server, contract or persistence change. Existing ownership is kept.
- Architectural risk: `Low`
- Risk rationale: presentation-only derivation from data already in the renderer. No API, stream, persistence, security, concurrency, deployment or ownership-boundary change. The shared contract fold is untouched. The intended-behavior change (binary → aggregate on run/group rows) is user-approved (AP-001).
- Escalation trigger: if any surface turns out to need data not already in the renderer (e.g. a live Team row whose agent statuses are never loaded and must be fetched), or the shared fold must change, stop and return a Design Impact.

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-collaboration-stream-contracts/src/team-aggregate-status.ts` | rank offline<idle<error<initializing<running; used by server worker status and Org single-agent normalization | Keep it; map initializing→busy in a web Team rule | None |
| Code | `autobyteus-web/stores/runHistoryNavigationPatches.ts` l.93-140 | Agent status patches touch only the agent row | Derive Team status at render time from `executionRows` | None |
| Code | `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` l.30-48 | `executionRows` holds every row (collapsed included), closed task rows already filtered; context-less teams get stable rows with history statuses | Depth scan over `executionRows` covers nested, delegated and root | None |
| Code | `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` l.102-142; `team-run-live-projection-service.ts` | History list carries live member status snapshots for active teams; inactive → offline | Unopened live team rows get a non-empty basis | Snapshot freshness (ASM-001) |
| Code | `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` l.110, l.256-300, l.352-360 | `isActive` getter; `closedSubtrees()`; rows omit collapsed children | Compute Agent-root Team status from the tree nodes inside the context | None |
| Code | `autobyteus-web/utils/agentOrgHistoryRows.ts` `statusSource` | `authority` live/historical and `isListed` already exist | Org Team status: alive = authority live; filter by `isListed` | None |
| Code | `autobyteus-web/components/workspace/running/*` | Mounted only by `tests/e2e/fixtures/team-activity-presentation.page.vue` | Out of scope; follow-up removal candidate | None |

## Intended Change

Introduce one web owner of the **universal Team status** and route every Team row in the Workspaces tree through it:

```ts
// autobyteus-web/utils/workspaceTeamAggregateStatus.ts
export type TeamStatus = AgentStatus.Running | AgentStatus.Error | AgentStatus.Idle | AgentStatus.Offline;

/** Universal Team status: the highest state among the counted agents,
 *  busy (running or starting) > error > idle > offline. A Team in a run that is not alive is offline. */
export const resolveTeamStatus = (
  agentStatuses: readonly (AgentStatus | string | null | undefined)[],
  runAlive: boolean,
): TeamStatus => {
  if (!runAlive) return AgentStatus.Offline;
  const highest = foldSharedTeamAggregateStatus(agentStatuses, 'live');
  return (highest === 'initializing' ? AgentStatus.Running : highest) as TeamStatus;
};
```

A Team group row passes its runs' Team statuses with `runAlive: true`. Each run status is already gated, and the shared rank orders the four Team states correctly.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001..003, 005..008; AC-001..007 | Agent run with delegated Teams | No status | Universal dot | DS-001 |
| BEH-002 | User | same; AC-009 | Team run with delegated/nested Teams | Nested: aggregate; delegated: none | Universal dot on both | DS-002 |
| BEH-003 | User | same; AC-009 | Org run with internal/delegated Teams | Internal: aggregate; delegated: none | Universal dot on both | DS-003 |
| BEH-004 | User | REQ-001, 003 | Nested/Org Team rows | Starting → amber; not gated by liveness | Starting → blue; stopped → gray | DS-002, DS-003 |
| BEH-005 | User | REQ-001..004; AC-007, AC-008 | TEAMS run and group rows | Binary `isActive` | Universal dot; group = highest of runs | DS-004 |
| BEH-006 | User | REQ-007 | Agent rows, Org root row | Unchanged | Unchanged | — |

## Relevant Supplemental Task Artifacts

None beyond the two screenshots (evidence only; see requirements).

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (plus feature coverage of delegated rows)
- Current design issue found: `Yes`
- Structural triggers: **Repeated coordination trigger fires.** The Team aggregation policy lives in three places with different inputs and gates (`workspaceHistoryTeamBranchStatus.ts`, `agentOrgTeamBranchStatus.ts`, binary `TeamActivityDot` in the section), and a fourth surface has none. Responsibility overload: no (each projection stays in its existing owner). Authoritative boundary: no bypass found. Shared-structure looseness: the Team dot currently accepts any `AgentStatus` although a Team never has `initializing`; it is tightened to `TeamStatus`.
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes`, narrowly: one Team-status rule owner; per-root projections only collect agent statuses and liveness.
- Evidence: Current-State Read items 1-4.
- Design response: `resolveTeamStatus` in `utils/workspaceTeamAggregateStatus.ts` is the only place that ranks, maps starting→busy and applies the liveness gate. Each root keeps its own tree walk (the trees are different shapes) and calls the rule. The binary Team dot is removed from the tree.
- Refactor rationale: without one owner, "universal" would be four copies of the rank that drift (as BEH-004 already shows).
- Intentional deferrals and residual risk: the unmounted `components/workspace/running/*` cluster and `TeamActivityDot` (whose last live caller this change removes) are follow-up removal (see Removal Plan). The server Project Task worker status keeps the shared fold (out of scope).

## Terminology

- **Team status**: the universal four-state status of a Team row (`TeamStatus`).
- **Counted agents**: agents shown under a Team row, including collapsed ones, excluding closed work (REQ-002).
- **Run alive**: the containing root run's lifecycle (`TeamTreeNode.isActive`, `AgentRunCollaborationContext.isActive`, Org `authority === 'live'`).

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The binary Team cue on tree rows and `hasActiveRuns` are replaced cleanly; no dual display.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Presentation-only; nothing stored or transported changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Agent status / lifecycle event on the host's collaboration stream (or stored inspection) | Dot on a delegated Team row under an Agent run | `AgentRunCollaborationContext.listTaskRows` | Collapsed children are not emitted, so the context must count from the tree |
| DS-002 | Primary | BEH-002, 004 | `AGENT_STATUS` on the Team stream → navigation patch of one agent row | Dot on nested/delegated Team rows under a Team run | `WorkspaceTeamExecutionTree` via `workspaceHistoryTeamBranchStatus` | Patches are row-local; derive at render |
| DS-003 | Primary | BEH-003, 004 | Org execution context status / history | Dot on Org-internal and delegated Team rows | `projectAgentOrgHistoryRows` | Existing authority/isListed source |
| DS-004 | Primary | BEH-005 | Team history list snapshot + Team stream patches + `team_run` lifecycle patch | Dot on TEAMS run row and group row | `WorkspaceHistoryWorkspaceSection` via `workspaceHistoryTeamBranchStatus` | Replaces binary cue |
| DS-005 | Bounded Local | all | agent statuses + run alive | `TeamStatus` | `resolveTeamStatus` | The single rule |

## Primary Execution Spine(s)

- DS-001: `Collaboration stream / inspection -> AgentRunCollaborationContext (agent contexts + tree + closedSubtrees + isActive) -> listTaskRows (teamStatus per task Team) -> AgentRunTaskRows -> WorkspaceTransientExecutionRow -> TeamAggregateStatusDot`
- DS-002: `Team stream AGENT_STATUS -> runHistoryNavigationPatches (agent row) -> TeamTreeNode.executionRows -> WorkspaceTeamExecutionTree (teamBranchStatus) -> Stable/TransientExecutionRow -> TeamAggregateStatusDot`
- DS-003: `Org execution context / history item -> projectAgentOrgHistoryRows (team + task_team status) -> WorkspaceAgentOrgHistoryCollection -> TeamAggregateStatusDot`
- DS-004: `Team history list + Team stream patches -> TeamTreeNode (isActive, executionRows) -> WorkspaceHistoryWorkspaceSection (teamRunStatus, teamDefinitionGroupStatus) -> TeamAggregateStatusDot`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Statuses arrive in each child agent context. When the task rows are listed, every task Team node (and any Team nested in it) collects the statuses of all listed agents in its subtree, even if collapsed, and asks the rule. The result travels on the display entry to the row. | context, listTaskRows, row | context | rule |
| DS-002 | A member's status patch updates its row. The tree component re-derives each Team row's status from the rows beneath it (depth scan) with `team.isActive`, so collapse and patches both stay correct. | executionRows, tree, rows | tree component + branch-status helper | rule |
| DS-003 | The Org projection already knows authority and closure. It now gives task Team rows a status and makes the configured Team status use the same rule and closure filter. | projection, collection | projection | rule |
| DS-004 | The section computes a run row's status from all agent rows of that run (gated by `isActive`), and a group row's status as the highest of its runs. | TeamTreeNode, section | section + branch-status helper | rule |

## Spine Actors / Main-Line Nodes

`AgentRunCollaborationContext`, `TeamTreeNode.executionRows`, `projectAgentOrgHistoryRows`, the three tree containers, the two row renderers, `TeamAggregateStatusDot`.

## Ownership Map

- `utils/workspaceTeamAggregateStatus.ts`: **owns the Team status rule** (rank, starting→busy, liveness gate, `TeamStatus` type).
- `components/workspace/history/workspaceHistoryTeamBranchStatus.ts`: owns *which rows count* in a Team-run `executionRows` list (branch, whole run, group of runs).
- `AgentRunCollaborationContext`: owns which agents count under an Agent-root task Team (tree + closure + liveness).
- `agentOrgHistoryRows.ts` / `agentOrgTeamBranchStatus.ts`: own which agents count under Org Teams.
- Renderers: present a given `TeamStatus`; they never compute it.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `foldTeamAggregateStatus` web wrapper (same file) | shared contract fold | Typed single-agent normalization still used by `agentOrgHistoryRows.exactAgentStatus` | Team semantics (use `resolveTeamStatus`) |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `TeamActivityDot` usage in `WorkspaceHistoryWorkspaceSection.vue` (group + run rows) and its `active_team_run(s)` / `inactive_team_run` / `no_active_team_runs` label usage there | Binary cue superseded (AP-001) | `TeamAggregateStatusDot` + `teamRunStatus` / `teamDefinitionGroupStatus` | In This Change | Remove the localization keys only if no remaining reference (running/* still uses some) |
| `hasActiveRuns` field in `workspaceHistoryTeamDefinitionGroups.ts` | Dead once the section stops reading it (verify with grep; only the section reads it) | `teamDefinitionGroupStatus(group.runs)` | In This Change | Update its spec |
| `aggregateTeamBranchAgentStatus` stable-only guard | Replaced by `teamBranchStatus` accepting any `agent_team` row | same file | In This Change | Rename + extend; update spec |
| `team_status_initializing` localization keys (en, zh-CN) | Dead: `TeamStatus` excludes initializing | — | In This Change | |
| `foldTeamAggregateStatus` calls for Team status in `workspaceHistoryTeamBranchStatus.ts` and `agentOrgTeamBranchStatus.ts` | Replaced | `resolveTeamStatus` | In This Change | Wrapper stays for `exactAgentStatus` |
| `components/workspace/running/*` (RunningTeamGroup/Row, TeamMemberRow + specs), `components/workspace/common/TeamActivityDot.vue` + spec, `tests/e2e/fixtures/team-activity-presentation.page.vue`, running-surface part of `team-activity-presentation-probe.mjs` | Dead: mounted only by the e2e fixture (`grep RunningTeamRow\|RunningTeamGroup`); after this change TeamActivityDot is reached only from that cluster | — | **Follow-up** | Separate cleanup task with this evidence |

## Return Or Event Spine(s)

Covered by DS-001/002 starts (status events). No new events.

## Bounded Local / Internal Spines

DS-005, parent `utils/workspaceTeamAggregateStatus.ts`: `statuses + runAlive -> gate -> shared fold('live') -> map initializing→running -> TeamStatus`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Team status rule | all | every projection | rank/gate/map | single policy | drift between surfaces |
| Accessible status text | all | renderers | `team_status_*` label/title in `TeamAggregateStatusDot`; status word in row aria-labels | QR-001 | colour-only state |

## Ownership Boundaries

Renderers receive `TeamStatus`; projections own counting; the rule owns ranking. No renderer calls the shared fold directly for Teams.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `resolveTeamStatus` | shared fold, initializing mapping, liveness gate | branch-status helper, Agent-root context, Org projection | calling `foldTeamAggregateStatus` for a Team row | extend `resolveTeamStatus` |

## Dependency Rules

- Projections → `utils/workspaceTeamAggregateStatus.ts` → `@autobyteus/collaboration-stream-contracts`.
- Renderers → `TeamAggregateStatusDot` only; no status computation in templates beyond calling the owning helper (the tree/section containers call `workspaceHistoryTeamBranchStatus`).
- `services/agentCollaboration` may import `utils/workspaceTeamAggregateStatus.ts` (utils is below services). It must not import `components/workspace/history/*`.
- No server or contract package change.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `resolveTeamStatus(agentStatuses, runAlive): TeamStatus` | Team status | rule | statuses list + boolean | |
| `teamBranchStatus(rows, teamRow, runAlive): TeamStatus` | one Team row in a Team-run row list | count descendants by depth (any `agent_team` row, stable or transient) | row list + row | replaces `aggregateTeamBranchAgentStatus` |
| `teamRunStatus(team: TeamTreeNode): TeamStatus` | a TeamRun | count every agent row in `team.executionRows`; alive = `team.isActive` | node | |
| `teamDefinitionGroupStatus(runs: readonly TeamTreeNode[]): TeamStatus` | a Team group | highest of `teamRunStatus(run)` | nodes | |
| `AgentRunTaskTreeRow.teamStatus: TeamStatus \| null` | Agent-root display entry | Team status for `task_team` (and nested team) rows; null for agent rows | display entry | added beside `continuingAncestorDepths` |
| `AgentOrgHistoryTaskTeamRow.status: TeamStatus`; `AgentOrgHistoryTeamRow.status: TeamStatus` | Org Team rows | | row | |
| `projectAgentOrgTeamBranchStatus({ team, runAlive, isListed, statusForAgentRunId })` and `projectAgentOrgTaskTeamStatus({ team, runAlive, isListed, statusForAgentRunId })` | Org configured / task Team | count listed agents in subtree | team node | shared recursive collector in the same file |
| `WorkspaceTransientExecutionRow` prop `teamStatus?: TeamStatus` | delegated Team row | present | — | required when `row.memberKind === 'agent_team'` (default offline) |
| `TeamAggregateStatusDot` prop `status: TeamStatus` | dot | present | — | tightened type |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| all above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Team status type/rule | `TeamStatus`, `resolveTeamStatus` | Yes | Low | — |
| Branch helper | `teamBranchStatus` (was `aggregateTeamBranchAgentStatus`) | Yes | Low | rename |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Rank | shared `foldTeamAggregateStatus` | Reuse (wrapped) | identical rank; only initializing mapping + gate added |
| Dot | `TeamAggregateStatusDot` + `StatusDot` | Reuse | same presentation as nested Team rows |
| Depth scan | `workspaceHistoryTeamBranchStatus.ts` | Extend | already scans `executionRows` |
| Org counting | `agentOrgTeamBranchStatus.ts` | Extend | already recursive over task executions |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/utils` | Team status rule | DS-005 | Extend |
| `autobyteus-web/components/workspace/history` | Team-run counting, renderers, section | DS-002, DS-004 | Extend |
| `autobyteus-web/services/agentCollaboration` | Agent-root counting | DS-001 | Extend |
| `autobyteus-web/services/agentOrgExecution` + `utils/agentOrgHistoryRows.ts` | Org counting | DS-003 | Extend |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

(Draft and final are the same; no reusable structure beyond the rule needed extraction.)

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/utils/workspaceTeamAggregateStatus.ts` | Modify | Add `TeamStatus`, `resolveTeamStatus`; keep typed `foldTeamAggregateStatus` wrapper (single-agent use) |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamBranchStatus.ts` | Modify | `teamBranchStatus` (any `agent_team` row, `runAlive`), `teamRunStatus`, `teamDefinitionGroupStatus` |
| `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue` | Modify | Pass `teamBranchStatus(rows, row, team.isActive)` to stable Team rows (`aggregate-status`) and transient Team rows (`team-status`) |
| `autobyteus-web/components/workspace/history/WorkspaceStableExecutionRow.vue` | Modify | `aggregateStatus` prop typed `TeamStatus` |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Modify | New `teamStatus` prop; render `TeamAggregateStatusDot` in the `member-status` slot for `agent_team` rows (same slot/position as the stable row); `status` computed uses it for Team rows (aria label) |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` | Modify | `listTaskRows`: for each Team node (task Team and Teams nested in it) collect statuses of all listed agents in the subtree regardless of expansion; `teamStatus = resolveTeamStatus(statuses, this.isActive)` on the display entry |
| `AgentRunTaskTreeRow` type (`services/agentCollaboration/agentRunCollaborationContext.ts` l.41) | Modify | Add `teamStatus: TeamStatus \| null` |
| `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue` | Modify | Pass `:team-status="display.teamStatus ?? undefined"` |
| `autobyteus-web/services/agentOrgExecution/agentOrgTeamBranchStatus.ts` | Modify | Shared listed-agent collector; `projectAgentOrgTeamBranchStatus` and new `projectAgentOrgTaskTeamStatus` call `resolveTeamStatus(statuses, runAlive)` |
| `autobyteus-web/utils/agentOrgHistoryRows.ts` | Modify | `task_team` rows get `status`; `team` rows pass `runAlive: source.authority === 'live'` and `isListed` |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Modify | Task-Team button: `TeamAggregateStatusDot` before the icon; `taskTeamRowLabel` includes the status word |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Modify | Group row and run row: `TeamAggregateStatusDot` with `teamDefinitionGroupStatus(group.runs)` / `teamRunStatus(team)` replacing `TeamActivityDot` |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | Modify | Remove `hasActiveRuns` |
| `autobyteus-web/components/workspace/history/TeamAggregateStatusDot.vue` | Modify | `status: TeamStatus` |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Modify | Remove `team_status_initializing` |
| Colocated specs (see Guidance) and probes `nested-team-aggregate-status-probe.mjs`, `team-activity-presentation-probe.mjs` (history-surface part), `team-group-icon-probe.mjs` (if it asserts no dot on delegated rows) | Modify | New expectations |

## Reusable Owned Structures Check

| Structure | File | Why | Tight |
| --- | --- | --- | --- |
| `TeamStatus` + `resolveTeamStatus` | `utils/workspaceTeamAggregateStatus.ts` | used by four projections and two renderers | Yes: four values, one meaning |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TeamStatus` | Yes | Yes (no initializing) | Low | — |
| `RunHistoryTransientExecutionRow.currentStatus` for Team rows | stays `null` (agent-only meaning) | — | Low | Team status lives on the display entry / prop, not on `currentStatus` |

## Applied Patterns

None beyond a pure function owner.

## Target Subsystem / Folder / File Mapping

All files stay in place (listed above). No new folders.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `utils/workspaceTeamAggregateStatus.ts` | Off-Spine Concern | Yes | Low | already the Team status util |

## Concrete Examples / Shape Guidance

| Topic | Good | Bad | Why |
| --- | --- | --- | --- |
| Agent-root collapsed Team | Count from `node.members`/`taskExecutions` recursively, filtered by `closedSubtrees()` | Fold over the emitted `flat` rows (empty when collapsed → gray) | R-001 |
| Team-run patches | Derive in `WorkspaceTeamExecutionTree` from current `executionRows` | Store a Team status on the Team row at projection time (stale after `patchTeamMember`) | Freshness |
| Rule | `resolveTeamStatus(statuses, run.isActive)` | `foldTeamAggregateStatus(statuses, 'live')` directly in a component | Single policy |

Example expectations: `[running, offline] → running`; `[initializing] → running`; `[error, idle] → error`; `[idle, offline] → idle`; `[] → offline`; `([running], false) → offline`; group `[offline, idle, running] → running`.

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `TeamActivityDot` beside the new dot on run rows | Preserve "alive" cue | Rejected | Universal dot; Stop button still shows liveness |
| Change the shared contract fold to map initializing | One place | Rejected | Would change Org agent rows and server worker status; web rule wraps it |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add `TeamStatus`/`resolveTeamStatus` + unit tests.
2. Team-run: rename/extend branch helper, add `teamRunStatus`/`teamDefinitionGroupStatus`; wire `WorkspaceTeamExecutionTree`, `WorkspaceTransientExecutionRow`, `WorkspaceStableExecutionRow`.
3. Agent-root: `listTaskRows` team status + `AgentRunTaskRows`.
4. Org: projection + collection.
5. Section: replace binary dot; remove `hasActiveRuns`; tighten `TeamAggregateStatusDot`; remove dead localization key.
6. Update specs and probes; run checks.

## Key Tradeoffs

- The run row no longer shows "alive" by colour. Liveness remains visible through the Stop button. An alive-but-unstarted Team reads gray (ASM-002, approved).
- Starting reads blue on Team rows but amber on agent rows: approved ("starting counts as busy").

## Risks

- Freshness (ASM-001, investigation R-002, verified): TeamRun rows and their Team rows are live (all active TeamRuns are streamed after each history load). Delegated Teams under an Agent run are live once the host was selected in this session, otherwise a one-time snapshot. Org Teams are live once the Org was opened, otherwise gray. The design is unchanged; the remaining gap is a proposed follow-up (stream every active Agent host's collaboration view and every active Org on history load, as Team runs already are).
- Existing probes assert binary dots; they must be updated, not deleted.

## Guidance For Implementation

- Specs to update/add: `utils/__tests__/workspaceTeamAggregateStatus.spec.ts`, `components/workspace/history/__tests__/workspaceHistoryTeamBranchStatus.spec.ts`, `WorkspaceTransientExecutionRow.spec.ts`, `WorkspaceHistoryWorkspaceSection.spec.ts`, `WorkspaceAgentOrgDelegatedRows.spec.ts`, `services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts`, `services/agentOrgExecution/__tests__/agentOrgTeamBranchStatus.spec.ts`, `utils/__tests__/agentOrgHistoryRows.spec.ts`, and any spec asserting `team-activity-dot` or `hasActiveRuns` (grep).
- Cover AC-001..010 at unit/component level, including collapsed Agent-root Teams (AC-005), closed subtree exclusion (AC-006) and liveness gate on each surface (AC-007).
- Validation per `TESTING.md`: `pnpm -C autobyteus-web test:nuxt` for changed specs; update and run `test:e2e:team-group-icon`, `nested-team-aggregate-status` and `team-activity-presentation` probes (history parts); AC-011 is user verification on an isolated worktree build (`pnpm --silent isolated-app start --build`), never the user's installed app.
- Docs sync (Delivery): `autobyteus-web/docs/agent_execution_architecture.md` l.404-433, `agent_integration_minimal_bridge.md` l.196-201, `agent_teams.md` l.167-173 now describe the universal Team status.
