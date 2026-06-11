# Future-State Runtime Call Stacks: Agent Team Disclosure Affordance

## Design Basis
- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/agent-team-chevron-affordance/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/agent-team-chevron-affordance/implementation.md` (Stage 3 solution sketch)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory: `implementation.md` -> `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`
  - Ownership: `implementation.md` -> `Primary Owners / Main Domain Subjects`, `File Placement Plan`

## Future-State Modeling Rule
This document models the intended target behavior after the UI affordance change. It is not an as-is execution trace.

## Use Case Index
| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `WorkspaceHistoryWorkspaceSection.vue` | Requirement | REQ-001, REQ-002 | N/A | Recognize team-definition disclosure affordance | Primary: Yes / Fallback: N/A / Error: N/A |
| UC-002 | DS-001, DS-002 | Primary End-to-End + Bounded Local | `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistoryTreeState.ts` | Requirement | REQ-001, REQ-002, REQ-003 | N/A | Recognize and inspect team-run disclosure state | Primary: Yes / Fallback: N/A / Error: N/A |
| UC-003 | DS-002 | Bounded Local | `useWorkspaceHistorySelectionActions.ts`, `useWorkspaceHistoryTreeState.ts` | Requirement | REQ-002 | N/A | Existing row click behavior remains intact | Primary: Yes / Fallback: Yes / Error: Yes |
| UC-004 | DS-001, DS-002 | Primary End-to-End | Test/browser validation owners | Requirement | REQ-004 | N/A | Validate affordance with component and browser checks | Primary: Yes / Fallback: Yes / Error: N/A |
| UC-DR-001 | DS-001, DS-002 | Design-Risk | `WorkspaceHistoryWorkspaceSection.vue` | Design-Risk | REQ-002, REQ-003 | Avoid nested interactive controls or behavior regressions while increasing visual prominence. | Preserve single row-button boundary | Primary: Yes / Fallback: N/A / Error: N/A |

## Transition Notes
- No migration or compatibility path is required.
- The target state replaces the old tiny chevron styling directly in the existing component.
- No retirement plan is needed because no temporary logic is introduced.

## Use Case: UC-001 Recognize team-definition disclosure affordance

### Spine Context
- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- Why This Use Case Matters To This Spine: User verification clarified that `Software Engineering Team (13)` should retain its original compact disclosure arrow and must not receive a square/bordered control.

### Goal
Render team-definition rows with their original compact standalone chevron while keeping the row button as the single interactive boundary.

### Preconditions
- `WorkspaceAgentRunsTreePanel.vue` has loaded workspace history groups and passes `workspaceTeams`, `workspaceTeamHistoryGroups`, `state`, `avatars`, and `actions` to `WorkspaceHistoryWorkspaceSection.vue`.
- `groupedTeamDefinitions` contains at least one group.

### Expected Outcome
- Each team-definition row still has `data-test="workspace-team-definition-row-${group.key}"` and `aria-expanded`.
- The row renders the original compact standalone chevron icon, with no `workspace-team-definition-disclosure` wrapper.
- The chevron still rotates according to `state.isTeamDefinitionExpanded(workspaceNode.workspaceRootPath, group.key)`.

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:<template>(workspaceNode)
├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:setup(props)
│   └── autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts:buildWorkspaceTeamDefinitionDisplayGroups(...)
├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderTeamDefinitionRow(group)
│   ├── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:isTeamDefinitionExpanded(workspaceRootPath, groupKey) [STATE READ]
│   ├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderOriginalCompactChevron(expanded)
│   │   └── @iconify/vue:Icon(heroicons:chevron-down-20-solid) # compact original parent-team chevron
│   └── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderTeamDefinitionLabelAndCount(group)
└── Browser:paintSidebarRow(...) # user sees unchanged parent-team disclosure style
```

### Branching / Fallback Paths
- Fallback Path: N/A. This is deterministic rendering when a team-definition group exists.
- Error Path: N/A. No new error-producing behavior is introduced.

