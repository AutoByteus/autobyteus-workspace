# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Source Artifact: `tickets/workspace-tree-avatar-hardening/implementation-plan.md`
- Source Design Version: `v2`

## Use Case Index

- UC-001: Render avatar in workspace tree agent row.
- UC-002: Fallback to initials when avatar URL is missing or image load fails, and recover after refresh cycle.
- UC-003: Build tree nodes with avatar URLs with run-history store ownership (no component-side data coupling).

## Use Case: UC-001 Render avatar in workspace tree agent row

### Primary Runtime Call Stack

```text
[ENTRY] components/AppLeftPanel.vue
└── components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onMounted() [ASYNC]
    ├── stores/workspace.ts:fetchAllWorkspaces() [IO]
    └── stores/runHistoryStore.ts:fetchTree() [ASYNC][IO]
        ├── GraphQL ListRunHistory query
        └── stores/runHistoryStore.ts:refreshAgentAvatarIndex(loadIfNeeded=true)
            ├── stores/agentDefinitionStore.ts:fetchAllAgentDefinitions() [IO]
            ├── stores/agentDefinitionStore.ts:agentDefinitions (read)
            └── stores/agentContextsStore.ts:instances (read)

[ENTRY] stores/runHistoryStore.ts:getTreeNodes()
├── read local state: agentAvatarByDefinitionId
├── overlay live context avatar values
├── utils/runTreeProjection.ts:buildRunTreeProjection(...)
└── utils/runTreeLiveStatusMerge.ts:mergeRunTreeWithLiveContexts(...)

[RENDER] components/workspace/history/WorkspaceAgentRunsTreePanel.vue
└── render avatar image when showAgentAvatar(...) is true
```

### Error Path

```text
[ERROR] fetchAllAgentDefinitions fails in refreshAgentAvatarIndex
└── runHistoryStore keeps previous cache + context overlay, UI still renders initials fallback when URL unavailable
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Recoverable avatar fallback behavior

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:showAgentAvatar(...)
├── build avatar key from workspaceRootPath + agentDefinitionId + avatarUrl
└── decision: URL exists AND key not in brokenAvatarByAgentKey => render <img>
```

### Fallback / Error Path

```text
[FALLBACK] image load fails
components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onAgentAvatarError(...)
└── [STATE] brokenAvatarByAgentKey[avatarKey] = true

[FALLBACK-RECOVERY] runHistoryStore.loading transitions true -> false (refresh complete)
components/workspace/history/WorkspaceAgentRunsTreePanel.vue:watch(runHistoryStore.loading)
└── [STATE] brokenAvatarByAgentKey reset to {}
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-003 Store-owned avatar composition

### Primary Runtime Call Stack

```text
[ENTRY] stores/runHistoryStore.ts:refreshAgentAvatarIndex(loadIfNeeded)
├── optional load definitions from agentDefinitionStore
├── compose definition-id -> avatarUrl map
├── overlay live contexts avatar values
└── [STATE] write agentAvatarByDefinitionId in runHistoryStore state

[ENTRY] stores/runHistoryStore.ts:getTreeNodes()
├── use runHistoryStore.agentAvatarByDefinitionId (owned cache)
├── enrich persisted groups and draft rows with avatar URL
└── project + merge to RunTreeWorkspaceNode[]
```

### Error Path

```text
[ERROR] avatar cache empty on first paint before fetchTree completes
└── UI shows initials fallback until fetchTree finishes and tree recomputes
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
