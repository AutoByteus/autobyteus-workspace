# Team Status Simplification Evidence

## Artifact Status

- Type: Evidence-only supplemental artifact
- Status: Complete; used as evidence for the user-approved 2026-08-02 requirements basis and `SR-003` design
- Approval applicability: N/A — this file records observed product/source behavior and does not independently define intended behavior
- Investigation date: 2026-08-02
- Task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`

## Question Investigated

Does an agent-team definition or team-run need the same five-state lifecycle shown for an agent, or can team state be reduced to definition metadata plus a binary live-run fact while member agents retain their own lifecycle?

## Evidence-Backed Answer

Yes, the public/frontend model can be materially simpler:

1. A **team definition** is a reusable configuration/container and has no runtime lifecycle.
2. A **team run** needs one operational fact: whether it is currently registered as a live run and can therefore be stopped (`isActive`).
3. A **leaf member agent** retains the five-state agent lifecycle (`offline | initializing | idle | running | error`) because it governs the member's composer and interrupt action.
4. A **task-delegation stage** is a separate business/execution-stage model. If shown, it must use its own task status rather than masquerade as a team or agent runtime lifecycle.

The current code conflates these subjects. It creates a five-state aggregate for team runs, copies the latest team run's aggregate onto a team definition row, and then uses that aggregate to decide whether a team can be stopped, archived, or deleted even though the backend already exposes an authoritative `isActive` fact from its active-run manager.

## User-Supplied UI Evidence

| Evidence | Observation | Meaning |
| --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png` | A blue status dot appears beside the `Software Engineering Team (27)` definition/container. | A definition is being presented as if it had one current runtime state even though it groups many run instances. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png` | The team-run row has both a colored status dot and a stop button; child agent rows also have their own status dots. | The root team dot duplicates the operational fact conveyed by Stop, while the member-agent dots carry the actionable lifecycle users actually need. |

## Current Frontend Production Path

### Definition-level status is fabricated from a child run

```text
workspace history query
  -> TeamRunHistoryDefinitionGroup.runs[]
  -> buildWorkspaceTeamDefinitionDisplayGroups
  -> choose most recently active representativeRun
  -> copy representativeRun.currentStatus to group.status
  -> render StatusDot beside the team definition name
```

Evidence:

- `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts`
  - `WorkspaceHistoryTeamDefinitionDisplayGroup` stores `status: AgentTeamStatus`.
  - The group status is copied from `representativeRun.currentStatus`.
  - When a newer run becomes representative, the definition's displayed status changes to that run's status.
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - Renders `<StatusDot kind="team" :status="group.status" />` on the team definition row.

Therefore the displayed definition status is not a fact owned by the definition. It is an arbitrary projection of whichever child run has the newest `lastActivityAt`.

### Team-run actions use aggregate status instead of existing activity truth

```text
TeamTreeNode.currentStatus
  -> canTerminateTeam(status !== offline)
  -> Stop versus Archive/Delete controls
```

Evidence:

- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` defines `canTerminateTeam(status)` as `status !== AgentTeamStatus.Offline`.
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` uses that predicate for Stop, Archive, and Delete visibility.
- `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` repeats the same status-based eligibility guard.
- In contrast, standalone run rows already use `run.isActive` directly for terminate/archive/delete decisions.

### Frontend team context duplicates lifecycle and connection state

- `autobyteus-web/types/agent/AgentTeamContext.ts` stores both `currentStatus: AgentTeamStatus` and `isSubscribed`.
- `autobyteus-web/stores/agentTeamContextsStore.ts` describes its map as active teams, but the map also contains temporary drafts and hydrated historical team contexts.
- `autobyteus-web/stores/runHistoryTeamHelpers.ts` derives `isActive` from `currentStatus` when merging a team context, which can overwrite the catalog's direct `team.isActive` fact.
- `autobyteus-web/stores/runHistoryStore.ts` already stores and reconciles `TeamRunHistoryItem.isActive` and `TeamRunResumeConfigPayload.isActive`, but also mutates a parallel `status` field.
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` converts `resumeConfig.isActive` back into synthetic `Running`/`Offline` team status.
- `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts` and `runHistoryLoadActions.ts` repeat aggregate team-status hydration and preservation rules even though active discovery is selected using `teamRun.isActive` first.