### State And Data Transformations
- `groupedTeamDefinitions` -> row label/status/avatar/count -> rendered team-definition row.
- `isTeamDefinitionExpanded(...)` boolean -> `aria-expanded` and chevron rotation class.

### Observability And Debug Points
- Component test can assert no `data-test="workspace-team-definition-disclosure"` wrapper is rendered and row `aria-expanded` remains present.
- Browser visual inspection can confirm the parent row is not boxed while child team-run rows carry the stronger non-square affordance.

### Design Smells / Gaps
- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions
- None.

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-002 Recognize and inspect team-run disclosure state

### Spine Context
- Spine ID(s): DS-001, DS-002
- Spine Scope: Primary End-to-End + Bounded Local state read
- Governing Owner: `WorkspaceHistoryWorkspaceSection.vue` for row rendering; `useWorkspaceHistoryTreeState.ts` for expansion state.
- Why This Use Case Matters To This Spine: The screenshot close-up shows child team run rows with tiny arrows; those rows unfold to show members and need clear disclosure state.

### Goal
Render team-run rows with the same obvious disclosure affordance and expose accurate `aria-expanded` state.

### Preconditions
- A team-definition group is expanded and renders `group.runs`.
- At least one team run has member rows or can be expanded by existing selection logic.

### Expected Outcome
- Each team-run row keeps `data-test="workspace-team-row-${team.teamRunId}"`.
- Each team-run row button includes `aria-expanded` bound to `state.isTeamExpanded(team.teamRunId)`.
- The visual disclosure chevron matches the parent team row exactly: same icon, `h-3.5 w-3.5`, and `text-gray-400`, without using a surrounding square/bordered wrapper.

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderExpandedTeamDefinition(group)
├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderTeamRunRow(team)
│   ├── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:isTeamExpanded(teamRunId) [STATE READ]
│   ├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderOriginalCompactChevron(expanded)
│   │   └── @iconify/vue:Icon(heroicons:chevron-down-20-solid) # compact original parent-team chevron
│   ├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:formatTeamRunLabel(team)
│   └── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.applyAriaExpanded(expanded)
└── Browser/AssistiveTech:observeTeamRowDisclosureState(...)
```

### Branching / Fallback Paths
- Fallback Path: N/A. Rendering does not branch beyond expanded/collapsed state.
- Error Path: N/A. No new error-producing behavior is introduced.

### State And Data Transformations
- `state.isTeamExpanded(team.teamRunId)` boolean -> `aria-expanded` + chevron rotation + member-list visibility.
- `team.summary` -> `formatTeamRunLabel(team)` -> row label.

### Observability And Debug Points
- Component test can assert collapsed row `aria-expanded="false"`, expanded row `aria-expanded="true"`, and the presence of `data-test="workspace-team-run-disclosure"`.

### Design Smells / Gaps
- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions
- None.

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

## Use Case: UC-003 Existing row click behavior remains intact

### Spine Context
- Spine ID(s): DS-002
- Spine Scope: Bounded Local
- Governing Owner: `useWorkspaceHistorySelectionActions.ts` and `useWorkspaceHistoryTreeState.ts`
- Why This Use Case Matters To This Spine: The visual fix must not add a separate nested button or change selection/toggle semantics.

### Goal
Keep existing team-definition and team-run click behavior after the visual affordance change.

### Preconditions
- Team-definition row and team-run row exist.
- Existing state/action bindings are passed from `WorkspaceAgentRunsTreePanel.vue`.

### Expected Outcome
- Clicking a team-definition row still calls `state.toggleTeamDefinition(...)`.
- Clicking an unselected team-run row still calls `actions.onSelectTeam(team)`, expands the team, and selects/focuses the target member as before.
- Clicking an already selected team-run row still toggles expansion via existing `onSelectTeam` logic.

### Primary Runtime Call Stack
```text
[ENTRY] Browser:clickTeamDefinitionRow(group)
└── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>@click
    └── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:toggleTeamDefinition(workspaceRootPath, groupKey) [STATE]
        └── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:setTeamDefinitionExpanded(...)
