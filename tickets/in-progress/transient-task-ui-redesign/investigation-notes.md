# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Frontend/backend code paths inspected; product direction refined with user: use Team tab Active Tasks and keep task details simple.
- Investigation Goal: Determine how the current frontend/backend represent transient task agents, task teams, and task statuses; assess how to move them from left navigation / middle event area to the right-side Team tab; define simple task-detail requirements.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change affects UI information architecture and likely touches frontend state derivation, navigation/focus behavior, and possibly backend task-run event DTO identity shape.
- Scope Summary: Separate stable workspace navigation from transient task-run activity while preserving task-run visibility, clickability, and simple delegated-task description/status visibility.
- Primary Questions To Resolve:
  - Where are transient task agents/teams inserted into the left worktree/navigation? Resolved: live `AgentTeamContext.memberTree` projections are converted into left workspace team member rows.
  - Where is task status inserted into the center workspace event/monitor area? Resolved: `TeamActiveTaskExecutionsBar` renders active task-agent/team cards inside `TeamWorkspaceView`, above the event monitor.
  - What does the right-side Team Activity / activity tab currently own? Resolved: `TeamOverviewPanel` in the `teamMembers` tab shows team messages; `ProgressPanel` in the `progress`/Activity tab shows focused-run To-Do and activity events.
  - Which model should become authoritative for transient task-run visibility? Resolved by product direction: Team tab should gain an Active Tasks section; Activity remains focused-run To-Dos/tool activity.
  - Where should task details live? Resolved by product direction: inside/under Team tab Active Tasks, as simple delegated task description plus status/task ID/target, not as a complex phase dashboard.
  - How should duplicate target names be disambiguated? Resolved: active task rows should include task ID or fallback agent run ID or agent team run ID after/near the friendly role/team name.

## Request Context

