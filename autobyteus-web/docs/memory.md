# Memory

## Overview

The Memory page (`/memory`) is a dual-scope inspector with one shared layout:

- Left: index and selection controls
- Right: memory inspector tabs (`Working Context`, `Episodic`, `Semantic`, `Raw Traces`)

Users can switch scope between:

- `Agent Runs`
- `Team Runs`

## Agent Runs Scope

Agent scope uses run-scoped memory APIs:

- `listRunMemorySnapshots`
- `getRunMemoryView(runId: String!)`

Storage source:

- `memory/agents/<runId>/...`

## Team Runs Scope

Team scope uses team-member memory APIs:

- `listTeamRunMemorySnapshots`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!)`

Storage source:

- `memory/agent_teams/<teamRunId>/<memberRunId>/...`

## UI Behavior

- Default scope on page load: `Agent Runs`
- Scope switch clears incompatible selection state.
- Team scope index is hierarchical:
  - Team row
  - Expand to member rows
  - Member selection drives inspector view
- Inspector header is scope-aware:
  - Agent: selected run ID
  - Team: selected team + member + member run ID

## Error and Stale-State Guard

- Agent and team view stores keep independent request IDs.
- Late responses from stale requests are ignored.
- On fetch error, scope-specific error state is shown and previous successful view is retained for that scope.

## Testing

Coverage includes:

- Backend unit + GraphQL e2e checks for team-memory contracts and legacy agent-memory regression.
- Frontend store/component/page tests for scope switching, team/member selection, and inspector rendering.
