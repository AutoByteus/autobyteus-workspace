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
- Imported Memory Sync sources: `memory/imports/<sourceNodeId>/agents/...` and
  `memory/imports/<sourceNodeId>/agent_teams/...`, with source metadata in
  `source-node.json` and sync state in `sync-manifest.json`.

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

- `raw_traces_active.jsonl` — active ordered raw trace records.
- `working_context_snapshot.json` — schema-v4 persisted `WorkingContext` messages. New writes contain only schema version, agent id, and messages; existing v4 supersets remain directly readable.
- `raw_traces_manifest.json` — rotated raw-trace manifest owned internally by `RawTraceArchiveManager`.
- `raw_traces_<zero-padded-index>.jsonl` — immutable rotated raw-trace segment files in the same run memory directory, one complete segment per native compaction or provider-boundary rotation.
- `episodic.jsonl`, `semantic.jsonl`, `compacted_memory_manifest.json` — native AutoByteus compacted memory artifacts when native semantic/episodic compaction has run.

Startup app-data migration `20260707_raw_trace_active_file_name` renames existing active `raw_traces.jsonl` files to `raw_traces_active.jsonl` for local and imported memory corpora. Runtime steady state reads and writes only `raw_traces_active.jsonl`; the old active filename is not a compatibility alias.

The old monolithic `raw_traces_archive.jsonl` file is no longer an active read/write target. Historical monolithic archive files are intentionally not read by the approved no-compatibility policy.

Memory Sync does not move or wrap local runtime memory. `memory/agents` and
`memory/agent_teams` remain the active local runtime roots. Imported Memory Sync
content is an explicit read-only corpus under `memory/imports/<sourceNodeId>` and
must not be treated as runnable local run history, restore state, or a fallback
runtime memory provider.

## Runtime Ownership

Native AutoByteus runs remain owned by the `autobyteus-ts` `MemoryManager`. The server-side recorder must skip `RuntimeKind.AUTOBYTEUS` so native traces, snapshots, archives, and compacted memory are not duplicated. Native AutoByteus compaction is a pluggable context-to-context boundary: the executor resolves the process-global strategy for each pending operation, validates its returned detached `WorkingContext`, and only then asks `MemoryManager` to replace/persist it. The current `structured-json` strategy preserves semantic/episodic writes and rotates selected raw traces through shared direct segments with `boundary_type = "native_compaction"`.

### Global Compaction Strategy Setting

`AUTOBYTEUS_COMPACTION_STRATEGY` selects the strategy for subsequent native compaction operations. Blank values normalize to `structured-json`, the only production registration. `ServerSettingsService` validates updates against registry metadata and persists them through the normal `.env` plus current-process environment path, so already-created native agents resolve the new value on their next compaction. This is process-local convergence; no cross-process broadcast or provider-session reconciliation is added.

GraphQL keeps option discovery and effective selection separate:

- `getWorkingContextCompactionStrategies` projects only registry `{ id, name }` metadata;
- `getEffectiveWorkingContextCompactionStrategyId` applies the same normalizer as runtime, so absent/blank selects `structured-json` while an explicit unknown ID stays explicit for truthful recovery UI.

Settings -> Server Settings -> Basics uses these reads for a registry-backed Compaction strategy selector. The card keeps the trigger ratio, effective-context override, and detailed-log controls, persists only changed valid fields through the existing per-key mutation, and stops after the first failed write while retaining failed and unsent drafts for retry. Catalog/effective-read errors and unknown IDs are shown without guessing or silently writing a default.

The `structured-json` strategy always invokes the built-in `autobyteus-memory-compactor`; blank launch fields inherit the parent run's runtime/model. `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is no longer a predefined setting or runtime selection path. A stale custom value is inert, and a missing/invalid built-in definition fails without arbitrary-agent fallback.

Compaction status metadata includes stable `compaction_strategy_id` and `compaction_strategy_name` in addition to operation/turn and current runner diagnostics. A resolver, strategy, validation, or replacement failure preserves the pending request and does not emit a false completed state.

Codex and Claude runs are recorded by the server as **storage-only** memory:

1. `AgentRunManager` attaches `AgentRunMemoryRecorder` as an active-run sidecar when the run has a `memoryDir` and the runtime is not native AutoByteus.
2. Accepted user messages are observed only after `AgentRun.postUserMessage(...)` returns `accepted: true`.
3. Assistant text, reasoning, tool lifecycle outcomes, and normalized provider compaction-boundary payloads are captured from normalized `AgentRunEvent`s.
4. `RunMemoryWriter` writes shared `RawTraceItem` records and updates `WorkingContext` messages through `RunMemoryFileStore`.

