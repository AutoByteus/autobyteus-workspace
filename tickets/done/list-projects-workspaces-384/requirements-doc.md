# Requirements Document — autobyteus-384 (list_projects returns each Project's linked folders)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `list-projects-workspaces-384`
- Request / ticket: Project Task `autobyteus-384`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-05
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user, 2026-11-05 (SR-001)
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: None
- Release: **a new beta release** after finalization. The user, 2026-11-05: "by the way for this ticket its going to be a new beta release thanks a lot." (DEC-004)

## Problem And Desired Outcome

- Problem: no read tool shows which folders a Project is linked to, so an agent can't tell whether a folder the user names already belongs to a Project.
- Desired outcome: `list_projects` shows each Project's linked folders, compactly and in the same shape as `create_project`/`update_project`.
- Observable definition of success: an agent calling `list_projects` sees, for each Project, `workspaces: [{workspaceRootPath, description?}]`, and the tool description says what they are for.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | `list_projects` → `{projects: [{projectId, name, description}]}` | Each project also carries `workspaces: [{workspaceRootPath, description}]`; empty fields left out by the result rule | Order by name; `projectId`, `name`, `description`; no arguments | Investigation |
| BEH-002 | Contract | SCN-001 | `create_project`/`update_project` return a Project with workspaces | The same projection as `list_projects` | Their result shape | Investigation |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent lists the Projects to find the one a folder or name belongs to | SCN-001 |

### Out Of Scope

- The Project Task Manager skill (autobyteus-agents-84).
- The run-start Project section (DEC-002).
- Task tools; GraphQL and the web app; stored data.
- Any matching logic for folders (the agent reasons on the list).

### Non-Goals

- Workspace availability or display names in the tool result (the app's view; not needed to match a folder).

### Preserved Behavior Boundary

BEH-001 and BEH-002 preserved columns. Task search keeps reading projectId and name.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `list_projects` returns, for each Project, its linked folders as `workspaces: [{workspaceRootPath, description}]`, through the tool result rule (an empty description, and an empty list, are left out) | BEH-001 | High | The Task | N/A | Task |
| REQ-002 | `list_projects`, `create_project` and `update_project` show a Project through one shared projection (DESIGN.md / Principle 15: one shape, one name) | BEH-001, BEH-002 | Medium | Consistency | N/A | Task ("check for consistency") |
| REQ-003 | The `list_projects` description names the field and its purpose: the folders each Project is linked to, to tell which Project a folder belongs to (the same folder, one inside or around it) before creating a new one | BEH-001 | High | The Task | N/A | Task |
| REQ-004 | Tests cover the new field (with folders, with a description, without a description, a Project without folders) and the shared projection | all | High | Done-when | N/A | Task |

## Acceptance Criteria

| AC ID | Related REQ | Behavior / Scenario | Trigger | Observable Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `list_projects` on a node with a Project linked to two folders, one link with a description | `{"projects":[{"projectId":…,"name":…,"description":…,"workspaces":[{"workspaceRootPath":"/a","description":"…"},{"workspaceRootPath":"/b"}]}]}` | A Project with no folders has no `workspaces` field; a Project with an empty description has no `description` | Unit test on the tool result text |
| AC-002 | REQ-002 | BEH-002 | `create_project`, `update_project` | Results unchanged in shape; they use the shared projection | — | Existing tests pass |
| AC-003 | REQ-003 | BEH-001 | Tool definition | The description names `workspaces` and its purpose | — | Unit test or snapshot of the description |
| AC-004 | REQ-001 | BEH-001 | Native and MCP-served `list_projects` | Both return the field (one executor) | — | Unit or e2e test through the manifest |
| AC-005 | all | all | `pnpm -C autobyteus-server-ts test:unit`, `typecheck` | Pass | — | Runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The Project Task Manager, for the user | Find the Project a folder or name belongs to before creating one | The user names a folder or Project | `list_projects` → compare folders and names → use the existing Project, or create one | The agent sees each Project's folders | Supported Normal Scenario | The Task; autobyteus-agents-84 | REQ-001..REQ-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, not applicable.

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (read only).

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | The field's shape | Short form vs. consistency | A path string list; or `[{workspaceRootPath, description}]` as `create_project` returns | The object form: the same names `create_project`/`update_project` already use (one vocabulary). The description must sit with its path, and the result rule keeps it compact | Solution Designer | Decided |
| DEC-002 | The run-start Project section | Task asks to check consistency | It names the Project and ID for the Project tools; the run's folder is in Working Environment | Leave it: adding folders would change every run's prompt under a Project without a need; `list_projects` serves the folder check | Solution Designer | Decided |
| DEC-004 | Release | The Task says release only on the user's word | The user, 2026-11-05: "for this ticket its going to be a new beta release" | Delivery cuts a new beta release after finalization, per RELEASE.md | User | Decided |
| DEC-003 | Availability or display name in the result | The app's Project view has them | Not needed to match a folder; adds lookups and size | Leave out | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-002 | SCN-001 |
| REQ-003 | UC-001 | BEH-001 | AC-003 | SCN-001 |
| REQ-004 | UC-001 | all | AC-001..AC-005 | SCN-001 |

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-11-05). Ready for design: `Yes`.
