# Design Spec

## Current-State Read

Autobyteus server currently has three related but separate behaviors:

1. Native Autobyteus runtime memory is managed inside `autobyteus-ts`.
   - `autobyteus-ts/src/memory/memory-manager.ts` owns native runtime memory behavior.
   - It writes raw traces through `FileMemoryStore` and persists working context snapshots through `WorkingContextSnapshotStore`.
   - It is part of the native runtime loop: it observes native processed user input, tool intents/results, and final assistant responses.

2. Server `agent-memory` is a reader/indexer, not a writer.
   - `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` reads standard memory files.
   - `AgentMemoryService`, `AgentMemoryIndexService`, and `TeamMemoryIndexService` expose/index those files.
   - No server-side component records Codex/Claude commands/events into memory files today.

3. Codex/Claude runtime runs have enough common boundaries to support storage-only memory recording.
   - `AgentRunService.prepareFreshRun(...)` already creates `AgentRunConfig.memoryDir` for standalone runs for every runtime kind.
   - Codex/Claude backends already emit normalized `AgentRunEvent` values for assistant segments, reasoning segments when available, tool lifecycle, turn lifecycle, and errors.
   - User input is not a normalized event. It enters through `AgentRun.postUserMessage(...)` and must be captured after backend acceptance.
   - `AgentRunManager.registerActiveRun(...)` already attaches always-on run sidecars and is independent of WebSocket clients.

4. Runtime compaction signals are asymmetric and not interchangeable.
   - Native Autobyteus currently emits `COMPACTION_STATUS` through the common stream and uses a local compaction plan to write compacted memory/snapshot state, then prune specific raw trace ids from active `raw_traces.jsonl` into monolithic `raw_traces_archive.jsonl`; the target design replaces that archive write path with segmented archives.
   - Official OpenAI docs say server-side Responses compaction emits an encrypted `type=compaction` item in the response stream, and the Codex agent-loop article says Codex automatically uses `/responses/compact` when `auto_compact_limit` is exceeded.
   - The installed Codex CLI 0.125.0 binary contains app-server/protocol evidence for `thread/compacted`, `ContextCompactedNotification`, `ContextCompactedEvent`, `ContextCompactionItem`, and raw response item completion. Current server Codex conversion does not list/convert `thread/compacted` and drops raw response items unless they are function-call outputs.
   - The installed Claude Agent SDK defines `compact_boundary` and `status: 'compacting'` system messages, but current server conversion does not map them, and their payload lacks local raw-trace ids or compacted memory records.

Current fragmentation/gaps:

- There is no durable Codex/Claude memory record in the standard memory layout even though run metadata contains `memoryDir`.
- Putting persistence in WebSocket stream handlers would lose headless/background runs.
- Putting persistence inside Codex and Claude adapters separately would duplicate writer logic and blur runtime-adapter ownership.
- Creating `CodexMemoryManager` or `ClaudeMemoryManager` would be conceptually wrong: the server is not managing those runtimes' memory, only recording a durable normalized copy for Autobyteus-owned analysis.
- Treating Claude/Codex provider-internal compaction as local memory compaction would be unsafe because those signals do not identify which server-owned raw traces were summarized or what semantic/episodic memory was produced.
- Claude single-runtime team member configs and Claude team restore contexts do not consistently receive `memoryDir`.
- The local-memory run-history fallback is currently named/structured around Autobyteus and reads explicit memory dirs using `platformRunId ?? runId`, which is wrong when Codex thread ids or Claude session ids differ from the local memory directory basename.

Target constraints:

- Keep native Autobyteus `MemoryManager` as the only runtime memory manager in this scope.
- Add storage-only recording for Codex/Claude; do not retrieve, compact, inject, or otherwise manage external runtime context.
- Do not delete raw traces, rewrite trace content, or semantically compact Codex/Claude memory based on provider compact-boundary/status events; archive-preserving active-to-segment rotation is required at safe provider boundaries.
- Reuse the existing memory directory root, active `raw_traces.jsonl`, and snapshot formats while refactoring raw-trace archive storage into shared manifest-indexed segment files owned by `autobyteus-ts`; the server must import these primitives instead of copying file-format code.
- Persist memory without requiring a browser/WebSocket subscriber.
- Preserve one shared server writer/recorder path for Codex and Claude.

## Intended Change

Add a server-owned, storage-only memory recording capability under `autobyteus-server-ts/src/agent-memory` for non-native runtimes.

As part of the change, extract or formalize a reusable low-level memory file kit in `autobyteus-ts` for the shared file names, raw-trace serialization, working-context snapshot serialization, and direct memory-directory read/write operations. Native Autobyteus and the server recorder should use that same kit for the common file structure; only native Autobyteus uses `MemoryManager`.

The recorder attaches to active runs through `AgentRunManager`, observes accepted user-message commands through a new internal `AgentRun` command-observer seam, observes assistant/reasoning/tool output through normalized `AgentRunEvent` subscriptions, and writes normalized raw traces plus working-context snapshots into the run/member `memoryDir` through the shared low-level memory file kit.

Native Autobyteus runtime memory management remains owned by the existing native runtime `MemoryManager`, and the new server recorder explicitly skips `RuntimeKind.AUTOBYTEUS`. The native file-store archival path is refactored to use the same segmented raw-trace archive manager as Codex/Claude provider-boundary rotation.

Provider compaction signals/items are real for Codex and Claude, but they are intentionally not local semantic-compaction triggers. Codex `thread/compacted` / `type=compaction` and Claude compact-boundary/status messages are now part of the storage-only recording scope as non-destructive provenance markers and active-file rotation boundaries. They must not be interpreted as a local semantic compaction plan unless a runtime supplies server raw-trace ids and compacted-memory outputs.

Long-run active-file growth is handled by provider-boundary raw-trace rotation, not external-runtime memory management. When the recorder observes a normalized provider compaction boundary, it writes a `provider_compaction_boundary` marker trace and rotates settled active records before that marker from active `raw_traces.jsonl` into a boundary-specific archive segment file while preserving active+archive segments as the complete trace corpus. This same segmented raw-trace archive manager is also used by native Autobyteus compaction archival, so each native compaction or external provider boundary has an inspectable archive segment. Archive compression and working-context snapshot windowing remain future policy work.

## Terminology

- `Storage-only recorder`: server component that projects accepted commands and normalized runtime events into durable memory files. It does not own external runtime context or memory behavior.
- `Runtime memory manager`: runtime component that participates in the runtime loop, may influence retrieval/compaction/context, and owns memory semantics for the executing agent. In this scope only native Autobyteus has this.
- `Shared memory file kit`: low-level `autobyteus-ts` storage/format primitives that own memory file names, raw-trace serialization, working-context snapshot serialization, and direct memory-directory read/write operations.
- `Server memory writer adapter`: thin server-side adapter that translates recorder operations into calls to the shared memory file kit; it does not redefine the file format.
- `Accumulator`: per-run in-memory mapper that turns command/event streams into ordered memory write operations.
- `Local memory projection provider`: run-history projection provider that reads already-persisted local memory files regardless of runtime kind.
- `Provider compaction signal`: an external runtime/session status or boundary message that says the provider compacted its own context. It is not a server local-memory semantic compaction plan unless it names local raw trace ids and provides compacted memory output.
- `Active raw-trace rotation`: non-destructive storage operation that moves settled records out of active `raw_traces.jsonl` into archive segment storage so active files stay small while full raw history remains available through active+archive-segment reads.
- `Raw-trace archive segment`: immutable JSONL file containing the raw traces moved at one native compaction or provider compaction boundary.
- `Raw-trace archive manifest`: per-run JSON manifest that orders archive segments, records boundary metadata, and provides retry/idempotency state.
- `RawTraceArchiveManager`: internal `autobyteus-ts` storage owner for archive segment file naming, manifest schema, pending/complete segment lifecycle, idempotent segment creation, and archive-segment reads. It is not a server recorder API; callers above `RunMemoryFileStore` must use `RunMemoryFileStore` / `RunMemoryWriter`.

## Provider Boundary And Archive Segment Contracts

### Raw-trace file layout

Ownership rule: archive layout is a shared storage concern, not a Codex/Claude recorder concern. `RunMemoryFileStore` is the authoritative memory-directory facade; it owns active `raw_traces.jsonl` membership and delegates archive manifest/segment details to an internal `RawTraceArchiveManager`. Server `RunMemoryWriter`, native `FileMemoryStore`, application readers, and facade-level tests must not directly scan or mutate `raw_traces_archive/` or `raw_traces_archive_manifest.json`; only tightly scoped `RawTraceArchiveManager` unit tests may exercise those internals directly.

Target per-run memory layout for raw traces:

```text
<memoryDir>/raw_traces.jsonl
<memoryDir>/raw_traces_archive_manifest.json
<memoryDir>/raw_traces_archive/
  000001_<YYYYMMDDTHHMMSSmmmZ>_<boundary_key_hash>.jsonl
  000002_<YYYYMMDDTHHMMSSmmmZ>_<boundary_key_hash>.jsonl
```

Rules:
- `raw_traces.jsonl` is always the active/current segment.
- `raw_traces_archive/` contains immutable boundary archive segment files.
- `raw_traces_archive_manifest.json` is the authoritative index and ordering source for archive segments.
- The old monolithic `raw_traces_archive.jsonl` is not the target write path after this refactor.
- A segment file contains full raw trace records exactly as they appeared in active storage; trace content is not rewritten or summarized.
- Segment file name format is deterministic enough for inspection but manifest remains authoritative: `000001_20260430T103015123Z_a1b2c3d4.jsonl`, where the prefix is a monotonically increasing segment index and the suffix is a short hash of the boundary key.

Manifest schema version 1:

