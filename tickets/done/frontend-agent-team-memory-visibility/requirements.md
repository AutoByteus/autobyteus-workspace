# Requirements

- Status: `Design-ready`
- Ticket: `frontend-agent-team-memory-visibility`
- Last Updated: `2026-03-07`

## Goal / Problem Statement

Frontend currently exposes around-memory for an individual agent, but does not expose the corresponding team-level memory. The user wants both individual agent around-memory and agent team memory visible in the frontend in a clear UX.

## Confirmed User Intent

- Investigate current implementation first.
- Return with suggested UX options for showing both memory scopes.
- Discuss and agree on the final UX approach before implementation starts.
- Chosen UX direction:
  - One Memory page with scope toggle.
  - `Agent Runs` scope: select agent run and inspect that run memory.
  - `Team Runs` scope: select team member run and inspect that specific member run memory.

## In-Scope Use Cases

- `UC-001`: User opens Memory page and sees default `Agent Runs` scope with existing run-memory behavior.
- `UC-002`: User switches to `Team Runs`, sees team rows and member rows, and selects a member run.
- `UC-003`: After selecting a team member run, inspector shows memory for that specific member run.
- `UC-004`: User switches between scopes and selections without losing app stability or showing mixed-scope data.
- `UC-005`: Errors/loading states are understandable per scope and do not corrupt existing successful state.

## Out Of Scope

- Cross-workspace memory analytics dashboard.
- Team-level merged/aggregated synthetic memory generation.
- New standalone `/team-memory` route.
- Manual testing-only validation as a release gate.

## Functional Requirements

- `R-001`: Memory page must provide explicit scope toggle: `Agent Runs` and `Team Runs`.
- `R-002`: In `Agent Runs` scope, existing run-memory index + inspector behavior must remain functionally intact.
- `R-003`: In `Team Runs` scope, left panel must render team entries with expandable member entries and allow member selection.
- `R-004`: Team member selection must load memory for the selected member run and show it in the same inspector interaction model.
- `R-005`: Inspector header must clearly indicate selected context:
  - Agent scope: selected run id.
  - Team scope: selected team + selected member + selected member run id.
- `R-006`: Scope-specific loading and error states must be surfaced without leaking stale mixed-scope content.
- `R-007`: Data contracts must support team member memory retrieval from persisted `agent_teams` memory layout.
- `R-008`: Existing run-history team APIs must continue to work unchanged for run-history surfaces.

## Non-Functional Requirements

- `NFR-001`: Keep existing memory page layout pattern (left index + right inspector) with minimal disruption.
- `NFR-002`: No backward-compatibility wrappers or dual-path legacy behavior for newly introduced memory scope logic.
- `NFR-003`: Preserve clear separation of concerns between:
  - frontend memory UI state/orchestration,
  - GraphQL query layer,
  - backend memory retrieval services.
- `NFR-004`: Add automated verification for new data/store/UI behavior.

## Acceptance Criteria

- `AC-001`: Memory page shows scope toggle with `Agent Runs` and `Team Runs`, defaulting to `Agent Runs`.
- `AC-002`: In `Agent Runs`, selecting a run shows working/episodic/semantic/raw memory tabs as before.
- `AC-003`: In `Team Runs`, left index lists team runs and member runs; selecting a member updates inspector context header to that team/member/run.
- `AC-004`: In `Team Runs`, selected member run returns non-empty memory payload when persisted files exist under `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- `AC-005`: Switching scopes clears incompatible selection state and does not show cross-scope stale data.
- `AC-006`: On team-member memory fetch failure, UI shows scoped error message and preserves last successful view for that scope.
- `AC-007`: Backend GraphQL additions for team memory do not regress existing `listRunMemorySnapshots` and `getRunMemoryView`.
- `AC-008`: Automated tests cover:
  - frontend scope-switch and selection behavior,
  - frontend team-memory fetch store path,
  - backend team-memory index/view resolver behavior.

## Constraints / Dependencies

- Reuse existing memory inspector tab components where practical.
- Reuse existing team history/manifest concepts for team/member identity metadata.
- Team member memory files are persisted under `memory/agent_teams`.
- Existing generated GraphQL types in frontend may require codegen refresh.

## Risk Notes

- Team member memory files may be partial/empty for certain members, requiring graceful null/empty handling.
- Sorting/grouping consistency between team history and team memory index can drift if contracts diverge.
- Inspector state reset logic must avoid accidental stale panel rendering when scope changes.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-001` -> `UC-001`, `UC-002`
- `R-002` -> `UC-001`
- `R-003` -> `UC-002`
- `R-004` -> `UC-003`
- `R-005` -> `UC-003`, `UC-004`
- `R-006` -> `UC-004`, `UC-005`
- `R-007` -> `UC-002`, `UC-003`
- `R-008` -> `UC-005`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario)

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-003`
- `AC-004` -> `AV-004`
- `AC-005` -> `AV-005`
- `AC-006` -> `AV-006`
- `AC-007` -> `AV-007`
- `AC-008` -> `AV-008`

## Scope Triage

- Confirmed classification: `Medium`
- Rationale:
  - Requires backend GraphQL additions for team memory index/view.
  - Requires frontend memory page/store/query/types refactor for dual scope.
  - Requires test updates across backend and frontend layers.
