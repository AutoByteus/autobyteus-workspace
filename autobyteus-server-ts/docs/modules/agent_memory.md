# Agent Memory

## Scope

`src/agent-memory` owns server-side memory exploration, inspection views, and the storage-only recorder used for non-native runtime runs. It reads and writes the same run/member memory files that the native TypeScript memory module defines in `autobyteus-ts`.

This module is intentionally separate from run-history projection: agent-memory exposes persisted memory artifacts for exploration and inspection, while `src/run-history` converts runtime or local-memory sources into historical replay bundles. Run-history metadata is used only to enrich memory explorer summaries and to group memory-bearing runs by stable agent/team identity.

## Storage Layout

Memory files live under the configured memory root:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`; deeper nesting appends each child team run id to that root-relative `teamRunPath` before the member id
- Task-agent runs: `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...` using the logical member's team memory scope

The `runId`, `memberRunId`, `taskAgentRunId`, `teamRunId`, and `teamRunPath`
segments are opaque stored identifiers. Readers must not parse generated id
shapes or derive nested member storage from a flattened member list; they should
use the resolved `memoryDir` or `AgentMemoryLocationService`.

`AgentMemoryLayout` is the single code owner for composing both standalone and
team memory directories. Do not reintroduce a separate standalone
`AgentRunMemoryLayout`, a versioned layout field, a compatibility alias, or
ad-hoc string/path assembly for `memory/agents/<runId>`. Callers that need a
concrete storage path should use `AgentMemoryLayout`, the resolved `memoryDir`,
or `AgentMemoryLocationService`, depending on whether they are composing a
standalone path, consuming already-persisted run metadata, or resolving
team/member/task-agent topology.

Canonical active memory file names are imported from `autobyteus-ts/memory/store/memory-file-names` and low-level direct-directory IO is delegated through `RunMemoryFileStore`.

Common files/directories:

- `raw_traces.jsonl` — active ordered raw trace records.
- `working_context_snapshot.json` — generic working-context snapshot state.
- `raw_traces_archive_manifest.json` — segmented raw-trace archive manifest owned internally by `RawTraceArchiveManager`.
- `raw_traces_archive/` — immutable JSONL archive segment files, one complete segment per native compaction or provider-boundary rotation.
- `episodic.jsonl`, `semantic.jsonl`, `compacted_memory_manifest.json` — native AutoByteus compacted memory artifacts when native semantic/episodic compaction has run.

The old monolithic `raw_traces_archive.jsonl` file is no longer an active read/write target. Historical monolithic archive files are intentionally not read by the approved no-compatibility policy.

## Runtime Ownership

Native AutoByteus runs remain owned by the `autobyteus-ts` `MemoryManager`. The server-side recorder must skip `RuntimeKind.AUTOBYTEUS` so native traces, snapshots, archives, and compacted memory are not duplicated. Native AutoByteus compaction still owns semantic/episodic/snapshot compaction, but it now archives compacted raw traces through shared segmented archive segments with `boundary_type = "native_compaction"`.

Codex and Claude runs are recorded by the server as **storage-only** memory:

1. `AgentRunManager` attaches `AgentRunMemoryRecorder` as an active-run sidecar when the run has a `memoryDir` and the runtime is not native AutoByteus.
2. Accepted user messages are observed only after `AgentRun.postUserMessage(...)` returns `accepted: true`.
3. Assistant text, reasoning, tool lifecycle outcomes, and normalized provider compaction-boundary payloads are captured from normalized `AgentRunEvent`s.
4. `RunMemoryWriter` writes shared `RawTraceItem` records and updates `WorkingContextSnapshot` through `RunMemoryFileStore`.

The recorder does not instantiate a Codex/Claude memory manager, retrieve memory for those runtimes, inject recorded memory into prompts, or alter provider/runtime session state. Memory persistence is independent of websocket clients; the sidecar is attached by the run manager, not by live stream subscribers.

Route-backed Agent Tools MCP calls from Codex App Server and Claude Agent SDK
are recorded only after the runtime adapter normalizes them into canonical
`AgentRunEvent` tool lifecycles. The MCP route, method dispatcher, executor,
and family services/dispatchers must not write raw traces directly. Raw traces
use canonical tool names such as `send_message_to`, `generate_image`,
`delegate_tasks`, and `publish_artifacts`, preserve the provider invocation id
as the tool-call id, and store the normalized application-facing result payload
without provider/server-qualified tool names, MCP session ids, or bearer/header
descriptor details. For families with a canonical public result contract, the
stored result follows that contract rather than the raw MCP content envelope;
for example browser `open_tab` records the direct browser result with
`tab_id`, and media generation records `{ file_path }`. Unknown non-AutoByteus
MCP results may still retain their provider result shape.

## Memory Explorer Read Model

The memory explorer is a backend-for-frontend read model for the `/memory` UI. It is memory-derived: configured agents or teams with no persisted memory do not appear.

Explorer services scan persisted memory roots at request time, derive memory availability flags, enrich with run-history metadata when available, sort by latest memory update, and paginate server-side.

### Independent Agents

`AgentMemoryExplorerService` reads standalone run directories from `memory/agents/<runId>` and includes only runs with at least one memory artifact. It groups included runs as follows:

- `DEFINITION` groups use `agentDefinitionId` from run metadata or run-history catalog rows.
- Runs without metadata/history attribution are grouped under `UNATTRIBUTED` / `Unattributed runs` so legacy standalone memory remains discoverable.

Agent explorer summaries include display name, stable ID, run count, latest memory timestamp, and merged memory availability. Agent-run summaries include run ID, optional agent metadata, workspace path, created/updated timestamps, and per-run memory availability.

### Agent Teams

`TeamMemoryExplorerService` reads team-run metadata and builds member memory targets. It includes a team run only when at least one member target has inspectable memory. Team groups use `teamDefinitionId`; each summary includes the team display name, team-run count, distinct member-memory count, latest memory timestamp, and merged availability.

Team-run summaries include team run metadata, merged availability across member targets, and `memberTargets` containing only members with memory. The backend builds those targets from recursive metadata and `AgentMemoryLocationService`, so nested member availability is resolved from the root-hierarchical `rootTeamRunId + teamRunPath + memberRunId` memory directory rather than from a flattened root-team/member assumption.

When `AgentMemoryLocationService` is constructed with an explicit `memoryDir`,
its topology/readback collaborators must use the same memory root. Do not mix a
writer rooted in one app memory directory with a reader backed by a global or
different memory root; raw-trace readback depends on that root consistency.

### Explorer GraphQL Queries

The explorer GraphQL surface is:

- `listAgentsWithMemory(search, page, pageSize)`
- `listAgentRunsWithMemory(selector, search, page, pageSize)`
- `listAgentTeamsWithMemory(search, page, pageSize)`
- `listAgentTeamRunsWithMemory(teamDefinitionId, search, page, pageSize)`

All list queries return a `MemoryExplorerPage` shape with `entries`, `total`, `page`, `pageSize`, and `totalPages`. Search is applied within the active surface: agent/team cards on home, selected-agent runs on agent detail, or selected-team runs/member targets on team detail.

The older flat snapshot queries (`listRunMemorySnapshots` and `listTeamRunMemorySnapshots`) were replaced by these explorer queries for the Memory UI.

## Trace Shape And GraphQL View

Raw traces preserve provenance needed by future analyzers:

- `id`
- `turn_id` / GraphQL `turnId`
- `seq`
- `trace_type` / GraphQL `traceType`, including `provider_compaction_boundary` markers
- `source_event` / GraphQL `sourceEvent`
- `content`, `media`, tool identity, tool args/result/error, correlation id, and timestamp fields when present

GraphQL memory-view queries:

- `getAgentRunMemoryView(runId: String!)`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!)`

