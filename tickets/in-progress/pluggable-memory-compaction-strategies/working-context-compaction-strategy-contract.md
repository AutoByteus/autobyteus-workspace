# Working-Context Compaction Strategy Contract

## Status

`Refined` — the user approved this supplement and the complete solution direction for architecture review on 2026-07-13. Architecture Review Round 1 requested bounded reconciliation of construction, validation, and shared projection ownership under ARCH-PMCS-002 through ARCH-PMCS-004; those revisions preserve the approved context-to-context, process-global direction. This supplement clarifies REQ-PMCS-001, REQ-PMCS-004, REQ-PMCS-005, REQ-PMCS-008, REQ-PMCS-010, and REQ-PMCS-017 through REQ-PMCS-024.

## Scope

This document defines the backend extension architecture completed by this ticket:

- the universal context-to-context strategy contract;
- stable strategy identity and user-facing name;
- a global registry of strategy registrations;
- one global environment-backed strategy selection;
- operation-time resolution so settings changes apply to all subsequent compactions;
- the one registered current strategy;
- proof that another strategy can later be implemented and registered without refactoring compaction execution or agent configuration.

The ticket does not implement a second production strategy or per-agent strategy choice. It integrates the global setting with the existing server-settings persistence path, but a dedicated discovery API and frontend dropdown remain future presentation work.

The stable working-context meaning and examples are defined in `working-context-compaction-domain-contract.md`.

## Exact Strategy Boundary

```ts
export interface WorkingContextCompactionStrategy {
  readonly id: string;
  readonly name: string;

  compact(workingContext: WorkingContext): Promise<WorkingContext>;
}
```

Meaning:

- `id` is the stable machine identity used by global configuration, lookup, persistence, and future APIs;
- `name` is the user-facing name that a future settings screen can present;
- `compact(...)` is the complete business transformation.

The display `name` is never the lookup key. Renaming display text must not invalidate the stored global selection. Both fields are trimmed, non-empty values.

The execution method deliberately does not return:

- `MemoryUpdate`;
- `WorkingContextReplacementProposal`;
- an episodic/semantic DTO;
- files or manifests;
- an operation/commit object;
- an epoch;
- strategy-specific diagnostic metadata.

It deliberately does not accept:

- a generic `constraints` object;
- a preselected prefix;
- a framework-selected suffix;
- a universal tool-condensation result;
- a `MemoryManager` to mutate.

## Why Input and Output Are the Same Type

The business transformation is:

```text
working context before compaction
    -> working context after compaction
```

The outer runtime does not need to know whether a strategy used JSON, Markdown, episodic/semantic memory, a direct summary, workers, files, or no files. A complete returned `WorkingContext` is already an uninstalled replacement.

## WorkingContext Shape

The target `WorkingContext` replaces the current runtime `WorkingContextSnapshot` name and contains only ordered logical messages.

Conceptual shape:

```ts
export class WorkingContext {
  constructor(messages?: Iterable<Message>);

  buildMessages(): Message[];
  appendMessage(message: Message): void;
  replaceMessage(index: number, message: Message): void;
  copy(): WorkingContext;
}
```

Required properties:

- no `epochId`;
- no last-compaction timestamp;
- no strategy identity, selected strategy ID, or strategy state;
- constructor and append operations copy their inputs rather than retaining caller-owned message graphs;
- `replaceMessage(index, message)` is the controlled indexed update used by `MemoryManager` when existing ingestion must enrich a stored message; it validates bounds and copies the replacement;
- `buildMessages()` returns copied messages rather than the internal mutable graph;
- `copy()` returns a distinct context and does not share mutable message, media, metadata/provenance, tool-payload, tool-argument/result, or provider-native tool-call context objects.

Because every distinct `WorkingContext` controls its own deep-copied graph, the runtime validator can reject `next === current`; targeted clone tests prove the class invariant for nested values. Current `MemoryManager.ingestAssistantToolResponse` must replace the enriched latest tool-call message through `replaceMessage` before persistence rather than mutating a `buildMessages()` copy. No public raw-internal-messages escape hatch is added.

