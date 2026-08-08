# AutoByteus Agent Memory Design (Node.js/TypeScript)

## 1. Purpose And Authority Boundaries

AutoByteus native memory separates five concerns:

1. **WorkingContext** is the finalized, provider-neutral message sequence used to
   prepare the next LLM request.
2. **Raw traces** are original runtime activity evidence. Active and archived raw
   records remain the authority for what work occurred.
3. **Durable compacted output** is the validated, model-sized episode/semantic
   bundle produced by one successful native compaction.
4. **Compaction lineage** records a successful output bundle, its immediately
   preceding successful compaction, and its execution/prompt audit metadata.
5. **Readable presentation** renders conversation/tool evidence for LLM or human
   consumption without becoming a storage or provenance authority.

The last valid record in `compaction_lineage.jsonl` is the sole current-compaction
head. `working_context_snapshot.json` owns finalized messages and message-local
constituent structure only. There is no mutable current pointer, compacted-memory
manifest, compaction-state file, or snapshot-level compaction identity.

External Codex and Claude runtimes remain storage-only memory producers. Their
provider-owned compaction boundaries may rotate raw traces, but do not create or
inject AutoByteus episode/semantic memory.

## 2. Successful Native Compaction Spine

A pending native compaction follows this ownership sequence:

```text
PendingCompactionExecutor
  -> capture MemoryManager baseline (WorkingContext fingerprint + lineage head)
  -> resolve configured WorkingContextCompactionStrategy
  -> strategy.propose(detached WorkingContext)
  -> MemoryManager.prepareCompaction(baseline, ID-less proposal)
  -> framework validation of the finalized candidate
  -> MemoryManager.commitAcceptedCompaction(candidate)
       1. archive exactly the selected new raw traces as an independent command
       2. persist assigned episode/semantic rows
       3. append one lineage record as the new head
       4. install the finalized WorkingContext
       5. persist the schema-v5 message snapshot
       6. clear the pending operation
```

The pending operation ID is reused as the successful `compactionId`. A strategy
supplies content, selected new raw IDs, retained messages, and execution metadata;
it does not assign durable IDs or write storage. `MemoryManager` assigns output
IDs, verifies that context and lineage baselines are unchanged, constructs the
complete accepted candidate, and owns publication. Raw archive filenames and
descriptors are archive-manager results; they are not accepted-candidate or
lineage fields.

Failures before publication leave output, lineage, snapshot, and installed
context unchanged and retain the pending ID for normal retry. The publication
sequence is ordered and validated but is not crash-atomic across its multiple
files; an early archive or output side effect can remain when a later step fails.
No journal or unsupported recovery inference is implied.

## 3. Strategy Contract And Selection

Every strategy implements:

```ts
interface WorkingContextCompactionStrategy {
  readonly id: string;
  readonly name: string;
  propose(workingContext: WorkingContext): Promise<WorkingContextCompactionProposal>;
}
```

The construction context supplies run identity, the compaction-agent runner,
input budget, per-item bound, and diagnostics. It does not give a strategy the
memory store. The proposal is intentionally ID-less and storage-free.

`WorkingContextCompactionStrategyRegistry` owns registration metadata and
factories. `WorkingContextCompactionStrategyResolver` resolves the process-global
`AUTOBYTEUS_COMPACTION_STRATEGY` for each pending operation. Blank or missing
values normalize to `structured-json`, the only production registration.

The structured strategy uses the fixed built-in
`autobyteus-memory-compactor`. Blank runtime/model fields inherit the parent
run's launch values. `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is not a runtime
selector, and no arbitrary-agent fallback is allowed.

## 4. Recurrent Complete Replacement

Structured compaction implements:

```text
M(n) = compact(M(n-1) + R(n))
```

`M(n-1)` is the output listed by the current lineage head. `R(n)` is a non-empty
set of newly selected, settled raw-backed WorkingContext units. Only `R(n)` is
archived for the new compaction; prior-memory ancestry is represented by
`previousCompactionId` and is never re-archived as new activity.

