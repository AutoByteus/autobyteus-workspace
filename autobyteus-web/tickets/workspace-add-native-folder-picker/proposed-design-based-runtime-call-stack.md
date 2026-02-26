# Proposed-Design-Based Runtime Call Stack

## Design Basis

- Scope: `Small`
- Source: `tickets/workspace-add-native-folder-picker/implementation-plan.md` (Draft-Pre-Review)
- Call Stack Version: `v1`

## Use Case Index

- UC-001: Electron plus click opens native picker and adds workspace.
- UC-002: Electron picker cancel causes no mutation.
- UC-003: Non-Electron plus click opens inline manual form.
- UC-004: Workspace creation failure after picker keeps recoverable inline state.

## UC-001 Electron plus click opens native picker and adds workspace

### Primary Path

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onCreateWorkspace()
├── decision: windowNodeContextStore.isEmbeddedWindow === true
├── [ASYNC] composables/useNativeFolderDialog.ts:pickFolderPath()
│   ├── [ASYNC][IPC] window.electronAPI.showFolderDialog()
│   └── returns selected absolute path
└── [ASYNC] WorkspaceAgentRunsTreePanel.vue:createWorkspaceFromPath(path)
    ├── [ASYNC] stores/runHistoryStore.ts:createWorkspace(path)
    │   └── [ASYNC] stores/workspace.ts:createWorkspace({ root_path: path })
    ├── [STATE] expandedWorkspace[path] = true
    ├── [ASYNC] workspaceStore.fetchAllWorkspaces()
    └── [STATE] resetCreateWorkspaceInline()
```

### Outcome

- Workspace appears in left panel without manual path typing.

## UC-002 Electron picker cancel causes no mutation

### Path

```text
[ENTRY] onCreateWorkspace()
├── pickFolderPath()
│   └── returns null (canceled or unavailable)
└── return
```

### Outcome

- No `createWorkspace` call.
- No new workspace entry.

## UC-003 Non-Electron plus click opens inline manual form

### Path

```text
[ENTRY] onCreateWorkspace()
├── decision: isEmbeddedWindow === false OR picker API unavailable
└── existing inline flow
    ├── showCreateWorkspaceInline = true
    └── focusWorkspaceInput()
```

### Outcome

- Current browser/manual path behavior remains unchanged.

## UC-004 Workspace creation failure after picker keeps recoverable inline state

### Error Path

```text
[ENTRY] onCreateWorkspace()
├── pickFolderPath() returns selected path
└── createWorkspaceFromPath(path)
    ├── runHistoryStore.createWorkspace(path) throws
    ├── [STATE] workspacePathDraft = path
    ├── [STATE] workspacePathError = "Failed to add workspace..."
    ├── [STATE] showCreateWorkspaceInline = true
    └── focusWorkspaceInput()
```

### Outcome

- User can edit the selected path and retry manually.
