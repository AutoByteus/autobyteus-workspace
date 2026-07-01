# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Redesign updated after deeper original-implementation analysis; architecture-review revision needed
- Investigation Goal: Determine the current frontend ownership and historical behavior around active task agent/team placement, then recommend whether temporary task targets should be visible from the global Workspaces tree with clearer temporary treatment.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue crosses the global Workspaces tree, right-side Team Tasks UI, tab activation, active task selection/focus routing, visual semantics, localization, tests, and docs.
- Scope Summary: Active delegated task-agent/task-team execution rows currently live in the right Team tab's Tasks section. User clarified the task content/details should stay there, while only the transient execution-node rows should move back inline into the global Workspaces tree with dotted/dashed temporary styling. Prior global-tree placement was rejected because it mixed full active-task context into stable navigation.
- Primary Questions To Resolve:
  - Where are task agents/teams currently rendered and what owns their state? Resolved.
  - What code/history moved them from the workspace tree into the Tasks tab? Resolved.
  - Can workspace-tree visibility solve discoverability without reintroducing confusion? Yes, if limited to inline transient execution-node rows with explicit temporary styling, not full task detail or ordinary member rows.
  - What visual/semantic treatment should temporary task targets use? Inline execution rows that use dotted/dashed leading status circle treatment plus a light ghost background where durable rows use solid leading status circles; no full task-context block and no ordinary durable-member styling.
  - What tests/docs are likely impacted? Workspaces-tree tests, Team active task tests, right-tab/overview activation tests, docs around delegated task visibility.

## Request Context

