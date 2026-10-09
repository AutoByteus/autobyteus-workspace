# AutoByteus Agent Memory Design

## 1. Purpose And Authority Boundaries

Native memory separates three authorities:

- **WorkingContext** contains the finalized provider-neutral messages used for
  the next parent request, including zero or one compacted-memory region.
- **Raw traces** and their archives retain original activity evidence.
- **Readable presentation** derives bounded model/human-facing copies without
  rewriting canonical evidence.

A native compaction now produces one validated Markdown summary body. Current
continuation authority is `working_context_snapshot.json`, not an episodic or
semantic bundle or a lineage head. Existing category and lineage files remain
historical data; normal compaction and restore neither consult nor append them.
There is no new manifest, compaction pointer, or compatibility strategy branch.
External Codex/Claude provider sessions remain their own continuation authority.

## 2. Direct Compression Boundary

```ts
interface CompressionStrategy {
  compress(content: string): Promise<string>;
}
```

`PendingCompactionExecutor` captures the live baseline, plans a detached message
window, and builds the complete input **before** calling the strategy once.
`CompactionContentBuilder` renders the selected natural conversation, including
any prior compacted-memory region and new settled raw-backed units. Its plain
START/END target-history separators enclose the renderer's XML history boundary.
Private reasoning and backend call IDs are omitted; settled tool interactions
retain readable names, arguments and result/error facts. Renderer boundary
imitations are escaped.

Derived input copies normalize CR/CRLF, remove non-useful C0 controls except
newline/tab, replace lone UTF-16 surrogates, and preserve valid pairs and
multilingual text. Surrogate-safe head/tail omission never mutates stored raw
facts. Literal U+FFFD and valid emoji are not globally forbidden. A completed
input-construction failure is typed `input_construction_failure` before any
summary generation; it is not a reason to sanitize canonical history.

`DirectLlmCompressionStrategy` owns the provider envelope and bounded generation:

- each attempt creates an isolated LLM using current compaction model settings
  (or the then-current parent model identifier when no model is selected);
- it sets the bundled `COMPACTION_SUMMARY_PROMPT` and sends the prepared content
  as the user message with no tools or child Agent/Team runtime;
- provider capacity is checked before dispatch;
- one `compress` execution has at most **three** generation attempts with
  abortable 1s/2s backoffs; each provider call requests `single_attempt` transport
  so SDK retries cannot multiply those attempts;
- abort ends the operation rather than authorizing another attempt;
- known incomplete output, provider errors and invalid summary content do not
  become accepted memory; cleanup is bounded and cannot reverse a success;
- it returns only the validated, untagged summary body.

The parser accepts exactly one `<compaction_summary>...</compaction_summary>`
block, ignores exterior prose, and requires these exact `##` headings in order:

1. Goal and constraints
2. Decisions and findings
3. Completed work
4. Current state
5. Open work and next steps
6. Essential references

The body starts with the first heading. Each section must contain specific
bullets or `(none)`; duplicate/missing/reordered headings or envelope markers
inside the body fail validation. There is no six-array JSON schema, corrective
child run, numeric word/bullet quota or prompt-level target-summary budget.
Provider output caps and final WorkingContext fit checks still apply. Structural
acceptance does not guarantee model factual fidelity or future continuation.

The former structured-JSON strategy, registry/resolver, category normalization,
child-agent runner and built-in Memory Compactor synchronization are removed
from this path. Old `AUTOBYTEUS_COMPACTION_STRATEGY` and compactor-agent selector
values are inert; old on-disk agent configuration is not imported or deleted.

## 3. Composition, Planning And Thresholds

`MemoryCompactionConfiguration` has closed `disabled` and `enabled` variants.
Enabled composition carries one `CompactionPolicy` and a strategy factory with
execution control; disabled has neither. Direct core construction defaults to
disabled. The server composes native runs with the direct strategy. The generic
LLM path always resolves request capacity; disabled runs skip automatic
compaction, not provider capacity checks. No special compactor child exists.

### Trigger-Aligned Planning Budget