This is a circular representation: authoritative binary activity becomes a synthetic aggregate status, and downstream code converts that status back into activity.

### Team aggregate presentation appears in multiple surfaces

- Workspace history: status dots on both definition and run rows.
- Legacy/running panel: `RunningTeamRow.vue` maps five team states to five colors while also exposing a close/stop control.
- Team workspace header: `TeamWorkspaceView.vue` falls back from a focused member status to `activeTeamContext.currentStatus`, so an aggregate team status can be rendered through the agent status component.
- Mobile recent work: `useMobileWorkCatalog.ts` consumes both `run.status` and `run.isActive`; an active team is always labeled `Running`, while inactive labels depend on aggregate status.
- `TeamStatusDisplay.vue`, `useTeamStatusVisuals.ts`, `AgentTeamStatus.ts`, the team branch of `StatusDot.vue`, and the team presentation functions in `workspaceStatusDotPresentation.ts` exist solely to support the public five-state team display.

## Current Backend Production Path

### Authoritative binary activity already exists

```text
create/restore TeamRun
  -> AgentTeamRunManager.registerActiveRun(teamRunId, TeamRun)
  -> getActiveRun(teamRunId)
       returns live run when backend.isActive()
       otherwise unregisters and returns null
  -> history/resume projection isActive = getActiveRun(...) !== null
```

Evidence:

- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - Owns `activeRuns: Map<string, TeamRun>`.
  - Registers a run after create/restore.
  - `getTeamRun` removes and rejects an entry whose backend is no longer active.
  - Successful termination calls `unregisterActiveRun`.
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `isTeamRunActive` is exactly `teamRunManager.getActiveRun(teamRunId) !== null`.
  - Resume config already returns `isActive` without returning a team status.
- GraphQL workspace history and team resume payloads already expose `isActive`.

The precise semantic is not “any JavaScript object reference exists.” It is “the team run has a live registration in the authoritative active-run manager.” Temporary frontend drafts and historical hydrated contexts are not active server team runs.

### Five-state team status is a derived member aggregate

```text
member AgentStatus snapshots
  -> deriveTeamApiStatus
       running > initializing > error > idle > offline
  -> MixedTeamManager.getStatusSnapshot
  -> TeamRun.statusOverride / TEAM_STATUS events
  -> history `status` + team WebSocket snapshot/live events
  -> frontend AgentTeamStatus/currentStatus
```

Evidence:

- `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` folds member states plus optional native state into one `AgentApiStatus`.
- `mixed-team-manager.ts` calls the fold, suppresses unchanged values, and publishes root `TeamRunEventSourceType.TEAM` events.
- `team-runtime-status-snapshot-service.ts` sends a root `TEAM_STATUS` after member `AGENT_STATUS` snapshots.
- `team-run-event-websocket-message-mapper.ts` maps every team-source event to `TEAM_STATUS`.
- `team-run-status-projection-service.ts` already returns both `isActive` and aggregate `status`, exposing two representations of different semantics.

A live team whose members are all idle remains registered and stoppable. A live team with an errored member can also remain registered and stoppable. Therefore member aggregate status is not a correct substitute for team activity.

### Aggregate status creates coordination work outside presentation

Production consumers that must be separated rather than blindly deleted:

1. **Member snapshots:** `getMemberStatusSnapshots()` is still required for leaf-agent hydration and must remain unchanged in meaning.
2. **Task-team cleanup:** frontend task-team projection currently watches scoped root `TEAM_STATUS=offline` to remove a transient task-team node, even though task-delegation terminal events already own task execution stage.
3. **Task-team settlement:** `TaskTeamSettlementCoordinator.hasOpenChildWork()` queries the child's aggregate status. This should become an explicit internal open-work predicate over member/current-task facts, not a public team status.
4. **Operational lifecycle observer:** `TeamRunService.observeTeamRunLifecycle()` treats a root team `error` as failure but also observes canonical member-agent failures. Team failure reporting should remain an explicit failure/lifecycle event, not a display aggregate.
5. **Subteam handles:** child root team-status events are prefixed into a parent stream and used as subteam-node status. Child agent events already retain exact member/path identity; subteam lifecycle needs at most a binary live-run fact and task stage needs its own domain status.

