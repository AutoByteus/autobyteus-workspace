# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`
- No legacy compatibility alias branches.

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/rename-runtime-instance-id-to-run-id/proposed-design.md`
- Source Design Version: `v1`

## Future-State Modeling Rule (Mandatory)

- Model reflects target run-oriented architecture; as-is naming drift is intentionally excluded.

## Use Case Index (Stable IDs)

| use_case_id | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001,R-003,R-005,R-009 | N/A | Single-agent run start/continue | Primary/Fallback/Error |
| UC-002 | Requirement | R-002,R-003,R-005,R-009 | N/A | Team run start/continue | Primary/Fallback/Error |
| UC-003 | Requirement | R-001,R-002,R-003 | N/A | Query/terminate active runs via GraphQL | Primary/Error |
| UC-004 | Requirement | R-001,R-002,R-004 | N/A | Restore run history continuation flows | Primary/Fallback/Error |
| UC-005 | Requirement | R-004,R-014 | N/A | Frontend runtime consumes renamed GraphQL fields | Primary/Fallback/Error |
| UC-006 | Requirement | R-007 | N/A | Memory index/view use runId naming | Primary/Error |
| UC-007 | Requirement | R-009 | N/A | Runtime module paths are run-named | Primary/Error |
| UC-008 | Requirement | R-010,R-014 | N/A | Frontend run selection/event APIs renamed | Primary/Fallback/Error |
| UC-009 | Requirement | R-008,R-011,R-014 | N/A | Internal runtime identity symbols normalized | Primary/Fallback/Error |
| UC-010 | Requirement | R-012,R-013 | N/A | Artifact/token runtime contracts use runId | Primary/Error |
| UC-011 | Requirement | R-015,R-008 | N/A | External-channel contracts use agentRunId/teamRunId | Primary/Fallback/Error |

## Transition Notes

- Rename/move execution is done atomically per boundary so no mixed runtime identity vocabulary remains in active paths.

## Use Case: UC-001 [Single-Agent Run Start/Continue]

### Goal

Start a new single-agent run or continue an existing run using run-oriented APIs.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-run.ts:AgentRunResolver.sendAgentUserInput(input)
├── decision: input.agentRunId provided?
├── [if provided] src/agent-execution/services/agent-run-manager.ts:getAgentRun(agentRunId)
│   └── [ASYNC] autobyteus-ts agent runtime:postUserMessage(userMessage)
├── [if missing] [ASYNC] src/agent-execution/services/agent-run-manager.ts:createAgentRun(config)
│   ├── [STATE] create runtime in memory registry
│   └── return agentRunId
├── [ASYNC] src/run-history/services/run-history-service.ts:upsertRunHistoryRow(...)
│   └── [IO] src/run-history/store/run-history-index-store.ts:upsertRow(...)
└── return SendAgentUserInputResult{ agentRunId }
```

### Fallback / Error

```text
[FALLBACK] agentRunId provided but not active
agent-run.ts:sendAgentUserInput
└── return success=false with not-found message
```

```text
[ERROR] manager create/restore failure
agent-run.ts:sendAgentUserInput
└── return success=false with error text
```

## Use Case: UC-002 [Team Run Start/Continue]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-team-run.ts:AgentTeamRunResolver.sendMessageToTeam(input)
├── decision: input.teamRunId present?
├── [if present] [ASYNC] src/run-history/services/team-run-continuation-service.ts:continueTeamRun(...)
│   ├── decision: active team runtime exists?
│   ├── [if missing] [ASYNC] restoreTeamRuntime(teamRunId)
│   │   ├── [IO] team-run-history-service.ts:getTeamRunResumeConfig(teamRunId)
│   │   └── [ASYNC] agent-team-run-manager.ts:createTeamRunWithId(...)
│   └── [ASYNC] distributed ingress:dispatchUserMessage(teamRunId,...)
└── return SendMessageToTeamResult{ teamRunId }
```

### Fallback / Error

```text
[FALLBACK] teamRunId missing
agent-team-run.ts:sendMessageToTeam
└── [ASYNC] agent-team-run-manager.ts:createTeamRun(...), then dispatch
```

```text
[ERROR] distributed ingress rejects dispatch
team-run-continuation-service.ts:continueTeamRun
└── rollback restored runtime and bubble failure
```

## Use Case: UC-003 [Query And Terminate Active Runs]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-run.ts:agentRuns()/terminateAgentRun(id)
├── src/agent-execution/services/agent-run-manager.ts:listActiveRuns()
├── src/agent-execution/services/agent-run-manager.ts:getAgentRun(runId)
├── [ASYNC] src/agent-execution/services/agent-run-manager.ts:terminateAgentRun(runId)
└── [ASYNC] run-history-service.ts:onRunTerminated(runId)

[ENTRY] src/api/graphql/types/agent-team-run.ts:agentTeamRuns()/terminateAgentTeamRun(id)
├── src/agent-team-execution/services/agent-team-run-manager.ts:listActiveRuns()
├── [ASYNC] distributed ingress:dispatchControlStop(teamRunId)
├── [ASYNC] agent-team-run-manager.ts:terminateTeamRun(teamRunId)
└── [ASYNC] team-run-history-service.ts:onTeamTerminated(teamRunId)
```

### Error

```text
[ERROR] runtime not found
terminate* resolver
└── return success=false, no history mutation
```

