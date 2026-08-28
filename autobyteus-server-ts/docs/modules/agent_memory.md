# Agent Memory

## Scope

`src/agent-memory` owns server-side memory exploration, inspection views, and the raw-trace-only recorder used for Codex and Claude runs. Its read side can inspect the same run/member memory files that the native TypeScript memory module defines in `autobyteus-ts`; its external-runtime write side is limited to raw traces and their rotation metadata.

This module is intentionally separate from run-history projection: agent-memory exposes persisted memory artifacts for exploration and inspection, while `src/run-history` converts runtime or local-memory sources into historical replay bundles. Run-history metadata is used only to enrich memory explorer summaries and to group memory-bearing runs by stable agent/team identity.

## Storage Layout

Memory files live under the configured memory root:

- Standalone runs: `memory/agents/<runId>/...`
- Direct team members: `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`
- Nested subteam members: `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`; deeper nesting appends each physical ancestor TeamRun id before the AgentRun id
- Task-Agent runs: `memory/agent_teams/<rootTeamRunId>/<...ancestorTeamRunIds>/<taskAgentRunId>/...` using the logical member's physical Team memory scope
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
- `raw_traces_<zero-padded-index>.jsonl` — immutable raw-trace archives, including one exact-new-activity archive per successful native compaction.
- `episodic.jsonl` and `semantic.jsonl` — immutable native compacted output rows.
- `compaction_lineage.jsonl` — append-only successful native-compaction lineage. Its last valid record is the only current-compaction head and lists exact current output IDs, the optional preceding compaction, and execution/prompt audit metadata; it does not identify a raw archive.
- `working_context_snapshot.json` — native AutoByteus continuation state: strict schema-v5 finalized provider-neutral messages and message-local constituent ranges. It contains no output identity, lineage object, or mutable current-state field. Codex and Claude recording no longer creates or updates this file.

There is no current `compacted_memory_manifest.json` or compaction-state/pointer
file. The destructive `20260730_reset_pre_lineage_memory` path is removed.
Normal runtime never reads old episodic/semantic/manifest state or a pre-v5
snapshot; eligible historical native snapshots are handled only by the
forward-only startup migration described below.

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

Native AutoByteus runs remain owned by the `autobyteus-ts` `MemoryManager`. The server-side recorder must skip `RuntimeKind.AUTOBYTEUS` so native traces, snapshots, archives, outputs, and lineage are not duplicated.

Native compaction is a proposal / accept / commit boundary. The executor resolves the process-global strategy, captures the manager-owned WorkingContext and lineage-head baseline, and requests an ID-less proposal. `MemoryManager` verifies the baseline, assigns output identities, and builds a complete accepted candidate whose lineage record is finalized before commit. Commit then executes exact new-raw archive -> output rows -> lineage append -> finalized context -> schema-v5 snapshot -> pending clear. The archive is an independent command: `RawTraceArchiveManager` owns its descriptor and filename, and neither is returned into the candidate or lineage. Recurrent compaction consumes the current head output plus new raw-backed work but archives only the new raw evidence. The lineage tail selects the exact current complete replacement bundle; older successful outputs remain historical rather than being mixed into normal projection.

The built-in Memory Compactor chooses the natural number of episodes and
semantic facts needed for safe continuation. Accepted output requires at least
one episode, but no fixed total episode/fact cap is imposed during parsing,
normalization, publication, lineage read/write, or current-head projection.
Per-entry bounds, structural validation, cleanup,
deduplication, and positive salience remain enforced.

Each requested operation captures one immutable trigger-aligned planning budget.
For effective input budget `B` and trigger threshold `T`, the post-compaction
target is the non-negative smaller of `floor(0.35 * B)` and `T` minus headroom
`max(256, ceil(0.10 * T))`. Planning reserves replacement-memory space, required
system content, observed-but-untracked prompt overhead, and any complete final
tool-protocol group before retaining the newest complete natural units. An
unattainable target or absent settled raw-backed compactable prefix fails before
the compactor runs; accepted output is re-estimated and must fit the same target.

