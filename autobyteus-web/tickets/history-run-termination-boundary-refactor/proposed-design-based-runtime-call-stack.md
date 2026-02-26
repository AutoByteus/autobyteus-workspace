# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v6`
- Source Artifact: `tickets/history-run-termination-boundary-refactor/proposed-design.md`
- Source Design Version: `v6`

## Use Case Index

- UC-001: Terminate active persisted run from left panel and keep historical row.
- UC-002: Terminate active draft run from left panel and keep historical row.
- UC-003: Handle backend terminate business failure without false UI success.
- UC-004: Close agent with terminate option and avoid remove-on-failure.
- UC-005: Ensure terminate failure is observable to user-facing UX (implemented via toast).

## Use Case: UC-001 Terminate active persisted run

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onTerminateRun(runId)
├── stores/agentRunStore.ts:terminateRun(runId)
│   ├── stores/agentContextsStore.ts:getInstance(runId)
│   ├── [ASYNC][IO] utils/apolloClient.ts:getApolloClient().mutate(TerminateAgentInstance)
│   ├── stores/agentRunStore.ts:validateGraphqlResult(success===true)
│   ├── [STATE] stores/agentRunStore.ts:teardownLocalRuntime()
│   │   ├── context.unsubscribe()
│   │   ├── streamingServices.delete(runId)
│   │   └── context.state.currentStatus = AgentStatus.ShutdownComplete
│   ├── [STATE] stores/runHistoryStore.ts:markRunAsInactive(runId)
│   └── [ASYNC][IO] stores/runHistoryStore.ts:refreshTreeQuietly() -> fetchTree()
└── components/workspace/history/WorkspaceAgentRunsTreePanel.vue:clearTerminatingFlag(runId)
```

### Error Path

```text
[ERROR] GraphQL mutation throws OR success=false
stores/agentRunStore.ts:terminateRun(runId)
├── stores/agentRunStore.ts:catch(error)
├── [STATE] return false # local runtime remains intact for persisted run
└── components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onTerminateRun(runId)
    ├── console.error("Failed to terminate run")
    └── [STATE] composables/useToasts.ts:addToast("Failed to terminate run. Please try again.", "error")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Terminate active draft run

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onTerminateRun(temp-*)
├── stores/agentRunStore.ts:terminateRun(temp-*)
│   ├── stores/agentContextsStore.ts:getInstance(runId)
│   ├── [STATE] stores/agentRunStore.ts:teardownLocalRuntime()
│   ├── [STATE] stores/runHistoryStore.ts:markRunAsInactive(runId)
│   └── return true # no backend mutation
└── components/workspace/history/WorkspaceAgentRunsTreePanel.vue:clearTerminatingFlag(runId)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-003 Avoid false-success status on business failure

### Primary Runtime Call Stack

```text
[ENTRY] stores/agentRunStore.ts:terminateRun(runId)
├── [ASYNC][IO] apollo mutate terminateAgentInstance
├── stores/agentRunStore.ts:result = data.terminateAgentInstance
├── decision: if !result.success -> throw Error(result.message)
└── [ERROR] catch branch -> return false without teardown or history inactive mark
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 closeAgent with terminate option

### Primary Runtime Call Stack

```text
[ENTRY] stores/agentRunStore.ts:closeAgent(agentId, { terminate: true })
├── stores/agentContextsStore.ts:getInstance(agentId)
├── [ASYNC] stores/agentRunStore.ts:terminateRun(agentId)
├── decision: if terminated === false -> return # keep context
└── [STATE] stores/agentContextsStore.ts:removeInstance(agentId)
```

### Error Path

```text
[ERROR] terminateRun returns false
stores/agentRunStore.ts:closeAgent(..., { terminate: true })
└── return without removeInstance
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 user-visible failure feedback

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onTerminateRun(runId)
├── [ASYNC] stores/agentRunStore.ts:terminateRun(runId)
├── decision: if terminated === false
└── [STATE] composables/useToasts.ts:addToast("Failed to terminate run. Please try again.", "error")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
