# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY]` `[ASYNC]` `[STATE]` `[IO]` `[FALLBACK]` `[ERROR]`

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/frontend-agent-team-memory-visibility/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/frontend-agent-team-memory-visibility/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Target State (To-Be)`
  - `Change Inventory`
  - `Use-Case Coverage Matrix`

## Future-State Modeling Rule (Mandatory)

- This models the target behavior after team-memory contracts and frontend dual-scope state are implemented.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001,R-002 | N/A | Open Memory page in default Agent scope and inspect agent run memory | Yes/N/A/Yes |
| UC-002 | Requirement | R-001,R-003,R-007 | N/A | Switch to Team scope and load paged team/member memory index | Yes/Yes/Yes |
| UC-003 | Requirement | R-004,R-005,R-007 | N/A | Select team member run and inspect member memory tabs | Yes/Yes/Yes |
| UC-004 | Requirement | R-005,R-006 | N/A | Switch scope with in-flight requests and prevent mixed stale data | Yes/Yes/Yes |
| UC-005 | Design-Risk | R-006,R-008 | Ensure additive team-memory contracts do not regress existing agent memory APIs | Verify existing APIs remain stable under new additions | Yes/N/A/Yes |

## Transition Notes

- No temporary compatibility layer planned. Team memory is added as explicit new query surface.

## Use Case: UC-001 [Default Agent Scope Inspection]

### Goal

User opens `/memory`, default scope is Agent, and agent run memory is inspected as before.

### Preconditions

- Memory page mounted.
- Agent memory index/view queries available.

### Expected Outcome

- Agent index list loaded.
- Selected agent run shows working/episodic/semantic/raw tabs in inspector.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/pages/memory.vue:onMounted()
├── autobyteus-web/stores/memoryScopeStore.ts:initializeDefaultScope() [STATE]
├── autobyteus-web/stores/agentMemoryIndexStore.ts:fetchIndex() [ASYNC]
│   ├── autobyteus-web/graphql/queries/agentMemoryIndexQueries.ts:LIST_RUN_MEMORY_SNAPSHOTS
│   └── autobyteus-server-ts/src/api/graphql/types/memory-index.ts:listRunMemorySnapshots(...) [IO]
│       ├── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:listRunDirs() [IO]
│       └── autobyteus-server-ts/src/agent-memory-view/services/agent-memory-index-service.ts:listSnapshots()
└── autobyteus-web/components/memory/MemoryIndexPanel.vue:selectAgentRun(runId)
    └── autobyteus-web/stores/agentMemoryViewStore.ts:setSelectedRunId(runId) [STATE]
        └── autobyteus-web/stores/agentMemoryViewStore.ts:fetchMemoryView(runId) [ASYNC]
            ├── autobyteus-web/graphql/queries/agentMemoryViewQueries.ts:GET_RUN_MEMORY_VIEW
            └── autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getRunMemoryView(...) [IO]
                └── autobyteus-server-ts/src/agent-memory-view/services/agent-memory-view-service.ts:getRunMemoryView(...)
```

### Branching / Fallback Paths

```text
[ERROR] if agent memory fetch fails
autobyteus-web/stores/agentMemoryViewStore.ts:fetchMemoryView(...)
└── [STATE] set viewStore.error; keep previous viewStore.memoryView
```

### State And Data Transformations

- GraphQL agent snapshot page -> `agentMemoryIndexStore.entries`.
- GraphQL memory view payload -> `agentMemoryViewStore.memoryView` -> inspector tab props.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Team Scope Index Load]

### Goal

User switches to Team scope and loads paginated team/member memory index.

### Preconditions

- Team-memory index query exists.

### Expected Outcome