## Global Strategy Registry

The global registry exists in this refactor, even though only one production strategy is registered.

```ts
export type WorkingContextCompactionStrategyInfo = Readonly<{
  id: string;
  name: string;
}>;

export type WorkingContextCompactionStrategyRegistration = Readonly<{
  id: string;
  name: string;
  create(
    context: WorkingContextCompactionStrategyConstructionContext,
  ): WorkingContextCompactionStrategy;
}>;

export class WorkingContextCompactionStrategyRegistry {
  register(registration: WorkingContextCompactionStrategyRegistration): void;
  get(id: string): WorkingContextCompactionStrategyRegistration | undefined;
  list(): readonly WorkingContextCompactionStrategyInfo[];
}
```

Registry rules:

1. `register` validates non-empty `id` and `name` and rejects duplicate IDs deterministically.
2. `get` performs exact stable-ID lookup and has no implicit default or fallback.
3. `list` returns identity/display metadata, not factory internals.
4. Enumeration order is deterministic and covered by tests.
5. The registry does not inspect a `WorkingContext`, invoke `compact`, choose a default, read environment variables, manage fallback, or own pending-operation lifecycle.

The registry is global because it catalogs process-wide strategy kinds, not agent-specific choices or strategy instances.

## Construction Callback Boundary

A selected registration creates one operation-scoped strategy for the current pending compaction using dependencies already available at the compaction call site:

```ts
export type WorkingContextCompactionStrategyConstructionContext = Readonly<{
  agentId: string;
  memoryStore: MemoryStore;
  compactionAgentRunner: CompactionAgentRunner | null;
  inputBudgetTokens: number | null;
  maxItemChars: number;
  diagnostics: WorkingContextCompactionDiagnostics | null;
}>;
```

The fields are exact and map to the existing runtime as follows:

| Construction Field | Existing Source At `LlmPhase` Composition | Current Structured Strategy Use |
| --- | --- | --- |
| `agentId` | `AgentContext.agentId` | `AgentCompactionSummarizer.parentAgentId` for child-task lineage |
| `memoryStore` | `MemoryManager.store` | durable episodic/semantic/raw-trace operations and `Retriever` construction |
| `compactionAgentRunner` | existing `AgentContext.config.compactionAgentRunner` | structured JSON compaction task; null remains truthful preparation failure |
| `inputBudgetTokens` | current resolved request input budget | current message-window/suffix planning |
| `maxItemChars` | `MemoryManager.compactionPolicy.maxItemChars` | unchanged deterministic prompt-line bound passed to `AgentCompactionSummarizer` |
| `diagnostics` | compaction-owned adapter over the current reporter/log path | optional selected-unit/count/child-agent metadata; not business output |

The current bounded retrieval values do not belong in this construction context because they are algorithm constants rather than active runtime dependencies. `StructuredJsonCompactionStrategy` declares private named constants `STRUCTURED_JSON_MAX_EPISODIC = 3` and `STRUCTURED_JSON_MAX_SEMANTIC = 20` and passes them to the shared compacted-memory projector. Restore bootstrap retains its existing independently configurable options, whose defaults remain `3` and `20`.

This object is a bounded construction boundary, not the business compaction input:

- it is never stored in `WorkingContext`;
- it is never passed as a second argument to `compact(...)`;
- `PendingCompactionExecutor` does not inspect its strategy-specific fields;
- a registration may ignore dependencies it does not need;
- a future registration may close over additional implementation-owned services when it is registered rather than turning this context into a general service locator.

It shall not gain arbitrary maps, strategy IDs, a `MemoryManager`, an `AgentConfig`, prefix/suffix plans, or strategy-specific option bags. A future strategy that needs a new product-wide service should bind that service in its registration/bootstrap composition unless it is genuinely an operation-scoped dependency shared by registered strategies.

