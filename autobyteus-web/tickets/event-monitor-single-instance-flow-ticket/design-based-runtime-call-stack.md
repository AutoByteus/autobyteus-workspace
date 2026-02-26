# Design-Based Runtime Call Stacks (Debug-Trace Style)

Use this document as a design-derived runtime trace. Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
This artifact is required for all change sizes; for small changes keep it concise but still cover every in-scope use case.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `tickets/event-monitor-single-instance-flow-ticket/implementation-plan.md` (draft solution sketch as lightweight design basis)
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Use Case Index

- Use Case 1: Select existing agent run from left running panel
- Use Case 2: Create new agent run from left group action
- Use Case 3: Remove selected agent run and auto-select fallback
- Use Case 4: Select existing team run from left running panel
- Use Case 5: Left panel collapsed; reopen required to switch

---

## Use Case 1: Select existing agent run from left running panel

### Goal

Switch the active center conversation to a selected agent run using left panel only.

### Preconditions

- At least one running agent run exists.
- Left running panel is visible.

### Expected Outcome

- Selection store points to chosen agent run.
- Center panel renders only that instance's event monitor.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/running/RunningAgentRunRow.vue:@click -> $emit('select', agentId)
├── components/workspace/running/RunningAgentGroup.vue:@select -> $emit('select', agentId)
├── components/workspace/running/RunningAgentsPanel.vue:selectAgentRun(runId)
│   └── stores/agentSelectionStore.ts:selectRun(runId, 'agent') [STATE]
├── stores/agentContextsStore.ts:activeRun() [STATE]
│   ├── read stores/agentSelectionStore.selectedType [STATE]
│   └── read stores/agentContextsStore.instances.get(selectedRunId) [STATE]
└── components/workspace/agent/AgentWorkspaceView.vue:selectedAgent(computed) [STATE]
    └── render components/workspace/agent/AgentEventMonitor.vue with selected instance
```

### Branching / Fallback Paths

```text
[FALLBACK] selectedType is not 'agent' or selectedRunId is null
stores/agentContextsStore.ts:activeRun()
└── return undefined -> AgentWorkspaceView empty state
```

### State And Data Transformations

- `agentSelectionStore.selectedRunId: prev -> clickedId`
- `agentSelectionStore.selectedType: prev -> 'agent'`

### Observability And Debug Points

- Visible row highlight updates in left running panel.
- Header and conversation body update in center panel.

### Design Smells / Gaps

- None.

### Open Questions

- None.

---

## Use Case 2: Create new agent run from left group action

### Goal

Create a new agent run from the left panel and immediately show it in center view.

### Preconditions

- Agent definition group exists in running panel.

### Expected Outcome

- New temporary agent context is created.
- New instance becomes selected and rendered in center.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/running/RunningAgentGroup.vue:@click(create) -> $emit('create', definitionId)
├── components/workspace/running/RunningAgentsPanel.vue:createAgentRun(definitionId)
│   ├── stores/agentRunConfigStore.ts:setAgentConfig(...) [STATE]
│   ├── stores/agentSelectionStore.ts:clearSelection() [STATE]
│   └── stores/agentContextsStore.ts:createRunFromTemplate()
│       ├── create temp AgentContext + AgentRunState [STATE]
│       ├── stores/agentContextsStore.instances.set(tempId, context) [STATE]
│       └── stores/agentSelectionStore.ts:selectRun(tempId, 'agent') [STATE]
└── components/workspace/agent/AgentWorkspaceView.vue:selectedAgent(computed)
    └── render new empty conversation monitor
```

### Branching / Fallback Paths

```text
[ERROR] no run config template available
stores/agentContextsStore.ts:createRunFromTemplate()
└── throw Error('No run config template available')
```

### State And Data Transformations

- New `instances` map entry inserted.
- Selection moves to newly created temporary instance.

### Observability And Debug Points

- New instance row appears under corresponding agent group.
- Center header shows `New - <agentName>`.

### Design Smells / Gaps

- None.

### Open Questions

- None.

---

## Use Case 3: Remove selected agent run and auto-select fallback

### Goal

Stop/remove an agent run from left panel and keep center view consistent.

### Preconditions

- Instance exists.

