# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/default-temp-workspace-run-config/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/default-temp-workspace-run-config/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`
  - Ownership sections: `File Placement Plan`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `WorkspaceResolver` | Requirement | R-001, R-002, R-003, R-004 | N/A | Guarantee temp workspace visibility from GraphQL workspace discovery | Yes/Yes/Yes |
| UC-002 | DS-001 | Primary End-to-End | `WorkspaceSelector` | Design-Risk | R-001, R-004 | remove startup-side-effect dependency from run-config defaulting | Consume backend-guaranteed temp workspace and auto-select it | Yes/N/A/N/A |

## Transition Notes

- No temporary migration logic is required.
- The old passive-listing behavior in `workspaces()` is replaced directly; no compatibility wrapper is retained.

## Use Case: UC-001 [Guarantee temp workspace visibility from GraphQL workspace discovery]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `WorkspaceResolver`
- Why This Use Case Matters To This Spine: new run configuration depends on workspace discovery returning `temp_ws_default` even when no prior startup side effect has activated it

### Goal

Return a workspace list that always includes the backend-managed temp workspace and its backend-selected path.

### Preconditions

- GraphQL schema is available
- workspace manager may or may not already have the temp workspace cached

### Expected Outcome

- `workspaces` GraphQL response includes `temp_ws_default`
- `absolutePath` matches backend temp-workspace path
- no frontend-only temp-workspace synthesis is required

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/workspace.ts:WorkspaceResolver.workspaces()
├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateTempWorkspace() [ASYNC]
│   ├── autobyteus-server-ts/src/config/app-config-provider.ts:appConfigProvider.config.getTempWorkspaceDir() [STATE]
│   ├── autobyteus-server-ts/src/workspaces/temp-workspace.ts:TempWorkspace.constructor(...) [STATE]
│   └── autobyteus-server-ts/src/workspaces/filesystem-workspace.ts:initialize() [IO]
├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:getAllWorkspaces() [STATE]
├── autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts:WorkspaceConverter.toGraphql(...) [ASYNC]
└── autobyteus-server-ts/src/api/graphql/types/workspace.ts:return graphqlWorkspaces [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if temp workspace is already active
autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateTempWorkspace()
└── return cached temp workspace [STATE]
```

```text
[ERROR] if temp workspace creation fails
autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateTempWorkspace()
└── autobyteus-server-ts/src/api/graphql/types/workspace.ts:throw new Error("Unable to fetch workspaces at this time.")
```

### State And Data Transformations

- active workspace cache -> guaranteed cache containing `temp_ws_default`
- backend workspace domain objects -> GraphQL `WorkspaceInfo[]`

### Observability And Debug Points

- Logs emitted at:
  - workspace creation/cached-return logging from `workspace-manager.ts`
  - resolver error logging in `workspace.ts`
- Metrics/counters updated at:
  - none
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Consume backend-guaranteed temp workspace and auto-select it]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `WorkspaceSelector`
- Why This Use Case Matters To This Spine: the frontend should continue using existing auto-select behavior once backend workspace discovery is authoritative

### Goal

Keep the selector on the existing backend-driven path instead of adding a separate temp-workspace fallback.

### Preconditions

- `workspaces` GraphQL query returns `temp_ws_default`
- new run config has no explicit `workspaceId`

### Expected Outcome

- workspace store exposes `tempWorkspaceId`
- selector emits `select-existing` for the temp workspace
- run config shows the existing workspace by default

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/config/WorkspaceSelector.vue:onMounted()
├── autobyteus-web/stores/workspace.ts:fetchAllWorkspaces() [ASYNC]
├── autobyteus-web/stores/workspace.ts:getter tempWorkspaceId [STATE]
├── autobyteus-web/components/workspace/config/WorkspaceSelector.vue:maybeAutoSelectDefaultWorkspace() [STATE]
└── autobyteus-web/components/workspace/config/RunConfigPanel.vue:handleSelectExisting(workspaceId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if temp workspace is already selected
autobyteus-web/components/workspace/config/WorkspaceSelector.vue:maybeAutoSelectDefaultWorkspace()
└── return false
```

### State And Data Transformations

- GraphQL workspace list -> `workspaceStore.workspaces`
- `workspaceStore.tempWorkspaceId` -> emitted selected workspace ID

### Observability And Debug Points

- Logs emitted at:
  - none in normal UI path
- Metrics/counters updated at:
  - none
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
