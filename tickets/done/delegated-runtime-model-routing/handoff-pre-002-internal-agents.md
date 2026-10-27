# Handoff — Prerequisite PRE-002 of autobyteus-32: internal agents

- From: Solution Designer (autobyteus-32, Model Router)
- To: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Date: 2026-10-25
- Classification: `Waiting For Prerequisite` (autobyteus-32 waits for this Task)
- Decided by: the user, in the Solution Designer conversation of 2026-10-25: internal agents first as a small Task ("okayyy. then ask the project task manager to create one task and then lets work on this").

## What is asked

Create a Project Task for internal agents, **part of autobyteus-32**, make autobyteus-32 depend on it, and give it to this Solution Designer (same copy). autobyteus-32 waits and resumes with the router core afterwards.

## Suggested Task

**Title:** Internal agents: an `internal` agent attribute and a "Show internal agents" server setting

**Description (suggested text):**

Some agents are the system's own helpers (first: the Model Router of autobyteus-32), not agents the user works with. Mark them and keep them out of the user's way unless the user wants to see them for debugging.

- **Attribute:** an agent definition may carry `"internal": true` in its `agent-config.json`; absent means a normal agent (no change to existing agents, no data migration).
- **Setting:** server setting "Show internal agents", **off by default**, editable in Settings (and by environment variable like other server settings).
- **While off:** internal agents and their runs are left out of the Agents list, agent pickers (new run, team member choice) and the run history; `list_available_agents` never offers them; `delegate_task` to one is refused with a clear message. They still run when the system starts them, and their runs are still recorded.
- **While on:** they appear like any other agent.
- Opening an internal agent's conversation from a system surface (e.g. the Model Routing page in autobyteus-32) works even while hidden.

**Done when:** an agent marked internal is hidden everywhere above while the setting is off and visible while it is on; delegation to it is refused while hidden; existing agents are unchanged; covered by tests; the user has verified it in the desktop app; merged to personal.

**Out of scope:** the Model Router itself (autobyteus-32); hiding internal agents from other nodes' catalogs beyond what `list_available_agents`/peer catalog already derive from the same rule (to be traced in design).

## Context

- An unfinished, never-merged earlier analysis of the same idea for the removed Memory Compactor exists (untracked, Sept 2026): `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility/tickets/in-progress/internal-agent-frontend-visibility/` (setting `AUTOBYTEUS_SHOW_INTERNAL_AGENTS`; filter points `AgentDefinitionService.getVisibleAgentDefinitions`, `AgentRunHistoryService.listRunHistory`). Its worktree/branch `codex/internal-agent-frontend-visibility` is stale; the Task Manager may want it cleaned up separately.
- autobyteus-32 requirements (SR-007, `requirements-doc.md` REQ-008) state the same behavior; the user's decisions of 2026-10-25 are recorded there.
