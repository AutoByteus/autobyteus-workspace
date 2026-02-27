# Requirements

## Status
- Refined
- Status history:
  - Draft (bootstrap, initial row-action approach)
  - Design-ready (first cycle)
  - Refined (re-entry cycle: header action approach)

## Date
- 2026-02-27

## Goal / Problem Statement
- Reduce history-tree action clutter while preserving fast access to run/team configuration.
- Configuration for selected runs/teams should be opened from the event/chat header, not from per-row history cog actions.

## Scope Triage
- Scope: Small
- Rationale:
  - Frontend-only UX refinement.
  - Existing mode store (`workspaceCenterViewStore`) can be reused.
  - No backend or schema changes.

## In-Scope Use Cases
- UC-101: User selects an agent run row (chat/event remains default), then clicks header `Edit config` to open selected-run configuration.
- UC-102: User selects a team run row (event monitor remains default), then clicks header `Edit config` to open team configuration.
- UC-103: From config view, user can return to event/chat view through explicit `Back to event view` action.
- UC-104: History tree no longer shows run/team configuration cog actions; row action density is reduced.

## Requirements
- R-101 (`requirement_id: R-101-header-config-entry-agent`)
  - Agent workspace header must expose a dedicated `Edit config` action for the currently selected run.
- R-102 (`requirement_id: R-102-header-config-entry-team`)
  - Team workspace header must expose a dedicated `Edit config` action for the currently selected team context.
- R-103 (`requirement_id: R-103-selection-default-event-view`)
  - Row selection behavior remains event/chat-first by default.
- R-104 (`requirement_id: R-104-center-view-mode-switch`)
  - Header `Edit config` action toggles center view mode from event/chat to config while keeping current selection context.
- R-105 (`requirement_id: R-105-config-return-path`)
  - Config panel provides explicit `Back to event view` action that returns center mode to event/chat.
- R-106 (`requirement_id: R-106-remove-row-config-buttons`)
  - Run/team config row buttons are removed from `WorkspaceAgentRunsTreePanel`.

## Acceptance Criteria
- AC-101 (`acceptance_criteria_id: AC-101`)
  - Given selected agent run in workspace, clicking header `Edit config` opens `RunConfigPanel` for that run.
- AC-102 (`acceptance_criteria_id: AC-102`)
  - Given selected team run in workspace, clicking header `Edit config` opens team config panel for that team context.
- AC-103 (`acceptance_criteria_id: AC-103`)
  - Given row selection without header config action, center pane remains event/chat view.
- AC-104 (`acceptance_criteria_id: AC-104`)
  - Given config mode is active, clicking `Back to event view` restores event/chat view for the same selected run/team.
- AC-105 (`acceptance_criteria_id: AC-105`)
  - History tree renders no run/team config action buttons (`workspace-run-config-*`, `workspace-team-config-*` selectors absent).

## Constraints / Dependencies
- Frontend only (`autobyteus-web`).
- Keep `WorkspaceHeaderActions` as shared header action surface for agent/team views.
- No backward compatibility branch for row-level config buttons.

## Assumptions
- Selected run/team context is already established through existing selection flow before header action is used.
- `workspaceCenterViewStore` remains canonical view-mode authority.

## Open Questions / Risks
- Visual distinction between `New` (`+`) and `Edit config` in header must be clear to avoid misclicks.
- Need test updates for both header actions and row-action removal assertions.

## Requirement Coverage Map
- R-101 -> UC-101
- R-102 -> UC-102
- R-103 -> UC-103
- R-104 -> UC-101, UC-102
- R-105 -> UC-103
- R-106 -> UC-104

## Acceptance Criteria Coverage Map (Stage 7)
- AC-101 -> AV-101
- AC-102 -> AV-102
- AC-103 -> AV-103
- AC-104 -> AV-104
- AC-105 -> AV-105
