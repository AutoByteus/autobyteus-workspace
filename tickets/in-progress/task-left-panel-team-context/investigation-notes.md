# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Initial investigation in progress
- Investigation Goal: Assess the proposed UX change and identify current frontend owners/components/data flows for task summary, right-side Team/Tasks tabs, and work tree team/member status rendering.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Likely frontend component/data-composition change; may require component reuse and status data mapping across task navigation and work tree surfaces.
- Scope Summary: Move or mirror active agent/team context under task summary on the left-side task area, with work-tree-consistent team/member styling and live status.
- Primary Questions To Resolve: Which component owns left task summary? Which component owns right tabs? Which component owns work tree team/member rendering? Is a reusable team member tree renderer already available?

## Request Context

User wants analysis of a frontend UX proposal: current Team and Tasks tabs on the right-side panel focus agent/team context there, but the user feels task-related agent/team context would be more alive and discoverable if shown on the left side beneath the short task description/summary. Desired structure resembles the work tree screenshot but with task summary first, then agent/team, then members.

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_05adf8f38e4b4ed1802251c8b346d606/solution_designer_52e7f4f1caf343ccac2ab0dd0c2a946b/context_files/ctx_0604b708d182__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context`
- Current Branch: `codex/task-left-panel-team-context`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-06-29.
- Task Branch: `codex/task-left-panel-team-context`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: User currently asked for analysis/opinion; requirements are not approved for implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` | Resolve repo and branch state before investigation | Root repo at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, current shared branch `personal` with unrelated untracked files | No |
| 2026-06-29 | Command | `git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git worktree list --porcelain` | Resolve base branch and worktree availability | Remote default/integration branch resolved as `origin/personal`; no exact existing worktree for this task | No |
| 2026-06-29 | Command | `git fetch origin && git worktree add -b codex/task-left-panel-team-context /Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context origin/personal` | Create dedicated task worktree/branch from latest tracked base | Worktree and branch created successfully at HEAD `b633fa77` | No |
| 2026-06-29 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Locate left-side shell owner | Left panel is split between primary navigation and `WorkspaceAgentRunsTreePanel`; the work tree is already the lower left navigation/context surface | No |
| 2026-06-29 | Code | `autobyteus-web/components/layout/RightSideTabs.vue`; `autobyteus-web/composables/useRightSideTabs.ts` | Locate right tab owner and tab visibility | `teamMembers` tab is labeled Team and only visible for selected teams; selection watcher auto-switches to `teamMembers` for teams and `progress` for single agents | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Locate current right-side team/task experience | Team tab contains Messages and `TeamActiveTasksSection`; active task visibility is currently inside the right panel | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue`; `TeamActiveTaskRow.vue`; `autobyteus-web/utils/teamActiveTaskEntries.ts` | Understand active task data and UI | Active task entries are derived from `AgentTeamContext.memberTree`; each entry has task summary/description, target kind/name, status, reference files, and task-team members | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`; `workspaceHistorySectionContracts.ts` | Understand screenshot/work tree structure and reusable styling | Work tree currently renders workspace -> agent/team definition -> run summary -> team members using status dots, avatars, indentation, selected row highlighting, relative time, and click-to-select/focus actions | No |
| 2026-06-29 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`; `autobyteus-web/stores/runHistoryStore.ts` | Understand status and projection ownership | Status class mapping and expansion state live in `useWorkspaceHistoryTreeState`; `runHistoryStore.getTeamNodes()` builds `TeamTreeNode` projections from persisted history plus live `AgentTeamContext` | No |
| 2026-06-29 | Other | User clarification in chat | Confirm product intent | User clarified full content should remain on the right; only team/agent/member context should move/show under the left task summary, with work-tree-like status colors and clickability | No |
| 2026-06-29 | Other | User status-dot clarification in chat | Confirm exact status affordance | User clarified status should be the same very small left-side circle/dot icon from the work tree, not a large label/badge | No |
| 2026-06-29 | Other | User task-summary status correction in chat | Correct status placement | User clarified the task summary row should remain text-only; status dots belong to agent team and team member rows, not the task summary itself | No |
| 2026-06-29 | Other | User team-root indentation correction in chat | Correct hierarchy presentation | User clarified the responsible team row itself should not be indented under the task summary; indentation should start with team members | No |
| 2026-06-29 | Other | User live-feeling UX rationale in chat | Capture product rationale | User emphasized that blue/green status dots make agents feel visibly working/alive and improve the experience | No |
| 2026-06-29 | Other | User reference-file placement clarification in chat | Correct content boundary | User clarified reference file names/rows should remain under the left agent/team context and open content/preview on the right, matching current implementation | No |
| 2026-06-29 | Other | User technical-details placement idea in chat | Capture possible scope addition | User suggested technical details may also belong on the left side; recommendation is compact/collapsible metadata on left while main content/preview stays right | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` lines 103-117, 183-239, 289-304 | Investigate exact current workspace status-dot rendering | Agent run, team definition/team run, and team member rows render a tiny `h-2 w-2 rounded-full` span before row text; team/member rows use the same compact left-dot visual style shown in the reference image | No |
| 2026-06-29 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` lines 340-370 | Investigate current status color semantics | Team status: Initializing amber pulse, Running blue pulse, Idle green, Error red, Offline gray; agent/member status uses same mapping except default/offline gray | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` lines 26-44 | Verify current reference file left-navigation behavior | Active task reference rows already render in the left navigator with file icons/name and emit `select-reference`; selected reference styling is local | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` lines 69-147 and 203-217 | Verify current right detail and technical detail behavior | Reference selection switches the right pane to `TeamTaskReferenceViewer`; technical details currently render in the right task detail pane as `<details>` with `technicalRows` and JSON input | No |
| 2026-06-29 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` lines 14-31 and 99-134 | Verify active task projection fields | `ActiveTaskEntry` already has target, status/statusLabel, reference files, task IDs/arguments, and task-team members; new left tree can reuse this projection | No |
| 2026-06-29 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` lines 1421-1435 | Check existing status-dot coverage | Tests assert active rows render `.bg-blue-500.animate-pulse`; coverage can be extended for extracted/shared status dot behavior | Yes |
| 2026-06-29 | Test | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` lines 187-224 | Check current reference/technical detail coverage | Tests assert references are in the left navigator, reference click switches right pane, and technical details currently render on the right; these tests must be updated for the new left technical-detail placement | Yes |
| 2026-06-29 | Doc | `design-review-report.md` | Review architecture failure | Architecture review found DS-002 missing an owner/flow for making right active-task detail visible when left task/reference rows are clicked | Yes, design revised |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` lines 53-64 and 76-110 | Validate right detail visibility gate | `expandedSection` is local, defaults to `messages`, and collapses `TeamActiveTasksSection` unless `expandedSection === 'activeTasks'` | Yes, add/extract section visibility owner |
| 2026-06-29 | Code | `autobyteus-web/composables/useRightPanel.ts` | Validate right panel activation API | Right panel exposes `toggleRightPanel` but no idempotent `openRightPanel`; activation should not toggle blindly | Yes, design adds `openRightPanel()` |
| 2026-06-29 | Code | `autobyteus-web/composables/useRightSideTabs.ts` | Validate right tab activation API | Existing `setActiveTab('teamMembers')` can select the Team tab once selectedType is team | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Desktop shell left panel (`AppLeftPanel.vue`) owns the left work tree; right panel (`RightSideTabs.vue`) owns the Team tab and mounts `TeamOverviewPanel.vue`.
- Current execution flow: Selecting a team in the work tree selects/hydrates the team run, expands the team row, and the right tab watcher switches to Team. The Team tab defaults to Messages because `TeamOverviewPanel` owns local `expandedSection = 'messages'`; active delegated task content is hidden until `expandedSection === 'activeTasks'`.
- Ownership or boundary observations: The left work tree and right Team tab both render team/member concepts today, but with different component shapes. The work tree owns navigation/status hierarchy; `TeamActiveTasksSection` owns active task navigator/detail selection locally inside the right panel; `TeamOverviewPanel` owns active-task section visibility locally and therefore must be included in the target activation flow.
- Current behavior summary: The screenshot's hierarchy corresponds to the work tree style: team/team definition -> task/run summary -> members. The status icon under the workspace tree is a tiny `h-2 w-2 rounded-full` span placed before agent/team/member row text and colored by `useWorkspaceHistoryTreeState`. Active delegated task context currently exists in the right Team tab: reference file names are already on the left navigator and selected reference content opens on the right, while technical details still live in the right detail pane.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / File Placement Or Responsibility Drift risk
- Refactor posture evidence summary: Implementation should extract/share the workspace status-dot mapping and split active-task navigator/detail ownership; otherwise left/right task navigation and status semantics will duplicate and drift.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request and screenshot | Work tree has an existing team/member visual hierarchy and status dots | Left task context should reuse the same style/status semantics where possible | Yes |
| `TeamActiveTasksSection.vue` | Active task selection/details are owned locally in the right panel | Moving task navigation left requires either a shared active-task selection owner or a compact left-only focus action | Yes |
| `WorkspaceHistoryWorkspaceSection.vue` | Current team run tree already supports team/member click-to-select and live status styling | Best target UX should extend/reuse this left-side navigation language rather than create a new unrelated task tab look | No |
| `teamActiveTaskEntries.ts` | `ActiveTaskEntry` already exposes summary/description, target, status, run id, and members | Backend changes likely not required for the proposed first iteration | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Shell left panel layout | Contains primary navigation plus `WorkspaceAgentRunsTreePanel` | The proposed placement fits this existing left navigation/context owner |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Work tree orchestration, tree state/actions/avatar bindings | Wires tree projection/status/avatar/action contracts into `WorkspaceHistoryWorkspaceSection` | New task context rows should likely be fed from this owner or nearby composed state |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders workspace/agent/team run/member rows | Contains current screenshot style and click semantics | Candidate to host the compact task-first context under selected/expanded team rows, or to share row components with a new task context component |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right panel tab shell | Team tab is selected automatically for selected teams | If left gains live task context, right Team tab should remain detail/inspector rather than primary navigation |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Right-side team overview | Combines Messages and Active Tasks sections | Should remain useful for details/messages, not duplicate left status tree ownership |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Active task right-side navigator/detail pane | Derives entries and owns selected task/reference locally | If left controls selected task detail, selection state should be lifted/shared |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Active task entry projection from `AgentTeamContext` | Already has the task-first data needed for the proposed structure | Good input for left-side task context projection |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Work tree expansion/selection/status classes | `teamStatusClass` and `runStatusClass` own the blue/green/gray/red dot semantics used by screenshot rows | Extract/share status mapping so left active-task context and existing work tree cannot drift |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

None.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not needed for design investigation; code and unit test read were sufficient.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The proposal fits the existing left-panel responsibility: `AppLeftPanel` already reserves the lower left region for workspace/run/team hierarchy.
- The screenshot style is not a separate asset; it is embedded in `WorkspaceHistoryWorkspaceSection.vue` with status-class callbacks supplied by `useWorkspaceHistoryTreeState`. Direct duplication would be risky because status color semantics could drift.
- `TeamActiveTasksSection` has the task-first data (`ActiveTaskEntry`) needed for the user's proposed summary -> assignee/team -> members structure, but it currently owns that selection inside the right panel.
- A first implementation likely does not need backend changes: active task projections already include target kind/name, task description, task status, task agent/team run ids, and task-team member children.
- The main design decision is whether left-side task rows are only a compact live/focus preview or become the canonical active-task selector that also drives the right-side detail pane.
- Current status-dot UI should be treated as an existing owned pattern: `h-2 w-2 rounded-full`, `mr-1.5`/`mr-2`, with class mapping from `useWorkspaceHistoryTreeState`.
- Current active-task reference-file name rows already belong to the left navigator; the target design should preserve that behavior while changing where the navigator lives.
- Current technical details are right-side detail content; the target design should move their row rendering left and keep selected task body/reference preview on the right.
- Architecture review exposed an additional current-state gate: selection alone will not show right detail because `TeamOverviewPanel` may remain on Messages or another right tab; target design now needs a separate right-detail activation owner.

## Constraints / Dependencies / Compatibility Facts

- Left panel width is constrained; task descriptions should be compact (one or two lines) with right-side/center detail preserved.
- Right Team tab currently also contains Messages; it should not be removed as part of an initial navigation/context improvement.
- Status semantics differ between task execution status, team runtime status, and agent/member runtime status; row UI must not imply they are the same source.
- Existing tests cover `WorkspaceHistoryWorkspaceSection`, `TeamActiveTasksSection`, `TeamOverviewPanel`, and right-side tab behavior; coverage updates would be expected if implementation proceeds.

## Open Unknowns / Risks

- Exact current component ownership for task list/navigation versus work tree status rendering.
- Whether live status data is already available on the left-side task list view.
- Product decision resolved: keep right-side Team/Tasks surface as content/detail/preview; move compact navigation/context rows left.
- Design-impact resolution: left task/reference clicks must trigger both selection and a right-detail activation command that opens the right panel, selects the Team tab, and shows the activeTasks section.
- Technical detail rows may need truncation/copy affordances if IDs are long in the narrow left panel.

## Notes For Architect Reviewer

No design handoff yet; requirements are draft and awaiting user direction.
