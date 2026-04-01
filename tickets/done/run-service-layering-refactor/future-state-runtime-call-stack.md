# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/run-service-layering-refactor/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/run-service-layering-refactor/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`, `DS-004`
  - Ownership sections: `Ownership Map`, `Ownership-Driven Dependency Rules`, `Concrete Design Example`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001`, `DS-004` | `Primary End-to-End` | `ChannelBindingRunLauncher` | `Requirement` | `R-001`, `R-002`, `R-005` | `N/A` | Agent binding reuses an owned live run through the service boundary | `Yes/No/Yes` |
| `UC-002` | `DS-001`, `DS-004` | `Primary End-to-End` | `ChannelBindingRunLauncher` | `Requirement` | `R-002`, `R-003`, `R-004`, `R-005` | `N/A` | Agent binding restores or creates through `AgentRunService` | `Yes/Yes/Yes` |
| `UC-003` | `DS-002`, `DS-004` | `Primary End-to-End` | `ChannelBindingRunLauncher` | `Requirement` | `R-005`, `R-006`, `R-007` | `N/A` | Team binding resolves through `TeamRunService` helpers | `Yes/Yes/Yes` |
| `UC-004` | `DS-003`, `DS-004` | `Primary End-to-End` | `AcceptedReceiptRecoveryRuntime` | `Requirement` | `R-001`, `R-002`, `R-006` | `N/A` | Accepted-receipt recovery resolves runs through services | `Yes/No/Yes` |

## Transition Notes

- No temporary compatibility layer is planned.
- The migration is direct: add service APIs first, switch higher-level callers to those APIs, remove manager bypasses and launcher-owned persistence logic in the same change.

## Use Case: UC-001 [Agent binding reuses an owned live run through the service boundary]

### Spine Context

- Spine ID(s): `DS-001`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ChannelBindingRunLauncher`
- Why This Use Case Matters To This Spine:
  - It preserves the existing binding-owned local reuse rule while removing direct `AgentRunManager` access from the launcher.

### Goal

Return the cached agent run id only when the binding owns that live run in the current process.

### Preconditions

- Binding target type is `AGENT`.
- Binding has `agentRunId`.
- Binding live-run registry claims ownership for that binding/run pair.

### Expected Outcome

