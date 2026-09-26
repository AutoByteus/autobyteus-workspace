# Investigation Notes
## Investigation Meta
- Package: task-agent-peer-sidebar
- Repository mode: Git
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar
- Branch: codex/task-agent-peer-sidebar
- Base: origin/personal at 1676bede9d910ca40dc0331390a35f203206fd41
- Finalization target: personal (tracked integration branch); no finalization performed.
- Bootstrap: git fetch origin succeeded; dedicated worktree created from refreshed tracked default origin/personal.
- Shared integration checkout contains unrelated untracked outputs; left untouched.
- Status: requirements investigation, approval pending.
## Initial Evidence
- User screenshot depicts task card nested under x_marketer in expanded Marketing Team run. User wants parallel placement without expanding the original agent.
- Reference: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8289f8f8d720474ba58e7053dfa664df/solution_designer_1b7b11abc64d444c866c24974df1b2c9/context_files/ctx_616ce0405be7__image.png
- Read solution-designer skill, requirements standards/templates, and autobyteus-web/AGENTS.md.
- Product Design & Prototyping request: Not stated; no Product handoff requested.

## Source Log And Findings (2026-09-26)
All relative paths below are inside the task worktree.
- `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue`: iterates `team.executionRows`; collapsedDepth skips deeper rows beneath collapsed parents. Stable row activation toggles rows with children. Confirms that depth affects visibility, not just padding.
- `autobyteus-web/stores/runHistoryTeamExecutionRows.ts`: consumes `context.view.listNavigationRows()`, subtracts root depth and derives hasChildren from expandable/parentKey. Task row identities use execution keys and agentRunId; no-context fallback supplies stable rows only.
- `autobyteus-web/components/workspace/history/WorkspaceStableExecutionRow.vue`: disclosure controlled by hasChildren, indentation by depth, accessible level depth+1. Normal agent keyboard/click activation and status must remain supported.
- `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue`: distinct dashed/ghost treatment, task description/status, run-specific inspection, selection and loading/error/retry; keyboard activation exists. Preserve these while changing placement.
- `autobyteus-web/utils/agentOrgHistoryRows.ts:120-158`: root Org tasks are appended at depth 0; tasks in a Team are appended at depth 1 alongside that Team's agents. Confirms the user's parallel-layout comparison in current code; does not require Org changes.
- `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`: renders projection depth and run-specific inspection actions.
- `autobyteus-web/stores/__tests__/runHistoryTeamExecutionRows.spec.ts`: separate task Agent/Team execution identities and retained task descendants covered. Some fixtures include historical nested configured Teams; tests alone do not authorize supporting new nested-Team configuration.
- `autobyteus-web/docs/agent_teams.md`: current Teams are flat Agent-member definitions; delegation and retained task inspection are supported. Historical task-agents-workspace-tree-ux requirements supplied context only, not authority for this new request.
- `autobyteus-web/ARCHITECTURE.md`: frontend Nuxt/Vue/Pinia and colocated Vitest strategy. Generic backend description is stale relative to server-ts; not used as backend authority.
- Commands: `git status --short`, `git symbolic-ref refs/remotes/origin/HEAD`, `git fetch origin`, `git rev-parse origin/personal`, dedicated `git worktree add`, targeted `rg`, `cat`, `sed` source reads. No app execution or test run performed; evidence is user screenshot plus source inspection.

## Supported Behavior And Scenario Basis
BEH-001 / SCN-001: Team delegation creates separately inspectable task execution; screenshot shows an agent disclosure required to expose it. Desired peer display is proposed, not approved.
BEH-002 / SCN-002: existing row handlers support mouse/keyboard exact execution inspection, task status and error feedback.
BEH-003 / SCN-003: documented retained inspection and multi-execution identities justify regression protection. No-context fallback cannot show absent task metadata; no new history acquisition requirement introduced.

## Structural / Payload Inventory
Existing display projection, row renderers and history context/navigation APIs are relevant. Potential depth/parent coupling requires architecture investigation after approval. No backend/API/schema/data-writing change requested or established as necessary. Shared identity/lifecycle changes would exceed the proposed scope.
Persisted data: task/run/conversation identities and stored history must remain untouched; volume/retention not relevant to this presentation request. No data loss permitted. Expansion preference compatibility may require investigation, not an invented migration.

