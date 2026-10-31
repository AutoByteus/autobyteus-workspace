# Investigation Notes — Projects view in the left panel

## Investigation Meta

- Package identifier: `projects-left-navigation` (Project Task `autobyteus-347`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Request / ticket: autobyteus-347, "Projects view in the left panel: runs organized under Project and Task, beside Workspaces (replaces autobyteus-72)"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Repository mode: Git
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation` / `codex/projects-left-navigation`
- Resolved base: `origin/personal` at `8faae968997564cf52dc404eb6b6f6a7721d5434` (after `git fetch origin`, 2026-10-31)
- Finalization target: `origin/personal` (Delivery-owned; release only on the user's word)
- Bootstrap result: new worktree created with `git worktree add … -b codex/projects-left-navigation origin/personal`. The old autobyteus-72 worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-centric-execution` (branch `codex/project-centric-execution`, base `f13bdd0eb7`, 2,174 commits behind) still exists; it was read only and is not reused, because the code it investigated has changed substantially (see E-020).
- Bootstrap blocker: none
- Current solution revision ID: SR-003
- Authorities read (requirements reading gate, 2026-10-31): `solution-designer/SKILL.md`; `references/requirements-engineering.md`; `references/ticket-scope.md`; `references/finding-the-cause.md`; `references/handoff.md`; templates for requirements, investigation notes and solution revision record; root `AGENTS.md`.
- Investigation status: requirements investigation complete for SR-001. Architecture investigation not started (it starts after approval).

## Initial Request And Clarifications

- Original request: the Task description (autobyteus-347), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's words (2026-10-31): "I use the project task manager to work on certain project… under the project, then I run the project task manager under a certain project… the resources are created and released, created and released; it would be much more convenient. On the workspace view it's OK, but I have a lot of workspaces. The problem with the workspace view is that if the user is not using the project task manager to delegate, the user has to manually archive by themselves. If I use the project view, then when a user runs an agent which uses delegate_task, and the task can be marked, it will be in the project view."
- Clarifications received: none yet in this ticket. The earlier ticket's two questions (DEC-001, DEC-002) were never answered.
- User-supplied facts: screenshot (copied to `evidence/intake/user-screenshot-sidebar-pm-under-workspace-2026-10-31.png`): a Project Task Manager agent group under one workspace, its conversation "hello" with a marketing team (members) and an agent package creator nested below, an older conversation with four more delegated runs, and a long list of workspaces.
- Earlier ticket documents (autobyteus-72, 2026-10-13), read as input, not authority: `/Users/normy/autobyteus_org/autobyteus-delivery-records/project-centric-execution-72-20261031/` (requirements-doc.md R2 Draft, investigation-notes.md, user-decision-questions.md, solution-handoff.md, solution-revision-record.md).
- Initial ambiguity: which Tasks the left list should show; where the manager runs; what "archive automatically" adds to what exists.

## Product And Domain Understanding

- Product area: the left panel's run section (today: Workspaces tree), Projects and Tasks, delegation (`delegate_task`), Task closure.
- Terms used in this ticket:
  - **Manager conversation**: a run the user started (normally a Project Task Manager Agent) that dispatches Project Tasks with `delegate_task(task_id)`. Technically the *host root* (`hostRoot`) of the Task's assignments.
  - **Worker**: the delegated Agent or Team run (a "task agent", a "copy") a Task was given to. Sub-work: runs a worker delegated for the same Task.
  - **Workspace / folder**: the working directory a run gets (`workspaceRootPath`).
  - **Linked folder**: a Project's described folder link (`project.workspaces[]`).

## Source Log

| Date | Type | Exact source / command | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31 | Command | `git fetch origin`; `git rev-parse origin/personal`; `git log --oneline f13bdd0eb7..HEAD \| wc -l` | Base and staleness of the earlier investigation | Base `8faae96899`; 2,174 commits since the earlier base | E-020 |
| 2026-10-31 | Doc | `autobyteus-server-ts/docs/modules/projects.md` (whole file) | Task, run-resource, closure, delegation, workspace-link contracts | E-002, E-004…E-009, E-013 | — |
| 2026-10-31 | Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` | CM rules for delegated runs | E-010 | — |
| 2026-10-31 | Doc | `autobyteus-server-ts/docs/modules/run_history.md` (scope, GraphQL, archive, task-linked history) | Listing, archive, caps | E-011, E-012 | — |
| 2026-10-31 | Doc | `autobyteus-web/docs/projects.md`; `docs/workspace_layout.md`; `docs/agent_execution_architecture.md` §Workspace History Archive And Delete Actions | Current UI surfaces | E-001, E-003, E-012, E-014 | — |
| 2026-10-31 | Code | `autobyteus-web/components/AppLeftPanel.vue`; `components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Left panel structure | E-001 | — |
| 2026-10-31 | Code | `autobyteus-web/utils/collaboration/taskExecutionClosure.ts` and its users | Closed Task work in the tree | E-006 | — |
| 2026-10-31 | Code | `autobyteus-web/utils/projects/taskRootPresentation.ts` | When a Task's worker is openable | E-012 | — |
| 2026-10-31 | Code | `autobyteus-web/stores/runHistoryStore.ts` `fetchTree(limitPerAgent = 6)`; `runHistoryLoadActions.ts` | Listing cap | E-012 | — |
| 2026-10-31 | Code | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-launch-resolver.ts` (`launchContextOf`, lines 160–175, 310–313); `src/launch-preferences/launch-usability-check.ts` lines 120–160 | Where a delegated run's folder comes from | E-007 | — |
| 2026-10-31 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` `CreateAgentRunInput` | What a run records at start | E-005 | — |
| 2026-10-31 | Code | `autobyteus-web/composables/runSettings/useRunStart.ts` `newChatInWorkspace`; `WorkspaceAgentRunsTreePanel.vue` `startPresetChat` | How "+" on an agent group starts a run | E-015 | — |
| 2026-10-31 | Code / skill | `autobyteus-agents/agents/project-task-manager/skills/project-task-management/SKILL.md` (linked from the superrepo `.claude/skills`) | Where the manager keeps its memory | E-008 | — |
| 2026-10-31 | Data (read only) | Python read-only counts over `~/.autobyteus/server-data/projects/*/project.json`, `tasks/*/task.json`, `tasks/*/agent_run_resources.json` (no content printed beyond names and counts; nothing written) | Real usage scale and shape | E-016, E-017, E-018 | — |

## Evidence Index

| ID | Finding | How established |
| --- | --- | --- |
| E-001 | `AppLeftPanel.vue` always renders `WorkspaceAgentRunsTreePanel` in its run section, headed "Workspaces" with a "+" to add a workspace. There is no other organization of runs in the left panel. | Read |
| E-002 | Projects are node-local records: name, description, `workspaces[]` (path + description, may be unregistered), Task key prefix. A Project has **no** record of a manager run and no execution folder choice. The server ships no manager; any Agent with the Project tools can manage Projects. | Read (server projects.md, Scope; Persistence Layout) |
| E-003 | The right panel's **Projects** tab is a Task board (picker, lanes, Task view) with a worker line that opens the worker's conversation; the primary **Projects** page is authoring. Neither organizes runs. | Read (web projects.md) |
| E-004 | Each Project Task's `agent_run_resources.json` is the only record of the runs that worked on it: `role` (assigned / delegated / legacy broughtIn), `assignedBy`, `recipientAddress`, `hostRoot {kind, runId}` (the top-level run the user started), `agentRun` (agent or team copy), `start`, `closedAt`. Execution trees carry no Task information. | Read |
| E-005 | Starting a run (`CreateAgentRunInput`) records definition, workspace path, model, runtime, auto-execute; there is no Project field on a run. | Read |
| E-006 | **Closing a Task already cleans up its delegated runs.** DONE or CANCELLED closes every open entry and stops exactly the runs whose current Task is this Task (a run with another open Task keeps running). The Workspaces tree hides every closed task execution and everything under it, live and after restart (`collectClosedSubtrees`, `taskExecutionClosure.ts`). Conversations are kept; reopening the Task plus a message from the assigner lists the run again. A quiet delegated run is also shut down after the idle grace period (CM-6). | Read (server projects.md §DONE and CANCELLED, §Reactivation; web `taskExecutionClosure.ts`) |
| E-007 | **Delegated runs take the delegator's folder.** `CollaboratorLaunchResolver` gives every copy `launchContextOf(base)`: the delegating root's `workspaceRootPath` (and auto-execute), whichever layer chose the model. A saved-Task dispatch does not read the Project's linked folders. | Read (code) |
| E-008 | The Project Task Manager skill keeps its memory in its **workspace**: `<workspace>/task-plans/board.md`, or `board-<project-slug>.md` when the workspace holds several Projects; plans in `<workspace>/task-plans/<date-slug>/`. The user's manager keeps its board in the superrepo (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/board.md` exists). Moving the manager to another folder means it no longer finds its board. | Read |
| E-009 | Task status is agent-written only; DONE/CANCELLED is the only closure; a run may hold several open Tasks (it is stopped when its last open Task closes); sub-work joins the delegator's newest open Task; workers cannot assign saved Tasks (`TASK_AGENT_RESOURCE_OWNED_SENDER`). | Read |
| E-010 | Collaboration model: every delegated run belongs to one or more open Tasks (Project Task, the delegator's Task, or a Temp task); the topmost run of a delegation chain coordinates all delegated runs in it; remote delegated runs are listed as children of the delegator's root (CM-6, CM-7, CM-10, CM-11). | Read |
| E-011 | Archive is a non-destructive hide of a stored, inactive root (Agent, Team or Org run); running roots cannot be archived; there is an "Archive all runs" per group; no unarchive UI. Delegated runs are not separate archivable rows: they live in their root's tree. | Read (run_history.md; web agent_execution_architecture.md) |
| E-012 | **Listing cap.** The Workspaces tree loads `listWorkspaceRunHistory(limitPerAgent = 6)`: at most 6 runs per agent per workspace. A Task's worker is openable from the board only when its hosting run is listed (`presentTaskRoot` … `hostListed`). So a Task hosted by an older manager conversation (7th or later) cannot be opened from the board today. | Read (code) |
| E-013 | Task/Project delete removes the records and keeps `agent_run_resources.json`; it does not stop work; run history is untouched. | Read |
| E-014 | Left-panel conventions to reuse: Task summary line under task rows (`TaskWorkerTaskSummary`, "Show Task in Projects"), Task locator into the right Projects tab, team disclosure rules, delegated Stop button, Team aggregate status dot, reveal of the selected row, collapsed strip "Workspaces" icon. | Read (web projects.md, workspace_layout.md) |
| E-015 | "+" on an agent group in a workspace starts a New chat preset with that agent and folder (`runStart.newChatInWorkspace({agentDefinitionId, workspaceRootPath})` → `/chat`); the run is created on the first send. | Read (code) |
| E-016 | **Real usage (read only).** 11 Projects. Every one has exactly **one** linked folder. Task counts: AutoByteus 347 (TODO 161, IN_PROGRESS 9, DONE 150, CANCELLED 27); AutoByteus Agents 78; the other 9 have 1–8 each. | Measured (read-only count) |
| E-017 | **Managers serve several Projects.** Every assignment's `hostRoot` is an Agent run (no Team/Org hosts). Four manager conversations host all assignments; one (`project_task_manager_7c8dce0c…`, the run that delegated this Task) hosts Tasks of 6 Projects, another of 3. So a manager conversation is not one-per-Project today, and an existing manager would appear under several Projects. | Measured (read-only) |
| E-018 | Open assignments are few: AutoByteus 9 open entries, others 0–1. Most Tasks never had a run (AutoByteus: 164 of 347 have a run file). | Measured (read-only) |
| E-019 | Earlier ticket (autobyteus-72, R2 Draft): recommended a Project-owned coordination folder for the manager (DEC-001) and "sole link automatically; several: Project default with Task override; none: link one before dispatch" (DEC-002); one Project per new manager conversation (DEC-004); read-only history views of closed assignments. None was approved. | Read |
| E-020 | Since the earlier investigation (base `f13bdd0eb7`), relevant changes landed: task agents are runs with their own memory folder (CM-8), Task keys and titles, a task agent may hold several Tasks, adoption of user-started runs was withdrawn, Team-inside-Team removed, remote delegated runs listed in the tree, Task summary lines and Task locator in the Workspaces tree. The earlier evidence is re-established here rather than reused. | Read (`git log`) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current path | Outcome / invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open the app | Left panel: primary pages, then the run section, always the Workspaces tree (workspace → agent/team/org group → runs → delegated runs) | Runs organized by folder only | E-001, E-014 |
| BEH-002 | User | Start a manager | Choose a workspace's agent group "+" or New chat; the run gets that folder; it has no Project record | The manager appears under that folder; which Project it serves is in its conversation and board only | E-002, E-005, E-008, E-015 |
| BEH-003 | System | Manager `delegate_task(task_id)` | Copy starts in the manager's root, linked to the Task (`assigned`, `hostRoot`); listed nested under the manager run in Workspaces with a Task summary line | Task ↔ run link lives only in the Task's run-resource file | E-004, E-007, E-014 |
| BEH-004 | System | Agent sets Task DONE/CANCELLED | Open entries closed, runs stopped (unless another open Task), hidden from the tree, conversations kept | No manual archive of delegated runs is needed today | E-006 |
| BEH-005 | System | Copy starts | Copy gets the manager's folder | Project links play no part in execution | E-007 |
| BEH-006 | User | Open a worker from the board | Openable only if started, open and its host is listed (≤ 6 runs per agent per workspace) | Older hosts' workers unreachable from the board | E-012 |
| BEH-007 | User | Archive / delete runs | Per run or per group, inactive roots only | Hides or deletes whole roots | E-011 |
| BEH-008 | System | Changes / reconnect | `/ws/projects` feed and run streams keep Projects pages, Task lines and the tree live; node-local, desktop only | — | web projects.md Live Pages |

## Relevant Codebase And Technical Facts

| Path / component | Responsibility | Requirement implication | Architecture question |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Hosts the run section | Place for the mode switch | One section owner with two modes vs two panels |
| `autobyteus-web/components/workspace/history/*` | Workspaces tree rows, team rows, Task summary, stop, status | Projects mode must show the same rows and actions for the same runs | Reuse row components; avoid a second row implementation |
| `autobyteus-server-ts/src/projects/services/task-execution-resource-service.ts` | In-memory view of all run resources, current Task rules | Source for "which runs work on which Task" and "which roots host this Project's work" | A read for one Project's open work and hosts without scanning conversations |
| `autobyteus-server-ts/src/projects/services/task-root-view-builder.ts`, GraphQL `projectTasks` | Task view with its latest `root` only | Not enough for several assignments, sub-work, members | New Project-execution read surface |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-launch-resolver.ts` | Copy launch incl. folder | DEC-001/002 option B would need a Task-folder rule here | Only under option B |
| `autobyteus-server-ts/src/run-history/*`, `CreateAgentRunInput` | Run records and history listing | "Started for Project P" must be recorded and survive restart | Where the association lives (run metadata vs Project side); migration convention check |
| `autobyteus-web/stores/runHistoryStore.ts` (`limitPerAgent = 6`) | Workspaces listing | Projects mode must open hosts beyond the cap | Load/open a host by ID |
| `autobyteus-web/composables/runSettings/useRunStart.ts` | New chat presets | Start a manager for a Project with folder + Project | Extend the preset with the Project |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `projects/<pid>/project.json`, `tasks/<tid>/task.json`, `tasks/<tid>/agent_run_resources.json`, `ad-hoc-tasks/*`; run metadata (`memory/agents/<id>/run_metadata.json`, team/org trees) and history indexes.
- Readers/writers: `ProjectStore`, `TaskExecutionResourceService`, run-history catalog services.

### Structural Surfaces

- GraphQL Projects/Task reads, `/ws/projects` feed, run-history GraphQL, run streams, New chat draft/start, left panel tree, right Projects tab and Task locator.

### Potential Structural Impacts To Investigate (architecture phase)

- API: a Project-execution read (hosts, open Tasks with their runs) and live updates for it. Present: likely.
- Persistence: a durable "started for Project P" association for new manager runs. Present: likely; migration convention to be checked (`autobyteus-server-ts/docs/design/data_migration_guideline.md`). Existing runs need no rewrite (derived association, DEC-005).
- Lifecycle: none new under DEC-001 option A; under option B, delegation folder resolution changes.
- Prompt/context: the manager receives its Project as context.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Read-only Python counts over the user's Projects data (no writes, names and counts only) | Scale and shape of real data | E-016…E-018 | Measured | Every Project has one link; managers serve several Projects; few open assignments; many TODO Tasks never dispatched | commands in Source Log |

- No app, test or runtime was launched. No feature behavior was reproduced; nothing here is a bug reproduction (this is new behavior).
- Temporary diagnostics: none.
- Reproduction for implementation: none (new behavior).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open question |
| --- | --- | --- | --- | --- |
| User, 2026-10-31 (Task text) | Work Project by Project; run the manager under a Project; find dispatched work there instead of across many workspaces | Strong, direct | Projects mode with managers and Task work | — |
| User screenshot | Manager and its runs nested under one of many workspaces | Strong | Same rows, regrouped by Project/Task | — |
| User: "if the user is not using the project task manager to delegate, the user has to manually archive" | Work tied to Tasks cleans itself up when the Task closes | Strong | Already true for delegated runs (E-006); the Projects view should make it visible | Is anything more wanted? (DEC-004) |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Project Task Manager agent and skill | `autobyteus-agents` repository (outside this repo) | Board in `<workspace>/task-plans/`; Project chosen from the board | E-008 | A skill change to use the given Project context belongs to the agents repo (FU-001) |
| Collaboration model CM-6…CM-11 | `collaboration_model.md` | Task ownership, coordinating root, remote runs | E-010 | Must not be changed by this ticket |

## Persisted Data And State Facts

- Affected stored subjects: possibly a new record that a run was started for a Project. Existing Projects, Tasks, run resources and runs are read, not rewritten.
- Location and shape: see Payload surfaces.
- Volume: 11 Projects, up to 347 Tasks in one Project, 4 manager conversations hosting all assignments, ≤ 9 open assignments per Project (E-016…E-018).
- Current unknown/extra-field behavior: Project and Task readers keep recognized fields only (projects.md, Reading and writing).
- Must be preserved: all Project/Task data, run resources (assignment periods), run identities, conversations, settings, folders.
- Acceptable loss: none of user data; client view state (expansion, mode) may be rebuilt.
- Remaining gap: where the new association is stored (architecture).

## Product Design Request Context

- Product Design request in the current input: `Present` (since SR-003). The user, 2026-10-31: "i think we could first work on the UI? you can task @Product Team to work on the UI" (named collaborator `/product_team`). Before that, DEC-008 had judged a separate round unnecessary; the user's request overrides it.
- User's requested outcome: a Projects alternative beside Workspaces in the left panel; any agent or team run under a Project; a Project's tree like today's workspace tree; folder = the Project's first linked folder, else the temp workspace. Work on the UI first.
- Requirement IDs: REQ-001…REQ-015 (SR-002).
- Product decision to understand: the switch, the Project tree, the start surface with Project and folder, right-board coupling, states (see the request file).
- Request artifact: `product-design-request.md` (this folder); sent with `delegate_task` to `/product_team`.
- Product repository/ticket: established by the Product Team.

## Additional Evidence (SR-002)

| ID | Finding | How established |
| --- | --- | --- |
| E-021 | Run on an Agent from the Agents page starts a New chat on the temp workspace (`autobyteus-web/docs/chat.md` line 57, `startForDefinition`); New chat has a folder menu (`components/chat/ChatWorkspaceMenu.vue`); `chatDraftStore.startNewChat({agentDefinitionId, workspaceRootPath})` falls back to the temp workspace (`stores/chatDraftStore.ts` 203–217). | Read |
| E-022 | The Workspaces tree is projected from `runHistoryStore` groups by folder (`utils/runTreeProjection.ts` `buildRunTreeProjection`); a run row's delegated rows come from `agentRunCollaborationStore.taskRows(runId)` loaded by `inspect(runId)` for runs with `hasCollaboration` (`components/workspace/history/AgentRunTaskRows.vue`). History rows carry `workspaceRootPath`, no Project (`run-history/store/agent-run-history-index-record-types.ts`, `team-run-history-index-record-types.ts`). | Read |
| E-023 | Data Migration Guideline §3: adding an optional field whose absence has a truthful meaning needs no migration. | Read |

## Product Design Findings

- N/A — no Product Design package for this ticket. The earlier ticket's Product intake (autobyteus-72) produced no UI/UX spec and is not used.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `evidence/intake/user-screenshot-sidebar-pm-under-workspace-2026-10-31.png` | User (copied) | Problem evidence | BEH-001…003 | Evidence | Not behavior-defining |
| `/Users/normy/autobyteus_org/autobyteus-delivery-records/project-centric-execution-72-20261031/` | earlier Solution Designer | Earlier ticket's documents | E-019 | Historical input | Never approved; superseded by this package |
| `follow-ups.md` | Solution Designer | Follow-ups found | FU-001…FU-003 | Draft | N/A |
| `product-design-request.md` | Solution Designer | Product Design request (New Request) | REQ-001…015 | Sent to `/product_team` | Context only; the returned Product package needs the user's confirmation |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why it matters | Resolution / owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown (decision) | Manager folder and folder choice (DEC-001/002) | Decides whether delegation changes | User | Open |
| U-002 | Unknown (decision) | Which Tasks the left list shows (DEC-003) | Crowding vs completeness (161 TODO Tasks in one Project) | User | Open |
| U-003 | Unknown (technical) | How a manager is told its Project reliably (system context vs first-message context) on every runtime (AutoByteus, Codex, Claude, others) | REQ-005 | Architecture | Open |
| U-004 | Unknown (technical) | Live updates for hosts and Task work in Projects mode without reading all conversations | REQ-011 | Architecture | Open |
| R-001 | Risk | The manager skill picks its Project from its board, not from new context | Without FU-001 the manager may still ask which Project | Agents repo follow-up; the ticket still works (the user can say it) | Recorded |
| ASM-001 | Assumption | Agents with Project tools are installed on the node (no server-shipped manager) | Start needs an agent | Start lets the user choose any installed agent | Accepted |

## Architecture Investigation Findings

Not started; begins after requirements approval.

## Requirement Implications

- E-006 settles the "archive automatically" idea: delegated runs of a closed Task are already stopped and hidden; the Projects view must follow the same rule, and no new archive action is needed for them (DEC-004).
- E-007 + E-008 + E-016 make "the manager runs in the Project's linked folder" the smallest coherent workspace policy: workers already inherit the manager's folder, the manager keeps finding its board, and every real Project has exactly one link. The coordination-folder option needs a new delegation folder rule and moves the manager's memory (DEC-001).
- E-017 contradicts "one Project per manager conversation": existing managers serve several Projects. They must appear under each Project they dispatched for, as the same run, not copies (DEC-005).
- E-012 means Projects mode cannot rely on the Workspaces listing to open hosts (REQ-010).
- E-016/E-018: listing every open Task in the left panel would show 170 rows for one Project, while only ~9 have work; the left list is execution navigation, the board lists Tasks (DEC-003).

## Notes For Architecture Design

- Map SCN-001…SCN-010 after approval.
- Reuse `TaskExecutionResourceService` for host roots and open work per Project; do not add a second ownership truth (Task side owns the link; trees carry no Task data).
- Reuse the Workspaces tree row components and selection/open actions.
- Check the data-migration guideline before choosing where the Project association is stored.
