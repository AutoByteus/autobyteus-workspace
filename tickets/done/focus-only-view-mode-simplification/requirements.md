# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready / Approved by user on 2026-06-27.

## Goal / Problem Statement

Simplify the frontend team/member workspace by removing the unused `Grid` and `Spotlight` team view modes and keeping only the current detailed focused-member experience. The UI should no longer show `Focus` / `Grid` / `Spotlight` controls, and the codebase should not retain obsolete alternate-mode state, layout branches, or tests solely to preserve those unused modes.

## Investigation Findings

- The main repo `personal` branch was refreshed first per user request. Local `personal` was fast-forwarded to `origin/personal` at `7b61278ca90af268532aa92f7bcf3aa5a765bf6c`; the dedicated task branch `codex/focus-only-view-mode-simplification` was created from that commit.
- The active frontend package is `autobyteus-web`.
- The user-visible mode switch is `autobyteus-web/components/workspace/team/TeamWorkspaceModeSwitch.vue`; it renders hard-coded `Focus`, `Grid`, and `Spotlight` options.
- `TeamWorkspaceView.vue` is the shell that reads `teamWorkspaceViewStore.getMode(...)`, renders `AgentTeamEventMonitor` for focus mode, renders `TeamGridView` for grid mode, renders `TeamSpotlightView` otherwise, and shows a shared composer for non-focus modes.
- `teamWorkspaceViewStore.ts` exists only to store per-team view mode (`focus` / `grid` / `spotlight`) and migrate/clear that UI-only state.
- `agentTeamContextsStore.ts` imports the view-mode type/store only to migrate temporary team-run mode state and to hydrate all historical members when a broader grid/spotlight mode is entered.
- `TeamGridView.vue`, `TeamSpotlightView.vue`, and `TeamMemberMonitorTile.vue` are active source files dedicated to the grid/spotlight multi-member layouts. Static reference checks show `TeamMemberMonitorTile.vue` has no active production caller outside those removed layouts; one `AgentTeamEventMonitor.vue` empty-state translation key currently reuses the tile namespace and should be moved to the focus monitor namespace before deleting tile localization keys.
- Active tests tied to the removed modes include `TeamGridView.spec.ts`, `TeamSpotlightView.spec.ts`, `teamWorkspaceViewStore.spec.ts`, mode-switch branches in `TeamWorkspaceView.spec.ts`, a broader-mode hydration case in `HistoricalTeamLazyHydration.integration.spec.ts`, and an `ensureHistoricalMembersHydratedForView` case in `agentTeamContextsStore.spec.ts`.
- Active docs mention `Focus/Grid/Spotlight` in `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, and `autobyteus-web/docs/agent_teams.md`; these should be updated. Historical ticket artifacts under `autobyteus-web/tickets/done/team-grid-view-modes` should remain archival and do not define current product behavior.
- No durable localStorage/server persistence was found for `teamWorkspaceViewStore`; the mode map is a Pinia in-memory UI state.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The current UI and source maintain three mode variants, a mode switch component, a mode store, dedicated grid/spotlight layout components, compact tile presentation, all-members historical hydration for broader modes, and mode-specific tests/docs. The user now wants a clean-cut focus-only product shape and explicitly does not want unused grid/spotlight code retained.
- Requirement or scope impact: This should be a removal-first cleanup, not a default-to-focus compatibility layer. The focus monitor, focused-member selection, team task bar, subteam composer behavior, and right-side member-scoped panels remain in scope for regression protection.

## Recommendations

- Proceed with a clean-cut removal of grid/spotlight modes rather than hiding the controls while retaining inactive code.
- Make `TeamWorkspaceView.vue` render only `AgentTeamEventMonitor` for active teams; keep existing header/focused-member display, task execution bar, and focus-member selection behavior.
- Remove `TeamWorkspaceModeSwitch.vue`, `TeamGridView.vue`, `TeamSpotlightView.vue`, `TeamMemberMonitorTile.vue`, `teamWorkspaceViewStore.ts`, and their tests if no new active caller appears during implementation.
- Remove `TeamWorkspaceView`'s `currentMode`, `setCurrentMode`, grid/spotlight component imports, mode switch rendering, non-focus shared-composer branch, and all-members hydration watcher.
- Remove `teamWorkspaceViewStore` coupling from `agentTeamContextsStore.ts`; the temporary-to-permanent team-run promotion should no longer migrate mode state, and `ensureHistoricalMembersHydratedForView` should be removed unless another active caller exists.
- Move the remaining `No activity yet` copy used by `AgentTeamEventMonitor.vue` out of the `TeamMemberMonitorTile` localization namespace before deleting tile-specific localization keys.
- Update active docs to describe roster/history visual focus as the single focus pane, not Focus/Grid/Spotlight surfaces.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens a team workspace and sees the detailed focused-member monitor directly, with no team view-mode picker.
- UC-002: A user changes the focused member through remaining focus mechanisms (for example team task bar, roster/history selection, or subteam child rows), and the focus pane, composer target, and right-side member-scoped surfaces remain coherent.
- UC-003: A historical team run hydrates focused member history through existing focus-selection flows without preloading all members for removed broader modes.
- UC-004: The frontend source, tests, localization, and active docs no longer maintain grid/spotlight-only code paths.

## Out of Scope

- Backend team execution, team streaming, run-history API, or team-message protocol changes.
- Redesigning the focus-mode layout beyond removing mode selection and obsolete alternate-mode logic.
- Keeping backward compatibility wrappers, hidden feature flags, or dual paths for grid/spotlight.
- Rewriting archival completed-ticket records under `autobyteus-web/tickets/done/**`.
- Removing shared conversation-feed code that is still actively used by `AgentEventMonitor` / `AgentTeamEventMonitor` focus rendering.

## Functional Requirements

- FR-001: The team workspace must present only the detailed focused-member monitor path for active teams.
- FR-002: The `Focus` / `Grid` / `Spotlight` mode switch control and equivalent mode-changing UI must be removed.
- FR-003: Grid-mode and spotlight-mode rendering components, mode state/store/type definitions, hydration hooks, tests, localization, and active documentation must be removed or updated where they exist solely for removed modes.
- FR-004: Focused-member selection and hydration behavior must continue to work through remaining focus entrypoints.
- FR-005: The team composer must preserve current focus-mode behavior, including focused agent-member messaging and existing subteam-focused shared composer behavior.
- FR-006: Active docs must describe the focus-only team workspace accurately and must not advertise grid/spotlight as available product modes.

## Acceptance Criteria

- AC-001: Opening the affected team workspace shows the focused-member monitor directly, with no `Focus` / `Grid` / `Spotlight` segmented control or equivalent team view-mode picker.
- AC-002: No active user interaction can switch the team workspace into grid or spotlight mode.
- AC-003: Static code search outside archival ticket folders finds no active `TeamGridView`, `TeamSpotlightView`, `TeamWorkspaceModeSwitch`, `teamWorkspaceViewStore`, or `TeamWorkspaceViewMode` production references.
- AC-004: `TeamWorkspaceView.vue` has no grid/spotlight rendering branches or non-focus mode store dependency.
- AC-005: Temporary-to-permanent team-run promotion no longer migrates obsolete view-mode state.
- AC-006: Historical-team lazy hydration no longer has a broader-mode preload path; focused-member hydration remains available when a member is selected.
- AC-007: Focus-mode behavior remains functional: focused member name/status/avatar render in the header, `AgentTeamEventMonitor` renders for the active team, and focus selection still updates the displayed member.
- AC-008: Subteam-focused composer behavior that currently depends on `focusedMemberNode.memberKind === 'agent_team'` remains available in the focus-only workspace.
- AC-009: Active docs and localization no longer refer to user-selectable grid/spotlight team modes; remaining empty-state strings live under an active component namespace.
- AC-010: Relevant frontend validation passes, at minimum targeted `autobyteus-web` Nuxt/Vitest coverage for `TeamWorkspaceView`, `AgentTeamEventMonitor`, `agentTeamContextsStore`, `runHistoryStore` affected stubs, localization guards, and a production build or documented equivalent type/build check.

## Constraints / Dependencies

- Work must stay on the dedicated task branch/worktree based on latest `origin/personal`.
- Clean-cut removal is preferred; no feature flags or compatibility wrappers for removed modes.
- Historical completed-ticket artifacts may still mention grid/spotlight and should be excluded from current-behavior static-search acceptance checks.
- The frontend localization guard/audit may require source and generated message updates together.

## Assumptions

- The screenshot-provided control is the exact user-facing view-mode picker to remove.
- The user intent is product simplification, not changing the default mode while preserving hidden alternate modes.
- No external API or backend contract depends on the frontend's team workspace view mode.

## Risks / Open Questions

- Some test fixtures stub `ensureHistoricalMembersHydratedForView`; implementation must remove or update all affected stubs to avoid stale mock-only contracts.
- `TeamMemberMonitorTile` localization keys are partly generated by localization tooling; implementation should verify source/generated message consistency instead of deleting only source strings.
- A final browser/visual check is useful because the requested change is visible in the top toolbar.

## Requirement-To-Use-Case Coverage

- FR-001 -> UC-001
- FR-002 -> UC-001
- FR-003 -> UC-004
- FR-004 -> UC-002, UC-003
- FR-005 -> UC-002
- FR-006 -> UC-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> UC-001 visible simplification
- AC-002 -> UC-001 obsolete mode prevention
- AC-003 -> UC-004 active source cleanup
- AC-004 -> UC-004 shell branch cleanup
- AC-005 -> UC-004 obsolete mode state cleanup
- AC-006 -> UC-003 historical hydration cleanup
- AC-007 -> UC-001/UC-002 focus-mode regression protection
- AC-008 -> UC-002 subteam-focused composer protection
- AC-009 -> UC-004 docs/localization cleanup
- AC-010 -> UC-001/UC-002/UC-003/UC-004 validation evidence

## Approval Status

Approved by user on 2026-06-27 with instruction to keep the code clean after removing the functionality.
