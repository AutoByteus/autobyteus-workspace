# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v2`
- Source Artifact: `tickets/agent-id-naming-alignment/proposed-design.md`
- Source Design Version: `v2`
- Referenced Sections:
  - `Target State (To-Be)`
  - `Change Inventory (Delta)`
  - `Use-Case Coverage Matrix (Design Gate)`

## Future-State Modeling Rule (Mandatory)

- These call stacks model the target naming state (`agentId` for single-agent history).
- Current `runId` names in code are treated as migration work, not target-state behavior.
- Team distributed execution identity remains `teamRunId` and is intentionally not renamed in these stacks.

## Use Case Index

- UC-001: List and open agent history rows with `agentId` naming.
- UC-002: Continue existing agent and restore inactive agent with `agentId` contracts.
- UC-003: Delete agent history with `agentId` naming.
- UC-004: Preserve team distributed `teamRunId` execution semantics.
- UC-005: Synchronize frontend generated types and tests after rename.

---

## Use Case: UC-001 List and open agent history rows with `agentId` naming

### Goal

Agent history query/projection/resume flows use `agentId` consistently from backend GraphQL to frontend tree-open orchestration.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/runTreeStore.ts:fetchTree(limitPerAgent)
└── [ASYNC][IO] autobyteus-web/graphql/queries/runHistoryQueries.ts:ListRunHistory
    └── [ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts:listRunHistory(limitPerAgent)
        └── [ASYNC] autobyteus-server-ts/src/run-history/services/run-history-service.ts:listRunHistory(limitPerAgent)
            ├── [ASYNC][IO] autobyteus-server-ts/src/run-history/store/run-history-index-store.ts:listRows()
            ├── [STATE] group rows by workspace/agentDefinition with `agentId` row identity
            └── return GraphQL payload with `agentId`
[STATE] autobyteus-web/stores/runTreeStore.ts:workspaceGroups updated with agent rows keyed by `agentId`

[ENTRY] autobyteus-web/stores/runTreeStore.ts:openAgentHistory(agentId)
└── [ASYNC] autobyteus-web/services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator({ agentId, ... })
    ├── [ASYNC][IO] autobyteus-web/graphql/queries/runHistoryQueries.ts:GetRunProjection(agentId)
    │   └── [ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts:getRunProjection(agentId)
    │       └── autobyteus-server-ts/src/run-history/services/run-projection-service.ts:getProjection(agentId)
    ├── [ASYNC][IO] autobyteus-web/graphql/queries/runHistoryQueries.ts:GetRunResumeConfig(agentId)
    │   └── [ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts:getRunResumeConfig(agentId)
    │       └── autobyteus-server-ts/src/run-history/services/run-history-service.ts:getRunResumeConfig(agentId)
    ├── [STATE] autobyteus-web/stores/agentContextsStore.ts:upsertProjectionContext({ agentId, ... })
    ├── [STATE] autobyteus-web/stores/agentSelectionStore.ts:selectRun(agentId, 'agent')
    └── [ASYNC] autobyteus-web/stores/agentRunStore.ts:connectToAgentStream(agentId) when active
```

### Error Path

```text
[ERROR] agent projection/resume query fails
autobyteus-web/services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(...)
└── throw -> autobyteus-web/stores/runTreeStore.ts:openAgentHistory(...) sets store error message
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-002 Continue existing agent and restore inactive agent with `agentId` contracts

### Goal

`continueRun` GraphQL input/output uses `agentId`; backend restore path preserves semantics by restoring exact same agent identity.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/agentRunStore.ts:sendUserInputAndSubscribe()
└── [ASYNC][IO] autobyteus-web/graphql/mutations/runHistoryMutations.ts:ContinueRun(input.agentId)
    └── [ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts:continueRun(input)
        └── [ASYNC] autobyteus-server-ts/src/run-history/services/run-continuation-service.ts:continueRun(input)
            ├── decision: input.agentId provided?
            │   ├── yes -> continueExistingAgent(agentId, input)
            │   │   ├── [STATE] check active runtime via AgentRunManager.getAgentRun(agentId)
            │   │   ├── [FALLBACK] if inactive: [ASYNC][IO] RunManifestStore.readManifest(agentId)
            │   │   ├── [ASYNC] AgentRunManager.restoreAgentRun({ agentId, ... })
            │   │   ├── [ASYNC][IO] RunManifestStore.writeManifest(agentId, manifest)
            │   │   └── [ASYNC][IO] RunHistoryService.upsertAgentHistoryRow({ agentId, ... })
            │   └── no -> createAndContinueNewAgent(input)
            │       ├── [ASYNC] AgentRunManager.createAgentRun(...) -> returns agentId
            │       ├── [ASYNC][IO] RunManifestStore.writeManifest(agentId, manifest)
            │       └── [ASYNC][IO] RunHistoryService.upsertAgentHistoryRow({ agentId, ... })
            └── return mutation payload `{ success, agentId, ignoredConfigFields }`
[STATE] autobyteus-web/stores/agentContextsStore.ts:promoteTemporaryId(tempId, agentId) for first message path
[STATE] autobyteus-web/stores/runTreeStore.ts:markRunAsActive(agentId)
```

### Branching / Fallback Paths

```text
[FALLBACK] existing agent active
RunContinuationService.continueExistingAgent(agentId, input)
└── post message directly without restore and mark index row active
```

```text
[ERROR] manifest missing for inactive existing agent
RunContinuationService.continueExistingAgent(agentId, input)
└── throw "Agent '<agentId>' cannot be continued because manifest is missing"
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-003 Delete agent history with `agentId` naming

### Goal

Delete mutation accepts `agentId` and performs unchanged active guard + safe path deletion semantics.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/runTreeStore.ts:deleteRun(agentId)
└── [ASYNC][IO] autobyteus-web/graphql/mutations/runHistoryMutations.ts:DeleteRunHistory(agentId)
    └── [ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run-history.ts:deleteRunHistory(agentId)
        └── [ASYNC] autobyteus-server-ts/src/run-history/services/run-history-service.ts:deleteRunHistory(agentId)
            ├── [STATE] active guard via AgentRunManager.getAgentRun(agentId)
            ├── [STATE] resolveSafeRunDirectory(agentId)
            ├── [ASYNC][IO] fs.rm(memory/agents/<agentId>)
            └── [ASYNC][IO] RunHistoryIndexStore.removeRow(agentId)
[STATE] autobyteus-web/stores/runTreeStore.ts:local context + selection cleanup for deleted agentId
```

### Error Path

```text
[ERROR] active agent run exists
RunHistoryService.deleteRunHistory(agentId)
└── return { success:false, message:"Run is active..." } (message text may be renamed to Agent)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-004 Preserve team distributed `teamRunId` execution semantics

### Goal

Agent naming alignment must not alter distributed team fencing/order semantics keyed by `teamRunId`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:attachTeamStreamEnvelope(event, message, eventType)
└── [STATE] resolve active run via TeamCommandIngressService.resolveActiveRun(teamId)
    ├── [STATE] TeamRunLocatorRecord contains `{ teamId, teamRunId, runVersion }`
    ├── [STATE] TeamEventAggregator.publishLocalEvent({ teamRunId, runVersion, ... })
    └── emit payload.team_stream_event_envelope.team_run_id

[ENTRY] autobyteus-web/services/agentStreaming/TeamStreamingService.ts:shouldApplyBySequence(payload)
└── [STATE] dedupe/order map keyed by envelope.team_run_id (teamRunId)
```

### Error Path

```text
[ERROR] stale tool approval token for prior run
autobyteus-server-ts/src/distributed/ingress/team-command-ingress-service.ts:validateToolApprovalToken(token, run)
└── reject when token.teamRunId !== activeRun.teamRunId or token.runVersion mismatch
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-005 Synchronize generated types and tests after rename

### Goal

No mixed naming remains after refactor; generated GraphQL types and tests compile/pass on new contracts.

### Primary Runtime Call Stack

```text
[ENTRY] developer workflow: update backend schema fields/args to `agentId`
└── [ASYNC] regenerate web GraphQL types
    ├── [IO] autobyteus-web/generated/graphql.ts updated with `agentId` fields
    ├── [STATE] compile-time contract updates in stores/services using generated types
    └── [ASYNC] run tests
        ├── backend run-history tests
        ├── frontend store/utils tests
        └── integration smoke for agent history open/continue/delete
```

### Error Path

```text
[ERROR] stale query docs still request `runId`
GraphQL validation/codegen fails
└── update query/mutation documents and rerun codegen/tests
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
