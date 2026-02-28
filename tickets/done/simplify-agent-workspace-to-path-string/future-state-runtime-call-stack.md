# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/simplify-agent-workspace-to-path-string/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/simplify-agent-workspace-to-path-string/proposed-design.md`
- Source Design Version: `v1`

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | FR-001, FR-002, FR-004 | N/A | Single Agent Run Creation With Root-Path Runtime Contract | Yes/Yes/Yes |
| UC-002 | Requirement | FR-003, FR-005 | N/A | File/Media Relative Path Execution With Root Path | Yes/Yes/Yes |
| UC-003 | Requirement | FR-003 | N/A | Terminal CWD Resolution From Root Path | Yes/Yes/Yes |
| UC-004 | Requirement | FR-001, FR-004 | N/A | Team Member Run Creation With Per-Member Root Path | Yes/Yes/Yes |
| UC-005 | Requirement | FR-006, FR-007 | N/A | Active Run GraphQL Workspace Projection Continuity | Yes/N/A/Yes |

## Transition Notes

- Existing runtime object field `workspace` is removed from core runtime contract.
- Server run managers continue receiving `workspaceId` externally and convert to root path before creating `AgentConfig`.

## Use Case: UC-001 Single Agent Run Creation With Root-Path Runtime Contract

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run.ts:sendAgentUserInput(...)
├── [ASYNC] autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts:createAgentRun(...)
│   └── autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts:createAgentRun(...)
│       └── [ASYNC] autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:createAgentRun(...)
│           ├── [ASYNC] agent-run-manager.ts:buildAgentConfig(...)
│           │   ├── [ASYNC] workspaces/workspace-manager.ts:getWorkspaceById(...) [IO]
│           │   ├── [FALLBACK] workspace-manager.ts:getOrCreateTempWorkspace(...) [IO]
│           │   └── agent-run-manager.ts:new AgentConfig(..., workspaceRootPath, ...)
│           ├── autobyteus-ts/src/agent/factory/agent-factory.ts:createAgent(...)
│           │   ├── autobyteus-ts/src/agent/context/agent-runtime-state.ts:constructor(agentId, workspaceRootPath,...)
│           │   └── autobyteus-ts/src/agent/context/agent-context.ts:constructor(...)
│           └── [STATE] Agent starts with context.workspaceRootPath persisted in runtime state
└── [ASYNC] runtime-command-ingress-service.ts:sendTurn(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if provided workspaceId is missing
agent-run-manager.ts:buildAgentConfig(...)
├── logger.warn(...workspace missing...)
└── [ASYNC] workspace-manager.ts:getOrCreateTempWorkspace(...)
```

```text
[ERROR] if agent definition is missing
agent-run-manager.ts:buildAgentConfig(...)
└── throws AgentCreationError -> GraphQL mutation returns failure payload
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 File/Media Relative Path Execution With Root Path

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(...)
├── autobyteus-ts/src/tools/file/read-file.ts:readFile(context, path,...)
│   ├── decision: path absolute?
│   ├── no -> resolve using context.workspaceRootPath
│   ├── [STATE] normalized path built by path.join(pathRoot, relativePath)
│   └── [IO] fs.readFile(...)
├── autobyteus-ts/src/tools/multimedia/image-tools.ts:getWorkspaceRoot(...)
│   └── resolveSafePath(output_file_path, context.workspaceRootPath)
└── autobyteus-server-ts/src/agent-customization/processors/tool-result/media-tool-result-url-transformer-processor.ts:process(...)
    ├── if relative artifact path -> join with context.workspaceRootPath
    └── [IO] MediaStorageService.storeMediaAndGetUrl(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] absolute path input
tool implementation skips root-path join and uses normalized absolute path directly
```

```text
[ERROR] relative path while workspaceRootPath is null
tool throws explicit validation error preserving prior semantics
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Terminal CWD Resolution From Root Path

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(context,...)
├── run-bash.ts:getCwd(context)
│   ├── if context.workspaceRootPath exists -> use it
│   └── else -> os.tmpdir()
├── [ASYNC] terminal-session-manager.ts:ensureStarted(cwd)
└── [ASYNC] terminal-session-manager.ts:executeCommand(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] no workspaceRootPath
cwd defaults to os.tmpdir()
```

```text
[ERROR] terminal command/runtime failure
terminal manager returns error output payload; caller propagates tool result failure
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 Team Member Run Creation With Per-Member Root Path

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRun(...)
├── [ASYNC] buildTeamConfigFromDefinition(...)
│   └── [ASYNC] buildAgentConfigFromDefinition(member,...)
│       ├── workspaceManager.getWorkspaceById(memberConfig.workspaceId)
│       ├── resolve workspaceRootPath from workspace.getBasePath()
│       └── new AgentConfig(..., workspaceRootPath,...)
├── autobyteus-ts/src/agent-team/factory/agent-team-factory.ts:createTeam(...)
└── [STATE] each member runtime has isolated workspaceRootPath string
```

### Branching / Fallback Paths

```text
[FALLBACK] member config has no workspaceId
workspaceRootPath remains null; runtime proceeds with non-workspace tools only
```

```text
[ERROR] missing member config for required team node
AgentTeamCreationError thrown and team run creation aborts
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 Active Run GraphQL Workspace Projection Continuity

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/agent-run.ts:agentRun / agentRuns
├── [ASYNC] agent-run-manager.ts:getAgentRun(...)
└── [ASYNC] api/graphql/converters/agent-run-converter.ts:toGraphql(domainAgent)
    ├── reads runtime customData workspace snapshot + context.workspaceRootPath
    ├── builds WorkspaceInfo payload fields (id, name, config, absolutePath, isTemp)
    └── returns AgentRun.workspace without runtime workspace object dependency
```

### Branching / Fallback Paths

```text
[FALLBACK] runtime has workspaceRootPath but no workspaceId snapshot
converter returns synthetic workspace info using normalized root path and derived display name
```

```text
[ERROR] malformed snapshot data
converter logs conversion error and throws GraphQL conversion failure
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Re-Entry Runtime Modeling Update (v2)

- Call Stack Version Addendum: `v2`
- Scope Addendum: remove `BaseAgentWorkspace` and keep workspace subsystem behavior via standalone classes.

### Use Case: UC-003 Server Workspace Lifecycle Without Base Inheritance

#### Primary Runtime Call Stack

```text
[ENTRY] api/graphql/types/workspace.ts:createWorkspace(...)
├── workspace-manager.ts:createWorkspace(config)
│   ├── workspace-manager.ts:findWorkspaceByConfig(config)
│   ├── new FileSystemWorkspace(config)   // standalone class, no BaseAgentWorkspace
│   ├── FileSystemWorkspace.initialize()
│   └── activeWorkspaces.set(workspace.workspaceId, workspace)
└── api/graphql/converters/workspace-converter.ts:toGraphql(workspace)
```

#### Branching / Fallback Paths

```text
[FALLBACK] existing workspace with same config/rootPath
workspace-manager.ts:createWorkspace(...) returns existing workspace
```

```text
[ERROR] missing/invalid rootPath
FileSystemWorkspace constructor throws and GraphQL mutation returns failure
```

### Use Case: UC-005 Legacy Removal Audit

#### Primary Runtime Call Stack

```text
[ENTRY] Stage 7 verification command
rg -n "BaseAgentWorkspace" autobyteus-ts/src autobyteus-server-ts/src autobyteus-ts/examples
└── expected result: no matches
```

#### Coverage Status

- UC-003 Primary/Fallback/Error: `Covered`
- UC-005 Primary: `Covered`
