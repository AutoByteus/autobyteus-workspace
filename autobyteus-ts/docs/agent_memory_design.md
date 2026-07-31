# Autobyteus Agent Memory Design

## 1. Purpose

AutoByteus memory has three distinct concerns:

1. **Working context** — the ordered logical messages used to prepare the next
   LLM request.
2. **Raw traces** — append-oriented audit/provenance records used for inspection,
   replay, and archive rotation.
3. **Durable compacted memory** — episodic and semantic records produced by the
   current structured compaction strategy and projected back into working
   context when needed.

Working-context compaction is now a replaceable context-to-context operation:

```text
current WorkingContext
  -> resolve configured WorkingContextCompactionStrategy
  -> strategy.compact(detached WorkingContext)
  -> framework validation
  -> MemoryManager.replaceWorkingContext(next)
  -> next LLM request
```

The framework owns safe invocation and replacement invariants. Each strategy
owns its planning and memory algorithm.

## 2. WorkingContext Domain Object

`WorkingContext` is the in-memory subject of compaction. It contains only ordered
`Message` values. It does not contain an epoch, last-compaction timestamp,
strategy id, pending operation, episodic/semantic data, checkpoint, or storage
state.

The object supports:

- construction from messages;
- append/replace helpers for user, assistant, tool-call, and tool-result
  messages;
- `buildMessages()` for a detached message list; and
- `copy()` for a distinct detached context.

Construction, append, replacement, exposure, and copy recursively clone mutable
message structures, including media lists, metadata/provenance, tool payloads,
tool arguments/results, provider-native tool context, typed arrays, maps, and
sets. A strategy therefore cannot mutate the live manager-owned context through
an input alias.

`MemoryManager` remains the sole live-context owner:

- `getWorkingContext()` returns a detached copy;
- `replaceWorkingContext(context)` installs a copy and persists it;
- normal ingestion appends messages and persists through the manager;
- the manager does not select, construct, or execute a strategy.

The old runtime name `WorkingContextSnapshot` was removed. “Snapshot” remains a
persistence concern in `WorkingContextSnapshotSerializer`,
`WorkingContextSnapshotStore`, and bootstrap file names.

## 3. Persisted Snapshot Contract

`working_context_snapshot.json` remains schema version 4. New writes contain:

```json
{
  "schema_version": 4,
  "agent_id": "...",
  "messages": []
}
```

New writes omit `epoch_id` and `last_compaction_ts`. Existing schema-v4 payloads
that contain those extra fields remain directly usable because validation and
deserialization require only the version, agent id, and message array. No
migration, compatibility branch, or dual-write path is needed. After an ordinary
write, the payload contracts naturally to the current shape.

`WorkingContextSnapshotBootstrapper` restores the `WorkingContext` directly when
the stored payload is valid. If it must rebuild from durable episodic/semantic
memory and recent raw traces, it uses the shared compacted-memory projector for
the durable-memory portion and the restore-owned raw-trace recovery projector
for recent continuation. Tool-protocol repair still runs before the next LLM
request.

## 4. Compaction Timing And Safe Point

Post-response budget evaluation uses provider-reported input/prompt usage and the
configured compaction ratio/context budget.

- A response with no tool calls may execute requested compaction immediately.
- A response with tool calls records a pending request but waits until normal
  tool execution has produced and ingested matching terminal results.
- Pending compaction runs before the next provider request is assembled.
- Compaction never runs across an incomplete tool-call/result group.

The pending request carries a stable `compaction_operation_id` and the original
requested turn id. The later execution turn id is lifecycle metadata; it does not
replace the operation identity.

## 5. Strategy Contract

Every strategy implements:

```ts
interface WorkingContextCompactionStrategy {
  readonly id: string;
  readonly name: string;
  compact(workingContext: WorkingContext): Promise<WorkingContext>;
}
```

