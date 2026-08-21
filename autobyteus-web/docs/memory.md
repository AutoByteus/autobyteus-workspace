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

Team detail pages use the selected team name as the team-run-list card heading without a separate subject summary card. Team runs are sorted by latest member-memory update, and each team run exposes only member targets that have inspectable memory under the `Members` section. Backend summaries are resolved from schema-v3 recursive Team metadata and the server memory-location service. Logical `memberAddress` identifies the Agent placement; physical memory resolution uses `rootTeamRunId + ancestorTeamRunIds + agentRunId` rather than a flattened or address-derived directory.

Search on detail pages uses `Search runs...` and filters only within the selected agent's runs or selected team's team runs/member targets. Subject-level run-count and ID metadata are intentionally not repeated above the list; per-run and per-team-run metadata remains visible inside the list cards.

The inspector header renders `Memory Inspector` once. Inspector back links preserve the previous destination while using concise subject labels, for example `Back to Codex` or `Back to <team name>`.

Imported source detail and inspector views keep the selected source in route and
store state. Imported memory is browse-only; the UI must not add restore,
continue, archive, delete, or other local-runtime actions for imported sources.

## Frontend State Ownership

Frontend memory state is split by role:

- `stores/memoryExplorerStore.ts` owns Memory Home and detail-page lists, searches, pagination, selected source, selected agent/team summaries, and request-staleness guards.
- `stores/memoryInspectorStore.ts` owns the explicit inspect target, selected inspector tab, raw-trace loading state, selected raw-trace file name, raw-trace limit, and request-staleness guards.
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
- `getTeamMemberRunMemoryView(teamRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`

Both support include flags for working context, episodic memory, semantic memory, raw traces, raw-trace file metadata, archive inclusion, and `rawTraceLimit`. The raw-trace file selector uses the optional `rawTraceFileName` argument and returns `rawTraceFiles` plus `selectedRawTraceFileName` in the memory view.

The frontend initially loads working/episodic/semantic data without raw traces. Opening the `Raw Traces` tab flips `includeRawTraces` and `includeRawTraceFiles` on and refetches the selected target. The backend defaults the selected file to active `raw_traces_active.jsonl` when it exists, otherwise to the first available complete segment in the inspector ordering. The selector lists active `raw_traces_active.jsonl` plus complete rotated `raw_traces_<zero-padded-index>.jsonl` segment files with record counts; pending/incomplete manifest entries are not shown. Selecting a file sends only that backend-listed file name, not an absolute path, and the response contains records from that file only. Changing the raw-trace limit refetches the currently selected file and applies the limit to that file.

When raw traces are requested with archive inclusion enabled without file-selector mode, the backend can still merge complete archive segments plus active traces for non-inspector callers. In both selected-file and merged-corpus modes it exposes provenance fields such as persisted trace `id`, `traceType`, `sourceEvent`, `turnId`, `seq`, timestamp, media fields, and tool payload fields. The current UI displays one selected file at a time with the normalized trace type, content, sequence, tool/media details, file selector, limit control, and loading/empty states.

`MemoryTraceEvent.scope` distinguishes ordinary `turn` traces from the current
run-scoped instruction trace. A valid instruction row appears with
`scope: "run"`, `traceType: "system_instruction"`,
`sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED"`, the exact captured content and
persisted ID/timestamp, and `turnId: null` / `seq: null`. The Raw Traces UI must
not fabricate turn grouping or sequence for it. Malformed system rows are
omitted by backend normalization instead of being rendered through the generic
turn shape.

## Storage Source