The proactive threshold uses actual normalized prompt observations. Missing
usage or missing prompt tokens leaves threshold state unchanged, while numeric
zero is a real below-threshold observation. After success, a process-local
episode suppresses another proactive request until an actual observation falls
below the same threshold. The first still-high observation emits one inadequate-
reduction diagnostic; later high observations remain suppressed. Budget-key
change resets the episode, and hard-input-cap pressure can still request an
operation. This removes the former independent fixed-retention/repeated-success
loop without turning the configurable ratio into a hard context-window resize.

The persisted `autobyteus-memory-compactor` system prompt owns the stable task,
natural-sizing guidance, and exact six-array response schema. The initial
operation message identifies the conversation history as belonging to the target
agent, surrounds it with one plain-text target-agent `START` / `END` separator
pair, and contains exactly one canonical
`<target_agent_conversation_history>` block with nothing after the end separator.
The renderer reuses `WorkingContextFinalizer`, so compatible prior-memory and
current-user regions become one natural User turn and assistant/Tool boundaries
remain ordered. It omits reasoning, backend IDs, duplicated schema/count policy,
and platform internals while preserving redaction, explicit value bounds, and
renamed-boundary escaping.

Compaction rendering normalizes only derived provider-facing copies: CR/CRLF
becomes LF, non-useful C0 controls are removed while newline/tab remain, lone
UTF-16 surrogates become U+FFFD, and valid pairs plus multilingual text, paths,
code, symbols, and emoji remain intact. Middle omission and accepted-entry end
clamps use surrogate-safe boundaries. Canonical raw traces, tool payloads,
archives, stored memory, and lineage are never rewritten by this policy.

The complete initial and correction task prompts are finalized and checked
again before `ServerCompactionAgentRunner` can launch a child. An invariant
failure is `input_construction_failure`: zero child/correction calls, zero target
dispatch, zero canonical mutation, and the same retained USER-authorized gate.

`UserInputContextBuildingProcessor` no longer applies generic `[User
Requirement]`, `[Tool Execution Result]`, `[Message From Agent]`, or `[System
Notification]` headings. Authored message content passes through unchanged when
no readable context is concatenated; a combined payload uses only neutral
`[Context]` and `[Message]` sections. Sender metadata, provider-native tool
protocol, and source-specific carrier builders retain their existing ownership.

The parser evaluates exact, fenced, and balanced JSON-object candidates against
all six required arrays and accepts exactly one distinct host-consumed result
with at least one non-empty episode. Harmless extra fields and unusable
blank/non-string entries are ignored; unrelated JSON objects cannot mask a later
valid object, and multiple distinct valid objects fail as ambiguous.

The server child collector returns usable final assistant output or a typed
runner failure. Error completion, interruption, terminal error, timeout, tool
approval, task rejection, launch failure, and collection failure retain their
kind and available child run/task metadata and never enter the JSON parser.

Only a typed returned-content validation failure triggers one corrective child
run with a new task/run identity. Its deterministic prefix records the validation
stage, restates the six-array shape, and resends the same target history. The
initial and optional correction are disabled siblings owned by the same parent
operation, not a recursive parent/child chain; neither writes child lineage or
raw archives. Repair success yields one parent completed lifecycle and one
canonical commit. Repair exhaustion yields one parent failed lifecycle, retains
the pending operation, and leaves archives, output rows, lineage,
WorkingContext, and snapshot unchanged. A runner/provider/transport/timeout
failure is terminal for the current attempt, bypasses response repair, and
introduces no fallback model.

A new pending operation receives one automatic initial attempt. Any final
failure moves it to `awaiting_user_retry` and stops the current target-agent turn
before further model dispatch. Each distinct `user`-origin turn can authorize
one new attempt; `agent` and `system` turn starts remain queued and invoke neither the
compactor nor target model. The core scheduler may select the earliest queued
user behind those entries without removing them. Retry success clears the
operation, dispatches that user turn, and then restores normal relative FIFO;
retry failure retains the same gate. The compactor remains zero-tool.

The native exposure resolver enforces that least-authority boundary by exact
built-in definition ID before ordinary native defaults or team tools are
composed, so the final Memory Compactor `AgentConfig.tools` is empty. Ordinary
native agents still receive `run_bash`, `read_file`, `edit_file`, and
`write_file` as their runtime-derived baseline.

