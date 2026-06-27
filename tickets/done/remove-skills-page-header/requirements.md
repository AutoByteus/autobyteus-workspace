# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The Skills page currently renders a large standalone main-content header (`Skills`) and explanatory subtitle (`Manage and create file-based capabilities for your agents.`) above the search/action toolbar. This is redundant because the left navigation already communicates that the user is on the Skills page. The Agents and Agent Teams list pages use a simpler pattern: the list view begins with the search/action toolbar, not a duplicate page-title block. The Skills list page should follow that pattern.

## Investigation Findings

- User-provided screenshot shows the Skills sidebar item selected while the main content repeats `Skills` plus the subtitle above the toolbar.
- `autobyteus-web/components/skills/SkillsList.vue` owns the redundant header markup:
  - `<div class="header-left">`
  - `<h2>{{ $t('skills.components.skills.SkillsList.title') }}</h2>`
  - `<p class="subtitle">{{ $t('skills.components.skills.SkillsList.manage_and_create_file_based_capabilities') }}</p>`
- The same component owns the toolbar controls inside the same `.skills-header` container.
- `autobyteus-web/components/agents/AgentList.vue` and `autobyteus-web/components/agentTeams/AgentTeamList.vue` start their list views directly with the search field plus action buttons; neither renders a duplicate page-level title/subtitle above the toolbar.
- `SkillsList.title` and `SkillsList.manage_and_create_file_based_capabilities` are only referenced by the redundant Skills header/subtitle.
- Existing focused tests for Skills list behavior are in `autobyteus-web/components/skills/SkillsList.spec.ts`; Skills page view switching tests are in `autobyteus-web/pages/__tests__/skills.spec.ts`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The duplicated title/subtitle are local static markup and styles in `SkillsList.vue`; sibling list components already show the intended toolbar-first layout. The Skills page component and store/API boundaries remain correct.
- Requirement or scope impact: Make a local Skills list presentation cleanup; do not change data loading, routing, cards, modals, or backend behavior.

## Recommendations

- Replace the current Skills header block with a toolbar-only container in `SkillsList.vue`.
- Keep the search field, `Sources`, `Reload`, and `Create Skill` controls in their current order and behavior.
- Remove the header-only styles and now-unused localization keys for the title/subtitle if no references remain.
- Add/update a focused component test that prevents the redundant subtitle/header block from returning while preserving the existing reload test coverage.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- A user selects the Skills sidebar/menu item and views the Skills listing page.
- A user uses the Skills toolbar controls after the header removal.
- A user sees the Skills card grid, loading state, empty state, or error state after the toolbar.

## Out of Scope

- Changing Agents or Agent Teams page behavior.
- Changing sidebar/menu labels, icons, or routing.
- Changing Skills search semantics.
- Changing skill source management, reload behavior, create dialog behavior, detail navigation, card actions, enable/disable/delete behavior, or backend APIs.
- Reworking the Skills page into a full style-system migration beyond the local header removal and toolbar spacing cleanup.

## Functional Requirements

- `REQ-001`: The Skills listing page must not render the redundant standalone `Skills` page heading above the toolbar.
- `REQ-002`: The Skills listing page must not render the explanatory subtitle `Manage and create file-based capabilities for your agents.` above the toolbar.
- `REQ-003`: The Skills listing page must continue to render the existing toolbar controls in the list view: search input, `Sources`, `Reload`, and `Create Skill`.
- `REQ-004`: The Skills listing page must preserve existing skill card/grid behavior and per-skill actions.
- `REQ-005`: The Skills list top-of-content layout must follow the established Agents / Agent Teams list pattern by starting with the toolbar instead of a duplicate page-title block.
- `REQ-006`: Header-only localization keys and styles that become unused because of this cleanup must be removed or otherwise not left as active dead UI policy.

## Acceptance Criteria

- `AC-001`: When the Skills page is opened in list mode, there is no large standalone `Skills` heading in the main content above the toolbar.
- `AC-002`: When the Skills page is opened in list mode, the subtitle text `Manage and create file-based capabilities for your agents.` is absent from the main content.
- `AC-003`: The search input, `Sources`, `Reload`, and `Create Skill` controls remain visible, in the same relative order, and continue to call their existing handlers.
- `AC-004`: Existing Skills list loading, error, empty, filtered-empty, and card-grid states still render below the toolbar.
- `AC-005`: Existing Skills page detail navigation still works: selecting a skill opens `SkillDetail`, and returning/deleting/removing a selected skill still returns to list behavior as before.
- `AC-006`: Focused frontend tests cover the absence of the redundant header/subtitle and the continued presence/behavior of the toolbar controls.
- `AC-007`: No Agents or Agent Teams tests/surfaces need behavior changes for this task.

## Constraints / Dependencies

- Implement in the existing `autobyteus-web` frontend code path.
- Keep `SkillsList.vue` as the owner of Skills list toolbar/list rendering.
- Do not introduce compatibility branches, feature flags, or duplicate page-header policy.
- Do not change GraphQL, stores, generated API types, or backend skill behavior.
- Respect the localization boundary: remove or keep translation catalog entries only through catalog files; do not introduce inline product copy.

## Assumptions

- The screenshot reflects the current target UI issue in the local codebase.
- The desired Agents / Agent Teams comparison is the list-view toolbar-first pattern, not a broader redesign of cards or filters.
- Manual visual verification may be needed after implementation because this is a presentational UI cleanup.

## Risks / Open Questions

- Minor visual spacing adjustment may be needed after header removal so the toolbar does not inherit header-oriented spacing.
- Dependency installation may be absent in the new dedicated worktree; downstream implementation/testing should record if targeted tests cannot run locally without setup.

## Requirement-To-Use-Case Coverage

- Skills list viewing: `REQ-001`, `REQ-002`, `REQ-005`, `REQ-006`.
- Skills toolbar usage: `REQ-003`.
- Skills list/card states: `REQ-004`.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` / `AC-002`: Verify the exact redundant visual copy is removed.
- `AC-003`: Verify the cleanup does not regress the primary list toolbar.
- `AC-004`: Verify list content states remain reachable and correctly ordered below the toolbar.
- `AC-005`: Verify page-level list/detail behavior remains unchanged.
- `AC-006`: Give API/E2E/front-end coverage investigation an explicit target for durable UI regression coverage.
- `AC-007`: Keep the change local and prevent accidental sibling page regressions.

## Approval Status

Design-ready from the explicit user request on 2026-06-27. No clarification-dependent requirement remains open.
