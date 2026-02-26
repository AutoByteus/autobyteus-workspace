# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `tickets/agent-teams-ui-redesign-implementation/proposed-design.md`
- Referenced Sections:
  - Change Inventory C-001..C-008

## Use Case Index

- Use Case 1: Render and search team list + run from card
- Use Case 2: Build team definition via drag-and-drop create flow
- Use Case 3: Edit team definition and persist avatar via backend
- Use Case 4: Render simplified team detail with avatars

## Use Case 1: Render and search team list + run from card

### Goal
Render teams in redesigned cards, filter by name, and run selected team.

### Preconditions
- Team definitions are available in store or fetched on mount.

### Expected Outcome
- Filtered teams render based on search query.
- Clicking `Run Team` prepares team run and navigates to `/workspace`.

### Primary Runtime Call Stack

```text
[ENTRY] pages/agents.vue:handleNavigation({ view: 'team-list' })
└── components/agentTeams/AgentTeamList.vue:onMounted()
    ├── stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions() [ASYNC][IO]
    ├── components/agentTeams/AgentTeamList.vue:filteredTeamDefinitions(computed) [STATE]
    ├── components/agentTeams/AgentTeamCard.vue:avatarUrl(computed)
    │   └── teamDef.avatarUrl [STATE]
    └── components/agentTeams/AgentTeamList.vue:handleRunTeam(teamDef)
        ├── composables/useRunActions.ts:prepareTeamRun(teamDef) [STATE]
        │   ├── stores/agentRunConfigStore.ts:clearConfig() [STATE]
        │   ├── stores/teamRunConfigStore.ts:setTemplate(teamDef) [STATE]
        │   └── stores/agentSelectionStore.ts:clearSelection() [STATE]
        └── vue-router:push('/workspace') [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions()
└── if backend not ready or query fails -> set error state [STATE]
```

```text
[ERROR] components/agentTeams/AgentTeamList.vue
└── error computed truthy -> render error panel instead of grid
```

### State And Data Transformations
- `agentTeamDefinitions[]` -> `filteredTeamDefinitions[]` by lowercase name match.

### Design Smells / Gaps
- None critical.

---

## Use Case 2: Build team definition via drag-and-drop create flow

### Goal
Create a team definition with minimal friction using library-to-canvas drag/drop.

### Preconditions
- Agent and team definitions are loaded for library panel.

### Expected Outcome
- User can add members, auto-name members, assign coordinator, submit valid payload.

### Primary Runtime Call Stack

```text
[ENTRY] components/agentTeams/AgentTeamCreate.vue:render(AgentTeamDefinitionForm)
└── components/agentTeams/AgentTeamDefinitionForm.vue:onMounted()
    ├── stores/agentDefinitionStore.ts:fetchAllAgentDefinitions() [ASYNC][IO]
    ├── stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions() [ASYNC][IO]
    ├── components/agentTeams/AgentTeamDefinitionForm.vue:handleLibraryDragStart(item)
    ├── components/agentTeams/AgentTeamDefinitionForm.vue:handleCanvasDrop(event)
    │   └── components/agentTeams/AgentTeamDefinitionForm.vue:addNodeFromLibrary(item) [STATE]
    │       ├── components/agentTeams/AgentTeamDefinitionForm.vue:buildUniqueMemberName(baseName) [STATE]
    │       └── formData.nodes.push(...) [STATE]
    ├── components/agentTeams/AgentTeamDefinitionForm.vue:toggleCoordinator(memberName) [STATE]
    ├── components/agentTeams/AgentTeamDefinitionForm.vue:handleAvatarFileSelected(event) [ASYNC][IO]
    │   └── stores/fileUploadStore.ts:uploadFile(file) [ASYNC][IO]
    └── components/agentTeams/AgentTeamDefinitionForm.vue:handleSubmit()
        ├── components/agentTeams/AgentTeamDefinitionForm.vue:validateForm() [STATE]
        └── emit('submit', payload)
            └── components/agentTeams/AgentTeamCreate.vue:handleCreate(formData)
                ├── stores/agentTeamDefinitionStore.ts:createAgentTeamDefinition(inputWithAvatarUrl) [ASYNC][IO]
                └── emit('navigate', { view: 'team-detail', id: newTeam.id })
```

### Branching / Fallback Paths

```text
[FALLBACK] components/agentTeams/AgentTeamDefinitionForm.vue:addNodeFromLibrary(item)
└── if member name already exists -> suffix `_2`, `_3` ... [STATE]
```

```text
[ERROR] stores/fileUploadStore.ts:uploadFile(file)
└── throw error -> form catches and renders avatar upload error text [STATE]
```

```text
[ERROR] stores/agentTeamDefinitionStore.ts:createAgentTeamDefinition(input)
└── mutation error -> create wrapper shows notification and stays on form [STATE]
```

### State And Data Transformations
- Drag payload `{id,name,type}` -> `TeamMemberInput` node.
- Form state -> mutation input (including `avatarUrl`).

### Design Smells / Gaps
- None critical.

---

## Use Case 3: Edit team definition and persist avatar via backend

### Goal
Edit team data with same builder UX and update avatar mapping.

### Preconditions
- Existing team id is present.

### Expected Outcome
- Existing team loads into builder.
- Save updates mutation including avatar URL.

### Primary Runtime Call Stack

```text
[ENTRY] components/agentTeams/AgentTeamEdit.vue:onMounted()
├── stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions() [ASYNC][IO]
└── components/agentTeams/AgentTeamDefinitionForm.vue:watch(initialData)
    ├── hydrate formData fields [STATE]
    └── render canvas/member details [STATE]

[ENTRY] components/agentTeams/AgentTeamEdit.vue:handleUpdate(formData)
├── stores/agentTeamDefinitionStore.ts:updateAgentTeamDefinition(inputWithAvatarUrl) [ASYNC][IO]
└── emit('navigate', { view: 'team-detail', id: teamId })
```

### Branching / Fallback Paths

```text
[FALLBACK] if avatar removed in edit
form payload sends empty `avatarUrl` -> backend normalizes to null [IO]
```

```text
[ERROR] update mutation fails
└── show error notification, remain on edit page
```

### Design Smells / Gaps
- None critical.

---

## Use Case 4: Render simplified team detail with avatars

### Goal
Show simplified detail with clear hierarchy and team/member identity.

### Preconditions
- Team and agent definitions loaded.

### Expected Outcome
- Header shows team avatar + metadata + actions.
- Member cards are concise and coordinator clearly marked.

### Primary Runtime Call Stack

```text
[ENTRY] components/agentTeams/AgentTeamDetail.vue:onMounted()
├── stores/agentTeamDefinitionStore.ts:fetchAllAgentTeamDefinitions() [ASYNC][IO]
├── stores/agentDefinitionStore.ts:fetchAllAgentDefinitions() [ASYNC][IO]
└── components/agentTeams/AgentTeamDetail.vue:teamDef(computed)
    ├── stores/agentTeamDefinitionStore.ts:getAgentTeamDefinitionById(teamId) [STATE]
    ├── teamDef.avatarUrl [STATE]
    └── components/agentTeams/AgentTeamDetail.vue:getBlueprintName(type,id)
        ├── stores/agentDefinitionStore.ts:getAgentDefinitionById(id)
        └── stores/agentTeamDefinitionStore.ts:getAgentTeamDefinitionById(id)
```

### Branching / Fallback Paths

```text
[FALLBACK] no team avatar URL
└── render initials badge from team name
```

```text
[ERROR] team id not found
└── render not-found panel with back-to-list action
```

### Design Smells / Gaps
- None critical.
