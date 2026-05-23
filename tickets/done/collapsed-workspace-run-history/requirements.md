# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the proposed progressive-disclosure UX on 2026-05-22.

## Goal / Problem Statement

The desktop left sidebar Workspaces run-history tree currently opens with workspace sections expanded, and nested run-history groups are visible immediately. For users with many workspaces and many historical runs, this creates a noisy sidebar and makes it harder to scan for the desired workspace, agent/team group, or run.

The desired default is a calmer progressive-disclosure tree: on ordinary app/sidebar open, show workspace rows only. Users should explicitly expand the workspace they want, then explicitly expand the agent/team group whose run history they want to browse.

## Investigation Findings

- The relevant desktop UI is `autobyteus-web/components/AppLeftPanel.vue`, which mounts `WorkspaceAgentRunsTreePanel.vue` in the left sidebar.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` renders each workspace through `WorkspaceHistoryWorkspaceSection.vue`.
- The expansion state owner is mostly `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`.
- Current default behavior is caused by:
  - `isWorkspaceExpanded(workspaceRootPath)` returning `expandedWorkspace[workspaceRootPath] ?? true`.
  - `isAgentExpanded(workspaceRootPath, agentDefinitionId)` returning `expandedAgents[key] ?? true`.
  - `WorkspaceHistoryWorkspaceSection.vue` local `isTeamDefinitionExpanded(groupKey)` returning `expandedTeamDefinitions[groupKey] ?? true`.
- Team-run member rows already default collapsed through `isTeamExpanded(teamRunId) => expandedTeams[teamRunId] ?? false`, with selected team runs expanded by a watcher.
- The existing ownership is appropriate for this change: projection/read-model code builds the tree data; UI/composable code owns view expansion state.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX improvement.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue found.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found; the current expansion owner exists, but its product default is too aggressive for large histories.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed.
- Evidence basis: `useWorkspaceHistoryTreeState.ts` centralizes workspace/agent/team-run expansion state; `WorkspaceHistoryWorkspaceSection.vue` owns team-definition expansion locally. The data projection layer is unaffected.
- Requirement or scope impact: Implement as a local UI default-state change with focused unit/regression coverage. Avoid altering history fetching, sorting, grouping, deletion, archiving, or selection/hydration behavior.

## Recommendations

1. Change ordinary initial sidebar state so all workspace sections are collapsed by default.
2. When a user expands a workspace, show the next-level agent and team-definition group rows, but keep their run histories collapsed by default.
3. Users then click only the agent/team group they want to work with to reveal that group’s run history.
4. Preserve explicit user control: once a user expands/collapses a workspace or group during the current mounted session, do not override that manual choice during periodic history refresh.
5. Keep newly created workspaces expanded after creation, because that is an explicit user action and current code already calls `setWorkspaceExpanded(workspaceRootPath, true)`.
6. Preserve context-reveal behavior for explicit run selection/deep-link cases: if the app opens or selects a specific run programmatically, expand only that run's ancestry instead of expanding all workspaces/groups.
7. Do not change server/API history limits or data grouping for this task. This is a visibility/default-state behavior change.

## Scope Classification (`Small`/`Medium`/`Large`)

Small.

## In-Scope Use Cases

- UC-1: User opens the desktop app/sidebar with multiple workspaces and history; only workspace rows are visible initially.
- UC-2: User clicks a workspace row; that workspace expands and shows agent/team group rows without immediately showing run rows.
- UC-3: User clicks an agent group; that agent group expands and shows its run rows.
- UC-4: User clicks a team-definition group; that team group expands and shows its team run rows. Team-member rows remain governed by existing team-run expansion behavior.
- UC-5: User collapses/expands a workspace or group manually; periodic history refresh does not reset the choice.
- UC-6: User creates/adds a workspace; the newly created workspace is expanded so they see the result of their action.
- UC-7: If an explicit selected run/team is already active due to navigation or programmatic selection, the UI reveals only the relevant workspace/group ancestry without expanding unrelated workspaces/groups.

## Out of Scope

- Changing run-history query limits, sorting, filtering, search, or backend data shape.
- Redesigning the whole Workspaces sidebar tree.
- Persisting expansion state across app restarts unless explicitly requested later.
- Mobile context switcher behavior; the reported screenshot and code path are desktop left-sidebar behavior.
- Archival/deletion/termination semantics.
- Adding a new search feature or workspace/run count summary beyond the existing counts.

## Functional Requirements

- REQ-1: On ordinary initial render after run history loads, workspace sections MUST be collapsed by default.
- REQ-2: A collapsed workspace row MUST still show the workspace name and existing visual affordance indicating it can be expanded.
- REQ-3: Clicking a workspace row MUST toggle only that workspace's expanded/collapsed state.
- REQ-4: When a workspace is expanded, agent group rows and team-definition group rows MUST be visible, but their run-history lists MUST remain collapsed by default.
- REQ-5: Clicking an agent group row MUST toggle only that agent group's run-history list.
- REQ-6: Clicking a team-definition group row MUST toggle only that team-definition group's team-run list.
- REQ-7: Team-run member expansion MUST keep the existing behavior: team run rows default collapsed unless selected/opened through existing team selection behavior.
- REQ-8: Manual workspace/group expansion/collapse state MUST survive run-history refreshes while the component remains mounted.
- REQ-9: Newly created workspaces SHOULD remain expanded immediately after creation.
- REQ-10: Explicit run/team selection flows MUST NOT expand all workspaces/groups; if reveal is needed, they SHOULD expand only the selected run/team ancestry.
- REQ-11: Selected ancestry reveal MUST be one-shot for the current stable selection key: after the selected path is revealed, subsequent quiet refreshes MUST NOT re-expand that same path if the user manually collapses it.
- REQ-12: The change MUST NOT alter history data loading, grouping, sorting, run selection, team-member hydration, archive/delete/terminate actions, or active status rendering semantics for rows that are visible after expansion.

## Acceptance Criteria

- AC-1: Given two or more workspace nodes with agent/team history, when `WorkspaceAgentRunsTreePanel` finishes initial loading, only the workspace rows are visible; agent names, team-definition rows, run labels, and team rows under collapsed workspaces are not rendered.
- AC-2: Given an initially collapsed workspace, when the user clicks that workspace row, its agent group rows and team-definition group rows become visible.
- AC-3: Given an expanded workspace, agent run rows and team run rows remain hidden until the user expands the specific agent or team-definition group.
- AC-4: Given an expanded workspace and collapsed agent group, when the user clicks the agent group, that agent’s run rows become visible.
- AC-5: Given an expanded workspace and collapsed team-definition group, when the user clicks the team-definition group, that team definition’s team run rows become visible.
- AC-6: Given a user-expanded workspace/group, when `refreshTreeQuietly()` updates history data, that workspace/group remains expanded and unrelated collapsed workspaces/groups remain collapsed.
- AC-7: Given the user adds a workspace through the existing add-workspace flow, the newly added workspace is expanded after successful creation.
- AC-8: Existing tests or updated tests continue to prove selecting agent runs, selecting team runs, selecting team members, archiving, deleting, terminating, and lazy team hydration still work after first expanding the containing workspace/group.
- AC-9: Given a selected agent run or selected team run is restored before matching tree data is available, when the matching nodes become available, only that selected ancestry path is expanded once.
- AC-10: Given selected ancestry was auto-revealed, when the user manually collapses that workspace/group/team path and a quiet refresh updates tree nodes while the same run/team remains selected, the collapsed manual choice is preserved and the path is not auto-reopened.

## Constraints / Dependencies

- The codebase is Nuxt/Vue/Pinia under `autobyteus-web`.
- The history tree has a periodic refresh every 5000ms in `WorkspaceAgentRunsTreePanel.vue`; expansion state must not be recomputed from data in a way that causes refresh flicker or manual-choice resets.
- Existing tests currently assume rows are visible immediately; tests will need helper expansion before interacting with child rows.
- The behavior should be a clean default replacement, not a user-setting dual mode.

## Assumptions

- The user's primary complaint is the desktop left sidebar Workspaces history tree shown in the supplied screenshot.
- Product preference is ordinary startup compactness and intentional navigation: users open only the workspace and agent/team histories they want to work with.
- Cross-restart persistence of expansion state is not required for this ticket.

## Risks / Open Questions

- Agent group rows currently do not show an aggregate active-run status dot. Because run rows will be hidden until expansion, active-run discoverability may be slightly reduced in the left tree. This is accepted for this compactness-focused ticket unless product requests aggregate status in a follow-up.
- If selected run restoration occurs before tree data is available, selected-path reveal must wait until nodes are available and then reveal only once so later manual collapse is not overridden.

## Requirement-To-Use-Case Coverage

- REQ-1, REQ-2 -> UC-1.
- REQ-3, REQ-4 -> UC-2.
- REQ-5 -> UC-3.
- REQ-6, REQ-7 -> UC-4.
- REQ-8 -> UC-5.
- REQ-9 -> UC-6.
- REQ-10, REQ-11 -> UC-7 and UC-5.
- REQ-12 -> all use cases as regression guard.

## Acceptance-Criteria-To-Scenario Intent

- AC-1 verifies initial compactness.
- AC-2 verifies workspace-level progressive disclosure.
- AC-3 verifies run lists do not reintroduce clutter immediately after workspace expansion.
- AC-4 verifies agent history is available through one intentional group click.
- AC-5 verifies team history is available through one intentional group click.
- AC-6 verifies refresh stability and manual-choice preservation.
- AC-7 verifies create-workspace behavior remains helpful.
- AC-8 verifies no regression in existing history-tree workflows.
- AC-9 verifies pending selected-reveal after data availability.
- AC-10 verifies selected-reveal is manual-collapse-safe across quiet refresh.

## Approval Status

Approved by user in chat on 2026-05-22. The approved UX is: initial workspace rows only; when a workspace is opened, show agent/team group rows; users click the specific group they want to reveal run histories.