Tool execution uses a strict split physical contract shared with native memory:

- a call row owns non-empty `turn_id`, `tool_call_id`, and `tool_name` plus an
  explicit `tool_args` object;
- a separate result row owns the same `turn_id` and `tool_call_id` plus
  physically present `tool_result` and `tool_error` keys, including explicit
  `null` values;
- new result rows never repeat `tool_name` or `tool_args`, and a call is never
  rewritten into a combined terminal row.

`RuntimeMemoryEventAccumulator` remains the normalized event/segment facade:
it owns turn context, reasoning/assistant segment buffering and flushing, and
provider-compaction delegation. Its internal provider-agnostic
`RuntimeToolTraceSequencer` owns the cohesive tool lifecycle state machine:
compound identity, card observation, authoritative-argument readiness, strict
call/result writes, physical hydration, interruption, cleanup, and duplicate
suppression. The sequencer may request a reasoning boundary through one
`flushReasoningBoundary(turnId, sourceEvent)` callback, but it cannot inspect
segment maps; the facade cannot inspect or mutate sequencer tool state.

The sequencer persists a call at the first approval/start/terminal event that
has valid identity, name, and authoritative arguments.
Provider converters own the difference between an absent argument field (“not
yet available”) and an explicit `{}` (a valid no-argument call); memory must not
parse provider-native payloads or branch on tool names. If a terminal event is
the first event with authoritative arguments, the sequencer appends the call
first and then the minimal result. Missing arguments defer physical writes;
missing identity/name that cannot create a card and ambiguous reused call ids
are skipped and logged instead of receiving fabricated state. Sequencer record
methods accept the facade's current active turn and return
only a resolved turn id when correlation establishes one; general turn/fallback
ownership remains in the accumulator.

The first normalized card-capable lifecycle observation establishes the ordered
tool-card boundary and flushes preceding reasoning, even when the physical call
must wait for authoritative arguments. This includes an unseen terminal with a
resolvable compound identity and non-empty normalized tool name: generic UI
consumers synthesize its card even if arguments are absent, so memory must mark
it observed and flush before returning for insufficient readiness. A matching
terminal may later persist the deferred call and result without flushing
reasoning written after that card. An already-observed still-insufficient
terminal preserves the boundary; a malformed terminal without usable
identity/name creates no card and neither observes nor flushes. An unseen fully
ready terminal flushes before its inferred call. This classification uses
generic normalized call-observed and physical-lifecycle state; memory does not
import or reconstruct Codex raw-event policy.

Physical lifecycle state is keyed by `(turn_id, tool_call_id)`, hydrated from
complete rotated segments plus active rows when a recorder is reconstructed,
and records call-written and result-written independently. This permits an
archived call and active result to remain one lifecycle while keeping native
active-file compaction eligibility and pruning active-only.

Call observation is process-local ordering state, not a third persisted tool
record. If a deferred observation is abandoned, interrupted without
authoritative arguments, or lost to hard process failure before the call is
written, no raw tool row is fabricated and the transient observation cannot be
hydrated. A crash after call append but before result append leaves an honest
unmatched call; reconstruction hydrates that physical call as observed and a
later matching terminal may append only the result. Historical result-side
argument overlays remain read-only and never reconstruct current writer state.

The recorder does not instantiate a Codex/Claude memory manager, retrieve memory for those runtimes, inject recorded memory into prompts, or alter provider/runtime session state. Memory persistence is independent of websocket clients; the sidecar is attached by the run manager, not by live stream subscribers.

Route-backed Agent Tools MCP calls from Codex App Server and Claude Agent SDK
are recorded only after the runtime adapter normalizes them into canonical
`AgentRunEvent` tool lifecycles. The MCP route, method dispatcher, executor,
and family services/dispatchers must not write raw traces directly. Raw traces
use canonical tool names such as `send_message_to`, `generate_image`,
`delegate_task`, and `publish_artifacts`, preserve the provider invocation id
as the tool-call id, and store the normalized application-facing result payload
without provider/server-qualified tool names, MCP session ids, or bearer/header
descriptor details. For source-confirmed MCP terminal results, the stored
result/error follows the same application-facing effective-result projection
used by live Activity: non-null `structuredContent`, parsed single JSON text,
plain text, joined multi-text, sanitized rich `{ items: [...] }`, empty `null`,
or failed tool error for MCP `isError: true`. Raw MCP protocol envelope fields
such as `content`, `structuredContent`, `_meta`, and `isError` are not stored as
normal successful tool results. Non-MCP or source-unknown envelope-shaped values
remain unchanged because the projector is only invoked after converter-level MCP
source evidence.

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