New successful lineage records use `promptContractVersion: 3`. Existing
immutable values 1 and 2 remain directly usable, mixed `1 -> 2 -> 3` chains are
valid, and unsupported values reject without rewriting or compatibility
decoding.

Existing schema-v1 rows that contain the former `rawTraceArchiveFile` extra field
remain directly readable through recognized-field normalization. The stored
field is ignored without a data rewrite, version branch, or output-to-raw origin
interpretation; new rows omit it.

Explicit existing-run restore requires a strict-v5 snapshot; no raw-history
projector or pre-v5 runtime reader remains. `LLMRequestAssembler` completes any
pending compaction before capturing the request-recovery checkpoint and captures
immediately before current request mutation. Assembly/provider failures restore
that stable base, while final output, real Tool ingestion, and supported retained
interruption release it exactly once. Accepted archive/output/lineage state is
never rolled back.

An otherwise current schema-v5 snapshot whose native assistant tool call lacks
a matching result is repaired during bootstrap before strict message/provenance
validation. The bootstrapper validates the v5 envelope and run identity, asks
the native `MemoryManager` protocol-safety owner to correlate calls by
`(turn_id, tool_call_id)`, and then requires the repaired snapshot to pass the
ordinary strict validator. When no committed result exists, repair appends one
canonical raw `tool_result` first, preserving the original tool name and
arguments while recording `tool_result: null` plus a deterministic non-empty
`tool_error`; the working-context snapshot is then rebuilt from raw authority.
Repeated restore is idempotent and does not append another result. Only a
malformed final physical record in the active raw JSONL file may be truncated as
a partial-write tail; earlier malformed records and unrelated snapshot
corruption remain integrity failures.

There is no server or GraphQL direct/recursive episode/semantic-to-raw origin
service. Current output projection reads the lineage tail, loads exactly its
episode/semantic membership in stored order, and treats malformed/unsupported
lineage or missing/misordered output rows as integrity errors without opening a
raw archive.

### Global Compaction Strategy Setting

`AUTOBYTEUS_COMPACTION_STRATEGY` selects the strategy for subsequent native compaction operations. Blank values normalize to `structured-json`, the only production registration. `ServerSettingsService` validates updates against registry metadata and persists them through the normal `.env` plus current-process environment path, so already-created native agents resolve the new value on their next compaction. This is process-local convergence; no cross-process broadcast or provider-session reconciliation is added.

GraphQL keeps option discovery and effective selection separate:

- `getWorkingContextCompactionStrategies` projects only registry `{ id, name }` metadata;
- `getEffectiveWorkingContextCompactionStrategyId` applies the same normalizer as runtime, so absent/blank selects `structured-json` while an explicit unknown ID stays explicit for truthful recovery UI.

Settings -> Server Settings -> Basics uses these reads for a registry-backed Compaction strategy selector. The card keeps the trigger ratio, effective-context override, and detailed-log controls, persists only changed valid fields through the existing per-key mutation, and stops after the first failed write while retaining failed and unsent drafts for retry. Catalog/effective-read errors and unknown IDs are shown without guessing or silently writing a default.

The `structured-json` strategy always invokes the built-in `autobyteus-memory-compactor`; blank launch fields inherit the parent run's runtime/model. `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is no longer a predefined setting or runtime selection path. A stale custom value is inert, and a missing/invalid built-in definition fails without arbitrary-agent fallback.

### Automatic-Compaction Composition

Core memory owns a closed `MemoryCompactionConfiguration`: `disabled` has no
policy or strategy runner, while `enabled` carries one current
`CompactionPolicy` and its required runner. `AgentConfig` supplies that complete
value to `AgentFactory` and `MemoryManager`; neither factory nor manager infers
or constructs an independent second policy. Direct core construction without an
explicit value defaults to disabled.

`AutoByteusAgentRunBackendFactory` selects disabled for the exact built-in
Memory Compactor definition on create and restore and does not invoke the runner
factory. Ordinary native agents receive enabled composition with a fresh current
policy and runner; runner construction failure/null is an agent-composition
failure, not a silent disabled fallback.

