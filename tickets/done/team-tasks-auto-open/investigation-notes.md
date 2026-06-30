# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated task worktree and branch created.
- Current Status: Requirements refined with active-task auto-open approval plus nested Workspace history team collapse request; ready for design production.
- Investigation Goal: Identify the current Team panel task/message section state owner, the active task data source, and the current nested team member tree rendering responsible for the screenshot UX problem.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Two focused frontend UI-state changes across two surfaces: `TeamOverviewPanel` accordion behavior and Workspace history nested team member tree rendering.
- Scope Summary: Auto-open the Team tab `Tasks` section when active delegated task entries are present; render nested team members in Workspace history as collapsible subtrees with default-collapsed `agent_team` rows.
- Primary Questions Resolved:
  - Which component owns section expansion? `TeamOverviewPanel.vue`.
  - What is the active task signal? `deriveActiveTaskEntries(activeTeamContext)` from `teamActiveTaskEntries.ts`.
  - How should user manual collapse interact with auto-open? Manual collapse/switch is allowed for unchanged task set; new active task identity must reopen Tasks.
  - Which component renders the provided nested-team screenshot? `WorkspaceHistoryWorkspaceSection.vue` under Workspace history.
  - Why are nested teams always open? `flattenTeamMembers(team)` recursively flattens all descendants with no member-level expansion state.

## Request Context

User reports two UX issues:

1. In the right-side Team tab, `Messages` and `Tasks` are collapsible sections. When delegate-task/dedicated-task tooling creates or surfaces active tasks, the `Tasks` section is not automatically opened. Active tasks may require interaction with a specialist/agent; users who do not know to manually expand Tasks may miss required interaction. User clarified that whenever there are active task entries, the section should open automatically to draw attention. Users may switch away/collapse, but a new task should open it again.
2. In a large nested organization/team view, nested team members are automatically expanded and nested team rows have no chevron for collapse. The provided screenshot shows an expanded team run in the Workspace history tree with `engineering_org` and `product_org` rows labeled `TEAM`, but their children are all visible and the team rows have no disclosure affordance. User wants nested teams collapsed by default with manual chevron expansion.

Reference screenshots:

- Team tab sections: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8a97f1b0904f44cdba07542d82c1d6ce/solution_designer_14bfd766f27943a2aaa9eef9547df650/context_files/ctx_9305190112af__image.png`.
- Nested large organization tree: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8a97f1b0904f44cdba07542d82c1d6ce/solution_designer_14bfd766f27943a2aaa9eef9547df650/context_files/ctx_b9c661b78628__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open/tickets/done/team-tasks-auto-open`
- Current Branch: `codex/team-tasks-auto-open`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-06-30.
- Task Branch: `codex/team-tasks-auto-open`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts and any implementation should stay in the dedicated task worktree, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-30 | Other | User request in conversation | Capture product intent and UX problem | Active delegated tasks are hidden unless the user manually expands Tasks; user wants automatic opening when active tasks exist. | Incorporated. |
| 2026-06-30 | Other | User follow-up in conversation | Confirm active-task behavior and add nested-team issue | User wants Tasks to open whenever active task entries exist/new task appears; nested teams should be collapsed by default with chevrons. | Incorporated. |
| 2026-06-30 | Other | Screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8a97f1b0904f44cdba07542d82c1d6ce/solution_designer_14bfd766f27943a2aaa9eef9547df650/context_files/ctx_9305190112af__image.png` | Verify visible Team tab structure | Team tab includes collapsed `Messages` and `Tasks` rows with counts. | None. |
| 2026-06-30 | Other | Screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8a97f1b0904f44cdba07542d82c1d6ce/solution_designer_14bfd766f27943a2aaa9eef9547df650/context_files/ctx_b9c661b78628__image.png` | Verify nested-team complaint | Workspace-style tree shows expanded team run, all nested team descendants visible, `TEAM` badge but no nested chevrons, relative timestamps. | Target Workspace history member tree. |
| 2026-06-30 | Command | `pwd`; `git rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v`; `git symbolic-ref --short refs/remotes/origin/HEAD`; `git branch --show-current`; `git worktree list` | Bootstrap repository/worktree context | Current shared checkout was `personal`; remote default/integration appears `origin/personal`; many existing worktrees. | Dedicated worktree required. |
| 2026-06-30 | Command | `git fetch origin personal` | Refresh tracked remote base before worktree creation | Fetch succeeded. | None. |
| 2026-06-30 | Command | `git worktree add -b codex/team-tasks-auto-open /Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open origin/personal` | Create mandatory dedicated task branch/worktree | Worktree created at commit `b3a2b153`, branch tracks `origin/personal`. | None. |
| 2026-06-30 | Command | `find autobyteus-web/components -path '*team*' -maxdepth 6 -type f` | Locate Team tab components | Found `TeamOverviewPanel.vue`, `TeamActiveTasksSection.vue`, `TeamActiveTaskNavigator.vue`, and tests. | Inspect files. |
| 2026-06-30 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Check right-side Team tab entrypoint | Watches selected type and selects `teamMembers` when selected type is `team`; mounts `TeamOverviewPanel` for that tab. | No right-side tab change expected. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Identify section expansion owner | Parent owns `expandedSection`, default `'messages'`; `messagesExpanded` and `activeTasksExpanded` are computed; active team run change resets to `messages`; no active-task watcher exists. | Target file for behavior change. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Understand child responsibilities | Controlled by `collapsed`; computes `activeTaskEntries = deriveActiveTaskEntries(props.teamContext)`; owns task/reference selection and split layout; emits toggle/select-member. | Parent should keep expansion ownership. |
| 2026-06-30 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` | Identify active task data source | Collects task projection nodes where `isTaskAgentInstance` or `isTaskTeamInstance`; returns entries used for count and rendering. | Reuse for auto-open signal. |
| 2026-06-30 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Understand status/active projection model | Defines task execution statuses and helpers; task projection nodes are runtime UI projections, not structural members. | No new status model needed for parent. |
| 2026-06-30 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts`; `TeamStreamingService.ts`; `teamTaskAgentContextProjection.ts`; `teamTaskTeamExecutionProjection.ts` | Verify how active task entries appear/disappear | `TASK_DELEGATION_EVENT` creates/updates task-agent/team projections; terminal task-team cleanup is scheduled; task-agent projection removed on offline status. | Confirms frontend already has transient active task signal. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Check current expectations | Tests assert Messages open first and Tasks collapsed with zero tasks; team run change resets to Messages. | Add/update auto-open tests. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Check task section behavior coverage | Child tests verify controlled collapsed state and task counts. | Likely no child code change needed. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Check cross-component workflow tests | Helper `expandTasks` clicks task header; seeded workflow already has active tasks. After auto-open this helper may collapse Tasks if not adjusted. | Update helper/tests during implementation. |
| 2026-06-30 | Doc | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/settings.md` via `rg "TeamOverviewPanel owns"` | Check durable docs describing current behavior | Docs state `TeamOverviewPanel` opens Messages by default and resets to Messages when active team run changes. | Delivery docs sync likely needed. |
| 2026-06-30 | Command | `pnpm --dir autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Attempt focused current test execution | Failed before tests because `cross-env` was not found; warning indicates local package exists but `node_modules` missing. | Downstream validation needs dependencies installed/restored or an environment with web deps. |
| 2026-06-30 | Command | `rg -n "chevron|disclosure|expanded|collapsed|children|memberKind === 'agent_team'|TEAM" autobyteus-web/components/workspace autobyteus-web/components` | Find nested tree/disclosure code | Located Workspace history team run disclosure and flat member rendering; also found active task navigator team member flat rendering. | Inspect Workspace history. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Match nested-team screenshot and current rendering | Team run rows have a chevron, but member rows are rendered from `flattenTeamMembers(team)` and nested subteams only show `TEAM` badge; no nested disclosure. | Target for nested-team rendering change. |
| 2026-06-30 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Check existing expansion state owner | Owns workspace, agent group, team definition group, and team run expansion state; no member/subteam expansion state. | Extend tree-state owner or introduce local nested state through contract. |
| 2026-06-30 | Code | `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Check team/member selection behavior | Selecting a team expands the team run and selects focused/first member; selecting member expands team run and hydrates selected member. No ancestor subteam expansion exists. | Preserve selection; add ancestor reveal if needed. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Check component/state/action contract | Contract exposes team-run expansion only. | Add member expansion methods if state owned in composable. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`; `.regressions.spec.ts` | Check current Workspace history coverage | Tests cover team run disclosure, selected team reveal, member selection, and active-task-free Workspaces tree. | Add nested subteam collapse tests; update expectations if needed. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue`; `teamActiveTaskEntries.ts` | Check if active task navigator has similar nested flattening | `ActiveTaskEntry.members` is a flat list and task-team navigator renders all members. Similar pattern exists but screenshot target is Workspace history. | Keep as follow-up unless scope expands. |
| 2026-06-30 | Command | `git status --short --branch` | Check worktree state | Only task artifacts are untracked. | None. |

## Current Behavior / Current Flow

### Team tab active tasks

- Current entrypoint or first observable boundary: `RightSideTabs.vue` selects the `teamMembers` tab for selected team runs and mounts `TeamOverviewPanel`.
- Current execution flow:
  1. `RightSideTabs` sees `selectionStore.selectedType === 'team'` and calls `setActiveTab('teamMembers')`.
  2. `TeamOverviewPanel` reads `teamContextsStore.activeTeamContext`.
  3. `TeamOverviewPanel` initializes `expandedSection` to `'messages'`.
  4. `TeamOverviewPanel` passes `collapsed="!activeTasksExpanded"` to `TeamActiveTasksSection`.
  5. `TeamActiveTasksSection` derives and counts task entries with `deriveActiveTaskEntries(props.teamContext)`.
  6. If task entries exist but `expandedSection` is still `'messages'`, the task count is visible in the collapsed header but task content/interaction remains hidden.
- Ownership or boundary observations:
  - `TeamOverviewPanel` is the correct governing owner for the Messages/Tasks accordion.
  - `TeamActiveTasksSection` is the correct owner for task list/detail selection and rendering, not parent expansion policy.
  - `teamActiveTaskEntries.ts` is the correct active-task derivation utility.
- Current behavior summary: The parent accordion has no invariant connecting active task presence to `expandedSection`, so active delegated tasks can remain hidden.

### Workspace history nested team members

- Current entrypoint or first observable boundary: Workspace history tree (`WorkspaceAgentRunsTreePanel.vue`) renders per-workspace sections through `WorkspaceHistoryWorkspaceSection.vue`.
- Current execution flow:
  1. `useWorkspaceHistoryTreeState` reveals/expands workspace, team definition, and selected team run rows.
  2. `WorkspaceHistoryWorkspaceSection` renders a team run row with chevron using `state.isTeamExpanded(team.teamRunId)`.
  3. When the team run is expanded, member rows render with `v-for="member in flattenTeamMembers(team)"`.
  4. `flattenTeamMembers` recursively flattens `team.memberTree` or `team.members`, so all nested descendants are visible immediately.
  5. `agent_team` member rows only receive a `TEAM` badge; no chevron, no subtree state, no `aria-expanded`.
- Ownership or boundary observations:
  - `useWorkspaceHistoryTreeState` is already the owner for tree expansion state and reveal logic.
  - `WorkspaceHistoryWorkspaceSection` currently owns the flattening helper locally; this creates a presentation-policy gap because nested tree disclosure cannot be expressed.
  - Selection actions should remain in `useWorkspaceHistorySelectionActions`; nested disclosure toggles should be separate from selection.
- Current behavior summary: Workspace history member tree presentation is flattened and lacks member-level expansion state, causing large nested organizations to be fully expanded and not collapsible.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Duplicated/Incomplete Tree Presentation Policy
- Refactor posture evidence summary: Bounded refactor is needed for Workspace history member rendering because the current local flatten helper cannot support nested collapse. No backend refactor needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamOverviewPanel.vue` | `expandedSection` defaults to `messages`; team-run watcher resets to `messages`; no active-task watcher. | Missing parent-owned UI invariant. | Add active task signature watch. |
| `TeamActiveTasksSection.vue` | Child receives `collapsed` and emits toggle; derives entries. | Child should not be made responsible for parent accordion. | Keep controlled child boundary. |
| `teamActiveTaskEntries.ts` | Active task entries are already represented by task projection nodes. | Reuse existing source; no duplicate task classification. | None. |
| Streaming projection files | Task projections are transient and cleaned up on terminal/offline paths. | No backend lifecycle change needed. | None. |
| `WorkspaceHistoryWorkspaceSection.vue` | `flattenTeamMembers` displays every descendant, with no nested-team disclosure. | The screenshot issue is a missing tree presentation owner/state. | Replace with recursive visible-row rendering. |
| `useWorkspaceHistoryTreeState.ts` | Expansion state exists for workspace/group/run levels only. | Correct owner can be extended for member-level expansion. | Add scoped member expansion methods. |
| `useWorkspaceHistorySelectionActions.ts` | Selection expands team run, not nested member ancestors. | Preserve selection and add ancestor reveal if selected row would hide. | Coordinate with member expansion state. |
| Tests | Existing workflow helper manually clicks Tasks; history tests expect team run members visible after team expansion. | Auto-open and default-collapsed nested teams change test preconditions. | Update/add tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tab shell and selected-type tab switching | Already selects Team tab for team selection. | No change expected. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab Messages/Tasks accordion; message count; task-member focus bridge | Owns `expandedSection`; defaults/resets to Messages only. | Primary target for active-task auto-open invariant. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Controlled active task section body, split layout, task/reference selection | Uses `collapsed` prop and `deriveActiveTaskEntries`. | Remain controlled; avoid moving parent state into child. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | Task entry navigation and explicit focus controls | Emits select-member only on actor/member rows; task-team members are flat. | Preserve for auto-open; possible follow-up for nested task-team collapse. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Converts active task projection nodes into rendered task entries | Existing source of truth for task count/body. | Reuse for auto-open signal. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Task projection status/details helpers | Defines task statuses and active/terminal helpers. | Parent should not duplicate status policy. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | Routes task-scoped stream events into projections | Creates/updates projections on task events. | Confirms arrival path for auto-open updates. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Dispatches stream messages and cleanup scheduling | Schedules task-team cleanup and removes task agents. | Active-task entry set is transient. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history tree container; wires state/actions contracts | Provides `sectionState` and `sectionActions` to `WorkspaceHistoryWorkspaceSection`. | Contract needs member expansion methods if state stays in tree-state owner. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders workspace groups, agent groups, team runs, and team member rows | Flattens all team members, no nested disclosure. | Primary target for recursive nested subteam rendering. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Workspace history expansion/reveal state | No member-level subteam expansion. | Extend with `isTeamMemberExpanded`, `toggleTeamMember`, `expandTeamMemberAncestors`. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Open/select history rows and team members | Expands team run on selection but no nested ancestor reveal. | Preserve selection; coordinate ancestor expansion. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Explicit props contract between panel and section | Exposes team-run expansion only. | Add nested team member expansion methods if needed. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Unit coverage for parent section expansion and message props | Current tests assert Messages-first behavior. | Add active-task auto-open cases and keep no-task Messages default. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Cross-component task focus/send workflow | Helper always clicks task header. | Make helper conditional or remove where Tasks now auto-opens. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Workspace history tree behavior coverage | Covers team run disclosure/member selection. | Add nested subteam collapse tests. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Workspace history regressions | Covers selection reveal and expanded teams. | Ensure no reveal regression. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable architecture docs | Documents old Messages-default/reset behavior. | Docs sync likely after implementation. |
| `autobyteus-web/docs/settings.md` | Durable docs with same architecture excerpt | Documents old Messages-default/reset behavior. | Docs sync likely after implementation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-30 | Test | `pnpm --dir autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Did not execute tests; `cross-env: command not found`; `node_modules` missing in fresh worktree. | Validation blocked on dependency availability, not on test failure. |
| 2026-06-30 | Visual inspection | `view_image` of `ctx_9305190112af__image.png` | Team tab shows `Messages` and `Tasks` collapsed rows with counts. | Matches reported discoverability problem. |
| 2026-06-30 | Visual inspection | `view_image` of `ctx_b9c661b78628__image.png` | Expanded team run shows nested `TEAM` rows and all children visible, with no nested chevrons. | Matches Workspace history flattening implementation. |

## External / Public Source Findings

No external/public sources used. This is an internal codebase UX behavior change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Component tests use Pinia/test-utils; no backend expected for unit coverage.
- Required config, feature flags, env vars, or accounts: `NUXT_TEST=true` via existing `test:nuxt` script.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation as recorded in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Active task root cause is local to `TeamOverviewPanel` state policy: it always prioritizes Messages on initial/team-run reset and never observes active task entries.
- Active task entry derivation already exists and should be reused; no backend or streaming changes are necessary.
- The active-task invariant should be based on task-entry identity changes, not every render, to preserve user manual collapse for unchanged active task sets while still reopening for new tasks.
- Nested team root cause is local to Workspace history member row presentation: a local `flattenTeamMembers` helper erases tree structure and therefore cannot support nested disclosure/collapse.
- Workspace history already has a tree expansion state owner; extending it is preferable to ad hoc local `ref` state inside `WorkspaceHistoryWorkspaceSection` if selected-run reveal and contract clarity matter.
- Documentation currently describes the old Team tab default/reset behavior; delivery should revisit docs after implementation.

## Constraints / Dependencies / Compatibility Facts

- Use dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/team-tasks-auto-open`.
- Preserve Messages and Tasks in Team tab; change should be a targeted auto-open behavior.
- Preserve Workspace history team run expansion and member selection behavior; nested subteam disclosure should be additive and should not change backend history data.
- No backward compatibility/dual behavior needed. Replace the old unconditional Messages reset with a conditional reset that respects active task presence. Replace always-flat Workspace history member rendering with default-collapsed recursive rendering.
- Current worktree lacks web dependencies; test execution requires dependency setup.