### Expected Outcome

- Instance unsubscribed and removed locally.
- If removed instance was selected, another instance auto-selected, else empty state.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/running/RunningAgentRunRow.vue:@click(delete) -> $emit('delete', agentId)
├── components/workspace/running/RunningAgentsPanel.vue:deleteAgentRun(runId)
│   └── [ASYNC] stores/agentRunStore.ts:closeAgent(runId, { terminate: true })
│       ├── get context via stores/agentContextsStore.ts:getRun(runId) [STATE]
│       ├── disconnect/unsubscribe streaming service if subscribed [STATE]
│       ├── stores/agentContextsStore.ts:removeRun(runId)
│       │   ├── stores/agentContextsStore.instances.delete(runId) [STATE]
│       │   ├── if removed selected: select first remaining instance [STATE]
│       │   └── else clearSelection() when none remain [STATE]
│       └── [IO] GraphQL TerminateAgentRun mutation for non-temp IDs
└── components/workspace/agent/AgentWorkspaceView.vue:selectedAgent(computed)
    └── render fallback selected instance or empty state
```

### Branching / Fallback Paths

```text
[FALLBACK] removed instance was not selected
stores/agentContextsStore.ts:removeRun(runId)
└── selection unchanged
```

```text
[ERROR] backend terminate call fails
stores/agentRunStore.ts:closeAgent(...)
└── error logged; local removal already applied
```

### State And Data Transformations

- `instances` map entry removed.
- Selection may move to first remaining key, or become null.

### Observability And Debug Points

- Removed row disappears from left panel.
- Center view switches to fallback instance or placeholder.

### Design Smells / Gaps

- None.

### Open Questions

- None.

---

## Use Case 4: Select existing team run from left running panel

### Goal

Switch center to currently selected team context without center tabs.

### Preconditions

- At least one team run exists.

### Expected Outcome

- Team selection updates and team event monitor renders focused member flow.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/running/RunningTeamRow.vue:handleTeamClick()
├── emit('select', teamId)
├── components/workspace/running/RunningTeamGroup.vue:@select -> $emit('select', teamId)
├── components/workspace/running/RunningAgentsPanel.vue:selectTeamRun(runId)
│   └── stores/agentSelectionStore.ts:selectRun(runId, 'team') [STATE]
├── stores/agentTeamContextsStore.ts:activeTeamContext() [STATE]
└── components/workspace/team/TeamWorkspaceView.vue:activeTeamContext(computed)
    └── render components/workspace/team/AgentTeamEventMonitor.vue
```

### Branching / Fallback Paths

```text
[FALLBACK] no team selected
stores/agentTeamContextsStore.ts:activeTeamContext()
└── return null -> TeamWorkspaceView empty-state block
```

### State And Data Transformations

- `agentSelectionStore.selectedType: prev -> 'team'`
- `agentSelectionStore.selectedRunId: prev -> teamId`

### Observability And Debug Points

- Selected team row highlighted.
- Team header and member conversation update in center.

### Design Smells / Gaps

- None.

### Open Questions

- None.

---

## Use Case 5: Left panel collapsed; reopen required to switch

### Goal

Keep switching model simple: no hidden in-center switching; user reopens left panel to switch instances.

### Preconditions

- Running panel collapsed.

### Expected Outcome

- No center tabs are available.
- User reopens running panel and then selects target instance.

### Primary Runtime Call Stack

```text
[ENTRY] components/Sidebar.vue:handleWorkspaceClick(event)
├── read stores/workspaceLeftPanelLayoutStore.ts:panels.running.isOpen [STATE]
├── condition: running panel closed
└── stores/workspaceLeftPanelLayoutStore.ts:openPanel('running') [STATE]
    # user then performs Use Case 1 or Use Case 4 for switching
```

### Branching / Fallback Paths

```text
[FALLBACK] not on /workspace route
components/Sidebar.vue:handleWorkspaceClick(event)
└── return (normal navigation)
```

### State And Data Transformations

- `panels.running.isOpen: false -> true`

### Observability And Debug Points

- Left running panel becomes visible.
- Instance switch UI remains single-surface (left panel only).

### Design Smells / Gaps

- None.

### Open Questions

- None.
