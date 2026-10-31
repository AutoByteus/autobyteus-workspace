# Product Design Request — Projects view in the left panel

- Purpose: New Request
- Package: `projects-left-navigation` (Project Task `autobyteus-347`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: the user, 2026-10-31, in the Solution Designer's conversation: "i think we could first work on the UI? you can task @Product Team to work on the UI"
- From: Solution Designer (software engineering team), run `solution_designer_7591e3d191704d25a3396b3020a41127`
- Software worktree (read only for Product): `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`, branch `codex/projects-left-navigation`, base `origin/personal` `8faae96899`
- Approved requirements: `tickets/in-progress/projects-left-navigation/requirements-doc.md` at SR-002 (approved 2026-10-31)

## What the user wants

A **Projects** alternative beside **Workspaces** in the app's left panel, so work done Project by Project is found in one place. The user's words (2026-10-31):

- "I use the project task manager to work on certain project… I run the project task manager under a certain project… On the workspace view it's OK, but I have a lot of workspaces."
- "Does it have to be like a project manager? I guess it can be any agent, right? … the project task manager is also just another agent … how do I run one agent under a certain project?"
- "the task management tree was already super nice to appear on each project."
- On folders: "if the project doesn't have workspace, then we use the temp workspace … If the project has a workspace, then we will use the project first workspace." "we also don't want to make it mandatory."

He now asks to work on the UI first, before the technical design and build.

## What the design should answer

1. **Switching Workspaces / Projects** in the left panel's run section (today headed "Workspaces" with "+" to add a workspace), and how the collapsed left strip's Workspaces icon behaves in each mode.
2. **A Project in the tree**: Project rows, the Project's agent and team groups, runs, and delegated runs nested below with their Task line — the same shape as a workspace today (see the user's screenshot). Where the "+" to run an agent or team under a Project sits, and the "+" on a group.
3. **Running an agent or team under a Project**: the start surface (today's New chat) showing which Project it is for and which folder it will use (the Project's first linked folder, or the temp workspace when the Project has none), with the folder still changeable.
4. **The right panel**: selecting a Project in the left panel makes it the Project shown on the right Projects board; a delegated run's Task line shows its Task there (exists today).
5. **States**: no Projects yet; a Project with no runs; loading; read error with Retry; a run that serves several Projects (listed under each); delegated work leaving when its Task is closed (exists today in Workspaces); keyboard focus; English and Chinese labels; narrow desktop window and the collapsed strip.

## Settled behavior (do not redesign; ask if it seems wrong)

From the approved requirements (IDs in `requirements-doc.md`):

- REQ-001: switching modes changes only the tree; it never opens, starts, stops or changes the open conversation; the choice is remembered.
- REQ-002/003: Projects listed by name; under a Project, runs grouped by agent and team like a workspace. A Project's runs = runs started under it + runs that dispatched its Tasks (existing runs appear with no data change). A run serving several Projects is listed under each, as the same run.
- REQ-004/005/006: any agent or team can be started under a Project; folder = the Project's first linked folder, else the temp workspace; changeable before sending; never mandatory; the run is told its Project.
- REQ-007: Tasks stay on the right board; no Task list in the left panel.
- REQ-008: under Project P, a run shows only its delegated work for P's Tasks (work for other Projects shows under those Projects); Temp-task work only under runs started under P.
- REQ-009: closing a Task removes its delegated runs from the tree, as today; top-level runs are not archived automatically.
- REQ-014: Archive / Delete / Stop on runs as in Workspaces; group "Archive all" scoped to the Project.
- Out of scope: a Task list in the left panel, starting Agent Orgs under a Project, moving runs between Projects, viewing closed Tasks' conversations, mobile.

## Feasibility status

- All UI elements above rest on data that exists today or on records this ticket adds (a run "started under Project P"). Nothing depends on uncertain technology.
- Not yet designed technically: how live updates reach the Projects tree (REQ-011) and how a run is told its Project on every runtime (REQ-006). Neither should change what is visible.

## Existing product context

- Left panel: `autobyteus-web/components/AppLeftPanel.vue`, `components/workspace/history/*` (WorkspaceAgentRunsTreePanel, WorkspaceHistoryWorkspaceSection, AgentRunTaskRows, TaskWorkerTaskSummary).
- Right Projects tab and Task locator: `autobyteus-web/docs/projects.md` (§ Projects tab in the right panel, § Task summaries in the Workspaces tree).
- Shell, strip and drawer: `autobyteus-web/docs/workspace_layout.md`.
- The user's screenshot: `tickets/in-progress/projects-left-navigation/evidence/intake/user-screenshot-sidebar-pm-under-workspace-2026-10-31.png`.
- The ASCII sketch in `requirements-doc.md` § Sketch is illustrative only.

## What to return

A design package the user has reviewed and confirmed, with the final references and any open questions, to the Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`). The Solution Designer integrates the approved UI into the requirements and then writes the technical design.