The method receives no generic budget/options/constraints bag and returns no
memory-update or proposal DTO. Construction-time dependencies are supplied by a
registration callback through `WorkingContextCompactionStrategyConstructionContext`:

- agent id;
- memory store;
- optional compaction-agent runner;
- effective input budget;
- maximum durable item characters; and
- optional diagnostics sink.

This keeps operation-specific dependencies out of the stable transformation
method while allowing a future algorithm to use a different internal plan.

A strategy must return a distinct `WorkingContext`. It may not install the result
or clear the pending request itself.

## 6. Registry, Selection, And Global Setting

`WorkingContextCompactionStrategyRegistry` is narrow registration infrastructure.
A registration contains stable `id`, display `name`, and `create(context)`.
Duplicate/blank registrations are rejected. `list()` exposes only frozen id/name
metadata; it does not expose factories or select an implementation.

`defaultWorkingContextCompactionStrategyRegistry` currently registers exactly
one production strategy:

| ID | Name | Status |
| --- | --- | --- |
| `structured-json` | `Structured JSON` | Default and only production registration |

`WorkingContextCompactionStrategyResolver` resolves at each pending operation:

1. `CompactionRuntimeSettingsResolver` reads
   `AUTOBYTEUS_COMPACTION_STRATEGY` from the current process environment;
2. blank/unset normalizes to `structured-json`;
3. the registry registration is located;
4. the registration constructs the strategy from the active execution context;
5. returned identity must match the registration.

Because selection occurs per operation, a validated server-settings update
applies to subsequent compactions for already-created agents. Strategy selection
is process-global. It is intentionally absent from `AgentConfig`, agent/team/run
configuration, `AgentFactory` public API, and `WorkingContext`.

Server `ServerSettingsService` persists
`AUTOBYTEUS_COMPACTION_STRATEGY` through the existing `.env`/`process.env`
setting path and validates the normalized value against production registry
metadata. The server also exposes a read-only GraphQL catalog containing only
registry `{ id, name }` metadata and a separate effective-selection read that
uses the same normalization policy as runtime. Settings -> Server Settings ->
Basics uses those two authorities for its Compaction strategy selector: the
catalog supplies available options, while the effective read supplies the clean
selected-ID baseline. The web client never derives a default from catalog order
or hard-codes a strategy option.

## 7. PendingCompactionExecutor Ownership

`PendingCompactionExecutor` owns only the pending-operation lifecycle:

1. exit if no request is pending;
2. resolve the current global strategy;
3. capture a detached baseline and a separate strategy input;
4. emit `started` with operation/turn and strategy id/name metadata;
5. await `strategy.compact(strategyInput)`;
6. validate the returned context against framework invariants;
7. ask `MemoryManager` to replace/persist it;
8. clear the request; and
9. emit `completed`.

It does not know the structured strategy's prefix/suffix plan, episodic or
semantic schema, JSON prompt/response, tool-result condenser, retrieval limits,
or durable-memory projection.

If resolution, construction, execution, validation, or manager replacement
throws, the executor emits `failed`, does not emit `completed`, and does not clear
the pending request. The original context remains installed through all
pre-replacement failures. The existing replacement/persistence ordering is not a
new transaction; if replacement itself throws, no new rollback guarantee is
claimed.

## 8. Framework Output Validation

`WorkingContextCompactionOutputValidator` runs after every strategy and before
installation. It enforces mechanically universal rules:

- result is a `WorkingContext`;
- result is not the strategy input instance;
- every returned message has a valid role/payload shape;
- the complete leading system-message run is preserved byte-for-byte by logical
  message value; and
- tool protocol is complete and provider-renderable.

Tool-protocol validation rejects:

- orphan or duplicate tool results;
- incomplete assistant call/result groups;
- blank or duplicate call ids in one batch;
- mismatched call/result tool names;
- blank tool names;
- role/payload mismatches; and
- invalid provider-native tool-call context.