Both view queries accept include flags for working context, episodic memory, semantic memory, raw traces, archive inclusion, and `rawTraceLimit`. Raw traces default to omitted so explorer/detail page transitions can stay lightweight; clients load raw traces explicitly when the user opens the Raw Traces tab or changes the trace limit.

`MemoryTraceEvent` exposes both `id` and `sourceEvent` for active and complete archived raw traces, so API consumers can correlate displayed rows with persisted trace records and their originating runtime event boundary. Readers ignore pending archive manifest entries and merge complete archive segments with active records when archive inclusion is requested, deduping by raw trace `id` with active records preferred.

## Archive, Rotation, And Retention Boundaries

`RunMemoryFileStore` is the facade for active raw traces plus complete segmented archive reads. `RawTraceArchiveManager` is the only owner of archive manifest/segment filenames and archive-internal policy.

Current archive/rotation behavior:

- Native AutoByteus compaction archives compacted raw traces into `native_compaction` segments.
- Codex/Claude provider-boundary rotation archives settled active raw traces before an eligible boundary marker into `provider_compaction_boundary` segments.
- Complete-corpus reads include complete archive segments plus active records, ordered by timestamp, turn id, sequence, then id.
- Pending archive manifest entries are retry state only and are not exposed to readers.
- Sequence initialization for restored external runs reads active records plus complete archive segments so per-turn `seq` values continue without reuse.