The proposal is normalized to one complete replacement bundle with at least one
non-empty episode. The Memory Compactor chooses the natural number of episodes
and semantic facts needed for safe continuation. Parser, normalizer, acceptance,
lineage and current projection do not impose a total episode
or fact-count cap; per-entry text bounds, structural validation, cleanup,
deduplication, and positive salience still apply.

The new lineage record lists exactly those assigned output IDs. Current
projection loads only that head's bundle, never a retrieval mix or concatenation
of earlier outputs. Older rows and lineage records remain immutable historical
derivations.

## 5. WorkingContext Finalization

`WorkingContext` contains ordered `Message` values and no durable compaction
state. `MemoryManager` is the sole live-context owner and exposes detached copies
to strategy code.

Before snapshot or provider rendering, `WorkingContextFinalizer` produces one
canonical provider-neutral context that preserves:

- the complete leading system-message run;
- exactly one compacted-memory constituent when a lineage head exists;
- retained/current user content with explicit message-local constituent ranges;
- media payloads; and
- complete assistant tool-call/result protocol and provider-native tool context.

Compatible user regions may be composed into one user message. The stored
provenance describes the structural ranges inside finalized messages; it does
not turn the snapshot into a memory-output or lineage authority.

`WorkingContextCompactionOutputValidator` rejects aliased output, a changed
required system head, invalid message shapes, and incomplete or inconsistent tool
protocol before commit.

## 6. Schema-V5 Snapshot And Restore

Current snapshots have exactly these root fields:

```json
{
  "schema_version": 5,
  "agent_id": "...",
  "messages": []
}
```

Schema v5 persists finalized messages, media/tool structures, and message-local
provenance/constituent ranges. It contains no compaction ID, episode ID, semantic
ID, lineage object, epoch, last-compaction timestamp, or current-state field.
Unknown root fields, invalid structure, missing message provenance, and pre-v5
schemas fail strict validation.

Restore rules are current-only:

- a valid v5 snapshot is restored and checked against whether a lineage head
  exists;
- a lineage head requires a v5 snapshot with exactly one compacted-memory
  constituent;
- no lineage head permits no compacted-memory constituent;
- explicit existing-run restore requires a snapshot and fails when it is absent;
- new-run initialization is a separate product path that creates and persists
  its own current context; and
- archived raw traces are never replayed as current conversation activity.

Tool-protocol repair runs before the next LLM request. Broken current-format
references are integrity failures, not compatibility cases.

## 7. Persisted Files And Current Authority

Run-local native memory uses:

- `raw_traces_active.jsonl` — active original raw activity;
- `raw_traces_manifest.json` — completed raw archive descriptors;
- `raw_traces_<zero-padded-index>.jsonl` — immutable raw archive files;
- `episodic.jsonl` — immutable compacted episode rows;
- `semantic.jsonl` — immutable compacted semantic rows;
- `compaction_lineage.jsonl` — append-only successful-compaction lineage; and
- `working_context_snapshot.json` — finalized schema-v5 messages.

A lineage record contains schema version, explicit standalone/team-member scope,
`compactionId`, optional `previousCompactionId`, exact episode/semantic IDs,
derivation time, runtime / provider / model metadata, policy/prompt versions, and
optional integrity hashes. It does not copy raw IDs/content, an archive filename
or descriptor, prior memory, or rendered prompt content.

Existing schema-v1 rows that include the former `rawTraceArchiveFile` extra field
remain directly readable. Recognized-field normalization ignores that stored
superset field without rewriting the append-only file, introducing a schema
branch, or using it as an output-to-raw origin link. New rows omit it.

`selectionPolicyVersion` remains `1`. Existing prompt-audit value `1` is retained
and read directly, while every new accepted compaction writes
`promptContractVersion: 2` for the natural-sizing/canonical-history contract.
Mixed immutable `1 -> 2` chains are valid without rewriting or decoding earlier
records. Any other prompt-contract value is rejected without mutating the
append-only lineage file.

