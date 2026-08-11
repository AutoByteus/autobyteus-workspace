# UI/UX Specification

## Status

`Approved for architecture review`

## UX Goal

Make the left workspace history communicate the same single event-monitor target that the center pane renders. A team member row is selected only when both its owning team run and its member route identify the current team event-monitor target.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`
- Acceptance criteria: `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-005`

## Users / Personas / Contexts

- A user monitoring several team runs grouped under one or more workspaces.
- A user switching between standalone agent runs and team runs.
- A keyboard or assistive-technology user navigating the workspace history tree.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | User with multiple team-run groups open | One team member event monitor is visible; several teams may have the same member route key | Identify the row that owns the visible event monitor | Exactly one team member row communicates current selection | REQ-001, REQ-002 / AC-001, AC-002 |
| UXJ-002 | User changes team/member target | Team A/member X is selected | View Team B/member Y | Selection styling and center monitor move together; Team A/member X is no longer selected | REQ-003 / AC-003 |
| UXJ-003 | User opens a deep link or history row | Workspace route or history tree provides a run and optional member route | Open the requested target | The owning team and member row are the only selected/current navigation target | REQ-004, REQ-005 / AC-004, AC-005 |

## Journey Details

### UXJ-001 — Identify the visible target

1. The left panel may contain multiple expanded workspaces, team-definition groups, and team runs.
2. The application resolves the center target from the authoritative selection `(selection type, team run ID)` and the selected team's focused member route key.
3. Only the matching team/member row receives selected styling and `aria-current="true"`.
4. Other teams may retain their own focus/projection data, activity dots, status dots, and expansion state, but those states do not receive selected styling.

### UXJ-002 — Transfer the target

1. The user activates a different stable or transient team-member row, by pointer or keyboard.
2. Existing selection/opening/hydration logic updates the selected team run and focused member route.
3. The history row predicate reevaluates from the new `(teamRunId, memberRouteKey)` identity.
4. The old row loses selected/current styling and the new row gains it; the center event monitor renders the new member.

### UXJ-003 — Restore or clear the target

1. A supported workspace execution link includes the target kind, run ID, and optional team member route key; the existing open coordinator applies it.
2. During opening/loading, existing center loading behavior remains unchanged. Once the selection is committed, the same identity drives the left-row state.
3. If the selection is cleared or no valid team member target exists, no team member row is marked selected/current; the existing empty/unavailable center state remains authoritative.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel` | Owns the history-tree selection adapter and passes selection predicates to rows | Workspace route / workspace page is mounted | Agent selected, team selected, no selection, opening/loading, stale/removed target | User activates a row or another shell surface |
| `WorkspaceHistoryWorkspaceSection` | Renders workspace, team-run, and team-member rows | Workspace node is present and expanded | Selected member, non-selected member, focus/hover, expanded/collapsed, status/activity | User opens target, expands/collapses, or invokes row action |
| `WorkspaceTransientExecutionRow` | Renders transient task execution rows with ghost/status semantics | A team execution projection includes a transient row | Selected/current transient row, non-selected transient row, focus/hover, expandable children | User activates or expands the transient row |
| Center event monitor | Displays one agent/member conversation | Selection resolves to an agent or team run | Existing loading, content, empty, and unavailable states | User reads, sends, or navigates elsewhere |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| No selection | Clear selection or no valid target | No selected row | No team member row has selected/current styling | Existing selection clear behavior | Select a run or team/member |
| Standalone agent selected | Select agent run | Existing agent row selection | Agent run row selected; all team-member rows are non-selected even if their route keys match | `agentSelectionStore` selects `{type:'agent', runId}` | Switch to any team/agent row |
| Team selected | Select team/member | Existing opening/hydration feedback | Only row whose `teamRunId` equals selected team ID and route equals selected team's focused route is selected/current | Existing team selection/focus/hydration | Select another member/team or expand rows |
| Different team with same member route | Select Team B/member `code_reviewer` while Team A also has `code_reviewer` focused | Center target changes to Team B member | Team A member loses selected/current; Team B member alone remains selected/current | Existing team selection/focus update | Continue monitoring or switch target |
| Multiple groups expanded | Expand workspace/team-definition/team-run groups | Existing chevron/expansion feedback | Expansion may be multi-valued; selection remains single-valued | Local expansion state only | Select any visible row |
| Non-selected row focused/hovered | Tab to or pointer-hover a different row | Existing focus/hover ring/background | Focus/hover is visually distinct and does not add selected/current state | No target change until activation | Activate row or move focus |
| Transient execution row | Observe or activate transient task row | Existing ghost/status presentation | Non-selected row retains its transient presentation; selected row receives the selected/current emphasis without changing its identity | Existing task projection and hydration | Expand/select row |
| Opening/error | Target is being opened or an existing open error is shown | Existing center loading/error handling | No stale second selection is introduced; selection predicate reflects committed target only | Existing error state | Retry/select another target |