## Open Unknowns / Risks

- Whether to include active task-team navigator nested collapse now. Current recommendation: no, because the screenshot maps to Workspace history and the active task navigator has separate task-specific selection/reference responsibilities.
- Vue reactivity for nested `memberTree`/Map mutation should be covered in tests with the same update shape streaming uses or a reactive replacement shape.
- Existing tests may need updates to avoid toggling already-open Tasks closed.
- Workspace history member-level expansion keys must be pruned or scoped enough to avoid stale expansion state when workspace/team history refreshes.

## Notes For Architect Reviewer

Design should include two spines:

1. `Team selection/stream update -> TeamOverviewPanel -> active task signature -> expandedSection -> TeamActiveTasksSection visible`.
2. `Workspace history data -> WorkspaceHistoryTreeState member expansion -> WorkspaceHistoryWorkspaceSection recursive member rows -> user disclosure/selection`.

Likely target decisions:

- `TeamOverviewPanel`: compute active task signature from `deriveActiveTaskEntries`; watch selected run and signature; default to Tasks for active entries, Messages otherwise; track last auto-opened signature to avoid fighting manual collapse until new task set.
- Workspace history: extend `useWorkspaceHistoryTreeState` and `WorkspaceHistorySectionState` contract with member-level expansion methods keyed by `teamRunId/memberRouteKey`; replace `flattenTeamMembers` with recursive visible row rendering; stop propagation on chevron clicks; expand ancestors for selected member if needed.
