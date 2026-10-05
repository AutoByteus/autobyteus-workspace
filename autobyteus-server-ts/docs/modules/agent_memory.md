# Agent Memory

## Scope

`src/agent-memory` owns server-side memory exploration, inspection views, and the raw-trace-only recorder used for Codex and Claude runs. Its read side can inspect the same run/member memory files that the native TypeScript memory module defines in `autobyteus-ts`; its external-runtime write side is limited to raw traces and their rotation metadata.

This module is intentionally separate from run-history projection: agent-memory exposes persisted memory artifacts for exploration and inspection, while `src/run-history` converts runtime or local-memory sources into historical replay bundles. Run-history metadata is used only to enrich memory explorer summaries and to group memory-bearing runs by stable agent/team identity.

## Native Accepted Input Recording And Projection

Native ingestion now preserves optional `message_id` / `dedupe_key` from the
original accepted user input in new raw user traces, alongside sender and
attachment facts. The core raw codec and server `raw-trace-record-normalizer`
retain these known nonblank fields. Run-history transports them as typed
`messageId` / `dedupeKey` through replay and conversation projection; memory
inspection does not allocate or guess identity.

Old missing keys remain unknown. No migration, backfill, historical raw rewrite
or old-live-input repair is part of this change. Reading history or reconnecting
the renderer does not authorize a summary or resend. The pending queue and
failure-epoch permission remain native runtime memory, not a persisted outbox.
See [run-history identity](run_history.md#accepted-input-presentation-identity)
for the scoped primary-key rule used to join new saved and live presentation.

## Storage Layout

Memory files live under the configured memory root:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`; deeper nesting appends each physical ancestor TeamRun id before the AgentRun id
- Task-Agent runs: `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<taskAgentRunId>/...` using the logical member's physical Team memory scope
- Agent org members: `memory/agent_orgs/<orgRunId>/<...ancestorTeamRunIds>/<agentRunId>/...` (composed by `AgentMemoryLayout`, resolved by `AgentOrgExecutionTreeLocationService`)
- Imported Memory Sync sources: `memory/imports/<sourceNodeId>/agents/...` and
  `memory/imports/<sourceNodeId>/agent_teams/...`, with source metadata in
  `source-node.json` and sync state in `sync-manifest.json`.

The `runId`, `memberRunId`, `taskAgentRunId`, `teamRunId`, and `ancestorTeamRunIds`
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

- `raw_traces_active.jsonl` — active ordered original raw trace records,
  including strict run-scoped `system_instruction` rows when the exact runtime
  handoff was captured.
- `raw_traces_manifest.json` — completed raw-trace archive descriptors owned by `RawTraceArchiveManager`.
- `raw_traces_<zero-padded-index>.jsonl` — immutable raw-trace archives. Native compaction prepares selected new activity before snapshot commit; a failed preparation/publication can leave copied archive evidence without a successful new summary.
- `episodic.jsonl` and `semantic.jsonl` — historical compacted output rows; current direct compaction does not append them.
- `compaction_lineage.jsonl` — historical append-only lineage, not current continuation authority and not a normal compaction/restore dependency.
- `working_context_snapshot.json` — native continuation state: versionless `{agent_id, messages}` with finalized messages and provenance. The normal reader ignores obsolete root version/extras but requires current shapes, identity and repairable tool facts. Codex/Claude recording does not write it.

There is no current compacted-memory manifest or pointer. The destructive
`20260730_reset_pre_lineage_memory` path is removed. Normal restore accepts
current known fields with zero/one compacted region independently of historical
category/lineage presence. It performs ordinary active-raw unmatched-tool repair
before full validation and normal save; it does not generate a new summary.

Startup app-data migration `20260707_raw_trace_active_file_name` renames existing active `raw_traces.jsonl` files to `raw_traces_active.jsonl` for local and imported memory corpora. Runtime steady state reads and writes only `raw_traces_active.jsonl`; the old active filename is not a compatibility alias.

Required startup app-data migration
`20260731_remove_external_runtime_working_context_snapshots` discards duplicate
Codex/Claude snapshots only at exact standalone and recursive team-member
locations classified by current run/team metadata. It preserves native
AutoByteus snapshots, imported memory, unclassified or invalid-metadata
locations, task-like locations without authoritative runtime metadata, raw
traces/archives, metadata, provider resume ids, and artifacts. Cleanup is
idempotent and retryable. Classification or unlink failures are recorded as
warnings/failures without blocking later startup migrations; a failed unlink
retains the stale file for retry, so the runtime-agnostic inspector may still
show that old copy while current external raw recording and provider
continuation remain healthy.

After external cleanup, the registry runs the existing raw-trace rotation-layout
and active-filename migrations before
`20260731_migrate_native_working_context_snapshots_v5`. One shared classifier
selects exact AutoByteus standalone/team-member locations and derives the strict
snapshot identity from `runId` or `memberRunId`; imported, external,
unclassified, and conflicting locations remain untouched.

The native migration skips a missing snapshot and skips every nonempty-lineage
location byte-for-byte before content inspection or cleanup. Absent or zero-byte
lineage permits the pure core converter to decode historical v1/v3/v4 or strict-v5
content. It retains only logical units with exact same-location active-raw
backing, omits unsupported/invalid/unsourced/old-compacted/incomplete Tool units,
and may publish a valid `messages: []` snapshot when nothing survives. A
parseable identity conflict rejects without mutation. The complete strict-v5
candidate is validated before replacement; only afterward are obsolete
`episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json` removed.
Raw traces, manifests, archives, and lineage are never mutated. Warning/failure
results are recorded and retryable while ordinary server startup continues.

The registered native converter is frozen historical code, not the normal
versionless reader. Its migration-owned shape guard first preserves an exact
current versionless successor and the entire location byte-for-byte, including
valid pending tool intents, partial tool batches and raw-ahead recovery states.
Invalid versionless-current data fails the item unchanged rather than being
converted to empty historical data. The guard does not run full request-ready
validation; ordinary bootstrap owns repair. No new migration or successful-ledger
reset is required for the direct-summary cutover.

The old monolithic `raw_traces_archive.jsonl` file is no longer an active read/write target. Historical monolithic archive files are intentionally not read by the approved no-compatibility policy.

## Conversation Activity Classification For Restore

`AgentConversationActivityInspector` is a read-only activation guard over one
resolved run memory directory. It reports `present` when the active raw-trace
file or a manifest-declared complete rotated segment contains canonical prior
activity, `none` when canonical activity is absent, and `indeterminate` when an
active file, manifest, or complete segment is malformed or unreadable. Pending
manifest entries do not count as complete history. The inspector never repairs,
truncates, rotates, or rewrites memory.

Team-member activation uses this classification before candidate construction.
A restored native AutoByteus member with `present` activity selects local-state
restore, while `none` permits genuinely fresh materialization. An external
member with `present` activity but no persisted provider binding fails closed.
`indeterminate` is always a continuation-safety error rather than permission to
create a replacement run.

Memory Sync does not move or wrap local runtime memory. `memory/agents` and
`memory/agent_teams` remain the active local runtime roots. Imported Memory Sync
content is an explicit read-only corpus under `memory/imports/<sourceNodeId>` and
must not be treated as runnable local run history, restore state, or a fallback
runtime memory provider.

## Runtime Ownership

Native AutoByteus runs use the core `MemoryManager`. The canonical
[core memory design](../../../autobyteus-ts/docs/agent_memory_design.md) owns
planning, provider-safe content construction, direct `compress(content)` output,
validation, snapshot publication and repair. Server composition uses
`src/agent-execution/compaction/compaction-llm-factory.ts` to construct an isolated
tool-free LLM per attempt, not a visible child agent. There is no strategy catalog,
registered algorithm selector, category-output projector or live lineage head.

`AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` is the optional current model/config tuple.
Missing/null selection uses the then-current parent model identifier and selected-
model defaults without a settings write. Controlled prompt/tool/transport fields
are excluded; the parent instance and its ordinary retry policy stay unchanged.
The existing trigger-ratio, active-context override and diagnostic settings remain.
Old built-in Memory Compactor definitions/settings are not imported or deleted.

One strategy execution permits at most three isolated generation attempts.
Planning/input construction happens before generation. Exhaustion retains the
same pending operation and exposes a fresh failure epoch. A later accepted user
message supplies one retry permit; pre-failure queued input and agent/system
messages do not. At a pre-parent gate A stays held, then B can authorize recovery
so A dispatches before B once each. Post-response failure is a next-turn gate.
These are live-queue semantics, not durable workflow replay after restart.

The committer prepares/copies archive evidence while active raw remains intact,
atomically replaces the versionless snapshot as the commit point, installs the
owned context and clears the pending operation, then prunes. Prune failure may
leave active duplicates and cannot reverse committed success. No category or
lineage write occurs. Per-file atomicity does not promise whole-machine power-loss
safety or transactionality across every memory file.

Native lifecycle phases include `requested`, `started`, `completed`, `failed` and
`stopped`, correlated by operation/requested-turn/execution-turn identities.
Termination aborts execution and drains the concrete backend event pump before
close within its bounded policy. Late summary output cannot reopen a stopped
operation. Root Team/Org shutdown freezes its known member scope and coordinates
preparation before teardown. This is not a new universal immediate-preparation
latency guarantee: first-auto preparation/quiescence timeout coverage remains a
separate unproved diagnostic boundary. Client reconciliation retains terminal
native rows for loaded contexts; it is not durable native cold replay. See
[frontend execution](../../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity).

Codex and Claude runs are recorded by the server as **raw-trace-only** local memory:

1. `AgentRunManager` attaches `AgentRunMemoryRecorder` as an active-run sidecar when the run has a `memoryDir` and its runtime kind is explicitly Codex App Server or Claude Agent SDK.
2. Accepted user messages are observed only after `AgentRun.postUserMessage(...)` returns `accepted: true`.
3. Assistant text, reasoning, tool lifecycle outcomes, and normalized provider compaction-boundary payloads are captured from normalized `AgentRunEvent`s.
4. `ExternalRuntimeMemoryWriter` writes shared `RawTraceItem` records through `RunMemoryFileStore`. It restores only sequence and tool-lifecycle state from active plus complete rotated raw traces; it never loads, constructs, or persists a `WorkingContext`.

Tool execution uses a strict split physical contract shared with native memory:

- a call row owns non-empty `turn_id`, `tool_call_id`, and `tool_name` plus an
  explicit `tool_args` object;
- a separate result row owns the same `turn_id` and `tool_call_id`, repeats the
  matched call's non-empty canonical `tool_name`, and has physically present
  `tool_result` and `tool_error` keys, including explicit `null` values;
- new result rows never repeat `tool_args`, and a call is never rewritten into
  a combined terminal row.

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
has valid identity, name, and authoritative arguments. For a known lifecycle,
the matched call/state name is authoritative for the result row. A supplied
non-empty terminal name must match it; a conflict is skipped and logged without
writing the result or marking the lifecycle complete, so a later valid terminal
can still finish the call. A terminal that omits its name remains valid when the
matched lifecycle supplies the canonical name.
Provider converters own the difference between an absent argument field (“not
yet available”) and an explicit `{}` (a valid no-argument call); memory must not
parse provider-native payloads or branch on tool names. If a terminal event is
the first event with authoritative arguments, the sequencer appends the call
first and then the minimal result (canonical name plus outcome, but no
arguments). Missing arguments defer physical writes;
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
later matching terminal may append only the result, using the hydrated call's
canonical name. Historical result-side name/argument overlays remain read-only
and never reconstruct current writer state.

The recorder does not instantiate a Codex/Claude memory manager, read or write a
Codex/Claude WorkingContext snapshot, retrieve memory for those runtimes, inject
recorded memory into prompts, or alter provider/runtime session state. Memory
persistence is independent of websocket clients; the sidecar is attached by the
run manager, not by live stream subscribers. A future runtime kind is not
implicitly recordable: it must deliberately opt into the external provider
contract instead of inheriting it from a broad non-AutoByteus check.

Route-backed Agent Tools MCP calls from Codex App Server and Claude Agent SDK
are recorded only after the runtime adapter normalizes them into canonical
`AgentRunEvent` tool lifecycles. The MCP route, method dispatcher, executor,
and family services/dispatchers must not write raw traces directly. Raw traces
use canonical tool names such as `send_message_to`, `generate_image`,
`delegate_task`, and `publish_artifacts`, preserve the provider invocation id
as the tool-call id, and store the normalized application-facing result payload
without provider/server-qualified tool names or internal MCP run-session
routing/configuration details. The current Agent Tools descriptor is tokenless
and headerless. For source-confirmed MCP terminal results, the stored
result/error follows the same application-facing effective-result projection
used by live Activity: non-null `structuredContent`, parsed single JSON text,
plain text, joined multi-text, sanitized rich `{ items: [...] }`, empty `null`,
or failed tool error for MCP `isError: true`. Raw MCP protocol envelope fields
such as `content`, `structuredContent`, `_meta`, and `isError` are not stored as
normal successful tool results. Non-MCP or source-unknown envelope-shaped values
remain unchanged because the projector is only invoked after converter-level MCP
source evidence.

## Memory Explorer Read Model

The memory explorer is a backend-for-frontend read model for the `/memory` UI. It is memory-derived: configured agents, teams, or orgs with no persisted memory do not appear.

Explorer services scan persisted memory roots at request time, derive memory availability flags, enrich with run-history metadata when available, sort by latest memory update, and paginate server-side.

### Independent Agents

`AgentMemoryExplorerService` reads standalone run directories from `memory/agents/<runId>` and includes only runs with at least one memory artifact. It groups included runs as follows:

- `DEFINITION` groups use `agentDefinitionId` from run metadata or run-history catalog rows.
- Runs without metadata/history attribution are grouped under `UNATTRIBUTED` / `Unattributed runs` so legacy standalone memory remains discoverable.

Agent explorer summaries include display name, stable ID, run count, latest memory timestamp, and merged memory availability. Agent-run summaries include run ID, optional agent metadata, workspace path, created/updated timestamps, and per-run memory availability.

### Agent Teams And Agent Orgs

Team and org explorers share one catalog policy owner,
`CollaborationRootMemoryCatalog`, which is fed by one family-specific
`CollaborationRootMemorySource` per persistence family:

- `TeamRootMemorySource` — lists stored root team runs and reads each admitted
  V2 Team execution tree through `TeamRunExecutionTreeLocationService`; display
  metadata comes from the Team catalog owner.
- `AgentOrgRootMemorySource` — lists stored root org runs and reads each org
  execution tree through `AgentOrgExecutionTreeLocationService`; display
  metadata comes from `AgentOrgRunHistoryCatalogService.listCatalogRows()`,
  the org history owner's pure, admission-filtered read. The explorer uses a
  stored-only history manager and never manages live runs.

`TeamMemoryExplorerService` and `AgentOrgMemoryExplorerService` are thin
family facades over that catalog. The catalog owns: iteration with **exactly
one execution-tree read per root per list request** (linear in stored root
runs; this replaced an O(N²) per-root all-root rescan), the skip-invalid-root
rule (a corrupt tree is skipped with a warning while other roots still list),
member memory filtering, grouping by definition id, name resolution, merged
availability, sort order, search matching, and paging. A catalog query never
writes the history index.

A root run is included only when at least one member target has inspectable
memory. Definition summaries (`teamDefinitionId` / `orgDefinitionId`) include
the display name, run count, distinct member-memory count, latest memory
timestamp, and merged availability.

Member targets are built by `buildCollaborationMemberMemoryTargets`
(`collaboration-member-memory-targets.ts`) from the same tree snapshot. Every
agent execution located in the tree that has memory on disk becomes a target:
configured agents (`CONFIGURED`), delegated task agents (`TASK_AGENT`, with
`startedAt`), and members of delegated task teams at any nesting depth
(`TASK_TEAM_MEMBER`). Each target carries its own `agentRunId` and a
`groupPath` of enclosing `CONFIGURED_TEAM` / `TASK_TEAM` groups so clients can
render the run's execution structure. Groups have no memory of their own.
Memory folders not referenced by the execution tree are not listed. Team
display names use the member address basename; org display names use the
address path inside the org. Logical selection uses rooted `memberAddress` and
`agentRunId`, while physical lookup uses the root run id plus
`ancestorTeamRunIds` plus `agentRunId` rather than a flattened Team/member
assumption.

For inspector resolution, `AgentMemoryLocationService` reads only the given
root's tree when the team run id is an active or admitted root team run, and
matches against every root's agents only for other (nested) team run ids. Org
member resolution reads the named org root's tree directly.

When `AgentMemoryLocationService` is constructed with an explicit `memoryDir`,
its topology/readback collaborators must use the same memory root. Do not mix a
writer rooted in one app memory directory with a reader backed by a global or
different memory root; raw-trace readback depends on that root consistency.

### Local And Imported Source Resolution

`MemoryExplorerSourceService` owns the Memory UI source boundary. Missing or
null source input resolves to local memory. Imported source input validates the
`sourceNodeId`, verifies that `memory/imports/<sourceNodeId>` exists, and roots
all agent/team/org explorer and view readers under that import root.

Imported source reads are marked read-only. The backend must not silently fall
back to local memory for an unknown imported source id; returning an error keeps
local and imported corpora separated.

Imported Team and Org list queries follow this bounded, read-only path. Memory
Sync currently exports only `agents` and `agent_teams`, so an imported source
has no `agent_orgs` corpus and the Org explorer returns an empty page for it.

### Explorer GraphQL Queries

The explorer GraphQL surface is:

- `listMemoryExplorerSources()`
- `listAgentsWithMemory(source, search, page, pageSize)`
- `listAgentRunsWithMemory(selector, source, search, page, pageSize)`
- `listAgentTeamsWithMemory(source, search, page, pageSize)`
- `listAgentTeamRunsWithMemory(teamDefinitionId, source, search, page, pageSize)`
- `listAgentOrgsWithMemory(source, search, page, pageSize)`
- `listAgentOrgRunsWithMemory(orgDefinitionId, source, search, page, pageSize)`

All list queries return a `MemoryExplorerPage` shape with `entries`, `total`, `page`, `pageSize`, and `totalPages`. Search is applied within the active surface: agent/team/org cards on home, selected-agent runs on agent detail, or selected-team/org runs and member targets (including task agents and task-team members) on team/org detail.

Team-run and org-run entries share the member type
`CollaborationMemberMemoryTargetSummary` (`memberAddress`, `displayName`,
`agentRunId`, `agentDefinitionId`, `executionKind`, `startedAt`, `groupPath:
[CollaborationMemoryGroup]`, `lastUpdatedAt`, `memory`). The structure fields
and org queries are additive; existing query names and arguments are unchanged.

The `source` argument is a `MemoryExplorerSourceInput`:

- `{ type: LOCAL }` reads `memory/agents`, `memory/agent_teams`, and `memory/agent_orgs`.
- `{ type: IMPORTED, sourceNodeId }` reads the selected
  `memory/imports/<sourceNodeId>` corpus.

The older flat snapshot queries (`listRunMemorySnapshots` and `listTeamRunMemorySnapshots`) were replaced by these explorer queries for the Memory UI.

## Trace Shape And GraphQL View

Raw traces preserve provenance needed by future analyzers:

- `scope`, which is `turn` for ordinary trace rows and `run` for the strict
  system-instruction row
- `id`
- `turn_id` / GraphQL `turnId` and `seq`, both nullable only for run-scoped rows
- `trace_type` / GraphQL `traceType`, including `system_instruction` and
  `provider_compaction_boundary` markers
- `source_event` / GraphQL `sourceEvent`
- `content`, `media`, tool identity, tool args/result/error, correlation id, and timestamp fields when present

The current run-scoped instruction row has exactly five persisted keys:
`id`, `ts`, `trace_type: "system_instruction"`, the exact `content` handed to
the runtime, and `source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED"`. It has no turn
identity or sequence. Normalization exposes it as `scope: "run"`, with GraphQL
`turnId: null` and `seq: null`. A malformed row is omitted rather than widened
into the ordinary turn model. Existing rows are not rewritten and no historical
instruction is inferred from current agent/team definitions.

The inspector exposes physical rows. For current writes, the canonical name
appears on both `tool_call` and `tool_result`; arguments remain call-only, while
result/error remain result-only. This makes result-only inspection descriptive
without changing compound lifecycle correlation or argument ownership. Working
Context also retains the canonical name on its provider-protocol result message.

GraphQL memory-view queries:

- `getAgentRunMemoryView(runId: String!, source: MemoryExplorerSourceInput)`
- `getTeamMemberRunMemoryView(teamRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`
- `getAgentOrgMemberRunMemoryView(orgRunId: String!, agentRunId: String!, source: MemoryExplorerSourceInput)`

Unknown members resolve to an empty view for the requested `agentRunId`.

All view queries accept include flags for working context, episodic memory, semantic memory, raw traces, raw-trace file metadata, archive inclusion, and `rawTraceLimit`. They also accept an optional `rawTraceFileName` selector. Raw traces default to omitted so explorer/detail page transitions can stay lightweight; clients load raw traces explicitly when the user opens the Raw Traces tab, changes the trace limit, or selects a different raw-trace file.

`MemoryTraceEvent` exposes both `id` and `sourceEvent` for active and complete rotated raw traces, so API consumers can correlate displayed rows with persisted trace records and their originating runtime event boundary. `RawTraceFileSummary` exposes safe file-selection metadata: `fileName`, `kind` (`active` or `segment`), `recordCount`, optional `segmentIndex`, and optional first/last timestamps. The selector identity is the backend-listed file name only, for example `raw_traces_active.jsonl` or `raw_traces_000003.jsonl`; callers must not send or expose absolute file paths.

When `includeRawTraceFiles` is true or `rawTraceFileName` is supplied, `RawTraceFileSourceService` lists active `raw_traces_active.jsonl` plus complete rotated segment files, ignores pending raw-trace manifest entries, validates the requested file name against that list, and reads only the selected file. Inspector ordering is active first when present, then complete segments newest-to-oldest by segment index. If the requested file name is missing or invalid, the backend falls back to the default listed file and returns `selectedRawTraceFileName` so clients can realign local selected state.

When archive inclusion is requested without file-selector mode, readers retain the complete-corpus behavior: complete rotated segments plus active records are merged, deduped by raw trace `id` with active records preferred, and returned in chronological order.

## Archive, Rotation, And Retention Boundaries

`RunMemoryFileStore` is the facade for active raw traces plus complete rotated-segment reads. `RawTraceArchiveManager` is the only owner of raw-trace rotation manifest/segment filenames and rotation-internal policy. `RawTraceFileSourceService` owns the agent-memory read boundary for UI-safe raw-trace file summaries, selected filename validation, and selected-file reads; it delegates physical path resolution and manifest policy to the store/archive owners rather than exposing paths to GraphQL clients.

Current archive/rotation behavior:

- Native AutoByteus compaction rotates exactly the selected active raw traces into `native_compaction` segments. The store derives a retry-stable `native_compaction_selection:<sha256>` boundary key from the JSON encoding of sorted selected trace IDs; the archive manager independently owns manifest completion and the rotated filename.
- Run-scoped system-instruction rows are never members of the turn-scoped
  compaction selection. When they physically precede the last selected turn
  record, they rotate with that completed segment so active-file Activity and
  raw inspection remain truthful. Normal Activity does not read the rotated
  copy; the Memory Inspector can still select its completed segment explicitly.
- Codex/Claude/Antigravity provider-boundary rotation moves settled active raw traces before an eligible boundary marker into `provider_compaction_boundary` segments.
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
- No external-runtime WorkingContext snapshot write, reconstruction, or fallback.
- No compatibility read path for historical monolithic `raw_traces_archive.jsonl` files.

## Provider Compaction Boundaries

Codex, Claude and Antigravity (AGY) provider/session compaction metadata is real provider-owned context management, but it is not AutoByteus semantic memory compaction.

Normalized provider-boundary handling is storage-only:

- Codex `item/started` with `item.type = "contextCompaction"` normalizes to a non-rotating `provider_compaction_boundary` status so live clients can show provider compaction in progress without moving raw traces.
- Codex `item/completed` with `item.type = "contextCompaction"`, `rawResponseItem/completed` with raw Responses `type = "context_compaction"`, older raw Responses `type = "compaction"`, and deprecated `thread/compacted` normalize to deduplicated completed provider-boundary markers.
- Codex `compaction_trigger` is treated as a trigger signal only; it must not write a provider-boundary marker or rotate raw traces.
- A Codex compaction whose turn or run ends before its `item/completed` (interrupt, failed turn, terminal error, app-server close, run terminate) is closed as a non-rotating `codex.context_compaction_abandoned` marker (status `failed`, same `provider_event_id`, `error_message` with the reason), emitted before the ending event. See [Codex integration](codex_integration.md).
- Claude compaction is recognized only from real SDK frames (`type: "system"` with `subtype: "status"` or `subtype: "compact_boundary"`) by the per-session `ClaudeCompactionOperationTracker`, which models one compaction operation at a time. The first `status: "compacting"` frame opens the operation and normalizes to non-rotating `claude.status_compacting` provenance (status `compacting`). Repeated `compacting` keepalive frames while the operation is open are suppressed and add nothing. A `compact_boundary` without a preceding status frame opens and closes its own operation.
- Claude `compact_boundary` closes the operation as a rotation-eligible `claude.compact_boundary` marker (status `compacted`) carrying `trigger`, `pre_tokens`, `post_tokens`, and `duration_ms` from `compact_metadata`. Its boundary key uses the boundary frame uuid, so a replayed frame cannot rotate twice.
- Claude `status: null` with `compact_result: "failed"` closes the operation as a non-rotating `claude.compaction_failed` marker (status `failed`) carrying `error_message`. If the turn settles while an operation is still open, `ClaudeSession` closes it as `failed` first, before any turn-settlement event. The reason is `interrupted`, `process_exited` or `turn_ended_before_boundary`. A failed operation never archives raw traces.
- All events of one Claude compaction operation share one operation id, emitted as `provider_event_id`, so live clients render a single compaction activity. The recorder persists the optional `post_tokens`, `duration_ms`, and `error_message` fields only when they are reported; Codex markers are unchanged.
- AGY (CLI ≥ 1.2.16) reports each automatic compaction as one `step_update` with `step_type: "checkpoint"` and `state: "DONE"`; `AgyStreamEventConverter` normalizes it to a single rotation-eligible `antigravity.checkpoint` marker (status `compacted`, trigger `auto`, `duration_ms`) keyed `agy:<conversation_id>:checkpoint:<step_index>`. There is no started phase. Older or unreadable CLI versions keep checkpoint steps ignored. See [Antigravity CLI Runtime](antigravity_cli_runtime.md#automatic-compaction).
- `ProviderCompactionBoundaryRecorder` writes provider-boundary status/marker payloads as raw traces with `semantic_compaction:false` metadata.
- If the marker is rotation-eligible, settled active raw traces before the marker rotate into a complete direct raw-trace segment. The marker remains active, and active plus complete rotated segments remain the complete raw-trace corpus.

Provider-boundary handling must not create Codex/Claude semantic or episodic memory, rewrite trace content, drop trace history, inject memory into external runtimes, or retrieve memory from external runtimes. It is safe active-file rotation plus provenance only.

## Run-History Relationship

Run-history remains the owner of conversation/activity replay DTOs. Agent-memory may read run-history metadata/catalog rows to enrich explorer display names, summaries, workspace paths, timestamps, and grouping IDs, but stored memory remains the source of truth for inclusion in the Memory UI.

Normal standalone and Team-member display always uses local-memory projection
from the active raw-trace file, with the explicit persisted `memoryDir` basename
as the local run/member ID. Runtime-native Codex/Claude history is diagnostic
only and is not a normal fallback. Provider-boundary markers remain provenance
and are not converted into user-visible conversation/activity items. A valid
run-scoped system-instruction trace projects only to Activity; it is excluded
from Event Monitor conversation/count/cursor policy and normal display never
opens a rotated segment to recover it.

Run-history and work-trace projection build one logical interaction from the
physical call/result pair. New minimal results carry the verified canonical name
locally and obtain arguments from their call. Full interaction reconstruction
still correlates the call for arguments, anchoring, ordering, and lifecycle
integrity. Existing historical name-less results and result rows containing
duplicated or late/effective name/arguments remain readable through the normal
logical read-only projection; that historical overlay is never fed back into
recorder/writer decisions. Existing raw files are directly usable: this contract
requires no raw-file rewrite, schema branch, or Memory Sync change. The separate
startup transitions remove metadata-classified duplicate external snapshots and
convert only eligible exact-native absent/empty-lineage snapshots as described
above.

## Key Source Files

- Explorer services: `src/agent-memory/services/agent-memory-explorer-service.ts`, `src/agent-memory/services/team-memory-explorer-service.ts`, `src/agent-memory/services/agent-org-memory-explorer-service.ts`
- Team/org catalog owner and family sources: `src/agent-memory/services/collaboration-root-memory-catalog.ts`, `src/agent-memory/services/team-root-memory-source.ts`, `src/agent-memory/services/agent-org-root-memory-source.ts`
- Source resolver: `src/agent-memory/services/memory-explorer-source-service.ts`
- Raw-trace file selector service: `src/agent-memory/services/raw-trace-file-source-service.ts`
- Raw-trace record normalization: `src/agent-memory/services/raw-trace-record-normalizer.ts`
- Explorer helpers: `src/agent-memory/services/memory-run-summary-builder.ts`, `src/agent-memory/services/collaboration-member-memory-targets.ts`, `src/agent-memory/services/memory-explorer-page.ts`
- Memory location owner: `src/agent-memory/services/agent-memory-location-service.ts`
- Conversation activity guard: `src/agent-memory/services/agent-conversation-activity-inspector.ts`
- Memory layout owner: `src/agent-memory/store/agent-memory-layout.ts`
- Team memory topology reader: `src/run-history/services/team-run-memory-topology-reader.ts`
- Explorer GraphQL types/resolver: `src/api/graphql/types/memory-explorer-schema.ts`, `src/api/graphql/types/memory-explorer.ts`
- Inspector GraphQL view types: `src/api/graphql/types/memory-view.ts`
- Recorder: `src/agent-memory/services/agent-run-memory-recorder.ts`
- Event accumulator: `src/agent-memory/services/runtime-memory-event-accumulator.ts`
- Provider boundary recorder: `src/agent-memory/services/provider-compaction-boundary-recorder.ts`
- External raw-trace writer adapter: `src/agent-memory/store/external-runtime-memory-writer.ts`
- Shared file store: `autobyteus-ts/src/memory/store/run-memory-file-store.ts`
- Shared archive manager: `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts`
- Memory Sync feature details: `../features/memory_sync.md`
