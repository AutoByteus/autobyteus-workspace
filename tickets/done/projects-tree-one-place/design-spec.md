# Design Spec — One place per run in the Projects tree

## Solution And Approval Basis

- Current solution revision ID: SR-002
- Approved requirements: `requirements-doc.md` SR-002, approved by the user (DEC-001, his words in the requirements doc) and by the Solution Designer within that direction (DEC-002…DEC-004, user informed).
- Behavior-defining supplements: 347 Product spec (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/ui-ux-spec.md`) for look and states, minus the parts listed in the requirements' "Removed From 347".
- User approval of the design: `Not required` (the Task asks the user to settle the tree's behavior, done in DEC-001; it does not ask for design approval). The user is informed.
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (E-001…E-007)
- Authorities read (2026-10-31, this conversation): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, 347's design spec at `origin/personal` `tickets/done/projects-left-navigation/design-spec.md`.
- Conflicts or discrepancies: none.

## Current-State Read

347 (at `f7f331d96b`) builds each Project's runs in `ProjectRunHistoryService.projectRunHistory` (`autobyteus-server-ts/src/run-history/services/project-run-history-service.ts` 76–130) from two sources: `ProjectRunLinks.startedRunsOf(P)` (the Project's `project_runs.json`) and `ProjectRunLinks.runLinksOf(P)` / `runLinksOf(null)` (hosts and copies derived from Task records, `src/projects/services/task-execution-resource-service.ts` 232–290, bound in `src/compositions/project-run-links-composition.ts` 17–33). It returns grouped runs plus Org runs (hosts only) and per-root `scopes`. The web's `projectRunsStore` (`autobyteus-web/stores/projectRunsStore.ts` 136–218) keeps the snapshots and re-reads on five triggers, three of them Task-event based; the rows filter delegated copies by `scopes` through `utils/collaboration/taskExecutionScope.ts` in `AgentRunTaskRows.vue` 44–81, `WorkspaceTeamExecutionTree.vue` 63–115 and `WorkspaceAgentOrgHistoryCollection.vue` 213–278, wired through `RunDefinitionGroups.vue` 144, 297, 313 and `ProjectHistorySection.vue` 96–98. `AgentRunHistoryService.listAgentGroupsOf` (`src/run-history/services/agent-run-history-service.ts` 137–158) takes a `pinned` rule used only for derived hosts.

On the user's data no `project_runs.json` exists, so every listed run comes from the derived source (E-002).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: removal within existing owners: one server service and its port, one method of `TaskExecutionResourceService` and its test file, one composition binding, the GraphQL type; on the web one store, one projection, the scope utility and three row components' scope props, plus tests and docs. No new owner.
- Architectural risk: `Low`
- Risk rationale: no persistence change, no new contract; the `projectRunHistory` shape narrows (drops `scopes` and `agentOrgRuns`) between the web and server of one release (DESIGN rule 9, clean cut); the run-history → Projects port loses a method (less coupling). Workspaces mode and starting runs under a Project are untouched.
- Escalation trigger: any need to change run records, Task records, `project_runs.json`, or Workspaces behavior.

## Architecture Investigation Evidence

| ID | Path | Observation | Decision |
| --- | --- | --- | --- |
| E-001…E-003 | see investigation notes | Derived listing causes the repetition; no started-run records on the user's node | Remove the derived source |
| E-004 | `project-run-history-service.ts` 76–130; `project-run-links.ts` 1–24 | Listing = started ∪ hosts; scopes from `runLinksOf(P)` ∪ `runLinksOf(null)` | Listing = started only; no scopes; port keeps `startedRunsOf` |
| E-005 | `task-execution-resource-service.ts` 232–290; `tests/unit/projects/task-execution-run-links.test.ts` | `runLinksOf` exists only for this listing | Remove method and its tests |
| E-006 | web `projectRunsStore.ts` 136–218; `taskExecutionScope.ts`; the three row components; `RunDefinitionGroups.vue`; `ProjectHistorySection.vue`; `projectRunsProjection.ts` 80–144 | Scope filtering, Task-event triggers, Org rows exist only for derived hosts | Remove; rows render as in Workspaces |
| E-007 | `agent-run-history-service.ts` 137–158 | `pinned` serves only derived open-work hosts | Remove the parameter |

## Intended Change

A Project lists exactly the runs started under it; the derived "hosts of the Project's Tasks" listing, the per-Project scopes, the Org rows and the Task-event re-reads are removed; rows under a listed run show its delegated work as in Workspaces.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Server: `ProjectRunHistoryService`, `ProjectRunLinks` port, `TaskExecutionResourceService.runLinksOf` (removed), `project-run-links-composition.ts`, `AgentRunHistoryService.listAgentGroupsOf` (`pinned` removed), GraphQL `project-run-history.ts` type. Web: `projectRunsStore`, `projectRunsProjection`, `graphql/queries/projectRunHistoryQueries.ts`, scope props and `taskExecutionScope.ts`, `RunDefinitionGroups.vue`, `ProjectHistorySection.vue`, `useProjectsTreeState` (single ancestry), tests. Docs: server `run_history.md` § Project Run History, `projects.md` § Project run links; web `projects.md` § Projects Mode In The Left Panel.
- Derived consumers: the GraphQL `ProjectRunHistory` type and its web query (fields removed together); the projection's ancestry indexes (now at most one Project per run).
- Deliberately left alone: `project_runs.json`, `ProjectRunService` (`recordStart`, `startedRunsOf`, `contextOfRun`), run creation, the chip, folder rule, `## Project` section, icons, switch, Workspaces mode, the right board.
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| 001, 003 | REQ-001, 004; AC-001, 003 | Projects mode shown | Started runs only, Workspaces cap | DS-001 |
| 002 | REQ-002; AC-002 | Run listed under P | Delegated rows unscoped | DS-001 (web rows) |
| 004 | REQ-003; AC-004 | `connected`; web start/archive/delete/Stop | Fewer triggers | DS-002 |

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change (user-requested), mostly removal.
- Current design issue found: Yes — 347's derived listing (DEC-005) made one run appear in many places; the scope machinery existed to manage that.
- Structural triggers: Legacy cleanup (Principle 8): the derived listing, scopes, `pinned`, Org-host rows and three re-read triggers lose their only purpose and are removed, not kept behind a flag. Dead code (Principle 7): `runLinksOf`, `taskExecutionScope.ts` scope exports, `noteUnscoped`, `WorkspaceAgentOrgScopedRows.spec.ts`. Ruled out: persisted-data transition (nothing stored changes).
- Root cause classification: `No Design Issue Found` in the code against 347's requirement; the requirement itself changed (DEC-001).
- Refactor needed now: Yes (removal), in this change.
- Intentional deferrals: none.

## Terminology

- **Runs of a Project**: the top-level runs started under it (its `project_runs.json` entries joined with history rows). No other meaning remains.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: listed in the Removal Plan.
- Compatibility wrappers or fallbacks kept: None.

## Persisted Data / State Transition Decision (Mandatory)

- Decision: `Not Affected`. No stored file is read differently or written; Projects without `project_runs.json` list no runs.

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | 001–003 | Projects mode shown | Tree of runs started under each Project, delegated rows as in Workspaces | `ProjectRunHistoryService`; `projectRunsStore` / `projectRunsProjection` |
| DS-002 | Return-Event | 004 | `connected`; web start/archive/delete/Stop | Affected Projects re-read | `projectRunsStore` |

## Primary Execution Spine(s)

- DS-001: `ProjectsRunsTree → projectRunsStore.loadAll() → GraphQL projectRunHistory(P) → ProjectRunHistoryService (ProjectRunLinks.startedRunsOf(P) → AgentRunHistoryService.listAgentGroupsOf(includes: started) + Team runs started) → {projectId, agentDefinitions, teamDefinitions} → projectRunsProjection (contexts overlay, ancestry) → ProjectHistorySection → RunDefinitionGroups → rows (AgentRunTaskRows / WorkspaceTeamExecutionTree, no scope)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The service reads P's started runs, then lists the matching non-archived Agent rows grouped by definition (6 newest each, the same cap as Workspaces) and the matching Team runs. The web projects them with the live contexts as in 347 and renders each run with the same rows as Workspaces, so all its delegated work is nested beneath it. A run appears in at most one Project (a start is recorded once), so the ancestry indexes hold one entry per run. | `ProjectRunHistoryService`; `projectRunsStore`; `projectRunsProjection` |
| DS-002 | The listing changes only when runs are started, archived, deleted or stopped: the store keeps 347's trigger 3 (`connected`) and trigger 4 (web start/archive/delete/Stop, including Stop of Agent and Team runs) and removes triggers 1, 2 and 5 (Task events of P, Temp-task events, unknown copy keys). | `projectRunsStore` |

## Spine Actors / Main-Line Nodes

`ProjectsRunsTree`, `projectRunsStore`, GraphQL resolver, `ProjectRunHistoryService`, `AgentRunHistoryService`, `projectRunsProjection`, row components.

## Ownership Map

- `ProjectRunHistoryService`: which runs a Project lists = its started runs; grouping and cap.
- `ProjectRunService` (unchanged): the started-run record.
- `projectRunsStore`: snapshots and the two re-read triggers.
- Row components: render a run's delegated work; no Project knowledge.

## Thin Entry Facades / Public Wrappers

| Facade | Owner | Must not own |
| --- | --- | --- |
| GraphQL `projectRunHistory` | `ProjectRunHistoryService` | Listing rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by |
| --- | --- | --- |
| `ProjectRunLinks.runLinksOf`, `ProjectRunLinkSet` (`run-history/domain/project-run-links.ts`) | Derived listing removed (DEC-001) | `startedRunsOf` only |
| `TaskExecutionResourceService.runLinksOf` and `TaskRunLinks` type; `tests/unit/projects/task-execution-run-links.test.ts` | Dead: its only caller was the binding above | — |
| `runLinksOf` binding in `compositions/project-run-links-composition.ts` (and its `taskExecutionResources` input) | Same | — |
| `scopes`, `agentOrgRuns`, Org lookup and host merging in `ProjectRunHistoryService`; matching GraphQL fields and web query fields | Only for derived hosts | — |
| `pinned` in `AgentRunHistoryService.listAgentGroupsOf` | Only for derived open-work hosts | Same cap as Workspaces |
| Web: `scopes` in `projectRunsStore`, `noteUnscoped`, Task-event triggers 1, 2, 5 and their feed handling | Listing no longer depends on Task events | Triggers 3 and 4 |
| Web: `executionScope` / `executionScopeOf` props and their wiring in `AgentRunTaskRows.vue`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`, `RunDefinitionGroups.vue`, `ProjectHistorySection.vue`, `workspaceHistorySectionContracts.ts` (`ProjectSectionScope.executionScopeOf`) | Rows render unscoped | — |
| Web: `utils/collaboration/taskExecutionScope.ts` exports used only for scoping (`scopeTaskRows`, `RootExecutionScope`, `taskExecutionKey`; any other export kept only if an unscoped caller still uses it) and its spec; `WorkspaceAgentOrgScopedRows.spec.ts` | Dead after the props go | — |
| Web: Org rows in `projectRunsProjection` (`agentOrgDefinitions`, `agentOrgAncestryById`) | No Org is started under a Project (DEC-004) | — |
| Web: list-valued ancestry (`ProjectRunAncestry[]`) | A run is in at most one Project | Single ancestry per run |

## Return Or Event Spine(s)

DS-002.

## Bounded Local / Internal Spines

`projectRunsStore` read cycle unchanged (one read per Project in flight, one queued).

## Off-Spine Concerns Around The Spine

| Concern | Serves | Note |
| --- | --- | --- |
| `ProjectChangeFeed` retention | `projectRunsStore` | Kept only for `connected` |

## Ownership Boundaries

Unchanged from 347; run history reads Projects through `ProjectRunLinks.startedRunsOf` only.

## Boundary Encapsulation Map

| Boundary | Callers | Forbidden bypass |
| --- | --- | --- |
| `ProjectRunHistoryService.projectRunHistory` | GraphQL resolver | Resolver reading the port |
| `ProjectRunLinks.startedRunsOf` | `ProjectRunHistoryService` | Reading `project_runs.json` from run history |

## Dependency Rules

As 347; the binding no longer needs `TaskExecutionResourceService`.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| GraphQL `projectRunHistory(projectId, limitPerAgent = 6)` | One Project's runs | `{projectId, agentDefinitions, teamDefinitions}` (unknown Project: `PROJECT_NOT_FOUND`, as today) |
| `ProjectRunLinks.startedRunsOf(projectId)` | One Project's started runs | unchanged |
| `AgentRunHistoryService.listAgentGroupsOf({includes})` | Agent rows selected by run | `pinned` removed |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity |
| --- | --- | --- | --- |
| `projectRunHistory` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Port | `ProjectRunLinks` | Now only started runs; keep the name (it still links runs to a Project) |

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Delegated rows under a run | Reuse the Workspaces rows unchanged |

## Subsystem / Capability-Area Allocation

| Area | Change |
| --- | --- |
| server run-history | Narrow `ProjectRunHistoryService`, port, `listAgentGroupsOf` |
| server projects / compositions | Remove `runLinksOf` and its binding |
| web stores / components / utils | Remove scopes, Org rows, Task-event triggers |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

N/A — no new structure.

## Shared Structure / Data Model Tightness Check

| Structure | Change |
| --- | --- |
| `ProjectRunHistory` | Tighter: two fields removed |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/run-history/services/project-run-history-service.ts` | Started runs only; no scopes, no Org runs |
| `autobyteus-server-ts/src/run-history/domain/project-run-links.ts` | `startedRunsOf` only |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | `listAgentGroupsOf({includes})` |
| `autobyteus-server-ts/src/projects/services/task-execution-resource-service.ts` | `runLinksOf` removed |
| `autobyteus-server-ts/src/compositions/project-run-links-composition.ts` (+ caller in `project-task-execution-resource-composition.ts`) | Binding without `runLinksOf` |
| `autobyteus-server-ts/src/api/graphql/types/project-run-history.ts` | Fields removed |
| Tests: `tests/unit/run-history/services/project-run-history-service.test.ts` (rewrite for started-only, incl. the user's case: a run hosting Tasks of 3 Projects lists nowhere), remove `tests/unit/projects/task-execution-run-links.test.ts`, adjust `tests/e2e/projects` PRH cases | Update |
| `autobyteus-web/graphql/queries/projectRunHistoryQueries.ts`; `generated/graphql.ts` (regenerated) | Fields removed |
| `autobyteus-web/stores/projectRunsStore.ts`, `projectRunsProjection.ts`, `composables/useProjectsTreeState.ts` | Triggers 3–4; no scopes; no Org rows; single ancestry |
| `autobyteus-web/components/workspace/history/{AgentRunTaskRows,WorkspaceTeamExecutionTree,WorkspaceAgentOrgHistoryCollection,RunDefinitionGroups,ProjectHistorySection}.vue`, `workspaceHistorySectionContracts.ts` | Scope props removed |
| `autobyteus-web/utils/collaboration/taskExecutionScope.ts` (+ spec), `components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` | Removed (keep only exports an unscoped caller uses) |
| Web specs: `projectRunsStore.spec.ts`, `projectRunsProjection.spec.ts`, `ProjectsRunsTree.spec.ts` | Update |
| Docs (delivery): server `run_history.md` § Project Run History, `projects.md` § Project run links; web `projects.md` § Projects Mode In The Left Panel | Update |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

As the Final File Responsibility Mapping; no new files.

## Folder Boundary Check

N/A — no new folders.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| The user's case | "hello" (started in the superrepo workspace) hosts Tasks of 6 Projects → every Project shows "No runs yet"; "hello" in Workspaces as today | Listing "hello" anywhere in Projects mode |
| Run started under P delegating a Task of Q | Listed once under P with both delegated runs nested; Q empty | Filtering Q's worker out from under the run, or listing it under Q |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keeping the derived listing behind a setting | Rejected (user decision; no dual path) |
| Keeping `scopes` in the GraphQL shape, unused | Rejected (dead field) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server: narrow the service, port, binding and GraphQL type; remove `runLinksOf` and `pinned`; tests.
2. Web: regenerate GraphQL types; store, projection, ancestry; remove scope props and utility; tests.
3. Browser check on the user's kind of data (AC-001) and a run started under P delegating to P and Q (AC-002).
4. Docs (delivery).

## Key Tradeoffs

- Existing managers started in a workspace are not in the Projects tree; the user chose this ("UI is reflecting the data").

## Risks

- A forgotten scope prop or trigger left behind as dead code: the removal plan lists each; `vue-tsc` and the unused-export check catch the rest.

## Guidance For Implementation

- Reproduction to start from: `None` (behavior change); start by rewriting `project-run-history-service.test.ts` for the user's case (a run hosting Tasks of 3 Projects lists under none).
- Keep the 347 Product look and states; Projects with no runs show the existing hint.
