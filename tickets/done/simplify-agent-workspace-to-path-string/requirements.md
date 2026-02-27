# Requirements

- Ticket: `simplify-agent-workspace-to-path-string`
- Status: `Design-ready`
- Last Updated: `2026-02-27`
- Scope: `Large`
- Compatibility Policy: `No backward compatibility for BaseAgentWorkspace and legacy workspace-object abstractions`

## Objective

Simplify workspace handling end-to-end by removing `BaseAgentWorkspace` legacy inheritance and keeping runtime/server behavior on explicit, concrete data (primarily workspace root path strings and server workspace services).

## Problem

The runtime migration already proved core execution only needs a workspace root path. Remaining inheritance on `BaseAgentWorkspace` in server workspace classes/examples adds legacy complexity without delivering runtime value.

## In Scope

1. Remove `BaseAgentWorkspace` usage and implementation from active source paths.
2. Refactor server workspace classes (`FileSystemWorkspace`, `SkillWorkspace`, `TempWorkspace`) to non-inheritance design while preserving API behavior.
3. Keep runtime/path-string contract and server integration behavior unchanged functionally.
4. Update tests/examples/docs impacted by the removal.

## Out of Scope

1. Removing server-side workspace subsystem (`WorkspaceManager`, file explorer, watcher, static serving, workspace REST/WS APIs).
2. Introducing backward-compatibility shims for removed `BaseAgentWorkspace`.

## Functional Requirements

### FR-001 Core Runtime Workspace Contract
Core runtime classes store workspace as `workspaceRootPath: string | null`.

### FR-002 Remove Base Workspace Runtime Dependency
Core runtime path must not require `BaseAgentWorkspace`, `instanceof BaseAgentWorkspace`, or workspace context injection semantics.

### FR-003 Tool Path/CWD Semantics
File/terminal/media tools continue resolving relative paths and cwd from `workspaceRootPath` with unchanged error semantics.

### FR-004 Server-to-Core Integration
Server run managers continue resolving `workspaceId -> workspaceRootPath` before constructing runtime agent config.

### FR-005 Preprocessor Path Security Preservation
Workspace-sensitive preprocessors preserve traversal protections and relative-path safety under root-path-string behavior.

### FR-006 Active Run Workspace Visibility
Active-run GraphQL mapping continues exposing workspace info.

### FR-007 Server Workspace Subsystem Preservation
Server workspace APIs and lifecycle remain functional and `workspaceId`-driven at API boundaries after `BaseAgentWorkspace` removal.

### FR-008 Remove BaseAgentWorkspace Completely
`BaseAgentWorkspace` is removed from active code paths, exports, and examples in this workspace.

## Non-Functional Requirements

### NFR-001 Deterministic Behavior
Path normalization and resolution remain deterministic across supported OS environments.

### NFR-002 Security Invariants
No new path traversal surface area is introduced.

### NFR-003 Build/Test Integrity
`autobyteus-ts` and `autobyteus-server-ts` compile and targeted suites pass.

## Use Cases

### UC-001 Single Agent Run Creation
Server resolves `workspaceId` to root path and core runtime executes with path-string workspace context.

### UC-002 Tool Relative Path Execution
File/terminal/media tools resolve relative paths/cwd against `workspaceRootPath`.

### UC-003 Server Workspace Lifecycle
Workspace creation/reuse/temp/skill flows work without `BaseAgentWorkspace` inheritance.

### UC-004 Active Run Workspace Query
GraphQL run query still returns workspace payload for active runs.

### UC-005 Legacy Removal Audit
Source audit confirms no `BaseAgentWorkspace` references remain in active source and examples.

## Acceptance Criteria

### AC-001 Core Contract Migration
Runtime config/context/state no longer use workspace objects.

### AC-002 Tool Contract Migration
Tool behavior remains correct with `workspaceRootPath`.

### AC-003 Server Runtime Wiring
Run managers pass root path strings to runtime.

### AC-004 Preprocessor Migration
Workspace-sensitive preprocessors remain safe and correct.

### AC-005 Active Run API Continuity
`AgentRun.workspace` remains available and populated where applicable.

### AC-006 Server Workspace API Continuity
Workspace REST/WS/GraphQL flows continue with `workspaceId` semantics.

### AC-007 Quality Gates
Targeted typecheck/tests for touched areas pass.

### AC-008 Legacy Base Workspace Removal
`BaseAgentWorkspace` has zero remaining references in active source and examples.

## Requirement Coverage Map

| Requirement | Acceptance Criteria | Primary Implementation Areas |
| --- | --- | --- |
| FR-001, FR-002 | AC-001 | `autobyteus-ts/src/agent/context/*`, `autobyteus-ts/src/agent/bootstrap-steps/*` |
| FR-003 | AC-002 | `autobyteus-ts/src/tools/{file,terminal,multimedia}/*` |
| FR-004 | AC-003 | `autobyteus-server-ts/src/agent-execution/services/*`, `autobyteus-server-ts/src/agent-team-execution/services/*` |
| FR-005 | AC-004 | `autobyteus-server-ts/src/agent-customization/processors/*workspace*` |
| FR-006 | AC-005 | `autobyteus-server-ts/src/api/graphql/converters/agent-run-converter.ts` |
| FR-007 | AC-006 | `autobyteus-server-ts/src/workspaces/*`, workspace API resolvers/websocket handlers |
| FR-008 | AC-008 | `autobyteus-ts/src/agent/workspace/*`, `autobyteus-server-ts/src/workspaces/*`, `autobyteus-ts/examples/*` |
| NFR-001..003 | AC-007 | Cross-cutting runtime/server test suites + build gates |

## Acceptance Criteria Coverage Map (Stage 7)

| Acceptance Criteria | Requirement(s) | Scenario ID(s) | Scenario Intent |
| --- | --- | --- | --- |
| AC-001 | FR-001, FR-002 | AV-001 | Runtime contract remains path-string-only. |
| AC-002 | FR-003 | AV-002 | Tool relative/absolute path and cwd behavior remain correct. |
| AC-003 | FR-004 | AV-003 | Run managers continue passing root paths into runtime. |
| AC-004 | FR-005 | AV-004 | Path security processors preserve sanitization/protections. |
| AC-005 | FR-006 | AV-005 | Active run GraphQL workspace projection remains populated. |
| AC-006 | FR-007 | AV-006 | Workspace subsystem API flows continue to work. |
| AC-007 | NFR-001..003 | AV-007 | Targeted builds/tests pass for touched modules. |
| AC-008 | FR-008 | AV-008 | Source audit has zero `BaseAgentWorkspace` references in active code/examples. |

## Explicit Decisions

1. Keep current runtime string-path contract and do not reintroduce object abstractions.
2. Server workspace subsystem remains, but without `BaseAgentWorkspace` inheritance.
3. Re-entry path restarts at Stage 0 and must pass all downstream gates again before completion.