User reports that transient task agents and task agent teams currently appear immediately as additional entries under the left worktree/workspace area, often duplicating names already present for stable agents/teams. They disappear after task completion, which makes the left side confusing. The center event monitor/workspace event area also shows task status in a noisy way. User asks whether transient task agents/teams and tasks can move to the right side, possibly under or near existing Team Activity tabs, while remaining clickable. Follow-up product direction: use the existing right-side Team tab, add an expandable Active Tasks section, keep task details simple, and show the delegated task description, task status, task ID, and target rather than task-team phase/current-member complexity. Active task rows also need a visible task/run identifier because multiple tasks can target the same logical agent/team.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign/tickets/in-progress/transient-task-ui-redesign`
- Current Branch: `codex/transient-task-ui-redesign`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-06-27.
- Task Branch: `codex/transient-task-ui-redesign`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Initial checkout was the shared superrepo `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`; dedicated ticket worktree was created before deeper investigation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; ls -la; find . -maxdepth 2 -type d` | Discover environment and repository shape. | Repository root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; project contains `autobyteus-web`, `autobyteus-server-ts`, SDKs, and tickets. Shared checkout had unrelated untracked `.article-work/` and `docs/articles/`. | No |
| 2026-06-27 | Command | `git remote -v; git symbolic-ref refs/remotes/origin/HEAD; git remote show origin; git rev-parse --abbrev-ref @{u}; git worktree list` | Resolve base branch and existing worktree context. | Origin remote exists; remote HEAD and current upstream point to `origin/personal`; many existing task worktrees exist but none for this task. | No |
| 2026-06-27 | Setup | `git fetch origin personal && git worktree add -b codex/transient-task-ui-redesign /Users/normy/autobyteus_org/autobyteus-worktrees/transient-task-ui-redesign origin/personal` | Create dedicated ticket worktree/branch from latest tracked remote base. | Worktree and branch created successfully at commit `2eace62f`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Identify left panel composition. | Left panel lower section renders `WorkspaceAgentRunsTreePanel`; this makes workspace/run history the primary left-nav owner. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Trace left worktree rendering owner. | The panel pulls workspace nodes, workspace teams, and team history groups from `useWorkspaceHistoryTreeState`/`runHistoryStore` and delegates rows to `WorkspaceHistoryWorkspaceSection`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Verify team/member rows shown in left worktree. | For each team run, it flattens `team.memberTree`/`team.members` and renders every member as a clickable row; no filter removes `isTaskAgentInstance`, `isTaskTeamInstance`, or `isTaskTeamChildProjection`. | Yes: target design should stop transient projections from entering this stable navigation projection. |
| 2026-06-27 | Code | `autobyteus-web/stores/runHistoryReadModel.ts`, `autobyteus-web/stores/runHistoryTeamHelpers.ts`, `autobyteus-web/stores/runHistoryTeamRows.ts` | Trace left team row projection. | `buildRunHistoryTeamNodes` merges persisted team runs and live `AgentTeamContext`s; `buildTeamRowsFromContext` maps the live `teamContext.memberTree` directly into `TeamMemberTreeRow`s. Since task-agent/team projections are inserted into `memberTree`, left history inherits transient nodes. | Yes |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Understand transient task-agent lifecycle. | `ensureTaskAgentContext` creates an `AgentContext` and inserts an `isTaskAgentInstance` node into `teamContext.memberTree`; `removeTaskAgentContext` removes it when an offline status arrives. | No backend blocker; confirms transient nature and explains disappearing UI. |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`, `teamTaskTeamChildProjection.ts`, `teamTaskExecutionEventRouter.ts` | Understand transient task-team lifecycle. | Task-team delegation events create `isTaskTeamInstance` roots and scoped child projections in `teamContext.memberTree`; terminal/settled events schedule cleanup/removal. | No backend blocker; confirms same transient projection issue for teams. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, `TeamActiveTaskExecutionsBar.vue` | Locate center task-status UI. | `TeamWorkspaceView` renders `TeamActiveTaskExecutionsBar` above `AgentTeamEventMonitor`; the bar already creates clickable cards for active task agents and task teams and emits `select-member`. | Reuse/move this component or its projection into right-side activity. |
| 2026-06-27 | Code | `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/progress/ProgressPanel.vue`, `ActivityFeed.vue`, `TeamOverviewPanel.vue` | Inspect current right-side tab ownership. | Right tabs include `teamMembers` labeled Team, `progress` labeled Activity, files/tools/artifacts/browser/usage. `TeamOverviewPanel` currently shows team messages, while `ProgressPanel` shows To-Do and activity for `activeContextStore.activeAgentContext` (focused member for team selection). | Yes: recommendation should avoid adding a third overlapping task surface unless necessary. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`, task-agent/team identity domain files | Verify backend identity support. | Server websocket payloads already flatten task-agent and task-team run IDs plus logical member/team route data (`task_agent_run_id`, `task_team_run_id`, `member_route_key`, `team_route_key`, paths). | Backend likely does not need execution semantic changes for focus/routing. |
| 2026-06-27 | Product Discussion | User follow-up in task thread | Resolve right-side IA choice and task-detail complexity. | User prefers Team tab Active Tasks and simple details: show the delegated task description and task status; no need for current phase/current active member/task-team complexity. | Requirements/design should reflect simple task details, not a complex task-team dashboard. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`, `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Verify whether delegated tasks already have a description. | `delegate_task` requires `description`; `TaskDelegationRecord` stores `description`, `taskLabel`, `status`, `referenceFiles`, result submissions/reviews, and timestamps. | Use `TaskDelegationRecord.description` as the canonical simple task detail. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Check whether the delegated task description is currently published to the frontend task projection. | Activation/status/result/review payloads include task ID/label/status/target/execution metadata, but the inspected payload builders do not include `record.description`. | Design likely needs a small DTO/projection extension for task description. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskExecutionsBar.vue` | Re-check current visible active-task card fields. | Current center bar shows task-agent/task-team badge, display name, run ID, optional task-team status label, AgentStatus, and pending approvals; it does not show the delegated task description. | Team tab Active Tasks should add the simple task details that the center bar lacks. |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`, `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Verify current naming/disambiguation behavior. | Task-agent display name is built as logical name plus `taskId || taskAgentInstanceId || taskAgentRunId`; task-team display name is built as logical team name plus `taskId || taskTeamRunId`. | Preserve this concept in the new Team tab UI; do not show only the target name. |
| 2026-06-27 | Product Discussion | User follow-up in task thread | Clarify metadata that must be visible in simple task details and rows. | User confirmed task ID and target should be shown, and noted task agents/task teams need an identifier because several can share the same role/team name. | Requirements updated to require task ID, target, and row disambiguation. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team streaming events from the backend carry task-agent/task-team identities into frontend `TeamStreamingService`, which updates the active `AgentTeamContext` projection.
- Current execution flow:
  1. Backend emits task delegation / member status / team status websocket payloads with task-agent or task-team identity.
  2. Frontend streaming projection creates transient task-agent/team nodes inside `AgentTeamContext.memberTree`.
  3. Center team workspace renders `TeamActiveTaskExecutionsBar` above the event monitor from those transient nodes.
  4. The current center bar shows identity/status/approvals but not the delegated task description as a first-class task detail; current projection display names do, however, already append a task/run identifier to the logical role/team name.
  5. Left workspace history also derives team member rows from the same live `memberTree`, so transient nodes appear as if they are part of the stable workspace/team tree.
  6. When task-agent/team execution reaches offline/settled, cleanup removes the transient node/context, so the left tree changes/disappears.
- Ownership or boundary observations: One technical task-run projection (`memberTree`) currently feeds both routing/focus and stable navigation rendering. This is the key boundary issue.
- Current behavior summary: Backend task-run identity is adequate, but frontend presentation mixes stable navigation and ephemeral task-run activity.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Restructure
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Likely requires separating stable navigation ownership from transient task-run activity ownership rather than hiding individual nodes conditionally.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Duplicate-looking transient and stable agents/teams appear in left UI; transient entries disappear later. | Left navigation is carrying both stable definition identity and task-run instance identity. | Resolved by code inspection. |
| User request | Task status in middle event area feels noisy. | Center workspace event surface carries the active task execution bar; this belongs in a task-run activity surface. | Resolved by code inspection. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Left shell navigation and workspace history panel host. | Hosts `WorkspaceAgentRunsTreePanel` below primary nav. | Left panel should remain stable navigation, not active task execution. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders workspace/agent/team/team-member history rows. | Flattens team members without filtering task projections. | Stable navigation leaks transient task-run nodes here. |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Converts team contexts/history into tree rows. | `buildTeamRowsFromContext` maps every `TeamMemberNode` from `memberTree`. | Best owner for stable-row filtering/projection split. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Creates/removes task-agent task-run projections for routing and display. | Inserts/removes `isTaskAgentInstance` nodes in live `memberTree`; display name appends task ID first, then instance/run ID fallback. | Keep for task-run identity/focus; do not use directly as stable nav source; preserve row disambiguation in Team tab. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Creates/removes task-team task-run projections and status timeline. | Inserts/removes `isTaskTeamInstance` nodes and scoped child projections; display name appends task ID first, then task-team run ID fallback. | Strong candidate data source for right-side task activity; preserve row disambiguation in Team tab. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskExecutionsBar.vue` | Center active task-agent/team cards with approval and selection actions. | Already has clickable cards and pending approval controls; does not expose delegated task description. | Rehost this concern into Team tab Active Tasks and add simple task description/status display. |
| `autobyteus-web/components/layout/RightSideTabs.vue` and `useRightSideTabs.ts` | Right-side tab host and tab policy. | Existing tabs include Team and Activity; Team is currently messages; Activity is focused-run progress. | Target UX should add Active Tasks under Team, not a new tab and not Activity-owned task structure. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Defines task delegation record and lifecycle payload types. | Records have `description` and `status`; payload types currently emphasize task ID/label/status/execution metadata. | Canonical source for simple task details is already present server-side. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Publishes task delegation events to team stream. | Does not include `record.description` in inspected activation/status/result/review payloads. | Small DTO extension may be needed so frontend can render task details cleanly. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending if task-run reproduction is needed.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation described in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Key findings:

1. The backend already sends explicit task-run identity for task agents and task teams. This includes concrete run IDs and logical parent/member route data. The first UI cleanup likely does not require backend execution semantics changes.
2. The frontend intentionally projects transient task-agent/team task-run instances into `AgentTeamContext.memberTree` so routing, focus, conversations, approvals, and status can work.
3. The same `memberTree` is reused by the left workspace history tree through `buildTeamRowsFromContext`, which makes transient task projections look like stable team members.
4. The center workspace has a dedicated active task execution bar. It is functional but competes with the event monitor and keeps transient task status in the main content area.
5. The right panel already has the correct general location for ephemeral task-run state, but the current split is uneven: Team tab = messages, Activity tab = focused run tools/todos, center bar = active task executions.
6. Server-side task delegation records already include the simple task description requested by the user, but current inspected task delegation event publishing does not expose that description to the frontend projection.
7. The existing center active-task bar provides useful click/focus and approval behavior but lacks the requested simple task-detail surface.
8. Current display-name construction already recognizes the duplicate-name problem by appending task ID/fallback run ID after the friendly target name; the new right-side presentation should keep that pattern.

Recommendation:
- Do not make left navigation more conditional or badge-heavy. Instead, define a clean ownership split:
  - Left: stable workspaces, persisted/draft root agent runs, root team runs, and optionally stable team roster/history only.
  - Center: selected conversation/event monitor for the current focus.
  - Right Team tab: transient task delegation structure, including active task agents, task teams, simple delegated task descriptions, task statuses, task IDs, targets, run-ID disambiguators, pending approvals, and focus targets.
  - Right Activity tab: detailed To-Dos/tool/activity feed for the currently focused run/member/task.

## Constraints / Dependencies / Compatibility Facts

- Must preserve clickability/focus for transient task participants.
- Must avoid mixing stable and transient identity in one undifferentiated list.
- Backend event contracts already expose the key task-run identities for focus/routing; preserve those identity shapes when moving UI surfaces.
- `TaskDelegationRecord.description` is the canonical source for simple task details, but the inspected websocket event payloads may need a DTO extension to expose it.
- Task ID/target/execution run IDs are already present in inspected event/projection data and should be used for visible row disambiguation.

## Open Unknowns / Risks

- If completed task cards should remain visible briefly after cleanup, a small right-panel task activity store will be needed because current cleanup removes the projection.
- Need decide exact transport/projection shape for `TaskDelegationRecord.description` so Active Tasks can render simple details without parsing conversation/tool-call content.
- Need choose exact visual format for task/run identifiers; recommended: friendly target name plus short task ID in the row, with full task ID and agent run ID or agent team run ID in details/tooltip.
- Must ensure stable left history still allows selecting historical team members where appropriate, while excluding only transient task-agent/team projections from live navigation rows.
- Must avoid breaking focused member routing and approval targeting; those depend on concrete task run IDs.

## Notes For Architect Reviewer

No architecture handoff yet. Recommendation has been refined with user input; next step is to update/produce the design spec and send to architecture review when approved.
