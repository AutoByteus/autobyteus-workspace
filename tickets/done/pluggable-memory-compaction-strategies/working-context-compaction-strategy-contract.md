# Working-Context Compaction Strategy Contract

## Status

`Reconciled after Code Review Round 7 / ready for architecture re-review` — the user-approved context-to-context/process-global contract and ARCH-PMCS-005 effective selected-ID read are unchanged. CR-PMCS-009 removes the unsupported ARCH-PMCS-006 desktop rebind premise and returns the Compaction card to the existing simple per-key setting action in its one-node desktop window. It clarifies REQ-PMCS-001, REQ-PMCS-004, REQ-PMCS-005, REQ-PMCS-008, REQ-PMCS-010, and REQ-PMCS-017 through REQ-PMCS-030.

## Scope

This document defines the backend extension architecture completed by this ticket:

- the universal context-to-context strategy contract;
- stable strategy identity and user-facing name;
- a global registry of strategy registrations;
- one global environment-backed strategy selection;
- a bounded server strategy catalog and existing Compaction-card selector using the same registry metadata;
- a separate server effective selected-ID read using the same core normalization/default as runtime;
- reuse of the existing per-key server-setting write for the real one-window/one-node desktop journey;
- operation-time resolution so settings changes apply to all subsequent compactions;
- the one registered current strategy and its fixed built-in Memory Compactor;
- proof that another strategy can later be implemented and registered without refactoring compaction execution or agent configuration.

The ticket does not implement a second production strategy, per-agent strategy choice, generic strategy-configuration schema, arbitrary compactor-agent choice, or separate compaction model/runtime setting.

The stable working-context meaning and examples are defined in `working-context-compaction-domain-contract.md`. The user-visible settings states are defined in `compaction-strategy-settings-ui-ux-spec.md`.

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

The registry is global because it catalogs process-wide strategy kinds, not agent-specific choices or strategy instances. Its tight `id`/`name` enumeration is also the server catalog's authoritative source. It does not gain `configurationKind`, frontend component IDs, a generic settings schema, or mostly-optional strategy configuration metadata.

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

The global registry stores registrations/factories rather than agent-specific strategy instances. This allows server settings and the current UI catalog to enumerate strategies without constructing an agent.

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

- absent or blank setting resolves to `structured-json` through the shared `normalizeWorkingContextCompactionStrategyId` function;
- the server effective-selection read calls that same function and exposes the normalized ID without writing configuration;
- an explicit ID is normalized and looked up exactly; the read returns an explicit unknown ID unchanged so the UI can show it as unavailable;
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

Its global registration constructs the implementation from the construction context and current private collaborators. Missing current compaction-agent runner remains a truthful compaction preparation failure. The runner itself is server-composed to execute only the built-in `autobyteus-memory-compactor`; the strategy cannot be redirected to an arbitrary agent definition through settings.

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

Current worker ownership:

```text
StructuredJsonCompactionStrategy
    -> CompactionAgentRunner
    -> server resolves built-in id autobyteus-memory-compactor
    -> built-in definition's blank launch config inherits parent runtime/model
    -> structured JSON result
```

`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is removed as a predefined/runtime selection. The built-in-agent bootstrap continues synchronizing the Memory Compactor definition but no longer writes a setting default for it. A stale environment value is ignored by normal runtime code. If the built-in definition is missing or invalid, current-strategy preparation fails with that identity named; it never falls back to another visible agent.

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

The existing `compactionAgentRunner` remains an execution dependency already present on `AgentConfig`. It is not a strategy or worker choice: server composition binds it to the built-in Memory Compactor. The active LLM/compaction call site supplies `AgentContext.agentId`, that existing runner, `MemoryManager.store`, the current resolved input budget, `MemoryManager.compactionPolicy.maxItemChars`, and a compaction-owned diagnostics callback/adapter to the resolver's exact construction context. The memory compaction contract does not import the agent-layer `CompactionRuntimeReporter` concrete type.

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

The existing Compaction card writes deliberate setting changes through the existing `ServerSettingsStore.updateServerSetting(key, value)` action and per-key mutation. It does not add a Compaction-specific batch, binding revision, captured-client session, or patch-result API. The removed `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is no longer predefined or read by current compaction. No agent form or agent-definition schema change is needed.

`ServerSettingsService` also owns this read-only method:

```ts
getEffectiveWorkingContextCompactionStrategyId(): string;
```

It obtains the current `AUTOBYTEUS_COMPACTION_STRATEGY` value from `AppConfig` and calls the exported core `normalizeWorkingContextCompactionStrategyId`. It does not validate an explicit unknown into a fallback, consult registry order, or persist the returned default. Therefore absent and blank configuration both read as `structured-json`, while explicit valid and explicit unknown values read as themselves.

## Server Catalog And Frontend Selection

The server exposes a read-only query whose result is derived directly from the registry:

```graphql
type WorkingContextCompactionStrategyOption {
  id: String!
  name: String!
}

type Query {
  getWorkingContextCompactionStrategies: [WorkingContextCompactionStrategyOption!]!
  getEffectiveWorkingContextCompactionStrategyId: String!
}
```

