# Memory

## Overview

The Memory page (`/memory`) is a page-based memory browser for stored agent and agent-team memory. It is intentionally memory-derived: it lists only independent agents or agent teams that have persisted memory-bearing runs. Configured agents or teams that have never produced memory do not appear.

The current user flow is:

1. **Memory source** — default to `Local Memory`; when the current server is a
   Memory Hub, optionally select an imported source.
2. **Memory Home** — choose `Agents` or `Agent Teams`.
3. **Agent detail** — after selecting an agent card, browse that agent's memory-bearing runs.
4. **Agent Team detail** — after selecting a team card, browse that team's memory-bearing team runs and member memory targets.
5. **Memory Inspector** — inspect one agent run or one team member run through `Working Context`, `Episodic`, `Semantic`, and `Raw Traces` tabs.

Route query state preserves deep links and refreshes for home, source selection,
agent detail, team detail, agent-run inspector, and team-member inspector views.

## Memory Home

Memory Home starts directly with the functional browser panel rather than a repeated page title. It has two tabs:

- `Agents`
- `Agent Teams`

When imported Memory Sync sources exist, a source selector is shown above the
tabs. `Local Memory` is the default for initial page load and for missing or
invalid source route state. Imported options are labeled as read-only imported
corpora and use `source=imported:<sourceNodeId>` in the route query.

Cards show display names, stable IDs, run counts, compact latest-update timestamps, member counts for teams, and memory availability badges. Search placeholders are scoped to the selected tab (`Search agents...` or `Search agent teams...`), and search/pagination are backed by GraphQL rather than by client-side grouping.

Agent cards are grouped primarily by `agentDefinitionId` when metadata exists. Standalone memory directories without run-history or metadata remain visible under an explicit `Unattributed runs` agent group so legacy stored memory is not hidden.

Agent-team cards are grouped by `teamDefinitionId` from team-run metadata. A team appears only when at least one member memory target exists.

## Detail Pages

Agent detail pages use the selected agent name as the run-list card heading without a separate subject summary card. The list is sorted by latest memory update and exposes run labels, run IDs, workspace paths when available, compact updated timestamps, and memory availability badges. Selecting a run opens the Memory Inspector for that agent run.

Team detail pages use the selected team name as the team-run-list card heading without a separate subject summary card. Team runs are sorted by latest member-memory update, and each team run exposes only member targets that have inspectable memory under the `Members` section. Backend summaries are resolved from recursive team metadata and the server memory-location service, so nested member availability comes from the root-hierarchical `rootTeamRunId + teamRunPath + memberRunId` directory rather than from a flattened root-team/member assumption.

Search on detail pages uses `Search runs...` and filters only within the selected agent's runs or selected team's team runs/member targets. Subject-level run-count and ID metadata are intentionally not repeated above the list; per-run and per-team-run metadata remains visible inside the list cards.

The inspector header renders `Memory Inspector` once. Inspector back links preserve the previous destination while using concise subject labels, for example `Back to Codex` or `Back to <team name>`.

Imported source detail and inspector views keep the selected source in route and
store state. Imported memory is browse-only; the UI must not add restore,
continue, archive, delete, or other local-runtime actions for imported sources.

## Frontend State Ownership

Frontend memory state is split by role:

- `stores/memoryExplorerStore.ts` owns Memory Home and detail-page lists, searches, pagination, selected source, selected agent/team summaries, and request-staleness guards.
- `stores/memoryInspectorStore.ts` owns the explicit inspect target, selected inspector tab, raw-trace loading state, raw-trace limit, and request-staleness guards.
- `stores/memorySyncStore.ts` owns the Nodes -> Memory Sync setup/status UI for the currently bound backend node.

The old flat `MemoryIndexPanel` and per-scope index/view stores were replaced. The page shell now renders `MemoryHome`, `AgentMemoryDetail`, `AgentTeamMemoryDetail`, or `MemoryInspector` according to `/memory` query parameters.

## GraphQL Explorer Contract

The Memory page uses backend-for-frontend explorer queries for lists:

- `listMemoryExplorerSources()` returns `Local Memory` plus any imported Memory Sync sources.
- `listAgentsWithMemory(source, search, page, pageSize)` returns memory-bearing agent groups.
- `listAgentRunsWithMemory(selector, source, search, page, pageSize)` returns memory-bearing runs for a selected attributed agent or the `UNATTRIBUTED` group.
- `listAgentTeamsWithMemory(source, search, page, pageSize)` returns memory-bearing agent-team groups.
- `listAgentTeamRunsWithMemory(teamDefinitionId, source, search, page, pageSize)` returns memory-bearing team runs and member memory targets for one team definition.

Every explorer page returns `entries`, `total`, `page`, `pageSize`, and `totalPages`. Entry summaries include `MemoryAvailabilitySummary` flags for working context, episodic memory, semantic memory, active raw traces, and raw-trace archives.

The `source` variable is explicit:

- `{ type: "LOCAL" }` reads the current node's local runtime memory.
- `{ type: "IMPORTED", sourceNodeId }` reads the selected hub import under
  `memory/imports/<sourceNodeId>`.

Unknown imported sources are backend errors rather than silent local fallbacks.

The previous flat run-list queries (`listRunMemorySnapshots`, `listTeamRunMemorySnapshots`) are no longer the Memory page contract.

## GraphQL Inspector Contract

Inspector data comes from memory-view queries:

- `getAgentRunMemoryView(runId: String!, source: MemoryExplorerSourceInput)`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!, source: MemoryExplorerSourceInput)`

Both support include flags for working context, episodic memory, semantic memory, raw traces, archive inclusion, and `rawTraceLimit`.

The frontend initially loads working/episodic/semantic data without raw traces. Opening the `Raw Traces` tab flips `includeRawTraces` on and refetches the selected target. Changing the raw-trace limit refetches only when raw traces are active.

When raw traces are requested with archive inclusion enabled, the backend can merge complete archive segments plus active traces and expose provenance fields such as persisted trace `id`, `traceType`, `sourceEvent`, `turnId`, `seq`, timestamp, media fields, and tool payload fields. The current UI displays the normalized trace type, content, sequence, tool/media details, and loading/empty states.

## Storage Source

Storage is server-owned and identity-opaque:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`, with deeper child team ids appended before the member id
- Task-agent runs: `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...`
- Imported source memory: `memory/imports/<sourceNodeId>/agents/...` and
  `memory/imports/<sourceNodeId>/agent_teams/...`, plus hub-managed
  `source-node.json` and `sync-manifest.json`.

Native AutoByteus runs are written by the native memory manager. Codex and Claude runs are written as storage-only server memory: active raw traces, optional segmented archive records, and working-context snapshots for inspection and fallback replay.

The frontend does not infer memory ownership from runtime-specific thread/session IDs, generated run-id strings, route-key slugs, or archive internals. It selects agent definition groups, unattributed groups, agent run IDs, or exposed team/member targets and lets the backend resolve memory directories, complete archive segments, ordering, and de-duplication.

The frontend also does not infer imported-memory identity from Nodes page profile
ids or display names. Memory Sync uses the backend `sourceNodeId` selected in
**Nodes -> Memory Sync** as the durable import identity.

## Memory Sync Setup

Memory Sync setup is available from **Nodes -> Memory Sync** for the node that
the current window controls. A backend node can be a Memory Hub, a Memory Sync
source, or both.

Hub setup requires an editable advertised hub base URL. The UI can suggest the
configured public URL, current node URL, Docker host alias, LAN/tailnet-like
addresses, and manual URL, but the user must choose the URL that source nodes can
actually reach. Docker sources on the same host often need
`http://host.docker.internal:<port>` rather than desktop loopback; Kubernetes
sources usually need a Service/Ingress/VPN/tailnet URL.

Hub tokens are generated by the backend and shown only once when created or
regenerated. The hub stores token hashes and credential metadata; source nodes
store the plaintext token locally so background sync can restart. Public API/UI
state only reports that a token is configured and shows a fixed redaction
placeholder. Use **Test connection** on the source node before relying on manual
or background sync.

Current v1 sync mirrors local `agents` and `agent_teams` files with full-file
replacement batches. It excludes temporary/partial/lock files and does not sync
deletes, deltas, analytics indexes, or runnable restore state.

## Archive / Boundary Notes

The Raw Traces tab can include both active `raw_traces.jsonl` rows and complete segmented archive rows when the backend query requests archive inclusion. Provider compaction-boundary markers are storage provenance: they may appear as `provider_compaction_boundary` raw traces, but they do not mean the external runtime's memory was injected, retrieved, or semantically compacted by AutoByteus.

Segmented archives are not a retention/compression feature. They preserve analyzability while keeping active raw traces smaller after native compaction or provider-boundary rotation.

## Error and Stale-State Guard

Explorer and inspector stores increment request IDs for each fetch. Late responses from stale requests are ignored. On fetch error, the active list or inspector error state is shown while successful prior state is retained where possible.

## Testing

Coverage includes:

- Backend unit and GraphQL e2e checks for memory-derived agent/team inclusion, no-memory exclusion, `Unattributed runs`, selected agent/team filtering, and memory-view raw-trace lazy loading.
- Backend Memory Sync API/E2E checks for hub enablement, URL candidates, one-time token handling, source config redaction, connection testing, REST batch ingestion, imported-source Memory Explorer reads, duplicate retry, source-token binding, and unsafe path rejection.
- Backend multi-process Memory Sync E2E starts two real server processes with isolated app-data directories, configures hub/source through HTTP GraphQL, syncs over HTTP, and asserts hub import files without requiring browser, Electron, Docker, or Kubernetes.
- Frontend store/component/page tests for Memory Home, source selection, agent detail, team detail, inspector targets, direct route restoration, search/pagination behavior, tab-specific raw-trace fetching, Memory Sync tab entry, and source-aware query variables.
