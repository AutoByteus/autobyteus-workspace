# Requirements - team-member-deregistration-on-team-terminate

## Goal / Problem
After a team is terminated, continuing the same team run can fail during bootstrap with `Team ... entered an error state while waiting for idle: Bootstrap failed`. Root cause: team shutdown stopped member agents but did not deregister deterministic `memberAgentId` entries from `AgentFactory`, so restore hit `Agent '<id>' is already active`.

## Scope Triage
- Size: `Small`
- Rationale: single runtime concern (team shutdown cleanup) with focused test expansion across core + server integration.

## In-Scope Use Cases
1. Terminate a team with deterministic member IDs, then recreate/restore same `teamId` + `memberAgentId` successfully.
2. Team shutdown removes managed agents from `AgentFactory` even when agents are idle.
3. Backend integration path (`AgentTeamInstanceManager`) succeeds for terminate -> recreate with same IDs.

## Acceptance Criteria
1. Team shutdown performs member-agent deregistration via `AgentFactory.removeAgent`, not only `agent.stop`.
2. Recreate/restore with same deterministic member IDs does not fail from stale active-agent collision.
3. Unit tests cover cleanup path and fallback behavior.
4. Integration tests cover terminate -> recreate lifecycle in both `autobyteus-ts` and `autobyteus-server-ts`.

## Constraints / Dependencies
- No legacy compatibility branches.
- Preserve current team/team-member identity model (`teamId`, deterministic `memberAgentId`).

## Assumptions
- Deterministic member IDs are intentionally reused across restore.
- Team worker shutdown remains the orchestration owner; cleanup policy belongs in team runtime boundaries.

## Risks
- If shutdown cleanup regresses, stale singleton state can cause intermittent cross-test and runtime failures.