Storage is server-owned and identity-opaque:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`, with deeper child team ids appended before the member id
- Task-Agent runs: `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<taskAgentRunId>/...`
- Imported source memory: `memory/imports/<sourceNodeId>/agents/...` and
  `memory/imports/<sourceNodeId>/agent_teams/...`, plus hub-managed
  `source-node.json` and `sync-manifest.json`.

Native AutoByteus runs are written by the native memory manager, including the
WorkingContext snapshot used for native continuation. Codex and Claude runs use
raw-trace-only server recording: active raw traces and optional complete rotated
segments drive normal history replay and remain inspectable in the Raw Traces
tab; provider thread/session state owns continuation. New external activity does
not create or update `working_context_snapshot.json`.

Native, Codex, and Claude can each persist the exact AutoByteus-owned runtime
instruction handoff as the same strict run-scoped raw row. Existing runs are
directly usable without migration: absence means no instruction evidence was
recorded, not that the UI should reconstruct it from the current agent, Team, or
skill definition. Provider-owned hidden/effective instructions are outside this
record.

A required startup cleanup removes duplicate external snapshots only when
current standalone or team-member metadata classifies the exact location as
Codex or Claude. Native, imported, unclassified, and invalid-metadata snapshots
are preserved. The inspector stays file-backed and runtime-agnostic: after
successful cleanup an external run reports no WorkingContext, while a reported
unlink failure can leave a stale snapshot visible until retry without affecting
current raw traces or provider continuation.

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

The Source card keeps connection and sync feedback beside the action controls
rather than relying on page-level alerts. **Test connection** enters a
`Testing...` state and then shows an inline success or failure result with the
tested endpoint, source id, timestamp, hub-enabled/authentication flags when
available, and no token value. When the token field is blank and a saved source
token exists, the connection test uses the fully persisted source settings:
saved hub URL, saved `sourceNodeId`, and saved token. Unsaved draft URL or source
id edits are not mixed with the saved token; save first or paste a draft token to
test draft settings. When a draft token is pasted, the test uses the draft hub
URL, draft source id, and draft token together without persisting the token.

**Sync now** enters a disabled spinner/`Syncing…` state while the manual sync
mutation is in flight. The card reports `Current job: idle` or
`Current job: syncing…` from the authoritative source status, then reports
`Last sync: success · <timestamp>` or the latest sync error. A latest sync error
has display precedence over an older successful timestamp. Background sync uses
the same generic current-job surface; the primary UI intentionally does not make
users distinguish manual from background runs. Low-frequency status refresh keeps
the status lines current without rehydrating the editable source form, so
unsaved hub URL/source id edits and pasted draft tokens are preserved.

Current v1 sync mirrors local `agents` and `agent_teams` files with full-file
replacement batches. It excludes temporary/partial/lock files and does not sync
deletes, deltas, analytics indexes, or runnable restore state.

## Archive / Boundary Notes

The Raw Traces tab defaults to one selected raw-trace file at a time: active `raw_traces_active.jsonl` first when present, then complete segmented archive files as selectable options. It does not show a merged "all files" view by default. Backend memory-view callers that explicitly request archive inclusion without file-selector mode can still receive a merged corpus of complete segments plus active rows. Provider compaction-boundary markers are storage provenance: they may appear as `provider_compaction_boundary` raw traces, but they do not mean the external runtime's memory was injected, retrieved, or semantically compacted by AutoByteus.

Normal Activity and Event Monitor hydration are active-file-only. A rotated
`system_instruction` row therefore remains explicitly inspectable by selecting
its completed raw-trace segment here, but it is not silently reintroduced into
Activity; Event Monitor excludes this run-scoped kind in both active-window and
earlier-page policy.

Segmented archives are not a retention/compression feature. They preserve analyzability while keeping active raw traces smaller after native compaction or provider-boundary rotation.

## Error and Stale-State Guard

Explorer and inspector stores increment request IDs for each fetch. Late responses from stale requests are ignored. On fetch error, the active list or inspector error state is shown while successful prior state is retained where possible.

## Testing

Coverage includes:

- Backend unit and GraphQL e2e checks for memory-derived agent/team inclusion, no-memory exclusion, `Unattributed runs`, selected agent/team filtering, memory-view raw-trace lazy loading, selected raw-trace file listing/reads, invalid selector fallback, imported read-only source behavior, and merged-corpus preservation.
- Backend Memory Sync API/E2E checks for hub enablement, URL candidates, one-time token handling, source config redaction, explicit draft and saved connection-test modes, REST batch ingestion, imported-source Memory Explorer reads, duplicate retry, source-token binding, latest-error source status, and unsafe path rejection.
- Backend multi-process Memory Sync E2E starts two real server processes with isolated app-data directories, configures hub/source through HTTP GraphQL, validates saved-mode connection testing, syncs over HTTP, and asserts hub import files without requiring browser, Electron, Docker, or Kubernetes.
- Frontend store/component/page tests for Memory Home, source selection, agent detail, team detail, inspector targets, direct route restoration, search/pagination behavior, tab-specific raw-trace fetching, raw-trace file selector state/rendering, Memory Sync tab entry, source-aware query variables, form-preserving Memory Sync status refresh, saved-vs-draft connection-test dispatch, inline connection feedback, `Current job`/`Last sync` precedence, and sync button loading state.