```ts
type RawTraceArchiveManifest = {
  schema_version: 1;
  next_segment_index: number;
  segments: RawTraceArchiveSegmentEntry[];
};

type RawTraceArchiveSegmentEntry = {
  index: number;
  file_name: string;
  boundary_type: "native_compaction" | "provider_compaction_boundary";
  boundary_key: string;
  boundary_trace_id?: string | null;
  runtime_kind?: "AUTOBYTEUS" | "CODEX" | "CLAUDE" | string | null;
  source_event?: string | null;
  archived_at: number;
  first_trace_id?: string | null;
  last_trace_id?: string | null;
  first_ts?: number | null;
  last_ts?: number | null;
  record_count: number;
  status: "pending" | "complete";
};
```

### Normalized provider compaction-boundary payload

Codex and Claude converters must map provider-specific surfaces to this runtime-neutral payload before recorder storage logic sees them:

```ts
type ProviderCompactionBoundaryPayload = {
  kind: "provider_compaction_boundary";
  runtime_kind: "CODEX" | "CLAUDE";
  provider: "codex" | "claude";
  source_surface:
    | "codex.thread_compacted"
    | "codex.raw_response_compaction_item"
    | "claude.compact_boundary"
    | "claude.status_compacting";
  boundary_key: string;
  provider_thread_id?: string | null;
  provider_session_id?: string | null;
  provider_event_id?: string | null;
  provider_response_id?: string | null;
  provider_timestamp?: number | null;
  turn_id?: string | null;
  trigger?: "auto" | "manual" | string | null;
  status?: "compacting" | "compacted" | string | null;
  pre_tokens?: number | null;
  rotation_eligible: boolean;
  semantic_compaction: false;
};
```

Boundary key rules:
- Use provider stable ids first: compaction id, compaction item id, Claude SDK `uuid`, response item id, or response id plus item id.
- Include runtime/provider and thread/session id in the key so different runtimes cannot collide.
- If a provider does not supply a stable id, synthesize from runtime kind, thread/session id, source surface, turn id if available, and a monotonic provider-event sequence.

Codex dedup rule:
- `thread/compacted` is the preferred boundary surface when present.
- Raw response `type=compaction` items are also converted, but the Codex converter must keep an LRU set of `boundary_key` values and emit at most one normalized boundary for the same provider compaction.
- If both surfaces do not share a stable id, suppress a raw response compaction item when a `thread/compacted` boundary was emitted for the same thread/turn within the current converter dedupe window.

Claude safe-boundary rule:
- SDK `status: "compacting"` may emit a status/provenance event with `rotation_eligible=false`; it must not rotate active traces by itself.
- SDK `compact_boundary` is the safe completed boundary and must emit `rotation_eligible=true`.
- If a Claude run only reports status and never reports `compact_boundary`, no active-file rotation occurs.

### `provider_compaction_boundary` raw trace shape

The recorder writes a marker trace before rotating active records:

```ts
{
  trace_type: "provider_compaction_boundary",
  content: "Provider-owned context compaction boundary: <provider>/<source_surface>",
  source_event: "COMPACTION_STATUS",
  correlation_id: boundary_key,
  turn_id: payload.turn_id ?? activeTurnId ?? "provider-boundary",
  tags: [
    "provider_compaction_boundary",
    "provider_owned_compaction",
    "rotation_boundary",
    "semantic_compaction:false",
    `runtime:${payload.runtime_kind.toLowerCase()}`,
    `provider:${payload.provider}`,
  ],
  tool_name: null,
  tool_call_id: null,
  tool_args: null,
  tool_result: {
    provider: payload.provider,
    runtime_kind: payload.runtime_kind,
    source_surface: payload.source_surface,
    boundary_key: payload.boundary_key,
    provider_thread_id: payload.provider_thread_id ?? null,
    provider_session_id: payload.provider_session_id ?? null,
    provider_event_id: payload.provider_event_id ?? null,
    provider_response_id: payload.provider_response_id ?? null,
    provider_timestamp: payload.provider_timestamp ?? null,
    trigger: payload.trigger ?? null,
    status: payload.status ?? null,
    pre_tokens: payload.pre_tokens ?? null,
    rotation_eligible: payload.rotation_eligible,
    semantic_compaction: false,
  }
}
```

Rules:
- The marker does not update `working_context_snapshot.json`.
- The marker stays in active `raw_traces.jsonl`; rotation moves records before the marker, not the marker itself.
- If `rotation_eligible=false`, write/proxy status metadata if useful but do not rotate.

### Active-to-archive-segment rotation algorithm

For an eligible provider boundary, the recorder queue executes one serialized operation:

1. Convert/dedup provider signal into `ProviderCompactionBoundaryPayload`.
2. Flush only required settled accumulator state before the boundary; do not invent assistant/tool completion for in-flight work.
3. Append the `provider_compaction_boundary` marker to active `raw_traces.jsonl` and capture its trace id.
4. Call `RunMemoryWriter.rotateActiveRawTracesBeforeBoundary({ boundaryTraceId, boundaryKey, boundaryType: "provider_compaction_boundary" })`.
5. `RunMemoryFileStore` reads active records and locates the boundary marker by id.
6. `RunMemoryFileStore` computes `moveSet = active records before marker`; `keepSet = marker and records after marker`. Active membership decisions stay in the facade because it owns active `raw_traces.jsonl`.
7. If `moveSet` is empty, no segment file is created.
8. `RunMemoryFileStore` calls internal `RawTraceArchiveManager.createSegmentIfAbsent({ boundary, records: moveSet })`.
9. `RawTraceArchiveManager` checks for an existing `complete` segment for `boundary_key`; on retry it returns that entry and exposes its archived record ids for active cleanup.
10. If no complete segment exists, `RawTraceArchiveManager` removes stale pending entries for the boundary, allocates the next segment index, builds the deterministic segment filename, and writes/commits a manifest entry with `status: "pending"`.
11. `RawTraceArchiveManager` writes the segment file with full moved records using temp-file-and-rename.
12. `RawTraceArchiveManager` marks the manifest entry `status: "complete"` using temp-file-and-rename.
13. `RunMemoryFileStore` rewrites active `raw_traces.jsonl` with `keepSet`, excluding records already archived by a completed retry, using temp-file-and-rename.
14. On retry after a crash, readers ignore `pending` segments; completed segments are included and deduped by raw trace id, so duplicate active+archive records do not change reconstructed history.

Native Autobyteus compaction uses the same archive manager after its compactor selects eligible trace ids:
- native compaction writes semantic/episodic memory as today;
- selected raw traces are moved to a `boundary_type: "native_compaction"` segment;
- native active file is rewritten with non-compacted traces;
- native archive segment files and external provider segment files share the same manifest and reader path.

### Complete-corpus reader contract

All memory/run-history readers that include archive data must call the `RunMemoryFileStore` complete-corpus facade rather than directly scanning archive files. That facade must:
- ask `RawTraceArchiveManager` for complete manifest segments in manifest index order;
- read active `raw_traces.jsonl`;
- merge archive segment records plus active records;
- dedupe by raw trace `id`, preferring the active record if the same id appears active and archived during retry recovery;
- order by `ts`, then `turn_id`, then `seq`, then `id` as a deterministic fallback;
- expose the merged corpus to memory view and run-history projection.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Design Principles Recheck / Refactor Decision

This revision applies the shared design-principles file as an architecture gate, not as after-the-fact wording. The archive change is a structural refactor of raw-trace storage across runtimes, not a mechanical patch on Codex/Claude event handling.

| Principle / Check | Design Decision | Consequence For Implementation |
| --- | --- | --- |
| Data-flow spine clarity | Provider/native compaction boundaries now have their own bounded storage spine (DS-007) from boundary signal to active-file rewrite plus immutable archive segment. | Review can reason about rotation independently from event mapping and memory management. |
| Ownership clarity | `AgentRunMemoryRecorder` owns recording lifecycle; `RuntimeMemoryEventAccumulator` owns event-to-operation decisions; `RunMemoryWriter` adapts server operations; `RunMemoryFileStore` is the authoritative memory-directory facade; `RawTraceArchiveManager` owns archive manifest/segment internals. | No provider converter, recorder, reader, or facade-level test should directly own archive file layout. |
| Authoritative Boundary Rule | Callers above `RunMemoryFileStore` depend on `RunMemoryFileStore`/`RunMemoryWriter` only, never on both that facade and `RawTraceArchiveManager` internals. | If a caller needs archive data, add a facade method; do not let callers scan `raw_traces_archive/` or mutate the manifest. |
| Off-spine concern placement | Provider compaction parsing stays in runtime converters; archive rotation stays in shared storage; semantic compaction stays only in native Autobyteus `MemoryManager`. | Codex/Claude adapters emit normalized boundary events but perform no file IO; server recorder does not become a provider adapter or runtime memory manager. |
| Reusable owned structures | Add explicit `raw-trace-archive-manifest.ts` and `raw-trace-archive-manager.ts` under `autobyteus-ts/src/memory/store`. | The manifest schema, segment filename policy, pending/complete retry rules, and archive reads have one owner reused by native Autobyteus and server recording. |
| Removal/refactor first-class | The monolithic `raw_traces_archive.jsonl` write path and any ad hoc active-only reader assumptions are decommissioned in this scope. | No compatibility wrapper should continue writing the old archive file; readers that need full history must use active+manifest-indexed archive segments. |

