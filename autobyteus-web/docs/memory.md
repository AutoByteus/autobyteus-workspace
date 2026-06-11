# Memory

## Overview

The Memory page (`/memory`) is a page-based memory browser for stored agent and agent-team memory. It is intentionally memory-derived: it lists only independent agents or agent teams that have persisted memory-bearing runs. Configured agents or teams that have never produced memory do not appear.

The current user flow is:

1. **Memory Home** — choose `Agents with Memory` or `Agent Teams with Memory`.
2. **Agent Memory Detail** — after selecting an agent card, browse that agent's memory-bearing runs.
3. **Agent Team Memory Detail** — after selecting a team card, browse that team's memory-bearing team runs and member memory targets.
4. **Memory Inspector** — inspect one agent run or one team member run through `Working Context`, `Episodic`, `Semantic`, and `Raw Traces` tabs.

Route query state preserves deep links and refreshes for home, agent detail, team detail, agent-run inspector, and team-member inspector views.

## Memory Home

Memory Home has two tabs:

- `Agents with Memory`
- `Agent Teams with Memory`

Cards show display names, stable IDs, run counts, latest memory timestamps, and memory availability badges. Search and pagination are scoped to the selected tab and are backed by GraphQL rather than by client-side grouping.

Agent cards are grouped primarily by `agentDefinitionId` when metadata exists. Standalone memory directories without run-history or metadata remain visible under an explicit `Unattributed runs` agent group so legacy stored memory is not hidden.

Agent-team cards are grouped by `teamDefinitionId` from team-run metadata. A team appears only when at least one member memory target exists.

## Detail Pages

Agent detail pages list runs only for the selected agent group, sorted by latest memory update. The list exposes run labels, run IDs, workspace paths when available, updated timestamps, and memory availability badges. Selecting a run opens the Memory Inspector for that agent run.

Team detail pages list team runs only for the selected team definition, sorted by latest member-memory update. Each team run exposes only member targets that have inspectable memory. Backend summaries are resolved from recursive team metadata and the server memory-location service, so nested member availability comes from the root-hierarchical `rootTeamRunId + teamRunPath + memberRunId` directory rather than from a flattened root-team/member assumption.

Search on detail pages filters only within the selected agent's runs or selected team's team runs/member targets.

## Frontend State Ownership

Frontend memory state is split by role:

- `stores/memoryExplorerStore.ts` owns Memory Home and detail-page lists, searches, pagination, selected agent/team summaries, and request-staleness guards.
- `stores/memoryInspectorStore.ts` owns the explicit inspect target, selected inspector tab, raw-trace loading state, raw-trace limit, and request-staleness guards.

The old flat `MemoryIndexPanel` and per-scope index/view stores were replaced. The page shell now renders `MemoryHome`, `AgentMemoryDetail`, `AgentTeamMemoryDetail`, or `MemoryInspector` according to `/memory` query parameters.

## GraphQL Explorer Contract

The Memory page uses backend-for-frontend explorer queries for lists:

- `listAgentsWithMemory(search, page, pageSize)` returns memory-bearing agent groups.
- `listAgentRunsWithMemory(selector, search, page, pageSize)` returns memory-bearing runs for a selected attributed agent or the `UNATTRIBUTED` group.
- `listAgentTeamsWithMemory(search, page, pageSize)` returns memory-bearing agent-team groups.
- `listAgentTeamRunsWithMemory(teamDefinitionId, search, page, pageSize)` returns memory-bearing team runs and member memory targets for one team definition.

Every explorer page returns `entries`, `total`, `page`, `pageSize`, and `totalPages`. Entry summaries include `MemoryAvailabilitySummary` flags for working context, episodic memory, semantic memory, active raw traces, and raw-trace archives.

The previous flat run-list queries (`listRunMemorySnapshots`, `listTeamRunMemorySnapshots`) are no longer the Memory page contract.

## GraphQL Inspector Contract

Inspector data comes from memory-view queries:

- `getAgentRunMemoryView(runId: String!)`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!)`

Both support include flags for working context, episodic memory, semantic memory, raw traces, archive inclusion, and `rawTraceLimit`.

The frontend initially loads working/episodic/semantic data without raw traces. Opening the `Raw Traces` tab flips `includeRawTraces` on and refetches the selected target. Changing the raw-trace limit refetches only when raw traces are active.

When raw traces are requested with archive inclusion enabled, the backend can merge complete archive segments plus active traces and expose provenance fields such as persisted trace `id`, `traceType`, `sourceEvent`, `turnId`, `seq`, timestamp, media fields, and tool payload fields. The current UI displays the normalized trace type, content, sequence, tool/media details, and loading/empty states.

## Storage Source

Storage is server-owned and identity-opaque:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`, with deeper child team ids appended before the member id
- Task-agent runs: `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...`

Native AutoByteus runs are written by the native memory manager. Codex and Claude runs are written as storage-only server memory: active raw traces, optional segmented archive records, and working-context snapshots for inspection and fallback replay.

The frontend does not infer memory ownership from runtime-specific thread/session IDs, generated run-id strings, route-key slugs, or archive internals. It selects agent definition groups, unattributed groups, agent run IDs, or exposed team/member targets and lets the backend resolve memory directories, complete archive segments, ordering, and de-duplication.

## Archive / Boundary Notes

The Raw Traces tab can include both active `raw_traces.jsonl` rows and complete segmented archive rows when the backend query requests archive inclusion. Provider compaction-boundary markers are storage provenance: they may appear as `provider_compaction_boundary` raw traces, but they do not mean the external runtime's memory was injected, retrieved, or semantically compacted by AutoByteus.

Segmented archives are not a retention/compression feature. They preserve analyzability while keeping active raw traces smaller after native compaction or provider-boundary rotation.

## Error and Stale-State Guard

Explorer and inspector stores increment request IDs for each fetch. Late responses from stale requests are ignored. On fetch error, the active list or inspector error state is shown while successful prior state is retained where possible.

## Testing

Coverage includes:

- Backend unit and GraphQL e2e checks for memory-derived agent/team inclusion, no-memory exclusion, `Unattributed runs`, selected agent/team filtering, and memory-view raw-trace lazy loading.
- Frontend store/component/page tests for Memory Home, agent detail, team detail, inspector targets, direct route restoration, search/pagination behavior, and tab-specific raw-trace fetching.
