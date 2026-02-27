# Investigation Notes

- Ticket: `simplify-agent-workspace-to-path-string`
- Stage: `1` (Investigation + Triage)
- Date: `2026-02-27`

## Sources Consulted

Local source files reviewed:
- `autobyteus-ts/src/agent/context/agent-config.ts`
- `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- `autobyteus-ts/src/agent/context/agent-context.ts`
- `autobyteus-ts/src/agent/bootstrap-steps/workspace-context-initialization-step.ts`
- `autobyteus-ts/src/agent/workspace/base-workspace.ts`
- `autobyteus-ts/src/tools/file/{read-file.ts,write-file.ts,edit-file.ts}`
- `autobyteus-ts/src/tools/terminal/tools/{run-bash.ts,start-background-process.ts}`
- `autobyteus-ts/src/tools/multimedia/{audio-tools.ts,image-tools.ts,media-reader-tool.ts,download-media-tool.ts}`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `autobyteus-server-ts/src/agent-customization/processors/{security-processor/workspace-path-sanitization-processor.ts,prompt/user-input-context-building-processor.ts,prompt/prompt-context-builder.ts,tool-invocation/media-input-path-normalization-preprocessor.ts,tool-result/media-tool-result-url-transformer-processor.ts}`
- `autobyteus-server-ts/src/runtime-execution/{runtime-adapter-port.ts,adapters/autobyteus-runtime-adapter.ts,adapters/codex-app-server-runtime-adapter.ts,codex-app-server/codex-app-server-runtime-service.ts}`
- `autobyteus-server-ts/src/workspaces/{filesystem-workspace.ts,workspace-manager.ts,temp-workspace.ts,skill-workspace.ts}`
- `autobyteus-server-ts/src/api/graphql/{converters/agent-run-converter.ts,types/agent-run.ts,types/agent-team-run.ts,types/workspace.ts}`
- `autobyteus-server-ts/src/api/{rest/workspaces.ts,websocket/file-explorer.ts,websocket/terminal.ts}`

Codebase queries executed:
- `rg -n "BaseAgentWorkspace|WorkspaceConfig|workspace|getBasePath" autobyteus-ts/src autobyteus-server-ts/src`
- `rg -n "extends BaseAgentWorkspace" autobyteus-ts autobyteus-server-ts`
- `rg -n "instanceof FileSystemWorkspace|instanceof BaseAgentWorkspace" autobyteus-ts/src autobyteus-server-ts/src`
- `rg -n "BaseAgentWorkspace|WorkspaceConfig|workspace.getBasePath" autobyteus-ts/tests autobyteus-server-ts/tests`

## Current-State Understanding

1. Core runtime workspace model is object-based
- `AgentConfig.workspace`, `AgentRuntimeState.workspace`, `AgentContext.workspace` are typed as `BaseAgentWorkspace | null`.
- `AgentRuntimeState` enforces `instanceof BaseAgentWorkspace` at runtime.
- Bootstrap step attempts `workspace.setContext(context)`.

2. Core runtime usage mostly needs a path
- File/terminal/multimedia tools only require `workspace.getBasePath()` for relative path resolution / cwd.
- No core runtime behavior depends on `workspaceId`, `config`, or polymorphic workspace subclasses.

3. Server runtime creation currently passes workspace objects into core
- `AgentRunManager` and `AgentTeamRunManager` resolve `workspaceId -> FileSystemWorkspace` and pass object to `new AgentConfig(..., workspace, ...)`.

4. Server-side path/security preprocessors are coupled to `FileSystemWorkspace`
- Several processors use `instanceof FileSystemWorkspace` and/or `.rootPath` / `.getAbsolutePath`.
- These must be rewritten to consume a workspace root path string while preserving boundary checks.

5. Server workspace subsystem has independent responsibilities
- `FileSystemWorkspace` + `WorkspaceManager` handle workspace IDs, explorer, watcher, search, static file serving, terminal ws attach.
- This subsystem should remain object-based.

6. API boundary already has path concepts
- Run history/manifests rely on `workspaceRootPath` as persisted canonical value.
- Runtime adapter input still uses `workspaceId`; codex runtime resolves working directory from ID.

7. GraphQL active run workspace exposure risk
- `AgentRunConverter` currently reads `domainAgent.context.workspace` and converts via `WorkspaceConverter`.
- If runtime context becomes path-string-only, this path will break unless remapped.

## Boundary + Dependency Mapping

Core library refactor boundary:
- Replace `BaseAgentWorkspace` runtime contract with `workspaceRootPath: string | null`.
- Remove runtime dependence on `autobyteus-ts/src/agent/workspace/*` for active execution paths.

Server integration boundary:
- Keep `workspaceId` at GraphQL/REST/WebSocket entrypoints.
- Resolve `workspaceId -> root path` before constructing core `AgentConfig`.
- Keep server workspace manager/object model unchanged for file explorer/terminal/static content.

## Scope Triage

- Scope classification: `Large`
- Rationale:
  - Cross-package API changes (`autobyteus-ts` + `autobyteus-server-ts`).
  - Runtime type/signature changes in central context/config/state classes.
  - Multiple processors/tools/tests/examples require synchronized updates.
  - GraphQL run workspace representation must be redesigned to avoid regressions.

## Key Risks

1. Active-run GraphQL workspace info regression
- Current converter assumes workspace object in runtime context.

2. Security regression in path normalization/sanitization
- Replacing `FileSystemWorkspace.getAbsolutePath` use requires explicit path-boundary checks.

3. Public API breakage in `autobyteus-ts`
- Removing workspace classes/exports can break tests/examples and external consumers.

4. Runtime creation flow divergence
- Both autobyteus and codex runtime adapters use `workspaceId`; core now needs root path only.

## Open Unknowns / Decisions Needed in Design Stage

1. Whether `WorkspaceConfig` remains exported from `autobyteus-ts` only for server workspace subsystem use, or is moved to server package.
2. Exact replacement shape for `AgentRunConverter` workspace payload generation when active runtime context no longer holds workspace object.
3. Final naming contract in core (`workspaceRootPath` vs `workspacePath`) and whether any helper accessor is needed.


## Re-Entry Investigation Update (v2: Base Workspace Removal)

### Additional Sources Consulted

- `autobyteus-ts/src/agent/workspace/base-workspace.ts`
- `autobyteus-ts/src/agent/workspace/index.ts`
- `autobyteus-server-ts/src/workspaces/{filesystem-workspace.ts,workspace-manager.ts,skill-workspace.ts,temp-workspace.ts}`
- `autobyteus-server-ts/src/api/graphql/{types/workspace.ts,converters/workspace-converter.ts}`
- `autobyteus-ts/examples/*` (workspace subclass examples)
- `autobyteus-ts/tests/unit/agent/workspace/base-workspace.test.ts`

### v2 Findings

1. `BaseAgentWorkspace` is now legacy-only.
- Active runtime contract no longer requires workspace objects.
- Remaining inheritance usage is concentrated in `FileSystemWorkspace` and example wrappers.

2. Server workspace subsystem can operate without inheritance.
- `FileSystemWorkspace` needs only: `workspaceId`, `rootPath`, `config`, `getBasePath`, `getName`, and file explorer/search lifecycle.
- `WorkspaceManager` dedupe depends on `workspace.config.equals(config)`; this can remain if `config` is retained directly on `FileSystemWorkspace`.

3. Removal blast radius is moderate and contained.
- Source impact: `autobyteus-ts` workspace exports + server workspace classes + examples.
- Tests impacted mainly in workspace unit/integration and example compile paths.

### Scope Triage Update

- Scope classification remains `Large`.
- Reason: cross-package API/export removal with server workspace class refactor and multi-suite verification.

### v2 Open Decisions Closed

1. `BaseAgentWorkspace` removal path: remove class and export, do not keep shim.
2. `WorkspaceConfig` handling: keep current `WorkspaceConfig` utility for now to minimize unrelated drift; remove inheritance only.
3. `FileSystemWorkspace` design: standalone class retaining current public behavior/shape used by server APIs/tests.