## 8. Forward-Only Native Snapshot Migration

Server startup migration `20260731_migrate_native_working_context_snapshots_v5`
replaces the superseded destructive reset. The server classifies exact native
standalone and team-member locations, derives the expected `runId` or
`memberRunId`, and runs the existing raw-trace rotation-layout and active-file-name
migrations before native conversion consumes current active facts.

Eligibility is intentionally narrow:

- a missing snapshot is a no-op;
- every nonempty `compaction_lineage.jsonl` location is skipped byte-for-byte
  before snapshot inspection or cleanup; and
- an absent or zero-byte lineage file permits conversion of historical v1/v3/v4
  or strict-v5 snapshot content.

The pure migration converter is the only historical snapshot decoder. It retains
only logical units with truthful same-location active-raw backing, omits
unsupported, invalid, unsourced, old-compacted, and incomplete/ambiguous Tool
units, and may produce a valid metadata-identified `messages: []` snapshot when
nothing survives. A parseable identity conflict rejects the location without
mutation. The complete strict-v5 candidate is finalized and validated before
replacement; only then may the migration remove obsolete `episodic.jsonl`,
`semantic.jsonl`, and `compacted_memory_manifest.json`. Raw traces, raw manifests,
archives, and lineage are never created, rewritten, inferred, or deleted.

Ordinary warning/failure results remain recorded and retryable, but the migration
runner returns them and server startup continues. Normal runtime restores strict
v5 only and has no pre-v5 reader or raw-history recovery projector. The first
successful compaction for a migrated absent/empty-lineage run uses
`previousCompactionId: null`.

## 9. Lineage And Raw-Archive Independence

Compaction lineage is the authority for the current successful output bundle and
its predecessor chain. Raw traces, archive manifests, and immutable rotated files
remain a separate evidence corpus owned by `RunMemoryFileStore` and
`RawTraceArchiveManager`; there is no supported direct or recursive
episode/semantic-to-raw origin resolver or server origin service.

Before output publication, `archiveExactRawTraces(...)` validates and archives
the exact selected active raw IDs. Its stable operation identity is
`native_compaction_selection:<sha256>` where the digest is computed from the JSON
encoding of the sorted selected IDs. The archive manager alone chooses the
manifest descriptor and rotated filename. Completion is required before the
committer proceeds, but neither result is copied into lineage.

Malformed or unsupported lineage, and missing or misordered rows named by the
current lineage head, remain integrity errors. `CurrentCompactionOutputLoader`
validates exact current episode/semantic membership and never opens or resolves
a raw archive.

## 10. LLM Request Recovery Boundary

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

## 11. Natural Compactor Conversation

The built-in `autobyteus-memory-compactor` system prompt owns the stable
summarization instructions, natural episode/fact sizing guidance, and exact JSON
response schema. The per-operation user message is only one renderer-produced
`<conversation_history>...</conversation_history>` block; it does not duplicate
task instructions, schema text, size policy, token settings, or platform
internals.

The compactable logical prefix is rendered as one natural ordered conversation.
Before rendering, `WorkingContextFinalizer` composes the selected visible
messages into canonical turns. A prior compacted-memory region followed by
compatible retained/current user content therefore appears as one `User` turn,
not artificial adjacent user labels. Assistant and tool boundaries remain
ordered.

The renderer omits private reasoning and backend call IDs. Each settled tool
interaction is one `Tool` body containing name, status, arguments, and exactly
one result or error section. Source text that could imitate the reserved outer
boundary is escaped.

The compactor returns only the exact structured JSON contract and may choose any
structurally valid natural output size with at least one episode. Prompt
rendering is not persisted as lineage evidence; an optional SHA-256 digest may
support integrity/audit metadata without copying content.

## 12. Shared Readable Value And Tool Policy

