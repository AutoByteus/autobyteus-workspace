# Requirements Doc

## Status

`Approved for architecture review`

## Goal / Problem Statement

The event monitor displays one currently viewed conversation/run in the center pane, but the left workspace/run list can visually highlight more than one row at the same time. This weakens the relationship between navigation state and the event monitor: a user can no longer tell which highlighted row is the one whose events are being shown. Make the left navigation selection communicate one authoritative event-monitor target at a time, without removing the ability to keep multiple workspaces expanded or to show activity/status indicators for non-viewed runs.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The center pane is governed by one `agentSelectionStore` selection (`selectedType` + `selectedRunId`), but team-member row styling is derived independently from each team's `focusedMemberRouteKey`; rows compare only the member route key. Multiple team runs with the same focused member route can therefore look selected at once. | The visible selected/current team-member row is identified by the compound target `(teamRunId, memberRouteKey)`: the row's team run must be the selected team run and its route must be that team's focused route. | The center event monitor continues to show one target; each team's own focus projection remains available for navigation and expansion. | REQ-001, REQ-002 / AC-001, AC-002 |
| BEH-002 | Activating a different team/member runs through the existing open/focus path and changes the center target, but old team rows with the same route key can retain selected styling because the row predicate omits team identity. | Selection styling/current semantics transfer to the new compound target and are removed from every other team/member row, including rows in other workspaces or history groups. | Existing selection, opening, hydration, and center-pane navigation behavior remains unchanged. | REQ-001, REQ-003 / AC-001, AC-003 |
| BEH-003 | Supported workspace execution links carry a team run ID and optional member route; agent/team selection is committed by the existing open coordinators. No persisted selection schema or browser-reload persistence was found. | Supported row and execution-link lifecycle paths render selected/current state only after the authoritative selection is committed; clearing or having no valid target produces no selected/current member row. | Workspace/team expansion, status/activity dots, transient execution presentation, hover, and keyboard focus remain independent visual states. | REQ-002, REQ-004, REQ-005 / AC-002, AC-004, AC-005 |

## Investigation Findings

The dedicated worktree is based on refreshed `origin/personal`. The supplied screenshot demonstrates the user-visible ambiguity: multiple `code_reviewer` entries in separate grouped team histories are styled as selected while the center event monitor shows one `code_reviewer` view. Code tracing verified that `agentSelectionStore` owns the one viewed run, while `WorkspaceHistoryWorkspaceSection` renders stable and transient team-member emphasis from a route-only comparison. `runHistoryNavigationProjection` already preserves focus per team run; the missing team identity is in the row-rendering predicate, not in the event-monitor owner or persisted data.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-single-selection/tickets/done/event-monitor-single-selection/ui-ux-spec.md` | UI/UX state and interaction specification | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005 | AC-001, AC-002, AC-003, AC-004, AC-005 | Approved for architecture review | Defines the compound selection identity, visual state separation, lifecycle, keyboard, and accessibility expectations. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Not Needed`
- Evidence basis: `agentSelectionStore` and the existing open/focus coordinators provide one viewed target, and team navigation projection stores focus by `teamRunId`. The row component compares only `memberRouteKey` at `WorkspaceHistoryWorkspaceSection.vue:300` and `:365`, so a shared route key across runs is incorrectly treated as a globally unique selection identity.
- Requirement or scope impact: Fix the frontend history-row selection predicate and its contract/tests; do not change event-monitor rendering, run history data, or route/API contracts.

## Recommendations

Keep `agentSelectionStore` as the authoritative viewed-run owner. Have the history-tree state adapter expose an explicit team-run selection predicate to `WorkspaceHistoryWorkspaceSection`; combine that predicate with the team-local focused member route when rendering stable and transient member rows. Add one current/selected accessibility state to the matching row only, while keeping focus, hover, expansion, status, activity, and transient ghost styling independent.

## Scope Classification

`Medium` because the correction crosses the history-tree state contract, stable/transient row rendering, accessibility semantics, and component regression coverage, while remaining local to the web frontend.

## In-Scope Use Cases

1. User selects one event-monitor row from the left navigation.
2. User selects a second event-monitor row; the first row must stop appearing selected.
3. User opens a supported workspace execution link or revisits the workspace history surface and the visible target and selected row remain aligned after selection commit.
4. User views multiple expanded workspace/run groups while only one row is selected.
5. User observes running/idle/activity indicators on non-selected rows without those indicators being interpreted as selection.
6. User switches between a standalone agent run and a team run; incompatible rows do not remain selected-looking.

## Out of Scope

- Changing event-monitor content, event ordering, or streaming behavior.
- Preventing multiple workspace or team groups from being expanded.
- Removing status/activity indicators or changing transient execution semantics.
- Redesigning unrelated tabs such as Files, Terminal, Activity, or Token.
- Changing run lifecycle, history retention, route query shape, or persisted run data.
- Adding browser-reload persistence for the current selection.

## Functional Requirements