Each threshold or hard-input-cap request captures one immutable planning budget
for the whole pending operation, including later user-authorized retries. For an
effective input budget `B` and trigger threshold `T`, planning derives:

```text
quality retention cap = floor(0.35 * B)
trigger headroom       = max(256, ceil(0.10 * T))
post-compaction target = max(0, min(quality retention cap, T - trigger headroom))
replacement reserve   = min(8192, max(1024, floor(0.20 * target)))
```

The message budget estimates the complete observed prompt rather than only the
stored WorkingContext. It accounts for required leading system messages, a
complete protected final tool-protocol group, observed-but-untracked overhead,
and the replacement-memory reserve before retaining the newest complete natural
units that fit. Planning fails closed with `target_unattainable` when those
mandatory costs meet or exceed the target, and with `no_compactable_prefix`
when no settled raw-backed prefix remains. Acceptance estimates the finalized
context again and rejects it when finalized context plus untracked overhead
exceeds the captured target.

### Actual-Observation Threshold Episode

Trigger decisions use the provider-normalized prompt tokens observed for a
completed LLM request. Missing usage or an explicitly missing prompt-token count
logs a skipped observation and does not mutate threshold state; numeric zero is
a genuine below-threshold observation.

After one accepted compaction, the process-local threshold episode waits for an
actual prompt observation below the same threshold before rearming. The first
above-or-equal observation emits one inadequate-reduction diagnostic and moves
the episode into suppression; later above-or-equal observations remain
suppressed instead of requesting repeated successful compactions. A below-
threshold observation rearms the gate, a changed budget key starts a new
episode, and hard-input-cap pressure may request compaction regardless of the
proactive suppression state. An existing pending operation always takes
precedence. This episode is runtime state and resets when the agent runtime is
restarted; it is not a persisted memory contract.

## 4. Failure, Held Input And Retry Permission

A pending operation receives one automatic initial execution. Exhausted
failure retains that operation with a new failure epoch and exposes
`Compaction failed — send a message to retry`. A later accepted **user-origin**
message supplies one permit for that exact failed operation/epoch. Agent/system
messages, same-turn continuations, queued input accepted before failure, and
stale/duplicate permits are not retry authority. There is no background loop.

For a pre-parent gate, accepted input A remains held with its identity, text and
attachments; it has not been dispatched to the parent. A user message B accepted
after the failure permits retry. Success resumes A before B, once each, with no
resend required. Further failure keeps the recovery gate and advances the epoch;
it does not turn queued B into future retry credit. Existing consumed reads,
tool results and follow-up work must not be replayed. A failure after a visible
final response is a **next-turn** gate, not a replay of the completed response.

This is live in-memory queue ownership, not durable same-ID workflow replay or
a promise to resume held input across backend restart. Standalone, Team and Org
adapters project the same recovery facts; stream loss is not input authority.

### Accepted Input Identity In New Native History

Native user-input ingestion records the original accepted input's optional
`message_id` and `dedupe_key`, together with sender and attachment facts. The
path is `MemoryIngestInputProcessor` → `MemoryManager.ingestUserMessage` →
`buildNativeUserMessageTrace` → `RawTraceItem`. These keys are presentation
correlation facts, not raw trace IDs, turn IDs, retry permits or a durable queue.
Only nonblank strings are retained; surrounding whitespace is trimmed, while
case and interior characters are preserved. Other trace kinds do not acquire
user-input identity fields.

The ordinary raw codec preserves those known optional fields. Older keyless
rows remain readable and unknown: do not infer keys from text, time, position,
raw IDs or hashes. This is correct **future writing and reading**, with no
migration, backfill, old-live-input retrofit or startup gate. Same-turn recovery
does not ingest held input a second time. Live pending state can therefore join
new saved history after a renderer reload on the same native instance; a backend
restart still does not promise recovery of the in-memory queue.

## 5. Accepted Replacement And Commit Point

A successful replacement summarizes the prior compacted region plus a nonempty
selected settled raw prefix, then retains the planned recent units. Framework
validation checks required leading system messages, media, provenance,
complete tool protocol, zero/one compacted-memory region and final fit. The
strategy neither assigns persistent output IDs nor writes storage.

