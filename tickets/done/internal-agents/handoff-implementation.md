# Handoff — Architecture Design Complete (autobyteus-308)

- Package: `internal-agents`, Project Task **autobyteus-308** (part of autobyteus-32, Model Router)
- From: Solution Designer; To: Implementation Engineer (direct route: task_size **Medium**, architectural_risk **Low**)
- Date: 2026-10-25; Solution revision SR-001

## Request and goal

An agent definition may carry `"internal": true`; server setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`, off by default). While off, internal agents and their runs are left out of the Agents list, all agent pickers, run history, the Memory page, `list_available_agents`, @-mentions, `list_agent_definitions` and peers' catalogs; `delegate_task` to one is refused with today's "not an available agent" message. While on, they appear like other agents (badge "Internal"). Direct access by ID keeps working. First user: the built-in Model Router of autobyteus-32.

## Approval basis

`requirements-doc.md` SR-001, approved by the Solution Designer within the direction (user informed 2026-10-25).

## Artifacts

- /Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents/tickets/in-progress/internal-agents/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents/tickets/in-progress/internal-agents/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents/tickets/in-progress/internal-agents/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents/tickets/in-progress/internal-agents/solution-revision-record.md

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`, branch `codex/internal-agents`, base `origin/personal` `651071758f`; target `origin/personal`. Ticket documents uncommitted.

## Constraints (Task)

Nothing exposed to agents automatically; synthesized data only in tests; prove from a clean clone; no release unless asked; clean up. The stale analysis worktree `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility` is not to be touched (the Task Manager asks the user).

## Risks

RSK-001: a browsing surface outside the listed owners; validation walks every picker and list.

## Next expected action

Implementation per `design-spec.md`, then the route the handoff rules give (API/E2E validation).

## Route taken

- 2026-10-25: rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