Failure reports the stable invariant code (`aliased-context`,
`changed-required-head`, `invalid-message-shape`, or `invalid-tool-protocol`).
Semantic sufficiency, compression quality, token reduction, and algorithm-specific
retention remain strategy/test responsibilities rather than generic framework
constraints.

## 9. Structured JSON Strategy

`StructuredJsonCompactionStrategy` preserves the shipped algorithm behind the new
boundary. It owns:

1. current message-unit planning from the complete working context;
2. active-model input budget interpretation;
3. protected/retained suffix and complete tool-unit selection;
4. oversized tool-result condensation through the current planner;
5. the fixed built-in Memory Compactor agent call;
6. JSON result normalization;
7. episodic and semantic item writes;
8. archive/prune of selected raw trace ids;
9. retrieval of up to 3 episodic and 20 semantic items; and
10. reconstruction of a new context through
    `CompactedMemoryContextProjector` plus retained continuation messages.

The exact task prompt retains the required structured final JSON shape before the
conversation content. The result still yields one episodic summary and categorized
semantic facts. The server runner always resolves the built-in
`autobyteus-memory-compactor` definition. Its blank launch fields inherit the
parent run's runtime/model; a missing or invalid built-in definition fails
truthfully without trying an arbitrary agent definition. The former
`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` selector is not part of runtime or
predefined server settings, and a stale environment value is inert.

The strategy reports algorithm diagnostics through the supplied diagnostics
interface. Lifecycle status adds `compaction_strategy_id` and
`compaction_strategy_name`, while existing operation, selected/compacted counts,
runner metadata, and failure details remain available.

No second production strategy is registered. Tests may create an isolated
registry and register test-only strategies to prove the seam.

## 10. Shared Durable-Memory Projection

`CompactedMemoryContextProjector` is deliberately shared by:

- `StructuredJsonCompactionStrategy` after new episodic/semantic writes; and
- restore/bootstrap when reconstructing context from durable memory.

It retrieves the requested episodic/semantic bundle, builds the synthetic
compacted-memory user message with provenance `sourceKind: compacted_memory`,
preserves the system head (or creates one from the system prompt), appends
non-system continuation messages, and returns a new `WorkingContext`.

It is not injected into `PendingCompactionExecutor` or `MemoryManager` and is not
a mandatory dependency for future strategies.

## 11. Raw Traces And Durable Memory

Raw traces remain the audit/store substrate, not the universal strategy input.
Current structured compaction maps working-context provenance back to selected raw
trace ids and archives/prunes those ids after durable episodic/semantic writes.
Other strategies may choose different internal evidence without changing the
executor or manager contract.

The active/rotated raw trace layout remains:

- `raw_traces_active.jsonl`;
- `raw_traces_manifest.json`;
- complete `raw_traces_<index>.jsonl` segments.

Current compacted-memory artifacts remain:

- `episodic.jsonl`;
- `semantic.jsonl`;
- `compacted_memory_manifest.json`.

This ticket does not redesign their physical format, identity, or transaction
ordering.

## 12. Removed Legacy Compaction Path

The production-unused `Compactor.compact(CompactionPlan)` raw-trace/block path was
removed together with its test-only planner/builders/digests/prompts and wrapper
APIs. Removed owners include the old `Compactor`, `WorkingContextCompactor`,
`CompactionWindowPlanner`, `CompactionPlan`, snapshot rebuilder/builder, legacy
summarizer wrapper, and corresponding obsolete tests/exports.

Do not reintroduce aliases or compatibility wrappers for those APIs. New
production strategies implement the context-to-context contract and register one
stable identity.

## 13. Provider Rendering And Tool Safety

Working context remains provider-neutral until the request assembler renders it
through the selected provider adapter. Provider-native tool call context survives
working-context copy, persistence, restore, compaction retention, and the next
request render.