`WorkingContextCompactionDiagnostics` is a narrow compaction-owned callback interface for optional strategy details. The agent-layer reporter may adapt to it, but the strategy contract must not depend upward on the concrete agent reporter.

The global registry stores registrations/factories rather than agent-specific strategy instances. This allows server settings and future UI discovery to enumerate strategies without constructing an agent.

## Global Selection Setting

The single process/server setting is:

```text
AUTOBYTEUS_COMPACTION_STRATEGY
```

Current default and registration:

```text
id:      structured-json
name:    Structured JSON
default: structured-json
```

Rules:

- absent or blank setting resolves to `structured-json`;
- an explicit ID is normalized and looked up exactly;
- an unknown explicit ID never silently falls back;
- the setting applies to every agent/team run using AutoByteus working-context compaction;
- there is no `AgentConfig.memoryCompactionStrategyId` or equivalent per-agent field.

## Global Strategy Resolver

```ts
export class WorkingContextCompactionStrategyResolver {
  constructor(options: {
    registry: WorkingContextCompactionStrategyRegistry;
    settingsResolver: CompactionRuntimeSettingsResolver;
    constructionContext: WorkingContextCompactionStrategyConstructionContext;
  });

  resolve(): WorkingContextCompactionStrategy;
}
```

The resolver owns this exact sequence:

```text
CompactionRuntimeSettingsResolver reads AUTOBYTEUS_COMPACTION_STRATEGY
    -> blank means structured-json
    -> registry.get(strategyId)
    -> explicit error if unknown
    -> selected registration.create(constructionContext)
    -> validate returned strategy identity
    -> WorkingContextCompactionStrategy
```

Resolution occurs for each pending compaction operation, not when an agent is created. Therefore a global settings update affects the next compaction of already-created agents.

The resolver does not execute `compact`, select prefix/suffix, or replace working context.

## Current Registered Strategy

The only production implementation shipped by this ticket is the existing structured-JSON algorithm:

```ts
export class StructuredJsonCompactionStrategy
  implements WorkingContextCompactionStrategy {
  readonly id = "structured-json";
  readonly name = "Structured JSON";

  async compact(workingContext: WorkingContext): Promise<WorkingContext> {
    // Existing structured-JSON behavior moved behind this boundary.
  }
}
```

Its global registration constructs the implementation from the construction context and current private collaborators. Missing current compaction-agent runner remains a truthful compaction preparation failure.

Exact current registration mapping:

```ts
create: (context) => new StructuredJsonCompactionStrategy({
  store: context.memoryStore,
  summarizer: new AgentCompactionSummarizer({
    runner: requireCompactionRunner(context.compactionAgentRunner),
    parentAgentId: context.agentId,
    maxItemChars: context.maxItemChars,
  }),
  inputBudgetTokens: context.inputBudgetTokens,
  compactedMemoryProjector: new CompactedMemoryContextProjector(
    new Retriever(context.memoryStore),
  ),
  diagnostics: context.diagnostics,
});
```

The example is an exact dependency map, not a mandate for positional constructors. It deliberately carries no strategy selection and passes no second argument to `compact(...)`.

Internal current-strategy spine:

```text
WorkingContext
    -> current message-unit/window planner
    -> current recent-suffix budget policy
    -> current structured-JSON compaction agent
    -> current result parser/normalizer
    -> current episodic/semantic store update
    -> shared CompactedMemoryContextProjector with private 3/20 strategy limits
    -> current head + compacted memory + retained suffix WorkingContext
    -> WorkingContext
```

## Shared Compacted-Memory Projection

The current structured strategy and restore fallback both need to turn durable episodic/semantic memory into prompt-ready context. That concern is not private to `StructuredJsonCompactionStrategy`, and it is not universal to every future strategy.

One shared memory projection owner therefore replaces `working-context-snapshot-rebuilder.ts`:

```ts
export class CompactedMemoryContextProjector {
  constructor(
    retriever: Retriever,
    memoryMessageBuilder?: CompactedMemoryMessageBuilder,
  );

  project(input: {
    systemPrompt?: string;
    headMessages?: readonly Message[];
    continuationMessages: readonly Message[];
    maxEpisodic: number;
    maxSemantic: number;
  }): WorkingContext;
}
```

Ownership rules:

- the projector performs bounded retrieval, builds at most one synthetic compacted-memory user message, and returns a detached `WorkingContext` containing preserved/fallback head plus continuation messages;
- `StructuredJsonCompactionStrategy` passes its selected head/retained messages and private `3`/`20` limits after durable memory update;
- `WorkingContextSnapshotBootstrapper` passes the fallback system prompt, recovered raw-trace continuation, and its existing bootstrap limits;
- the current `CompactedMemoryMessageBuilder` moves with this shared projection concern;
- the projector never plans compaction, invokes a strategy, clears pending state, installs live context, or becomes a requirement for unrelated future strategies;
- `PendingCompactionExecutor` and `MemoryManager` never import it.

## AgentConfig And AgentFactory Non-Ownership

No strategy selection is added to `AgentConfig`, agent definitions, team-member configuration, or run configuration.

`AgentFactory` gains no strategy-ID/default branch and does not read `AUTOBYTEUS_COMPACTION_STRATEGY`. Its existing concrete `Compactor` construction is removed as part of deleting the obsolete ownership path; it continues creating the memory store, policy, snapshot store, and `MemoryManager` as before.

The existing `compactionAgentRunner` remains an execution dependency already present on `AgentConfig`. It is not a strategy choice. The active LLM/compaction call site supplies `AgentContext.agentId`, that existing runner, `MemoryManager.store`, the current resolved input budget, `MemoryManager.compactionPolicy.maxItemChars`, and a compaction-owned diagnostics callback/adapter to the resolver's exact construction context. The memory compaction contract does not import the agent-layer `CompactionRuntimeReporter` concrete type.

This preserves the user-facing principle:

```text
create/configure an agent
    -> no memory-compaction-strategy question

global Server Settings
    -> one memory-compaction-strategy choice for the whole system
```

## Existing Server-Settings Path

Current repository behavior is:

```text
frontend/server-settings mutation
    -> ServerSettingsService.updateSetting(key, value)
    -> AppConfig.set(key, value)
    -> update in-memory config
    -> process.env[key] = value
    -> persist key=value to the server .env file
```

This ticket registers `AUTOBYTEUS_COMPACTION_STRATEGY` as a predefined editable setting. Its normalization validates the ID against the global strategy registry at update time.

A future frontend dropdown can use registry `list()` metadata through a bounded discovery API and write the same existing server setting. No agent form or agent-definition schema change is needed.

## Runtime Composition And Compaction Spine

Global setting path:

```text
Server Settings update
    -> ServerSettingsService
    -> AppConfig.set(AUTOBYTEUS_COMPACTION_STRATEGY, id)
    -> process.env + persisted .env
```

Pending operation path:

```text
pending compaction at tool-safe point
    -> CompactionRuntimeSettingsResolver reads current global strategy id
    -> WorkingContextCompactionStrategyResolver
    -> global registry exact lookup
    -> selected registration constructs strategy from agentId/store/runner/budget/maxItemChars/diagnostics
    -> PendingCompactionExecutor receives/uses resolved strategy
    -> MemoryManager.getWorkingContext() returns detached stable baseline
    -> baseline.copy() becomes strategyInput
    -> strategy.compact(strategyInput)
    -> next WorkingContext
    -> WorkingContextCompactionOutputValidator.assertValid(baseline, strategyInput, next)
    -> MemoryManager.replaceWorkingContext(next) and persist
    -> success-only pending-request clear and completed event
    -> next LLM request renders replacement
```

The setting/registry/resolver sequence occurs only when compaction is pending. Invalid strategy configuration must not break ordinary non-compacting LLM requests.

## Prefix, Suffix, And Tool Condensation Ownership

The current `WorkingContextMessageWindowPlanner` belongs to `StructuredJsonCompactionStrategy`.