## Supplement Inventory
User screenshot (absolute path above): user-owned current-state evidence for REQ-001, AC-001; not normative target visual. No Product-owned supplements. No Product Design handoff explicitly requested.

## Unknowns And Architecture Follow-up
- User approval of proposed scope and immediate-after-agent ordering pending.
- Verify navigation source, selection-driven expansion and retained task projection boundaries after approval.
- New behavior in nested configured Teams is excluded; legitimate task-Team containment should remain intact.
- No live rendered reproduction beyond supplied screenshot yet. Rendering and executable validation belong downstream.

## Requirements Outcome
Canonical requirements are Ready for Approval, baseline SR-001. Technical design, classification and implementation not started. Routine approval hold; no specialist handoff appropriate.

## Architecture Investigation — SR-002 (2026-09-26)
Approval: user “Approve now work on it.” after SR-001 proposal and Org peer-row clarification. Requirements now Approved; prior pending statements above are the chronological initial investigation, not current status.
Isolation reconfirmed: branch codex/task-agent-peer-sidebar at base 1676bede9; only this package is untracked. No source changes or implementation performed.

### AE-001 — Exact source of nesting
Read autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts:190-319:
- projectNavigationRows produces a depth-first flat row list. Configured-member address matches place tasks immediately after that member at depth +2 with its AgentRun key as parent; unmatched tasks stay within the containing Team.
- addTaskMembers uses the same match-and-nest pattern inside task Teams.
- addAgent always declares expandable=false, but history derives parenthood from child parentKey.
- Task Agents are leaves; task Teams contain real member descendants. Source navigation is used by other surfaces (TeamMembersPanel, mobile focus, token rows, running Teams).
Implication: isolate requested sidebar change at existing history presentation adapter; do not broaden shared navigation semantics or change execution tree.

### AE-002 — Consistent downstream topology
autobyteus-web/stores/runHistoryNavigationProjection.ts:125-139,192-201 calls the history execution-row builder and derives member-ancestor indexes from those display rows' depth/hasChildren.
runHistoryStore.ts:475-485 exposes that index through getTeamMemberNavigationAncestorRowKeys.
composables/useWorkspaceHistoryTreeState.ts:294-306 uses the index to expand ancestors; initial expansion state is ref<Record<string,boolean>>({}) (lines 47-55), not a serialized migration surface.
Implication: changing display depth/hasChildren together in the existing row builder updates disclosure, branch graphics and auto-reveal together. No parallel ancestry algorithm should be introduced.

### AE-003 — Exact execution inspection remains unchanged
components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:402-412 forwards root TeamRun ID, memberAddress and exact agentRunId from selected row.
composables/useWorkspaceHistorySelectionActions.ts:110-127 creates selection intent, expands ancestors, calls runHistoryStore.selectTreeRun, emits committed selection.
Existing inspection/load/retry in stable/transient components remains unchanged. Never identify a task only by address (multiple executions share it).

### AE-004 — Lifecycle and availability
services/teamExecution/teamExecutionViewState.ts:207-220: navigationPurpose selects LIVE_EXECUTION vs HISTORICAL_INSPECTION from root activity; inspectionRows separately includes retained history.
teamExecutionTreeSelectors.ts:223-235 filters settled tasks only for LIVE_EXECUTION. Keep this upstream policy authoritative. No-context history fallback remains configured rows only; do not fabricate tasks.
Existing tests: stores/__tests__/runHistoryTeamExecutionRows.spec.ts, runHistoryNavigationProjection.spec.ts; components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts; WorkspaceTransientExecutionRow.task-monitor.spec.ts; collaboration/__tests__/RetainedTeamTaskNavigation.spec.ts.
Component test currently expects stable-agent toggle and task aria-level 2; these fixture assumptions must change to peer topology.

### AE-005 — Validation surface
Existing browser harness: autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs and tests/e2e/fixtures/task-agent-monitor-visibility.page.vue. Available as downstream starting point, not evidence that validation has run.
Commands: targeted rg, sed/cat source reads; git status --short and git branch --show-current. No executable tests or rendered prototype claimed.

### Completed Evidence Assessment
No persistence schema/reader/writer, API, security, concurrency, deployment or runtime ownership changes are needed. Existing root-relative history row model expresses peers without adding fields. No shared navigation contract changes needed.
Residual verification: browser rendering, live/retained regression tests and correct task-Team containment must be executed downstream. No unresolved behavior decision.
