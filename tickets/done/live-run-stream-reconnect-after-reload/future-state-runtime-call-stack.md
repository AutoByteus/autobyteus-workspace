# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/live-run-stream-reconnect-after-reload/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/in-progress/live-run-stream-reconnect-after-reload/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Summary`
  - `Target State (To-Be)`
  - `Change Inventory (Delta)`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- No compatibility wrappers or selected-only recovery branches are modeled.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001,R-002,R-007,R-009 | N/A | Recover active single-agent runs after history fetch | Yes/Yes/Yes |
| UC-002 | Requirement | R-001,R-003,R-006,R-009 | N/A | Recover active team runs after history fetch | Yes/Yes/Yes |
| UC-003 | Requirement | R-004,R-005,R-006 | N/A | User focuses a recovered active team member and sees aligned center/right live state | Yes/N/A/Yes |
| UC-004 | Requirement | R-008 | N/A | Inactive history open remains projection-only | Yes/N/A/Yes |

## Transition Notes

- No temporary migration logic is required.
- Recovery starts from the first post-reload history fetch and repeats on quiet history refreshes for newly active runs only.

## Use Case: UC-001 [Recover Active Single-Agent Runs After History Fetch]

### Goal

Hydrate and reconnect every active single-agent run into frontend state after reload without selecting it.

### Preconditions

- History panel has mounted.
- `runHistoryStore.fetchTree()` receives one or more agent history rows with `isActive = true`.

### Expected Outcome

- Each active single-agent run has a live `AgentContext`.
- Each recovered run has an active or reconnecting agent stream.
- No selection state is changed by background recovery.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onMounted()
└── [ASYNC] stores/runHistoryStore.ts:fetchTree(limitPerAgent, options)
    ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().query(ListRunHistory)
    ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().query(ListTeamRunHistory)
    ├── [STATE] stores/runHistoryStore.ts:workspaceGroups = listRunHistory
    ├── [STATE] stores/runHistoryStore.ts:teamRuns = listTeamRunHistory
    ├── [ASYNC] stores/runHistoryStore.ts:recoverActiveRunsFromHistory()
    │   └── [ASYNC] services/runRecovery/activeRunRecoveryCoordinator.ts:recoverActiveRunsFromHistory(...)
    │       ├── services/runRecovery/activeRunRecoveryCoordinator.ts:listActiveAgentRunIds(...)
    │       ├── services/runRecovery/activeRunRecoveryCoordinator.ts:shouldRecoverAgentRun(runId)
    │       └── [ASYNC] services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator({ runId, selectRun: false, ... })
    │           ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().query(GetRunProjection)
    │           ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().query(GetRunResumeConfig)
    │           ├── [ASYNC] stores/runHistoryStore.ts:ensureWorkspaceByRootPath(rootPath)
    │           ├── [ASYNC][IO] stores/workspace.ts:createWorkspace({ root_path })
    │           ├── [STATE] services/runOpen/runOpenCoordinator.ts:decideRunOpenStrategy(...)
    │           ├── [STATE] stores/agentContextsStore.ts:upsertProjectionContext(...) # when no subscribed context exists
    │           └── [STATE] stores/agentRunStore.ts:connectToAgentStream(runId)
    │               ├── [STATE] stores/agentRunStore.ts:streamingServices.set(runId, service)
    │               ├── [STATE] context.isSubscribed = true
    │               └── [ASYNC][IO] services/agentStreaming/AgentStreamingService.ts:connect(runId, context)
    └── return
```

### Branching / Fallback Paths

```text
[FALLBACK] active agent already has a subscribed local context
services/runRecovery/activeRunRecoveryCoordinator.ts:shouldRecoverAgentRun(runId)
└── skip recovery for runId
```

```text
[FALLBACK] active agent has an existing context but stream is no longer subscribed
services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator({ selectRun: false, ... })
├── [STATE] stores/agentContextsStore.ts:upsertProjectionContext(...) # refresh context baseline
└── [STATE] stores/agentRunStore.ts:connectToAgentStream(runId)
```

```text
[ERROR] projection or resume query fails for one run
services/runRecovery/activeRunRecoveryCoordinator.ts:recoverActiveRunsFromHistory(...)
└── log failure for runId and continue recovering remaining active runs
```

### State And Data Transformations

- History rows -> active agent run ID set
- Run projection/resume payload -> `AgentContext`
- `AgentContext` + run ID -> connected background stream

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Recover Active Team Runs After History Fetch]

### Goal

Hydrate and reconnect every active team run into frontend state after reload without selecting it.

### Preconditions

- `runHistoryStore.fetchTree()` receives one or more team history rows with `isActive = true`.

### Expected Outcome

- Each active team run has a live `AgentTeamContext`.
- Each recovered team run has an active or reconnecting team stream.
- Existing team streams always target the current team context object.

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:fetchTree(limitPerAgent, options)
└── [ASYNC] stores/runHistoryStore.ts:recoverActiveRunsFromHistory()
    └── [ASYNC] services/runRecovery/activeRunRecoveryCoordinator.ts:recoverActiveRunsFromHistory(...)
        ├── services/runRecovery/activeRunRecoveryCoordinator.ts:listActiveTeamRunIds(...)
        ├── services/runRecovery/activeRunRecoveryCoordinator.ts:shouldRecoverTeamRun(teamRunId)
        └── [ASYNC] services/runOpen/teamRunOpenCoordinator.ts:openTeamRunWithCoordinator({ teamRunId, selectRun: false, memberRouteKey: null, ... })
            ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().query(GetTeamRunResumeConfig)
            ├── [ASYNC][IO] stores/runHistoryTeamHelpers.ts:fetchTeamMemberProjections(...)
            ├── [ASYNC] stores/runHistoryTeamHelpers.ts:buildTeamMemberContexts(...)
            │   └── [ASYNC][IO] stores/workspace.ts:createWorkspace({ root_path })
            ├── [STATE] stores/agentTeamContextsStore.ts:addTeamContext(hydratedContext)
            └── [STATE] stores/agentTeamRunStore.ts:connectToTeamStream(teamRunId)
                ├── [FALLBACK] if TeamStreamingService already exists:
                │   ├── [STATE] services/agentStreaming/TeamStreamingService.ts:attachContext(teamContext)
                │   └── [ASYNC][IO] services/agentStreaming/TeamStreamingService.ts:connect(...) only when disconnected
                └── [ASYNC][IO] services/agentStreaming/TeamStreamingService.ts:connect(teamRunId, teamContext) # first connection path
```