It owns current behavior such as:

- classifying system/head and previous compacted-memory messages;
- grouping matching tool calls/results;
- selecting a compactable settled prefix;
- retaining a recent suffix;
- protecting the current tool-protocol group;
- applying the active input budget to current suffix size.

The deterministic oversized tool-result preparation used by the current agent is also current-strategy internal.

A future strategy may use a different window, compact the whole eligible body, or partition the worktrace. Adding that strategy must not move its selection policy into `PendingCompactionExecutor`.

## PendingCompactionExecutor Boundary

Target responsibility:

```text
if compaction requested
    -> ask global strategy resolver for current selected strategy
    -> capture detached stable baseline from MemoryManager
    -> pass a second detached copy to the strategy
    -> emit started lifecycle
    -> await strategy.compact(strategyInput)
    -> validate returned context against framework-enforceable output invariants
    -> ask MemoryManager to replace returned WorkingContext
    -> clear request
    -> emit completed lifecycle
```

It must not:

- inspect the environment setting or strategy ID;
- query the registry directly or switch on strategy IDs;
- import the current window planner;
- build a `MessageCompactionPlan`;
- retrieve episodic/semantic memory;
- rebuild the current strategy's message layout;
- inspect JSON compaction output;
- choose a fallback strategy.

The executor owns the validation position but delegates invariant logic to `WorkingContextCompactionOutputValidator`. It must not repair an invalid strategy output or install it and rely on later request-time repair.

Depending on `WorkingContextCompactionStrategyResolver` is not algorithm knowledge; it is the global selection boundary.

## Pre-Install Output Validation

```ts
export class WorkingContextCompactionOutputValidator {
  assertValid(
    baseline: WorkingContext,
    strategyInput: WorkingContext,
    next: WorkingContext,
  ): void;
}
```

The validator is a framework compaction boundary, not a strategy and not a result wrapper. It runs exactly once after the selected strategy returns and before the authoritative manager write.

Runtime-enforced checks:

1. `next` is a `WorkingContext` and `next !== strategyInput`.
2. The stable baseline's maximal leading system-message run is present in the same order and is logically deep-equal in all message fields.
3. Every output message has a supported role and a payload shape valid for that role.
4. Every assistant `ToolCallPayload` has nonblank call IDs that are unique within that assistant batch and is followed by exactly one matching tool result for each call before another ordinary message begins.
5. Every tool result matches an open preceding call; no orphan, partial, duplicated, or role-mismatched tool protocol is accepted.
6. A distinct `WorkingContext` is detached by the value's deep-copy constructor/append/replace/copy contract; returning the exact strategy-input instance is rejected explicitly.

The validator throws `WorkingContextCompactionOutputValidationError` with a stable invariant code such as `aliased-context`, `changed-required-head`, `invalid-message-shape`, or `invalid-tool-protocol`. The executor reports that code/message through the existing failed lifecycle. It does not return a validation-result DTO.

Semantic continuation sufficiency, compression quality, size reduction under the selected strategy's budget, and provider-specific render quality are strategy/test-enforced because generic runtime validation cannot prove them without reintroducing algorithm-specific constraints.

## MemoryManager Boundary

Target compaction-facing API:

```ts
getWorkingContext(): WorkingContext;
replaceWorkingContext(workingContext: WorkingContext): void;
```

`getWorkingContext()` returns a detached value. `replaceWorkingContext()` installs and persists a complete value.

`MemoryManager` must not expose or retain:

- `compactor: Compactor | null`;
- a registry, selected strategy, or selected ID;
- strategy construction or selection;
- window planning;
- strategy-specific result processing.

## Future Strategy Addition Proof

A test-only registration proves the architecture without shipping another product option:

```ts
registry.register({
  id: "test-direct",
  name: "Test Direct",
  create: () => new TestDirectStrategy(),
});

process.env.AUTOBYTEUS_COMPACTION_STRATEGY = "test-direct";
```

