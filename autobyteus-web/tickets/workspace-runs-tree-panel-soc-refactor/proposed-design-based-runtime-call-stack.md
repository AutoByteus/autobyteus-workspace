# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v3`
- Source Artifact: `tickets/workspace-runs-tree-panel-soc-refactor/proposed-design.md`
- Source Design Version: `v3`
- Referenced Sections:
  - `Target State (To-Be)`
  - `File And Module Breakdown`
  - `Use-Case Coverage Matrix`

## Use Case Index

- UC-001: Initial mount render and fetch.
- UC-002: Expand/collapse workspace/agent/team branches.
- UC-003: Select run/team-member and open corresponding context.
- UC-004: Terminate/delete run/team with guard + modal flow.
- UC-005: Create workspace through picker/inline input.
- UC-006: Render display helpers deterministically.

---

## Use Case: UC-001 Initial mount render and fetch

### Goal

Render the workspace and team tree from run-history sources without embedding data-fetch orchestration in presentational subcomponents.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onMounted()
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:initializePanelData()
    ├── [ASYNC][IO] stores/workspace.ts:fetchAllWorkspaces()
    ├── [ASYNC][IO] stores/runTreeStore.ts:fetchTree()
    │   ├── [ASYNC][IO] graphql/queries/runHistoryQueries.ts:ListRunHistory
    │   ├── [ASYNC][IO] graphql/queries/runHistoryQueries.ts:ListTeamRunHistory
    │   ├── [STATE] stores/runTreeStore.ts:workspaceGroups/teamHistoryRows updated
    │   └── [STATE] stores/runTreeStore.ts:loading/error updated
    └── [STATE] composables/workspace/history/useRunTreeActions.ts:initialization complete
[RENDER] components/workspace/history/WorkspaceRunsSection.vue
[RENDER] components/workspace/history/TeamRunsSection.vue
```

### Error Path

```text
[ERROR] stores/runTreeStore.ts:fetchTree throws
composables/workspace/history/useRunTreeActions.ts:initializePanelData()
└── [STATE] stores/runTreeStore.ts:error assigned -> panel renders error message
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-002 Expand/collapse workspace/agent/team branches

### Goal

Local UI expansion state is updated without invoking store/network side effects.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:@toggle-workspace(workspaceRootPath)
└── [STATE] composables/workspace/history/useRunTreeViewState.ts:toggleWorkspace(workspaceRootPath)

[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:@toggle-agent(workspaceRootPath, agentDefinitionId)
└── [STATE] composables/workspace/history/useRunTreeViewState.ts:toggleAgent(workspaceRootPath, agentDefinitionId)

[ENTRY] components/workspace/history/TeamRunsSection.vue:@toggle-team(teamId)
└── [STATE] composables/workspace/history/useRunTreeViewState.ts:toggleTeam(teamId)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

---

## Use Case: UC-003 Select run/team-member and open context

### Goal

Selection actions are orchestrated through one action boundary and emit unchanged root events.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:@select-run(run)
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:selectRun(run)
    ├── [ASYNC][IO] stores/runTreeStore.ts:selectTreeRun(run)
    │   └── [ASYNC][IO] services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(runId)
    ├── [STATE] stores/agentSelectionStore.ts:selectedType='agent', selectedRunId=run.runId
    └── [STATE] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:emit('run-selected', { type: 'agent', runId: run.runId })

[ENTRY] components/workspace/history/TeamRunsSection.vue:@select-member(member)
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:selectTeamMember(member)
    ├── [ASYNC][IO] stores/runTreeStore.ts:selectTreeRun(member)
    │   └── [ASYNC][IO] stores/runTreeStore.ts:openTeamMemberRun(teamId, memberRouteKey)
    ├── [STATE] stores/agentSelectionStore.ts:selectedType='team', selectedRunId=member.teamId
    └── [STATE] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:emit('run-selected', { type: 'team', runId: member.teamId })
```

### Error Path

```text
[ERROR] stores/runTreeStore.ts:selectTreeRun throws
composables/workspace/history/useRunTreeActions.ts:selectRun/selectTeamMember
└── [STATE] log + no emit of run-selected
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-004 Terminate/delete run/team with guard + modal

### Goal

Action guards, busy-state maps, and destructive confirmation stay in one orchestration layer.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:@terminate-run(runId)
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:terminateRun(runId)
    ├── guard: if terminatingRunIds[runId] return
    ├── [STATE] terminatingRunIds[runId]=true
    ├── [ASYNC][IO] stores/agentRunStore.ts:terminateRun(runId)
    ├── [FALLBACK] if terminate result false -> toasts:error
    └── [STATE] terminatingRunIds[runId] removed

[ENTRY] components/workspace/history/TeamRunsSection.vue:@request-delete-team(teamId)
└── [STATE] composables/workspace/history/useRunTreeActions.ts:pendingDeleteTarget={kind:'team', id:teamId}, showDeleteConfirmation=true

[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:ConfirmationModal@confirm
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:confirmDelete()
    ├── branch run -> [ASYNC][IO] stores/runTreeStore.ts:deleteRun(runId)
    ├── branch team -> [ASYNC][IO] stores/runTreeStore.ts:deleteTeamRun(teamId)
    ├── [STATE] busy map updates + cleanup pending target
    └── [STATE] toasts success/error
```

### Error Path

```text
[ERROR] delete/terminate mutation throws
useRunTreeActions.ts
└── [STATE] toasts:error + busy map cleanup in finally path
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-005 Create workspace through picker/inline input

### Goal

Workspace creation intent is routed through one action entry while preserving picker and manual-input behavior.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:@create-workspace-button
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:startWorkspaceCreationFlow()
    ├── decision: embedded + native picker available?
    │   ├── yes -> [ASYNC][IO] composables/useNativeFolderDialog.ts:pickFolderPath()
    │   │   └── [ASYNC] useRunTreeActions.ts:createWorkspaceFromPath(path)
    │   └── no  -> [STATE] show inline form
    └── [STATE] panel receives workspace-create UI state

[ENTRY] components/workspace/history/WorkspaceCreateInlineForm.vue:@confirm(rootPath)
└── [ASYNC] composables/workspace/history/useRunTreeActions.ts:createWorkspaceFromPath(rootPath)
    ├── [STATE] creatingWorkspace=true; workspacePathError=''
    ├── [ASYNC][IO] stores/runTreeStore.ts:createWorkspace(rootPath)
    ├── [ASYNC][IO] stores/workspace.ts:fetchAllWorkspaces()
    ├── [STATE] expandedWorkspace[normalizedRoot]=true
    └── [STATE] reset inline form fields
```

### Branching / Fallback Paths

```text
[FALLBACK] picker cancelled or empty path
useRunTreeActions.ts:startWorkspaceCreationFlow()
└── return without mutation
```

```text
[ERROR] createWorkspace fails
useRunTreeActions.ts:createWorkspaceFromPath(rootPath)
├── [STATE] workspacePathError set
└── [STATE] inline form remains visible for correction
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-006 Display helpers deterministic rendering

### Goal

Formatting and keying helpers are pure and independent from async side effects.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/TeamRunsSection.vue:render(member.workspaceRootPath)
└── [STATE] utils/workspace/history/runTreeDisplay.ts:workspacePathLeafName(path)

[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:render(agent)
└── [STATE] utils/workspace/history/runTreeDisplay.ts:agentInitials(agentName)

[ENTRY] components/workspace/history/WorkspaceRunsSection.vue:@avatar-error(agent)
└── [STATE] composables/workspace/history/useRunTreeViewState.ts:markAvatarBroken(agentKey)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
