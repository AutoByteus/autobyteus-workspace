# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Source Artifact: `tickets/history-run-inactive-offline-status-alignment/proposed-design.md`
- Source Design Version: `v4`

## Use Case Index

- UC-001: Open inactive history run and display `Offline`.
- UC-002: Open active history run and preserve live stream attach behavior.
- UC-003: Continue a previously inactive run after opening.
- UC-004: Preserve left tree inactive-row behavior (no active dot).

## Use Case: UC-001 Open inactive history run

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onSelectRun(row)
└── stores/runHistoryStore.ts:selectTreeRun(row[source=history])
    └── [ASYNC] stores/runHistoryStore.ts:openRun(runId)
        └── [ASYNC][IO] services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(runId)
            ├── [ASYNC][IO] GraphQL:GetRunProjection + GetRunResumeConfig
            ├── decision: resumeConfig.isActive === false
            ├── [STATE] stores/agentContextsStore.ts:upsertProjectionContext({ status: AgentStatus.ShutdownComplete })
            ├── [STATE] stores/agentSelectionStore.ts:selectInstance(runId, 'agent')
            └── [STATE] stores/runHistoryStore.ts:selectedRunId = runId
[RENDER] components/workspace/agent/AgentWorkspaceView.vue
└── components/workspace/agent/AgentStatusDisplay.vue
    └── composables/useStatusVisuals.ts => text: "Offline"
```

### Error Path

```text
[ERROR] GetRunProjection/GetRunResumeConfig throws
stores/runHistoryStore.ts:openRun(runId)
├── this.error = "Failed to open run ..."
└── throw error to caller
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

### Residual Note

- `RunningAgentsPanel` (mobile layout) groups all in-memory contexts and may still list this offline context under a running-labeled panel; treated as out-of-scope for this ticket.

## Use Case: UC-002 Open active history run

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:openRun(runId)
└── services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(runId)
    ├── [ASYNC][IO] GetRunProjection + GetRunResumeConfig
    ├── decision: resumeConfig.isActive === true
    ├── [STATE] agentContextsStore.upsertProjectionContext({ status: AgentStatus.Uninitialized })
    ├── [STATE] selectionStore.selectInstance(runId, 'agent')
    └── [ASYNC] agentRunStore.connectToAgentStream(runId)
```

### Error Path

```text
[ERROR] workspace resolution fails
openRunWithCoordinator
└── throws error; openRun stores message in runHistoryStore.error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Continue previously inactive run

### Primary Runtime Call Stack

```text
[ENTRY] stores/activeContextStore.ts:send()
└── stores/agentRunStore.ts:sendUserInputAndSubscribe()
    ├── [ASYNC][IO] GraphQL ContinueRun(runId)
    ├── decision: result.success === true
    ├── [STATE] stores/runHistoryStore.ts:markRunAsActive(runId)
    ├── [ASYNC] stores/runHistoryStore.ts:refreshTreeQuietly()
    └── [ASYNC] stores/agentRunStore.ts:connectToAgentStream(runId) if not subscribed
```

### Error Path

```text
[ERROR] ContinueRun returns failure
agentRunStore.sendUserInputAndSubscribe()
├── logs error + appends error segment
└── no stream connect on failure
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Preserve left tree inactive visuals

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:getTreeNodes()
├── buildRunTreeProjection(...)
└── utils/runTreeLiveStatusMerge.ts:mergeRunTreeWithLiveContexts(...)
    ├── AgentStatus.ShutdownComplete -> { isActive: false, lastKnownStatus: 'IDLE' }
    └── UI row renders without active dot
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
