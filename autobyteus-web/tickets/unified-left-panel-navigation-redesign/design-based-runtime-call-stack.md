# Design-Based Runtime Call Stacks (Debug-Trace Style)

Use this document as a design-derived runtime trace for the unified-left-panel redesign, iteration 2 (page-level sidebar removal).

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` user/UI entrypoint
  - `[ASYNC]` async boundary (`await`, route push, remote fetch)
  - `[STATE]` in-memory mutation
  - `[IO]` network/query/storage IO
  - `[FALLBACK]` alternative branch
  - `[ERROR]` error path
- No legacy/backward-compat branches.

## Design Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/unified-left-panel-navigation-redesign/proposed-design.md`
- Referenced Sections:
  - Requirements And Use Cases
  - Target State (To-Be)
  - Change Inventory (`C-009` to `C-022`)

## Use Case Index

- Use Case 1: Top-level app navigation from `AppLeftPanel`
- Use Case 2: Dedicated Agent Teams route from top-level navigation (`/agent-teams`)
- Use Case 3: Prompt Engineering section switching (Marketplace vs Drafts) without local sidebar
- Use Case 4: Tools section switching (Local Tools vs MCP Servers) without local sidebar
- Use Case 5: Memory index selection and inspection without navigation sidebar semantics
- Use Case 6: Select running instance from `AppLeftPanel` while outside `/workspace`
- Use Case 7: Select running instance while already in `/workspace`
- Use Case 8: Create new run from running section and land in config flow

---

## Use Case 1: Top-Level App Navigation From `AppLeftPanel`

### Goal

User changes top-level area from the single persistent left panel.

### Preconditions

- `/Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue` mounted.
- `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` visible.

### Expected Outcome

- Route changes to selected top-level destination.
- No additional page-level left sidebar is rendered by target page.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:navigateToPrimary(key)
├── /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:resolvePrimaryRoute(key)
├── [ASYNC] vue-router:router.push(route)
├── /Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue:watch(route.fullPath)
│   └── /Users/normy/autobyteus_org/autobyteus-web/stores/appLayoutStore.ts:closeMobileMenu() [STATE]
└── Nuxt page mount for destination route
```

### Branching / Fallback Paths

```text
[FALLBACK] Already on destination route
AppLeftPanel.vue:pushRoute(target)
└── router deduplicates transition / no meaningful state change
```

### State And Data Transformations

- Nav key -> canonical route target.
- Route path/query -> active state highlighting in `AppLeftPanel`.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 2: Dedicated Agent Teams Route From Top-Level Navigation

### Goal

User enters `Agent Teams` from top-level left navigation and sees team-only content.

### Preconditions

- Current route path is not `/agent-teams`.
- `AppLeftPanel` is visible.

### Expected Outcome

- Route becomes `/agent-teams?view=team-list`.
- Right content is team-only (`AgentTeamList` / team detail/create/edit).
- No same-level `Agents/Agent Teams` selector appears in right content.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:navigateToPrimary('agentTeams')
├── /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:resolvePrimaryRoute('agentTeams')
│   └── { path: '/agent-teams', query: { view: 'team-list' } }
├── [ASYNC] vue-router:router.push({ path: '/agent-teams', query: { view: 'team-list' } })
└── /Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue:currentView(computed)
    └── /Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamList.vue:render()
```

### Branching / Fallback Paths

```text
[FALLBACK] Invalid query view value
/Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue:currentView()
└── defaults to 'team-list'
```

### State And Data Transformations

- Top-level left nav key -> dedicated route path/query.
- Route query -> team-only content branch inside `/agent-teams`.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 3: Prompt Engineering Section Switching Without Local Sidebar

### Goal

User switches between marketplace and drafts inside prompt page content header.

### Preconditions

- Route is `/prompt-engineering`.
- Prompt page host owns section switching.

### Expected Outcome