Refactor conclusion: it is not sufficient to add provider-boundary handlers that call an enlarged `RunMemoryFileStore` with embedded manifest logic. The target design requires an internal `RawTraceArchiveManager` so the reusable archive policy is independently owned and the memory-dir facade stays coherent.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Accepted user-message command on `AgentRun.postUserMessage(...)` | `raw_traces.jsonl` user trace and working-context user message | `AgentRunMemoryRecorder` | User input is not a runtime event, but it is required for usable memory. |
| DS-002 | Return-Event | Normalized Codex/Claude `AgentRunEvent` stream | Assistant/reasoning/tool raw traces and working-context updates | `AgentRunMemoryRecorder` + `RuntimeMemoryEventAccumulator` | External runtime output is already normalized here; recording must consume this shared boundary. |
| DS-003 | Primary End-to-End | Active run registration/restoration | Recorder attached/detached for the run | `AgentRunManager` | Persistence must be always-on and independent of WebSocket clients. |
| DS-004 | Primary End-to-End | Team member runtime context construction/restore | Member `AgentRunConfig.memoryDir` | Team backend factories / restore context support | Team Codex/Claude member memory can only be written if each member has a durable directory. |
| DS-005 | Bounded Local | Persisted local memory files | Historical run projection | Local memory run-history provider | Post-change Codex/Claude memory should remain viewable when provider-specific history is unavailable. |
| DS-006 | Bounded Local | Native Autobyteus run events/commands | Existing native memory files | Native Autobyteus `MemoryManager` | This path must remain separate and must not be double-recorded by the server recorder. |
| DS-007 | Bounded Local | Native compaction selection or provider compaction boundary marker | Manifest-indexed archive segment plus rewritten active `raw_traces.jsonl` | `RunMemoryFileStore` using internal `RawTraceArchiveManager` | Raw-trace archive rotation is a shared storage spine; it must not be duplicated per runtime or hidden inside provider adapters. |

## Primary Execution Spine(s)

- DS-001: `Caller -> AgentRun.postUserMessage -> Runtime backend accepts command -> AgentRun command observer -> AgentRunMemoryRecorder -> RuntimeMemoryEventAccumulator -> RunMemoryWriter adapter -> RunMemoryFileStore -> memoryDir/raw_traces.jsonl + working_context_snapshot.json`
- DS-002: `Runtime client/provider -> Runtime backend converter -> AgentRunEvent -> AgentRun.subscribeToEvents -> AgentRunMemoryRecorder -> RuntimeMemoryEventAccumulator -> RunMemoryWriter adapter -> RunMemoryFileStore -> memory files`
- DS-003: `AgentRunManager.create/restore -> AgentRun constructed with command observer -> registerActiveRun -> recorder.attachToRun -> event unsubscribe on unregister`
- DS-004: `Team backend factory/restore -> TeamMemberRunConfig -> AgentRunConfig.memoryDir -> member AgentRun -> recorder uses member memoryDir`
- DS-005: `AgentRunViewProjectionService fallback -> LocalMemoryRunViewProjectionProvider -> MemoryFileStore -> raw-trace transformer -> RunProjection`
- DS-007: `Provider boundary/native compaction selection -> RunMemoryWriter or native FileMemoryStore -> RunMemoryFileStore.rotate/prune -> RawTraceArchiveManager.createSegmentIfAbsent -> manifest-indexed segment + active raw trace rewrite`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When any caller posts a user message, `AgentRun` delegates to the backend. Only after the backend returns `accepted: true` does `AgentRun` notify internal command observers. The memory recorder converts that accepted command into a `user` raw trace and user working-context message. | `AgentRun`, `AgentOperationResult`, `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, `RunMemoryWriter` | `AgentRunMemoryRecorder` | Observer error isolation, turn-id fallback, media/context-file extraction, no public stream event. |
| DS-002 | Codex/Claude adapters continue to normalize provider output into `AgentRunEvent`. The recorder subscribes once per active run, accumulates segment/tool state, de-duplicates tool invocations, and writes normalized raw trace/snapshot operations. | `AgentRunEvent`, `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, `RunMemoryWriter` | `RuntimeMemoryEventAccumulator` for mapping; recorder for lifecycle | Segment flushing, tool-call/result matching, sequence ordering, snapshot updates. |
| DS-003 | Active run creation and restoration are already centralized in `AgentRunManager`. The manager wires the recorder command observer into the `AgentRun`, attaches recorder event subscription when registering, and detaches it during unregister. | `AgentRunManager`, `AgentRun`, `AgentRunMemoryRecorder` | `AgentRunManager` | Service singleton/test injection, unsubscribe cleanup, skip native runtime. |
| DS-004 | Team backend factories and restore context builders must ensure each Codex/Claude member `AgentRunConfig` carries the member memory directory. The recorder does not special-case team paths; it writes to the configured `memoryDir`. | `TeamRunConfig`, `TeamMemberRunConfig`, `AgentRunConfig` | Team backend factory / restore support | Claude parity with Codex/mixed, metadata consistency. |
| DS-005 | Run-history projection keeps runtime-specific primary providers for Codex/Claude. If those cannot produce a usable projection, the generic local-memory provider reads the stored raw traces from `memoryDir` using the local directory basename and builds a projection. | `AgentRunViewProjectionService`, `LocalMemoryRunViewProjectionProvider`, raw trace transformer | Run-history projection subsystem | Provider naming cleanup, reasoning trace support, identity correction. |
| DS-006 | Native Autobyteus continues to use its internal `MemoryManager` and storage. The server recorder detects `RuntimeKind.AUTOBYTEUS` and does nothing. | `MemoryManager`, `FileMemoryStore`, `WorkingContextSnapshotStore` | Native Autobyteus runtime | No duplicate traces, no migrated native memory behavior. |
| DS-007 | When a provider boundary or native compaction boundary is safe to rotate, active raw traces before the boundary are moved into one immutable segment. The archive manager records the segment in a manifest and readers reconstruct history from completed segments plus active records. | `RunMemoryFileStore`, `RawTraceArchiveManager`, `RawTraceArchiveManifest` | `RunMemoryFileStore` facade; `RawTraceArchiveManager` for archive internals | Idempotent rotation, full-corpus reads, no per-runtime archive logic. |

## Spine Actors / Main-Line Nodes

- `AgentRunService`: provisions standalone `AgentRunConfig.memoryDir` and run metadata.
- `AgentRunManager`: constructs/restores active runs and attaches run sidecars, including the memory recorder.
- `AgentRun`: runtime-independent command/event boundary; exposes backend events and internal accepted-command notification.
- Runtime backend converters: keep Codex/Claude provider-specific payload parsing and emit normalized `AgentRunEvent`s.
- `AgentRunMemoryRecorder`: storage-only recorder lifecycle owner for non-native runtimes.
- `RuntimeMemoryEventAccumulator`: per-run command/event-to-memory-operation mapper.
- `RunMemoryWriter`: thin server adapter that delegates shared file-format persistence to `RunMemoryFileStore`.
- `RunMemoryFileStore`: authoritative direct memory-directory facade for active raw traces, snapshots, full-corpus reads, and rotation entrypoints.
- `RawTraceArchiveManager`: internal shared storage owner for archive manifest/segment mechanics.
- Team backend factories / restore support: ensure team member configs carry `memoryDir`.
- Local memory projection provider: reads persisted raw traces for run-history fallback.

## Ownership Map

| Actor | Owns | Must Not Own |
| --- | --- | --- |
| `AgentRunService` | Fresh standalone run ids, memory dir provisioning, metadata persistence, restore config construction. | Memory recording, event mapping, runtime-specific trace parsing. |
| `AgentRunManager` | Active run lifecycle and always-on sidecar attachment/detachment. | Memory file schema or event-to-trace mapping. |
| `AgentRun` | Backend command delegation, event subscription passthrough, internal accepted-command notification. | Direct dependency on `agent-memory`, file writes, public user-message stream events. |
| Codex/Claude converters | Provider-specific event payload interpretation into normalized `AgentRunEvent`. | Durable memory writes or working-context snapshot ownership. |
| `AgentRunMemoryRecorder` | Deciding whether a run should be recorded, attaching/detaching event listeners, receiving accepted commands, routing to a per-run accumulator, and isolating recorder errors. | External runtime memory management, compaction/retrieval/injection, provider-specific parsing beyond common payload fields. |
| `RuntimeMemoryEventAccumulator` | Per-run turn/segment/tool state, event de-duplication, sequence allocation, and producing normalized memory write operations. | File path layout decisions, active-run lifecycle, native Autobyteus memory behavior. |
| `RunMemoryWriter` | Translating recorder operations to the shared `autobyteus-ts` direct memory-directory store and preserving file shape through shared primitives. | Runtime lifecycle, command observation, event interpretation, independent serialization definitions. |
| `RunMemoryFileStore` | Active raw-trace and snapshot file facade for one memory directory, full-corpus reads, active membership rewrite orchestration, and delegation to archive internals. | Provider event interpretation, manifest field policy duplication in callers, runtime memory semantics. |
| `RawTraceArchiveManager` | Archive segment filename policy, manifest schema/pending/complete lifecycle, complete segment reads, idempotent boundary-segment creation. | Public server recorder API, active raw-trace item creation, working-context snapshots, semantic/episodic memory compaction. |
| Native `MemoryManager` | Autobyteus runtime memory behavior. | Codex/Claude recording. |
| Local memory projection provider | Building history projection from local memory files. | Runtime-specific provider history access. |