`ReadableValueRenderer` and `CondensedToolCallRenderer` are core-owned,
consumer-neutral presentation policies. They provide deterministic
serialization, secret/backend-field redaction, and explicit head/tail omission
with an omitted-character count.

Native compaction and generated Work Evidence reuse this value/tool body policy
but keep separate sources and envelopes:

- compaction renders selected WorkingContext units with its smaller bound and
  XML boundary; and
- Work Evidence renders canonical raw-backed historical events with timestamps,
  Markdown files/manifests, and a 20,000-character per-value bound.

Work Evidence is derived and regenerable. Native compaction never reads its
Markdown or manifest as model input or provenance evidence.

## 13. Raw Traces, Event Monitor, And External Runtimes

Raw traces remain original activity evidence. Successful native compaction may
move selected settled records from active storage to one completed archive
without changing their identity/content.

Event Monitor and normal active-history paging remain active-raw views; archived
records are accessed only by evidence projection or explicit inspection paths.

Codex and Claude use server raw-trace-only memory recording. They share the
native raw-trace and rotation primitives but do not construct, load, or persist
an AutoByteus `WorkingContext` snapshot and do not execute AutoByteus semantic
working-context strategies. Provider thread/session state remains the
continuation authority. Provider/session compaction boundaries can append
provenance markers and rotate raw traces; they do not select the native
strategy, write episodic/semantic memory, resolve or inject AutoByteus compacted
memory, or change provider session state. The server owns the
metadata-classified, best-effort startup cleanup for pre-cutover external
snapshot copies. A separate exact-native startup migration converts eligible
absent/empty-lineage snapshots to strict v5 without making external snapshots or
imported corpora native continuation state.

## 14. Runtime Settings

| Setting | Meaning |
| --- | --- |
| `AUTOBYTEUS_COMPACTION_STRATEGY` | Process-global strategy ID resolved for each pending native compaction; blank defaults to `structured-json`. |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Optional post-response threshold ratio override. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Optional effective context budget override. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Enables detailed compaction diagnostics. |

Server settings validate the strategy against registry metadata and expose the
catalog and effective selection separately through GraphQL. Updates affect later
pending native operations in the current process; there is no multi-process or
external-provider-session convergence guarantee.

## 15. Key Source Owners

Core domain, acceptance, and publication:

- `src/memory/memory-manager.ts`
- `src/memory/memory-manager-compaction-coordinator.ts`
- `src/memory/compaction/pending-compaction-executor.ts`
- `src/memory/compaction/working-context-compaction-proposal.ts`
- `src/memory/compaction/accepted-compaction-builder.ts`
- `src/memory/compaction/accepted-compaction-committer.ts`
- `src/memory/working-context-finalizer.ts`
- `src/memory/working-context-provenance.ts`

Current strategy and presentation:

- `src/memory/compaction/structured-json-compaction-strategy.ts`
- `src/memory/compaction/working-context-message-window-planner.ts`
- `src/memory/compaction/working-context-compaction-prompt-builder.ts`
- `src/memory/compaction/compaction-conversation-history-renderer.ts`
- `src/memory/presentation/readable-value-renderer.ts`
- `src/memory/presentation/condensed-tool-call-renderer.ts`

Lineage, projection, and restore:

- `src/memory/lineage/compaction-lineage-record.ts`
- `src/memory/store/file-compaction-lineage-store.ts`
- `src/memory/projection/current-compaction-output-loader.ts`
- `src/memory/projection/compacted-memory-context-projector.ts`
- `src/memory/working-context-snapshot-serializer.ts`
- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
- `src/memory/migration/native-working-context-snapshot-v5-converter.ts`
- `src/memory/migration/native-working-context-snapshot-v5-conversion.ts`
- `src/memory/migration/native-working-context-snapshot-v5-omissions.ts`

Server composition and transition:

- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts`
- `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts`
- `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts`
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts`
