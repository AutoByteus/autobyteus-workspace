# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the proposed design.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Source Artifact: `tickets/history-run-hard-delete-memory/proposed-design.md`
- Source Design Version: `v6`
- Referenced Sections:
  - `Target State (To-Be)`
  - `Change Inventory (Delta)`
  - `Error Handling And Edge Cases`

## Future-State Modeling Rule (Mandatory)

- This models target behavior after hard-delete support is implemented.
- Current code does not have delete mutation/service paths; those paths below are to-be call stacks.

## Use Case Index

- UC-001: Delete inactive persisted history run and purge memory folder.
- UC-002: Reject delete for active run.
- UC-003: Delete currently opened offline run and clean local state.
- UC-004: Backend delete failure keeps row unchanged and shows error.
- UC-005: Prevent duplicate delete dispatch while in flight.
- UC-006: Cancel confirmation and skip delete.

## Use Case: UC-001 Delete inactive persisted run and purge memory folder

### Goal

Hard-delete an inactive history run and remove disk memory under `memory/agents/<runId>`.

### Preconditions

- `run.source === 'history'`
- `run.isActive === false`
- User confirms deletion prompt.

### Expected Outcome

- Run folder removed from disk.
- Run row removed from run-history index.
- UI row disappears after quiet refresh.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onDeleteRun(runId)
├── decision: run is eligible (`source=history && !isActive`)
├── decision: window.confirm(...) === true
└── [ASYNC] stores/runHistoryStore.ts:deleteRun(runId)
    ├── [ASYNC][IO] graphql/mutations/runHistoryMutations.ts:DeleteRunHistory
    ├── [ASYNC][IO] server/api/graphql/types/run-history.ts:RunHistoryResolver.deleteRunHistory(runId)
    │   └── [ASYNC] server/run-history/services/run-history-service.ts:deleteRunHistory(runId)
    │       ├── decision: resolve targetPath under agentsRoot and assert containment
    │       ├── decision: targetPath !== agentsRoot (root delete guard)
    │       ├── decision: AgentInstanceManager.getAgentInstance(runId) === null
    │       ├── [IO] fs/promises.rm(memory/agents/<runId>, { recursive: true, force: true })
    │       └── [IO] run-history/store/run-history-index-store.ts:removeRow(runId)
    ├── [STATE] delete resumeConfigByRunId[runId]
    ├── [STATE] stores/agentContextsStore.ts:removeInstance(runId) if present
    ├── [STATE] clear selectedRunId when selected run is deleted
    └── [ASYNC] stores/runHistoryStore.ts:refreshTreeQuietly()
```

### Branching / Fallback Paths

```text
[FALLBACK] folder already missing but row exists
run-history-service.ts:deleteRunHistory(runId)
├── fs.rm(... force:true) succeeds without throw
└── run-history-index-store.ts:removeRow(runId)
```

```text
[ERROR] resolver/service unexpected throw
stores/runHistoryStore.ts:deleteRun(runId)
└── returns false; panel shows destructive-action error toast
```

### State And Data Transformations

- UI row id -> GraphQL variable: `runId: string`.
- GraphQL payload -> store result: `{ success, message } -> boolean + toast`.
- Local state mutation: remove cached resume config/context selection for deleted run.

### Observability And Debug Points

- UI logs/toasts on mutation failure.
- Backend warning/error logs for invalid runId or failed deletion IO.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Reject delete for active run

### Goal

Prevent destructive delete while run is live.

### Preconditions

- Delete request contains active `runId`.

### Expected Outcome

- Backend returns `success=false` with clear message.
- UI row remains unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] RunHistoryResolver.deleteRunHistory(runId)
└── run-history-service.ts:deleteRunHistory(runId)
    ├── decision: AgentInstanceManager.getAgentInstance(runId) !== null
    └── return { success:false, message:"Run is active. Terminate first." }
stores/runHistoryStore.ts:deleteRun(runId)
└── no local cleanup; return false
components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onDeleteRun
└── addToast("Failed to delete run ...", "error")
```

### Branching / Fallback Paths

```text
[FALLBACK] stale UI says inactive but backend sees active
Same path; backend remains source of truth and rejects delete.
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-003 Delete currently opened offline run and clean local state

### Goal

Avoid dangling selected context after deleting an opened historical run.

### Preconditions

- Run exists in `agentContextsStore.instances` and/or is selected.

### Expected Outcome

- Context removed locally.
- Selection cleared or moved by store policy.
- No stale highlight for deleted row.

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:deleteRun(runId)
├── [STATE] stores/agentContextsStore.ts:removeInstance(runId) if exists
│   └── may auto-select remaining context or clear selection
├── [STATE] stores/agentSelectionStore.ts:clearSelection() when deleted run is still selected but had no context entry
├── [STATE] runHistoryStore.selectedRunId = null when equals deleted runId
└── [ASYNC] refreshTreeQuietly()
```

### Error Path

```text
[ERROR] mutation result.success === false
stores/runHistoryStore.ts:deleteRun(runId)
└── skips local cleanup to avoid false success state
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Backend delete failure keeps row unchanged and shows error

### Goal

Maintain state consistency when GraphQL/network/IO failure occurs.

### Preconditions

- Delete mutation throws or returns `success=false`.

### Expected Outcome

- No row/context deletion in frontend.
- Error toast appears.

### Primary Runtime Call Stack

```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:onDeleteRun(runId)
└── runHistoryStore.deleteRun(runId)
    ├── [ASYNC][IO] apollo mutate -> throws or returns failure
    └── return false
onDeleteRun(runId)
└── addToast("Failed to delete run. Please try again.", "error")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Per-run in-flight lock blocks duplicate delete clicks

### Goal

Prevent duplicate mutation dispatch for same run.

### Preconditions

- User rapidly clicks delete action multiple times.

### Expected Outcome

- Only first request is sent while lock is set.

### Primary Runtime Call Stack

```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:onDeleteRun(runId)
├── decision: deletingRunIds[runId] === true
│   └── return (no-op)
└── [STATE] deletingRunIds[runId] = true
    ├── await runHistoryStore.deleteRun(runId)
    └── [STATE] finally delete deletingRunIds[runId]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-006 User cancels confirmation

### Goal

Guarantee no destructive side effects when user declines confirmation prompt.

### Preconditions

- User clicks delete icon but chooses Cancel.

### Expected Outcome

- No mutation dispatch.
- No local state change.

### Primary Runtime Call Stack

```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:onDeleteRun(runId)
├── decision: window.confirm(...) === false
└── return
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
