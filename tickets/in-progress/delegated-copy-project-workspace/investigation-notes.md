# Investigation Notes — A delegated copy runs in its Task's Project folder (autobyteus-97)

## Investigation Meta

- Package: `delegated-copy-project-workspace`; Project Task `autobyteus-97` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-project-workspace`, `codex/delegated-copy-project-workspace`
- Base: `origin/personal` `c952758a81` (fetched 2026-11-02); finalization target `origin/personal`; release only on the user's word
- Current solution revision: SR-001
- Authorities read (this conversation): solution-designer SKILL.md and its references; root `DESIGN.md`; `docs/design/collaboration_model.md`; server `docs/modules/projects.md`.
- All findings by reading at `c952758a81`, except E-009 (read-only look at the user's Project links). Nothing was run.

## Evidence

| ID | Source | Finding |
| --- | --- | --- |
| E-001 | `agent-collaboration/collaborators/collaborator-root-port.ts` 15–23; `collaborator-launch-resolver.ts` 162, 310–313; `standalone-root-collaborators.ts` 30, `team-run-collaborators.ts` 17, `agent-org-run-collaborators.ts` 32 | A catalog copy's folder is the **run root's** launch folder (`launchBase()`), for every layer that chose its model. So today's "inherits the delegator" really means "the top-level run's folder", also for sub-work delegated by a worker. |
| E-002 | `execution/task/new-copy-work.ts` 40–85; `standalone-root-message-delivery.ts` 198–203; `agent-org-run-message-delivery.ts` 148–152; Team root equivalent; `catalog-delegation.ts` 78–109 | One order for all three roots: `prepareNewCopyWork` (reads the Task) → `resolveDelegationPlacement` (in-run configured placement, else catalog copy) → `dispatchNewCopy`. Entry forms: saved Task (`task_id`), sub-work (description from a task agent; its Task's identity is read), described work from anyone else (a new Temp task). The Task's `projectId` is known in the first two before placement. |
| E-003 | `run-history/domain/run-execution-tree-shared-records.ts` 70–95; `catalog-delegation.ts` 58–72 | A copy's snapshot `source` holds the folder: an Agent's `launchConfiguration`; a Team's `defaultLaunchConfiguration` and each member's launch. A configured placement's snapshot carries its own folder. The copy restores from this snapshot, so existing runs keep their folder. |
| E-004 | `llm-management/services/run-model-selection-service.ts` 54, 110; `launch-preferences/launch-usability-check.ts` 120–160 | Launch usability checks read the runtime's model catalog **for a folder**, so launches must be resolved against the folder the copy will run in. |
| E-005 | `workspaces/workspace-manager.ts` 54–82, 94–103; `configured-agent-execution-handle.ts` 428–442 | Starting a copy calls `ensureWorkspaceByRootPath`, which registers the folder (it then appears as a Workspaces row) and does not check that it exists; external runtimes can fall back to temp or the server's folder (earlier E-016 of autobyteus-72). A missing folder needs an explicit check before the copy starts. |
| E-006 | server `docs/modules/projects.md` § Workspace Registration Boundary | Project links are node-local path strings, never checked on save. Projects are node-local, so the check runs on the node that owns the Project and starts the copy. |
| E-007 | `execution/remote/remote-delegation.ts` 70–100; CM-12 | Remote delegation refuses `task_id` and runs in the peer's temp workspace; no local path travels. Unchanged. |
| E-008 | web `services/agentCollaboration/agentRunCollaborationHydration.ts` 54, `agentRunCollaborationChildContextFactory.ts` 20; `services/teamExecution/teamExecutionContextFactory.ts` 34–52; web `docs/projects.md` | Each child context gets its workspace from its own `source` launch, so Files and Terminal follow the copy's folder once the snapshot has it. In the tree (`AgentRunTaskRows`), a copy is nested under the top-level run that coordinates it (CM-7), in both modes. Remote rows already carry a small node chip. |
| E-009 | Read-only look at `~/.autobyteus/server-data/projects/*/project.json` | Every Project has one linked folder. (Listing in the conversation.) |
| E-010 | `assignToExistingCopy` (server `projects.md` § Follow-up Task to an existing copy) | A follow-up Task to an existing copy restores it with its own snapshot: it keeps its folder. |

## Product Design Request Context

Not stated by the user or the Task.
