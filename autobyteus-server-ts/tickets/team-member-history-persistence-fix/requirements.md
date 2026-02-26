# Requirements - team-member-history-persistence-fix

## Goal / Problem
Team member history selection in frontend opens empty conversation because backend team manifest member IDs do not map to actual persisted agent memory directories. `getRunProjection(memberAgentId)` returns empty for team members.

## Scope Triage
- Size: `Small`
- Rationale: Backend resolver/config mapping and continuation configuration fix with focused tests.

## In-Scope Use Cases
1. Team creation (explicit create + lazy create) uses deterministic member agent IDs that are shared by runtime and manifest.
2. Team run restore uses the same member IDs and memory-base strategy as initial create.
3. Frontend team-history open can retrieve non-empty projection for member IDs of newly created runs.

## Acceptance Criteria
1. `createAgentTeamRun` and lazy create path pass resolved `memberAgentId` values into runtime creation.
2. Team run manifest stores the same `memberAgentId` values used at runtime.
3. Continuation restore does not force a divergent member memory directory path.
4. Unit tests validate resolver wiring and continuation config payload.

## Constraints / Dependencies
- Keep GraphQL schema unchanged.
- No compatibility wrappers.
- Preserve existing history service APIs.

## Assumptions
- `buildTeamMemberAgentId(teamId, routeKey)` remains stable and deterministic.
- Team member runtime identity should be set once during create and reused for manifest/restore.

## Risks
- Existing historical team runs created with mismatched IDs remain unreadable; this fix guarantees correctness for new runs.
