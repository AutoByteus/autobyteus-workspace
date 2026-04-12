# Requirements

## Status

- Current Status: `Design-ready`
- Scope: `Medium`
- Last Updated: `2026-04-12`

## User Intent

Keep the grouped workspace-history tree, but change historical team-run opening so the frontend does not eagerly hydrate every member projection up front:

- the backend-owned grouped workspace tree remains the sidebar read model
- opening a historical team run should hydrate only the requested/focused member first
- when no member is explicitly requested, the coordinator should be the first hydrated member
- non-focused historical team members should stay as lightweight shell entries until the user asks for them
- clicking another member should lazy load only that member's projection
- broader team views such as grid or spotlight may progressively hydrate missing members only after the user enters those modes

## Problem Statement

The grouped workspace-history contract now renders correctly on first load, but the historical team-open runtime path is still eager. Opening one stored team run currently fetches a projection for every team member, materializes full `AgentContext` objects for all of them, and hydrates every member's activity payload before the user has asked for those members. With long-running team sessions this produces very large serialized payloads and reactive state graphs, which is why opening another historical team run can freeze the UI.

This is a runtime ownership problem, not a sidebar-label problem:

- the left tree already has enough persisted metadata to show team name, run summary, and member rows
- the historical team hydrator is doing too much work up front
- the default team workspace mode is `focus`, so the initial open only needs one member projection immediately

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Summary | Expected Outcome |
| --- | --- | --- | --- |
| AC-001 | R-001 | Initial historical team open hydrates only one member projection | Opening an inactive stored team run fetches the requested member's projection only; if no member is requested, it fetches the coordinator's projection only. |
| AC-002 | R-002 | Other historical members remain lightweight shells on initial open | The initial historical team context still contains all member identities and configs, but non-focused members are created without full conversation/activity projection payloads. |
| AC-003 | R-003 | Member switching lazy loads only the newly requested member | Clicking another member in the left tree or team workspace hydrates that member on demand without reloading the whole team or refetching already hydrated members. |
| AC-004 | R-004 | Focus mode remains immediately usable | The first historical team open still lands on the coordinator or explicitly requested member with that member conversation ready to display. |
| AC-005 | R-005 | Broader team views hydrate progressively on demand | Entering `grid` or `spotlight` for a historical inactive team progressively hydrates missing member projections after the mode switch instead of during initial open. |
| AC-006 | R-006 | Live teams and restoration behavior are preserved | Active team recovery, subscribed live teams, temp team runs, and restoring a stored team back to active execution continue to work with the new lazy historical hydration path. |

## Requirements

| Requirement ID | Description | Acceptance Criteria |
| --- | --- | --- |
| R-001 | Historical team-run opening must fetch only the focused member projection on first open, with coordinator-first fallback when no member is explicitly requested. | AC-001, AC-004 |
| R-002 | Historical team contexts must support lightweight shell member entries so non-focused members can exist in the runtime model without their full projections loaded. | AC-002 |
| R-003 | Historical member switching must load one missing member projection at a time and reuse already loaded member contexts. | AC-003 |
| R-004 | Broader historical team views must request remaining missing member projections only after the user asks for those views. | AC-005 |
| R-005 | The lazy historical hydration design must preserve the current grouped workspace-history contract and existing live-team behaviors. | AC-006 |

## Non-Goals

- redesigning the grouped backend workspace-history contract again in this re-entry
- changing team or agent summary semantics in this re-entry
- changing eager hydration for active subscribed team runs
- changing run-id formats or selection identity semantics

## Open Questions

- None

## Decision Notes

- The grouped backend workspace-history tree remains the canonical sidebar read model for this ticket.
- Historical inactive team runs will use shell member contexts plus on-demand projection hydration.
- The coordinator remains the default first focused member when no explicit member is requested.
- `focus` mode remains the default team workspace mode and is the optimization target for first open.
- `grid` and `spotlight` may progressively hydrate missing members after the user enters those modes; they must not pull every member projection during the initial historical-team open.
- Live subscribed teams continue to hydrate/stream as today; this redesign is scoped to inactive historical team runs.

## Use Cases

| Use Case ID | Related Requirement IDs | Summary |
| --- | --- | --- |
| UC-001 | R-001, R-002, R-005 | A user opens the workspace tree and then opens an inactive historical team run; the sidebar data is already present, shell member contexts are created, and only the coordinator or explicitly requested member projection is fetched initially. |
| UC-002 | R-003, R-005 | A user switches from the focused historical member to another member; only that missing member projection is fetched and the already loaded member projections are reused. |
| UC-003 | R-004, R-005 | A user switches a historical team from `focus` to `grid` or `spotlight`; missing member projections load progressively after the mode change rather than during the initial open. |