This separation is necessary for a clean simplification: removing the five-state public team status must not remove member-agent status, task-delegation stage, explicit failure reporting, or an internal answer to “does this task team still have open work?”

## Subject And Authority Inventory

| Subject | Required public state | Authoritative owner | Must not be inferred from |
| --- | --- | --- | --- |
| Team definition | None | Team definition/configuration store | Latest/representative child run |
| Root team run | `isActive: boolean` | Server active-run manager registration plus backend live check | Member aggregate, content deltas, or WebSocket connection |
| Nested/subteam run | Binary live-instance fact only when a surface needs it | Owning subteam handle/directory | Child member aggregate |
| Leaf agent member | Five-state `AgentStatus` | Owning `AgentRun` lifecycle projection | Team aggregate |
| Task delegation/execution | Existing task status/stage | Task-delegation ledger/projection | Team or agent lifecycle enum |
| Stop request in flight | Local `stopPending` request state | Invoking UI/store action | Team lifecycle/status |

## Reachability Classification

| Premise | Classification | Production witness | Consequence |
| --- | --- | --- | --- |
| A team definition shows a status copied from one child run | Reachable | Open workspace history containing team runs -> definition grouping -> representative status dot | Misrepresents a definition as one runtime and changes when representative run changes. |
| A team is active while all member agents are idle | Reachable | Create/restore team -> manager registration remains -> members complete turns to idle | Team must remain stoppable; aggregate `idle` cannot mean inactive. |
| A team is active while one member is in error | Reachable | Member reaches terminal error without successful root team termination/unregistration | Team remains a live resource that can be stopped; aggregate error must not revoke Stop. |
| A WebSocket disconnect occurs while the team remains active | Reachable | Normal panel/window/navigation/network reconnect flow -> client disconnects stream; server manager retains TeamRun | Connection state cannot be the activity authority. |
| A historical frontend team context exists without a live server TeamRun | Reachable | Open inactive team history -> hydrate context for inspection | Context-map membership cannot be the activity authority. |
| A temporary frontend team draft exists before server creation | Reachable | Choose team definition -> create draft configuration | Draft existence cannot imply active. |

## Persisted Data Evidence

- Team metadata, transcripts, raw traces, member identity, task records, and termination timestamps do not need transformation.
- Aggregate team status is computed from live state; it is not required persisted meaning.
- Current JSON readers can ignore removed response/type fields; frontend and server are released together in this repository, so no dual-read/dual-write path is required.
- Required transition outcome: `Directly Usable — No Migration`.

## Commands And Searches Used

- `rg -n "AgentTeamStatus|useTeamStatusVisuals|canTerminateTeam|TEAM_STATUS|currentStatus|isActive" autobyteus-web/...`
- `rg -n "TeamStatusPayload|deriveTeamApiStatus|TEAM_STATUS|getStatusSnapshot|statusOverride|isActive" autobyteus-server-ts/src/...`
- Focused `sed`/`cat` reads of the source files named in this artifact.
- A production-file inventory found 46 server/frontend/doc files referencing the public team-status structures or normalization; not every reference needs a source edit, but the count demonstrates that the aggregate is a cross-cutting duplicated representation rather than a local UI detail.

## Investigation Conclusion

The simplest stable target is not to improve the five-state team aggregate. It is to remove it from the public/frontend model:

```text
Team definition -> no status
Team run        -> isActive from authoritative live registration
Leaf agent      -> five-state AgentStatus from that AgentRun
Task execution  -> task-domain stage, when applicable
```

The stop action should be derived from `teamRun.isActive` plus local request-pending state. Member agents continue receiving their unchanged per-member status through the team envelope. No status is copied upward from a member to its team run or from a team run to its definition.
