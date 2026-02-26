# Requirements

## Goal / Problem Statement
Team run history metadata is incorrect after first team message. The persisted team manifest currently writes `teamDefinitionName` from `teamDefinitionId` (e.g., `"2"`), which makes the workspace tree show numeric IDs instead of the configured team name. This corrupt metadata also weakens restore/focus defaults because coordinator route metadata is derived from array position instead of definition metadata.

## Scope Triage
- Size: **Small**
- Rationale: localized backend fix in team manifest construction plus unit tests; no schema migration and no cross-service protocol change.

## In-Scope Use Cases
1. Lazy-create team via `sendMessageToTeam` and persist run history manifest with correct `teamDefinitionName`.
2. Create team via `createAgentTeamRun` and persist run history manifest with correct `teamDefinitionName`.
3. Persist `coordinatorMemberRouteKey` from the team definition coordinator member (not array-first fallback), when available.
4. Preserve existing member binding payload shape and IDs.

## Acceptance Criteria
1. Persisted team manifest stores `teamDefinitionName` as the actual team definition name.
2. Persisted team manifest stores `coordinatorMemberRouteKey` from team definition coordinator member when resolvable.
3. Existing resolver unit tests pass, and new tests assert manifest metadata correctness for lazy create and create flows.
4. No compatibility wrapper/legacy branch is introduced.

## Constraints / Dependencies
- Source of truth for team definition metadata is `AgentTeamDefinitionService`.
- Keep current GraphQL input shape unchanged.
- Keep run-history schema shape unchanged.

## Assumptions
- Team definition exists when team run creation is requested.
- Coordinator member name in definition corresponds to a member in provided member configs (or fallback remains valid).

## Open Questions / Risks
- If member configs omit the coordinator member route key/name mapping, fallback route key is still required. Risk is mitigated by fallback to first binding.
