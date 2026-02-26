# Requirements

## Status
Refined

## Goal
Prevent host workspace leakage into remote team members and make cross-node team workspace routing explicit and executable on each node.

## Scope Classification
Medium

## In-Scope Use Cases
- UC1: User runs a mixed-node team (embedded coordinator + remote member).
- UC2: Frontend blocks run when any remote member lacks `workspaceRootPath`.
- UC3: Frontend builds temporary team launch payload using per-member `workspaceId/workspaceRootPath`.
- UC4: Backend resolves workspace by `workspaceId` or by `workspaceRootPath` depending on member/node locality.
- UC5: Team run manifest persists `workspaceRootPath` so restore/runtime metadata stay consistent.

## Acceptance Criteria
- AC1: For embedded-node members, selected workspace ID is preserved and sent in `memberConfigs`.
- AC2: For remote members, `workspaceId` is sent as `null` and `workspaceRootPath` is required.
- AC3: Run button is disabled and error surfaced when remote member workspace path is missing.
- AC4: Backend accepts both fields and creates workspace from `workspaceRootPath` when `workspaceId` is absent for local node execution.
- AC5: Manifest member bindings include `workspaceRootPath`.
- AC6: Frontend+backend targeted tests cover the cross-node workspace routing contract.

## Constraints / Dependencies
- Depends on team definitions exposing `homeNodeId`.
- Must not introduce legacy fallback/alias compatibility paths.
- Must keep per-member config shape explicit; no hidden default inheritance for remote members.

## Assumptions
- User provides a valid filesystem path for each remote member on that remote node.
- Embedded members can continue using host workspace picker (`workspaceId`).

## Risks
- Misconfigured remote paths still fail at runtime if path does not exist/resolve on that node.
- Existing stale in-memory temp contexts may need rerun after behavior change.