Publication is owned by `MemoryManager` and `AcceptedCompactionCommitter`:

1. Recheck operation/attempt identity and baseline fingerprint; copy and validate
   the finalized context and serialize the complete snapshot.
2. Prepare/copy and validate the selected raw archive while active evidence is
   still intact; collect retained raw IDs and check cancellation.
3. Atomically replace `working_context_snapshot.json` — the durable commit point.
4. Install the already-owned context, clear the pending operation and set the
   threshold episode without intervening validation, I/O or caller callbacks.
5. Prune prepared active raw records afterwards. Prune failure is diagnostic:
   active duplicates may remain, but committed success is not reclassified.

Failure before snapshot replacement does not publish a new live context or
summary. Prepared archive evidence can remain; no deletion of active evidence
is required before the commit point. Completed/failed/stopped observations are
terminal-latched; late output after cancellation cannot reopen or commit the
operation. This is per-file atomic replacement, **not** multi-file transaction,
whole-machine-power-loss durability, or a universal shutdown guarantee.

## 6. Versionless Snapshot And Restore

New snapshots write exactly:

```json
{ "agent_id": "...", "messages": [] }
```

The normal reader projects current known fields. Obsolete root `schema_version`
and extra root fields have no admission meaning; current identity, message
shapes, provenance, media and tool facts remain mandatory. A historic payload is
not admitted merely because its root version is ignored. Zero or one compacted
region is validated without opening category or lineage files.

Explicit existing-run restore requires a snapshot. Bootstrap decodes the safe
current shape and identity, installs it for ordinary active-raw tool-protocol
repair, then fully validates and saves the repaired current snapshot. It does
not invoke compaction or regenerate a summary merely to reopen a run.

For each unmatched native tool call, `(turn_id, tool_call_id)` is the durable
identity. A matching committed active-raw result is reused. Otherwise ordinary
repair appends one canonical interrupted result and reconstructs its provider-
safe message. Repeated repair converges; an abandoned tool is not assumed to
have succeeded. Archived raw history is not replayed as new conversation work.
New-run initialization remains a separate path.

The active JSONL reader preserves complete earlier records and truncates only a
malformed final physical record from a partial append. Earlier malformed records
remain integrity errors; relaxing root-version handling does not relax raw facts.