- Prompt store transitions between section contexts without `PromptSidebar`.
- Content pane updates to marketplace/drafts/create/details views.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue:onSectionChange('marketplace')
├── /Users/normy/autobyteus_org/autobyteus-web/stores/promptEngineeringViewStore.ts:showMarketplace() [STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptMarketplace.vue:render()
```

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue:onSectionChange('drafts')
├── promptEngineeringViewStore.ts:showDraftsList() [STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/DraftsList.vue:render()
```

### Branching / Fallback Paths

```text
[FALLBACK] User opens prompt details from marketplace list
PromptMarketplace.vue:@select-prompt(promptId)
└── promptEngineeringViewStore.ts:showPromptDetails(promptId) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptDetails.vue:render()
```

### State And Data Transformations

- Section tab -> prompt store section context.
- Prompt id selection -> details view state.
- Draft edits -> localStorage persistence via store action.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 4: Tools Section Switching Without Local Sidebar

### Goal

User switches Local Tools and MCP Servers via content-header controls on tools page.

### Preconditions

- Route is `/tools`.
- `pages/tools.vue` owns `activeView` state.

### Expected Outcome

- Tools host swaps between local and MCP root views.
- Search/filter resets are deterministic on section switches.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue:onSectionChange('local-tools')
├── /Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue:handleNavigation('local-tools') [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/stores/toolManagementStore.ts:fetchLocalToolsGroupedByCategory() [ASYNC][IO]
└── /Users/normy/autobyteus_org/autobyteus-web/components/tools/ToolList.vue:render()
```

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue:onSectionChange('mcp-servers')
├── handleNavigation('mcp-servers') [STATE]
├── toolManagementStore.ts:fetchMcpServers() [ASYNC][IO]
└── /Users/normy/autobyteus_org/autobyteus-web/components/tools/McpServerList.vue:render()
```

### Branching / Fallback Paths

```text
[FALLBACK] Section switch from deep MCP subview (e.g., mcp-tools-<id>)
pages/tools.vue:onSectionChange('mcp-servers')
└── normalize active view to root 'mcp-servers'
```

### State And Data Transformations

- Section tab -> `activeView` root state.
- Root state -> selected tool list component branch.
- Switch action -> search/category reset.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 5: Memory Index Selection And Inspection Without Nav Sidebar Semantics

### Goal

User finds/selects agent memory from memory domain controls and inspects data in inspector pane.

### Preconditions

- Route is `/memory`.
- Memory page composes index panel + inspector as domain content regions.

### Expected Outcome

- Search/manual load/index selection still works.
- Inspector updates for selected agent.
- No page-level navigation sidebar pattern.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryIndexPanel.vue:applySearch()
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentMemoryIndexStore.ts:setSearch(query) [STATE]
└── agentMemoryIndexStore.ts:fetchIndex() [ASYNC][IO]
    └── /Users/normy/autobyteus_org/autobyteus-web/graphql/queries/agentMemoryIndexQueries.ts:LIST_AGENT_MEMORY_SNAPSHOTS
```

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryIndexPanel.vue:selectAgent(agentId)
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentMemoryViewStore.ts:setSelectedAgentId(agentId) [ASYNC][STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryInspector.vue:render(selectedAgentId)
```

### Branching / Fallback Paths

```text
[ERROR] index fetch failure
agentMemoryIndexStore.ts:fetchIndex()
└── set error message in store [STATE]
    └── MemoryIndexPanel.vue:renderError(error)
```

```text
[FALLBACK] manual agent id not in index
MemoryIndexPanel.vue:submitManualAgentId()
└── agentMemoryViewStore.ts:setSelectedAgentId(manualId)
    └── MemoryInspector.vue:headerSubtitle -> manual id context
```

### State And Data Transformations

- Search text -> query variables (`search`, `page`, `pageSize`).
- Selected agent id -> inspector tab data fetch/render path.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 6: Select Running Instance While Outside `/workspace`

### Goal

User selects running agent/team from global left panel and lands in workspace context.

### Preconditions

- Current route path is not `/workspace`.
- Running entries exist in `RunningAgentsPanel`.

### Expected Outcome

- Selection store updates.
- Host (`AppLeftPanel`) performs route transition to `/workspace`.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/RunningAgentsPanel.vue:selectAgentInstance(instanceId)
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentSelectionStore.ts:selectInstance(instanceId, 'agent') [STATE]
├── RunningAgentsPanel.vue:$emit('instance-selected', { type: 'agent', instanceId })
└── /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:onRunningInstanceSelected()
    ├── route.path !== '/workspace'
    └── [ASYNC] vue-router:router.push('/workspace')
```

### Branching / Fallback Paths

```text
[FALLBACK] team selection
RunningAgentsPanel.vue:selectTeamInstance(instanceId)
├── agentSelectionStore.ts:selectInstance(instanceId, 'team') [STATE]
└── emit('instance-selected', { type: 'team', instanceId })
```

### State And Data Transformations

- Selected row -> selection store context.
- Semantic emit -> host-level route decision.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 7: Select Running Instance While Already In `/workspace`

### Goal

Switch selected runtime context without redundant route pushes.

### Preconditions

- Current route path is `/workspace`.

### Expected Outcome

- Selection state updates only.
- Workspace main view changes by selection type.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/RunningAgentsPanel.vue:selectTeamInstance(instanceId)
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentSelectionStore.ts:selectInstance(instanceId, 'team') [STATE]
├── emit('instance-selected', { type: 'team', instanceId })
└── /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:onRunningInstanceSelected()
    └── route.path === '/workspace' -> no navigation
```

### Branching / Fallback Paths

```text
[FALLBACK] agent selected instead of team
same flow with selectAgentInstance(instanceId)
```

### State And Data Transformations

- Selection store mutation -> `WorkspaceDesktopLayout` branch (`AgentWorkspaceView` / `TeamWorkspaceView`).

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

---

## Use Case 8: Create New Run From Running Section

### Goal

User starts a new run from global running section and reaches config flow.

### Preconditions

- Definition exists.
- Running section visible in `AppLeftPanel`.

### Expected Outcome

- Run config/context state set.
- Host navigates to `/workspace` only when needed.
- Workspace shows `RunConfigPanel` if no selected running instance.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/RunningAgentsPanel.vue:createAgentInstance(definitionId)
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentRunConfigStore.ts:setTemplate(...) [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentSelectionStore.ts:clearSelection() [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/stores/agentContextsStore.ts:createInstanceFromTemplate() [STATE]
├── emit('instance-created', { type: 'agent', definitionId })
└── /Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue:onRunningInstanceCreated()
    ├── route.path !== '/workspace' -> [ASYNC] router.push('/workspace')
    └── /Users/normy/autobyteus_org/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue:resolveMainContentBranch()
        └── /Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/RunConfigPanel.vue:render()
```

### Branching / Fallback Paths

```text
[FALLBACK] team creation branch
RunningAgentsPanel.vue:createTeamInstance(definitionId)
├── teamRunConfigStore.ts:setTemplate(...) [STATE]
└── agentTeamContextsStore.ts:createInstanceFromTemplate() [STATE]
```

```text
[ERROR] definition not found
RunningAgentsPanel.vue:createAgentInstance(definitionId)
└── early return, no mutation
```

### State And Data Transformations

- Definition id -> config template -> new context instance.

### Design Smells / Gaps

- Legacy/backward compatibility branch present? `No`

## Use Case Validity Notes

- Invalidated older pattern: page-level secondary sidebars for section switching.
- Valid pattern in this iteration: one global left panel + in-content section controls per page host.
