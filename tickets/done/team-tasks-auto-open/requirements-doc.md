# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready.

## Goal / Problem Statement

Improve team-run discoverability and navigability in two related UI surfaces:

1. **Right-side Team tab active task discoverability:** When active delegated task-agent or task-team entries exist under the `Tasks` section, the `Tasks` section must automatically open so users can see and click the task agent / task team member that may require focus or interaction. Hidden active tasks are a serious UX failure because users may not know they need to expand the section manually.
2. **Workspace history nested-team navigability:** Large team runs with nested teams currently render nested team member trees fully expanded under a team run, with `TEAM` badges but no nested-team chevron. This makes large organizations visually huge and difficult to scan. Nested `agent_team` member rows should be collapsed by default and manually expandable with chevrons.

## Investigation Findings

### Active Tasks auto-open

- The right-side `Team` tab mounts `TeamOverviewPanel` through `autobyteus-web/components/layout/RightSideTabs.vue` when the selected run type is `team`.
- `TeamOverviewPanel.vue` owns the local Messages/Tasks accordion state through `expandedSection`, with default value `'messages'`.
- The same component watches `activeTeamRunId` and resets `expandedSection` to `'messages'` whenever the selected team run changes.
- `TeamActiveTasksSection.vue` is a controlled child. It receives `collapsed` from the parent and emits only `toggle` / `select-member`. It should not own parent accordion state.
- Active task rows are already derived by `deriveActiveTaskEntries(teamContext)` in `autobyteus-web/utils/teamActiveTaskEntries.ts`; it collects transient task-agent and task-team projection nodes (`isTaskAgentInstance` / `isTaskTeamInstance`) from `AgentTeamContext.memberTree`.
- Runtime streaming creates these transient task projection nodes from `TASK_DELEGATION_EVENT` and related task-scoped messages. Terminal/settled task-team projections are scheduled for cleanup, and task-agent contexts are removed when their status goes offline.
- Existing docs explicitly describe the current behavior as “opens Messages by default, and resets to Messages when the active team run changes,” so docs sync will likely need to update that sentence after implementation.

### Nested teams in Workspace history

- The second screenshot maps to `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`: a team run row with a run summary and relative timestamps (`1w`) is expanded, and all `memberTree` descendants are rendered as a flat list.
- Current implementation uses `flattenTeamMembers(team)` with `members.flatMap((member) => [member, ...flatten(member.children)])`, so every nested team and all descendants are displayed whenever the parent team run is expanded.
- Nested team member rows only show a `TEAM` badge. They have no nested-team disclosure button/chevron and no state for expanding/collapsing subtrees.
- `useWorkspaceHistoryTreeState.ts` currently owns expansion state for workspaces, agent groups, team definition groups, and team run rows only. It does not own member/subteam expansion state.
- Existing selection actions (`useWorkspaceHistorySelectionActions.ts`) set the team run expanded when selecting a team/member, but there is no concept of expanding ancestors for a nested member.
- A similar flat task-team member rendering pattern exists in `TeamActiveTaskNavigator.vue` via `ActiveTaskEntry.members`, but the user-provided nested-team screenshot is the Workspace history tree. If product wants identical collapse behavior inside active task-team navigators, that should be treated as a deliberate extension, not accidentally coupled to the history fix.

### Test environment

- Focused local test execution was attempted, but this fresh task worktree has no `node_modules`; `pnpm --dir autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` failed at `cross-env: command not found` before running tests.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, bounded/local
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Duplicated/Incomplete Tree Presentation Policy
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but bounded to frontend presentation state/helpers
- Evidence basis:
  - `TeamOverviewPanel` is already documented and implemented as the owner of Messages/Tasks expansion state; `TeamActiveTasksSection` already owns task list/detail rendering; `deriveActiveTaskEntries` already exposes task-entry presence. The missing invariant is that parent expansion state does not respond to active task entry presence.
  - `WorkspaceHistoryWorkspaceSection` flattens nested member rows directly and bypasses any tree-row presentation state. The missing policy is nested member subtree expansion state and recursive rendering for `agent_team` rows.
- Requirement or scope impact: The active-task behavior should stay local to Team tab accordion behavior. The nested-team behavior should target the Workspace history team member tree shown in the screenshot, with a reusable/local helper acceptable if it keeps tree presentation logic out of ad hoc template flattening.

## Recommendations

### Active Tasks auto-open

- Keep `TeamOverviewPanel` as the governing owner of section expansion.
- Reuse `deriveActiveTaskEntries(activeTeamContext)` as the active-task source of truth for the auto-open decision so the parent opens exactly when the child would show task rows/counts.
- Add a parent-owned active task identity/signature computed from task entry route keys/task run identities.
- Auto-open `Tasks`:
  - on initial render or selected team-run change when the selected team already has active task entries;
  - on transition from no active task entries to one or more;
  - when a new/different active task entry appears after the user has switched back to Messages or manually collapsed Tasks.
- Preserve manual control for the unchanged task set: users can switch away/collapse, but the next new active task set must draw attention by opening `Tasks` again.
- Keep no-active-task behavior unchanged: if the selected team has no active task entries, `Messages` remains the default on selection/team-run change.