The generic LLM phase still resolves provider/model request capacity for both
variants. Enabled agents then derive threshold/hard-cap planning and use the
existing strategy, executor, pending-operation, observation, and status path.
Disabled compactor children skip all of that work even when their reported
prompt usage exceeds the proactive threshold or policy hard cap; their original
assistant/tool completion remains the runner result. A provider-admissible task
therefore produces exactly one initial child plus at most one host-owned
correction sibling and no descendant compactor. A task that exceeds actual
provider capacity fails through planning/pre-launch or typed runner handling
instead of recursively compacting its own task. The configuration is runtime
only; no agent-definition, memory, snapshot, or lineage migration is required.

`ServerCompactionAgentRunner` allows an ordinarily constructed compactor child
up to 300,000 ms (five minutes) to return its final output. This is a
runner-owned omitted-option default, not an application setting:
`ServerCompactionAgentRunnerOptions.timeoutMs` remains the authoritative
explicit override for tests or custom construction. On timeout or another
failure, the existing typed error projection, event unsubscription, and child
run termination still apply; unrelated process, server-start, and test timeout
policies are not derived from this value.

Compaction status metadata includes stable `compaction_strategy_id` and
`compaction_strategy_name` in addition to operation/turn and current runner
diagnostics. Requested, execution, child run, and child task identities remain
distinct. A resolver, strategy, planning, typed runner, response-repair,
validation, or replacement failure preserves the pending request and does not
emit a false completed state.

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

The memory explorer is a backend-for-frontend read model for the `/memory` UI. It is memory-derived: configured agents or teams with no persisted memory do not appear.

Explorer services scan persisted memory roots at request time, derive memory availability flags, enrich with run-history metadata when available, sort by latest memory update, and paginate server-side.

### Independent Agents

`AgentMemoryExplorerService` reads standalone run directories from `memory/agents/<runId>` and includes only runs with at least one memory artifact. It groups included runs as follows:

- `DEFINITION` groups use `agentDefinitionId` from run metadata or run-history catalog rows.
- Runs without metadata/history attribution are grouped under `UNATTRIBUTED` / `Unattributed runs` so legacy standalone memory remains discoverable.

Agent explorer summaries include display name, stable ID, run count, latest memory timestamp, and merged memory availability. Agent-run summaries include run ID, optional agent metadata, workspace path, created/updated timestamps, and per-run memory availability.

### Agent Teams

`TeamMemoryExplorerService` reads the V2 Team execution tree and builds member memory targets. It includes a team run only when at least one member target has inspectable memory. Team groups use `teamDefinitionId`; each summary includes the team display name, team-run count, distinct member-memory count, latest memory timestamp, and merged availability.

Team-run summaries include V2 TeamRun execution facts, merged availability across member targets, and `memberTargets` containing only members with memory. The backend builds those targets from the recursive execution tree and `AgentMemoryLocationService`: logical selection uses rooted `memberAddress`, while physical lookup uses `rootTeamRunId + ancestorTeamRunIds + agentRunId` rather than a flattened Team/member assumption.

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
- `getTeamMemberRunMemoryView(teamRunId: String!, memberRunId: String!, source: MemoryExplorerSourceInput)`

Both view queries accept include flags for working context, episodic memory, semantic memory, raw traces, raw-trace file metadata, archive inclusion, and `rawTraceLimit`. They also accept an optional `rawTraceFileName` selector. Raw traces default to omitted so explorer/detail page transitions can stay lightweight; clients load raw traces explicitly when the user opens the Raw Traces tab, changes the trace limit, or selects a different raw-trace file.

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
- No external-runtime WorkingContext snapshot write, reconstruction, or fallback.
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

- Explorer services: `src/agent-memory/services/agent-memory-explorer-service.ts`, `src/agent-memory/services/team-memory-explorer-service.ts`
- Source resolver: `src/agent-memory/services/memory-explorer-source-service.ts`
- Raw-trace file selector service: `src/agent-memory/services/raw-trace-file-source-service.ts`
- Raw-trace record normalization: `src/agent-memory/services/raw-trace-record-normalizer.ts`
- Explorer helpers: `src/agent-memory/services/memory-run-summary-builder.ts`, `src/agent-memory/services/team-memory-member-target-builder.ts`, `src/agent-memory/services/memory-explorer-page.ts`
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