The test runs the normal pending-execution and next-request path. It does not add a field to `AgentConfig`, edit `AgentFactory` selection logic, or branch inside `PendingCompactionExecutor`, `MemoryManager`, `WorkingContext`, or request assembly.

A future production strategy therefore requires:

1. its implementation and private collaborators;
2. one identified/named registration with its construction callback;
3. inclusion in the registry-backed server setting/discovery list;
4. selecting its stable global ID.

It does not require another compaction architecture or agent-configuration refactor.

## Failure Semantics

- Absent/blank global value: use `structured-json`.
- Explicit unknown ID: fail the pending compaction and identify the ID; do not replace context or clear success state.
- Selected registration cannot construct because a required runner/dependency is unavailable: truthful compaction preparation failure.
- Strategy throws: leave current working context installed and emit failed lifecycle.
- Strategy returns an invalid context: validator identifies the invariant before replacement; leave exact live context and pending request installed, emit failed, and never emit completed.
- Manager persistence/replacement fails: do not clear the request or emit completed; propagate the existing failure path. Atomic durability beyond current manager/store semantics remains outside scope.
- Updating the global setting does not mutate an operation already executing; the next pending operation reads the new value.

## Observability

Compaction operation identity and requested/started/completed/failed phases remain owned by the existing pending-execution/reporter path.

Generic lifecycle logs include the selected global strategy `id` and `name`. Current optional details such as selected-unit count, raw-trace count, semantic-fact count, and compaction-agent metadata remain diagnostics, not the business return.

## Clean API Checks

### Good

```ts
const strategy = strategyResolver.resolve();
const baseline = memoryManager.getWorkingContext();
const strategyInput = baseline.copy();
const next = await strategy.compact(strategyInput);
outputValidator.assertValid(baseline, strategyInput, next);
memoryManager.replaceWorkingContext(next);
```

### Avoid: per-agent selection

```ts
new AgentConfig({ memoryCompactionStrategyId: "structured-json" });
```

### Avoid: algorithm leakage

```ts
const plan = executor.selectPrefixAndSuffix(memoryManager.messages);
const memoryUpdate = await strategy.compress(plan.compactablePrefix);
const replacement = executor.rebuild(memoryUpdate, plan.suffix);
```

### Avoid: manager ownership drift

```ts
await memoryManager.compactor.compactWorkingContext(plan);
```

### Avoid: registry as coordinator

```ts
await registry.compact(selectedId, manager, request, fallbackPolicy);
```

### Avoid: factory selection in AgentFactory

```ts
if (agentConfig.memoryCompactionStrategyId === "structured-json") {
  // Per-agent strategy choice and algorithm branch.
}
```

## Authority And Dependency Rules

- Server settings own persistence/update of the one global environment value.
- `CompactionRuntimeSettingsResolver` owns reading/normalizing the current global value.
- `WorkingContextCompactionStrategyRegistry` owns registration, exact lookup, and metadata enumeration.
- `WorkingContextCompactionStrategyResolver` owns defaulting, exact resolution, and selected registration construction.
- `PendingCompactionExecutor` depends on the resolver, strategy interface, output validator, and `MemoryManager`, never on strategy IDs or current internals.
- `StructuredJsonCompactionStrategy` may depend on current planners, agent adapters, stores, and the shared compacted-memory projector.
- `CompactedMemoryContextProjector` is shared only by the current structured strategy and restore fallback; it is not part of the universal strategy interface.
- `MemoryManager` may not depend on registry, resolver, strategy interface, or concrete implementation.
- `AgentConfig` carries no strategy selection.
- `AgentFactory` carries no strategy ID/default/selection policy.
- A future strategy is added by implementation and registration—not by `if/else` branches in agent construction or execution.

## Approval

The user approved this strategy contract and explicitly authorized architecture review on 2026-07-13. ARCH-PMCS-002 through ARCH-PMCS-004 complete bounded current-behavior construction, validation, and shared projection ownership without changing the approved clean API or global selection model. Architecture re-review is authorized.