Public facades such as GraphQL resolvers and WebSocket stream handlers are thin entry/transport boundaries. They must not secretly own durable memory recording.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamHandler` | `AgentRun` / runtime backends for live stream events | WebSocket client delivery | Durable memory persistence. |
| GraphQL memory resolvers | `AgentMemoryService` and index services | API access to memory files | File recording, sequence assignment, runtime event mapping. |
| Team stream handler | Team runtime managers and member `AgentRun`s | Client delivery of team member events | Member memory recording. |
| Runtime-specific run-history providers | Codex/Claude history sources | Rich provider-specific projection when available | Local memory file fallback. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| The effective no-writer path for Codex/Claude run memory | Codex/Claude runs need durable local memory files. | `AgentRunMemoryRecorder` + `RunMemoryWriter` | In This Change | Not a file deletion; decommissions missing behavior by adding the correct owner. |
| Any proposed per-runtime `CodexMemoryManager` / `ClaudeMemoryManager` shape | It would duplicate native runtime memory-manager semantics and misrepresent storage-only recording. | One shared storage-only recorder under `agent-memory` | In This Change | Explicit architecture rejection; do not create these files/classes. |
| Claude team member config path without default `memoryDir` | Recorder cannot write member memory without a configured directory. | `ClaudeTeamRunBackendFactory` using `TeamMemberMemoryLayout`; restore context also sets memoryDir | In This Change | Mirrors Codex/mixed parity. |
| Autobyteus-named local-memory fallback provider as generic fallback | Fallback is now a runtime-neutral local memory reader, not only Autobyteus. | `LocalMemoryRunViewProjectionProvider` | In This Change | Replace/rename cleanly; do not keep a compatibility wrapper around the old provider name. |
| Explicit-memory-dir projection identity using `platformRunId ?? runId` | External runtime platform ids are not local memory directory ids. | Local memory provider uses `path.basename(memoryDir)` for explicit memory dir reads | In This Change | Required for Codex/Claude local fallback. |

## Return Or Event Spine(s) (If Applicable)

- Codex event return spine: `Codex app server message -> CodexThreadEventConverter -> AgentRunEvent -> CodexAgentRunBackend listeners -> AgentRun.subscribeToEvents listener -> Recorder accumulator`.
- Claude event return spine: `Claude session event -> ClaudeSessionEventConverter -> AgentRunEvent -> ClaudeAgentRunBackend listeners -> AgentRun.subscribeToEvents listener -> Recorder accumulator`.
- Recorder persistence return is intentionally not a user-visible event. Recording failures should be logged and surfaced through tests/diagnostics, but must not create public stream noise or block runtime progress.

## Bounded Local / Internal Spines (If Applicable)

1. Parent owner: `AgentRunMemoryRecorder`
   - Chain: `attachToRun -> get/create accumulator -> subscribeToEvents -> enqueue event -> detach unsubscribe`.
   - Why it matters: recording must be ordered per run and cleaned up when active runs are unregistered.

2. Parent owner: `RuntimeMemoryEventAccumulator`
   - Chain: `input command/event -> resolve turn id -> update segment/tool state -> allocate seq -> emit write operation -> update snapshot state`.
   - Why it matters: segment deltas, tool approval/start/result events, and turn completion can arrive as multiple events that must collapse into stable memory records.

3. Parent owner: `RunMemoryWriter` adapter + shared `RunMemoryFileStore`
   - Chain: `initialize from memoryDir -> read existing complete raw-trace corpus/snapshot through shared store -> append raw trace or write snapshot through shared store -> return state`.
   - Why it matters: restored runs must continue sequence numbers and preserve existing working context without duplicating file-format code in the server.

4. Parent owner: `RunMemoryFileStore` with internal `RawTraceArchiveManager`
   - Chain: `rotation request -> read active raw traces -> compute moveSet/keepSet -> RawTraceArchiveManager reserve/write/complete segment -> rewrite active file -> archive-aware reader sees complete corpus`.
   - Why it matters: active raw-trace rotation spans active membership and archive index state, so the operation needs one storage facade while preserving a separate internal archive owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Metadata provenance | DS-001, DS-002 | Future analyzers and memory views | Use existing run/team metadata for runtime kind, platform ids, agent definition, workspace; raw traces carry turn/source/tool ordering. | Avoid repeating run metadata in every trace while keeping provenance recoverable. | Bloats every trace and creates redundant drift. |
| WebSocket delivery | DS-002 | UI clients | Continue forwarding events only. | Live UI concerns differ from durable recording. | Headless runs would lose memory. |
| Provider-specific payload parsing | DS-002 | Runtime backend converters | Keep Codex/Claude raw provider details inside converters. | Recorder should consume normalized event fields. | Recorder becomes provider adapter and duplicates converter logic. |
| Snapshot schema reuse | DS-001, DS-002 | `RunMemoryFileStore` and server `RunMemoryWriter` adapter | Use shared `autobyteus-ts` snapshot/raw trace shape and serialization primitives. | Avoid schema drift with native memory. | Duplicate file-format code becomes inconsistent. |
| Raw-trace archive segmentation | DS-007 | `RunMemoryFileStore` facade and internal `RawTraceArchiveManager` | Own manifest-indexed segment creation, active-to-archive rotation, idempotency, and complete-corpus reads. | Native and provider-boundary rotation share one storage policy. | Archive details leak into provider converters, recorders, readers, or tests. |
| Run-history fallback | DS-005 | Run-history service | Convert local raw traces into historical replay when runtime-specific history is missing. | Memory should serve future inspection and history projection. | Runtime providers become responsible for local memory files. |
| Recorder errors | DS-001, DS-002, DS-003 | `AgentRunMemoryRecorder` | Catch/log writer/mapper failures without failing runtime commands. | Memory recording is important but external runtime progress should not crash due to persistence errors. | Commands/events become coupled to disk availability in surprising ways. |
| Validation coverage | All | Implementation and review | Prove mapping, file writes, no native duplication, team parity, fallback projection. | This is cross-cutting and regression-prone. | Review would rely on manual inspection only. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable memory file layout | `autobyteus-ts` memory store/model primitives and server `agent-memory` readers | Extend/Re-use | Existing files already define raw trace and snapshot shapes; formalize a direct-memory-directory store for server import. | N/A |
| Segmented raw-trace archive policy | `autobyteus-ts/src/memory/store` | Extend/Re-use | Add explicit archive manifest and archive manager under the existing memory store owner instead of creating server/provider-local archive code. | N/A |
| Active run lifecycle attachment | `AgentRunManager` | Reuse | It already attaches always-on sidecars independent of WebSocket clients. | N/A |
| User-command capture | `AgentRun` | Extend | It is the single command boundary after backend acceptance. | N/A |
| Assistant/tool/reasoning capture | Normalized `AgentRunEvent` | Reuse | Codex/Claude converters already normalize provider output. | N/A |
| Team member memory path | `TeamMemberMemoryLayout` | Reuse | Codex/mixed already use it; Claude should match. | N/A |
| Local memory history projection | Run-history projection subsystem | Extend/Rename | Existing fallback logic reads memory but is Autobyteus-named and has identity issue. | N/A |
| External-runtime memory management | None | Do Not Create | Codex/Claude manage their own internal context; server only records. | A new manager would violate storage-only scope. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain` | Runtime-neutral command observer seam on `AgentRun`. | DS-001 | `AgentRun`, `AgentRunManager` | Extend | Interface only; no memory dependency in domain. |
| `agent-execution/services` | Active run sidecar wiring and lifecycle. | DS-003 | `AgentRunManager` | Extend | Inject recorder like existing file-change/artifact sidecars. |
| `agent-memory` | Storage-only recorder, accumulator, writer, memory model exposure. | DS-001, DS-002 | `AgentRunMemoryRecorder` | Extend | This is the correct memory-file ownership area. |
| `agent-team-execution` | Team member runtime configs and restore contexts. | DS-004 | Team backend factories | Extend | Fix Claude parity. |
| `run-history/projection` | Local memory fallback provider and raw-trace transformer. | DS-005 | `AgentRunViewProjectionService` | Extend/Rename | Generic local memory provider replaces Autobyteus-named fallback. |
| Native `autobyteus-ts/memory` | Native runtime memory manager, reusable storage/model primitives, and internal raw-trace archive manager. | DS-001, DS-002, DS-006, DS-007 | Native Autobyteus runtime and server writer adapter | Extend, no native runtime behavior change | Add shared file kit and `RawTraceArchiveManager` here; do not move native memory management into server. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/agent-run-command-observer.ts` | Agent execution domain | Internal command observer boundary | Defines accepted user-message command notification contract. | Single small domain interface; avoids `AgentRun` depending on memory subsystem. | Uses `AgentOperationResult`, `AgentRunConfig`, runtime kind. |
| `agent-execution/domain/agent-run.ts` | Agent execution domain | Active run facade | Notifies command observers after accepted user message. | Existing command boundary. | Observer interface. |
| `agent-execution/services/agent-run-manager.ts` | Agent execution services | Active run lifecycle owner | Injects recorder, passes command observer to `AgentRun`, attaches/detaches recorder event subscription. | Existing sidecar lifecycle owner. | Recorder service. |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Native/shared memory storage | File-name constants | Own standard memory file names (`raw_traces.jsonl`, `working_context_snapshot.json`, archive manifest/dir, semantic/episodic files). | Prevents server/native drift in file naming. | N/A |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Native/shared memory storage | Archive manifest schema | Defines manifest/segment entry types, boundary type union, schema version, and empty-manifest factory. | The archive index schema is shared by native compaction, provider-boundary rotation, readers, and tests. | File-name constants only. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Native/shared memory storage | Internal archive owner | Owns archive segment filename policy, pending/complete manifest commits, complete segment reads, idempotent boundary-key handling, and segment temp-write/rename. | Keeps archive policy from bloating the memory-dir facade or being duplicated in server/native code. | Raw-trace archive manifest/schema, file-name constants. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Native/shared memory storage | Direct memory-directory facade | Reads/writes active raw traces and working-context snapshots for one concrete `memoryDir`; exposes rotation/full-corpus APIs while delegating archive internals to `RawTraceArchiveManager`. | Provides an explicit reusable API instead of relying on `FileMemoryStore(..., agentRootSubdir: "")` conventions. | RawTraceItem, WorkingContextSnapshotSerializer, existing message/tool payload classes, `RawTraceArchiveManager`. |
| `autobyteus-ts/src/memory/store/file-store.ts` | Native memory store adapter | Native `MemoryStore` implementation | Delegates common raw-trace file IO/path constants to the direct run-memory store while preserving native `MemoryStore` responsibilities. | Avoids two independent implementations inside `autobyteus-ts`. | `RunMemoryFileStore`. |
| `agent-memory/store/run-memory-writer.ts` | Agent memory persistence | Thin server adapter | Translates recorder operations to `autobyteus-ts` direct memory-directory store calls. | Keeps server dependency on shared memory primitives in one place and avoids layout/serialization duplication. | `RunMemoryFileStore`, RawTraceItem, WorkingContextSnapshotSerializer. |
| `agent-memory/services/agent-run-memory-recorder.ts` | Agent memory services | Storage-only recorder | Runtime skip decision, command observer implementation, attach/detach, queue/error handling. | Main governing owner for cross-runtime recording. | Accumulator/writer. |
| `agent-memory/services/runtime-memory-event-accumulator.ts` | Agent memory services | Per-run event mapper | Turn/segment/tool state and trace/snapshot operation creation. | Mapping state is cohesive and testable. | Recording models. |
| `agent-memory/domain/memory-recording-models.ts` | Agent memory domain | Recording data model | Internal trace/snapshot operation input shapes. | Prevents ad hoc record shapes across recorder/writer/tests. | Raw trace/snapshot concepts. |
| `agent-memory/domain/models.ts` | Agent memory domain | Public memory view model | Add optional raw trace `id` and `sourceEvent`. | Existing public memory domain model. | Raw trace fields. |
| `agent-memory/services/agent-memory-service.ts` | Agent memory services | Memory view parser | Preserve `id` and `source_event` when raw traces are requested. | Existing parser owner. | Domain model. |
| `api/graphql/types/memory-view.ts` and converter | GraphQL API | Public GraphQL memory view | Expose optional `id` and `sourceEvent` on raw trace events. | Existing schema/converter owner. | Domain model. |
| `agent-team-execution/backends/claude/claude-team-run-backend-factory.ts` | Team backend | Claude team config builder | Default member memory dirs with `TeamMemberMemoryLayout`. | Existing Claude team context builder. | Codex factory pattern. |
| `agent-team-execution/services/team-run-runtime-context-support.ts` | Team restore support | Team restore config builder | Include Claude member memoryDir on restore. | Existing restore owner. | TeamMemberMemoryLayout. |
| `run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Run-history projection | Local memory provider | Runtime-neutral local memory projection from raw traces. | Generic fallback owner replaces Autobyteus-specific name. | Memory service and transformer. |
| `run-history/projection/run-projection-provider-registry.ts` | Run-history projection | Provider registry | Use local memory provider as fallback and register it for native Autobyteus. | Existing provider selection owner. | Local provider. |
| `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Run-history projection | Raw-trace transformer | Handle `reasoning` traces in addition to user/assistant/tool traces. | Existing transformation owner. | Memory trace model. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Accepted user command notification shape | `agent-run-command-observer.ts` | `agent-execution/domain` | Used by `AgentRun` and recorder without memory dependency in domain. | Yes | Yes | Public event stream contract. |
| Recording trace/snapshot operation shapes | `memory-recording-models.ts` | `agent-memory/domain` | Used by accumulator, writer, and tests. | Yes | Yes | Provider-specific payload schema. |
| Raw trace/snapshot serialization primitives | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` plus existing raw trace/snapshot/message models | `autobyteus-ts/memory` | Make the file format a single reusable owner used by native runtime storage and server recording. | Yes | Yes | Runtime memory manager reuse for Codex/Claude. |
| Segmented archive manifest and segment lifecycle | `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` + `raw-trace-archive-manager.ts` | `autobyteus-ts/memory/store` | Native compaction and provider-boundary rotation need identical segment naming, manifest, retry, and read semantics. | Yes | Yes | A kitchen-sink `RunMemoryFileStore` or server-specific archive helper. |
| Local memory projection identity resolution | `local-memory-run-view-projection-provider.ts` | Run-history projection | One place decides explicit `memoryDir` basename vs default run id. | Yes | Yes | Runtime-specific history provider logic. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Accepted user command observer payload | Yes | Yes | Low | Include `runId`, `runtimeKind`, `config`, `platformAgentRunId`, `message`, `result`, `acceptedAt`; no file paths beyond config. |
| Memory trace record | Yes | Yes | Low | Preserve native raw trace field names; add source provenance through `source_event`, not duplicated runtime metadata. |
| Working context snapshot message | Yes | Yes | Medium | Use native snapshot schema/message payload shape; tests should compare server-created snapshot with memory service parser. |
| Local projection source identity | Yes | Yes | Low after fix | Explicit `memoryDir` means local id = `basename(memoryDir)`; no use of provider platform id for local file reads. |
| Raw-trace archive manifest entry | Yes | Yes | Low | One entry represents one immutable boundary segment: boundary key/type, optional marker id, file name, ordered record span, archived timestamp, status. Do not add duplicated path fields or provider raw payload blobs. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-command-observer.ts` | Agent execution domain | Internal command observer interface | Defines `AgentRunCommandObserver` and accepted user-message payload. | Prevents memory subsystem leaking into `AgentRun`. | `AgentOperationResult`, `AgentRunConfig`. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Agent execution domain | Active run command boundary | Accept optional command observers and notify them only after `postUserMessage` returns accepted. | This is the one shared user-message command boundary. | Observer interface. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Agent execution services | Active run lifecycle | Construct `AgentRun` with memory recorder observer, attach recorder to active run, detach on unregister. | Existing sidecar lifecycle file. | `AgentRunMemoryRecorder`. |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | Agent memory domain | Internal recording model | Defines normalized operation/input types used by recorder/accumulator/writer. | Keeps storage-only recording model explicit. | Native trace/snapshot concepts. |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Native/shared memory storage | File-name constants | Owns standard memory file names used by native runtime, server recorder, and readers where applicable. | One file-name authority prevents drift. | N/A |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Native/shared memory storage | Archive manifest schema | Defines `RawTraceArchiveManifest`, segment entry/status/boundary types, schema version, and empty-manifest creation. | Archive metadata has one typed schema shared by writer and readers. | Memory file name constants. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Native/shared memory storage | Internal archive manager | Owns manifest read/write, segment filename allocation, pending/complete status transitions, segment temp-write/rename, complete segment listing, and boundary-key idempotency. | Keeps archive policy reusable and prevents `RunMemoryFileStore` from becoming a mixed-concern file. | Manifest schema and archive file-name constants. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Native/shared memory storage | Direct memory-directory facade | Owns active raw trace append/read/rewrite, snapshot payloads, native prune entrypoint, provider-boundary rotation entrypoint, and active+archive corpus reads while delegating archive internals to `RawTraceArchiveManager`. | This is the reusable low-level primitive the server imports and the authoritative boundary above archive internals. | `RawTraceItem`, `WorkingContextSnapshotSerializer`, message/tool payload classes, `RawTraceArchiveManager`. |
| `autobyteus-ts/src/memory/store/file-store.ts` | Native memory store adapter | Native `MemoryStore` implementation | Delegates shared file IO/path constants to `RunMemoryFileStore` while preserving native `MemoryStore` interface for `MemoryManager`. | Keeps native runtime code stable without duplicate file-format implementation. | `RunMemoryFileStore`. |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Agent memory persistence | Thin server adapter | Translates server recorder operations into `RunMemoryFileStore` calls; reads initial traces/snapshot for accumulator initialization. | Keeps IO dependency isolated while not owning serialization/layout. | `RunMemoryFileStore`, `RawTraceItem`, `WorkingContextSnapshot*`. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Agent memory services | Per-run state machine | Maps accepted commands and `AgentRunEvent`s into raw traces/snapshot updates; sequence, segment, tool dedupe. | Cohesive state machine and independently testable. | Recording models and writer. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | Agent memory services | Storage-only recorder service | Runtime skip, attach/detach, command observer implementation, per-run queue, accumulator cache, error logging. | Main owner for Codex/Claude memory recording. | Accumulator/writer. |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Agent memory domain | Memory API model | Add `id?: string | null` and `sourceEvent?: string | null` to `MemoryTraceEvent`. | Existing public memory model. | Raw trace schema. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Agent memory services | Memory view parser | Preserve new trace fields in view output. | Existing parser. | Domain model. |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | GraphQL API | Public GraphQL type | Add optional `id` and `sourceEvent` fields. | Existing schema type file. | Domain model. |
| `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts` | GraphQL API | Domain-to-GraphQL converter | Map new trace fields. | Existing converter. | Domain model. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts` | Team backend | Claude team context builder | Add `TeamMemberMemoryLayout` and default `memoryDir` like Codex. | Existing Claude team construction owner. | Codex pattern. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Team restore support | Restore context builder | Include Claude member memoryDir during restore. | Existing restore owner. | TeamMemberMemoryLayout. |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Run-history projection | Runtime-neutral local memory provider | Replace Autobyteus-named local provider; read explicit memoryDir by basename; build projection from raw traces. | Correct generic owner. | Memory service/transformer. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts` | Run-history projection | Provider registry | Use local memory provider as fallback and Autobyteus provider registration; keep Codex/Claude primary providers. | Existing selection owner. | Local provider. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Run-history projection | Raw trace transformer | Include reasoning trace events. | Existing transformer. | Memory trace model. |

## Ownership Boundaries

Authority changes hands at these points:

- Runtime command acceptance: `AgentRun` owns the command boundary; after backend acceptance it notifies observers. It does not know what memory is.
- Recording lifecycle: `AgentRunManager` owns when the recorder is attached and detached. It does not know memory schemas.
- Recording semantics: `AgentRunMemoryRecorder` owns whether a run is recordable and routes commands/events to accumulators. It does not parse provider-specific raw payloads.
- Mapping state: `RuntimeMemoryEventAccumulator` owns event/command interpretation into memory operations. It does not own file paths beyond the initialized writer.
- Persistence: shared `RunMemoryFileStore` owns the memory-directory facade, active raw-trace membership, snapshots, and archive-aware reads; internal `RawTraceArchiveManager` owns archive manifest/segment mechanics; server `RunMemoryWriter` adapts recorder operations to that shared store. None of these owns runtime lifecycle or event subscription.
- Native runtime: `autobyteus-ts` `MemoryManager` remains the authority for Autobyteus runtime memory.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun.postUserMessage(...)` | Backend command call and accepted-command observer notification | Stream handler, external channel facade, application orchestration, team managers | Call recorder directly from every caller that posts user messages | Add fields to accepted-command observer payload. |
| `AgentRun.subscribeToEvents(...)` | Backend event subscription | Recorder, stream handlers, lifecycle observers | Runtime adapters writing memory files directly | Add normalized `AgentRunEvent` payload fields in converters. |
| `AgentRunMemoryRecorder.attachToRun(...)` | Accumulator creation, event queue, writer initialization | `AgentRunManager` | WebSocket stream handler owning persistence | Extend recorder options/injection. |
| `RunMemoryFileStore` / server `RunMemoryWriter` adapter | Existing memory file writes and reads plus archive-aware rotation/read APIs | Accumulator, native `FileMemoryStore`, server memory readers | Accumulator using `fs.appendFileSync` directly, redefining JSON field names, or directly touching archive manifest/segment files | Add shared store operation or adapter method. |
| `RawTraceArchiveManager` | Archive manifest/segment internals below `RunMemoryFileStore` | `RunMemoryFileStore` only | Server writer, native `FileMemoryStore`, memory readers, or tests instantiating manager directly while also using `RunMemoryFileStore` | Expose the required operation on `RunMemoryFileStore` and keep manager internal. |
| `LocalMemoryRunViewProjectionProvider` | Local raw-trace memory read and transformer invocation | Run projection registry/service | Codex/Claude history providers reading local memory fallback | Add provider option or transformer support. |