- The same run id is returned.
- No restore is attempted.
- No fresh create is attempted.
- No duplicate metadata/history write occurs in the launcher.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts:dispatchToAgentBinding(...)
└── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartAgentRun(...) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:normalizeAgentLaunchTarget(...) [STATE]
    ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:bindingRunRegistry.ownsAgentRun(...) [STATE]
    └── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:getAgentRun(...) [STATE]
        └── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:getActiveRun(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if binding target is invalid
autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:normalizeAgentLaunchTarget(...)
└── throw Error("Only AGENT bindings can auto-start runtimes.")
```

### State And Data Transformations

- Binding record -> normalized agent launch target
- Cached `agentRunId` + binding-owned registry check -> service-level active-run lookup

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Agent binding restores or creates through `AgentRunService`]

### Spine Context

- Spine ID(s): `DS-001`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ChannelBindingRunLauncher`
- Why This Use Case Matters To This Spine:
  - This is the current architectural break. The target flow removes launcher-owned create duplication and keeps lifecycle ownership in `AgentRunService`.

### Goal

When an agent binding cannot reuse a currently owned live run, restore the persisted run id if possible; otherwise create a fresh run through the service boundary and persist the replacement run id back to the binding.

### Preconditions

- Binding target type is `AGENT`.
- Binding may or may not contain a cached `agentRunId`.

### Expected Outcome

- Restore path uses `AgentRunService.restoreAgentRun(...)`.
- Fresh create path uses `AgentRunService.createAgentRun(..., { initialSummary, initialLastKnownStatus })`.
- `AgentRunService` owns metadata/history writes.
- Launcher persists the final bound run id via `ChannelBindingService`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts:dispatchToAgentBinding(...)
└── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartAgentRun(...) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:normalizeAgentLaunchTarget(...) [STATE]
    ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:restoreAgentRun(...) [ASYNC]
    │   ├── autobyteus-server-ts/src/run-history/services/agent-run-metadata-service.ts:readMetadata(...) [IO]
    │   ├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:ensureWorkspaceByRootPath(...) [IO]
    │   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:restoreAgentRun(...) [ASYNC]
    │   ├── autobyteus-server-ts/src/run-history/services/agent-run-metadata-service.ts:writeMetadata(...) [IO]
    │   └── autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts:recordRunRestored(...) [IO]
    └── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBindingAgentRunId(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if restore fails
autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartAgentRun(...)
├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:createAgentRun(..., { initialSummary, initialLastKnownStatus: "ACTIVE" }) [ASYNC]
│   ├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:ensureWorkspaceByRootPath(...) [IO]
│   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:createAgentRun(...) [ASYNC]
│   ├── autobyteus-server-ts/src/run-history/services/agent-run-metadata-service.ts:writeMetadata(...) [IO]
│   └── autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts:recordRunCreated(...) [IO]
└── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBindingAgentRunId(...) [IO]
```

```text
[ERROR] if create fails
autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:createAgentRun(...)
└── throw Error(...)
```

### State And Data Transformations

- Binding launch preset -> `CreateAgentRunInput`
- `initialSummary` -> history summary input
- initial lifecycle state -> authoritative metadata/history rows written by service

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Team binding resolves through `TeamRunService` helpers]

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `ChannelBindingRunLauncher`
- Why This Use Case Matters To This Spine:
  - Team is already closer to the intended boundary; the future-state model consolidates repeated active-or-restore logic into the team service rather than adding manager bypasses.

### Goal

Resolve an existing or restored team run through `TeamRunService`, or create a fresh one if the cached run cannot be reused.

### Preconditions

- Binding target type is `TEAM`.

### Expected Outcome

- Launcher stays on `TeamRunService`.
- Service-owned helper resolves active-or-restored team runs.
- Fresh create remains service-owned.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts:dispatchToTeamBinding(...)
└── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartTeamRun(...) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:normalizeTeamLaunchTarget(...) [STATE]
    ├── autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:bindingRunRegistry.ownsTeamRun(...) [STATE]
    ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:getTeamRun(...) [STATE]
    └── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBindingTeamRunId(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if cached run is not locally reusable
autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartTeamRun(...)
├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:resolveTeamRun(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:getTeamRun(...) [STATE]
│   └── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:restoreTeamRun(...) [ASYNC]
└── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBindingTeamRunId(...) [IO]
```

```text
[FALLBACK] if team restore fails
autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts:resolveOrStartTeamRun(...)
├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:buildMemberConfigsFromLaunchPreset(...) [ASYNC]
├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:createTeamRun(...) [ASYNC]
└── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:upsertBindingTeamRunId(...) [IO]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Accepted-receipt recovery resolves runs through services]

### Spine Context

- Spine ID(s): `DS-003`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AcceptedReceiptRecoveryRuntime`
- Why This Use Case Matters To This Spine:
  - Recovery code currently repeats the same agent manager/service split. The target shape makes the service boundary authoritative here too.

### Goal

Resolve a usable agent or team run handle for accepted-receipt recovery through service APIs rather than manager bypasses.

### Preconditions

- Receipt references an `agentRunId` or `teamRunId`.

### Expected Outcome

- Agent recovery uses `AgentRunService.resolveAgentRun(...)` or equivalent service-owned active-or-restore behavior.
- Team recovery uses `TeamRunService.resolveTeamRun(...)`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:processReceipt(...) [ASYNC]
└── autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:tryStartLiveObservation(...) [ASYNC]
    ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:resolveAgentRun(...) [ASYNC]
    │   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:getAgentRun(...) [STATE]
    │   └── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:restoreAgentRun(...) [ASYNC]
    └── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:resolveTeamRun(...) [ASYNC]
        ├── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:getTeamRun(...) [STATE]
        └── autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:restoreTeamRun(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] if no run can be resolved
autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:tryStartLiveObservation(...)
└── schedule retry without direct manager fallback
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
