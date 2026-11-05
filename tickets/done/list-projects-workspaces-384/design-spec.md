# Design Spec — autobyteus-384 (list_projects returns each Project's linked folders)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed 2026-11-05)
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-projects-workspaces-384/tickets/in-progress/list-projects-workspaces-384/investigation-notes.md`
- Authorities read (2026-11-05): `references/architecture-design.md`, `references/design-principles.md` (updated skill, 2026-11-04), `DESIGN.md` (repository root; present, so none is created).
- Conflicts or discrepancies: None.

## Current-State Read

`list_projects` → `executeProjectTaskTool` (manifest L120) → `ProjectService.listProjectSummaries()` (service L123-125: `{projectId, name, description}` from the stored records) → the tool result rule. `create_project`/`update_project` project the saved record with `projectAcknowledgement` (manifest L16-19), which includes the workspaces. Both the native tools (`project-task-native-tools.ts` L26) and the manifest used for MCP (L195) go through the same executor.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. One new projection file; `listProjectSummaries` and the manifest switch to it; one tool description; tests.
- Architectural risk: `Low`. A tool result gains one field (additive, within one release, DESIGN.md rule 9); read-only; no persistence, API, security or concurrency change.
- Escalation trigger: a consumer of `listProjectSummaries` that breaks on the extra field.

## Intended Change

One `ProjectSummary` projection (projectId, name, description, workspaces with workspaceRootPath and description) shown to agents by `list_projects`, `create_project` and `update_project`; the `list_projects` description says what `workspaces` is for.

## Change Scope (Mandatory)

- In scope: UC-001. Files:
  - new `autobyteus-server-ts/src/projects/domain/project-summary.ts`;
  - `src/projects/services/project-service.ts` (`listProjectSummaries`);
  - `src/agent-tools/project-tasks/project-task-tool-manifest.ts` (remove `projectAcknowledgement`, use the projection);
  - `src/agent-tools/project-tasks/project-task-tool-contract.ts` (`list_projects` description);
  - tests under `tests/unit/agent-tools/project-tasks/`;
  - `docs/` that describe `list_projects`'s result, if any (implementation greps).
- Derived consumers:
  - Task search (`project-task-search-service.ts` L102, via the composition L72 and three tests) reads projectId and name; the extra field is ignored, so no change;
  - the Work Journal's `List projects` line does not render fields, so no change.
- Deliberately left alone: the run-start Project section (DEC-002); GraphQL `listProjects` (the app's view with availability); availability and display names in the tool result (DEC-003).
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Requirement / AC | Trigger | Change | Target Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-003 / AC-001, AC-003, AC-004 | `list_projects` | Adds `workspaces` | executor → `listProjectSummaries` → `toProjectSummary` → result rule |
| BEH-002 | REQ-002 / AC-002 | `create_project`, `update_project` | Same shape, shared projection | executor → `createProjectRecord`/`patchProjectRecord` → `toProjectSummary` → result rule |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes` (small). The agent-facing projection of a Project lives privately in the manifest (`projectAcknowledgement`), while the list uses a different, narrower shape from the service.
- Structural triggers: Derived data (Principle 11) fires: one fact (how a Project is shown to an agent) would be built in two places. Vocabulary drift (Principle 15) fires if `list_projects` used another name or shape for the same folders. Persisted-data transition does not fire: nothing is stored.
- Root cause classification: `Shared Structure Looseness`
- Refactor needed now: `Yes` (the move of the projection into one owned file; small).
- Design response: `toProjectSummary(project: Project): ProjectSummary` in `projects/domain/project-summary.ts`, used by the service's `listProjectSummaries` and by the manifest for create/update.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: `projectAcknowledgement` in the manifest (replaced).
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected` (read-only projection).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Agent calls `list_projects` | Tool result text | `executeProjectTaskTool` | The changed read |
| DS-002 | Primary End-to-End | BEH-002 | Agent calls `create_project`/`update_project` | Tool result text | `executeProjectTaskTool` | Shares the projection |

## Primary Execution Spine(s)

- DS-001: `agent (native tool or MCP) → executeProjectTaskTool("list_projects") → ProjectService.listProjectSummaries() → store.listProjects() → toProjectSummary (each, sorted by name) → toToolResultJson`
- DS-002: `agent → executeProjectTaskTool("create_project"|"update_project") → ProjectService.createProjectRecord/patchProjectRecord → toProjectSummary → toToolResultJson`

## Ownership Map

- `projects/domain/project-summary.ts` owns the agent-facing shape of a Project: `ProjectSummary = {projectId, name, description, workspaces: Array<{workspaceRootPath, description}>}` and `toProjectSummary(project)`.
- `ProjectService.listProjectSummaries()` owns reading and ordering (by name, as today).
- The manifest owns tool dispatch only; it holds no Project projection.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `projectAcknowledgement` (manifest L16-19) | Moved to the domain owner | `toProjectSummary` | Same output for create/update |

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `toProjectSummary(project: Project): ProjectSummary` | One Project | Agent-facing projection | The record | Pure |
| `ProjectService.listProjectSummaries(): Promise<ProjectSummary[]>` | All Projects | Read, project, sort by name | — | Search keeps using it (reads projectId, name) |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Action |
| --- | --- | --- | --- | --- |
| A Project's linked folder | `workspaces[].workspaceRootPath`, `workspaces[].description` | Yes | Yes: the same names as the stored `ProjectWorkspaceLink` and the create/update results | — |
| The projection | `ProjectSummary`, `toProjectSummary` | Yes | `listProjectSummaries` already uses "summary" | — |

## Tool Description (REQ-003)

`list_projects`: "List every Project on the current node with its stable projectId, name, description and workspaces: the folders the Project is linked to (workspaceRootPath, and the link's description when it has one). Check them before creating a Project for a folder: a folder that is a Project's folder, or inside or around one, belongs to that Project. A field with no value is left out. Does not select or change a Project."

Implementation may tighten the wording, but keep its parts: the field names, what they are for, the empty-field rule, and read-only.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Result | `{"projects":[{"projectId":"project_1","name":"AutoByteus","description":"…","workspaces":[{"workspaceRootPath":"/Users/u/repo","description":"main repo"},{"workspaceRootPath":"/Users/u/agents"}]}]}` | `workspacePaths: ["…"]` (a second name for the same folders) or `"description": ""` (empty field) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `projectAcknowledgement` beside the new projection | Smaller diff | Rejected | One projection |

## Change / Refactor Sequence

1. Add `project-summary.ts` with a unit test.
2. Point `listProjectSummaries` and the manifest's create/update at it; remove `projectAcknowledgement`.
3. Update the `list_projects` description.
4. Tests: the AC-001 cases through `executeProjectTaskTool` and the native tool's text (AC-004); the existing create/update and search tests pass (AC-002).
5. Run server `test:unit` and `typecheck` (gate) (AC-005); grep `docs/` for a `list_projects` result description and update it.

## Key Tradeoffs

The object form is a little longer than a path list, but it keeps one vocabulary with create/update and keeps a link's description next to its path.

## Risks

R-01 (result size): accepted; paths only, descriptions when set.

## Guidance For Implementation

- Reproduction to start from: `None` (feature).
- Use test-owned data only; never the user's `~/.autobyteus`.