### Local And Imported Source Resolution

`MemoryExplorerSourceService` owns the Memory UI source boundary. Missing or
null source input resolves to local memory. Imported source input validates the
`sourceNodeId`, verifies that `memory/imports/<sourceNodeId>` exists, and roots
all agent/team explorer and view readers under that import root.

Imported source reads are marked read-only. The backend must not silently fall
back to local memory for an unknown imported source id; returning an error keeps
local and imported corpora separated.

### Explorer GraphQL Queries

The explorer GraphQL surface is:

- `listMemoryExplorerSources()`
- `listAgentsWithMemory(source, search, page, pageSize)`
- `listAgentRunsWithMemory(selector, source, search, page, pageSize)`
- `listAgentTeamsWithMemory(source, search, page, pageSize)`
- `listAgentTeamRunsWithMemory(teamDefinitionId, source, search, page, pageSize)`

All list queries return a `MemoryExplorerPage` shape with `entries`, `total`, `page`, `pageSize`, and `totalPages`. Search is applied within the active surface: agent/team cards on home, selected-agent runs on agent detail, or selected-team runs/member targets on team detail.

The `source` argument is a `MemoryExplorerSourceInput`:

- `{ type: LOCAL }` reads `memory/agents` and `memory/agent_teams`.
- `{ type: IMPORTED, sourceNodeId }` reads the selected
  `memory/imports/<sourceNodeId>` corpus.

The older flat snapshot queries (`listRunMemorySnapshots` and `listTeamRunMemorySnapshots`) were replaced by these explorer queries for the Memory UI.

## Trace Shape And GraphQL View

Raw traces preserve provenance needed by future analyzers:

- `id`
- `turn_id` / GraphQL `turnId`
- `seq`
- `trace_type` / GraphQL `traceType`, including `provider_compaction_boundary` markers
- `source_event` / GraphQL `sourceEvent`
- `content`, `media`, tool identity, tool args/result/error, correlation id, and timestamp fields when present

The inspector exposes physical rows. For current writes, call-side name/args
appear only on `tool_call`, while result/error appear only on `tool_result`.
Working Context may retain a tool name on its provider-protocol result message;
that separate projection does not change the raw result shape.

GraphQL memory-view queries:

- `getAgentRunMemoryView(runId: String!, source: MemoryExplorerSourceInput)`
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!, source: MemoryExplorerSourceInput)`

Both view queries accept include flags for working context, episodic memory, semantic memory, raw traces, raw-trace file metadata, archive inclusion, and `rawTraceLimit`. They also accept an optional `rawTraceFileName` selector. Raw traces default to omitted so explorer/detail page transitions can stay lightweight; clients load raw traces explicitly when the user opens the Raw Traces tab, changes the trace limit, or selects a different raw-trace file.

`MemoryTraceEvent` exposes both `id` and `sourceEvent` for active and complete rotated raw traces, so API consumers can correlate displayed rows with persisted trace records and their originating runtime event boundary. `RawTraceFileSummary` exposes safe file-selection metadata: `fileName`, `kind` (`active` or `segment`), `recordCount`, optional `segmentIndex`, and optional first/last timestamps. The selector identity is the backend-listed file name only, for example `raw_traces_active.jsonl` or `raw_traces_000003.jsonl`; callers must not send or expose absolute file paths.

When `includeRawTraceFiles` is true or `rawTraceFileName` is supplied, `RawTraceFileSourceService` lists active `raw_traces_active.jsonl` plus complete rotated segment files, ignores pending raw-trace manifest entries, validates the requested file name against that list, and reads only the selected file. Inspector ordering is active first when present, then complete segments newest-to-oldest by segment index. If the requested file name is missing or invalid, the backend falls back to the default listed file and returns `selectedRawTraceFileName` so clients can realign local selected state.

When archive inclusion is requested without file-selector mode, readers retain the complete-corpus behavior: complete rotated segments plus active records are merged, deduped by raw trace `id` with active records preferred, and returned in chronological order.

## Archive, Rotation, And Retention Boundaries

`RunMemoryFileStore` is the facade for active raw traces plus complete rotated-segment reads. `RawTraceArchiveManager` is the only owner of raw-trace rotation manifest/segment filenames and rotation-internal policy. `RawTraceFileSourceService` owns the agent-memory read boundary for UI-safe raw-trace file summaries, selected filename validation, and selected-file reads; it delegates physical path resolution and manifest policy to the store/archive owners rather than exposing paths to GraphQL clients.

Current archive/rotation behavior:

- Native AutoByteus compaction rotates compacted raw traces into `native_compaction` segments.
- Codex/Claude provider-boundary rotation moves settled active raw traces before an eligible boundary marker into `provider_compaction_boundary` segments.
- New rotated segment files live directly beside `raw_traces_active.jsonl` as `raw_traces_<zero-padded-index>.jsonl`, for example `raw_traces_000001.jsonl`; boundary identity remains in the manifest `boundary_key`, not in the filename.
- New writes use `raw_traces_manifest.json` and never create `raw_traces_archive_manifest.json` or `raw_traces_archive/`.
- Readers prefer `raw_traces_manifest.json`; old `raw_traces_archive_manifest.json` plus `raw_traces_archive/` are data-read/migration fallback only when no new manifest exists.
- Startup app-data migration `20260617_raw_trace_rotation_layout` converts old complete archive segments to direct rotated files, excludes pending entries from the new manifest, and decommissions old authoritative manifest/archive files after verification.
- Complete-corpus reads include complete rotated segments plus active records, ordered by timestamp, turn id, sequence, then id.
- Complete-corpus tool projection groups physical rows by compound
  `(turn_id, tool_call_id)` identity, so a call and result may reside in
  different files without producing duplicate interactions.
- Pending manifest entries are retry state only and are not exposed to readers.
- Sequence initialization for restored external runs reads active records plus complete rotated segments so per-turn `seq` values continue without reuse.

Current non-goals:

- No archive compression.
- No total-storage retention policy.
- No working-context snapshot windowing/retention.
- No compatibility read path for historical monolithic `raw_traces_archive.jsonl` files.

## Provider Compaction Boundaries

Codex and Claude provider/session compaction metadata is real provider-owned context management, but it is not AutoByteus semantic memory compaction.

Normalized provider-boundary handling is storage-only:

- Codex `item/started` with `item.type = "contextCompaction"` normalizes to a non-rotating `provider_compaction_boundary` status so live clients can show provider compaction in progress without moving raw traces.
- Codex `item/completed` with `item.type = "contextCompaction"`, `rawResponseItem/completed` with raw Responses `type = "context_compaction"`, older raw Responses `type = "compaction"`, and deprecated `thread/compacted` normalize to deduplicated completed provider-boundary markers.
- Codex `compaction_trigger` is treated as a trigger signal only; it must not write a provider-boundary marker or rotate raw traces.
- Claude `status: "compacting"` normalizes to non-rotating provenance.
- Claude `compact_boundary` normalizes to a rotation-eligible `provider_compaction_boundary` marker.
- `ProviderCompactionBoundaryRecorder` writes provider-boundary status/marker payloads as raw traces with `semantic_compaction:false` metadata.
- If the marker is rotation-eligible, settled active raw traces before the marker rotate into a complete direct raw-trace segment. The marker remains active, and active plus complete rotated segments remain the complete raw-trace corpus.

Provider-boundary handling must not create Codex/Claude semantic or episodic memory, rewrite trace content, drop trace history, inject memory into external runtimes, or retrieve memory from external runtimes. It is safe active-file rotation plus provenance only.

## Run-History Relationship

Run-history remains the owner of conversation/activity replay DTOs. Agent-memory may read run-history metadata/catalog rows to enrich explorer display names, summaries, workspace paths, timestamps, and grouping IDs, but stored memory remains the source of truth for inclusion in the Memory UI.

When runtime-native Codex or Claude history cannot be read, the local-memory projection fallback can build a replay bundle from the complete raw-trace corpus using the explicit persisted `memoryDir` basename as the local run/member id. Provider-boundary markers are provenance and are not converted into user-visible conversation/activity items.

Run-history and work-trace projection build one logical interaction from the
physical call/result pair. New minimal results obtain name/arguments from their
call. Existing historical result rows that contain duplicated or late/effective
name/arguments remain readable through a logical read-only override; that
historical overlay is never fed back into recorder/writer decisions. Existing
files are directly usable: this contract requires no raw-file rewrite, schema
branch, Memory Sync change, or migration.

## Key Source Files

- Explorer services: `src/agent-memory/services/agent-memory-explorer-service.ts`, `src/agent-memory/services/team-memory-explorer-service.ts`
- Source resolver: `src/agent-memory/services/memory-explorer-source-service.ts`
- Raw-trace file selector service: `src/agent-memory/services/raw-trace-file-source-service.ts`
- Raw-trace record normalization: `src/agent-memory/services/raw-trace-record-normalizer.ts`
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
- Memory Sync feature details: `../features/memory_sync.md`
