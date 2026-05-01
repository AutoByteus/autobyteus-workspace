# Agent Memory

## Scope

`src/agent-memory` owns server-side memory indexing, inspection views, and the storage-only recorder used for non-native runtime runs. It reads and writes the same run/member memory files that the native TypeScript memory module defines in `autobyteus-ts`.

This module is intentionally separate from run-history projection: agent-memory exposes persisted memory artifacts for inspection, while `src/run-history` converts runtime or local-memory sources into historical replay bundles.

## Storage Layout

Memory files live under the configured memory root:

- Standalone runs: `memory/agents/<runId>/...`
- Team member runs: `memory/agent_teams/<teamRunId>/<memberRunId>/...`

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

## Provider Compaction Boundaries

Codex and Claude provider/session compaction metadata is real provider-owned context management, but it is not AutoByteus semantic memory compaction.

Normalized provider-boundary handling is storage-only:

- Codex `thread/compacted` and raw Responses `type = "compaction"` items normalize to one deduplicated `provider_compaction_boundary` marker per boundary window.
- Claude `status: "compacting"` normalizes to non-rotating provenance.
- Claude `compact_boundary` normalizes to a rotation-eligible `provider_compaction_boundary` marker.
- `ProviderCompactionBoundaryRecorder` writes the marker as a raw trace with `semantic_compaction:false` metadata.
- If the marker is rotation-eligible, settled active raw traces before the marker rotate into a complete segmented archive entry. The marker remains active, and active plus complete archive segments remain the complete raw-trace corpus.

Provider-boundary handling must not create Codex/Claude semantic or episodic memory, rewrite trace content, drop trace history, inject memory into external runtimes, or retrieve memory from external runtimes. It is safe active-file rotation plus provenance only.

## Trace Shape And GraphQL View

Raw traces preserve provenance needed by future analyzers:

- `id`
- `turn_id` / GraphQL `turnId`
- `seq`
- `trace_type` / GraphQL `traceType`, including `provider_compaction_boundary` markers
- `source_event` / GraphQL `sourceEvent`
- `content`, `media`, tool identity, tool args/result/error, correlation id, and timestamp fields when present

GraphQL memory-view queries:

- `listRunMemorySnapshots`
- `getRunMemoryView(runId: String!)`
- `listTeamRunMemorySnapshots`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!)`

`MemoryTraceEvent` exposes both `id` and `sourceEvent` for active and complete archived raw traces, so API consumers can correlate displayed rows with persisted trace records and their originating runtime event boundary. Readers ignore pending archive manifest entries and merge complete archive segments with active records, deduping by raw trace `id` with active records preferred.

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

## Run-History Relationship

Run-history remains the owner of conversation/activity replay DTOs. When runtime-native Codex or Claude history cannot be read, the local-memory projection fallback can build a replay bundle from the complete raw-trace corpus using the explicit persisted `memoryDir` basename as the local run/member id. Provider-boundary markers are provenance and are not converted into user-visible conversation/activity items.

## Key Source Files

- Recorder: `src/agent-memory/services/agent-run-memory-recorder.ts`
- Event accumulator: `src/agent-memory/services/runtime-memory-event-accumulator.ts`
- Provider boundary recorder: `src/agent-memory/services/provider-compaction-boundary-recorder.ts`
- Writer adapter: `src/agent-memory/store/run-memory-writer.ts`
- Memory index/view services: `src/agent-memory/services/*memory*service.ts`
- GraphQL view types: `src/api/graphql/types/memory-view.ts`
- Shared file store: `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
- Shared archive manager: `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