## Markdown Wireframes / Visual Structure

```text
Left history tree                         Center
Workspace A                               Team B / code_reviewer event monitor
  Team run A                              ┌─────────────────────────────┐
    code_reviewer   non-selected         │ one visible event monitor   │
  Team run B                              │ target: Team B / member     │
    code_reviewer   SELECTED/current     └─────────────────────────────┘
Workspace B
  Team run C
    code_reviewer   non-selected
```

The row identity is the compound target `(teamRunId, memberRouteKey)`. A member route key alone is not a unique selection identity because the same team definition can have many historical runs.

## Non-Happy-Path States

### Loading

Keep the existing center loading overlay/opening state. Do not mark a newly clicked row as current until the existing selection/opening path commits the target; do not leave a prior team row selected when selection has been cleared by an existing failure path.

### Empty

When no selected run/team exists, preserve the current empty center pane and render no selected/current team member row.

### Error And Recovery

Preserve existing open/history error presentation. A failed selection must not create a second row highlight. The user can activate another row or retry through the existing control/path.

### Disabled / Unavailable

Preserve existing disabled row actions and run availability. Status dots and action affordances do not imply selected/current state.

### Permission / Authentication

N/A for this local visual-state correction; preserve existing authentication and authorization behavior.

## Responsive And Platform Behavior

Apply the same identity predicate to the desktop workspace history tree and its responsive rendering of the same component. Do not change mobile-specific selection/focus behavior unless it reuses this component and requires the same explicit identity check.

## Accessibility And Keyboard Behavior

- Keep existing row keyboard activation (`Enter` and `Space`) and focus-visible styling.
- Expose `aria-current="true"` only on the one selected/current team-member row; omit it from every other row. Do not add `aria-selected` without changing the surrounding role to a selection-list pattern.
- Focus may be on a non-current row and must remain visually distinguishable from selected/current styling.
- Disclosure buttons retain their existing `aria-expanded` semantics and must not change the selected/current target when only expansion is toggled.

## Content, Labels, And Validation Messages

No new user-facing copy is required. Existing labels, status-dot accessible labels, team/member names, and relative times remain unchanged.

## Data And API Dependencies

- `agentSelectionStore.selectedType` and `selectedRunId` remain the authoritative desktop viewed-run identity.
- Each `TeamTreeNode` supplies the team run ID and its projected/focused member route key.
- Existing route links supply `teamRunId` plus `memberRouteKey` when applicable.
- No server/API or persisted-data contract changes are required.

## Out Of Scope

- Reworking team focus ownership or the event-monitor rendering pipeline.
- Changing the meaning of transient execution styling.
- Making multiple expansion states single-valued.
- Adding a new selection store or persistence schema.

## Open Decisions / Risks

- Confirm during implementation whether `aria-current` is already supplied by a shared row primitive; avoid duplicate semantics if so.
- Existing transient rows intentionally use a ghost background even when not current; preserve that background unless visual review proves it is indistinguishable from selected styling.

## Approval Status

`Approved by user on 2026-08-11; locked as architecture-review input`