User reports that task agent/task agent team entries inside the right-side Tasks tab are too hidden because they are not visible while users are on other right-side tabs. Earlier versions showed task targets under the global workspace history tree next to team/member entries, but that was confusing because temporary task targets looked like normal persistent agents/teams. User asks whether clearer rendering that communicates temporary/disappearing nature would make global Workspaces-tree placement better.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux`
- Current Branch: `codex/task-agents-workspace-tree-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-30; `origin/personal` at `b3a2b15393bbf16fefccce9174b982a641bd42dc`.
- Task Branch: `codex/task-agents-workspace-tree-ux`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Main checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked files; task work happens in dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-30 | Command | `git status --short --branch`; `git remote -v`; `git worktree list --porcelain`; `git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo state and base branch | Current shared checkout was `personal`; remote default resolves to `origin/personal`; many existing task worktrees; need dedicated worktree for this task. | No |
| 2026-06-30 | Command | `git fetch origin --prune`; `git worktree add -b codex/task-agents-workspace-tree-ux /Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux refs/remotes/origin/personal` | Refresh remote and create dedicated task branch/worktree | Fetch succeeded; worktree created at latest `origin/personal` (`b3a2b153`). | No |
| 2026-06-30 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Determine current tab behavior | Team tab is one of many right-side tabs. It auto-switches to `teamMembers` when a team is selected, but users can switch to other tabs and hide Team Tasks. | Design activation path back to Team tab. |
| 2026-06-30 | Code | `autobyteus-web/composables/useRightSideTabs.ts` | Identify right-tab ownership | `activeTab` is global composable state; `teamMembers` tab is visible only for team selection. | Existing team selection already switches to Team tab; clarified design does not require a global task-summary activation path. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Determine Team tab structure | Team tab owns Messages and Active Tasks accordion. Initial expanded section is `messages`; Active Tasks is hidden/collapsed until opened. | No new activation request needed for clarified design; Tasks remains right-side detail surface. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Determine task UI owner | Section derives `deriveActiveTaskEntries(teamContext)`, owns local `selectedTaskRouteKey`, `selectedReferenceId`, split resize, and composes navigator/detail. | Keep as detail owner; right-side task content/details remain there while execution-node rows move left. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | Inspect current left navigator rendering | Navigator renders task summary, actor/team row, members, references, and technical details inside Team Tasks. | Move only actor/team/member execution rows to Workspaces tree; do not copy summary/references/technical details. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | Inspect right detail owner | Detail pane renders selected task body or selected task-owned reference preview. | Keep task body/reference preview out of global tree. |
| 2026-06-30 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` | Identify task entry projection source | `deriveActiveTaskEntries()` collects `isTaskAgentInstance` and `isTaskTeamInstance` nodes from `AgentTeamContext.memberTree` and normalizes summaries, refs, task IDs, target, status, and members. | Keep as Team Tasks task-detail projection; Workspaces inline rows should consume runtime node placement/display identity without rendering summaries/refs/details. |
| 2026-06-30 | Code | `autobyteus-web/types/agent/AgentTeamContext.ts` | Inspect transient task flags | `TeamMemberNodeBase` includes flags/fields for task-agent, task-team, scoped child projection, task details, refs, args, target, and conversation target segments. | Use flags to avoid ordinary member-row rendering. |
| 2026-06-30 | Code | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`; `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`; `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts`; `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | Trace how task projections enter frontend state | Stream handlers create task-agent contexts/nodes and task-team roots/children in `AgentTeamContext.memberTree` for routing/focus; cleanup removes them after terminal/offline events. | Inline Workspaces display rows can react to the same projection lifecycle. |
| 2026-06-30 | Code | `autobyteus-web/stores/runHistoryTeamRows.ts` | Check global Workspaces tree team-member projection | `buildTeamRowsFromContext()` filters `isTaskAgentInstance`, `isTaskTeamInstance`, and `isTaskTeamChildProjection` from stable Workspaces-tree member rows. | Keep stable-row semantics separate; add display-row union for transient rows if approved. |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`; `WorkspaceHistoryWorkspaceSection.vue`; `workspaceHistorySectionContracts.ts`; `useWorkspaceHistoryTreeState.ts` | Inspect global Workspaces-tree host and contracts | Workspaces tree currently renders workspace/agent/team/member rows only, with no active task bindings. Expansion/selection reveal team ancestry. | Need inline transient display-row bindings if approved. |
| 2026-06-30 | Test | `autobyteus-web/stores/__tests__/runHistoryTeamRows.spec.ts` | Identify existing regression guard | Test explicitly asserts stable live context rows filter transient task-run projections. | Update/keep this test; new behavior should not make projections ordinary rows. |
| 2026-06-30 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Identify existing global-tree guard | Test currently asserts global Workspaces tree is free of active-task context and no Team active task navigator/summary/reference/technical rows render there. | Replace with inline transient-row expectations while keeping forbidden summary/reference/technical assertions. |
| 2026-06-30 | Test | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`; `TeamActiveTaskNavigator.spec.ts` | Inspect current active task coverage | Tests assert Team Tasks split, summary rows, actor/member rows, references, technical details, reference preview, no approvals, no right detail duplication. | Update to reflect relocated actor/member rows while preserving task summary/reference/detail behavior. |
| 2026-06-30 | Doc | `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/settings.md` | Inspect current durable architecture docs | Docs state right-side Team tab owns delegated task visibility and global Workspaces tree must not render active-task summary blocks, reference rows, or technical details. | Update docs only if approved implementation changes this boundary. |
| 2026-06-30 | Repo history | `git log --oneline --all --grep task`; `git show 2c2e9311`; `git show 6d772875`; `git show 12fb972b` | Understand historical changes | Key commits: `2c2e9311 feat(web): move transient tasks to team tab`; `6d772875 checkpoint: left panel team context delivery candidate`; `12fb972b feat(team): finalize taskagent team tab UI`. | Use prior mistakes to constrain new design. |
| 2026-06-30 | Repo history | `git show 0fae9c60:autobyteus-web/stores/runHistoryTeamRows.ts`; `git show 0fae9c60:autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`; `git show cc2151f6 -- autobyteus-web/stores/runHistoryTeamRows.ts`; `git show d0c2f995 -- autobyteus-web/stores/runHistoryTeamRows.ts` | Check the much earlier original Workspaces-tree task-agent placement | Older direct path: by `0fae9c60`, live `buildTeamRowsFromContext()` used `teamContext.memberTree` directly, and the Workspace section flattened `team.memberTree`; therefore task-agent projections inserted into `memberTree` appeared inline as normal member rows. `d0c2f995` later added `isTransientTaskProjectionNode` filtering before the Team-tab move. | Current design should reuse the original inline placement idea but add explicit transient row styling/row kind instead of ordinary stable-row rendering. |
| 2026-06-30 | Ticket artifact | `tickets/done/transient-task-ui-redesign/requirements.md`; `ux-recommendation.md` | Understand why tasks moved right | Prior requirement: keep left navigation stable and move transient task visibility to Team tab because task projections looked duplicate/disappearing in global tree. | New design must solve visual ambiguity explicitly. |
| 2026-06-30 | Ticket artifact | `tickets/done/task-left-panel-team-context/analysis-recommendation.md`; `design-spec.md` | Understand attempted left-panel correction | Original recommendation favored left visibility, but addendum corrected “left panel” to mean the left navigator inside Team Tasks, not global Workspaces tree. Global-tree host was rejected because it included active-task blocks, refs, technical details, and wrong selection ownership. | New design should only add inline transient execution rows to the global tree, not full context. |
| 2026-06-30 | Visual evidence | `tickets/done/task-left-panel-team-context/browser-evidence/design-impact-current-browser-ui.png`; `corrected-team-active-tasks-live.png` | Compare rejected global placement with current corrected Team Tasks | Rejected global UI showed full active-task context embedded under a team run. Corrected UI shows Tasks visible only in Team tab. | Supports refined recommendation: inline transient execution-node visibility in Workspaces tree + Team detail on the right. |
| 2026-06-30 | Command | `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts` | Attempt baseline targeted tests | Failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`; `node_modules` not installed in task worktree. | Downstream implementation should install/prepare deps or use existing project setup before validation. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Global desktop workspace layout renders center content and right panel. When a team is selected, center uses `TeamWorkspaceView`; right panel uses `RightSideTabs` with the Team tab available as `teamMembers`.
- Current execution flow:
  1. Backend/team stream events carry task-agent/task-team identity.
  2. `teamTaskExecutionEventRouter` and projection helpers create transient task-agent/task-team nodes/contexts in `AgentTeamContext`.
  3. `TeamActiveTasksSection` derives active task entries from those transient projections and renders them inside the right Team tab.
  4. Global Workspaces tree builds stable team rows from `buildRunHistoryTeamNodes()` / `buildTeamRowsFromContext()`, which filters transient projection nodes from normal member rows.
  5. User can switch right panel to Files/Terminal/Activity/etc.; Active Tasks then becomes invisible although task projections remain alive.
- Ownership or boundary observations:
  - Runtime projection/focus owner: `AgentTeamContext` + streaming projection services.
  - Task detail UI owner: `TeamActiveTasksSection` / `TeamActiveTaskNavigator` / `TeamActiveTaskDetailPane`.
  - Stable navigation owner: Workspaces history panel/section + run history read model.
  - Current boundary is clean but incomplete for ambient awareness.
- Current behavior summary: Current code intentionally prevents confusing transient rows in global navigation, but this makes active delegated tasks too easy to miss when Team tab is not active.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Information Architecture Adjustment
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: The right Team tab currently owns both active-task awareness and details. User need shows awareness should be globally visible while details remain in Team Tasks. This requires a boundary split, not a local style tweak.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Tasks hidden inside right Team tab are easy to miss when users view other tabs. | Existing single-surface ownership is too hidden for live task awareness. | Add inline transient execution-node visibility outside Team tab. |
| Current code | Global Workspaces tree filters transient projections from normal team rows. | Stable navigation boundary is healthy and should not be removed wholesale. | Preserve stable-row semantics; add transient display-row path. |
| Prior `transient-task-ui-redesign` ticket | Global tree placement confused users because task projections looked duplicate/disappearing. | Any return to global tree must have explicit temporary semantics. | Distinct visual/copy treatment. |
| Prior `task-left-panel-team-context` correction | Full active-task context in global tree was rolled back. | Avoid putting full task navigator, refs, technical details in global tree. | Keep Team Tasks detail owner. |
| Current docs | Durable docs forbid global active-task summary/details. | Implementation must intentionally update docs if boundary changes. | Docs sync required after implementation. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tab shell/content | Auto-switches to Team on team selection; user can switch away. | No global task-summary activation is needed for the clarified design; transient row clicks should reuse existing team-member focus behavior. |
| `autobyteus-web/composables/useRightSideTabs.ts` | Global right-tab state | Exposes `activeTab`, `visibleTabs`, `setActiveTab`. | Reuse for activation; avoid new tab state owner. |
| `autobyteus-web/composables/useRightPanel.ts` | Right panel visibility/width | Only exposes toggle, no explicit open. | No change needed unless implementation chooses to open right panel on transient row focus; clarified core flow uses existing focus selection. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab Messages/Tasks accordion | Local `expandedSection`; default/reset is `messages`. | Should remain task detail accordion owner; no global activation request required by clarified design. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Active task split coordinator | Owns local selected task/reference state. | Remains detail owner; preserve task selection state locally. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | Team Tasks left navigator | Renders rich task item hierarchy including references and technical details. | Do not embed this whole component in global Workspaces tree; relocate only execution target rows. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | Team Tasks right detail/reference preview | Renders task body or selected reference. | Right detail remains authoritative; global tree links here. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Active task projection | Existing `deriveActiveTaskEntries()` is suitable source for task summary/count/status/target. | Reuse; no duplicate DTO. |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Stable team rows for Workspaces tree | Filters task projection nodes from normal rows. | Preserve this filtering. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspaces tree shell | Currently has no active task binding. | Candidate host for inline transient task execution display-row bindings. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Workspaces tree workspace/team/member renderer | Renders normal team/member rows only. | Render inline transient task execution rows under expanded team rows using runtime placement if approved. |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Workspaces tree contracts | Currently no active-task contracts. | Add narrow display-row contract for stable vs transient rows, not rich detail selection ownership. |
| `autobyteus-web/components/workspace/common/StatusDot.vue` | Shared status dot | Already used in Workspaces tree and Team Tasks navigator. | Reuse for temporary actor/member rows. |
| `autobyteus-web/docs/agent_execution_architecture.md` / `settings.md` | Durable architecture docs | State current right-Team-tab-only ownership. | Must update if approved. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-30 | Test | `pnpm -C autobyteus-web exec vitest run ...` | Could not execute because `vitest` was not installed in this fresh worktree (`node_modules` absent). | Investigation relies on code/static artifacts; implementation validation must prepare dependencies. |
| 2026-06-30 | Visual artifact review | `view_image` on historical browser evidence PNGs | Rejected global placement showed full task context under Workspaces tree; corrected placement shows Tasks only under Team tab. | Confirms need for bounded hybrid rather than full reversal. |

## External / Public Source Findings

No external sources used; this is an internal product/code investigation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not run for investigation; future E2E should use Electron-backed app or component fixtures with active task projections.
- Required config, feature flags, env vars, or accounts: Pending implementation stage.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation as recorded above.
- Cleanup notes for temporary investigation-only setup: None yet.

## Clarification Update (2026-06-30)

The user clarified that the desired change is not a separate `Live delegated tasks` group/card and not a full task-context move. The task itself remains on the right side under Team -> Tasks. Only the task-agent/task-agent-team execution rows should move to the global Workspaces tree, in their original/logical place under the relevant team/member hierarchy, with a dotted/dashed leading status circle visual effect that communicates temporariness without visible `Temp` wording.

Additional code confirmation:

- `teamTaskAgentContextProjection.ts` already inserts task-agent projections near the logical parent via `insertTaskAgentNodeNearParent()`.
- `teamTaskTeamExecutionProjection.ts` already inserts task-team roots near the structural team via `insertTaskTeamRootNearStructuralTeam()`.
- `teamTaskTeamChildProjection.ts` creates scoped child projection rows under task-team roots.
- Therefore the design should preserve this runtime placement and add a Workspaces display-row layer that styles transient rows distinctly instead of restoring the old full `TeamActiveTaskContextTree`.


## Redesign Direction After User Architecture Guidance (2026-06-30)

User requested a redesign that strictly follows the team's design principles and chooses the cleanest architecture boundary. The refined boundary is:

- Workspaces tree owns execution identity/hierarchy and focus rows, including transient task-agent/task-team rows.
- Right Team -> Tasks owns task detail/content only, message-style.
- Stable row projection remains durable-only; transient rows are rendered through a display-row union derived from live `AgentTeamContext.memberTree`.
- No legacy dual paths: do not restore raw transient nodes as ordinary stable rows, and do not restore full global task context.

## Findings From Code / Docs / Data / Logs

### Older original Workspaces-tree placement found after user follow-up

A deeper history check found an older, simpler Workspaces-tree behavior before the later `TeamActiveTaskContextTree` attempt:

- In `0fae9c60` (2026-06-02), `autobyteus-web/stores/runHistoryTeamRows.ts` used `teamContext.memberTree` directly for live team rows.
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` then rendered `flattenTeamMembers(team)`, so any task-agent projection node already inserted into `memberTree` appeared inline under the team/member hierarchy.
- This older approach did not require a special Workspaces task-context component. It inherited the normal Workspaces member row renderer, which explains why temporary task agents felt like normal durable rows.
- `d0c2f995` later added `isTransientTaskProjectionNode()` filtering to remove those projections from normal Workspaces rows before the Team-tab active-task UI direction.

