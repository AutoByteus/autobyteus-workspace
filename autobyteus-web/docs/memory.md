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
- Native AutoByteus runs are written by the native memory manager.
- Codex and Claude runs are written as storage-only server memory: active raw traces, optional segmented archive records, and working-context snapshots for inspection and fallback replay.

## Team Runs Scope

Team scope uses team-member memory APIs:

- `listTeamRunMemorySnapshots`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!)`

Storage source:

- `memory/agent_teams/<teamRunId>/<memberRunId>/...`
- Codex and Claude team members use the same member storage layout as native members; external-runtime memory may have active raw traces, segmented archive records, and a working-context snapshot even when episodic/semantic tabs are empty.

## GraphQL Trace Contract

Memory inspector data comes from the backend memory-view GraphQL surface:

- `getRunMemoryView`
- `getTeamMemberRunMemoryView`

When raw traces are requested with archive inclusion enabled, the backend merges complete archive segments plus active traces and exposes provenance fields:

- `id` — persisted raw trace identifier.
- `traceType` — normalized trace type such as `user`, `assistant`, `reasoning`, `tool_call`, `tool_result`, or `provider_compaction_boundary`.
- `sourceEvent` — normalized runtime event or command boundary that produced the trace.
- `turnId`, `seq`, `ts` — ordering and timestamp fields.
- tool payload fields (`toolName`, `toolCallId`, `toolArgs`, `toolResult`, `toolError`) when relevant.

The frontend does not infer memory ownership from runtime-specific thread/session ids or archive internals. It selects agent run ids or team/member run ids and lets the backend resolve the correct memory directory, complete archive segments, ordering, and de-duplication. Pending archive segments and historical monolithic archive files are not surfaced by the current backend contract.

## Archive / Boundary Notes

The Raw Traces tab can include both active `raw_traces.jsonl` rows and complete segmented archive rows. Provider compaction-boundary markers are storage provenance: they may appear as `provider_compaction_boundary` raw traces, but they do not mean the external runtime's memory was injected, retrieved, or semantically compacted by AutoByteus.

Segmented archives are not a retention/compression feature. They preserve analyzability while keeping active raw traces smaller after native compaction or provider-boundary rotation.

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

- Backend unit + GraphQL e2e checks for team-memory contracts, raw trace `id` / `sourceEvent` exposure, and legacy agent-memory regression.
- Frontend store/component/page tests for scope switching, team/member selection, and inspector rendering.