## Dependency Rules

- `agent-execution/domain` may define command observer interfaces but must not import `agent-memory`.
- `agent-execution/services/agent-run-manager.ts` may depend on `AgentRunMemoryRecorder` as an active-run sidecar, like existing file-change/artifact sidecars.
- Codex/Claude runtime adapters may emit normalized events but must not write memory files.
- `agent-memory` may depend on agent execution domain types (`AgentRun`, `AgentRunEvent`, `AgentRunConfig`) to record active runs.
- `agent-memory` writer must use reusable `autobyteus-ts` memory file-format/store primitives for raw traces and snapshots, but must not instantiate `MemoryManager` for Codex/Claude.
- `RawTraceArchiveManager` is internal to `autobyteus-ts/src/memory/store`; code outside `RunMemoryFileStore` must not import or instantiate it except tightly scoped unit tests for that manager.
- `run-history/projection` may depend on `AgentMemoryService` and memory file stores to build fallback projection, but runtime-specific providers must not become local memory readers.
- GraphQL/API layers must read from `AgentMemoryService`; they must not perform file IO directly beyond existing service construction.

Forbidden shortcuts:

- No `CodexMemoryManager` or `ClaudeMemoryManager` class.
- No recorder attachment from WebSocket stream handlers.
- No per-runtime duplicate file writer implementations.
- No independent server-side redefinition of raw trace JSON keys, snapshot schema, or memory file names when those can be imported from the shared memory kit.
- No direct reads/writes of `raw_traces_archive/` or `raw_traces_archive_manifest.json` outside `RawTraceArchiveManager`; callers must go through `RunMemoryFileStore` facade methods.
- No embedding manifest/segment lifecycle policy in provider converters, recorder services, `RunMemoryWriter`, native `FileMemoryStore`, or memory-view readers.
- No memory injection/retrieval/compaction path for Codex/Claude in this change.
- No local raw-trace deletion, trace-content rewriting, or semantic compaction triggered by Codex/Claude provider-internal compact-boundary/status events. Archive-preserving active-file rotation is allowed and required for those boundaries.
- No archive compression or working-context snapshot windowing in this scope; active-file rotation must preserve full trace analyzability through active `raw_traces.jsonl` plus segmented archive files and update archive-aware readers.
- No duplicate server recording for `RuntimeKind.AUTOBYTEUS`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunCommandObserver.onUserMessageAccepted(payload)` | Accepted user-message command | Notify internal observers of accepted commands. | `{ runId, runtimeKind, config, platformAgentRunId, message, result, acceptedAt }` | Internal only; not public event stream. |
| `AgentRunMemoryRecorder.attachToRun(run)` | Active run recording lifecycle | Start event recording for recordable run and return unsubscribe. | `AgentRun` with `runId`, `runtimeKind`, `config.memoryDir`. | No-op unsubscribe for native/missing memoryDir. |
| `AgentRunMemoryRecorder.onUserMessageAccepted(payload)` | Accepted user-message recording | Enqueue user trace/snapshot write. | Command observer payload. | Must not block/fail command response. |
| `RuntimeMemoryEventAccumulator.recordAcceptedUserMessage(...)` | User command mapping | Convert accepted user message to memory writes. | Command payload with resolved turn id. | Uses `result.turnId` first. |
| `RuntimeMemoryEventAccumulator.recordRunEvent(event)` | Runtime event mapping | Convert normalized runtime events to memory writes. | `AgentRunEvent`. | Consumes common payload fields only; handles provider compaction status as marker plus rotation trigger, not semantic compaction. |
| `RunMemoryFileStore.appendRawTrace(item)` | Raw trace persistence | Append one raw trace using shared native-compatible serialization. | `RawTraceItem` or equivalent shared raw-trace options. | Lives in `autobyteus-ts`; server adapter delegates to it. |
| `RunMemoryFileStore.writeWorkingContextSnapshot(payload)` | Snapshot persistence | Persist snapshot-compatible messages. | Shared snapshot payload from `WorkingContextSnapshotSerializer`. | Lives in `autobyteus-ts`; server adapter delegates to it. |
| `RunMemoryFileStore.rotateRawTracesBeforeBoundary(boundary)` | Raw trace active-file rotation facade | Read active records, compute move/keep sets, ask `RawTraceArchiveManager` to create/reuse a segment, then atomically rewrite active membership. | `{ boundaryTraceId, boundaryKey, boundaryType, runtimeKind?, sourceEvent? }` derived from an already-written marker or native compaction selection. | Public storage boundary; callers do not touch archive manifest/dir directly. |
| `RunMemoryFileStore.readCompleteRawTraceCorpusDicts(limit?)` | Complete raw-trace corpus read | Read completed archive segments plus active records, dedupe by id, and return deterministic history. | Concrete `memoryDir`, optional limit. | Memory views/projections use this instead of active-only reads when full history is required. |
| `RawTraceArchiveManager.createSegmentIfAbsent(boundary, records)` | Archive segment internals | Allocate segment filename/index, write pending manifest, write segment, mark complete, and return complete entry idempotently for a boundary key. | Boundary metadata plus ordered full raw trace records. | Internal to `RunMemoryFileStore`; not imported by server recorder/readers. |
| `RawTraceArchiveManager.readCompleteSegments()` | Archive segment internals | Return complete manifest entries/records in manifest order, ignoring pending entries. | Concrete archive dir/manifest path owned by manager constructor. | Internal to `RunMemoryFileStore` complete-corpus reads. |
| `RunMemoryWriter.appendRawTrace(input)` | Server adapter | Convert recorder operation to shared raw trace item. | `{ traceType, turnId, seq, content, sourceEvent, media, tool... }` | No independent JSON schema; adapter only. |
| `RunMemoryWriter.rotateActiveRawTracesBeforeBoundary(boundary)` | Server adapter | Delegate active raw-trace rotation to shared store after a `provider_compaction_boundary` marker is written. | Boundary trace id/timestamp plus keep policy. | Archive complete records; do not delete, summarize, or rewrite trace content. |
| `LocalMemoryRunViewProjectionProvider.buildProjection(input)` | Local memory projection | Read local raw traces and produce projection. | `RunProjectionProviderInput.source.memoryDir` or default run id. | Explicit memoryDir identity is basename. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunCommandObserver` | Yes | Yes | Low | Keep it command-only; do not add event subscription. |
| `AgentRunMemoryRecorder.attachToRun` | Yes | Yes | Low | Requires full `AgentRun`, not only run id. |
| `RuntimeMemoryEventAccumulator` methods | Yes | Yes | Medium | Separate command vs event methods; do not accept raw provider events. |
| `RunMemoryFileStore` methods | Yes | Yes | Low | Initialize with concrete `memoryDir`; no baseDir/agentRootSubdir ambiguity; expose archive-aware reads/rotation so callers never bypass to archive internals. |
| `RawTraceArchiveManager` methods | Yes | Yes | Low | Initialize below one run directory/archive directory; accept explicit boundary identity; internal to `RunMemoryFileStore`. |
| `RunMemoryWriter` adapter methods | Yes | Yes | Low | Initialize with concrete `memoryDir` and local agent/run id; delegate format and rotation to shared store. |
| `LocalMemoryRunViewProjectionProvider` | Yes | Yes after fix | Low | Explicit memoryDir -> basename; default memory root -> source.runId. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Storage-only cross-runtime recorder | `AgentRunMemoryRecorder` | Yes | Low | Avoid `MemoryManager` wording. |
| Shared low-level storage facade | `RunMemoryFileStore` | Yes | Low | Put in `autobyteus-ts`; direct memory-dir API; keep it as facade over archive internals rather than a catch-all. |
| Shared archive internals owner | `RawTraceArchiveManager` | Yes | Low | Put in `autobyteus-ts/src/memory/store`; name by concrete archive segment/manifest concern. |
| Server storage adapter | `RunMemoryWriter` | Yes | Low | Keep thin; document that it delegates shared file writes and rotation only. |
| Event state mapper | `RuntimeMemoryEventAccumulator` | Yes | Medium | Keep it per-run and storage-only; not a runtime adapter. |
| Local projection fallback | `LocalMemoryRunViewProjectionProvider` | Yes | Low | Replace Autobyteus-specific provider name. |
| Native runtime memory manager | Existing `MemoryManager` | Yes | Low | Leave in native runtime package. |