Design implication: the current design should be closer to the older direct inline placement than to `6d772875`, but with a crucial fix: do not make transient projections ordinary `TeamMemberTreeRow` output. Instead, compose renderer-facing display rows that preserve `memberTree` order while giving task-agent/task-team rows a transient row kind, dotted/dashed leading status circle, and light ghost background.


### Current-state facts

- `AgentTeamContext.memberTree` is the runtime projection surface for both structural members and transient task executions. It is correct for runtime routing/focus, but not directly correct for stable navigation rendering.
- `deriveActiveTaskEntries()` already abstracts task projection nodes for Team Tasks. For Workspaces inline rows, runtime `memberTree` placement is the key source; avoid rendering task summaries/references/details there.
- The global Workspaces tree already groups team runs by workspace/team definition and expands team rows to show stable members. It is the right place for ambient visibility if the rendering is clearly separated from stable member rows.
- The current Team Tasks UI is still needed. It owns task body reading, reference previews, and technical details; moving all of that to the global tree would regress the earlier correction.

### Historical facts

- `2c2e9311 feat(web): move transient tasks to team tab` completed a deliberate move away from global-tree transient task rendering.
- `6d772875 checkpoint: left panel team context delivery candidate` implemented a full global-tree active-task context path including task summary, actor rows, reference rows, technical details, selection store, right panel activation, and status dots.
- The `task-left-panel-team-context` addendum explicitly corrected that approach: full active-task context belongs in the Team active-task split, not the global Workspaces tree.
- The user's new prompt reopens the placement decision with a stronger visual-semantics requirement: the confusing part may have been that the temporary entries were rendered too similarly to persistent agents/teams.

