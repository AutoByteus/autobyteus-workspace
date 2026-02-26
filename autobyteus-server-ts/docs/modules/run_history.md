# Run History (TypeScript)

## Scope

`src/run-history` owns persisted execution history for agent runs and team runs.

## Responsibilities

- Persist and list agent run history (`run-history-service.ts`).
- Persist and list team run history (`team-run-history-service.ts`).
- Provide resume/continuation flows:
  - agent: `run-continuation-service.ts`
  - team: `team-run-continuation-service.ts`
- Serve conversation projection payloads:
  - agent: `run-projection-service.ts`
  - team member: `team-member-run-projection-service.ts`

## GraphQL Surface

- Agent history resolver: `src/api/graphql/types/run-history.ts`
- Team history resolver: `src/api/graphql/types/team-run-history.ts`

Team history GraphQL operations:

- `listTeamRunHistory`
- `getTeamRunResumeConfig`
- `getTeamMemberRunProjection`
- `deleteTeamRunHistory`

## Persistence Files

- Agent history index: `memory/run_history_index.json`
- Agent manifests: `memory/agents/<runId>/run_manifest.json`
- Team history index: `memory/team_run_history_index.json`
- Team manifests: `memory/agent_teams/<teamId>/team_run_manifest.json`

## Personal-Branch Team Continuation

For personal mode, `sendMessageToTeam` supports offline continuation for existing `teamId`.

1. Resolver routes to `TeamRunContinuationService` when `teamId` is provided without create payload.
2. If runtime is offline, service restores the team with the same `teamId`.
3. Member config carries persisted route key/agent ID, and message dispatch resumes through the focused member.
4. Team run history index is updated to `ACTIVE` with the latest summary.