## Applied Patterns (If Any)

- Sidecar attachment pattern: `AgentRunManager` already attaches sidecar services to active runs. The recorder follows that existing local pattern.
- Observer seam pattern: `AgentRun` gains an internal command observer seam so off-spine concerns can observe accepted commands without changing public stream events.
- Accumulator/state-machine pattern: `RuntimeMemoryEventAccumulator` handles ordered per-run mapping, segment assembly, and tool de-duplication before persistence.
- Provider fallback pattern: run-history projection keeps runtime-specific primary providers and uses a generic local fallback when the primary provider cannot produce a usable projection.
- Internal manager pattern: `RawTraceArchiveManager` owns archive manifest/segment lifecycle below the public `RunMemoryFileStore` boundary; it is not a service locator or separate caller-facing repository.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-command-observer.ts` | File | Agent execution domain | Internal accepted-command observer contract. | Close to `AgentRun`; avoids dependency inversion leak. | Memory writer code. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | Agent run facade | Command observer notification after accepted user message. | Existing command boundary. | File persistence. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | File | Codex event contract | Add `THREAD_COMPACTED = "thread/compacted"` or equivalent known app-server compaction notification. | Codex provider event names belong here. | Recorder storage logic. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts` / raw response converter | Files | Codex event conversion | Convert `thread/compacted` and raw `type=compaction` items to `AgentRunEventType.COMPACTION_STATUS`, deduping if both surfaces report the same boundary. | Provider-specific parsing stays in Codex converter. | File IO or trace rotation. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-name.ts` and Claude session/converter files | Files | Claude event conversion | Convert SDK `compact_boundary` and status `compacting` into `AgentRunEventType.COMPACTION_STATUS`; rotate only on safe boundary event. | Provider-specific SDK parsing stays in Claude adapter. | File IO or trace rotation. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | File | Active run lifecycle | Recorder injection and sidecar lifecycle. | Existing sidecar owner. | Event-to-trace mapping. |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` | File | Agent memory domain | Internal recording input/operation types. | Shared by recorder/writer/tests. | Provider raw event types. |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | File | Shared memory storage | File-name constants for active raw traces, archive segment directory, archive manifest, and snapshot/memory files. | Shared package owns shared file names. | Runtime behavior. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | File | Shared archive schema | Manifest/segment entry types, boundary/status unions, schema version, and empty-manifest creation. | Archive metadata has one reusable owner. | File IO, runtime events. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | File | Shared archive internals | Segment naming, manifest pending/complete writes, segment temp-write/rename, idempotent boundary handling, complete-segment reads. | This is the concrete reusable archive manager required by native and provider-boundary rotation. | Active raw-trace append, snapshot writes, runtime event parsing, semantic compaction. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | File | Shared memory-directory facade | Active raw-trace append/read/rewrite, snapshot operations, full-corpus reads, native prune/provider boundary rotation entrypoints; delegates archive internals to `RawTraceArchiveManager`. | Shared package owns common file layout/serialization while preserving the archive manager as a separate owned concern. | Runtime memory management, event mapping, embedded manifest lifecycle policy. |
| `autobyteus-ts/src/memory/store/file-store.ts` | File | Native memory store adapter | Delegate shared file/path work to `RunMemoryFileStore` while preserving `MemoryStore` contract. | Native runtime still needs `MemoryStore`. | Independent duplicate file-format logic or direct `RawTraceArchiveManager` use. |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | File | Memory persistence adapter | Server-only adapter over `RunMemoryFileStore`, including marker write plus rotation boundary delegation. | Server `store` folder isolates external shared-store dependency. | Runtime event subscriptions; JSON schema definitions. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | File | Agent memory service | Attach/detach, runtime skip, command observer, queue/errors. | `services` owns behavior over store/domain. | Provider-specific raw parsing; memory management. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | File | Agent memory service | Per-run mapping state, de-duplication, compaction marker handling, and rotation trigger selection. | Behavior-level state machine. | File path layout. |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | File | Public memory domain | Add optional raw trace provenance fields. | Existing model. | Recording state machine. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | File | Memory reader service | Parse and expose new trace fields; read active plus complete archive segments when archive is included. | Existing parser. | Writer logic. |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | File | GraphQL API | Add optional fields for trace provenance. | Existing GraphQL type owner. | Domain parsing. |
| `autobyteus-server-ts/src/api/graphql/converters/memory-view-converter.ts` | File | GraphQL API | Map optional provenance fields. | Existing converter owner. | File IO. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts` | File | Claude team backend | Default member memory dirs. | Existing Claude config construction. | Recording logic. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | File | Team restore support | Restore Claude member memory dirs. | Existing restore construction. | Recorder logic. |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | File | Run-history projection | Generic local memory fallback. | Correct projection subsystem owner. | Runtime-specific history access. |
| `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | File | Decommissioned | Remove/replace import usages. | Old name is misleading after generic local fallback. | Compatibility wrapper. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-provider-registry.ts` | File | Provider registry | Wire local fallback and runtime-specific providers. | Existing provider selection. | Projection building details. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | File | Projection transformer | Add reasoning trace handling. | Existing transformer. | Provider selection. |
| `autobyteus-server-ts/tests/unit/agent-memory/agent-run-memory-recorder.test.ts` | File | Unit tests | Recorder skip/attach/command/event routing behavior. | Test recorder owner. | Live runtime dependency. |
| `autobyteus-server-ts/tests/unit/agent-memory/run-memory-writer.test.ts` | File | Unit tests | Writer output file shape and snapshot compatibility. | Test writer owner. | Runtime adapter behavior. |
| `autobyteus-server-ts/tests/integration/agent-execution/cross-runtime-memory-persistence.integration.test.ts` | File | Integration tests | Fake Codex/Claude backend events create memory files without WebSocket. | End-to-end recording proof. | Live provider dependency. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Contains command boundary abstractions only. |
| `agent-execution/services` | Main-Line Domain-Control / lifecycle sidecars | Yes | Low | Manager already owns active-run sidecar wiring. |
| `agent-memory/domain` | Domain model | Yes | Low | Shared memory recording/read models. |
| `autobyteus-ts/src/memory/store` | Persistence-Provider / Shared file-format and archive owner | Yes | Low | Owns the reusable memory file kit, explicit raw-trace archive manager, and native store adapter. |
| `agent-memory/store` | Persistence-Provider adapter | Yes | Low | Server adapter delegates to shared file kit; server does not own file schema. |
| `agent-memory/services` | Off-Spine Concern / service behavior | Yes | Medium | Recorder and accumulator are both services but have clear lifecycle vs mapping split. |
| `agent-team-execution/backends/claude` | Main-Line Domain-Control for Claude team config | Yes | Low | Only fixes config provisioning. |
| `run-history/projection/providers` | Persistence/Projection provider | Yes | Low | Local memory provider is a projection source, not a runtime adapter. |
| `api/graphql` | Transport | Yes | Low | Only exposes parsed memory view fields. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Storage-only recorder naming | `AgentRunMemoryRecorder` records Codex/Claude events to files and never injects memory into the runtime. | `CodexMemoryManager` with retrieval/compaction hooks. | The server stores external runtime history; it does not manage external runtime memory. |
| Shared file-format reuse | `RunMemoryWriter` converts to `RawTraceItem` and calls `RunMemoryFileStore.appendRawTrace(...)`. | Server manually builds `{ trace_type, turn_id, source_event }` JSON with hard-coded file names. | The memory format has one owner and future schema changes do not fork. |
| User command capture | `AgentRun.postUserMessage` notifies observers after `accepted: true`. | Every caller manually writes a user trace before calling the backend. | Avoids duplicated call-site logic and records only accepted commands. |
| Event capture | Recorder consumes `AgentRunEventType.TOOL_EXECUTION_STARTED` with `payload.tool_name`, `payload.invocation_id`, `payload.arguments`. | Recorder parses raw Codex app-server messages or Claude SDK messages. | Provider parsing already belongs in runtime converters. |
| External runtime compaction | Capture Codex `thread/compacted` / `type=compaction` and Claude compact boundaries as `provider_compaction_boundary` markers and active raw-trace rotation boundaries. | Treat these provider events/items as permission to delete traces, rewrite trace content, or claim semantic compaction occurred. | External runtime signals do not contain local raw trace ids or compacted semantic/episodic output. |
| Long-run raw trace growth | Rotate settled active records to manifest-indexed archive segment files on provider/native boundaries and keep active+segments as complete history. | Create per-boundary archive files without a manifest/reader policy, smuggle deletion/summarization into the recorder, or make readers active-only. | Segments make each boundary inspectable while preserving analyzability. |
| Archive ownership | `RunMemoryFileStore.rotate...` calls internal `RawTraceArchiveManager.createSegmentIfAbsent(...)`, then rewrites active records. | Codex converter or `RuntimeMemoryEventAccumulator` writes `raw_traces_archive_manifest.json` directly, or `RunMemoryFileStore` embeds all manifest lifecycle code as a growing catch-all. | Clear ownership prevents provider-specific patches and keeps the archive policy reusable. |
| Local memory projection identity | Explicit memory dir `/memory/agents/run-123` is read with local id `run-123`. | Reading `/memory/agents/<codex-thread-id>` because `platformRunId` exists. | Platform ids are not local memory directory names. |
| Native runtime separation | Server recorder no-ops for `RuntimeKind.AUTOBYTEUS`; native `MemoryManager` writes files. | Both native `MemoryManager` and server recorder write `assistant` traces for the same run. | Prevents doubled memory and preserves native runtime ownership. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Autobyteus-named projection provider and add special external-runtime branches | Smaller diff. | Rejected | Replace with `LocalMemoryRunViewProjectionProvider` and update registry imports. |
| Add public `USER_MESSAGE` `AgentRunEvent` and teach stream clients to ignore/deduplicate it | Could make user capture event-based. | Rejected | Use internal accepted-command observer; no public stream contract change. |
| Add `CodexMemoryManager` and `ClaudeMemoryManager` wrappers | Superficially mirrors native runtime. | Rejected | Use one storage-only `AgentRunMemoryRecorder`; no external runtime memory management. |
| Let server `RunMemoryWriter` define raw JSON keys/file names independently | Quickest way to write files. | Rejected | Extract/import `autobyteus-ts` direct memory-directory store and file-name/schema primitives. |
| Keep Claude team missing `memoryDir` and let recorder skip missing dirs | Avoids team backend change. | Rejected | Fix Claude member config/restore parity so recording works. |
| Use provider-specific run-history as durable memory source | Already exists for Codex/Claude. | Rejected | Persist normalized local memory files; provider history remains primary projection only. |
| Treat provider compact-boundary/status as native local semantic compaction | Could reduce active raw-trace size if provider says it compacted context. | Rejected | Provider boundaries create `provider_compaction_boundary` markers and archive segments only; semantic/episodic compaction remains provider-owned or future analyzer-owned. |
| Keep writing monolithic `raw_traces_archive.jsonl` while also adding segment files | Might ease migration from current native pruning path. | Rejected | Clean-cut replacement: native compaction and provider-boundary rotation write manifest-indexed segment files; full-history readers use active plus completed segments. |
| Put all segment/manifest lifecycle code directly in `RunMemoryFileStore` | Smaller file count and less initial refactor. | Rejected | Extract `RawTraceArchiveManager`; `RunMemoryFileStore` remains the authoritative facade and active-file coordinator, not the archive internals owner. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

Layering after this change:

1. Runtime adapters convert provider-specific data to `AgentRunEvent` and command results.
2. Shared `autobyteus-ts` memory file kit owns raw trace/snapshot serialization, memory file names, `RunMemoryFileStore`, and internal `RawTraceArchiveManager`.
3. Agent execution domain exposes runtime-neutral active-run command/event boundaries.
4. Agent memory recorder projects runtime-neutral commands/events into durable memory files through the shared memory file kit.
5. Agent memory readers/indexers expose stored files.
6. Run-history projection can use provider-specific primary sources or local memory fallback.
7. Future background/cron agents can analyze memory files and metadata without knowing provider-specific runtime logs.

This keeps runtime adapters, storage-only recording, public memory APIs, and future analyzers as separate owners.

## Migration / Refactor Sequence

1. Add `AgentRunCommandObserver` interface in `agent-execution/domain`.
2. Update `AgentRun` to accept command observers and notify them after accepted `postUserMessage` results.
3. Add shared low-level memory file primitives in `autobyteus-ts`:
   - `memory-file-names.ts` for common file names, including archive manifest/dir constants.
   - `raw-trace-archive-manifest.ts` for archive manifest and segment entry types.
   - `raw-trace-archive-manager.ts` for manifest-indexed segment lifecycle, pending/complete commits, idempotent boundary handling, and segment reads.
   - `run-memory-file-store.ts` for direct-memory-directory active raw trace and snapshot read/write, plus facade methods that delegate archive internals to `RawTraceArchiveManager`.
   - refactor native `FileMemoryStore` to delegate common file/path operations to the shared store instead of duplicating them or touching archive internals directly.
4. Add thin server `RunMemoryWriter` adapter and recording model types under `agent-memory`; the adapter delegates serialization/layout and rotation to `RunMemoryFileStore`.
5. Add provider compaction-boundary conversion:
   - Codex: `thread/compacted` plus raw `type=compaction` item normalization/deduplication.
   - Claude: SDK `compact_boundary` and `status: compacting` normalization, rotating only on safe boundary.
6. Add segmented raw-trace archive support through the shared archive owner: `RawTraceArchiveManager` owns archive directory/manifest/segment filename/idempotency/segment reads; `RunMemoryFileStore` owns active rewrite and exposes rotation/full-corpus methods; `RunMemoryWriter` only delegates. If archive lifecycle code has been embedded in `RunMemoryFileStore`, refactor it out before implementation review.
7. Add `RuntimeMemoryEventAccumulator` with unit tests for:
   - accepted user trace/snapshot
   - text segment assembly/finalization
   - reasoning trace handling
   - tool call/result/denial de-duplication
   - compaction marker recording and segmented rotation trigger behavior
   - sequence initialization from existing active and archived traces
8. Add `AgentRunMemoryRecorder` with runtime skip and attach/detach tests.
9. Wire recorder into `AgentRunManager` as an injectable sidecar and ensure native Autobyteus is skipped.
10. Fix Claude team member `memoryDir` provisioning in create and restore paths.
11. Extend memory view domain/service/GraphQL fields for raw trace `id` and `sourceEvent`.
12. Replace Autobyteus-named local projection provider with `LocalMemoryRunViewProjectionProvider` and update registry.
13. Extend raw-trace projection transformer for `reasoning` traces and ensure archive-segment-aware projection remains complete after rotation.
14. Add integration tests using fake Codex/Claude backends/events to prove memory files are written and rotated without WebSocket attachment.
15. Add projection fallback test where `source.memoryDir` basename differs from `platformAgentRunId`.
16. Run targeted `autobyteus-ts` build/typecheck plus server typecheck/tests.

No temporary compatibility wrappers should remain after step 11, and no monolithic `raw_traces_archive.jsonl` writer or direct archive-manifest bypass should remain after step 6.

## Key Tradeoffs

- Storage-only recorder vs full memory manager: recorder is narrower and correct for Codex/Claude because their runtimes own internal memory/session behavior. This limits scope and prevents accidental memory injection semantics.
- Capturing provider compaction vs treating it as local semantic compaction: capture is useful because Codex and Claude can expose real provider compaction boundaries; local semantic mutation is unsafe because native compaction has local trace ids and generated memory outputs, while provider signals/items do not. Use append-only marker recording or non-destructive active-file rotation rather than coupling provider context compaction to server memory deletion.
- Active raw-trace rotation vs semantic compaction: rotation reduces active file size for long external-runtime runs, but it does not reduce total retained trace storage or create semantic/episodic memory. It must remain an archive-preserving storage operation with reader support, not Codex/Claude memory management.
- Extracting a reusable `autobyteus-ts` memory file kit vs writing server JSON directly: shared primitives slightly expand the implementation scope but prevent format drift. The server already depends on `autobyteus-ts`, so this is acceptable; do not import or instantiate `MemoryManager`.
- Internal command observer vs public user-message event: internal observer avoids client-facing stream changes and duplicate UI display, but requires a new domain seam.
- Generic local memory provider rename vs minimal patch: rename is cleaner because fallback is now runtime-neutral. It costs import/test updates but avoids misleading ownership.
- Best-effort recorder error isolation vs command hard failure: runtime commands should not fail because disk recording failed. Tests and logs should catch persistence issues; production should avoid crashing external runtime progress.

## Risks

- Codex/Claude event payloads may omit turn ids on some tool events. Accumulator must use active turn state and deterministic fallbacks.
- Segment finalization may vary by runtime version. Accumulator should flush pending text/reasoning on `SEGMENT_END` and `TURN_COMPLETED` to avoid losing content.
- Extracting `autobyteus-ts` storage primitives may require touching native `FileMemoryStore` carefully so native memory behavior remains unchanged while common file/path logic is not duplicated. The package currently has wildcard exports, so server imports are expected to work.
- The archive refactor can regress into a god-object if manifest/segment lifecycle stays embedded in `RunMemoryFileStore`; implementation review should verify that `RawTraceArchiveManager` owns that policy and `RunMemoryFileStore` remains the facade/active-file coordinator.
- Snapshot message ordering around tool calls/results may differ from native Autobyteus because external runtimes expose different event streams. Preserve chronological event order and do not invent provider behavior.
- Disk growth can increase when reasoning traces are recorded. Segmented archives improve boundary inspectability and active-file size, but they do not reduce total retained raw trace storage; compression/retention can be handled by future analyzer/compaction work.
- Existing historical Codex/Claude runs remain without memory files unless a future backfill/import task is created.

## Guidance For Implementation

- Treat Codex/Claude recording as a projection journal, not runtime memory.
- Do not import or instantiate native `MemoryManager` in server recorder code.
- Extract/import a reusable `autobyteus-ts` direct-memory-directory store for raw traces and snapshots; keep the server `RunMemoryWriter` as a thin adapter over it.
- Implement archive segmentation in `RawTraceArchiveManager`; expose only facade methods on `RunMemoryFileStore` to server/native callers.
- Do not hard-code raw trace JSON keys, snapshot schema fields, or memory file names independently in server recorder code.
- The recorder should skip when `run.runtimeKind === RuntimeKind.AUTOBYTEUS`.
- The recorder should warn and no-op when `run.config.memoryDir` is missing; fixing Claude team memory dirs should make this uncommon for supported paths.
- `AgentRun.postUserMessage` should notify observers only when `result.accepted === true`. Observer failures must be isolated from the command result.
- Per-run writes should be serialized through a promise queue to preserve event order.
- Initialize sequence state from existing `raw_traces.jsonl` and manifest-indexed raw-trace archive segments if a run is restored.
- Use `result.turnId` for accepted user messages when available; otherwise use active turn id or a deterministic local fallback.
- Write one `tool_call` per invocation id and one terminal `tool_result` for success/failure/denial. If approval and execution-start both appear, dedupe by invocation id.
- For assistant text, accumulate deltas by segment id and flush on `SEGMENT_END`; also flush any pending segments on `TURN_COMPLETED`.
- For reasoning, write a normalized `reasoning` raw trace and attach it to assistant snapshot reasoning when it clearly belongs to the same assistant turn/segment.
- Keep tests provider-independent by using fake backends and hand-authored normalized `AgentRunEvent`s.
