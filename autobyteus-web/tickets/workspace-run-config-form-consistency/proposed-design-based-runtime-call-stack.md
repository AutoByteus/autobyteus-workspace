# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Source Artifact:
  - `tickets/workspace-run-config-form-consistency/implementation-plan.md`
- Source Design Version: `v1`

## Use Case Index

- UC-001: Left tree "+" should open run configuration form.
- UC-002: Active workspace header "+" should open run configuration form.
- UC-003: Running panel group "+" should open run configuration form.

## Use Case: UC-001 Left Tree "+" Opens Config Form

### Goal

Allow creating a new run from a workspace+agent row while always landing in configuration mode first.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onCreateRun(workspaceRootPath, agentDefinitionId)
├── stores/runHistoryStore.ts:createDraftRun(...)
│   ├── stores/agentDefinitionStore.ts:getAgentDefinitionById(...)
│   ├── stores/runHistoryStore.ts:ensureWorkspaceByRootPath(...) [ASYNC][IO]
│   ├── stores/agentRunConfigStore.ts:setTemplate(...) or setAgentConfig(...) [STATE]
│   ├── stores/agentRunConfigStore.ts:updateAgentConfig(...) [STATE]
│   ├── stores/teamRunConfigStore.ts:clearConfig() [STATE]
│   └── stores/agentSelectionStore.ts:clearSelection() [STATE]
└── components/workspace/history/WorkspaceAgentRunsTreePanel.vue:emit('instance-created', { type:'agent', definitionId }) # route host to /workspace
```

### Fallback / Error Paths

```text
[ERROR] definition/workspace/model cannot be resolved
stores/runHistoryStore.ts:createDraftRun(...)
└── throw Error -> WorkspaceAgentRunsTreePanel catches and logs
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Header "+" Opens Config Form

### Goal

From an active run view, duplicate current config into an editable template and show config form.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/agent/AgentWorkspaceView.vue:createNewAgent()
├── stores/agentRunConfigStore.ts:setAgentConfig(templateFromActiveContext) [STATE]
├── stores/teamRunConfigStore.ts:clearConfig() [STATE]
└── stores/agentSelectionStore.ts:clearSelection() [STATE] # enables RunConfigPanel rendering
```

```text
[ENTRY] components/workspace/team/TeamWorkspaceView.vue:createNewTeamInstance()
├── stores/teamRunConfigStore.ts:setConfig(templateFromActiveTeamContext) [STATE]
├── stores/agentRunConfigStore.ts:clearConfig() [STATE]
└── stores/agentSelectionStore.ts:clearSelection() [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-003 Running Panel "+" Opens Config Form

### Goal

From grouped running list, start a new run by preparing buffered config only.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/running/RunningAgentsPanel.vue:createAgentInstance(definitionId)
├── stores/agentRunConfigStore.ts:setAgentConfig(...) or setTemplate(...) [STATE]
├── stores/teamRunConfigStore.ts:clearConfig() [STATE]
├── stores/agentSelectionStore.ts:clearSelection() [STATE]
└── emit('instance-created', { type:'agent', definitionId })
```

```text
[ENTRY] components/workspace/running/RunningAgentsPanel.vue:createTeamInstance(definitionId)
├── stores/teamRunConfigStore.ts:setConfig(...) or setTemplate(...) [STATE]
├── stores/agentRunConfigStore.ts:clearConfig() [STATE]
├── stores/agentSelectionStore.ts:clearSelection() [STATE]
└── emit('instance-created', { type:'team', definitionId })
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
