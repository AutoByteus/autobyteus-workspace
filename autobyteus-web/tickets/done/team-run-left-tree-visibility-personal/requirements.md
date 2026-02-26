# Requirements

## Status

- Current Status: `Refined`
- Updated On: `2026-02-21`

## Goal / Problem Statement

Personal branch should follow enterprise persistence patterns where appropriate, while keeping personal semantics: one shared workspace per team run. Team runs must be visible under the workspace in the left tree immediately and remain visible after reload from persisted history.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-layer design: frontend left tree model + backend team-run history API/persistence alignment.
  - Adaptation required from enterprise pattern to personal shared-workspace constraints.

## In-Scope Use Cases

- UC-001: After `Run Team`, temporary team appears under the selected workspace in left tree.
- UC-002: After first send promotes temp team to permanent team id, row remains visible and selectable.
- UC-003: Clicking team row selects team context and opens workspace route.
- UC-004: Clicking member row sets focused member for that team.
- UC-005: Team terminate action from left tree removes active row.
- UC-006: After app reload, persisted team runs are listed again under their workspace.
- UC-007: Inactive team run history can be deleted from UI and backend.
- UC-008: After selecting a persisted/offline team member, history loads and user can continue sending messages to that member.
- UC-009: After sending to an offline persisted team member, the frontend reconnects to team stream so continued replies are visible.

## Acceptance Criteria

1. Left tree rendering
- Team rows render under each workspace section, not in a global teams section.
- Rows include both live draft/active teams and persisted team history entries.

2. Interaction behavior
- Selecting a team row emits `instance-selected` as type `team` and updates selection store.
- Selecting a team member row updates focused member in team context.
- Selecting a persisted team member hydrates run projection/history immediately for offline/idle team runs.

3. Lifecycle behavior
- Temporary team id rows remain visible after promotion to permanent id.
- Terminating team updates local row state and backend history state consistently.
- When a team reaches inactive/shutdown state and `deleteLifecycle=READY`, the left tree exposes a team-history delete action (trash button) on that team row.
- Confirming team-history delete removes persisted team history through `deleteTeamRunHistory` and updates the tree without selecting/changing active focus unexpectedly.

4. Persistence behavior
- Personal backend exposes team-run history query/mutation APIs equivalent to enterprise capability surface.
- Frontend fetches team-run history during tree load and merges with live contexts.
- Team history payload contains a canonical team-level workspace root path used for workspace grouping.
- Backend supports continuation flow for existing `teamId` so sending to an offline team member resumes runtime from persisted manifest/history.
- Personal contract remains single-node: no distributed host-node metadata is required in team-run history payloads.
- Frontend reconnects websocket stream after successful continuation send for existing offline teams.

5. Test coverage
- Frontend: workspace tree tests include team render/select regression.
- Backend: team execution + run-history e2e/integration remain green.
- Frontend: member selection for persisted/offline team must hydrate projection before message continuation path.
- Frontend: terminated team remains visible in workspace tree from persisted run-history (not only live context memory).
- Frontend: sending to offline persisted member must reconnect team stream and surface continued assistant output.

## Constraints / Dependencies

- Personal product rule: all team members in one team run share one workspace.
- No enterprise node-distribution complexity required in personal adaptation.
- Existing run-history architecture remains file-based for persistence.

## Assumptions

- Shared workspace root path can be treated as a team-level grouping key in personal.
- Enterprise API shape can be reused with simplified member metadata (no cross-node placement requirements).
- Selecting a persisted team member should hydrate/open that team member context immediately.
- Personal keeps enterprise-style `deleteLifecycle` field for API consistency; initial personal state is `READY`.

## Open Questions / Risks

1. Future deletion lifecycle complexity
- If personal later introduces deferred cleanup jobs, `deleteLifecycle` transitions beyond `READY` may need additional UI states.

2. Workspace migration edge case
- If a future feature allows team workspace reassignment, canonical team-level workspace root path update rules must be defined.