### Nested Workspace history teams

- Replace unconditional flattening in `WorkspaceHistoryWorkspaceSection` with recursive tree rendering for team members.
- Add `agent_team` member-row disclosure state scoped by `teamRunId + memberRouteKey`.
- Default nested subteams collapsed when a team run is expanded, so large organizations remain compact.
- Render a chevron only for `agent_team` rows that have children. Agent leaf rows should remain selectable and visually aligned.
- Split interactions clearly:
  - chevron click toggles child visibility and does not select/open the member;
  - row click selects/focuses the member as today.
- When selecting a nested member through the history tree, keep or open its ancestor subteams as needed so the selected row does not disappear immediately after selection.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: Each behavior is a focused frontend UI-state change, but they touch two different presentation surfaces (`TeamOverviewPanel` and Workspace history team member rendering) and require durable tests.

## In-Scope Use Cases

- UC-001: A selected team run already has one or more active delegated task entries when `TeamOverviewPanel` renders; `Tasks` opens automatically.
- UC-002: A selected team run gains its first active delegated task entry while `TeamOverviewPanel` is mounted; `Tasks` opens automatically.
- UC-003: A user manually toggles Messages/Tasks after auto-open; controls remain usable, and the same unchanged task set does not immediately fight the user, but a new active task reopens Tasks.
- UC-004: The user switches selected team runs; if the new run has active task entries, `Tasks` opens; otherwise `Messages` remains the default.
- UC-005: Existing task focus workflow remains intact: clicking explicit task actor/member rows still focuses that member; task summary/reference clicks remain reading-only.
- UC-006: A Workspace history team run with nested `agent_team` members is expanded; top-level members/subteams are visible, but nested subteam children are collapsed by default.
- UC-007: The user clicks a nested subteam chevron in Workspace history; that subteam expands/collapses without selecting/focusing the row.
- UC-008: The user clicks a nested subteam row or child member row in Workspace history; existing selection/open behavior still works.

## Out of Scope

- Redesigning the whole right-side panel, tab order, or Workspaces sidebar.
- Changing delegate-task backend semantics, task ledger behavior, or task streaming protocol.
- Changing task creation, assignment, specialist messaging, or task cleanup lifecycle.
- Adding new global notification/badge systems outside the Team tab.
- Changing `TeamActiveTasksSection` list/detail behavior except as needed for tests around parent auto-open.
- Making `Tasks` permanently forced open with no ability to manually collapse it for the same unchanged task set.
- Redesigning all team member lists globally. The nested collapse requirement targets the Workspace history tree shown by the user. Applying the same collapse behavior to active task-team navigators can be a follow-up unless explicitly pulled into implementation scope by design review/user direction.

## Functional Requirements

- REQ-001: When a selected team context has one or more active task entries, `TeamOverviewPanel` must automatically expand the `Tasks` section so delegated task content is discoverable without manual expansion.
- REQ-002: The auto-open decision must be based on the same active task entries that populate `TeamActiveTasksSection`, not on unrelated historical/completed rows.
- REQ-003: When the selected team run changes, the section default must be `Tasks` if active task entries exist for the new run, otherwise `Messages`.
- REQ-004: After auto-open occurs for an unchanged active task set, manual section toggles must continue to work; the UI must not immediately re-open `Tasks` solely because the same task set is still present.
- REQ-005: When a new or different active task entry appears after the user has switched away or collapsed `Tasks`, the panel must auto-open `Tasks` again.
- REQ-006: Existing Messages functionality, message counts, and `TeamCommunicationPanel` props must remain intact.
- REQ-007: Existing task selection/focus behavior in `TeamActiveTasksSection` and `TeamActiveTaskNavigator` must remain intact.
- REQ-008: Workspace history team member rendering must preserve the team run row expansion behavior while rendering nested team members as a collapsible tree instead of an always-flat list.
- REQ-009: Workspace history nested `agent_team` member rows with children must show a chevron/disclosure control and start collapsed by default.
- REQ-010: Workspace history leaf agent rows must remain directly selectable and must not show misleading disclosure controls.
- REQ-011: Clicking a nested team disclosure must only expand/collapse that nested team subtree; it must not trigger row selection/opening.
- REQ-012: Clicking a nested team row outside the disclosure, or a leaf member row, must preserve existing member selection/open behavior.
- REQ-013: When a selected/focused nested member would otherwise be hidden by collapsed ancestors, the UI should expand the necessary ancestor subteams after selection/reveal so the selected row remains visible.

## Acceptance Criteria

