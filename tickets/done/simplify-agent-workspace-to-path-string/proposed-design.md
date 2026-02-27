# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined runtime contract migration from workspace object to workspace root path string and server integration updates. | 1 |
| v2 | Re-entry requirement expansion | Added complete `BaseAgentWorkspace` removal plan and standalone server workspace class design. | 1 (v2) |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/simplify-agent-workspace-to-path-string/investigation-notes.md`
- Requirements: `tickets/in-progress/simplify-agent-workspace-to-path-string/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Replace runtime-facing workspace object usage with a plain `workspaceRootPath: string | null` contract across `autobyteus-ts` core runtime and server run-construction paths. Keep server workspace subsystem object model (`workspaceId`, `WorkspaceManager`, `FileSystemWorkspace`) intact at API/workspace lifecycle boundaries.

## Goals

1. Remove runtime dependency on `BaseAgentWorkspace` in active execution path.
2. Preserve tool relative-path and terminal cwd behavior via root-path-string resolution.
3. Preserve server path-safety processors and GraphQL active-run workspace visibility.
4. Preserve workspace subsystem behavior for file explorer/static/terminal APIs.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove runtime `workspace` object contract from config/state/context and remove workspace context injection bootstrap behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| FR-001 | Core runtime types store `workspaceRootPath` only | AC-001 | No runtime `BaseAgentWorkspace` in config/state/context | UC-001, UC-004 |
| FR-002 | Remove runtime workspace object dependency | AC-001 | Remove `instanceof`, `setContext`, runtime object-only helpers | UC-001 |
| FR-003 | Tool path/cwd semantics preserved | AC-002 | Relative/absolute path behavior unchanged | UC-002, UC-003 |
| FR-004 | Server resolves root path before runtime config construction | AC-003 | Run managers pass root path string, preserve temp fallback | UC-001, UC-004 |
| FR-005 | Preserve preprocessor path security | AC-004 | Sanitization/normalization safety retained | UC-002 |
| FR-006 | Active run GraphQL workspace visibility preserved | AC-005 | `AgentRun.workspace` still populated | UC-005 |
| FR-007 | Workspace subsystem unchanged at API boundaries | AC-006 | `workspaceId` behavior unchanged for explorer/static/terminal | UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Runtime starts from `AgentRunManager` / `AgentTeamRunManager` into `AgentConfig` and `AgentFactory`; tools and processors consume context workspace. | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`, `autobyteus-ts/src/agent/factory/agent-factory.ts`, `autobyteus-ts/src/tools/*` | None blocking |
| Current Naming Conventions | Runtime context/state/config fields use `workspace`; run history and GraphQL already use `workspaceRootPath`. | `autobyteus-ts/src/agent/context/*`, `autobyteus-server-ts/src/run-history/*` | Keep `workspaceRootPath` consistently |
| Impacted Modules / Responsibilities | Core runtime contract, tool path resolution, processors, run managers, GraphQL converter are directly impacted. | investigation-notes source list | None blocking |
| Data / Persistence / External IO | Run history already persists root paths; workspace manager still owns workspace object lifecycle. | `run-history/services/*`, `workspaces/workspace-manager.ts` | None blocking |

## Current State (As-Is)

- `AgentConfig.workspace`, `AgentRuntimeState.workspace`, `AgentContext.workspace` are object-based (`BaseAgentWorkspace | null`).
- Workspace bootstrap step injects context into workspace via `setContext`.
- Tools and server processors call `workspace.getBasePath()` and some use `FileSystemWorkspace` checks.
- GraphQL active run converter reads runtime context workspace object and calls `WorkspaceConverter`.

## Target State (To-Be)

- Runtime contract fields become `workspaceRootPath: string | null` only.
- Workspace bootstrap step becomes a no-op compatibility-free removal path (no context injection).
- Tools and processors resolve relative paths against `context.workspaceRootPath`.
- Run managers resolve workspace objects to root path strings before constructing runtime config.
- Active run GraphQL workspace payload is derived from runtime custom data/root path snapshot instead of runtime workspace object.

## Architecture Direction Decision (Mandatory)

- Chosen direction: keep server workspace subsystem unchanged; replace runtime workspace object boundary with string-only contract.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): reduces runtime coupling and test surface while retaining existing workspace lifecycle infrastructure where it is still required.
- Layering fitness assessment (are current layering and interactions still coherent?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Remove` runtime object dependency + `Modify` integration boundaries.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-ts/src/agent/context/{agent-config,agent-runtime-state,agent-context}.ts` | same | Switch runtime contract to `workspaceRootPath` | Core runtime | No compatibility shim |
| C-002 | Remove | `autobyteus-ts/src/agent/bootstrap-steps/workspace-context-initialization-step.ts` logic | same | Remove `setContext` runtime dependency | Core bootstrap | Keep step as no-op success |
| C-003 | Modify | `autobyteus-ts/src/tools/file/*`, `tools/terminal/*`, `tools/multimedia/*` | same | Resolve relative paths from root string | Tool runtime | Preserve errors |
| C-004 | Modify | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | same | Resolve `workspaceRootPath` before runtime config | Server runtime integration | Preserve temp fallback |
| C-005 | Modify | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | same | Resolve member root paths before runtime config | Team runtime integration | Preserve `workspaceId` inputs |
| C-006 | Modify | `autobyteus-server-ts/src/agent-customization/processors/**/*workspace*` | same | Convert processor workspace checks to root-path logic | Security/prompt/media processors | Preserve traversal checks |
| C-007 | Modify | `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts` | same | Preserve workspace payload without runtime workspace object | GraphQL active run | Use custom-data snapshot |
| C-008 | Modify | tests in `autobyteus-ts/tests` + server processor tests | same | Align tests with string-root contract | Quality gate | Preserve behavior verification |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Core Runtime (`autobyteus-ts`) | Agent execution model and tool execution context | `workspaceRootPath` runtime contract only | Workspace object lifecycle, `workspaceId` resolution | Decoupled from workspace subsystem |
| Server Runtime Integration (`autobyteus-server-ts` run managers) | Resolve workspace identity to runtime-ready config | `workspaceId -> root path` translation | Core tool path logic | Boundary adapter layer |
| Workspace Subsystem (`workspaces/*`) | Workspace object lifecycle and API operations | workspace creation, explorer, static serving, ws terminal | Core runtime context model | Intentionally unchanged |
| GraphQL Active Run Projection | Render run info to API payload | workspace snapshot projection | Runtime workspace object dependency | Uses custom-data/root-path snapshot |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-config.ts` | Modify | Core Runtime | runtime config contract | `AgentConfig` ctor/copy | in: root path string, out: config object | none |
| `agent-runtime-state.ts` | Modify | Core Runtime | runtime mutable state | `AgentRuntimeState` ctor | in: root path, out: state | none |
| `agent-context.ts` | Modify | Core Runtime | runtime context accessors | `workspaceRootPath` getter | out: root path | state |
| `workspace-context-initialization-step.ts` | Remove/Modify | Core Runtime | remove workspace object injection | `execute` | no-op | none |
| `agent-run-manager.ts` | Modify | Server Integration | runtime config build | `createAgentRun`, `restoreAgentRun` | in: workspaceId, out: root path string | workspace manager |
| `agent-team-run-manager.ts` | Modify | Server Integration | team member runtime config build | `buildAgentConfigFromDefinition` | in: member workspaceId, out: root path | workspace manager |
| `agent-run-converter.ts` | Modify | GraphQL Projection | active run workspace projection | `toGraphql` | in: agent context/customData, out: `WorkspaceInfo` | workspace manager optional |

## Layer-Appropriate Separation Of Concerns Check

- Non-UI scope check: runtime modules own only runtime concerns; workspace manager remains server integration concern.
- Integration scope check: run managers become explicit boundary translators from IDs to root paths.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API | `workspace` (runtime context/config/state field) | `workspaceRootPath` | Explicitly represents runtime need and avoids object semantics ambiguity | Applied in core runtime + tool context types |
| API | `resolveWorkingDirectory(workspaceId)` in codex service path | no immediate rename | Method semantics still runtime working-directory resolution | Input may shift to root path in this ticket if touched |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| Runtime context workspace field | root-path-only behavior after migration | No | Rename to `workspaceRootPath` | C-001 |
| Workspace subsystem classes | object lifecycle + API workspace operations | Yes | N/A | N/A |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep runtime workspace object in core for convenience | High | Shift translation to server integration boundary, keep core string-only | Change | Aligns runtime boundary to actual usage |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Accept `string | BaseAgentWorkspace` union in runtime fields | High | Hard replace to string-only contract and update all callers | Reject shortcut | Required by no-backward-compat policy |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `agent-context.ts` | `agent-runtime-state.ts` | tools/processors | Medium | Update typed accessor once; migrate all context consumers together |
| server processors | `AgentContext` type + filesystem/path utilities | prompt/media/security behavior | Medium | Add shared root-path resolver helpers where needed |
| GraphQL converter | runtime context + workspace payload type | frontend active-run panel | Medium | Keep payload contract stable using snapshot data |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `API Resolver -> Runtime Composition/Run Manager -> Core Runtime` and `Processors -> Runtime Context (string root only) -> path/file utils`.
- Temporary boundary violations and cleanup deadline: none planned.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| runtime `workspace` field usage | replace with `workspaceRootPath`, remove object type imports | no compatibility unions | `rg -n "context\.workspace|workspace:\s*BaseAgentWorkspace"` on touched packages |
| bootstrap `setContext` path | remove logic and logging references | no fallback to object injection | targeted bootstrap/runtime tests |

## Error Handling And Edge Cases

1. Relative path without root path must continue to error with clear message.
2. Invalid/missing workspace resolution in run manager still falls back to temp workspace root path.
3. Processors handling absolute paths must preserve traversal checks and skip unsafe paths.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | FR-001, FR-002, FR-004 | Single agent run creation with root-path runtime contract | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-001 |
| UC-002 | FR-003, FR-005 | File/media tool relative-path execution | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-002 |
| UC-003 | FR-003 | Terminal cwd selection from root path | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-003 |
| UC-004 | FR-001, FR-004 | Team member run config root-path mapping | Yes | Yes | Yes | `future-state-runtime-call-stack.md` UC-004 |
| UC-005 | FR-006, FR-007 | Active run workspace GraphQL continuity | Yes | N/A | Yes | `future-state-runtime-call-stack.md` UC-005 |

## Performance / Security Considerations

- No new IO layers are introduced; runtime path resolution remains O(1) string/path operations.
- Security-sensitive processors continue canonicalization + within-root checks.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | P-001, P-002 | Unit + integration + AV-001/AV-002 | Planned |
| C-002 | P-003 | Unit | Planned |
| C-003 | P-004 | Unit/integration + AV-003/AV-004 | Planned |
| C-004 | P-005 | Unit/integration + AV-005 | Planned |
| C-005 | P-006 | Unit/integration + AV-006 | Planned |
| C-006 | P-007 | Unit/integration + AV-007/AV-008 | Planned |
| C-007 | P-008 | API/E2E + AV-009 | Planned |
| C-008 | P-009 | Stage 6/7 verification suite | Planned |

## Open Questions

1. Whether codex runtime adapter input should also accept `workspaceRootPath` directly in this same ticket or stay `workspaceId`-derived at composition layer.

## Re-Entry Design Delta (v2)

### Additional Goals

1. Remove `BaseAgentWorkspace` class and export from `autobyteus-ts`.
2. Refactor `FileSystemWorkspace` to a standalone class that owns `workspaceId`, `rootPath`, and current file-explorer lifecycle APIs without inheritance.
3. Keep `WorkspaceConfig` utility unchanged for this ticket to avoid unrelated migration risk.

### v2 Change Inventory Addendum

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-009 | Remove | `autobyteus-ts/src/agent/workspace/base-workspace.ts` | deleted | Remove legacy base abstraction entirely | `autobyteus-ts` exports/source | no compatibility shim |
| C-010 | Modify | `autobyteus-ts/src/agent/workspace/index.ts` | same | Stop exporting `BaseAgentWorkspace` | public API cleanup | `WorkspaceConfig` export retained |
| C-011 | Modify | `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | same | Replace inheritance with standalone class | workspace subsystem | preserve methods/behavior |
| C-012 | Modify | `autobyteus-server-ts/src/workspaces/{skill-workspace.ts,temp-workspace.ts}` | same | Extend new standalone workspace class | workspace subsystem | preserve IDs and names |
| C-013 | Modify | `autobyteus-ts/examples/*` and affected tests | same | Remove demo/test inheritance usage | examples/tests | switch to root-path usage |

### Open Questions (v2)

- None blocking. `WorkspaceConfig` relocation/deletion is intentionally deferred to avoid scope creep.