## Use Case: UC-004 [Run History Continuation And Restore]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-run-history.ts:continueRun(input)
├── [ASYNC] src/run-history/services/run-continuation-service.ts:continueRun(input)
│   ├── decision: run active?
│   ├── [if inactive] [IO] run-manifest-store.ts:readManifest(runId)
│   ├── [ASYNC] agent-run-manager.ts:restoreAgentRun(...)
│   ├── [IO] run-manifest-store.ts:writeManifest(runId,...)
│   └── [IO] run-history-index-store.ts:upsertRow(...)
└── return ContinueRunMutationResult{ runId }
```

### Fallback / Error

```text
[FALLBACK] active run receives config overrides
run-continuation-service.ts:detectIgnoredActiveOverrides(...)
└── return ignoredConfigFields without mutating runtime config
```

```text
[ERROR] manifest missing for requested run
run-continuation-service.ts:continueExistingRun
└── throw user-facing continuation error
```

## Use Case: UC-005 [Frontend Runtime GraphQL Consumption]

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/runTreeStore.ts:refreshTree()
├── [ASYNC] graphql/queries/runHistoryQueries.ts:ListRunHistory
├── [ASYNC] graphql/queries/runHistoryQueries.ts:GetRunProjection(runId)
├── [STATE] normalize response into run tree rows keyed by runId/teamRunId
└── [STATE] update UI projection and active selection references
```

### Fallback / Error

```text
[FALLBACK] run projection missing
runTreeStore.ts
└── synthesize minimal row with status + IDs from history index
```

```text
[ERROR] GraphQL query failure
runTreeStore.ts
└── preserve existing tree snapshot and surface store error
```

## Use Case: UC-006 [Memory APIs Use runId]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/memory-index.ts:listRunMemorySnapshots(search,page,pageSize)
├── [IO] agent-memory-view/store/memory-file-store.ts:listAgentDirs()
├── [STATE] map memory entries to runId summary records
└── return MemorySnapshotPage(entries[].runId)

[ENTRY] src/api/graphql/types/memory-view.ts:getRunMemoryView(runId,...)
├── [IO] agent-memory-view/services/agent-memory-view-service.ts:getRunMemoryView(runId,...)
└── return RunMemoryView{ runId,... }
```

### Error

```text
[ERROR] run memory folder missing
memory-view resolver/service
└── return empty memory payload or typed error according to existing behavior
```

## Use Case: UC-007 [Runtime Module Path Rename Integrity]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/schema.ts:buildSchema(...)
├── import AgentRunResolver from ./types/agent-run.ts
├── import AgentTeamRunResolver from ./types/agent-team-run.ts
├── resolver methods call AgentRunManager / AgentTeamRunManager
└── schema compiles with no imports from *instance* runtime modules
```

### Error

```text
[ERROR] stale instance import remains
typecheck/build
└── fail compilation; cleanup task removes stale import path
```

## Use Case: UC-008 [Frontend Selection/Event Rename]

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onRowSelect(...)
├── [STATE] stores/agentSelectionStore.ts:selectRun(runId,type)
├── emit('run-selected',{ type, runId })
└── autobyteus-web/components/AppLeftPanel.vue:onRunningRunSelected -> route /workspace
```

### Fallback / Error

```text
[FALLBACK] create draft run from template
RunningAgentsPanel.vue
├── createRunFromTemplate(...)
└── emit('run-created',{ type, definitionId })
```

```text
[ERROR] invalid selection payload
selection store action guards
└── ignore update + preserve prior selectedRunId
```

## Use Case: UC-009 [Internal Runtime Symbol Normalization]

### Primary Runtime Call Stack

```text
[ENTRY] server services + web stores processing runtime identity
├── runtime identity variables use runId/teamRunId naming
├── ownership identifiers keep agentDefinitionId/teamDefinitionId naming
└── cross-layer DTO mapping preserves semantic distinction at boundaries
```

### Fallback / Error

```text
[FALLBACK] non-runtime ownership field encountered
mapping layer
└── keep existing agentId/teamId naming where entity identity is intended
```

```text
[ERROR] ambiguous symbol usage detected by review/typecheck
refactor pass
└── rename variable/field to explicit run or definition identity
```

## Use Case: UC-010 [Artifact/Token Usage Runtime Contracts]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-artifact.ts:agentArtifacts(runId)
├── [ASYNC] src/agent-artifacts/services/artifact-service.ts:getArtifactsByRunId(runId)
│   └── [IO] repositories/sql/agent-artifact-repository.ts:getByRunId(runId)
└── return artifacts[].runId

[ENTRY] token usage persistence processors
├── [ASYNC] token-usage repositories create/query by runId
└── [IO] Prisma fields map runId -> column agent_id via @map
```

### Error

```text
[ERROR] missing runId
GraphQL validation/repository guards
└── reject request with required-field validation
```

## Use Case: UC-011 [External-Channel Runtime Contracts]

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:ingress route
├── [ASYNC] external-channel/services/channel-binding-service.ts:findBinding(...)
├── [ASYNC] external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(...)
│   ├── [AGENT] dispatch with binding.agentRunId -> AgentRunManager.getAgentRun(agentRunId)
│   └── [TEAM] dispatch with binding.teamRunId -> team ingress dispatch(teamRunId,...)
├── [ASYNC][IO] channel-message-receipt-service.ts:recordIngressReceipt({ agentRunId/teamRunId })
└── callback/reply path uses getSourceByAgentRunTurn(agentRunId,turnId)
```

### Fallback / Error

```text
[FALLBACK] route not bound to current target
reply-callback-service.ts
└── return BINDING_NOT_FOUND without publishing callback
```

```text
[ERROR] runtime target missing
default-channel-runtime-facade.ts
└── throw not-found dispatch error; ingress service records failure
```