```

```text
[ENTRY] Browser:clickTeamRunRow(team)
└── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>@click
    └── autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:onSelectTeam(team)
        ├── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:setTeamExpanded(teamRunId, true) [STATE]
        ├── autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:resolveTeamTargetMember(team)
        ├── autobyteus-web/stores/runHistoryStore.ts:selectTreeRun(targetMember) [ASYNC/STATE]
        ├── autobyteus-web/stores/workspaceSelectionStore.ts:selectRun(teamRunId, 'team') [STATE]
        └── autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:emitRunSelected(...)
```

### Branching / Fallback Paths
```text
[FALLBACK] if selected team row is clicked again
autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:onSelectTeam(team)
└── autobyteus-web/composables/useWorkspaceHistoryTreeState.ts:toggleTeam(teamRunId) [STATE]
```

```text
[ERROR] if selecting team target member fails
autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:onSelectTeam(team)
└── console.error('Failed to open team:', error)
```

### State And Data Transformations
- Team click -> selected team/member run state.
- Expanded state mutation -> row re-render -> `aria-expanded` and member list visibility update.

### Observability And Debug Points
- Existing tests already click team rows and assert member rows become visible.
- Focused tests will assert `aria-expanded` changes with the same click sequence.

### Design Smells / Gaps
- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered by unchanged existing error handling; no new error path introduced`

## Use Case: UC-004 Validate affordance with component and browser checks

### Spine Context
- Spine ID(s): DS-001, DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: component test suite and local browser verification.
- Why This Use Case Matters To This Spine: The change is visual; automated tests check deterministic semantics/classes while browser inspection verifies perceived affordance.

### Goal
Prove the change meets acceptance criteria without relying only on manual observation.

### Preconditions
- Source implementation complete.
- Dependencies installed.
- Electron backend is reachable at Nuxt default backend target if available.

### Expected Outcome
- Focused Vitest command passes.
- Browser opens local frontend and shows improved team disclosure affordance, or records environment limitation if backend data/server is not available.

### Primary Runtime Call Stack
```text
[ENTRY] shell:pnpm --dir autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts
├── vitest:mount(WorkspaceAgentRunsTreePanel)
├── autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderTeamRows(...)
└── vitest:assert(disclosure affordance + aria-expanded + existing expansion behavior)
```

```text
[ENTRY] shell:pnpm --dir autobyteus-web dev --host 127.0.0.1 --port <port>
├── Nuxt dev server:proxyGraphQLToBackend(localhost:8000) [IO]
├── Browser:open(http://127.0.0.1:<port>/workspace)
└── Browser:inspectLeftAgentsSidebarDisclosureAffordance(...)
```

### Branching / Fallback Paths
```text
[FALLBACK] if Electron backend is not reachable or no team history rows are present
Browser verification records limitation and uses available UI state/test evidence; Stage 7 marks browser scenario with constraints rather than silently passing unavailable live-data evidence.
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-DR-001 Preserve single row-button boundary

### Spine Context
- Spine ID(s): DS-001, DS-002
- Spine Scope: Design-Risk
- Governing Owner: `WorkspaceHistoryWorkspaceSection.vue`
- Why This Use Case Matters To This Spine: A common UI fix mistake would be to add a nested button just for the chevron, creating invalid nested interactive controls and changing click behavior.

### Goal
Improve affordance without creating a second interactive boundary.

### Preconditions
- Team definition/team run rows are rendered as buttons.

### Expected Outcome
- The disclosure affordance is a non-interactive Icon child inside the existing row button.
- Row button remains the only clickable/keyboard-focusable control for expansion/selection.

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue:<template>.renderTeamDisclosure(...)
├── parent team-definition row: render original compact <Icon ... /> with no disclosure wrapper
├── individual team-run row: render <Icon data-test="workspace-team-run-disclosure" ... /> using the same compact gray chevron classes as the parent team row
└── existing parent <button> keeps @click and keyboard behavior
```

### Branching / Fallback Paths
- Fallback Path: N/A.
- Error Path: N/A.

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
