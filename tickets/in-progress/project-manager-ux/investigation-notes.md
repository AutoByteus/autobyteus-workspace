# Investigation Notes

## Investigation Meta

- Package identifier: `project-manager-ux`
- Request / ticket: Make managing a Project through the Project Task Manager feel native in the UI (user conversation, 2026-10-06)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux` / `codex/project-manager-ux`
- Resolved base remote / branch / revision: `origin` / `personal` / `f48dbfbf39bbf9ed76116943e304248ca387dc7f` (fetched 2026-10-06)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
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

- Pending the Product Team result.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `product-design-request.md` | Solution Designer | Handoff context for the Product Team | UI/UX exploration | REQ-001..REQ-006 | Sent | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Which agent is a Project's manager (no built-in exists) | Decides how the UI finds or starts the manager | User decision, informed by Product | Open |
| RSK-001 | Risk | Projects is off by default; the manager comes from a separate agent repository | The experience must handle "no manager available" | Product + requirements | Open |

## Requirement Implications

The core gap is presentational and contractual: the server already knows Tasks and their runs, but the UI shows neither live nor connected. Requirements focus on: a clear place to talk to the manager about a Project, Task changes visible as they happen, and Task ↔ worker links.

## Notes For Architecture Design

Deferred until requirements approval after the Product result.
