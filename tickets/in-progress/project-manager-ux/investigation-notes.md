# Investigation Notes

## Investigation Meta

- Package identifier: `project-manager-ux`
- Request / ticket: Make managing a Project through the Project Task Manager feel native in the UI (user conversation, 2026-10-06)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux` / `codex/project-manager-ux`
- Resolved base remote / branch / revision: `origin` / `personal` / `f48dbfbf39bbf9ed76116943e304248ca387dc7f` (fetched 2026-10-06); rebased onto `7d130309e` on 2026-10-07
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-005`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-06)
- Investigation status: Current-behavior investigation done for the requirements phase. The product experience is waiting on the Product Team, as the user asked.

## Initial Request And Clarifications

- Original request (paraphrased, user's words where possible): The product supports Projects and Tasks, and the agent repository has a Project Task Manager that plans Projects, creates Tasks and delegates them to agents and agent teams. In the UI, the left panel organizes agent runs (and teams/orgs) under workspaces. Talking to the Project Task Manager feels like talking to just another worker. The user wants it to feel native: "here is where I talk to the Project Task Manager", and it plans my tasks and delegates to workers. When it creates a new task, the user should actually see the task being created in the UI. Today they cannot. "The agents are the workers, but the Project Task Manager is more like the person who is organizing, creating tasks, delegating tasks."
- Clarifications received:
  - 2026-10-06: The user confirmed the reflected feeling ("Can you get what I mean? Can you have a feel how I feel?" → Solution Designer restated it as "sitting next to a project lead with a whiteboard"). The user then asked to hand the UI to the Product Team: "dedicate a task to @Product Team so i could discuss with product team to work on the UI. after the UI is done, then we come back to work."
- User-supplied facts and constraints: The agent package is at `/Users/normy/autobyteus_org/autobyteus-agents` (`agents/project-task-manager`).
- Initial ambiguity: Entry point (start from the Project or from the conversation), which agent counts as a Project's manager, one or many manager conversations per Project, phasing. These questions are passed to Product for design exploration (see requirements DEC-*).

## Product And Domain Understanding

- Product area: Projects / Tasks (`ENABLE_PROJECTS`, default off), Chat / standalone agent runs, left-panel Workspaces run tree, right-side tools.
- Affected actors or systems: Desktop user, the Project Task Manager agent (agent repository), worker agents and teams started by `delegate_task`.
- Existing user or operational purpose: Projects hold Tasks; any agent that selects the Project tools can manage them through Chat.
- Relevant terminology: Project, Task (TODO/IN_PROGRESS/DONE), delegated copy / task row, Workspaces tree, right tools.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | Code | `autobyteus-agents/agents/project-task-manager/{agent.md,agent-config.json,skills/project-task-management/SKILL.md}` | Manager behavior | A standalone agent: plans, writes `task-plan.md`, creates Tasks, dispatches one at a time with user approval, tracks to DONE. Tools: list_projects, create_or_update_project, list_project_tasks, create_or_update_task, list_available_agents, delegate_task, send_message_to, file/bash. | — |
| 2026-10-06 | Doc | `autobyteus-web/docs/projects.md` | Current Projects UI | Board with To Do / In Progress / Done, manual Refresh only, "No polling, status push or live subscription". "No Project manager agent is shipped… no Project-page chat or assignment panel is added." Task detail shows description, status, context files only. | — |
| 2026-10-06 | Code | `autobyteus-web/components/projects/ProjectTaskDetail.vue`, `ProjectDetail.vue` | Confirm UI | Task detail has no worker/run information; Project detail has Tasks/Workspaces tabs only. | — |
| 2026-10-06 | Code | `autobyteus-server-ts/src/projects/domain/task-agent-resources.ts`; `src/api/graphql/types/project-tasks.ts`; `autobyteus-web/types/project.ts` | Task ↔ worker linkage | The server stores, for each Task, the agent/team runs started for it (role, assignedBy, hostRoot, agentRun, start state, closedAt). The `ProjectTask` GraphQL type does not expose them; the web type has none. Agent tools see assignments through `list_project_tasks`. | Architecture phase |
| 2026-10-06 | Doc | `autobyteus-web/docs/chat.md` (delegation sections), `docs/agent_teams.md` (task rows, DONE closure) | How delegated work appears | Delegated copies show as ordinary task rows under the delegating run in the left Workspaces tree; they leave when their Task becomes DONE. The rows carry no visible Task identity. | — |
| 2026-10-06 | Doc | `autobyteus-web/docs/workspace_layout.md` | Shell surfaces | Left panel = navigation + run tree grouped by workspace; right tools = Files, Team members, Terminal, Activity, Token, Artifacts, Browser, VNC. No Project/Tasks tool exists. | — |
| 2026-10-06 | Doc | `tickets/done/remove-built-in-project-task-manager/requirements-doc.md` | Manager availability | The built-in manager was removed; the only Project Task Manager comes from the agent repository when that repository is configured. | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User picks the Project Task Manager in Chat or `@` | Ordinary standalone run under a workspace in the left tree; nothing ties it to a Project; the agent finds the Project with `list_projects` | Manager looks and behaves like any worker run | docs/projects.md "Agent Tools / Scope Exclusions" | High |
| BEH-002 | User | Manager calls `create_or_update_task` / `create_or_update_project` | Task is stored; the Projects board only shows it after the user opens Projects and clicks Refresh | No live update anywhere | docs/projects.md "Continuous Task Board / Physical Refresh" | High |
| BEH-003 | User | Manager calls `delegate_task` with `task_id` | A worker copy starts and appears as a task row under the manager's run; the Task's status only changes when the manager sets IN_PROGRESS; Task pages do not show the worker | Task ↔ worker link exists only on the server | task-agent-resources.ts; ProjectTaskDetail.vue | High |
| BEH-004 | User | Manager sets a Task DONE | Worker copies stop and their rows leave the tree; the board shows DONE after Refresh | — | docs/agent_teams.md | High |
| BEH-005 | User | User opens Projects | Projects list → Project detail (Tasks board / Workspaces) → Task detail/edit; user can create/edit/delete Tasks manually | Status is read-only in the UI | docs/projects.md | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/projects/*`, `stores/projectTaskStore.ts` | Projects pages, board, manual Refresh | Live board needs a change notification path | Server push vs. polling; who publishes Task changes |
| `autobyteus-server-ts/src/projects/stores/task-agent-resource-store.ts` | Per-Task run resources | "Who is working on this Task" data already exists | Expose through GraphQL; map to run-tree rows |
| `autobyteus-web/components/workspace/history/*` | Left run tree grouped by workspace | Manager vs. worker distinction is purely presentational today | How to mark/group a manager run |
| Right tools catalog (`workspace_layout.md`) | Fixed tool order | A Project/Tasks tool would be a new entry | Placement and conditions |

## Product Design Request Context

- Product Design request in the current input: `Present`
- User's requested outcome, in the user's own terms: "dedicate a task to @Product Team so i could discuss with product team to work on the UI. after the UI is done, then we come back to work."
- Requirement / behavior IDs involved: BEH-001..005; requirements UC-001..UC-004, DEC-001..DEC-005 (draft).
- Product decision, uncertainty, or experience to understand or evolve: How the user talks to the Project Task Manager and watches the Project's Tasks being created, assigned and finished, so the manager feels like the organizer of the Project and not one more worker.
- Critical journey and states: see requirements SCN-001..SCN-004.
- Known constraints and non-goals: see requirements Scope Guardrail.
- Relevant existing-product or frontend context: this file's Source Log.
- Product Design request artifact / message reference: `product-design-request.md` in this folder.
- Established separate design repository/root and ticket reference: Unknown; Product Team owns it.

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/` (`product-ticket.md`, `ui-ux-spec.md`)
- Visualizer or UI reference source path: `/Users/normy/autobyteus_org/autobyteus-web-design` (branch `design/project-manager-ux`, design `1fcf8f8`, close `eb60aba` = design-repo `origin/personal`)
- Approved UI/UX specification path: `.../tickets/done/project-manager-ux/ui-ux-spec.md` (Status Approved)
- Explicit user-confirmation reference: 2026-10-07, "Perfect, I'm satisfied. I'm satisfied now. It's confirmed."
- Journeys and scenarios validated: UXJ-001..004 (live arrival, open the root, outcomes, left panel across pages)
- Final visual-reference paths: `visual-references/VIS-001..VIS-010` (checked present on 2026-10-07; VIS-004 and VIS-005 viewed)
- Product decisions supported by evidence: no Manager-specific UI; live Projects pages; Task → root only; left panel kept; row clicks open from any page
- Alternatives rejected: Manager bar, Tasks tab beside the chat, Project grouping/Task labels in the tree, header chips, New chat binding, helper runs on a Task, member count
- Mocked boundaries and production gaps: root data (not in GraphQL), live push, the F-006 click fix
- Requirements sections affected: all (SR-002)
- Consistency verification (Solution Designer, 2026-10-07): The spec, ticket record, handoff message and design repo agree on the repository, ticket, revisions, confirmation and artifact paths. The spec links the runnable reference and the final screenshots. No Result Correction is needed.
- Gap found during integration: the spec does not define the root status for (a) a shut-down-but-open root (`offline` in the tree) or (b) a still-starting root. Proposed as DEC-006 for user approval.

## Additional Source Log (2026-10-07)

| Date | Source Type | Exact Source | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-10-07 | Code | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-agent-resource-port.ts` | DEC-007 helper feasibility | `TaskAgentResourceRole = "assigned" \| "delegated" \| "broughtIn"`; `delegated`/`broughtIn` entries record their `creator` run, so every helper run of a Task is already recorded |
| 2026-10-07 | Doc | `autobyteus-server-ts/docs/modules/projects.md` "Agent Run Resources" | Role meaning | `assigned` = a non-owned run's `delegate_task(task_id)`; `delegated` = an owned run's `delegate_task` without task_id; `broughtIn` = an owned run's `send_message_to` that started a copy |
| 2026-10-07 | Code | `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue:85` | F-006 | `if (!props.runSelected) emit('select-run')` confirmed in the task worktree base `f48dbfb` |

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `product-design-request.md` | Solution Designer | Round-1 handoff context for the Product Team | UI/UX exploration | REQ-001..REQ-010 | Completed | Not behavior-defining |
| `product-design-request-r2.md` | Solution Designer | Round-2 handoff context (Temp tasks) | UI/UX exploration | REQ-011..016 | Completed | Not behavior-defining |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md` + `visual-references/` VIS-001..018 | Product UI/UX Designer (external) | Normative UI/UX, rounds 1–2 (round 1 `1fcf8f8`/`eb60aba`, round 2 `492d37a`/`8cd41f8`) | Projects pages, Temp tasks | REQ-002..016 | User-confirmed 2026-10-07 | Behavior-defining; part of the SR-003 approval (DEC-006 deviation) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Which agent is a Project's manager (no built-in exists) | Decides how the UI finds or starts the manager | User decision, informed by Product | Open |
| RSK-001 | Risk | Projects is off by default; the manager comes from a separate agent repository | The experience must handle "no manager available" | Product + requirements | Open |

## Architecture Investigation Findings (2026-10-07, SR-003 approved)

Base refreshed: the task branch was rebased onto `origin/personal@7d130309e` (2026-10-07; includes `reactivate-done-task-runs`). Authorities read: `references/architecture-design.md`, `design-principles.md`, `/DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (all 2026-10-07).

| # | Source | Finding | Design implication |
| --- | --- | --- | --- |
| A1 | `autobyteus-server-ts/src/api/websocket/index.ts`, `application-backend-notifications.ts`, `file-explorer.ts` | App-level websocket pattern: route → `authorizeRemoteAccessWebSocket` → hub `connect/disconnect/send`. No Projects/Task push exists. GraphQL has no subscriptions. | New `/ws/projects` route plus a Projects change hub, following the notification-hub pattern |
| A2 | `projects/services/project-service.ts` (create/update/delete, workspace links), `project-task-service.ts` (create/update/delete/updateTaskById/link/markStarted/markFailed/closeAndWrite/reopenAssignment/deleteAdHocTasksHostedBy) | All Project and Task writes, from UI GraphQL and agent tools alike, go through these two services | Publish change events from these owners after commit; this covers every write path |
| A3 | `projects/services/task-agent-resource-service.ts` `swap()` | The single commit point for every run-resource change (link, start, fail, close, reopen, forget) | Root (worker) changes are published from the committed swap |
| A4 | `projects/domain/task-agent-resources.ts`; schema reader/writer | Entries hold role, assigner, hostRoot, agentRun (+ coordinator), start/startError, closedAt. They hold **no address or name** ("never stores … addresses"). A failed start has no execution-tree node (the tree is written at activation commit, `root-task-dispatch.ts`). | A worker that couldn't start has no name source. The design must record the recipient address on the assignment. |
| A5 | `agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Stored-tree lookup by root + agentRunId gives `memberAddress` / `groupPath`. It reads stored trees (I/O per root). | Rejected as a name source: it would add per-read tree I/O, offers nothing for failed starts, and would be a fallback read for older entries |
| A6 | Roots call `RootTaskExecutionLifecycle.onAgentStatus(agentRunId, status)` (`standalone-agent-run-root.ts:316-318`, `agent-org-run.ts:276-278`, `team-task-execution-service.ts:41`) | One root-neutral status chokepoint for every agent status change, including idle shutdown (`publishAgentOffline` → status overlay) | Worker-status change notifications start here |
| A7 | `standalone-agent-run-root.ts` `getAgentStatusSnapshots`; `root-team-run.ts` `getLeafAgentStatusSnapshots`; `agent-org-run.ts` `getAgentStatusSnapshots` | Active roots can report live leaf-agent statuses; children without a live execution report `offline` | The worker status is computed on demand from the root that hosts it; no duplicated status state |
| A8 | `agent-collaboration/execution/services/active-collaboration-root-directory.ts` `ActiveRootMessageBoundary` | Process lookup of active roots by identity; already exposes the optional `releaseTaskAgentResources` for the Task side | Extend it with an optional `taskExecutionStatus(reference)`. Inactive or missing root = offline. |
| A9 | `autobyteus-web/utils/workspaceTeamAggregateStatus.ts` `foldTeamAggregateStatus` | Team status = the highest rank of member statuses (offline < idle < error < initializing < running) | A team worker's status must use the same fold. Move it into `@autobyteus/collaboration-stream-contracts` so server and web share one rule. |
| A10 | `autobyteus-web/stores/agentRunCollaborationStore.ts` (`syncHost`: live stream only for the selected running host) | Left-panel task rows are live only for the selected run; other roots show stored (offline) views | A web-derived worker status would be wrong for non-selected roots. The server computes it (the user's rule "reflect what it is"). |
| A11 | `components/workspace/history/AgentRunTaskRows.vue:85`; `composables/useWorkspaceHistorySelectionActions.ts`; `components/AppLeftPanel.vue` `onRunningRunSelected`; `services/workspace/workspaceNavigationService.ts` `resolveSelectionRoute` | F-006 is confirmed: task-row select skips `select-run` when the host run is selected, so no route push happens. Navigation is owned by `resolveSelectionRoute` + push in AppLeftPanel. Team and member rows always emit `run-selected`. | Fix it at the task-row owner. Task-root opening reuses the same selection actions and route resolution. |
| A12 | `autobyteus-web/stores/projectTaskStore.ts` (per-project snapshots, read/write/delete epochs, manual Refresh); `projectStore.ts` | Snapshot store with stale-response guards; no event input | Extend the store to apply change events and to hold a no-project (Temp tasks) list |
| A13 | `projects/stores/ad-hoc-task-store.ts` | read/create/update/delete by ID; **no list** | Add a list (directory enumeration, damaged files skipped and logged) |
| A15 | `configured-agent-execution-handle.ts:383-384`; `standalone-agent-run-root.ts:313-317` (ARCH-REV-001 P-001, verified by the Solution Designer 2026-10-07) | A wake publishes the first `AGENT_STATUS` before `overlay.clear()`; roots dispatch `onAgentStatus` synchronously | Publication reads after the dispatch (Publication Contract) |
| A16 | `WorkspaceAgentOrgHistoryCollection.vue` (ARCH-REV-001 residual note) | Org actions `onInspectAgentOrgExecution(run, agentRunId, address)` and `selectTaskTeam` exist | DS-004 reuses them for org-hosted roots |
| A14 | `api/graphql/types/project-tasks.ts` `ProjectTask` | No root fields; `projectTasks(projectId)` only | Add `root` to the Task view; add a `tasksWithoutProject` query |


The core gap is presentational and contractual: the server already knows Tasks and their runs, but the UI shows neither live nor connected. Requirements focus on: a clear place to talk to the manager about a Project, Task changes visible as they happen, and Task ↔ worker links.

## Notes For Architecture Design

Deferred until requirements approval after the Product result.