### Recommendation conclusion

A full return to old global-tree rendering is not recommended. After clarification, the recommended shape is inline transient task-agent/task-team execution rows in the Workspaces tree, with dotted/dashed temporary styling and no task summary/reference/technical detail content there.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility dual path should keep the old full global context. The global tree should get only inline transient execution-node rows.
- `buildTeamRowsFromContext()` filtering should remain authoritative for normal member rows.
- Cross-surface activation should be one-way and narrow; avoid a store that duplicates task entries or becomes a second selection owner.
- Right Team tab docs/tests must change if approved.

## Open Unknowns / Risks

- Visual treatment approved by user on 2026-06-30: use dotted/dashed leading status circle plus light ghost background instead of the durable solid leading status circle; avoid visible `Temp` wording by default; keep tooltip/aria text for accessibility if needed.
- Need ensure multiple transient execution rows remain readable inline. Recommended first implementation: render rows in runtime order and rely on normal tree indentation; do not add a separate task list/card.
- Need decide exact right-side pruning behavior for actor/member rows. Recommended: keep task summary/references/technical details in Team Tasks and avoid duplicated primary execution-node rows there.
- Dependency installation is absent in this fresh worktree; tests could not be run during investigation.

## Notes For Architect Reviewer

Proposed design spec path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-spec.md`. The design has been revised to inline transient task-agent/task-team execution rows in the Workspaces tree rather than adding a separate live-task group.

If approved, the design should be reviewed for boundary safety: global Workspaces tree may host inline transient task-agent/task-team execution rows, but right Team Tasks must remain the task content/detail owner and stable member rows must not absorb task projection nodes as ordinary durable rows. Pay special attention to the display-row union so it preserves runtime placement without restoring the old full global context tree.

## Electron Implementation Review Finding (2026-07-01)

User-provided screenshot showed the implemented transient rows with redundant circular markers: a normal solid status dot, an extra dotted initials/avatar circle, and a trailing dotted marker. This came from ambiguous earlier wording (`dotted circle/avatar`) that could be interpreted as adding a new dotted avatar instead of changing the status dot itself.

Clarified design requirement: the dotted/dashed circle is the leading status indicator itself. Transient rows should have exactly one visible dotted/dashed circular marker, in the leading status-dot slot, plus light ghost background. No extra dotted initials/avatar circle and no trailing dotted marker.

## Transient Task-Team Disclosure Finding (2026-07-01)

Source review:

- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`

Existing persistent team/member behavior:

- Persistent team run rows are collapsed by default after the team-definition group is opened.
- Nested persistent `agent_team` member rows with children are collapsed by default.
- Expansion is user-controlled through disclosure state exposed by the Workspaces tree section state boundary.

Current transient implementation risk:

- `buildWorkspaceTeamExecutionDisplayRows()` visits a transient `task_team` and immediately appends its visited child rows.
- `visibleTeamExecutionRows()` currently treats only stable `agent_team` display rows as expandable/collapsible through `stableRowHasChildren(...)`.
- Therefore transient task-team children can appear by default, which differs from persistent agent-team behavior.

Clarified design requirement:

- A transient task-team row should be visible at its hierarchy position but collapsed by default.
- Its child rows should appear only after the user expands that transient task-team row.
- Expansion state should be keyed by transient row identity, preferably using the existing `teamRunId + memberRouteKey` expansion state shape if safe.
