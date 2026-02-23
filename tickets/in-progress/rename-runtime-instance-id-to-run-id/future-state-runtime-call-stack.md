# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(...)`
- Boundary tags used: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[IO]`, `[FALLBACK]`, `[ERROR]`
- Legacy compatibility branches are intentionally excluded.

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v4`
- Requirements: `tickets/in-progress/rename-runtime-instance-id-to-run-id/requirements.md` (`Refined`)
- Source Artifact: `tickets/in-progress/rename-runtime-instance-id-to-run-id/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - `Requirements And Use Cases`
  - `Change Inventory (Delta)`
  - `Use-Case Coverage Matrix (Design Gate)`

## Future-State Modeling Rule (Mandatory)

These call stacks model target-state naming/flow behavior (`Run` semantics), not legacy `Instance` naming.

## Use Case Index (Stable IDs)

| use_case_id | Requirement | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- |
| UC-001 | R-001,R-005 | Single-agent run create/continue | Yes/Yes/Yes |
| UC-002 | R-002,R-005 | Team run create/continue | Yes/Yes/Yes |
| UC-003 | R-001,R-002,R-003 | GraphQL query/terminate active runs | Yes/N/A/Yes |
| UC-004 | R-001,R-002,R-005 | Run/team restoration from history | Yes/Yes/Yes |
| UC-005 | R-004,R-006 | Frontend runtime orchestration with renamed operations | Yes/Yes/Yes |
| UC-006 | R-007,R-008 | Memory runtime index/view run ID alignment | Yes/Yes/Yes |
| UC-007 | R-009 | Runtime module/path rename propagation | Yes/N/A/Yes |
| UC-008 | R-010 | Frontend runtime internal naming alignment | Yes/Yes/Yes |

## Transition Notes

- API symbol rename is breaking and should be released atomically for server and frontend runtime clients.
- Memory GraphQL rename (`listAgentMemorySnapshots`/`getAgentMemoryView`) is also breaking and must ship atomically with frontend memory queries/stores.
- Runtime module/path rename is included for active manager/graphql/frontend runtime document files and is expected to be behavior-neutral.
- Application-domain `instance` naming is intentionally out-of-scope for this call-stack version.

## Use Case: UC-001 Single-Agent Run Create/Continue

### Goal

Start a new agent run or continue an existing run using `Run` runtime APIs.

### Preconditions

- Agent definition exists.
- Frontend sends continue/new-run request through run-named GraphQL flow.

### Expected Outcome

- A run ID is created or resumed.
- User message is posted to runtime.
- Run history is persisted/updated.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run.ts:sendAgentUserInput(input)
└── [ASYNC] autobyteus-server-ts/src/run-history/services/run-continuation-service.ts:continueRun(input)
    ├── decision: input.runId exists?
    ├── [FALLBACK no] autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:createAgentRun(config)
    │   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:buildAgentConfig(config)
    │   └── [STATE] runtime manager registers active agent in memory
    ├── [IO] autobyteus-server-ts/src/run-history/store/run-manifest-store.ts:writeManifest(runId, manifest)
    ├── [IO] autobyteus-server-ts/src/run-history/services/run-history-service.ts:upsertRunHistoryRow(...)
    └── autobyteus-server-ts/src/agent-execution/runtime-agent.ts:postUserMessage(userMessage)
```

### Branching / Fallback Paths

```text
[FALLBACK] Existing active run
autobyteus-server-ts/src/run-history/services/run-continuation-service.ts:continueExistingRun(runId,input)
├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:getAgentRun(runId)
└── autobyteus-server-ts/src/agent-execution/runtime-agent.ts:postUserMessage(userMessage)
```

```text
[ERROR] Definition/config invalid during creation
autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:buildAgentConfig(config)
└── throws AgentCreationError -> mapped by resolver to failure result
```

### State And Data Transformations

- GraphQL `SendAgentUserInputInput` -> `ContinueRunInput`.
- Runtime config -> `RunManifest`.
- User input -> runtime agent user message object.

### Observability And Debug Points

- Manager lifecycle logs on create/restore/terminate.
- Run-history updates on activity/termination.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` in target state after module rename.

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 Runtime Module/Path Rename Propagation

### Goal

Ensure runtime module path renames from `*instance*` to `*run*` are fully propagated across server/frontend production imports, tests, and docs.

### Preconditions

- Target runtime modules have been moved to run-named file paths.

### Expected Outcome

- No active production import path points to runtime `*instance*` modules.
- Runtime manager/GraphQL/frontend runtime document module names are run-aligned.

### Primary Runtime Call Stack

```text
[ENTRY] build/import resolution
├── autobyteus-server-ts/src/api/graphql/schema.ts imports ./types/agent-run.ts and ./types/agent-team-run.ts
├── runtime services import agent-run-manager.ts / agent-team-run-manager.ts
├── autobyteus-web runtime stores import graphql/queries/agentRunQueries.ts and graphql/mutations/agentTeamRunMutations.ts
└── tests/docs reference new run-named module paths
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] Stale import path after move
module resolution/typecheck/test failure points to old *instance* path
```

### State And Data Transformations

- None (rename/move only; import path updates).

### Observability And Debug Points

- ripgrep scans for stale runtime `agent-instance` / `agent-team-instance` import paths.
- targeted tests validating runtime flows after move.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` after propagation.

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 Frontend Runtime Internal Naming Alignment