- Team list and member rows appear in left panel.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/memory/MemoryIndexPanel.vue:onScopeChange("team")
├── autobyteus-web/stores/memoryScopeStore.ts:setScope("team") [STATE]
├── autobyteus-web/stores/agentMemoryViewStore.ts:clearSelection() [STATE]
└── autobyteus-web/stores/teamMemoryIndexStore.ts:fetchIndex() [ASYNC]
    ├── autobyteus-web/graphql/queries/teamMemoryQueries.ts:LIST_TEAM_RUN_MEMORY_SNAPSHOTS
    └── autobyteus-server-ts/src/api/graphql/types/memory-index.ts:listTeamRunMemorySnapshots(...) [IO]
        └── autobyteus-server-ts/src/agent-memory-view/services/team-memory-index-service.ts:listTeamSnapshots(...) [ASYNC]
            ├── autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts:listTeamRunIds() [IO]
            ├── autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts:readManifest(teamRunId) [IO]
            └── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:getFileInfo(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if team run has no member bindings
team-memory-index-service.ts:listTeamSnapshots(...)
└── include team row with empty members array
```

```text
[ERROR] if team index fetch fails
teamMemoryIndexStore.ts:fetchIndex(...)
└── [STATE] set teamMemoryIndexStore.error; keep prior entries
```

### State And Data Transformations

- Team manifest + per-member file info -> paged `teamMemoryIndexStore.entries`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Team Member Memory Inspection]

### Goal

User selects a team member run and inspects full memory tabs for that member run.

### Preconditions

- Team index loaded and member row selected.

### Expected Outcome

- Inspector header shows team/member/run context.
- Tabs show member run working/episodic/semantic/raw data.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/memory/MemoryIndexPanel.vue:selectTeamMember(teamRunId, memberRunId, memberRouteKey)
└── autobyteus-web/stores/teamMemoryViewStore.ts:setSelectedMember(...) [STATE]
    └── autobyteus-web/stores/teamMemoryViewStore.ts:fetchMemoryView(...) [ASYNC]
        ├── autobyteus-web/graphql/queries/teamMemoryQueries.ts:GET_TEAM_MEMBER_RUN_MEMORY_VIEW
        └── autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getTeamMemberRunMemoryView(...) [IO]
            ├── autobyteus-server-ts/src/run-history/store/team-member-memory-layout-store.ts:getTeamDirPath(teamRunId)
            ├── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:constructor(teamDir,{runRootSubdir:""})
            └── autobyteus-server-ts/src/agent-memory-view/services/agent-memory-view-service.ts:getRunMemoryView(memberRunId,...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if selected member has empty memory files
agent-memory-view-service.ts:getRunMemoryView(...)
└── returns null/empty sections; inspector renders "not available" / empty messages
```

```text
[ERROR] if selected team/member directory is invalid or missing
memory-view.ts:getTeamMemberRunMemoryView(...)
└── throws -> teamMemoryViewStore.error [STATE], previous team memoryView retained
```

### State And Data Transformations

- Selection tuple -> GraphQL variables -> `RunMemoryView` shaped payload for existing tabs.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Scope Switch Consistency And Stale Guard]

### Goal

Switching scopes during requests does not render stale data from the old scope.

### Preconditions

- Agent or team fetch in flight.

### Expected Outcome

- Outdated responses ignored.
- New scope state and header are consistent.

### Primary Runtime Call Stack

```text
[ENTRY] MemoryIndexPanel.vue:onScopeChange(nextScope)
├── memoryScopeStore.ts:setScope(nextScope) [STATE]
├── agentMemoryViewStore.ts:incrementRequestIdOnNewFetch() [STATE]
├── teamMemoryViewStore.ts:incrementRequestIdOnNewFetch() [STATE]
└── MemoryInspector.vue:computeHeaderFromScopeAndSelection() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if old-scope fetch resolves late
agentMemoryViewStore.ts:fetchMemoryView(...)
└── requestId mismatch -> ignore payload
```

```text
[ERROR] if both scope fetches fail sequentially
scope-specific stores set independent errors; inspector continues to render selected-scope error banner
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 [Regression Safety For Existing Memory APIs]

### Goal

Ensure additive team-memory API changes do not break existing agent memory API behavior.

### Preconditions

- Agent memory APIs already in production use.

### Expected Outcome

- `listRunMemorySnapshots` and `getRunMemoryView` responses remain unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] existing frontend and test callers -> memory-index.ts:listRunMemorySnapshots(...)
[ENTRY] existing frontend and test callers -> memory-view.ts:getRunMemoryView(...)
└── unchanged service/store path (MemoryFileStore default runRootSubdir = "agents")
```

### Branching / Fallback Paths

```text
[ERROR] accidental schema/type drift
unit and API tests fail on legacy query shape expectations
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
