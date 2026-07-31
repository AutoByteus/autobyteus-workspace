# AutoByteus Agent Memory Design (Node.js/TypeScript)

## 1. Purpose And Authority Boundaries

AutoByteus native memory separates five concerns:

1. **WorkingContext** is the finalized, provider-neutral message sequence used to
   prepare the next LLM request.
2. **Raw traces** are original runtime activity evidence. Active and archived raw
   records remain the authority for what work occurred.
3. **Durable compacted output** is the bounded episode/semantic bundle produced by
   one successful native compaction.
4. **Compaction lineage** relates a successful output bundle to the immediately
   preceding successful compaction and to one completed raw-trace archive file.
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
       1. archive exactly the selected new raw traces
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
accepted candidate, and owns publication.

Failures before publication leave output, lineage, snapshot, and installed
context unchanged and retain the pending ID for normal retry. The publication
sequence is ordered and validated but is not crash-atomic across its multiple
files; no journal or unsupported recovery inference is implied.

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

## 4. Recurrent Bounded Replacement

Structured compaction implements:

```text
M(n) = compact(M(n-1) + R(n))
```

`M(n-1)` is the output listed by the current lineage head. `R(n)` is a non-empty
set of newly selected, settled raw-backed WorkingContext units. Only `R(n)` is
archived for the new compaction; prior-memory ancestry is represented by
`previousCompactionId` and is never re-archived as new activity.

The proposal is normalized to one complete replacement bundle containing:

- one through three episode summaries; and
- at most twenty semantic facts across the supported categories.

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
- when both snapshot and lineage are absent, bootstrap builds system plus active
  continuation and may retain only the trusted non-blank interruption boundary
  recorded from `AgentTurnInterruptedEvent`; and
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
`compactionId`, optional `previousCompactionId`, a run-relative completed
`rawTraceArchiveFile`, exact episode/semantic IDs, derivation time, runtime /
provider / model metadata, policy/prompt versions, and optional integrity hashes.
It does not copy raw IDs/content, prior memory, or rendered prompt content.

## 8. Clean Pre-Lineage Transition

Server startup runs required app-data migration
`20260730_reset_pre_lineage_memory` before built-in-agent bootstrap, application
construction, or listen. Across standalone and team-member run directories it
deletes only:

- `episodic.jsonl`;
- `semantic.jsonl`;
- `working_context_snapshot.json`; and
- `compacted_memory_manifest.json`.

Active/archive raw traces and `raw_traces_manifest.json` are preserved. Missing
targets are successful no-ops. Discovery or deletion failure records `FAILED`,
remains retryable, and causes `AppDataMigrationRunner.runPending()` and
`startConfiguredServer()` to reject. Existing successful and warning-success
migration results remain startable.

Normal runtime has no reader, fallback, dual path, or inferred provenance for the
removed pre-lineage derived state. The first successful compaction after the
reset creates a head with `previousCompactionId: null`.

## 9. Direct And Recursive Origin Resolution

`CompactionLineageResolver` accepts an explicit artifact selector:

```ts
{ kind: 'episode' | 'semantic', id: string }
```

For a found artifact it returns the producing compaction, its direct completed
raw archive and source interval, optional direct predecessor, deduplicated raw
roots across recursive predecessors, root interval, and derivation time. Unknown
artifact IDs return `not_found`.

Resolution validates lineage shape/cycles, exact output membership, completed
archive status, archive record count and identity bounds, and conflicting raw
root content. Missing or malformed current-format state raises a typed integrity
error; the resolver never guesses or backfills ancestry.

The server `AgentMemoryOriginService` resolves the run-local directory and scope
for standalone or team-member targets, then composes the core resolver. This is
an internal service boundary; no provenance UI is implied.

## 10. Natural Compactor Conversation

The compactable logical prefix is rendered as one natural ordered conversation
inside the reserved application-generated `<conversation_history>` boundary.
It contains the prior compacted-memory user region when present followed by the
selected new user/assistant/tool units.

The renderer omits private reasoning and backend call IDs. Each settled tool
interaction is one `Tool` body containing name, status, arguments, and exactly
one result or error section. Source text that could imitate the reserved outer
boundary is escaped.

The compactor returns only the exact structured JSON contract. Prompt rendering
is not persisted as lineage evidence; an optional SHA-256 digest may support
integrity/audit metadata without copying content.

## 11. Shared Readable Value And Tool Policy

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

## 12. Raw Traces, Event Monitor, And External Runtimes

Raw traces remain original activity evidence. Successful native compaction may
move selected settled records from active storage to one completed archive
without changing their identity/content.

Event Monitor and normal active-history paging remain active-raw views; archived
records are accessed only by evidence, provenance, or explicit inspection paths.

Codex and Claude use the server storage-only recorder. Provider/session
compaction boundaries may append normalized markers and rotate settled active
raw traces. They must not select the native strategy, create episodes/semantics,
resolve or inject AutoByteus compacted memory, or change provider session state.

## 13. Runtime Settings

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

## 14. Key Source Owners

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
- `src/memory/lineage/compaction-lineage-resolver.ts`
- `src/memory/projection/current-compaction-output-loader.ts`
- `src/memory/projection/compacted-memory-context-projector.ts`
- `src/memory/working-context-snapshot-serializer.ts`
- `src/memory/restore/working-context-snapshot-bootstrapper.ts`

Server composition and transition:

- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts`
- `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts`
- `autobyteus-server-ts/src/app-data-migrations/migrations/reset-pre-lineage-memory-app-data-migration.ts`
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts`