Current non-goals:

- No archive compression.
- No total-storage retention policy.
- No working-context snapshot windowing/retention.
- No compatibility read path for historical monolithic `raw_traces_archive.jsonl` files.

## Provider Compaction Boundaries

Codex and Claude provider/session compaction metadata is real provider-owned context management, but it is not AutoByteus semantic memory compaction.

Normalized provider-boundary handling is storage-only:

- Codex `thread/compacted` and raw Responses `type = "compaction"` items normalize to one deduplicated `provider_compaction_boundary` marker per boundary window.
- Claude `status: "compacting"` normalizes to non-rotating provenance.
- Claude `compact_boundary` normalizes to a rotation-eligible `provider_compaction_boundary` marker.
- `ProviderCompactionBoundaryRecorder` writes the marker as a raw trace with `semantic_compaction:false` metadata.
- If the marker is rotation-eligible, settled active raw traces before the marker rotate into a complete segmented archive entry. The marker remains active, and active plus complete archive segments remain the complete raw-trace corpus.

Provider-boundary handling must not create Codex/Claude semantic or episodic memory, rewrite trace content, drop trace history, inject memory into external runtimes, or retrieve memory from external runtimes. It is safe active-file rotation plus provenance only.

## Run-History Relationship

Run-history remains the owner of conversation/activity replay DTOs. Agent-memory may read run-history metadata/catalog rows to enrich explorer display names, summaries, workspace paths, timestamps, and grouping IDs, but stored memory remains the source of truth for inclusion in the Memory UI.

When runtime-native Codex or Claude history cannot be read, the local-memory projection fallback can build a replay bundle from the complete raw-trace corpus using the explicit persisted `memoryDir` basename as the local run/member id. Provider-boundary markers are provenance and are not converted into user-visible conversation/activity items.

## Key Source Files

- Explorer services: `src/agent-memory/services/agent-memory-explorer-service.ts`, `src/agent-memory/services/team-memory-explorer-service.ts`
- Explorer helpers: `src/agent-memory/services/memory-run-summary-builder.ts`, `src/agent-memory/services/team-memory-member-target-builder.ts`, `src/agent-memory/services/memory-explorer-page.ts`
- Memory location owner: `src/agent-memory/services/agent-memory-location-service.ts`
- Memory layout owner: `src/agent-memory/store/agent-memory-layout.ts`
- Team memory topology reader: `src/run-history/services/team-run-memory-topology-reader.ts`
- Explorer GraphQL types/resolver: `src/api/graphql/types/memory-explorer-schema.ts`, `src/api/graphql/types/memory-explorer.ts`
- Inspector GraphQL view types: `src/api/graphql/types/memory-view.ts`
- Recorder: `src/agent-memory/services/agent-run-memory-recorder.ts`
- Event accumulator: `src/agent-memory/services/runtime-memory-event-accumulator.ts`
- Provider boundary recorder: `src/agent-memory/services/provider-compaction-boundary-recorder.ts`
- Writer adapter: `src/agent-memory/store/run-memory-writer.ts`
- Shared file store: `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
- Shared archive manager: `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