Provider-native assistant-turn metadata (`provider_native_assistant_turn`, for
example Anthropic's ordered text/thinking/redacted-thinking/`tool_use` blocks)
remains private working context. Memory stores it as an opaque provider-tagged
value after the provider's policy validated it against the executable tool calls
(`nativeTurnMetadata` in `src/llm/provider-native/`); memory code contains no
provider-specific rules. The native history is append-only between compactions:
earlier turns, including their signed reasoning, are replayed unchanged across
tool continuations and new independent turns so provider prompt caches read the
whole previous history. Text-only replies are stored without a native turn.

Reasoning that a provider binds to the request prefix is removed only when the
request would otherwise be rejected. `LLMRequestAssembler` computes a digest of
the leading system run and the exact tool schemas it will send, after compaction
and before the request recovery checkpoint, and calls
`MemoryManager.bindRetainedReasoningToRequestPrefix(digest)`. When the digest
differs from the previous request of this in-memory agent (a tool definition or
the leading system prompt changed, for example after a Settings or tool-schema
reload), or on the first request after the agent was created or restored (the
digest is not persisted), all prefix-bound reasoning is removed once through
`messageWithoutPrefixBoundReasoning` and the stripped context is persisted before
the checkpoint, so a failed request cannot restore it. Otherwise nothing is
rewritten. The guard also runs on tool continuations. Compaction is deferred
while a tool continuation is active; accepted client-authored compaction removes
stale prefix-bound reasoning and validates protocol. Outward events must not
project private metadata. This does not add a root snapshot version; stored
snapshots keep the same key and value shape.

## 7. Files And Frozen Historical Migration

Current native writes use `working_context_snapshot.json`, active raw traces,
`raw_traces_manifest.json` and immutable `raw_traces_<index>.jsonl` archives.
`episodic.jsonl`, `semantic.jsonl` and `compaction_lineage.jsonl` are not current
write/restore dependencies; existing files remain inspectable historical data.
There is no new migration for the direct summary/versionless-writer cutover.

The already-registered server migration
`20260731_migrate_native_working_context_snapshots_v5` remains a historical
converter with a **frozen migration-owned** codec, independent of the relaxed
runtime reader. Exact native location/identity classification, missing-snapshot
no-op and nonempty-lineage byte-preservation eligibility remain unchanged.
Absent/empty-lineage historical v1/v3/v4/strict-v5 inputs use same-location active
raw backing; unsupported/unsourced/old-compacted/incomplete units are omitted,
and the frozen candidate is validated before replacement and obsolete category/
manifest cleanup. Raw evidence and lineage are not rewritten by conversion.

Before that conversion, an exact current versionless successor shape with the
correct identity is preserved **whole-location byte-for-byte**, including valid
pending tool intents, partial result batches and raw-ahead recovery states. This
is a frozen shape guard, not request-ready full validation; normal bootstrap owns
repair. Invalid versionless-current data fails per item without falling through
to historical conversion-to-empty. Migration warnings/failures remain recorded
and retryable while startup continues. Do not reset a successful migration ledger
or invent another historical reader to force the cutover.

## 8. LLM Request Recovery Boundary

`MemoryManager` exposes the named LLM request recovery API. The
`LLMRequestAssembler` first completes any pending compaction, then captures the
stable post-compaction checkpoint immediately before request-specific context
mutation and returns it in `RequestPackage`:

1. an assembly failure after capture restores locally;
2. a provider/stream failure restores through `LlmPhase`; and
3. normal final output, real Tool ingestion, and supported retained interruption
   release the exact captured checkpoint without restore.

The recovery snapshot is limited to active working context and compaction
state. Restore persists the recovered working-context snapshot and appends a
correlated `llm_request_recovery` raw trace with the request id, reason, and
source event. Raw traces and tool facts committed before the request remain
durable. An accepted compaction is never rolled back. Every returned checkpoint
settles exactly once; recovery returns one diagnostic and does not retry or
select a fallback model.

## 9. Shared Readable Value And Tool Policy

`ReadableValueRenderer` and `CondensedToolCallRenderer` are core-owned,
consumer-neutral presentation policies. They provide deterministic
serialization, secret/backend-field redaction, and explicit head/tail omission
with an omitted-character count. `ProviderSafeCompactionText` owns the shared
derived-copy Unicode invariant and surrogate-safe slice/end-truncation
boundaries. The policy never mutates the canonical input value.

Native compaction and generated Work Evidence reuse this value/tool body policy
but keep separate sources and envelopes:

- compaction renders selected WorkingContext units with its smaller bound,
  target-agent separators, and XML boundary; and
- Work Evidence renders canonical raw-backed historical events with timestamps,
  Markdown files/manifests, and a 20,000-character per-value bound.

Work Evidence is derived and regenerable. Native compaction never reads its
Markdown or manifest as model input or provenance evidence.

## 10. Raw Traces, Event Monitor, And External Runtimes

An agent-to-agent delivery (`input_origin: inter_agent_delivery`) is recorded
as an ordinary `user` raw trace plus its sender: `MemoryIngestInputProcessor`
passes `resolveInterAgentSenderId(metadata)` (the input's `sender_agent_id`) to
`MemoryManager.ingestUserMessage`, which stores it as the trace's `sender_id`.
Every other input records no sender. Replay uses it to show the delivery as
"From <Sender>:" instead of a user message; traces recorded before this field
keep the user presentation (see the server `run_history.md`).

Raw traces remain original activity evidence. Successful native compaction may
move selected settled records from active storage to one completed archive
without changing their identity/content.

The exact AutoByteus-owned instruction string supplied to a runtime is recorded
as a run-scoped `system_instruction` raw trace. Its persisted schema is closed
to exactly `id`, `ts`, `trace_type: "system_instruction"`, `content`, and
`source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED"`; it deliberately has no
`turn_id` or `seq`. Native capture happens only after the final prompt has been
successfully configured, including the terminal configured-skills catalog.
Server adapters apply the same storage contract to the exact Claude SDK
`options.systemPrompt` and Codex thread `baseInstructions` handoff strings.
Provider-owned hidden or subsequently effective context is not observable and
must not be reconstructed or labeled as captured.

`recordSystemInstructionSupply(...)` compares the new content with the latest
valid active system-instruction row. Exact equality reuses that row without a
new write or live fact; changed content appends a new row. This is active-file
folding, not a historical backfill, retry ledger, or definition lookup. Existing
runs remain directly readable: absence means the instructions were not
recorded, and malformed system-instruction rows are omitted rather than coerced
into turn traces.

Event Monitor and normal active-history paging remain active-raw views; archived
records are accessed only by evidence projection or explicit inspection paths.
System-instruction rows participate in physical rotation with the active raw
evidence preceding a native compaction boundary, but they are never selected as
turn-scoped compaction input. Once rotated, they honestly disappear from normal
Activity hydration; explicit raw-trace archive inspection remains available.
Event Monitor conversation/count/cursor policy excludes the run-scoped row,
while Activity may render it inside the same bounded active-file horizon.

Codex and Claude use server raw-trace-only memory recording. They share the
native raw-trace and rotation primitives but do not construct, load, or persist
an AutoByteus `WorkingContext` snapshot and do not execute AutoByteus direct
working-context compaction. Provider thread/session state remains the
continuation authority. Provider/session compaction boundaries can append
provenance markers and rotate raw traces; they do not run native
compression, write episodic/semantic memory, resolve or inject AutoByteus compacted
memory, or change provider session state. The server owns the
metadata-classified, best-effort startup cleanup for pre-cutover external
snapshot copies. A separate exact-native startup migration converts eligible
absent/empty-lineage snapshots to strict v5 without making external snapshots or
imported corpora native continuation state.

## 11. Runtime Settings And Provider Boundaries

| Setting | Meaning |
| --- | --- |
| `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` | Optional JSON tuple `{modelIdentifier, llmConfig}`. Null model uses the then-current parent identifier; null config uses selected-model defaults. |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Optional post-response threshold ratio override. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Optional effective context budget override. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Detailed diagnostics. |

Absent model settings select defaults without writing a setting. The server
clones selected-model defaults and applies permitted generation overrides, then
forces the approved system prompt, no stop sequences, controlled request fields
and tool-free single-attempt transport. The hard output cap is a positive
configured/default cap (fallback 8192), clamped to advertised model capacity.
Credential-bearing and request-control values are not arbitrary model overrides.
The active-context token override has an explicit public numeric-setting exception
to server credential-name protection; the remaining credential checks stay in force. No parent LLM instance, tools,
conversation state or parent retry policy is mutated.

See [server memory ownership](../../autobyteus-server-ts/docs/modules/agent_memory.md),
[settings](../../autobyteus-web/docs/settings.md#server-settings-working-context-compaction)
and [frontend recovery/activity](../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity).

## 12. Key Source Owners

- `src/memory/compaction/compression-strategy.ts`
- `src/memory/compaction/direct-llm-compression-strategy.ts`
- `src/memory/compaction/compaction-content-builder.ts`
- `src/memory/compaction/compaction-summary-prompt.ts`
- `src/memory/compaction/compaction-summary-parser.ts`
- `src/memory/compaction/pending-compaction-executor.ts`
- `src/memory/compaction/accepted-compaction-builder.ts`
- `src/memory/compaction/accepted-compaction-committer.ts`
- `src/memory/memory-manager-compaction-coordinator.ts`
- `src/agent/compaction/compaction-recovery-controller.ts`
- `src/memory/working-context-snapshot-serializer.ts`
- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
- `src/memory/migration/native-working-context-snapshot-shapes.ts`
- `src/memory/presentation/unicode-safe-text.ts`

Server composition is in
`autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts`;
startup conversion and its ledger remain in `src/app-data-migrations/` there.