### Goal

Align frontend runtime selection/context/component/event contracts to run semantics for agent/team flows.

### Preconditions

- Backend and frontend runtime GraphQL modules are already run-named.
- Application-domain `instance` flow is out-of-scope.

### Expected Outcome

- Selection store uses `selectedRunId` and `selectRun(...)`.
- Runtime context stores use run APIs (`createRunFromTemplate`, `removeRun`, `runsByDefinition`, `activeRun`).
- Runtime components/events use run naming (`run-selected`, `run-created`) with `runId` payload key.
- Runtime row component path/name uses run terminology (`RunningRunRow.vue`).

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/running/RunningAgentsPanel.vue
├── [STATE] reads selectionStore.selectedRunId
├── [ASYNC] emits run-selected{type,runId} / run-created{type,definitionId}
└── autobyteus-web/stores/agentSelectionStore.ts:selectRun(runId,type)

[ENTRY] autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:onSelectRun(...)
├── [ASYNC] autobyteus-web/stores/runHistoryStore.ts:selectTreeRun(...)
└── [ASYNC] emits run-selected{type,runId}

[ENTRY] autobyteus-web/components/workspace/config/RunConfigPanel.vue
├── autobyteus-web/stores/agentContextsStore.ts:createRunFromTemplate()
└── autobyteus-web/stores/agentTeamContextsStore.ts:createRunFromTemplate()
```

### Branching / Fallback Paths

```text
[FALLBACK] Team selection and focused-member routing
selectionStore.selectRun(teamId,'team') + teamContextsStore.setFocusedMember(memberName)
```

```text
[ERROR] Partial rename on event contract
parent-child component mismatch causes missing handler execution/tests to fail
```

### State And Data Transformations

- Selection state key: `selectedInstanceId` -> `selectedRunId`.
- Event payload key: `instanceId` -> `runId`.
- Context API verbs: `create/remove/select instance` -> `create/remove/select run`.

### Observability And Debug Points

- Runtime panel/component tests for emitted events and payload keys.
- Store tests for selection and context lifecycle methods.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` after alignment.

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 Memory Runtime Index/View Run ID Alignment

### Goal

Expose and consume memory runtime entries by `runId` so memory APIs no longer use runtime `agentId` naming.

### Preconditions

- Memory folders are stored under `memory/agents/<runId>/...`.
- Frontend and backend are deployed with the same GraphQL memory contract version.

### Expected Outcome

- Backend GraphQL exposes `listRunMemorySnapshots` and `getRunMemoryView(runId)`.
- Memory summary/view payloads expose `runId`.
- Frontend memory selection state and query variables use `runId`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/memory-index.ts:listRunMemorySnapshots(search,page,pageSize)
├── autobyteus-server-ts/src/agent-memory-view/services/agent-memory-index-service.ts:listSnapshots(...)
│   ├── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:listRunDirs()
│   └── [STATE] build summary objects keyed by runId
└── autobyteus-server-ts/src/api/graphql/converters/memory-index-converter.ts:toGraphql(...)

[ENTRY] autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getRunMemoryView(runId,...)
├── autobyteus-server-ts/src/agent-memory-view/services/agent-memory-view-service.ts:getRunMemoryView(runId,...)
│   ├── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:readWorkingContextSnapshot(runId)
│   ├── autobyteus-server-ts/src/agent-memory-view/store/memory-file-store.ts:readRawTracesActive(runId)
│   └── [STATE] compose memory view payload with runId
└── autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts:toGraphql(...)

[ENTRY] autobyteus-web/stores/agentMemoryViewStore.ts:setSelectedRunId(runId)
└── [IO] autobyteus-web/graphql/queries/agentMemoryViewQueries.ts:GetRunMemoryView($runId)
```

### Branching / Fallback Paths

```text
[FALLBACK] Manual run ID load in memory panel
autobyteus-web/components/memory/MemoryIndexPanel.vue:submitManualRunId()
└── store selects runId not present in current index page
```

```text
[ERROR] Backend/frontend GraphQL mismatch after rename
frontend query requests listRunMemorySnapshots/getRunMemoryView
└── GraphQL validation error if backend still serves old operation names
```

### State And Data Transformations

- Filesystem directory names -> memory snapshot entries (`runId`).
- GraphQL args `runId` -> service/store reader runId.
- Frontend selection state `selectedRunId` -> memory query variable `$runId`.

### Observability And Debug Points

- Memory resolver/store logs for file read and decode failures.
- Frontend store error state when GraphQL query fails.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` after memory run ID rename.

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Team Run Create/Continue

### Goal

Start or continue a team run using `AgentTeamRunManager` and run-named GraphQL operations.

### Preconditions

- Team definition and member agent definitions exist.

### Expected Outcome