- AC-001: Given a selected team run already contains active task-agent or task-team projection nodes, when `TeamOverviewPanel` mounts, `team-active-tasks-body` is visible and `team-communication-panel` is hidden by accordion state.
- AC-002: Given a selected team run has zero active task entries, when `TeamOverviewPanel` mounts or the selected team run changes, Messages remains open and Tasks is not force-opened.
- AC-003: Given active task entries appear while `TeamOverviewPanel` is mounted and Messages is open, the panel expands Tasks automatically.
- AC-004: Given Tasks auto-opened for a task set, when the user clicks the Tasks header to collapse it, Tasks remains collapsed until the active task identity set changes or the user manually opens it.
- AC-005: Given the selected team run changes to another run with active task entries, Tasks opens for that run instead of resetting to Messages.
- AC-006: Existing assertions that Messages count/perspective props are correct continue to pass.
- AC-007: Existing task focus workflow tests are updated as needed so they do not manually toggle an already auto-opened Tasks section closed, and task actor/member focus behavior still passes.
- AC-008: Given a Workspace history team run with nested `agent_team` members, when the team run is expanded, nested subteam rows are visible but their children are hidden by default.
- AC-009: Given a nested Workspace history subteam row has children, its row includes a chevron/disclosure with `aria-expanded="false"` initially.
- AC-010: Given the nested subteam disclosure is clicked, only that subtree expands, `aria-expanded` becomes `true`, child rows become visible, and the member selection action is not called by that disclosure click.
- AC-011: Given the nested subteam disclosure is clicked again, child rows are hidden and `aria-expanded` returns to `false`.
- AC-012: Given a nested subteam row label/body is clicked, the existing `onSelectTeamMember` path runs for that subteam member.
- AC-013: Given a child row is selected under an expanded subteam, the selected row remains visible after selection.

## Constraints / Dependencies

- Implement in `autobyteus-web`.
- Reuse existing `utils/teamActiveTaskEntries.ts` derivation for active-task auto-open; do not introduce a second task-status interpretation in the parent.
- `TeamActiveTasksSection.vue` should remain controlled by parent `collapsed` props and should not own parent accordion state.
- No backend changes are expected.
- Workspace history nested expansion state should stay in the history-tree presentation owner (`useWorkspaceHistoryTreeState` / `WorkspaceHistoryWorkspaceSection` contract) rather than being persisted in backend history data.
- The worktree currently lacks dependencies; implementation validation may require installing/restoring `node_modules` or running tests in an environment where web dependencies are installed.

## Assumptions

- “Active tasks” for the Team tab means the same task entries currently rendered and counted by `TeamActiveTasksSection` via `deriveActiveTaskEntries`.
- The product-preferred active-task behavior is “auto-open for initial/new active task sets, but do not fight deliberate manual collapse for the same unchanged task set.”
- The Team tab itself already becomes active when a team run is selected through existing `RightSideTabs` behavior; this task is about expanding the `Tasks` section inside that tab.
- The nested-team screenshot refers to the Workspace history team member tree, not the active task navigator. If active task-team navigator collapse is also required immediately, scope should be explicitly expanded.

## Risks / Open Questions

- OQ-001: Should the active task-team navigator also receive nested-subteam chevrons in this same change, or is the Workspace history tree screenshot the only nested-team surface in scope? Recommended: keep active task navigator out of this change unless architecture review confirms the shared pattern is cheap and low risk.
- RISK-001: Vue reactivity around `Map` and nested `memberTree` mutations should be covered with component tests to ensure the active-task signature updates when streaming inserts task projection nodes.
- RISK-002: Existing workflow tests that manually click the Tasks header may need adjustment because Tasks will now already be open for seeded active tasks.
- RISK-003: Workspace history has existing selection-reveal behavior for selected team runs. Adding member-level expansion must not regress automatic reveal of selected team runs or background refresh behavior.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002, UC-004 |
| REQ-003 | UC-004 |
| REQ-004 | UC-003 |
| REQ-005 | UC-002, UC-003 |
| REQ-006 | UC-001, UC-002, UC-004 |
| REQ-007 | UC-005 |
| REQ-008 | UC-006 |
| REQ-009 | UC-006, UC-007 |
| REQ-010 | UC-006, UC-008 |
| REQ-011 | UC-007 |
| REQ-012 | UC-008 |
| REQ-013 | UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves active delegated tasks are visible immediately on render. |
| AC-002 | Preserves no-task default Messages behavior and prevents historical/completed records from forcing Tasks open. |
| AC-003 | Proves the delegate-task arrival/update path is discoverable while the panel is mounted. |
| AC-004 | Proves auto-open does not break user-controlled accordion behavior. |
| AC-005 | Proves selected-run reset logic now respects active task presence. |
| AC-006 | Guards Messages section regression. |
| AC-007 | Guards task interaction workflow regression after tests adapt to auto-open. |
| AC-008 | Proves large nested teams no longer explode open by default. |
| AC-009 | Proves nested team rows expose a discoverable collapse/expand affordance. |
| AC-010 | Proves nested disclosure click toggles only subtree expansion and does not select. |
| AC-011 | Proves collapse works after expansion. |
| AC-012 | Guards existing member selection/open behavior. |
| AC-013 | Guards selected nested row visibility after selection. |

## Approval Status

Active-task auto-open behavior approved and clarified by user on 2026-06-30. Nested Workspace history team collapse behavior requested by user on 2026-06-30 and incorporated into design-ready scope. Remaining explicit decision for downstream design: whether to include the similar active task-team navigator nested collapse in this change or leave it as follow-up; current recommended scope leaves it as follow-up unless reviewer/user directs otherwise.
