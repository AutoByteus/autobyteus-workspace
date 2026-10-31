# Investigation Notes — One place per run in the Projects tree

## Investigation Meta

- Package: `projects-tree-one-place`; Project Task `autobyteus-353` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), depends on autobyteus-347
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place`, `codex/projects-tree-one-place`
- Base: `origin/personal` `f7f331d96b` (fetched 2026-10-31; contains 347 and beta v1.5.11-beta.8); finalization target `origin/personal`; release only on the user's word
- Current solution revision: SR-002
- Authorities read: solution-designer SKILL.md, references/requirements-engineering.md, ticket-scope.md, finding-the-cause.md, handoff.md (read in this conversation, 2026-10-31); root AGENTS.md.

## Request

The user (via the PM, 2026-10-31): the same Project Task Manager run "hello" appears under almost every Project in the new Projects tree, and clicking any of them opens the same run. "I think that definitely we have a bug. I think it should be fixed immediately." Screenshots in `evidence/intake/`.

## Evidence

| ID | Source | Finding | How |
| --- | --- | --- | --- |
| E-001 | `autobyteus-server-ts/docs/modules/run_history.md` § Project Run History (at `f7f331d96b`); 347 requirements REQ-003 | A run is listed under a Project when it was started under it (`project_runs.json`) **or** hosts any assignment of its Tasks; "A run can be listed under several Projects." Under each, the delegated rows are scoped to that Project. | Read |
| E-002 | Read-only count over `~/.autobyteus/server-data/projects/*` (no writes) | No `project_runs.json` exists: no run has been started under a Project yet; every listing is derived from Task records. Host roots: `project_task_manager_7c8dce0c…` ("hello", the PM run) hosts assignments in 6 Projects (AutoByteus 176 / 9 open, AutoByteus Agents 72 / 1 open, Skills 2 / 1, Integrations 2 / 0, Opportunities 1 / 1, Website 1 / 0); `project_task_manager_a5f6d9d3…` in 3 (AutoByteus 22 / 1, NFS 6 / 0, Agents 2 / 0); two more PM runs in 1 Project each. | Measured |
| E-003 | Screenshots (`evidence/intake/`) | "Project Task Manager (1) › hello" under Integrations, Opportunities, Skills, Website (and AutoByteus with (2)); under each, only that Project's delegated work. | User evidence |
| E-004 | 347 design (DEC-005, user Q&A 2026-10-31) | The user approved "existing runs show under the Projects they dispatched for", but did not foresee how it reads with one PM serving 6 Projects. | Read |

| E-005 | `autobyteus-server-ts/src/run-history/services/project-run-history-service.ts` 76–130; `run-history/domain/project-run-links.ts`; `projects/services/task-execution-resource-service.ts` 232–290; `compositions/project-run-links-composition.ts` 17–33; `agent-run-history-service.ts` 137–158 (`pinned`) | The derived listing, scopes, Org hosts and `pinned` exist only to list runs that host a Project's Tasks. | Read |
| E-006 | web `stores/projectRunsStore.ts` 136–218; `utils/collaboration/taskExecutionScope.ts`; `AgentRunTaskRows.vue` 44–81; `WorkspaceTeamExecutionTree.vue` 63–115; `WorkspaceAgentOrgHistoryCollection.vue` 213–278; `RunDefinitionGroups.vue` 144, 297, 313; `ProjectHistorySection.vue` 96–98; `projectRunsProjection.ts` 80–144 | Scope filtering, Task-event re-reads (triggers 1, 2, 5), Org rows and list-valued ancestry serve only the derived listing. | Read |
| E-007 | User, 2026-10-31 (requirements-doc.md § User Decision) | "if I don't have any agent run which are directly created under any project, then we don't show it … UI is reflecting the data." | User |

## Requirement implications

Designed behavior, not a defect in code; the requirement (REQ-003/DEC-005 of 347) reads as duplicates in real use. Changing it is a user product decision (visible behavior), asked directly.