### Branching / Fallback Paths

```text
[FALLBACK] active team already has a subscribed local context
services/runRecovery/activeRunRecoveryCoordinator.ts:shouldRecoverTeamRun(teamRunId)
└── skip recovery for teamRunId
```

```text
[FALLBACK] team context is rebuilt while a TeamStreamingService already exists
stores/agentTeamRunStore.ts:connectToTeamStream(teamRunId)
├── [STATE] existingService.attachContext(teamContext)
└── return without replacing live stream ownership when connection is already healthy
```

```text
[ERROR] one member projection fetch fails
services/runOpen/teamRunOpenCoordinator.ts:openTeamRunWithCoordinator(...)
├── keep null projection for failed member
├── build minimal member context from manifest
└── continue team recovery and connect stream
```

### State And Data Transformations

- Active team rows -> team run ID set
- Team resume + member projections -> `AgentTeamContext`
- `AgentTeamContext` -> attached or connected `TeamStreamingService`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [User Focuses A Recovered Active Team Member]

### Goal

Render the latest live team-member state in both the middle event monitor and right activity panel.

### Preconditions

- Active team run has already been recovered into frontend state.
- User clicks a team member row or team member tile.

### Expected Outcome

- `activeTeamContext` and `focusedMemberContext` point at the recovered live team object.
- Middle event monitor conversation and right activity feed reflect the same focused member run ID.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:@select-team-member(member)
└── [ASYNC] composables/useWorkspaceHistorySelectionActions.ts:onSelectTeamMember(member)
    ├── [STATE] composables/useWorkspaceHistoryTreeState.ts:setTeamExpanded(teamRunId, true)
    ├── [ASYNC] stores/runHistoryStore.ts:selectTreeRun(member)
    │   └── stores/runHistorySelectionActions.ts:selectTreeRunFromHistory(member)
    │       ├── [STATE] stores/agentTeamContextsStore.ts:setFocusedMember(memberRouteKey)
    │       ├── [STATE] stores/agentSelectionStore.ts:selectRun(teamRunId, 'team')
    │       └── [STATE] stores/runHistoryStore.ts:selectedTeamRunId / selectedTeamMemberRouteKey updated
    ├── components/workspace/team/AgentTeamEventMonitor.vue:conversationOfFocusedMember(computed) [STATE]
    └── components/progress/ActivityFeed.vue:currentAgentRunId(computed) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] focused member route key is missing from recovered team context
stores/agentTeamContextsStore.ts:setFocusedMember(memberName)
└── ignore focus change and keep previous valid member selection
```

### State And Data Transformations

- Member row -> `focusedMemberName`
- `focusedMemberContext.state.conversation` -> center event monitor feed
- `focusedMemberContext.state.runId` -> right activity feed lookup key

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Inactive History Open Remains Projection-Only]

### Goal

Keep inactive history open behavior unchanged and non-streaming.

### Preconditions

- User opens an inactive agent or team history row.

### Expected Outcome

- Projection data is hydrated.
- No background live subscription is created for that inactive run.

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:selectTreeRun(row)
├── [ASYNC] services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator({ runId, selectRun: true, ... }) # inactive agent
│   ├── [ASYNC][IO] query projection + resume config
│   ├── [STATE] stores/agentContextsStore.ts:upsertProjectionContext(...)
│   └── no connectToAgentStream because resumeConfig.isActive = false
└── [ASYNC] services/runOpen/teamRunOpenCoordinator.ts:openTeamRunWithCoordinator({ teamRunId, selectRun: true, ... }) # inactive team
    ├── [ASYNC][IO] query team resume + member projections
    ├── [STATE] stores/agentTeamContextsStore.ts:addTeamContext(hydratedContext)
    └── no connectToTeamStream because resumeConfig.isActive = false
```

### Branching / Fallback Paths

```text
[ERROR] inactive projection fetch fails
services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(...)
└── propagate error to runHistoryStore.error
```

### State And Data Transformations

- Inactive history row -> projection-only context

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