Memory tool-protocol safety still repairs interrupted/incomplete groups before
pending compaction and again before provider dispatch. This complements, rather
than replaces, the compaction-output validator: repair handles recoverable live or
restored context, while output validation rejects an invalid proposed replacement.

### 13.1. LLM Request Recovery Boundary

`MemoryManager` exposes the named LLM request recovery API used by `LlmPhase`:

1. capture a request snapshot before system-prompt insertion, compaction, or
   user/tool-continuation append;
2. commit it only after provider response ingestion succeeds; or
3. restore the working context and compaction state on request assembly or
   provider-stream failure.

The recovery snapshot is limited to active working context and compaction
flags. Restore persists the recovered working-context snapshot and appends a
correlated `llm_request_recovery` raw trace with the request id, reason, and
source event. Raw traces and tool facts committed before the request remain
durable. Recovery returns one diagnostic and does not retry or select a
fallback model.

## 14. External Runtime Recording

Codex and Claude use server raw-trace-only memory recording. They share the
native raw-trace and rotation primitives but do not construct, load, or persist
an AutoByteus `WorkingContext` snapshot and do not execute AutoByteus semantic
working-context strategies. Provider thread/session state remains the
continuation authority. Provider/session compaction boundaries can append
provenance markers and rotate raw traces; they do not select
`AUTOBYTEUS_COMPACTION_STRATEGY`, write episodic/semantic memory, or inject
AutoByteus compacted memory into the external provider session. The server owns
the metadata-classified, best-effort startup cleanup for pre-cutover external
snapshot copies; native `MemoryManager` snapshot behavior in this package is
unchanged.

## 15. Runtime Settings

| Setting | Meaning |
| --- | --- |
| `AUTOBYTEUS_COMPACTION_STRATEGY` | Process-global strategy id resolved for each subsequent pending operation; blank defaults to `structured-json`. |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Optional post-response threshold ratio override. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Optional effective context budget override. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Enables detailed diagnostics. |

A stale custom `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` entry may still be
visible for manual cleanup, but normal compaction code does not read it. The
`structured-json` strategy uses the fixed built-in Memory Compactor and parent
launch fallback described above.

A strategy-setting update is process-local: it updates current process
configuration and persistence, but this ticket does not add multi-process
coordination or reconcile already-running provider sessions.

## 16. Key Source Owners

Domain and persistence:

- `src/memory/working-context.ts`
- `src/memory/memory-manager.ts`
- `src/memory/working-context-snapshot-serializer.ts`
- `src/memory/store/working-context-snapshot-store.ts`
- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
- `src/memory/restore/working-context-recovery-projector.ts`

Strategy framework:

- `src/memory/compaction/working-context-compaction-strategy.ts`
- `src/memory/compaction/working-context-compaction-strategy-registry.ts`
- `src/memory/compaction/working-context-compaction-strategy-resolver.ts`
- `src/memory/compaction/default-working-context-compaction-strategy-registry.ts`
- `src/memory/compaction/working-context-compaction-output-validator.ts`
- `src/memory/compaction/pending-compaction-executor.ts`

Current production strategy:

- `src/memory/compaction/structured-json-compaction-strategy.ts`
- `src/memory/compaction/working-context-message-window-planner.ts`
- `src/memory/compaction/agent-compaction-summarizer.ts`
- `src/memory/projection/compacted-memory-context-projector.ts`
- `src/memory/projection/compacted-memory-message-builder.ts`

Composition and settings:

- `src/agent/loop/llm-phase.ts`
- `src/agent/loop/llm-phase-compaction.ts`
- `src/agent/compaction/compaction-runtime-reporter.ts`
- `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts`
- `autobyteus-server-ts/src/services/server-settings-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/working-context-compaction-strategy.ts`
- `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts`
- `autobyteus-web/stores/workingContextCompactionStrategyCatalog.ts`
- `autobyteus-web/components/settings/CompactionConfigCard.vue`
