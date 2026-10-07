# Product Design Request — `project-manager-ux`

- Status: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `project-manager-ux`
- Current solution revision: `SR-001` (requirements `Draft`, not approved)
- From: Solution Designer (`/solution_designer`)
- Date: 2026-10-06
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux` (branch `codex/project-manager-ux`, base `origin/personal` @ `f48dbfbf3`; finalization target `origin/personal`)

## The user's request, in their words

> "dedicate a task to @Product Team so i could discuss with product team to work on the UI. after the UI is done. then we come back to work"

The user wants to work out the UI with you directly. When the UI is settled, the work comes back to Solution Designer for requirements approval, architecture and implementation.

## What the user wants to feel

The user has Projects and Tasks, plus a **Project Task Manager** agent (from `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager`). The manager plans a request into Tasks, creates them, delegates each Task to an agent or agent team with the user's approval, and tracks them to DONE.

In the user's words: "the agents are the workers, but the Project Task Manager is more like the person who is organizing, creating tasks, delegating tasks." Today it does not feel that way:

- The manager is just another chat run under a workspace in the left panel. It looks exactly like a worker.
- When the manager creates a Task, the user does not see it. They have to leave the chat, open Projects and click Refresh.
- A Task does not show which agent or team is working on it. The worker rows in the left panel do not show which Task they serve.

The user confirmed this image of the target feeling: **sitting next to a project lead with a whiteboard.** You say what you want. The lead writes the Tasks on the board in front of you, and you see each one appear. When they hand a Task to a team, it moves to In Progress with that team's name on it. You can look at the board at any time and click into any worker. The manager is clearly in charge; the workers clearly work for it.

## Decision the user wants to explore with you

How should the product present "managing a Project with the Project Task Manager" so that it feels native? In particular:

1. **Entry point (DEC-001):** start from the Project (Project page with the manager beside the board), from the conversation (chat with a live Tasks panel next to it), or both linked.
2. **Live Tasks:** how Tasks appearing, being assigned, moving through To Do / In Progress / Done look while the user talks to the manager.
3. **Task ↔ worker:** how a Task shows its agent/team (status) and how the user opens that worker; how a worker run shows the Task it serves.
4. **Manager vs. worker:** how the manager's conversation is recognizable as the Project's organizer in the left panel.
5. Optional, for phasing (DEC-004): showing the manager's "created Task" / "assigned to X" actions as cards in the conversation instead of raw tool calls.

Open questions the user may want to settle with you: which agent is a Project's manager (DEC-002), one or several manager conversations per Project (DEC-003). See `requirements-doc.md`.

## Critical journeys and states (draft)

- SCN-001: Open the manager for a Project → describe the request → the manager plans in that Project's context.
- SCN-002: The manager creates Tasks → they appear live.
- SCN-003: The manager delegates a Task → the Task shows the worker and its status → the user opens the worker.
- SCN-004: The user finds the manager among many runs.
- States to consider: empty Project, planning, waiting for the user's dispatch approval, several Tasks in progress, worker failed to start, Task DONE (its workers stop and their rows leave the left tree), no manager agent available, Projects disabled.

## Established constraints and non-goals

- Task semantics stay the same: TODO / IN_PROGRESS / DONE. Only agent tools change status; the UI shows status read-only. DONE stops the Task's workers and removes them from the run tree.
- The manager asks the user to approve each dispatch. That approval happens in the conversation.
- Projects is behind `ENABLE_PROJECTS` (off by default); desktop only, no phone support.
- Existing Projects pages, manual Task authoring, Chat/`@`, and the workspace-grouped left run tree must remain usable.
- No auto-scheduling, auto-dispatch or auto-DONE by the UI.
- No manager agent ships with the app. It comes from the agent repository when that repository is configured.

## Existing product context (evidence)

- Projects UI: `autobyteus-web/docs/projects.md`. Routes `/projects`, `/projects/:id` (Tasks board, Workspaces tab), `/projects/:id/tasks/:taskId`. Board: To Do / In Progress / Done columns, search, manual Refresh.
- Shell: `autobyteus-web/docs/workspace_layout.md`. The left panel has navigation plus a run tree grouped by workspace. Right tools: Files, Team members, Terminal, Activity, Token, Artifacts, Browser, VNC.
- Delegated workers in the left tree: `autobyteus-web/docs/agent_teams.md`, `docs/chat.md` (task rows; they leave when the Task is DONE).
- Feasibility note: the server already records which agent/team runs were started for each Task, but this is not yet exposed to the UI. Live Task updates do not exist yet. Both are feasible.

## Canonical artifacts

- Requirements (Draft): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`

## Expected output

Your design result, reviewed with and confirmed by the user, returned to Solution Designer (`/solution_designer`). Include the UI/UX specification and final references, the user's decisions on the open questions, and anything rejected or still open. Solution Designer will then fold the approved UI into the requirements, get the user's approval and continue with architecture.

## Routing record

- `get_handoff_rules` (2026-10-06): no configured rule covers Product Design.
- The user explicitly asked for this to be delegated to `@Product Team`, so it was sent with `delegate_task` to `/product_team`.
- Delegation succeeded on 2026-10-06. Product run ID: `product_ui_ux_designer_9ea6001c1557486cbd1546c60cab4046`; task ID: `ad_hoc_task_6750625c-f6dd-4285-8570-8c46c5934f37`. Set that task to DONE only once the Product work is finished.