- Team run created/restored.
- Member-targeted or coordinator-targeted message delivered.
- Team run history updated.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:createAgentTeamRun(input)
├── autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:resolveRuntimeMemberConfigs(...)
├── [ASYNC] autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRunWithId(...)
│   └── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRunInternal(...)
├── [IO] autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:upsertTeamRunHistoryRow(...)
└── returns CreateAgentTeamRunResult(teamId)
```

### Branching / Fallback Paths

```text
[FALLBACK] Continue existing team run
autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(input)
└── autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRun(input)
    ├── decision: getTeamRun(teamId) exists?
    └── [FALLBACK no] restoreTeamRuntime(teamId) -> createTeamRunWithId(...)
```

```text
[ERROR] Team restore mismatch or missing manifest
autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:restoreTeamRuntime(teamId)
└── throws -> safeTerminate rollback path executed
```

### State And Data Transformations

- GraphQL member input -> `TeamRuntimeMemberConfig[]`.
- Team definition/member overrides -> runtime team config graph.
- Message payload -> team postMessage input.

### Observability And Debug Points

- Team manager logs create/restore failures.
- Team history service writes status/summary updates.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` in target state after module rename.

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Query/Terminate Active Runs via GraphQL

### Goal

Expose active run lists/details and termination operations with run naming.

### Preconditions

- Runtime managers track active runs.

### Expected Outcome

- Query returns run-typed objects.
- Termination updates runtime and history state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run.ts:agentRuns()
├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:listActiveRuns()
├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:getAgentRun(runId)
└── autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts:toGraphql(agent)
```

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts:agentTeamRuns()
├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:listActiveRuns()
├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:getTeamRun(teamId)
└── autobyteus-server-ts/src/api/graphql/converters/agent-team-run-converter.ts:toGraphql(team)
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] terminate called with unknown id
autobyteus-server-ts/src/api/graphql/types/agent-run.ts:terminateAgentRun(id)
└── returns success=false with not found message
```

### State And Data Transformations

- Domain runtime entities -> GraphQL `AgentRun` / `AgentTeamRun` payloads.

### Observability And Debug Points

- Resolver error logs for failed query/terminate.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` at API level.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Restore Run/Team From History

### Goal

Restore inactive runtime from manifest/history using run managers.

### Preconditions

- Valid run/team manifest exists on disk.

### Expected Outcome

- Runtime is recreated with prior manifest config.
- Message execution continues from restored runtime.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/run-history/services/run-continuation-service.ts:continueExistingRun(runId,input)
├── [IO] run-manifest-store.ts:readManifest(runId)
├── [ASYNC] agent-run-manager.ts:restoreAgentRun({...agentId: runId})
├── [STATE] runtime manager re-registers run in memory
└── [IO] run-history-service.ts:upsertRunHistoryRow(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] Team continuation
autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRun(input)
├── [IO] team-run-history-service.ts:getTeamRunResumeConfig(teamId)
└── [ASYNC] agent-team-run-manager.ts:createTeamRunWithId(teamId,...)
```

```text
[ERROR] Manifest missing/corrupt
run-continuation-service.ts:continueExistingRun(...)
└── throw error; caller returns failure payload
```

### State And Data Transformations

- Stored manifest JSON -> runtime config input.
- Optional override inputs -> effective runtime config.

### Observability And Debug Points

- warning logs for restore or history update failures.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No`.
- Naming-to-responsibility drift detected: `No` for runtime APIs.

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 Frontend Runtime Orchestration Against Renamed Operations

### Goal

Frontend runtime stores/components call run-named GraphQL operations and render run state.

### Preconditions

- Frontend GraphQL docs and generated types match backend schema.

### Expected Outcome

- Runtime actions invoke `TerminateAgentRun`, `CreateAgentTeamRun`, `TerminateAgentTeamRun`, `GetAgentRuns`.
- Component typings compile against run query result types.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/agentRunStore.ts:terminateActiveAgent()
└── [IO] autobyteus-web/graphql/mutations/agentMutations.ts:TerminateAgentRun

[ENTRY] autobyteus-web/stores/agentTeamRunStore.ts:terminateTeamRun(teamId)
└── [IO] autobyteus-web/graphql/mutations/agentTeamRunMutations.ts:TerminateAgentTeamRun

[ENTRY] autobyteus-web/components/agents/RunningAgentCard.vue
└── [STATE] uses GetAgentRunsQuery result shape
```

### Branching / Fallback Paths

```text
[FALLBACK] Temporary local IDs before backend promotion
stores promote `temp-*` IDs to backend permanent run/team IDs after first successful send
```

```text
[ERROR] Schema/client mismatch (stale codegen endpoint)
GraphQL operation missing in generated schema -> compile/codegen failure
```

### State And Data Transformations

- UI action -> GraphQL mutation variables.
- Temporary local IDs -> permanent run/team IDs after successful mutation response.

### Observability And Debug Points

- Store-level console error logging for failed mutation requests.

### Design Smells / Gaps

- Legacy/backward-compat branch present: `No` in intended runtime APIs.
- Naming-to-responsibility drift detected: `No` in store API names.

### Open Questions

- Ensure schema endpoint used by codegen is updated to run-named operations.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