- **REQ-001 — Singular viewed-target selection:** The frontend SHALL render no more than one team-member event-monitor navigation target as selected/current at a time. For a team target, the selected row SHALL match both the authoritative selected team run ID and that team's focused member route key; a route key alone SHALL NOT select rows across runs.
- **REQ-002 — Independent visual states:** Expansion/collapse, running/idle status, activity, hover, keyboard focus, and transient execution presentation SHALL remain independently renderable and SHALL NOT create a second selected/current appearance.
- **REQ-003 — Selection transfer:** When a supported user action changes the viewed event-monitor target, the new row SHALL become the only selected/current row and the old row SHALL lose selected/current styling in the same state update/render cycle.
- **REQ-004 — Lifecycle alignment:** On supported initial load, history selection, row selection, and workspace execution-link navigation, the selected/current row and visible event-monitor target SHALL remain aligned after the existing selection/open path commits; if no valid target is available, no team-member row SHALL appear selected/current and the main pane SHALL show its existing empty/unavailable state. Browser-reload persistence is not part of this change because no persisted selection path was found.
- **REQ-005 — Accessibility semantics:** The selected event-monitor target SHALL expose the existing appropriate selected/current navigation semantics (use one `aria-current` state for this row navigation if no shared primitive already supplies it), and keyboard navigation SHALL preserve the one-selected-target invariant. Focus styling SHALL remain distinguishable from selection styling.

## Acceptance Criteria

- **AC-001:** With at least two team runs rendering the same member route in different expanded groups, exactly the member row whose `teamRunId` equals the selected team run and whose route equals that team's focused route has selected/current styling; all other same-route rows lack it.
- **AC-002:** Expanding a second group, or showing running/idle/activity indicators on another row, does not add selected/current styling to that row; selecting a standalone agent also leaves all team-member rows non-selected.
- **AC-003:** Selecting row B after row A visibly transfers selected/current styling from A to B and the center event monitor changes to B; A is not still highlighted as selected.
- **AC-004:** After supported initialization, history navigation, or workspace execution-link navigation, the selected/current row (or absence of selection) matches the committed event-monitor target (or existing empty/unavailable state); no browser-reload persistence behavior is introduced or required.
- **AC-005:** Keyboard focus/hover can appear on a non-selected row without being mistaken for a second selected row, and the accessibility state reports at most one selected/current target.

## Constraints / Dependencies

- Preserve the current center-pane event-monitor behavior and existing navigation affordances.
- Follow existing frontend state-management and styling patterns rather than adding a parallel selection store.
- Use the stable compound identity `(teamRunId, memberRouteKey)` when comparing team-member targets.
- Validate both direct row selection and supported route/history selection paths.
- Do not change server/API or persisted-data contracts.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: No persisted subject. Workspace execution links are transient route query parameters handled by `useWorkspaceRouteSelection` and stripped after opening; selection is held in Pinia stores.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: No stored event/run data or user configuration is changed; no migration or route-schema change.
- Unacceptable data loss or corruption: No event/run data or user configuration may be changed.
- Relevant availability, maintenance-window, or rollout constraints: Standard frontend rollout; no migration expected.
- Related requirement and acceptance-criteria IDs: REQ-004 / AC-004.

## Assumptions

- “Event monitor” means the central conversation/event surface represented by the currently selected agent run or focused team member.
- A row's status dot, activity dot, transient ghost background, and expanded-group state are not intended to indicate the viewed target.
- The user wants a single clear current target, not single expansion across all workspaces.
- Team member route keys can repeat across team runs and therefore are not globally unique.

## Risks / Open Questions

- Verify during implementation whether a shared row primitive already supplies current/selected accessibility semantics; do not duplicate it.
- Existing transient rows intentionally use a ghost background even when not current; preserve that semantic presentation unless visual review proves it is indistinguishable from selected styling.
- Browser-reload selection persistence is not a supported contract in the traced path and remains out of scope.

## Requirement-To-Use-Case Coverage

| Use Case | Requirement IDs | Acceptance-Criteria IDs |
| --- | --- | --- |
| Select one team/member row | REQ-001, REQ-003, REQ-005 | AC-001, AC-003, AC-005 |
| Keep other rows expanded/active without selection | REQ-002 | AC-002, AC-005 |
| Switch agent/team or clear selection | REQ-001, REQ-002, REQ-004 | AC-002, AC-004 |
| Restore target through supported navigation | REQ-004, REQ-005 | AC-004, AC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Render multiple team runs with identical focused route keys and assert only the selected team run's member row has selected/current state. |
| AC-002 | Toggle expansion and status/activity states on other rows, then select an agent; assert selection count remains one or zero for team rows. |
| AC-003 | Activate A then B through the existing selection path; assert row emphasis and event-monitor identity transfer together. |
| AC-004 | Exercise supported initialization/history/workspace execution-link selection; assert route/store/view alignment, without inventing reload persistence. |
| AC-005 | Exercise keyboard focus and hover on non-selected rows; inspect DOM/accessibility state and visual distinction. |

## Approval Status

`Approved by user on 2026-08-11; locked as architecture-review input`
