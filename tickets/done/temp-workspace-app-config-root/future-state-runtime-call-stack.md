# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/temp-workspace-app-config-root/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/in-progress/temp-workspace-app-config-root/implementation-plan.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Selected Design-Ready Direction`
  - `Solution Sketch`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- No compatibility branch is retained for the old OS-temp-root default.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002 | N/A | Resolve default temp workspace root under active app data dir | Yes/No/Yes |
| UC-002 | Requirement | R-003 | N/A | Preserve explicit temp workspace override behavior | Yes/Yes/Yes |
| UC-003 | Requirement | R-004 | N/A | Expose backend-selected temp workspace root through GraphQL | Yes/N/A/Yes |

## Transition Notes

- No migration logic is required in runtime path resolution.
- Previously created OS-temp folders may remain on disk, but future default resolution uses `<appDataDir>/temp_workspace`.

## Use Case: UC-001 [Resolve default temp workspace root under active app data dir]

### Goal

When no explicit temp workspace override is configured, backend temp workspace resolution uses the current server data directory as the default base.

### Preconditions

- Electron/server launcher has already selected an app data directory.
- `AUTOBYTEUS_TEMP_WORKSPACE_DIR` is unset or blank.

### Expected Outcome

- Backend creates/uses `<appDataDir>/temp_workspace`.
- Workspace consumers receive that same absolute path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/server/macOSServerManager.ts:launchServerProcess()
├── autobyteus-web/electron/server/services/AppDataService.ts:getAppDataDir() [STATE]
├── autobyteus-server-ts/src/app.ts:initializeConfig(options)
│   └── autobyteus-server-ts/src/config/app-config.ts:setCustomAppDataDir(customPath) [STATE]
├── autobyteus-server-ts/src/app.ts:startServer() [ASYNC]
│   └── autobyteus-server-ts/src/workspaces/workspace-manager.ts:getOrCreateTempWorkspace() [ASYNC]
│       ├── autobyteus-server-ts/src/config/app-config.ts:getTempWorkspaceDir()
│       │   ├── autobyteus-server-ts/src/config/app-config.ts:get("AUTOBYTEUS_TEMP_WORKSPACE_DIR")
│       │   └── path.join(this.dataDir, "temp_workspace") # default branch [STATE]
│       ├── fs.mkdirSync(tempWorkspaceDir, { recursive: true }) [IO]
│       └── autobyteus-server-ts/src/workspaces/temp-workspace.ts:constructor(rootPath) [STATE]
└── autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts:toGraphql(workspace)
    └── workspace.getBasePath() # exposes backend-selected absolute path [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if temp workspace directory cannot be created
autobyteus-server-ts/src/config/app-config.ts:getTempWorkspaceDir()
└── throw AppConfigError("Failed to create temp workspace directory: ...")
```

### State And Data Transformations

- `appDataDir` -> default temp workspace root:
  - `<appDataDir>` -> `<appDataDir>/temp_workspace`
- Workspace object -> GraphQL payload:
  - `TempWorkspace.rootPath` -> `WorkspaceInfo.absolutePath`

### Observability And Debug Points

- Logs emitted at:
  - server launch app data dir log
  - temp workspace creation log in `WorkspaceManager`
- Debug inspection:
  - GraphQL `workspaces.absolutePath`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Preserve explicit temp workspace override behavior]

### Goal

Keep explicit temp workspace override semantics unchanged while changing only the default branch.

### Preconditions

- `AUTOBYTEUS_TEMP_WORKSPACE_DIR` is configured.

### Expected Outcome

- Absolute override stays absolute.
- Relative override remains resolved relative to `appDataDir`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/config/app-config.ts:getTempWorkspaceDir()
├── autobyteus-server-ts/src/config/app-config.ts:get("AUTOBYTEUS_TEMP_WORKSPACE_DIR")
├── if override is absolute -> path.resolve(configuredPath.trim()) [STATE]
├── else -> path.resolve(this.dataDir, configuredPath.trim()) [STATE]
└── fs.mkdirSync(resolvedTempWorkspaceDir, { recursive: true }) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if override is unset or blank
autobyteus-server-ts/src/config/app-config.ts:getTempWorkspaceDir()
└── path.join(this.dataDir, "temp_workspace")
```

```text
[ERROR] if override path cannot be created
autobyteus-server-ts/src/config/app-config.ts:getTempWorkspaceDir()
└── throw AppConfigError(...)
```

### State And Data Transformations

- Relative override string -> absolute path under app data dir.
- Absolute override string -> normalized absolute override path.

### Observability And Debug Points

- Unit assertions on returned path string.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Expose backend-selected temp workspace root through GraphQL]

### Goal

Ensure frontend-visible workspace path stays a passive projection of backend workspace state.

### Preconditions

- Temp workspace has been created by `WorkspaceManager`.

### Expected Outcome

- `workspaces` GraphQL response returns `absolutePath` equal to backend temp workspace root.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts:execGraphql(...)
└── autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts:toGraphql(workspace)
    ├── workspace.getBasePath() [STATE]
    └── return { absolutePath, isTemp } [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if workspace conversion fails
autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts:toGraphql(workspace)
└── throw Error("Failed to convert Workspace to GraphQL type: ...")
```

### State And Data Transformations

- `TempWorkspace.rootPath` -> GraphQL `absolutePath`
- `TempWorkspace.workspaceId` -> GraphQL `isTemp=true`

### Observability And Debug Points

- GraphQL query result assertions.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