`getWorkingContextCompactionStrategies` maps `defaultWorkingContextCompactionStrategyRegistry.list()` without constructing strategies or reading agent definitions. `getEffectiveWorkingContextCompactionStrategyId` delegates to the ServerSettingsService method above. They are sibling reads: catalog entries remain exactly `{id,name}` and never acquire `isDefault`, `isSelected`, configured value, or factory data.

Frontend data flow:

```text
opened node window's registry catalog -> [{ id, name }]
                              -> CompactionConfigCard option labels/values
ServerSettingsService        -> effective selected ID via shared core normalizer
                              -> ServerSettingsStore clean/dirty baseline
existing generic settings    -> trigger/context/log values
save                          -> existing ServerSettingsStore.updateServerSetting
                              -> one call per changed key, sequentially
```

The frontend uses a binding-aware working-context-compaction strategy catalog store for catalog read state and the existing server-settings store for the effective selected ID plus universal values. The settings read loads generic settings and the effective scalar for one current bound-node revision; stale read responses remain governed by existing generic binding invalidation. On desktop, both read from the server already bound to that node's separate window. These are sibling authoritative subjects; the card coordinates their loaded results without inventing a Compaction-specific save/binding session. It never hard-codes available strategy names/IDs/default, derives the default from catalog order, or fetches the agent-definition catalog.

The card initializes its strategy field and dirty baseline from the effective ID. Absent/blank persisted configuration is therefore a clean `structured-json` state and is not written on load or while saving only a universal field. An explicit unknown ID remains the baseline, appears as unavailable against the catalog, and is replaced only after the user selects and saves a valid ID.

The Compaction card order is strategy, trigger ratio, effective context override, then detailed logs. It handles catalog/effective-selection loading, empty/error, unknown configured ID, validation, dirty/saving/same-node save failure, localization, responsive layout, and accessibility exactly as defined in `compaction-strategy-settings-ui-ux-spec.md`.

Desktop save contract:

```ts
for (const { key, value } of changedValidSettings) {
  await serverSettingsStore.updateServerSetting(key, value);
}
```

The card orders only deliberately changed valid fields, awaits each existing action, and stops at the first thrown server error. Each successful action uses the existing mutation and authoritative settings reload. Full completion leaves the form clean. If a later same-node call fails after an earlier success, the error remains visible, later keys are not sent, failed/unsent draft values remain dirty against the authoritative store, and the card does not claim rollback or whole-card success. The card/save path does not consume generic `settingsBindingRevision` and has no `expectedBindingRevision`, `updateSettingsForBinding`, `BoundServerSettingsPatchResult`, confirmed/unconfirmed key protocol, or previous-node presentation. Existing generic binding-aware read state remains unchanged.

Electron desktop lifecycle is authoritative: `openNodeWindow(nodeId)` focuses or creates a separate window, and window bootstrap binds that window once. Mobile `bindNodeContext(...)` behavior and generic node-binding safeguards belong to another subsystem and are neither extended nor removed here.

## Runtime Composition And Compaction Spine

Global setting path:

```text
registry-backed Compaction card selection
    -> existing Server Settings update
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
3. no manual inclusion in a frontend list—the registry-backed catalog enumerates it;
4. selecting its stable global ID.

It does not require another compaction architecture, discovery API, effective-selection API, Compaction-card option branch, bound-save mechanism, or agent-configuration refactor. If it has genuinely different user-facing configuration, that future product work adds a bounded surface deliberately; the universal registry is not expanded pre-emptively into a generic form schema.

## Failure Semantics

- Absent/blank global value: use `structured-json`.
- Explicit unknown ID: fail the pending compaction and identify the ID; do not replace context or clear success state.
- Selected registration cannot construct because a required runner/dependency is unavailable: truthful compaction preparation failure. For `structured-json`, a missing/invalid `autobyteus-memory-compactor` is identified and there is no arbitrary-agent fallback.
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

- Server settings own persistence/update of the one global environment value and the subject-specific normalized effective selected-ID read.
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
- The server strategy catalog depends only on registry metadata; it does not depend on selected/default state, strategy instances, factories, current-strategy workers, or `AgentDefinitionService`.
- The effective-selection GraphQL field delegates to `ServerSettingsService`, which uses the core normalizer; it does not duplicate the default or write configuration.
- The existing `ServerSettingsStore.updateServerSetting` remains the one-setting web write boundary; the Compaction card may sequence it for changed fields but does not create a second settings-session owner.
- The Compaction card depends on the strategy catalog and server-settings boundaries; it does not depend on the agent-definition catalog, a hard-coded default, Apollo client selection, or binding-revision state.
- The server compaction runner resolves the fixed built-in Memory Compactor identity; no server setting selects its agent definition.

## Approval

The user-approved strategy direction remains unchanged. The ARCH-PMCS-005 read authority remains incorporated above; CR-PMCS-009 removes the unsupported ARCH-PMCS-006 desktop write-session machinery and restores proportionate reuse of the existing setting action. The reconciled contract is ready for architecture re-review.
