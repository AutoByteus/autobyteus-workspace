# Requirements

## Status
Design-ready

## Goal / Problem Statement
In team runs with mixed node placement, remote members configured with node-local workspace paths must show workspace context in the Team list consistently with embedded members. Currently, temporary/live team projection hides workspace for remote members because it only resolves from local `workspaceId`.

## In-Scope Use Cases
- UC-1: User prepares a team run where embedded member(s) use selected local workspace and remote member(s) use per-member `workspaceRootPath` override.
- UC-2: User clicks Run and a temporary local team context is created before first backend dispatch.
- UC-3: Team member rows in sidebar/history panel display workspace label for each member using available workspace source.

## Acceptance Criteria
- AC-1: In temporary local team contexts, embedded members still derive workspace label from `workspaceId`.
- AC-2: In temporary local team contexts, remote members display workspace label from per-member `workspaceRootPath` override when present.
- AC-3: Existing launch payload behavior remains unchanged: remote members still send `workspaceId: null` and `workspaceRootPath: <override>`.
- AC-4: No regression in persisted/history team rows that already use manifest member bindings.

## Constraints / Dependencies
- Keep node routing rule unchanged: team-level workspace ID only applies to embedded members.
- Do not force creation of local workspace entries for remote paths.
- Preserve existing backend bootstrap payload contract.

## Assumptions
- `memberOverrides[memberName].workspaceRootPath` is the canonical remote workspace config in frontend template state.
- Member key used in local context map aligns with team definition member name for top-level members.

## Open Questions / Risks
- Should remote workspace label also be shown in other panes (focused member header, Files/Terminal tabs context hints), or only in Team list?
- For nested member route keys, path resolution may require mapping fallback logic beyond direct member name.

## Scope Triage
Small

### Triage Rationale
- Expected touch area is frontend projection logic and unit tests, likely <= 3 files.
- No public API/schema change.
- No distributed routing/placement contract change.
