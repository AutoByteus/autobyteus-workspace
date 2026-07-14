# Design Spec

## Current-State Read

The authoritative product base `origin/personal` already ends compaction by replacing the messages held by `MemoryManager`, but its implementation boundary does not match that business outcome. The preserved ticket checkpoint `df7ade6e` contains the superseded first implementation of the backend strategy/registry/validator/projector design. It is useful implementation evidence and the likely rework starting state, but it is not an authorized target until this revised package passes review. Its frontend still exposes arbitrary compactor-agent selection and no strategy catalog/selector, and its server runner still reads the old worker setting.

Current primary path:

```text
LlmPhase threshold evaluation
    -> MemoryManager.requestCompaction
    -> PendingCompactionExecutor
    -> WorkingContextMessageWindowPlanner
    -> MemoryManager.compactor.compactWorkingContext(plan)
    -> structured JSON summarizer
    -> episodic/semantic writes + raw-trace prune
    -> executor-owned Retriever
    -> executor-owned WorkingContextSnapshotRebuilder
    -> MemoryManager.resetWorkingContextSnapshot(messages)
    -> next LLM request renders the reset messages
```

Current ownership problems:

1. `PendingCompactionExecutor` owns current-algorithm decisions before and after the object named `WorkingContextCompactor`. It selects prefix/suffix, passes model input budget to that selection, retrieves episodic/semantic memory, and rebuilds the final messages.
2. `WorkingContextCompactor` does not compact one working context into another. It accepts a prebuilt `MessageCompactionPlan`, produces durable memory side effects, prunes raw traces, and returns an execution-details object.
3. `MemoryManager` correctly owns the live working context but also stores a concrete `Compactor`, mixing state authority with algorithm construction/execution.
4. `Compactor extends WorkingContextCompactor` to preserve a separate `compact(CompactionPlan)` block/raw-trace API that has no production caller. Its planner/builders/prompts remain alive only through exports and tests.
5. Runtime `WorkingContextSnapshot` contains `epochId` and `lastCompactionTs`, even though neither affects runtime behavior. Epoch is not incremented on append and is not checked before replacement.
6. The current concrete algorithm is difficult to replace because a future strategy would have to change executor branches for its own selection and reconstruction model.
7. Global runtime settings already follow `ServerSettingsService -> AppConfig.set -> process.env + .env`; compaction settings are read through `CompactionRuntimeSettingsResolver` rather than agent definitions.
8. The existing Compaction settings card is already a system-level settings surface. Agent creation/configuration has no reason to expose strategy experiments.
9. `AgentConfig` already carries the current compaction-agent runner as an execution dependency. That runner is distinct from the global choice of compaction algorithm; its normal execution contract remains, while server-side agent-definition resolution is tightened to the fixed built-in.
10. Current construction also supplies `parentAgentId: agentId` and `CompactionPolicy.maxItemChars` to `AgentCompactionSummarizer`; current pending execution supplies retrieval limits `3` episodic / `20` semantic. A runner/store/budget-only target would silently change behavior.
11. Current restore fallback directly imports `WorkingContextSnapshotRebuilder` from the compaction folder. Its durable episodic/semantic prompt projection is shared with current compaction and cannot truthfully be private to one strategy.
12. The current path has no pre-install authority that rejects an invalid context returned by a future strategy. Request-time tool repair happens after the proposed success boundary and cannot prove required head preservation or detachment.
13. Current `MemoryManager.ingestAssistantToolResponse` mutates provenance on a `buildMessages()` element and relies on that element aliasing internal state. Tightening `buildMessages()` to deep copies therefore requires a controlled `WorkingContext.replaceMessage` adaptation or the current provenance update would silently stop persisting.
14. `CompactionConfigCard` exposes `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, fetches every visible agent definition, and lists unrelated agents as possible workers. It does not expose `AUTOBYTEUS_COMPACTION_STRATEGY` at all.
15. The core registry already owns deterministic strategy `{id,name}` enumeration and server setting validation already consumes it, but no GraphQL catalog exposes those names to the bound-node frontend.
16. The built-in `autobyteus-memory-compactor` owns the exact structured-JSON instructions and inherits parent runtime/model because its launch config is blank. The arbitrary-agent resolver/bootstrap setting leaks this current-strategy dependency into global product configuration.
17. `ServerSettingsService.getAvailableSettings()` omits an absent/blank predefined strategy value even though the core runtime normalizer treats that state as `structured-json`; the `{id,name}` catalog intentionally cannot supply default policy. The current target therefore lacks one truthful selected-ID read for a fresh node.
18. The desktop lifecycle does not provide the same-window rebinding journey assumed by the previous design. `openNodeWindow(nodeId)` focuses or creates a separate window per node; `20.windowNodeBootstrap.client.ts` initializes that window's node context once; and only the distinct mobile session flow calls `bindNodeContext(...)` in production.
19. The existing web/server setting authority is already proportionate: `CompactionConfigCard -> ServerSettingsStore.updateServerSetting(key, value) -> GraphQL -> ServerSettingsService -> AppConfig`. Sequential per-key writes are non-transactional, so a later same-node failure must not be shown as whole-card success, but it does not justify a Compaction-specific binding/session protocol.

Constraints the target design must respect:

- Preserve the one current structured-JSON algorithm and its logical output.
- Preserve normal tool ordering: tool execution and terminal result ingestion precede pending compaction.
- Preserve `MemoryManager` as the live-context and persisted-snapshot owner.
- Preserve current compaction request phases and next-request rendering behavior.
- Preserve existing episodic, semantic, raw-trace, manifest, and compaction-agent JSON formats.
- Preserve agent definitions/configuration and AgentFactory public construction APIs without adding a strategy field.
- Reuse the existing global settings/AppConfig path rather than creating a per-agent or parallel configuration store.
- Do not add another production strategy, per-agent/per-run strategy setting, arbitrary compactor-agent choice, or generic dynamic strategy form schema.
- Complete the extension seam now with stable strategy IDs/names, a global registry of registrations, one global environment setting, operation-time resolution, existing `ServerSettingsService` persistence/validation, a bounded registry-backed server catalog, and the current Compaction-card selector.
- Preserve exact current construction inputs: active agent identity, store, current runner, input budget, policy-derived prompt item limit, and diagnostics. Keep current 3/20 retrieval values inside the structured strategy.
- Reject structurally invalid strategy output after `compact` and before replacement; do not install then rely on next-render repair.
- Give durable episodic/semantic-to-context projection one shared owner used by the current structured strategy and restore fallback only.
- Bind the current strategy to the built-in `autobyteus-memory-compactor`, preserve parent runtime/model fallback, and remove the predefined/runtime/frontend selection of an arbitrary worker.
- Preserve the Compaction card's trigger ratio, effective context override, and detailed-log controls while adding complete loading/error/unknown-ID/same-node-save/accessibility behavior.
- Expose the normalized runtime-effective strategy ID through one server-owned read that calls the same core normalizer/default as runtime; keep selection/default state out of catalog entries and web constants.
- Reuse the existing per-key `ServerSettingsStore.updateServerSetting` action for changed valid fields. Stop at the first same-node mutation failure, leave failed/unsent values dirty, keep the error visible, and never add or claim a Compaction-specific batch/session/transaction boundary.
- Make the real desktop lifecycle authoritative: one opened node has one node-bound window; opening another node uses its own window. Leave unrelated generic/mobile binding safeguards unchanged.
- Remove epoch rather than inventing a concurrency protocol absent from the current serialized execution path.

## Intended Change

Replace the fragmented boundary with one exact context-to-context strategy API:

```ts
export interface WorkingContextCompactionStrategy {
  readonly id: string;
  readonly name: string;

  compact(workingContext: WorkingContext): Promise<WorkingContext>;
}
```

The current algorithm becomes `StructuredJsonCompactionStrategy`. It owns the existing prefix/suffix planner, budget interpretation, invocation of the fixed built-in Memory Compactor, memory writes, retrieval, and reconstruction and returns one complete `WorkingContext`.

`WorkingContextCompactionStrategyRegistry` registers strategy definitions/construction callbacks, lists stable identity metadata, and resolves an exact ID. `WorkingContextCompactionStrategyResolver` reads the one global `AUTOBYTEUS_COMPACTION_STRATEGY` setting at each pending operation, resolves the registration, and constructs the strategy from exact bounded dependencies already present at the LLM/compaction boundary: `agentId`, `memoryStore`, existing `compactionAgentRunner`, active `inputBudgetTokens`, current `maxItemChars`, and diagnostics. `PendingCompactionExecutor` invokes the resolved interface, validates the returned context through `WorkingContextCompactionOutputValidator`, and coordinates request lifecycle. `MemoryManager` supplies a detached current context and replaces/persists only the validated returned context.

`CompactedMemoryContextProjector` is a shared memory projection used by `StructuredJsonCompactionStrategy` and restore fallback. It performs bounded episodic/semantic retrieval and constructs the compacted-memory user message plus head/continuation `WorkingContext`; it is neither a universal strategy dependency nor an executor concern.

The server maps registry `list()` metadata through a read-only `getWorkingContextCompactionStrategies` query. Separately, `ServerSettingsService.getEffectiveWorkingContextCompactionStrategyId()` applies the shared core normalizer to the current configured value and GraphQL exposes `getEffectiveWorkingContextCompactionStrategyId: String!`. A narrow bound-node catalog store supplies available options; the existing `ServerSettingsStore` loads the effective ID with generic settings. The Compaction card presents strategy first, treats the effective ID as its clean baseline, and persists only deliberate changes. Trigger ratio, effective context override, and detailed logs remain universal controls. The card no longer loads agent definitions or offers a compactor-agent selector.

The card computes only deliberately changed valid fields and sequentially awaits the existing `ServerSettingsStore.updateServerSetting(key, value)` action. Full completion leaves the form clean through existing authoritative reloads. The first thrown same-node error stops later writes, remains visible, leaves failed/unsent values dirty, and prevents whole-card success. No Compaction-specific revision, captured-client, patch-result, confirmed/unconfirmed, rebind, or previous-node state is introduced.

The server compaction runner resolves the fixed built-in `autobyteus-memory-compactor` definition while preserving existing parent runtime/model fallback. `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, its predefined setting/getter/bootstrap default, and arbitrary-definition resolution are removed. A stale environment entry is inert rather than a compatibility input.

No alternate production strategy, per-agent choice, or generic configuration-schema product surface is introduced. The current `structured-json` / `Structured JSON` implementation is registered now, and a test-only second global registration proves that another production strategy appears through the same catalog/selector and normal execution path without another architecture or frontend option branch.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md` | Stable context-to-context meaning, global-vs-agent selection, current partition examples, safe point, epoch decision, and invariant-enforcement split | REQ-PMCS-001–003, 006–007, 013, 019–020, 023, 025–030; AC-PMCS-001–004, 016–017, 019–029 | Defines the invariant business outcome/global ownership and separates them from current-strategy details | User-approved; CR-PMCS-009 reconciled |
| `tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md` | Exact strategy interface, identity/name, global registry/setting/resolver/catalog, effective selected-ID read, fixed built-in current worker, exact construction, pre-install validation, shared projection, selection, and dependency rules | REQ-PMCS-001, 004–005, 008, 010, 017–030; AC-PMCS-001, 005, 009, 013–029 | Governs the complete replacement/registration/discovery/global-resolution boundary while rejecting per-agent selection, arbitrary worker choice, generic forms, registry orchestration, and Compaction-specific save sessions | User-approved; CR-PMCS-009 reconciled |
| `tickets/in-progress/pluggable-memory-compaction-strategies/compaction-strategy-settings-ui-ux-spec.md` | Strategy-first Compaction card, effective/default selection, universal fields, loading/empty/error/unknown-ID states, simple same-node save/error behavior, localization, accessibility, and generic agent-selector removal | REQ-PMCS-017, 019–021, 025–030; AC-PMCS-013, 015–017, 023–029 | Defines the observable one-window/one-node desktop journey over the catalog/settings boundaries | User-approved; CR-PMCS-009 reconciled |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` + `Cleanup`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` + `File Placement Or Responsibility Drift` + `Duplicated Policy Or Coordination` + `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`.
- Evidence: `PendingCompactionExecutor` imports the current planner/rebuilder; `MemoryManager` stores concrete `Compactor`; `WorkingContextCompactor` does not return a context; source reference search found no production caller for the parallel `Compactor.compact(CompactionPlan)` path; and the global Compaction card selects arbitrary agents while bypassing the actual strategy registry.
- Design response: move the complete current transformation behind `WorkingContextCompactionStrategy`, give every strategy stable ID/name metadata, add a global registration registry and operation-time resolver, expose the same registry through a bounded node-window catalog/selector, make the current built-in worker strategy-owned, reuse existing settings persistence, tighten the working-context value, simplify executor/manager responsibilities, and delete obsolete compaction/worker-selection plus unsupported Compaction save-session paths.
- Refactor rationale: adding future strategy conditionals to the existing executor, `AgentConfig`, or `AgentFactory` would preserve the current design pressure and expose a global experimental choice as agent configuration. This refactor must establish implementation, registration, global resolution, execution, and replacement boundaries before a second production strategy.
- Intentional deferrals and residual risk: the current strategy's durable memory writes/raw-trace prune are not crash-transactional with outer context replacement. This ticket encapsulates the behavior but does not redesign it. Provider-session cache reconciliation, a second production strategy, separate compaction model/runtime selection, and generic strategy-specific forms remain outside scope.

### 2026-07-14 User-Approved Product-Surface Reconciliation

| Decision | Design Consequence |
| --- | --- |
| Strategy is the user-facing global choice | Add registry-backed server catalog and strategy-first Compaction-card selector |
| Trigger ratio, effective context override, and detailed logs remain universal | Keep them below strategy with unchanged runtime semantics |
| Arbitrary compactor-agent choice is removed | Delete card agent dependency/selector and the server predefined/runtime/bootstrap selection key |
| `Structured JSON` owns the built-in Memory Compactor | Resolve `autobyteus-memory-compactor` inside server compaction composition; preserve parent runtime/model fallback; no arbitrary fallback |
| Future strategy settings are unknown | Keep registry/catalog metadata at `{id,name}`; do not predict a generic dynamic form contract |
| User reviews written package before handoff | Completed on 2026-07-14; architecture re-review authorized, implementation remains gated on Pass |

### Architecture Review Round 1 Reconciliation

| Finding | Resolution In This Package |
| --- | --- |
| `ARCH-PMCS-001` | Approval state is now consistent: the user approved the completed revised package and explicitly authorized architecture handoff on 2026-07-14. |
| `ARCH-PMCS-002` | Construction context now exactly binds `agentId`, store, existing runner, active input budget, current `maxItemChars`, and diagnostics. Structured registration maps agent ID to compaction-task parent identity, and current 3/20 retrieval limits are named private strategy constants. |
| `ARCH-PMCS-003` | `WorkingContextCompactionOutputValidator` owns runtime-enforceable output checks between `compact` and manager replacement. Invalid head/tool/alias results preserve live context and pending request, emit failed only, and have focused AC-PMCS-019 through AC-PMCS-021 coverage. Semantic/budget/provider quality remains explicitly strategy/test-enforced. |
| `ARCH-PMCS-004` | `CompactedMemoryContextProjector` becomes the shared durable-memory projection owner for current structured compaction and restore fallback. Generic executor/manager and unrelated future strategies do not depend on it. |

### Architecture Review Round 3 Reconciliation

| Finding | Resolution In This Package |
| --- | --- |
| `ARCH-PMCS-005` | `ServerSettingsService.getEffectiveWorkingContextCompactionStrategyId()` reads the current configured value and calls the shared core `normalizeWorkingContextCompactionStrategyId`. GraphQL exposes that scalar separately from the tight `{id,name}` catalog. The card's selection/dirty baseline is the effective ID: absent/blank is clean `structured-json`, explicit unknown stays visible/unavailable, and loading or unrelated saves never persist the default. |
| `ARCH-PMCS-006` | Historical resolution introduced a revision-fenced save based on a hypothetical same-window rebind. CR-PMCS-009 and the production lifecycle audit supersede that premise for this desktop surface; the replacement is recorded below. |

### Code Review Round 7 Reconciliation

| Finding | Resolution In This Package |
| --- | --- |
| `CR-PMCS-009` | The real desktop flow is `Node Manager -> open/focus node-specific window -> bootstrap binds that node -> Compaction card -> existing updateServerSetting per changed key -> ServerSettingsService/AppConfig -> use that node`. Remove the card/save path's consumption of generic `settingsBindingRevision`, plus `expectedBindingRevision`, `updateSettingsForBinding`, `BoundServerSettingsPatchResult`, captured-client checks, confirmed/unconfirmed bookkeeping, rebind/previous-node UI branches, and their dedicated localization/tests. Keep only same-node sequential failure truthfulness. Existing generic read-cache/mobile node-binding safeguards remain outside scope. |

## Terminology

- **WorkingContext:** ordered logical `Message` values used to prepare the next LLM request.
- **WorkingContextCompactionStrategy:** identified/named context-to-context transformation interface.
- **WorkingContextCompactionStrategyRegistry:** global lookup infrastructure for identified/named strategy registrations and their construction callbacks.
- **WorkingContextCompactionStrategyResolver:** operation-time owner that reads the global setting, applies the default, performs exact registry lookup, and constructs the selected strategy.
- **Strategy ID:** stable machine key used for configuration and lookup. The current ID is `structured-json`; user-facing display text is the separate `name`.
- **Strategy catalog:** server read-only projection of registry `{id,name}` metadata used by the Compaction card in the opened node's window. It is not a strategy constructor or generic settings schema.
- **Effective selected strategy ID:** normalized identifier the runtime resolver will attempt for the current server configuration. Absent/blank becomes `structured-json`; an explicit unknown value remains unknown and is not silently resolved.
- **Changed-setting save:** deterministic list of deliberately changed valid fields applied sequentially through the existing one-setting store action. It is not a transaction or new settings API; a later same-node failure stops remaining calls and does not roll back earlier success.
- **Global strategy setting:** `AUTOBYTEUS_COMPACTION_STRATEGY`; one value governs subsequent compactions across the process/server.
- **StructuredJsonCompactionStrategy:** the only concrete implementation in this ticket; the existing built-in Memory Compactor/episodic/semantic algorithm moved behind the interface.
- **Built-in Memory Compactor:** fixed normal agent definition `autobyteus-memory-compactor` used privately by `StructuredJsonCompactionStrategy`; it is not the globally selected strategy and is not a free compactor option.
- **WorkingContextCompactionOutputValidator:** framework authority that rejects mechanically invalid strategy output before live replacement.
- **CompactedMemoryContextProjector:** shared current-memory projection used by structured compaction and restore fallback to retrieve episodic/semantic memory and build prompt-ready `WorkingContext`.
- **PendingCompactionExecutor:** lifecycle coordinator that executes an already-requested compaction and installs a successful replacement.
- **Working-context snapshot:** the persisted representation of `WorkingContext`; this remains a storage/restore term, not the runtime domain-class name.
- **Current-strategy internals:** message units, window planner, budget calculation, JSON prompt/parser/normalizer, memory store/retrieval, and compacted-memory reconstruction.

## Design Reading Order

1. Persisted-data decision: stored message snapshots remain directly usable.
2. Primary spine: threshold request through replacement to next render.
3. Ownership: strategy catalog/setting, registration/resolution, pending lifecycle, transformation, current built-in worker, and live-context replacement are distinct.
4. UI journey: the node-window Compaction card presents the server catalog and universal settings without exposing strategy internals or node-switching machinery.
5. File responsibilities: current algorithm moves behind one registered concrete strategy and obsolete paths are removed.
6. Concrete path mapping and refactor sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: delete the production-unused block/raw-trace compaction API and its exclusively supporting types/tests/exports; replace runtime `WorkingContextSnapshot` with `WorkingContext`; remove epoch/timestamp fields without aliases; remove arbitrary compactor-agent setting/resolver/bootstrap/UI selection; remove the candidate Compaction-specific revision-fenced save API/state/rebind presentation/tests/messages introduced for the unsupported journey.
- Compatibility aliases such as `export { WorkingContext as WorkingContextSnapshot }` or a `Compactor extends StructuredJsonCompactionStrategy` wrapper are prohibited.
- Existing persisted v4 JSON remains directly usable through tolerant current-schema reading; that is not a runtime compatibility branch.
- An old `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` environment entry is an ignored custom extra, not a compatibility input. No runtime fallback may read it.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: 415 `/Users/normy/.autobyteus/server-data/memory/agents/<agent-id>/working_context_snapshot.json` files totaling 82,625,679 bytes. Every inspected payload contains `schema_version`, `agent_id`, `epoch_id`, `last_compaction_ts`, and `messages`; 212 are current schema v4.
- Relevant code-model, serialization, semantic, or physical-store change: runtime class becomes messages-only `WorkingContext`; serializer stops reading/writing `epoch_id` and `last_compaction_ts`. Physical filename, schema version, agent identity, and message representation remain unchanged.
- Normal reader/writer behavior and representative evidence: current v4 validation requires only schema v4, string `agent_id`, and a message array; it ignores extra keys. Deserialization of messages is independent of epoch/timestamp. Normal writes replace the JSON payload.
- Required semantics and invariants under direct use: message order, role, content, reasoning, media, tool payload, and provenance metadata are preserved.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: rewriting 82.6 MB to remove ignored keys provides no semantic benefit and creates unnecessary I/O/corruption risk.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: current-schema old files are a safe stored superset. The normal reader can ignore obsolete fields, and the next ordinary write naturally emits the contracted payload. No dual reader, version branch, maintenance window, or data rewrite is needed.
- Acceptance criteria or design constraints supported: REQ-PMCS-011, REQ-PMCS-014; AC-PMCS-007, AC-PMCS-008, AC-PMCS-010.

Configuration subject:

- Stored subject/location: optional `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` entry in server `.env`/process environment.
- Target normal behavior: no compaction code reads it; `Structured JSON` resolves `autobyteus-memory-compactor` directly through its server runner composition. The server no longer registers the old key as predefined.
- Existing-data decision: `Directly Usable — No Migration` as an ignored extra. The generic Advanced settings surface may show it as a deletable custom key, but it cannot influence runtime.
- Rejected migration/compatibility work: no startup deletion, historical-value conversion, version branch, or fallback read. Those mechanisms provide no correctness benefit and would retain obsolete policy.
- Acceptance criteria supported: REQ-PMCS-026; AC-PMCS-024, AC-PMCS-027.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-PMCS-001 | Primary End-to-End | LLM token-threshold decision | Next LLM provider request using replacement | Agent turn/request lifecycle with `PendingCompactionExecutor` governing pending execution | Proves the refactor spans the real user-visible continuation path |
| DS-PMCS-002 | Primary End-to-End | Agent restore bootstrap | Restored context available to next LLM assembly | `WorkingContextSnapshotBootstrapper` + `MemoryManager` | Proves type/serializer contraction does not break restart |
| DS-PMCS-003 | Return-Event | Strategy success/failure | Compaction activity projection / caller outcome | `PendingCompactionExecutor` + `CompactionRuntimeReporter` | Keeps truthful lifecycle while the business return stays `WorkingContext` |
| DS-PMCS-004 | Bounded Local | `StructuredJsonCompactionStrategy.compact(context)` | New `WorkingContext` | `StructuredJsonCompactionStrategy` | Encapsulates all current algorithm-specific steps |
| DS-PMCS-005 | Bounded Local | `MemoryManager` append/replace | Persisted `working_context_snapshot.json` | `MemoryManager` + snapshot serializer/store | Establishes one live-context/persistence owner |
| DS-PMCS-006 | Bounded Local / Global Selection | Pending compaction with current process environment | Resolved strategy available to execution | `WorkingContextCompactionStrategyResolver` | Proves future strategies plug in through global registration/selection instead of agent config or executor branches |
| DS-PMCS-007 | Primary UI/Settings | User opens/focuses one node's desktop window and saves changed Compaction settings | Authoritative settings on that same node, followed by subsequent compaction or truthful same-node save error | Electron node-window lifecycle + `CompactionConfigCard` + existing `ServerSettingsStore.updateServerSetting` + `ServerSettingsService`/`AppConfig` | Proves global selection is usable through the real desktop journey without a new settings-session owner |
| DS-PMCS-008 | Primary UI/Read | Bound-node Compaction card loads | Catalog names, runtime-effective selected ID, and universal values shown for the same node revision | Strategy catalog store + `ServerSettingsService` effective read + existing `ServerSettingsStore` | Prevents hard-coded options/defaults, stale-node read data, and silent unknown-ID fallback; this read protection is separate from save semantics |
| DS-PMCS-009 | Bounded Local | Structured strategy requests its agent summary | Structured JSON returned by fixed built-in worker | Server compaction runner + built-in agent definition | Keeps current worker private to its strategy while preserving normal agent execution |

## Primary Execution Spine(s)

### DS-PMCS-001 — Requested compaction to next LLM render

```text
LlmPhase threshold policy
    -> MemoryManager records pending compaction request
    -> LLMRequestAssembler / post-response safe point invokes PendingCompactionExecutor
    -> WorkingContextCompactionStrategyResolver reads/resolves global strategy selection
    -> executor retains detached validation baseline and passes baseline.copy() to the strategy
    -> resolved WorkingContextCompactionStrategy transforms strategy input
    -> WorkingContextCompactionOutputValidator validates baseline + strategy input + returned context
    -> MemoryManager replaces and persists returned WorkingContext
    -> PendingCompactionExecutor clears successful request and reports completion
    -> LLMRequestAssembler reads replacement messages
    -> provider renderer sends the replacement context
```

### DS-PMCS-006 — Global strategy registration and operation-time resolution

```text
process bootstrap registers structured-json definition/factory globally
    -> pending compaction begins
    -> CompactionRuntimeSettingsResolver reads AUTOBYTEUS_COMPACTION_STRATEGY
    -> blank resolves to structured-json
    -> WorkingContextCompactionStrategyResolver calls registry.get(selectedId)
    -> explicit unknown ID fails without fallback
    -> selected registration creates strategy from agentId/store/runner/budget/maxItemChars/diagnostics
    -> PendingCompactionExecutor invokes resolved strategy
```

The registry does not receive a working context or execute a strategy. Resolution happens only for pending compaction, so an invalid setting does not break ordinary non-compacting requests.

Exact operation construction contract:

```ts
type WorkingContextCompactionStrategyConstructionContext = Readonly<{
  agentId: string;
  memoryStore: MemoryStore;
  compactionAgentRunner: CompactionAgentRunner | null;
  inputBudgetTokens: number | null;
  maxItemChars: number;
  diagnostics: WorkingContextCompactionDiagnostics | null;
}>;
```

`LlmPhase` binds these fields from `AgentContext.agentId`, `MemoryManager.store`, the existing `AgentConfig.compactionAgentRunner`, the resolved active request budget, `MemoryManager.compactionPolicy.maxItemChars`, and the diagnostics adapter. The structured registration maps `agentId` to summarizer `parentAgentId` and passes `maxItemChars` unchanged. It declares private `maxEpisodic = 3` / `maxSemantic = 20` constants; they are not universal construction or compact-method options.

### DS-PMCS-007 — User selection to subsequent compaction

```text
Node Manager calls openNodeWindow(nodeId)
    -> Electron focuses or creates that node's separate window
    -> window bootstrap initializes the node context once
    -> user opens Server Settings -> Basics -> Compaction
    -> CompactionConfigCard builds a deterministic list of changed valid settings
    -> for each change, await existing ServerSettingsStore.updateServerSetting(key, value)
    -> existing GraphQL mutation -> ServerSettingsService validation -> AppConfig.set
    -> each success reloads authoritative settings; first error stops remaining calls
    -> full success leaves the card clean, or failure leaves failed/unsent values dirty with no whole-card success
    -> next pending compaction reads any successfully persisted global strategy ID
```

The existing setting API is per-key and non-transactional. A successful earlier call remains persisted if a later same-node call fails. The card stops on the first error, keeps that error visible, leaves failed/unsent values dirty, and never claims rollback or whole-card success. Opening another node is a separate-window journey, not a rebind branch inside this save.

### DS-PMCS-008 — Bound-node catalog/settings read

```text
Settings -> Server Settings -> Basics mounts for bound node revision N
    -> WorkingContextCompactionStrategyCatalogStore queries getWorkingContextCompactionStrategies
    -> Server GraphQL resolver maps registry.list() to [{ id, name }]
    -> ServerSettingsStore query loads universal settings
       + getEffectiveWorkingContextCompactionStrategyId for revision N
    -> ServerSettingsService reads current configured value
       -> shared core normalizeWorkingContextCompactionStrategyId
       -> absent/blank => structured-json; explicit value => normalized explicit ID
    -> CompactionConfigCard joins catalog options with effective selected ID for revision N
    -> loading/empty/error/unknown-ID state is rendered truthfully
```

If the generic bound-node context changes, both read stores invalidate revision N and discard late responses. This remains existing/read-side infrastructure and is not a Compaction save session. The card never substitutes a hard-coded `structured-json` option while catalog/effective-selection state is unknown. The effective ID, not persisted-key presence, is the clean baseline: absent/blank configuration is clean and opening the card or saving an unrelated field does not write the default. An explicit unknown ID remains the effective attempted ID and renders unavailable.

### DS-PMCS-002 — Restore to next LLM render

```text
Agent bootstrap
    -> WorkingContextSnapshotStore reads current-schema payload
    -> if valid: WorkingContextSnapshotSerializer deserializes messages and ignores obsolete extra keys
    -> otherwise: restore-only raw-trace projector recovers continuation messages
                 + shared CompactedMemoryContextProjector retrieves durable memory and builds WorkingContext
    -> MemoryManager.replaceWorkingContext(restored/recovered WorkingContext)
    -> tool-protocol recovery validates/repairs through MemoryManager
    -> next LLMRequestAssembler reads restored messages
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-PMCS-001 | A threshold records intent. At a tool-safe awaited boundary, the pending executor captures a stable baseline, passes a detached copy to the strategy, validates the complete return against both, installs it, then the normal request assembler renders it. | pending request, baseline, strategy input, strategy, validated replacement, LLM request | Pending executor for lifecycle/validation position; validator for invariants; MemoryManager for context | trigger budget, status reporting, current strategy internals |
| DS-PMCS-002 | Restore reads a valid persisted snapshot or combines restore-only raw-trace recovery with shared durable-memory projection, installs the resulting `WorkingContext`, repairs protocol if required, and resumes rendering. | persisted snapshot, durable memory, recovered continuation, WorkingContext, MemoryManager | Bootstrapper + shared projector + MemoryManager | schema validation, raw-trace recovery projection |
| DS-PMCS-003 | The executor reports generic requested/started/completed/failed lifecycle. Construction/strategy/validation/replacement failures all remain failed-only; the concrete strategy may emit diagnostics without changing its context return. | operation ID, phase, invariant code, error | Pending executor/reporter | optional counts and child-agent metadata |
| DS-PMCS-004 | The current strategy partitions the context, invokes the structured agent, mutates current durable memory, then asks the shared durable-memory projector to retrieve and construct the next context. | current context, current plan, structured result, durable memory, next context | StructuredJsonCompactionStrategy; CompactedMemoryContextProjector for shared projection only | planner, summarizer, store, projector |
| DS-PMCS-005 | All normal appends and complete replacements pass through MemoryManager and are persisted by snapshot adapters. | live WorkingContext, stored snapshot | MemoryManager | serializer, physical store |
| DS-PMCS-006 | A pending operation reads the current global value, defaults only when absent, looks up the selected registration, and constructs the strategy from the exact active-runtime context. | global strategy ID, registration, agentId/store/runner/budget/maxItemChars/diagnostics, resolved strategy | WorkingContextCompactionStrategyResolver | registry, environment resolver, current runner availability |
| DS-PMCS-007 | Electron opens/focuses one window per node. In that node's window, the card sequences deliberate valid edits through the existing one-setting action; full success is clean, while the first same-node failure stops later calls and remains truthful. | node-specific window, draft, changed-setting list, server setting, authoritative settings | Electron window lifecycle; card for presentation/sequencing; existing ServerSettingsStore/ServerSettingsService/AppConfig per mutation | GraphQL mutation transport, generic error presentation |
| DS-PMCS-008 | The card loads registry metadata, server-normalized effective selected ID, and universal values for one node revision. It uses the effective ID as the clean baseline, renders explicit unknown IDs, and discards stale read responses. | bound node revision, catalog, effective selected ID, universal controls | Registry catalog store + ServerSettingsService effective read + ServerSettingsStore | GraphQL queries, localization/presentation |
| DS-PMCS-009 | The structured strategy invokes the existing runner, which resolves only the built-in Memory Compactor and applies parent runtime/model fallback before a normal no-tools agent run. | built-in agent ID, parent launch fallback, compaction task, structured JSON | Server compaction runner; StructuredJsonCompactionStrategy owns use | built-in definition service, run service |

## Spine Actors / Main-Line Nodes

### DS-PMCS-001

1. `LlmPhase` — detects threshold and prepares per-request orchestration.
2. `MemoryManager` pending request — records compaction intent.
3. `PendingCompactionExecutor` — governs requested execution and lifecycle.
4. `WorkingContextCompactionStrategy` — transforms complete context.
5. `WorkingContextCompactionOutputValidator` — rejects invalid returned context before installation.
6. `MemoryManager` working-context boundary — replaces/persists complete validated result.
7. `LLMRequestAssembler` / renderer — consumes installed messages.

### DS-PMCS-002

1. `WorkingContextSnapshotRestoreStep`.
2. `WorkingContextSnapshotBootstrapper`.
3. Snapshot store/serializer.
4. `WorkingContextRecoveryProjector` for raw-trace fallback only.
5. `CompactedMemoryContextProjector` for shared durable-memory prompt projection.
6. `MemoryManager` replacement/tool-safety boundary.
7. `LLMRequestAssembler`.

### DS-PMCS-006

1. Process/module bootstrap — installs built-in strategy registrations once.
2. `CompactionRuntimeSettingsResolver` — reads the current global environment value for the pending operation.
3. `WorkingContextCompactionStrategyRegistry` — validates/registers definitions and resolves an exact ID.
4. `WorkingContextCompactionStrategyResolver` — owns defaulting, unknown-ID failure, and selected registration construction.
5. `PendingCompactionExecutor` — invokes the returned strategy without inspecting its ID or registration.

### DS-PMCS-007

1. Node Manager / Electron `openNodeWindow` — focuses or creates the selected node's own window.
2. Window node bootstrap — initializes that window's node context once.
3. `CompactionConfigCard` — computes deterministic changed valid settings and sequentially invokes the existing store action.
4. `ServerSettingsStore.updateServerSetting` — owns one key/value mutation and authoritative reload.
5. Existing server-settings GraphQL entry + `ServerSettingsService` — transport and validate one requested value.
6. `AppConfig.set` — updates process environment and `.env` persistence for each successful mutation.
7. Later `CompactionRuntimeSettingsResolver` read — observes the successfully persisted process-global value.

### DS-PMCS-008

1. Bound-node Settings surface and existing `bindingRevision` read state.
2. `WorkingContextCompactionStrategyCatalogStore` for available options.
3. `ServerSettingsStore` for universal settings plus effective selected-ID state.
4. GraphQL catalog, generic settings, and `getEffectiveWorkingContextCompactionStrategyId` reads.
5. `WorkingContextCompactionStrategyRegistry.list()` for options and `ServerSettingsService` plus shared core normalizer for effective selection.
6. `CompactionConfigCard` loading/ready/clean/unknown-ID presentation.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `LlmPhase` | Token observation, trigger decision integration, active runtime composition, request-phase abort handling |
| `PendingCompactionExecutor` | Pending-request precondition, configured-strategy requirement, start/success/failure sequencing, mandatory pre-install validator call, manager replacement call, success-only request clear, generic lifecycle reporting |
| `WorkingContextCompactionOutputValidator` | Runtime-enforceable returned-context invariants: distinct type/identity, unchanged leading head, canonical message/payload shape, complete non-orphaned tool protocol |
| `WorkingContextCompactionStrategy` | Stable ID/name plus complete context-to-context transformation contract |
| `WorkingContextCompactionStrategyRegistry` | Validate/register unique strategy definitions/construction callbacks, exact-ID lookup, deterministic metadata enumeration; no default or execution |
| `WorkingContextCompactionStrategyResolver` | Per-pending-operation global setting read/default, exact registration resolution, selected construction callback, identity validation |
| Working-context compaction strategy catalog GraphQL resolver | Read-only mapping of registry `{id,name}` metadata for the current server; no strategy construction, selection/default, or agent lookup |
| `WorkingContextCompactionStrategyCatalogStore` | Bound-node catalog loading/cache/error/retry/read invalidation; no selected-state, settings persistence, or save-session behavior |
| `ServerSettingsService` | Strategy-setting validation; subject-specific runtime-effective selected-ID read using the core normalizer; generic settings read; per-key update authority |
| `ServerSettingsStore` | Existing universal/effective-ID read state plus one-key `updateServerSetting` mutation and authoritative reload; no Compaction-specific batch/session API |
| `CompactionConfigCard` | Strategy-first presentation, effective-ID dirty baseline, per-field validation, changed-setting list/sequencing, saving/error state; unchanged/default-only values are not rewritten |
| `AppConfig` | Live `process.env` update and `.env` persistence for each successful server-setting mutation |
| `AgentConfig` / `AgentFactory` | Existing runner/memory composition only; explicitly no strategy selection field, default, or ID branch |
| `StructuredJsonCompactionStrategy` | Current algorithm's plan, budget use, fixed built-in Memory Compactor invocation, JSON result, memory update, private 3/20 projection limits, shared projector invocation, strategy diagnostics |
| Server compaction runner / built-in definition resolution | Normal no-tools agent-run execution for fixed `autobyteus-memory-compactor`, with explicit built-in lookup and parent runtime/model fallback; no arbitrary setting/fallback |
| `CompactedMemoryContextProjector` | Shared bounded episodic/semantic retrieval and compacted-memory/head/continuation `WorkingContext` projection for current strategy and restore fallback |
| `MemoryManager` | Live `WorkingContext`, appends, detached capture, complete replacement, snapshot persistence, pending-request state, tool-protocol safety |
| `LLMRequestAssembler` | Request-time system prompt assurance, safe pending execution, user-message append, final message render |
| Snapshot bootstrap/store/serializer | Persisted snapshot validation, physical read/write, restore mapping |

`MemoryManager` is a governing state owner, not a thin facade. `WorkingContextCompactionStrategy` is an authoritative transformation boundary. `PendingCompactionExecutor` is a lifecycle coordinator and owns the validator's exact position while remaining ignorant of setting values, registry entries, and concrete strategy internals. The validator owns framework-enforceable output checks. The registry is indexed lookup/catalog authority; the resolver owns runtime selection/defaulting/construction; the shared projector owns only current durable-memory prompt projection; the catalog API/store own available-option projection; `ServerSettingsService` owns the effective selected-ID projection and each setting write; the existing `ServerSettingsStore.updateServerSetting` owns one web write/reload; the card owns form presentation and sequential changed-field invocation only.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkingContextSnapshotRestoreStep` | `WorkingContextSnapshotBootstrapper` | Agent bootstrap-step integration | Snapshot parsing, fallback projection, manager state |
| `LLMRequestAssembler` compaction call site | `PendingCompactionExecutor` | Executes pending work before render | Prefix/suffix selection or strategy internals |
| `WorkingContextCompactionStrategyRegistry` | `WorkingContextCompactionStrategyResolver` for selection; concrete strategy for behavior | Indexed registration/lookup/enumeration | Environment reads, default/fallback, compaction execution |
| `WorkingContextCompactionStrategyResolver` | Pending compaction lifecycle | Translate global setting + runtime construction dependencies into selected strategy | Context transformation, manager replacement, pending state |
| Server-settings GraphQL entry | `ServerSettingsService` / `AppConfig` | Existing generic settings transport plus effective selected-ID scalar | Registry execution, catalog metadata, or per-agent configuration |
| Strategy-catalog GraphQL entry | `WorkingContextCompactionStrategyRegistry` metadata | Current-server read transport for `{id,name}` | Default/selected state, factories, strategy construction, agent definitions, settings writes |
| `ServerSettingsStore.updateServerSetting` | `ServerSettingsService` / `AppConfig` | Existing one-key web mutation and authoritative reload | Compaction-specific batch/session/revision policy or atomicity claims |
| `CompactionConfigCard` | Strategy catalog + server settings | Existing global settings presentation/coordination | Hard-coded registry/default, direct client mutations, compaction execution, agent-definition selection |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `WorkingContextSnapshot` runtime class/name | Runtime subject is working context, not storage metadata | `WorkingContext` in `memory/working-context.ts` | In This Change | Update source/tests; no alias |
| `epochId` / serialized `epoch_id` | No behavioral consumer; incomplete mutation version | Removed; no replacement | In This Change | Old extra key ignored |
| `lastCompactionTs` / serialized `last_compaction_ts` | No behavioral consumer; not part of message context | Removed; lifecycle events remain authoritative | In This Change | Old extra key ignored |
| `MemoryManager.compactor` constructor/property | State owner must not own algorithm | Global registry/resolver + executor strategy invocation | In This Change | Remove imports/options |
| `Compactor` class/file and `CompactionExecutionOutcome` | Inheritance wrapper preserves obsolete branch | `StructuredJsonCompactionStrategy` | In This Change | No alias/wrapper |
| Current `WorkingContextCompactor` class/file/outcome | Partial side-effect stage does not match domain API | `StructuredJsonCompactionStrategy.compact` | In This Change | Move current logic, then delete |
| `CompactionPlan` / `CompactionWindowPlanner` | Production-unused raw-trace block plan | No replacement | In This Change | Remove tests/exports |
| `InteractionBlock*`, `ToolResultDigest*` | Exclusively support dead planner/prompt path | No replacement | In This Change | Confirm zero references after move |
| `CompactionSnapshotBuilder` / recent-turn formatter | Export/test-only support for dead plan path | No replacement | In This Change | Remove tests/exports |
| `CompactionTaskPromptBuilder` block prompt | Production current path uses message-unit prompt | `WorkingContextCompactionPromptBuilder` inside current strategy | In This Change | Preserve JSON shape constant in appropriate current file |
| `Summarizer.summarize(blocks)` and fallback block conversion | Exists for dead block path | Tight message-unit summarizer dependency in current strategy | In This Change | Keep agent summarizer only for message units |
| `resetWorkingContextSnapshot(...)` runtime name | Encodes storage mechanism and carries timestamp args | `replaceWorkingContext(WorkingContext)` | In This Change | Update tool repair/bootstrap callers |
| `working-context-snapshot-rebuilder.ts` private-compaction placement/name | Its durable-memory projection is also a direct restore dependency | `memory/projection/compacted-memory-context-projector.ts` shared by current strategy and restore | In This Change | Move compacted-memory builder with the shared projection concern; no generic executor dependency |
| `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` predefined setting/export/getter/runtime read | Current worker identity becomes strategy-owned | Fixed `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` lookup in server compaction composition | In This Change | Old `.env` extra is inert; no fallback read |
| Memory Compactor `settingDefault` bootstrap registration | No configurable worker setting remains | Built-in definition sync only | In This Change | Retrospective improver default remains unrelated |
| Arbitrary `CompactionAgentSettingsResolver` selection behavior | Any visible agent can violate structured JSON assumptions | Fixed built-in launch resolver/runner responsibility | In This Change | Preserve parent runtime/model fallback |
| `CompactionConfigCard` agent selector/summary/warning and `AgentDefinitionStore` dependency | Strategy, not worker, is the global user choice | Registry-backed strategy selector + universal controls | In This Change | Remove all-agent fetch from card |
| Compactor-agent localization/test expectations | Describe removed behavior | Strategy/global copy and catalog/error/accessibility tests | In This Change | English + Simplified Chinese |
| Candidate Compaction-save consumption of generic `settingsBindingRevision`, plus `expectedBindingRevision`, `updateSettingsForBinding`, `BoundServerSettingsPatchResult`, captured-client/confirmed-key state, rebind/previous-node card branches, and dedicated messages/tests | They implement the rejected same-window desktop rebind premise | Existing `ServerSettingsStore.updateServerSetting` plus simple card sequencing/error state | In This Change | Remove cleanly; retain unrelated generic binding-aware reads/mobile safeguards |
| Obsolete package exports/tests | Would retain legacy API contract | Current working-context/strategy exports and tests | In This Change | Remove rather than deprecate |

## Return Or Event Spine(s)

### DS-PMCS-003 — Success

```text
strategy returns WorkingContext
    -> WorkingContextCompactionOutputValidator accepts result against baseline and strategy input
    -> MemoryManager replacement succeeds
    -> executor clears pending request
    -> reporter emits completed for existing operation ID
    -> caller receives true / request assembly continues
```

### DS-PMCS-003 — Failure

```text
missing/unknown strategy, construction failure, strategy throw, or invalid returned context
    -> if a context was returned, validator rejects before any manager write
    -> MemoryManager replacement is not called
    -> pending request is not falsely completed/cleared
    -> reporter emits failed for existing operation ID and invariant code when applicable
    -> CompactionPreparationError reaches existing caller handling

or

validated context -> MemoryManager replacement/persistence throws
    -> pending request is not falsely completed/cleared
    -> reporter emits failed; completed is not emitted
    -> existing manager/store durability semantics determine physical state
```

For replacement failure after the manager call begins, current manager/store semantics govern whether persistence partially occurred; the request still remains uncleared and completed is not emitted. Optional selected-unit/raw-trace/semantic/child-agent details are diagnostics. They may be null or emitted by the current implementation through the existing reporter/log path; they must not change the strategy return into a generic wrapper.

Pre-install enforcement split:

| Invariant | Runtime Owner | Failure Code / Coverage | Strategy/Test-Only Portion |
| --- | --- | --- | --- |
| Returned type and distinct instance | Output validator + deep-copy `WorkingContext` value | `aliased-context`; returned-input test plus nested clone tests | None |
| Leading required system/head run unchanged | Output validator | `changed-required-head`; omit/reorder/change tests | None |
| Canonical roles and payload shapes | Output validator | `invalid-message-shape`; role/payload mismatch tests | Supported provider-renderer compatibility tests |
| Complete non-orphaned tool protocol | Output validator | `invalid-tool-protocol`; orphan/incomplete/blank ID/within-batch duplicate ID/duplicate-result tests | None at normal post-result safe point |
| Coherent task continuation | Not generically provable | N/A | Current-strategy deterministic sequential-compaction and broader API/E2E scenarios |
| Bounded compression under selected policy | Not generically provable | N/A | Strategy budget tests and next-request token/render coverage |

The validator receives `(baseline, strategyInput, next)` directly, throws `WorkingContextCompactionOutputValidationError` with a stable invariant code, and returns no DTO. It performs no repair. The stable baseline prevents a strategy mutation of its detached input from redefining required head equality. For construction, strategy, or validation failures, `MemoryManager.replaceWorkingContext` is never called; the exact live context and pending request remain in place, failed is emitted, and completed is not emitted.

## Bounded Local / Internal Spines

### DS-PMCS-004 — Current structured-JSON strategy

- Parent owner: `StructuredJsonCompactionStrategy`.
- Chain:

```text
detached WorkingContext
    -> build current message units
    -> resolve current input budget
    -> select compactable prefix + retained/protected suffix
    -> structured JSON call through fixed built-in Memory Compactor runner
    -> parse/normalize result
    -> write current episodic/semantic items
    -> archive/prune current selected raw traces
    -> call shared CompactedMemoryContextProjector with strategy-private maxEpisodic=3/maxSemantic=20
    -> shared projector retrieves bounded memory and builds compacted-memory USER message
    -> shared projector builds new WorkingContext(head + memory + retained suffix)
```

- Why it matters: selection, planning, JSON generation, durable update, and projection-limit choice are specific to the current algorithm. The final durable-memory-to-context projection is intentionally shared with restore but remains outside generic pending execution and future strategy requirements.

### DS-PMCS-009 — Fixed built-in Memory Compactor execution

- Parent owner: current `StructuredJsonCompactionStrategy` use; server compaction runner governs normal agent-run execution.
- Chain:

```text
AgentCompactionSummarizer submits task
    -> ServerCompactionAgentRunner requests fixed id autobyteus-memory-compactor
    -> AgentDefinitionService loads that built-in definition
    -> explicit built-in launch config or parent runtime/model fallback is resolved
    -> normal no-tools/preloaded-only agent run executes
    -> final structured JSON text returns to current strategy
```

- Why it matters: this preserves the intended normal agent/runtime mechanism while preventing a global UI/environment setting from replacing a strategy-required worker with an incompatible agent. Missing/invalid built-in identity fails; no other definition is tried.

### DS-PMCS-005 — Working-context replacement/persistence

- Parent owner: `MemoryManager`.
- Chain:

```text
returned WorkingContext
    -> copy/detach returned messages
    -> replace manager-owned WorkingContext
    -> serialize schema/agent/messages
    -> write working_context_snapshot.json
```

- Why it matters: strategy never mutates the manager or writes the snapshot directly.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token budget resolver | DS-PMCS-001, 004 | LlmPhase trigger and current strategy planner | Resolve active model input capacity/runtime overrides | Current trigger and suffix budget use same environment | Generic constraints leakage into every strategy |
| CompactionRuntimeReporter | DS-PMCS-001, 003, 004 | Pending executor/current strategy diagnostics | Lifecycle/log emission | User-visible activity and debugging | Result wrapper polluted with diagnostics |
| WorkingContextMessageWindowPlanner | DS-PMCS-004 | Structured strategy | Current prefix/suffix/tool-unit policy | Preserves current algorithm | Executor becomes algorithm-aware |
| Fixed built-in compaction runner/summarizer | DS-PMCS-004, 009 | Structured strategy | Execute current JSON task through `autobyteus-memory-compactor` with parent launch fallback | Current algorithm dependency | Universal UI/contract becomes agent-specific or arbitrary agents violate JSON assumptions |
| CompactedMemoryContextProjector | DS-PMCS-004, 002 | Structured strategy and restore bootstrap | Bounded episodic/semantic retrieval plus synthetic compacted-memory/head/continuation context projection | One behavior is genuinely shared by current compaction and recovery | Declaring it strategy-private forces restore bypass; putting it on generic spine forces all strategies through episodic/semantic memory |
| WorkingContextCompactionOutputValidator | DS-PMCS-001, 003 | Pending lifecycle/framework boundary | Reject enforceable invalid output before manager replacement | Plugin-like strategies are not trusted to self-certify structure | Installing then repairing permits false success and live invalid state |
| Snapshot serializer/store | DS-PMCS-002, 005 | MemoryManager/bootstrapper | Persistence mapping and physical I/O | Restart | Strategies gain live-context persistence authority |
| Tool-protocol repairer | DS-PMCS-002, 005 | MemoryManager restore/interruption paths | Repair recovered or interrupted runtime context before next render | Provider protocol recovery outside successful compaction output | Using it after strategy installation would permit false compaction success; strategy output is validator-rejected instead |
| Global strategy registry | DS-PMCS-006, 007, 008 | Global resolver, server setting validation, and catalog query | Validate/register identities/factories, exact-ID lookup, metadata enumeration | Stable execution and UI extension seam | Registry becomes service locator/orchestrator if it reads settings or executes compaction |
| Global strategy setting resolver | DS-PMCS-001, 006, 007 | Pending executor | Read current environment selection, default, exact resolution, selected construction | One global experimental choice must affect all later compactions | Per-agent config drift or selection branches in executor |
| Strategy catalog GraphQL/store | DS-PMCS-007, 008 | Compaction settings UI | Project registry metadata for the bound node; own loading/error/retry/read invalidation | Frontend must not duplicate or hard-code available strategies | Catalog starts constructing strategies, adding default/selected flags, querying agents, or owning save policy |
| Effective selected-ID projection | DS-PMCS-008 | Compaction settings UI | Use the core normalizer to expose the exact ID runtime will attempt | Generic settings can omit absent/blank values while the UI needs the effective state | Frontend duplicates `structured-json` default or guesses first catalog option |
| Existing one-setting web action | DS-PMCS-007 | Compaction settings UI | Mutate one key through existing GraphQL/service/AppConfig authority and reload authoritative settings | Reuses the existing server-settings path proportionately | Card invents a parallel batch/session API or reports a multi-key loop as atomic |
| CompactionConfigCard | DS-PMCS-007, 008 | Global settings presentation | Join catalog and effective selected ID, validate fields, sequence changed settings, render save/error state | Existing correct product surface | Agent catalog becomes strategy catalog or UI owns default/client/binding policy |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Live working context | `memory/MemoryManager` + current snapshot class | Extend/refactor | Existing correct owner; tighten API/type | N/A |
| Strategy seam | `memory/compaction` | Create New interface | No current context-to-context contract exists | Existing compactor is a partial stage and concrete algorithm |
| Current algorithm | Current planner/summarizer/store plus existing durable-memory projection behavior | Reuse/recompose | Behavior is retained, ownership changes; shared projection is extracted for restore | N/A |
| Pending lifecycle | `PendingCompactionExecutor` | Extend/refactor | Existing request lifecycle owner remains valid | N/A |
| Persistence | Snapshot serializer/store + run store | Reuse/modify | Physical representation remains valid | N/A |
| Registry/selection | Existing repository registry patterns + `CompactionRuntimeSettingsResolver` + server settings/AppConfig | Create global registration registry/resolver; extend current global settings path | Current UI selection and future readiness require stable identity, enumeration, and one process-wide live selection now | No compaction-specific registry exists on the base path |
| Message cloning | `Message` + tool payload types | Extend inside `WorkingContext` | Detached context is required; no reusable clone exists | A dedicated general mapper is unnecessary unless repetition appears |
| Output invariant validation | Canonical `Message`/tool payload types + compaction safe-point rules | Create `WorkingContextCompactionOutputValidator` | No current pre-install authority exists; request-time repair is too late and incomplete | This is framework structural safety, not current algorithm policy |
| Durable-memory prompt projection | Current rebuilder/builder + `Retriever` | Move/recompose as shared `CompactedMemoryContextProjector` | Current strategy and restore already consume the same projection | It is neither restore-private nor a universal strategy requirement |
| Strategy discovery | Core registry `list()` + existing GraphQL conventions | Add bounded read-only catalog query | The registry already owns identity/name; frontend needs the bound server's actual registrations | Generic server setting values cannot supply user-facing names |
| Runtime-effective strategy read | Core strategy-setting normalizer + `ServerSettingsService` + existing GraphQL settings composition | Extend with one subject-specific scalar read | Reuses the single default/normalization policy and current server config without polluting catalog entries | Generic `getAvailableSettings` intentionally omits absent/blank predefined values |
| Bound-node catalog state | Existing `WindowNodeContextStore` binding revision pattern | Add narrow catalog store | Strategy availability belongs to the selected server binary and read state must follow existing binding invalidation | AgentDefinitionStore is the wrong subject and lists incompatible agents |
| Compaction settings save | Existing `ServerSettingsStore.updateServerSetting` -> GraphQL -> `ServerSettingsService` -> `AppConfig` | Reuse directly from the card for each changed valid key | The real desktop window stays on one node; the existing path already owns validation, persistence, process update, reload, and error | A new Compaction-specific patch/session owner would model a nonexistent journey |
| Current structured worker | Built-in agent registry/bootstrap + normal agent-run service | Reuse/tighten | Built-in Memory Compactor already owns exact instructions and normal launch fallback | Arbitrary definition selection is an unsafe policy leak |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent turn/request lifecycle | Trigger integration, exact construction wiring, pending execution, pre-install validation position, abort/error handling | DS-PMCS-001, 003, 006 | LlmPhase / PendingCompactionExecutor | Extend | No concrete strategy imports or strategy-ID branch in LlmPhase |
| Memory working-context domain | WorkingContext value/deep copy, output structural validation, live state, replacement, tool safety | DS-PMCS-001, 002, 005 | WorkingContext / validator / MemoryManager | Extend/refactor | Runtime type becomes messages-only; validator is compaction-boundary safety, not manager-owned strategy policy |
| Memory compaction | Strategy contract, global registry/resolver, and current structured strategy | DS-PMCS-001, 004, 006, 009 | WorkingContextCompactionStrategy + registry + resolver | Extend/refactor | One production registration; selection is global; current worker is concrete-strategy-owned |
| Memory durable-context projection | Bounded episodic/semantic retrieval plus compacted-memory/head/continuation context construction | DS-PMCS-002, 004 | CompactedMemoryContextProjector | Extract/reuse | Shared only by current strategy and restore fallback |
| Memory persistence/restore | Snapshot serialization/store/bootstrap and raw-trace fallback projection | DS-PMCS-002, 005 | MemoryManager/bootstrapper | Modify | Direct-use transition; consumes shared durable-memory projector |
| Server memory recording | Event-derived context accumulation | DS-PMCS-005 | RunMemoryWriter | Modify bounded consumer | Type rename only; no API behavior change |
| Server compaction execution | Fixed built-in definition lookup, parent launch fallback, normal no-tools child run | DS-PMCS-004, 009 | ServerCompactionAgentRunner + built-in definition service | Tighten existing path | Remove arbitrary setting selection; do not change normal agent run semantics |
| Server strategy catalog | Registry metadata GraphQL projection | DS-PMCS-007, 008 | Strategy catalog resolver | Add bounded read boundary | No selection/default, construction, settings update, or agent lookup |
| Server settings | Global setting validation, effective selected-ID read, live+persistent per-key update | DS-PMCS-007, 008 | ServerSettingsService/AppConfig | Extend bounded existing path | Shared core normalizer for read; existing mutation for write; remove compactor-agent predefined setting |
| Web settings | Bound-node catalog/effective read state, existing one-setting write action, and Compaction-card presentation/sequencing | DS-PMCS-007, 008 | Catalog store + ServerSettingsStore + CompactionConfigCard | Extend/refactor | No AgentDefinitionStore, hard-coded default, or Compaction-specific save session |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `memory/working-context.ts` | Working-context domain | WorkingContext | Ordered messages + append/copy/build operations | One domain value | `Message`/tool payloads |
| `memory/compaction/working-context-compaction-strategy.ts` | Compaction | Strategy boundary | Stable id/name plus exact context-to-context method | Singular executable capability | `WorkingContext` |
| `memory/compaction/working-context-compaction-strategy-registry.ts` | Compaction composition | Registry | Global registration definitions/callbacks, exact-ID lookup, metadata enumeration | One indexed lookup concern | Strategy interface/registration |
| `memory/compaction/default-working-context-compaction-strategy-registry.ts` | Compaction composition | Built-in registration bootstrap | Own global default registry and register structured-json once | Avoid registry/concrete circular ownership | Registry + current strategy registration |
| `memory/compaction/working-context-compaction-strategy-resolver.ts` | Compaction composition | Global resolver | Environment-backed default/exact resolution and selected construction | One global selection concern | Registry/settings/construction context |
| `memory/compaction/structured-json-compaction-strategy.ts` | Compaction | Current concrete strategy | Current full context transformation and private 3/20 projection limits | One cohesive algorithm owner | Planner, summarizer, store, shared projector |
| `memory/compaction/working-context-compaction-output-validator.ts` | Compaction framework | Output validator | Enforce structural/head/tool/detachment invariants before install | One returned-boundary concern | WorkingContext, Message/tool payload types |
| `memory/compaction/pending-compaction-executor.ts` | Agent/memory lifecycle | Pending executor | Pending execution + validation position + replacement/status | One lifecycle coordinator | Resolver, strategy, validator, MemoryManager |
| `memory/memory-manager.ts` | Working-context domain | MemoryManager | Live state/capture/replace/persist | Existing state owner | WorkingContext, serializer/store |
| `memory/working-context-snapshot-serializer.ts` | Persistence | Snapshot mapping | Schema/agent/messages only | Storage adapter | WorkingContext |
| `memory/projection/compacted-memory-context-projector.ts` | Shared memory projection | Projector | Bounded durable-memory retrieval + compacted-memory/head/continuation WorkingContext | One concern shared by structured compaction and restore | Retriever, compacted-memory builder, WorkingContext |
| `api/graphql/types/working-context-compaction-strategy.ts` | Server strategy reads | Catalog/effective selection GraphQL resolver | Map core registry `list()` to `{id,name}` and expose the separate ServerSettingsService effective selected-ID scalar | Two explicit sibling fields in one subject area; entries remain tight | Core registry info + ServerSettingsService read |
| `agent-execution/compaction/server-compaction-agent-runner.ts` plus fixed launch resolver | Server compaction execution | Current built-in worker adapter | Resolve fixed built-in definition and parent launch fallback, execute normal child run | One server/provider adaptation | AgentDefinitionService/run service |
| `stores/workingContextCompactionStrategyCatalog.ts` | Web catalog state | Catalog store | Bound-node list/loading/error/retry/read invalidation | One read-only option subject | GraphQL catalog query/window binding |
| `stores/serverSettings.ts` | Web server settings | Existing settings owner | Load universal settings + effective selected ID; retain existing generic binding-aware reads and `updateServerSetting` one-key mutation/reload; remove Compaction-specific patch action/result | Existing correct setting state owner | GraphQL settings/effective query/mutation/window binding |
| `components/settings/CompactionConfigCard.vue` | Web settings UI | Compaction presentation | Strategy-first catalog/effective-selection coordination plus universal fields, changed-key sequencing, and same-node error state | One cohesive settings card | Catalog store + ServerSettingsStore |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime ordered message context | `memory/working-context.ts` | Working-context domain | Manager, strategy, persistence, and server writer share one subject | Yes | Yes | A strategy/operation metadata bag |
| Strategy contract | `memory/compaction/working-context-compaction-strategy.ts` | Compaction | Executor/runtime composition and registry need one substitutable identified boundary | Yes | Yes | Generic provider/host abstraction |
| Strategy identity lookup | `memory/compaction/working-context-compaction-strategy-registry.ts` | Compaction composition | Construction and current UI discovery need one exact global ID index | Yes — stable id/name/create | Yes — avoids agent/factory/executor switches | Orchestration/service locator |
| Global strategy selection | `memory/compaction/working-context-compaction-strategy-resolver.ts` | Compaction composition | One environment/default/lookup/construction policy serves every pending operation | Yes | Yes — prevents per-agent copies | Compaction lifecycle owner |
| Current message-unit plan | Existing `working-context-message-unit.ts` | Current structured strategy | Planner/prompt/strategy share current units | Existing fields reviewed; retain required current plan only | Remove old `CompactionPlan` overlap | Universal strategy input |
| Framework output validation | `memory/compaction/working-context-compaction-output-validator.ts` | Compaction framework | Every selected strategy crosses one pre-install invariant authority | Yes — current/next only, no constraints DTO | Yes — prevents ad hoc executor/manager/test checks | Repairer, semantic evaluator, or result wrapper |
| Durable compacted-memory projection | `memory/projection/compacted-memory-context-projector.ts` | Memory projection | Current structured compaction and restore fallback need the same bounded episodic/semantic prompt projection | Yes — one head/continuation input | Yes — removes compaction-private/restore bypass | Universal strategy stage or pending coordinator |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkingContext` | Yes | Yes — epoch/timestamp removed | Low | Keep only ordered messages and copy/append behavior |
| `WorkingContextCompactionStrategy` | Yes | Yes — stable id/name plus one method | Low | Keep id/name read-only and method same domain type in/out |
| `WorkingContextCompactionStrategyInfo` | Yes | Yes — id/name only | Low | Keep discovery metadata separate from execution state/dependencies |
| `WorkingContextCompactionStrategyConstructionContext` | Yes — six exact fields with named sources | Yes | Low | Keep `agentId`, store, existing runner, active budget, current maxItemChars, diagnostics only; no manager/config/options map |
| `MessageCompactionPlan` | Yes within current strategy | Yes after dead plan removal | Low | Do not export as universal contract; keep current-strategy internal |
| Persisted v4 snapshot payload | Yes for remaining schema/agent/messages | Yes on new writes | Low | Ignore old extra fields; no migration |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context.ts` | Working-context domain | `WorkingContext` | Ordered messages, copied append/replace, deep detached copy, copied message exposure | One domain value | Message/tool types |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy.ts` | Compaction | Public strategy boundary | Read-only `id`/`name` and `compact(WorkingContext): Promise<WorkingContext>` | One coherent identified capability | WorkingContext |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-registry.ts` | Compaction composition | Registry | Duplicate-safe global definition/factory registration, exact-ID lookup, deterministic id/name enumeration | One lookup infrastructure concern | Strategy registration |
| `autobyteus-ts/src/memory/compaction/default-working-context-compaction-strategy-registry.ts` | Compaction composition | Built-in registry bootstrap | Create/export default registry and register structured-json exactly once | One built-in registration owner | Registry/current registration |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-resolver.ts` | Compaction composition | Resolver | Read current global setting, default, exact lookup, construct/validate selected strategy | One selection boundary | Registry/runtime construction context |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-setting.ts` | Compaction configuration | Global setting contract | Env key, default ID, normalization | One stable global config subject | No agent config |
| `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts` | Compaction | Current implementation | Current plan -> JSON -> memory -> shared projection; owns private `3`/`20` retrieval constants | One algorithm owner | Existing current internals + shared projector |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | Current strategy internal | Agent adapter | Message-unit JSON task only; remove block API/inheritance | One agent adapter | Runner/prompt/parser |
| `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | Current strategy internal | Window planner | Current H/Q/P/R/T policy and budget | Existing cohesive policy | Message units/budget strategy |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-output-validator.ts` | Compaction framework | Output validator | Assert distinct context, unchanged leading head, canonical message/payload shape, and complete tool protocol; throw stable invariant code | One pre-install safety owner | WorkingContext/Message/tool payloads |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Pending lifecycle | Executor | Resolve/invoke, validate, replace, clear/report | One coordinator | Strategy interface/validator/manager |
| `autobyteus-ts/src/memory/projection/compacted-memory-context-projector.ts` | Memory projection | Shared projector | Bounded episodic/semantic retrieval, one compacted-memory user message, detached head/continuation WorkingContext | One shared projection owner | Retriever/builder/WorkingContext |
| `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts` | Memory projection | Shared prompt builder | Render current durable memory bundle into synthetic user-message content | Existing cohesive formatter moved with real owner | MemoryBundle |
| `autobyteus-ts/src/memory/memory-manager.ts` | Working-context domain | MemoryManager | Live state, capture, replace, persist; no compactor | Existing state owner | WorkingContext/persistence |
| `autobyteus-ts/src/memory/memory-manager-tool-protocol-safety.ts` | Working-context domain | MemoryManager safety | Repair through `get/replaceWorkingContext` without timestamp | Existing bounded safety concern | WorkingContext repairer |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Persistence | Serializer | v4 schema/agent/messages; ignore old extras | Physical adapter | WorkingContext |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Persistence | Run store | Read/write WorkingContext snapshot state | Existing store | Serializer |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Restore | Bootstrapper | Deserialize or compose raw-trace recovery with shared durable-memory projection, then manager replacement | Existing restore owner | Store/serializer/recovery projector/shared projector |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Runtime configuration | AgentConfig | Existing compaction-agent runner only; no strategy-selection changes | Explicit non-impact boundary | No strategy ID/name |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Runtime composition | AgentFactory | Remove obsolete concrete Compactor construction/manager injection; otherwise retain public/config composition | Existing construction owner | No strategy ID/default/registry selection |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent request lifecycle | LlmPhase | Bind exact construction context from agentId/store/existing runner/current budget/current maxItemChars/diagnostics and compose resolver/executor | Existing active runtime boundary | No strategy-ID branch or concrete internals |
| `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts` | Server configuration | Setting normalizer | Validate global ID dynamically against core registry metadata | Mirrors stream-parser/media-setting pattern | No agent config |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server settings | ServerSettingsService | Register/validate strategy setting; expose effective selected ID through shared core normalizer; remove compactor-agent key/getter; retain AppConfig per-key update/persist | Existing read/write setting owner | No registry execution, catalog metadata, or agent selection |
| `autobyteus-server-ts/src/api/graphql/types/working-context-compaction-strategy.ts` | Server strategy reads | GraphQL strategy resolver/type | Return registry `{id,name}` metadata and separate effective selected-ID scalar from ServerSettingsService | Explicit sibling read subjects; catalog entries stay tight | No default duplication, factory, construction, agent, or mutation logic |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | GraphQL composition | Schema bootstrap | Register strategy catalog and effective-selection query fields | Existing resolver composition root | Catalog/default implementation |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` | Server compaction execution | Fixed built-in launch resolver | Load `autobyteus-memory-compactor`; apply explicit config/parent runtime-model fallback | One launch-resolution concern | No server setting or arbitrary fallback |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Server compaction execution | Normal child-run adapter | Use fixed launch resolver; execute/collect/terminate no-tools agent run | Existing run mechanism | No selectable definition ID |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Built-in definitions | Registry metadata | Keep Memory Compactor template identity but remove its setting default | Existing built-in owner | Compaction strategy selection |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Server memory recording | RunMemoryWriter | Use renamed WorkingContext for event-derived snapshot | Bounded consumer adaptation | WorkingContext/run store |
| `autobyteus-web/graphql/queries/workingContextCompactionStrategyQueries.ts` | Web API contract | Strategy catalog query | Request bound-server id/name catalog only | One option query subject | Selection/default, mutation, or agent fields |
| `autobyteus-web/graphql/queries/server_settings_queries.ts` | Web API contract | Settings/effective selection query | Request generic settings plus `getEffectiveWorkingContextCompactionStrategyId` in the same bound-node operation | Existing settings read contract | Frontend default logic |
| `autobyteus-web/stores/workingContextCompactionStrategyCatalog.ts` | Web strategy catalog | Bound-node catalog store | Catalog/loading/error/retry/read-revision state | Tight read-only option owner | Selected/default setting persistence or write-session policy |
| `autobyteus-web/stores/serverSettings.ts` | Web server settings | Existing bound read/write owner | Store universal settings and effective ID using existing generic binding-aware read state; retain one-key `updateServerSetting` mutation/reload; remove Compaction-specific patch/result additions | Existing settings state/mutation owner | Strategy catalog, hard-coded default, Compaction batch/session, or atomicity claim |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Web global settings | Card presentation | Strategy-first selector, effective-ID clean baseline, universal controls, validation, changed-key sequencing, and same-node error UI | Existing cohesive surface | AgentDefinitionStore, hard-coded options/default, direct Apollo mutations, or binding-session state |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Web localization | Compaction copy | Add strategy/catalog/error/save labels; remove compactor-agent copy | Existing locale owners | Runtime IDs as display text |
| `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` and catalog-store tests | Web behavior coverage | UI/catalog contract | Registry mapping, read states/invalidation, universal controls, no-agent dependency, simple same-node save/error, and accessibility | Focused durable coverage | Rebind-save scenarios or implementation-only snapshots |
| `autobyteus-ts/src/memory/index.ts` | Package exposure | Memory exports | Export current domain/strategy; remove dead exports | Existing export surface | All public current types |

## Ownership Boundaries

### WorkingContextCompactionStrategy

Authoritative identified transformation boundary. `id` is stable machine identity, `name` is display text, and callers provide one detached complete context and receive one complete context. Callers do not prepare current plans or rebuild current outputs.

### WorkingContextCompactionStrategyRegistry

Global lookup-only composition boundary. It validates/registers identified/named construction callbacks, resolves exact stable IDs, and enumerates id/name metadata. It does not read settings, decide defaults, invoke strategies, or manage lifecycle.

### WorkingContextCompactionStrategyResolver

Authoritative global selection boundary. For each pending operation it reads the current global setting through `CompactionRuntimeSettingsResolver`, applies the absent/blank default, performs exact registry lookup, invokes the selected registration's construction callback with the exact bounded `agentId`/store/existing runner/active budget/current maxItemChars/diagnostics context, and validates identity. It does not execute compaction or replace context.

### StructuredJsonCompactionStrategy

Owns all decisions unique to the current algorithm, including use of the fixed built-in Memory Compactor and private `maxEpisodic = 3` / `maxSemantic = 20` projection constants. Its planner/result types stay behind it. It uses the shared projector after durable memory update; a future strategy does not inherit this class, reuse its DTO, consume that projector, or expose a compactor agent merely because the current strategy uses one.

### WorkingContextCompactionStrategyCatalog

Authoritative read projection of registry `id`/`name` metadata for the bound server. The GraphQL resolver maps `registry.list()`; the web catalog store owns bound-node loading/error/retry/read invalidation through the existing binding context. Neither constructs a strategy, owns default/selected state, writes settings, or queries agent definitions.

### Effective Working-Context Compaction Strategy Read

`ServerSettingsService.getEffectiveWorkingContextCompactionStrategyId()` is the server-owned read authority for the ID runtime will attempt. It reads current configuration and calls the core `normalizeWorkingContextCompactionStrategyId`; GraphQL exposes the returned scalar. It never validates into a fallback, writes configuration, consults registry order, or adds state to catalog entries. Explicit unknown values remain explicit so the card can render unavailable.

### Existing ServerSettingsStore Setting Update

`updateServerSetting(key, value)` remains the web write boundary for one setting. It uses the existing GraphQL mutation and reloads authoritative settings after success. The Compaction card may await this action sequentially for its changed valid fields, but the store gains no Compaction-specific multi-key patch, binding/session parameter, captured-client policy, result DTO, or confirmed/unconfirmed bookkeeping. Existing generic binding-aware read state remains separate and unchanged.

### CompactionConfigCard

Presentation coordinator over sibling authorities: the strategy catalog for available `{id,name}` options and `ServerSettingsStore` for the effective selected ID, universal values, and existing one-setting action. It uses the effective ID as its clean baseline, validates form state, sequences only changed valid fields, stops on the first same-node error, and never owns registry metadata, default policy, client selection, binding policy, execution policy, or agent selection.

### Fixed Built-In Memory Compactor Runner

Server adaptation used by the current strategy's injected runner. It loads `autobyteus-memory-compactor`, resolves its explicit launch config or the parent runtime/model fallback, and executes the existing normal no-tools/preloaded-only agent run. It reads no compactor-agent setting and tries no alternate agent.

### WorkingContextCompactionOutputValidator

Authoritative pre-install structural safety boundary. It compares the stable pre-call baseline, detached strategy input, and returned context after `compact` and before manager replacement. It throws a stable invariant-coded error and performs no repair, mutation, persistence, semantic scoring, or provider rendering.

### CompactedMemoryContextProjector

Authoritative shared projection boundary for current durable episodic/semantic memory. It performs bounded retrieval and returns one detached head + optional compacted-memory user message + continuation `WorkingContext`. Only `StructuredJsonCompactionStrategy` and restore fallback use it.

### MemoryManager

Authoritative live-context boundary. It owns replacement and persistence. It neither constructs nor calls strategies.

### PendingCompactionExecutor

Authoritative pending-operation lifecycle owner. It calls resolver, strategy, validator, and manager in that order and does not bypass any boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionStrategy.compact` | Current planner, summarizer, store update, and shared-projector use in concrete implementation | PendingCompactionExecutor | Executor importing planner/result/projector | Strengthen current strategy implementation, not executor branches |
| `WorkingContextCompactionStrategyRegistry` | Global registration/factory index and id/name enumeration | Strategy resolver, server setting validator, current catalog adapter | AgentFactory/executor `if (strategyId)` chains or registry compaction methods | Add registration/lookup/enumeration only; keep policy in resolver |
| Strategy catalog GraphQL/store | Registry metadata read projection plus bound-node catalog state | CompactionConfigCard | Frontend hard-coded options/default; catalog constructing strategies or querying agents | Strengthen catalog query/store only |
| Effective strategy selection read | Core normalizer over current ServerSettingsService config | ServerSettingsStore/GraphQL field | Frontend default, first catalog option, catalog `isDefault`, or generic-setting omission | Strengthen the subject-specific read only |
| `ServerSettingsStore.updateServerSetting` | One-key mutation and authoritative reload | CompactionConfigCard and existing settings surfaces | Card calling Apollo/ServerSettingsService directly; new Compaction batch/session API | Strengthen the existing one-setting action only if its real one-key behavior is defective |
| `CompactionConfigCard` | Strategy/settings presentation and form state | Settings surface | AgentDefinitionStore dependency; runtime/default selection logic; direct mutation loop | Strengthen presentation/state handling, not registry/runtime |
| Fixed built-in compaction runner | Built-in lookup, parent launch fallback, normal child-run lifecycle | Current strategy via `CompactionAgentRunner` | Environment-selected agent or fallback to arbitrary visible definition | Strengthen fixed resolver/error, not global UI |
| `WorkingContextCompactionStrategyResolver` | Global setting/default + selected registration construction | PendingCompactionExecutor | Executor environment reads/ID switches or AgentConfig selection | Strengthen resolver, not agent/executor branches |
| `WorkingContextCompactionOutputValidator.assertValid` | Stable-baseline head plus strategy-input identity and returned structural/tool checks | PendingCompactionExecutor | Install then repair; strategy self-certification; manager ad hoc checks | Strengthen validator without adding constraints/result DTOs |
| `CompactedMemoryContextProjector.project` | Durable memory retrieval + compacted-memory/head/continuation context projection | StructuredJsonCompactionStrategy, WorkingContextSnapshotBootstrapper | Restore importing strategy-private rebuilder; executor retrieval/rebuild | Extend shared projection only, not universal strategy API |
| `MemoryManager.get/replaceWorkingContext` | Live context and snapshot persistence | Pending executor, bootstrapper, tool-safety concern | Direct mutation of `workingContext` or snapshot store | Add a manager operation |
| `PendingCompactionExecutor.executeIfRequired` | Pending request phases and success/failure sequencing | LLMRequestAssembler/LlmPhase | Call strategy and clear request independently | Strengthen executor lifecycle API |
| `WorkingContextSnapshotSerializer` | Persisted message mapping | Snapshot stores/bootstrapper | Ad hoc message JSON parsing | Extend current serializer schema mapping |

## Dependency Rules

Allowed:

- `LlmPhase`/request assembly -> `PendingCompactionExecutor`.
- Module/bootstrap registration -> global registry registrations.
- `PendingCompactionExecutor` -> `WorkingContextCompactionStrategyResolver`, `WorkingContextCompactionStrategy`, `WorkingContextCompactionOutputValidator`, and `MemoryManager`.
- `WorkingContextCompactionStrategyResolver` -> `CompactionRuntimeSettingsResolver`, global registry, and construction context.
- `StructuredJsonCompactionStrategy` -> current planner, current summarizer, store, and shared `CompactedMemoryContextProjector`.
- `CompactedMemoryContextProjector` -> `Retriever`, compacted-memory message builder, `WorkingContext`, and canonical message types.
- `MemoryManager` -> `WorkingContext`, snapshot serializer/store, tool-safety concerns.
- Bootstrapper -> snapshot adapters, restore-only raw-trace projector, shared `CompactedMemoryContextProjector`, and `MemoryManager`.
- ServerSettingsService write normalizer and current catalog resolver -> registry metadata enumeration only.
- `ServerSettingsService.getEffectiveWorkingContextCompactionStrategyId` -> current AppConfig value plus core strategy-ID normalizer only.
- Web strategy catalog store -> strategy catalog GraphQL query and bound-node context only.
- `ServerSettingsStore` -> generic settings/effective-ID GraphQL reads, existing generic bound-node read state, and existing per-key setting mutation/reload.
- `CompactionConfigCard` -> web strategy catalog store and existing `ServerSettingsStore` only.
- Server compaction runner -> fixed Memory Compactor identity, AgentDefinitionService, AgentRunService, and parent launch fallback.

Forbidden:

- `MemoryManager` -> strategy interface or concrete strategy.
- `MemoryManager` -> registry or selected strategy ID.
- `PendingCompactionExecutor` -> registry, process environment, or strategy-ID selection branches.
- `AgentConfig`/agent definition/run config -> compaction strategy ID/name.
- `AgentFactory` -> global strategy setting/default or strategy-ID branches.
- `PendingCompactionExecutor` -> structured strategy planner, JSON result, episodic/semantic, retriever, rebuilder, or shared projector types.
- `PendingCompactionExecutor`/`MemoryManager` -> `CompactedMemoryContextProjector`.
- `WorkingContextCompactionOutputValidator` -> strategy ID branches, store/retrieval, repair, provider renderers, or semantic/budget policy.
- Restore -> structured strategy class or private planner/result types.
- `LlmPhase`/request assembler -> concrete strategy internals.
- Strategy -> live `MemoryManager` for replacement or pending-request clearing.
- Future strategies -> inheritance from `StructuredJsonCompactionStrategy` unless they truly share the complete algorithm (not assumed).
- Compatibility aliases for removed compactor/context names.
- Registry-owned default/environment/execution policy or resolver-owned compaction lifecycle/context replacement.
- Strategy catalog -> selected/default fields, registration factories, strategy construction context, agent definitions, or settings mutation.
- Effective-selection read -> registry order, frontend constants, persistence writes, or silent fallback for explicit unknown IDs.
- `CompactionConfigCard` -> direct `getApolloClient`/GraphQL mutation, `AgentDefinitionStore`, hard-coded strategy/default availability, or `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.
- Compaction save -> new revision/session/result APIs, continuing after a same-node mutation failure, claiming rollback/atomicity, clearing failed/unsent dirty values, or reporting whole-card success after only some per-key calls succeeded.
- Server compaction runner -> `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, arbitrary selected definition, or fallback agent list.
- Registry/strategy interface -> `configurationKind`, component IDs, generic form schema, or mostly-optional future strategy settings.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionStrategy.compact(workingContext)` | Context transformation | Return one complete compacted context | `WorkingContext` | No constraints/result wrapper |
| strategy `id` / `name` | Strategy identity/presentation | Stable lookup key and user-facing label | non-empty strings | Name is not a lookup key |
| `WorkingContextCompactionStrategyRegistry.register(registration)` | Strategy registration | Validate and index identified/named construction callback | registration `id` | Duplicate/blank ID rejected |
| `WorkingContextCompactionStrategyRegistry.get(id)` | Strategy lookup | Resolve exact registered definition/construction callback | stable strategy ID | No fallback/default |
| `WorkingContextCompactionStrategyRegistry.list()` | Strategy discovery | Return deterministic id/name metadata | None | No dependency or execution details |
| `getWorkingContextCompactionStrategies` | Bound-server strategy catalog | Project registry list for UI | none; bound server supplies context | Returns id/name only; no selected/default/settings/agents/factories |
| `getEffectiveWorkingContextCompactionStrategyId` | Bound-server effective selection | Return normalized ID runtime will attempt | none; bound server supplies current config | Shared core normalizer; absent/blank defaults, explicit unknown remains explicit; no write |
| `WorkingContextCompactionStrategyResolver.resolve()` | Global selection | Default/lookup/construct selected strategy for pending operation | process-global ID; exact six-field construction context bound at LlmPhase composition | No compact/replace |
| `WorkingContextCompactionOutputValidator.assertValid(baseline, strategyInput, next)` | Returned-context safety | Throw invariant-coded error before install for enforceable invalid output | three direct `WorkingContext` values | No constraints/result/repair |
| `CompactedMemoryContextProjector.project(input)` | Durable-memory prompt projection | Retrieve bounded episodic/semantic memory and build detached head/memory/continuation context | head/continuation plus explicit retrieval limits | Shared by current strategy/restore only |
| `MemoryManager.getWorkingContext()` | Live context read | Return detached complete current context | None | Must preserve message/tool/provenance values |
| `MemoryManager.replaceWorkingContext(context)` | Live context write | Copy, install, persist complete context | `WorkingContext` | No epoch/timestamp arguments |
| `PendingCompactionExecutor.executeIfRequired({ turnId })` | Pending request | Execute if requested; report boolean | optional turn ID | Remove system prompt/current planner budget parameters |
| `WorkingContext.copy()` | Context value | Produce detached value | None | No shared mutable tool payloads |
| `WorkingContext.replaceMessage(index, message)` | Context value mutation | Controlled copied update of one message | zero-based index | Used by MemoryManager; no raw graph escape |
| `updateServerSetting(key, value)` | One server-setting write | Validate/persist one key on the server reached by the caller's client | setting key/value | Existing mutation; not a multi-key transaction |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Strategy `compact` | Yes | Yes | Low | Keep one context arg/result |
| Strategy identity | Yes | Yes — stable ID + display name | Low | Validate separately; lookup only by ID |
| Strategy registry | Yes | Yes — exact global strategy ID | Low | Keep registration/get/list only; selection stays in resolver |
| Strategy resolver | Yes | Yes — global ID + bounded construction context | Low | No algorithm branches or context transformation |
| Output validator | Yes | Yes — current and next WorkingContext | Low | Framework structural checks only; no semantic/budget/provider policy |
| Shared durable-memory projector | Yes | Yes — head/continuation and explicit bounded retrieval | Low | Do not expose as universal strategy stage |
| Server global setting | Yes | Yes — `AUTOBYTEUS_COMPACTION_STRATEGY` | Low | Existing AppConfig update/persist path; no agent field |
| Strategy catalog query | Yes | Yes — id/name list for bound server | Low | Map registry list only; no selected/default state |
| Effective strategy read | Yes | Yes — normalized ID runtime will attempt | Low | ServerSettingsService + shared core normalizer; explicit unknown remains explicit |
| Existing one-setting web action | Yes | Yes — setting key/value | Low | Reuse `updateServerSetting`; no Compaction-specific batch/session interface |
| Compaction card | Yes | Yes — catalog option ID plus effective-ID baseline and universal settings | Low | Coordinate stores; no default/client/agent-definition policy |
| Fixed built-in launch resolver | Yes | Yes — constant `autobyteus-memory-compactor` | Low | Preserve parent launch fallback; no arbitrary fallback |
| Manager `getWorkingContext` | Yes | N/A | Low | Return detached copy |
| Manager `replaceWorkingContext` | Yes | Yes | Low | Accept only complete WorkingContext |
| Pending executor | Yes after refactor | Yes | Low | Remove algorithm-specific input/options |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural/Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime active messages | `WorkingContextSnapshot` -> `WorkingContext` | Yes after rename | Low | Reserve “snapshot” for persistence |
| Replaceable algorithm | `WorkingContextCompactionStrategy` | Yes | Low | Do not call it provider/port/host |
| Strategy lookup | `WorkingContextCompactionStrategyRegistry` | Yes | Low | Do not call it host, manager, or executor |
| Global choice | `WorkingContextCompactionStrategyResolver` | Yes | Low | Do not call it agent config/provider host |
| Current algorithm | `StructuredJsonCompactionStrategy` | Yes | Low | Describes current agent result mechanism |
| User-facing option read | `WorkingContextCompactionStrategyCatalog` | Yes | Low | Do not call agent/provider catalog |
| Runtime-effective option read | `getEffectiveWorkingContextCompactionStrategyId` | Yes | Low | Keep separate from catalog entry metadata and generic configured-value visibility |
| Multi-field Compaction save | Deterministic card loop over `ServerSettingsStore.updateServerSetting` | Yes | Low | Presentation sequences an existing one-key action; it stops on first error and is not a transaction owner |
| Current private worker | `Memory Compactor` / `autobyteus-memory-compactor` | Yes | Low | Do not call it the selected strategy |
| Lifecycle coordinator | `PendingCompactionExecutor` | Yes | Low | Keep only pending-execution responsibility |
| Live-context owner | `MemoryManager` | Existing broad name | Medium | Do not expand it with strategy ownership |

## Applied Patterns

- **Strategy pattern:** one identified interface and one current implementation, globally selected at pending-operation time.
- **Registry pattern:** global indexed definition/factory registration, exact lookup, and enumeration. It contains no environment/default or execution policy.
- **Catalog projection:** one read-only server API and bound-node store expose registry identity metadata without turning the registry into a UI coordinator.
- **Effective-value projection:** one subject-specific ServerSettingsService/GraphQL read applies the same core normalizer as runtime without adding selected/default fields to catalog entries.
- **Existing-setting reuse:** the card sequences the existing one-key action for changed valid fields; no new Compaction-specific settings coordinator, result DTO, or binding-session protocol is introduced.
- **Resolver pattern:** one owner translates the global setting and current runtime construction dependencies into a selected strategy without leaking selection into agent configuration or execution orchestration.
- **Authoritative boundary:** executor calls the strategy boundary and manager boundary; it does not call their internals.
- **Pre-install validation:** one framework validator mediates untrusted strategy output before the authoritative live write.
- **Shared projection extraction:** one narrowly scoped durable-memory projector serves the two real consumers without becoming universal strategy policy.
- **Value replacement:** compaction returns a complete `WorkingContext`; manager replaces rather than merging a proposal.
- **Dependency inversion:** pending lifecycle depends on the context transformation interface, not the current JSON algorithm.
- **Clean-cut removal:** obsolete plan path, names, and arbitrary compactor-agent selection are deleted, not wrapped.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context.ts` | File | WorkingContext | Runtime context value/copy/append | Core memory subject | Strategy/config/epoch |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy.ts` | File | Strategy interface | Stable id/name + one context-to-context method | Compaction capability area | Options/result DTOs or construction dependencies |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-registry.ts` | File | Strategy registry | Register/get/list identified strategy definitions/construction callbacks | Compaction composition concern | Environment/default/fallback or execution |
| `autobyteus-ts/src/memory/compaction/default-working-context-compaction-strategy-registry.ts` | File | Built-in registry bootstrap | Export global registry with one structured-json registration | Compaction composition concern | Settings read or execution |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-resolver.ts` | File | Global strategy resolver | Read global setting, default, exact lookup, selected construction | Compaction composition concern | Compact/replace/pending lifecycle |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-setting.ts` | File | Global setting contract | Env key/default/normalization | Compaction configuration | Agent config |
| `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts` | File | Current strategy | Full current algorithm | Existing compaction folder | Manager replacement/request clear |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-output-validator.ts` | File | Framework output validator | Pre-install context/head/message/tool/detachment assertions | Compaction boundary concern | Repair/semantic scoring/provider rendering |
| `autobyteus-ts/src/memory/compaction/*message*`, parser/normalizer files | Files | Current strategy internals | Current planning/agent/result subconcerns | Cohesive established folder | Universal strategy requirements |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | File | Pending lifecycle | Resolve/invoke/validate/install/report | Existing lifecycle location | Planner/retriever/projector imports |
| `autobyteus-ts/src/memory/projection/compacted-memory-context-projector.ts` | File | Shared durable-memory projector | Bounded retrieval + compacted-memory/head/continuation WorkingContext | Shared memory projection boundary | Strategy selection/planning/install |
| `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts` | File | Shared durable-memory formatter | Render durable memory bundle into synthetic prompt memory | Used only by shared projector | Pending lifecycle/strategy selection |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | MemoryManager | Live context/persistence/request state | Existing state owner | Compactor/strategy construction |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | File | Persistence adapter | Schema/agent/messages | Snapshot persistence concern | Runtime epoch/timestamp |
| `autobyteus-ts/src/memory/store/*` | Files | Physical memory store | Snapshot/raw/episodic/semantic I/O | Existing persistence folder | Strategy selection |
| `autobyteus-ts/src/agent/context/agent-config.ts` | File | Explicit non-impact | Keep current runner dependency; no strategy ID/name | Existing agent configuration | Global strategy selection |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | File | Existing construction | Remove obsolete Compactor wiring only; no replacement selection policy | Existing composition root | Strategy ID/default/branches |
| `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts` | File | Server setting normalization | Validate IDs against global registry metadata | Existing server config pattern | Agent configuration or default duplication |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Global settings | Register/validate strategy setting; read normalized effective selected ID via core normalizer; remove compactor-agent setting; reuse AppConfig persistence/live update | Existing settings owner | Compaction execution or catalog metadata |
| `autobyteus-server-ts/src/api/graphql/types/working-context-compaction-strategy.ts` | File | Strategy reads | Read-only registry id/name catalog plus separate effective selected-ID scalar | Explicit server API subject | Default reimplementation, factories/settings writes/agent lookup |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` | File | Fixed current worker | Load built-in identity and resolve parent launch fallback | Server agent-run adaptation | Arbitrary setting/fallback list |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | File | Current worker execution | Execute fixed resolved built-in through normal run service | Existing server runtime concern | Strategy selection |
| `autobyteus-web/stores/workingContextCompactionStrategyCatalog.ts` | File | Bound-node catalog | Load/cache/error/retry/revision invalidation | Narrow web option owner | Selected/default setting or agent catalog |
| `autobyteus-web/stores/serverSettings.ts` | File | Existing bound-node settings | Load generic settings + effective strategy ID through existing generic read state; retain one-key update/reload; remove Compaction patch/result additions | Existing settings state owner | Catalog metadata, hard-coded default, Compaction batch/session, or atomicity claim |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | File | Global compaction settings UI | Strategy-first effective selection + universal controls + changed-key sequencing/same-node error presentation | Existing product surface | Direct Apollo mutation, hard-coded registry/default, agent selection, or binding-session state |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Files | Localized UI copy | Strategy/catalog/error/accessibility labels; remove compactor-agent labels | Existing locale owners | Stable ID as presentation copy |
| `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | File | Server memory writer | Use renamed context type | Existing event-memory writer | Compaction strategy logic |

The existing `memory/compaction` folder remains appropriate and flat enough for this scope: it already groups one capability and the target distinguishes public boundary/current owner through file names. Adding a `strategies/` subfolder for one implementation would be premature. Reconsider only when a second strategy arrives.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Clear? | Mixed/Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/memory` | Main-Line Domain-Control | Yes | Low | WorkingContext/MemoryManager live here |
| `src/memory/compaction` | Main-Line transformation + owned current internals | Yes after deletions | Medium -> Low | Public interface/current implementation names clarify; remove dead parallel family |
| `src/memory/projection` | Shared Off-Spine Domain Concern | Yes | Low | Durable episodic/semantic-to-context projection has exactly two consumers: current strategy and restore fallback |
| `src/memory/store` | Persistence-Provider | Yes | Low | Keep physical snapshot names |
| `src/memory/restore` | Off-Spine Concern | Yes | Low | Restore serves MemoryManager/bootstrap |
| `src/agent/loop` | Main-Line lifecycle | Yes | Low | Trigger/invocation only |
| `autobyteus-server-ts/src/agent-memory/store` | Persistence-Provider | Yes | Low | Bounded type consumer only |
| `autobyteus-server-ts/src/agent-execution/compaction` | Server Runtime Adapter | Yes after tightening | Low | Fixed built-in lookup/launch/run; no global worker selection |
| `autobyteus-server-ts/src/api/graphql/types` | API Read Boundary | Yes | Low | Explicit strategy catalog and effective-selection sibling fields follow existing GraphQL placement |
| `autobyteus-web/stores` | UI State Boundary | Yes | Low | Catalog store stays option-only/read-aware; ServerSettingsStore retains effective selection plus its existing one-setting action; no Compaction patch owner |
| `autobyteus-web/components/settings` | Presentation | Yes | Low | Existing Compaction card remains one cohesive global settings surface |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Strategy API | `next = await strategy.compact(current)` | `strategy.compress(plan, constraints) -> proposal` | Matches actual domain input/output |
| Executor | capture -> compact -> replace -> clear | plan prefix -> agent -> retrieve -> rebuild | Keeps current algorithm replaceable |
| Validation | baseline -> strategyInput -> compact -> assertValid(baseline, strategyInput, next) -> replace | replace -> repair before render | Prevents input mutation from redefining invariants, invalid install, and false completed state |
| Manager | `getWorkingContext` / `replaceWorkingContext` | `memoryManager.compactor.compactWorkingContext` | Separates state from algorithm |
| Current planning | planner inside structured strategy | planner before strategy | Future strategy can choose whole-context behavior |
| Extension | `registry.register({ id, name, create })` | add `if (strategyId)` in agent factory/executor/manager | Preserves open/closed execution and agent-configuration boundaries |
| Selection | resolver reads global env -> registry exact lookup -> construct | per-agent field or executor switches on ID | Keeps global setting, lookup, construction, and execution separate |
| Persisted transition | ignore old extra fields; normal write omits | rewrite 82.6 MB or add v4/v5 dual readers | Proportionate and current-schema-only |
| Shared projection | structured strategy/restore -> CompactedMemoryContextProjector | restore imports strategy-private rebuilder | Gives one real cross-path concern a truthful owner without forcing it on every strategy |
| UI options | registry.list -> catalog query -> catalog store -> card `{name,id}` option | hard-coded strategy list or all AgentDefinitions | One catalog authority and future registration visibility |
| Current worker | structured strategy -> fixed built-in Memory Compactor runner | user selects arbitrary helper agent | Keeps implementation assumptions inside current strategy |
| Settings save | card -> existing updateServerSetting for each changed key; stop on first error | new revision-fenced batch/session API | Reuses the real authority and models the actual one-node desktop journey |
| Future settings | add a deliberate bounded surface when requirements exist | add generic `configurationKind`/schema now | Avoids a loose speculative contract |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `WorkingContextSnapshot` alias | Reduce source churn | Rejected | Rename all source/tests to WorkingContext |
| `Compactor` wrapper extending new strategy | Preserve imports | Rejected | Update construction/tests; delete wrapper/export |
| Keep `compact(CompactionPlan)` as overload | Preserve test/public API | Rejected | Delete dead path/support/tests |
| Keep epoch/timestamp optional runtime fields | Old files contain them | Rejected | Reader ignores old extras; new runtime/writes omit |
| Defer registry until second strategy | Reduce current file count | Rejected | Add lookup-only registry and current registration now so another strategy requires no architecture refactor |
| Per-runtime/per-agent instance registry | Easy access to agent dependencies | Rejected | Use global definition/factory registry plus operation-time construction; one global setting and UI discovery do not require an agent instance |
| Per-agent strategy field | Easy injection | Rejected | Use `AUTOBYTEUS_COMPACTION_STRATEGY`; agents are not asked to choose an experimental global algorithm |
| Keep arbitrary compactor-agent setting as advanced override | Preserve customization | Rejected | Current strategy owns fixed built-in worker; remove runtime/predefined/bootstrap/UI selection and ignore stale env extra |
| Hide agent selector but keep runtime setting | Smaller UI delta | Rejected | Would leave a second hidden authority and violate clean-cut ownership |
| Use all AgentDefinitions as strategy options | Reuse current UI catalog | Rejected | Agent identity and strategy identity are different subjects; use registry `{id,name}` catalog |
| Add generic `configurationKind`/dynamic form schema | Predict future agent/team/no-agent settings | Rejected | Requirements are unknown and shapes diverge; keep registry metadata tight and add bounded future surfaces deliberately |
| Keep candidate Compaction binding-revision patch machinery | Earlier architecture review hypothesized same-window node switching during save | Rejected after production lifecycle audit and user correction | Delete Compaction-specific revision/session/result/UI/test/message additions; reuse existing one-key update; leave unrelated generic/mobile safeguards intact |
| Keep both old/new executor paths | Stage rollout | Rejected | Refactor tests and switch cleanly in one change |

## Derived Layering

Explanatory only:

```text
Agent lifecycle
  PendingCompactionExecutor
        |
        v
Compaction domain
  WorkingContextCompactionStrategy
        |
        v
Current implementation internals
  Structured JSON planner/fixed built-in Memory Compactor/memory
        |
        v
Shared current-memory projection
  CompactedMemoryContextProjector <- restore fallback

Framework output safety
  WorkingContextCompactionOutputValidator
        |
        v
Working-context state
  MemoryManager -> snapshot persistence

Global configuration / lookup
  node-specific desktop window -> CompactionConfigCard
        -> existing ServerSettingsStore.updateServerSetting per changed key
        -> ServerSettingsService -> AppConfig -> AUTOBYTEUS_COMPACTION_STRATEGY
        -> CompactionRuntimeSettingsResolver
        -> WorkingContextCompactionStrategyResolver
        -> global WorkingContextCompactionStrategyRegistry
        -> selected strategy construction

Bound-node discovery / effective selection
  WorkingContextCompactionStrategyRegistry.list()
        -> GraphQL strategy catalog
        -> WorkingContextCompactionStrategyCatalogStore
        -> CompactionConfigCard { name label, id value }

  AppConfig configured value -> ServerSettingsService
        -> shared core normalizeWorkingContextCompactionStrategyId
        -> GraphQL effective selected-ID scalar
        -> ServerSettingsStore effective clean baseline
        -> CompactionConfigCard
```

The executor depends on the global resolver, transformation boundary, output validator, and state owner because it coordinates selection, transformation, validation, then replacement. It does not inspect settings/registrations or bypass strategy/validator/manager internals. The shared projector is off this generic spine and serves only structured compaction/restore. The UI catalog is a sibling read projection over registry metadata; it does not enter runtime resolution. AgentConfig and AgentFactory do not own selection.

## Change / Refactor Sequence

1. **Tighten the context value first.**
   - Add/rename to `WorkingContext`.
   - Implement deep-enough `copy()` preserving message content, reasoning, media, metadata/provenance, tool calls/results, and native tool-call context.
   - Remove epoch/timestamp fields and reset semantics.
   - Update serializer/run store/server writer/bootstrap/tool-safety/tests to the new type and direct-use payload.
   - Add controlled `replaceMessage(index, message)` and adapt manager tool-call provenance enrichment; do not mutate a copied `buildMessages()` result.
   - Add clone tests for nested media, metadata/provenance, tool arguments/results, and provider-native tool-call context plus a manager-ingestion persistence test.
2. **Introduce the identified strategy interface, global registration registry, and setting contract.**
   - Add read-only `id`, `name`, and `compact(WorkingContext): Promise<WorkingContext>`.
   - Add registration `{ id, name, create }` and `WorkingContextCompactionStrategyRegistry.register/get/list` with blank/duplicate validation, exact lookup, and deterministic metadata enumeration.
   - Add `AUTOBYTEUS_COMPACTION_STRATEGY` and default `structured-json` in the compaction setting contract.
   - Register only the current production definition globally.
   - Export the interface, setting, registry metadata, and default registry from the current memory package.
3. **Build the current concrete strategy by moving behavior.**
   - Move window planning from executor.
   - Move structured JSON memory update code from current `WorkingContextCompactor`.
   - Extract shared `CompactedMemoryContextProjector` from the current rebuilder/builder; make both structured strategy and restore fallback consume it.
   - Move retrieval/projection invocation from executor; keep `3`/`20` as named private structured-strategy constants and pass restore bootstrap's existing configurable limits separately.
   - Resolve current input budget through the bounded construction context so it does not enter the universal method.
   - Return a new `WorkingContext`.
4. **Complete global operation-time resolution separately from agent configuration and MemoryManager.**
   - Remove manager compactor option/property/import.
   - Remove existing concrete `Compactor` construction/injection from AgentFactory; add no replacement strategy ID/default/registry selection and make no AgentConfig signature/copy change.
   - Extend `CompactionRuntimeSettingsResolver` to read the current global strategy value.
   - Add `WorkingContextCompactionStrategyResolver` for absent/blank default, exact lookup, selected registration construction, and unknown-ID failure.
   - At the existing LlmPhase boundary, bind exactly `context.agentId`, `memoryManager.store`, existing `context.config.compactionAgentRunner`, current input budget, `memoryManager.compactionPolicy.maxItemChars`, and a compaction-owned diagnostics adapter. Do not add a strategy field to AgentConfig or import the concrete agent reporter into the memory strategy contract.
   - The structured registration maps `agentId` to `AgentCompactionSummarizer.parentAgentId` and passes `maxItemChars` unchanged.
5. **Add the pre-install output validator.**
   - Add `WorkingContextCompactionOutputValidator.assertValid(baseline, strategyInput, next)` and stable invariant-coded error.
   - Enforce distinct context, unchanged leading head, canonical message/payload shape, and complete non-orphaned tool protocol.
   - Keep semantic sufficiency, compression/budget quality, and provider-specific rendering in strategy/integration tests; add no constraints DTO or result wrapper.
6. **Simplify PendingCompactionExecutor.**
   - Remove planner/rebuilder/max-memory/input-budget/system-prompt algorithm options.
   - Ask the global resolver for the current selected strategy, capture a stable manager-context baseline, pass `baseline.copy()` to the strategy, validate against both values, replace, clear/report.
   - Preserve missing/unknown/construction/thrown failures and add invalid-return failure: no replacement, no request clear, failed-only event with invariant code.
7. **Tighten current summarizer internals.**
   - Remove block-based abstract method/fallback.
   - Keep message-unit structured JSON path and existing response schema.
8. **Delete legacy files/exports/tests.**
   - Remove the exact items listed in Removal Plan.
   - Run reference search to prove no aliases or dead symbols remain.
9. **Integrate the global setting with existing server settings.**
   - Add server setting normalization that validates against current global registry metadata.
   - Register the predefined editable key in `ServerSettingsService`.
   - Add `getEffectiveWorkingContextCompactionStrategyId()` using the shared core normalizer; absent/blank returns `structured-json`, explicit IDs including unknown values remain explicit.
   - Expose the effective scalar through GraphQL and load it with generic settings; do not add selected/default metadata to catalog entries or duplicate the default in web code.
   - Reuse `AppConfig.set` so update changes `process.env` and persists `.env`; add no new settings transport.
10. **Make the current built-in worker strategy-owned and remove arbitrary selection.**
   - Keep built-in Memory Compactor definition synchronization, but remove its `settingDefault` entry.
   - Remove `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` predefined metadata/export/getter and every normal runtime read.
   - Replace arbitrary `CompactionAgentSettingsResolver` behavior with a fixed built-in launch resolver, or tighten/rename the existing file to that singular responsibility.
   - Preserve explicit built-in launch config and parent runtime/model fallback, normal no-tools/preloaded-only run execution, output collection, termination, and diagnostics.
   - Fail truthfully when `autobyteus-memory-compactor` is missing/invalid; do not query or try other definitions.
11. **Expose the registry catalog without widening the registry.**
   - Add GraphQL `WorkingContextCompactionStrategyOption { id, name }` and `getWorkingContextCompactionStrategies` mapped directly from registry `list()`.
   - Add web query and binding-aware `WorkingContextCompactionStrategyCatalogStore` with loading/error/retry/node-revision invalidation.
   - Keep the catalog strictly id/name. Effective selection comes from the separate ServerSettingsService scalar and shares the generic settings read revision.
   - Do not add default/selected/configuration metadata, factories, dependencies, agent fields, or settings mutation to the catalog.
12. **Refactor the existing Compaction card.**
   - Remove `AgentDefinitionStore`, all-agent fetch, compactor selector, launch summary, missing-agent warning, and old localization copy.
   - Add the strategy selector first; label by catalog `name`, persist catalog `id`, and retain trigger ratio/context override/detailed logs below it.
   - Implement empty/catalog-error retry, unknown-current-ID recovery, validation, dirty/saving/same-node save failure, responsive, keyboard, busy/alert, and accessible save-name behavior from the UI/UX supplement.
   - Use the server-reported effective selected ID as the selection/dirty baseline. Absent/blank is clean `structured-json`; explicit unknown remains unavailable. Do not write the default on load or when only a universal field changed.
   - Compute a deterministic list of changed valid keys. Await the existing `ServerSettingsStore.updateServerSetting(key, value)` for each item and stop at the first thrown error. Do not add a batch/patch result type, revision argument, captured-client session, or new store action.
   - Let each successful existing action reload authoritative settings. Suppress store-to-form draft replacement while the loop is active so a later same-node failure leaves failed/unsent values dirty. Never show whole-card success after only partial persistence and never imply rollback.
   - Remove candidate Compaction-specific `expectedBindingRevision` consumption, patch-result branches, rebind/previous-node UI, and dedicated localization. Leave pre-existing generic `settingsBindingRevision`/mobile binding safeguards outside this save rework.
13. **Update behavior, registry, settings, catalog, UI, and boundary tests.**
   - Add registry identity/blank/duplicate/get/list tests.
   - Add test-only second global registration/selection through normal pending execution and next-render path; do not ship it as a production registration.
   - Prove the same test-only registration appears through the server catalog and frontend option mapping without a hard-coded UI branch.
   - Prove global setting changes affect an already-created agent's next compaction.
   - Prove AgentConfig/agent-definition/run-config shapes contain no strategy selection and AgentFactory has no strategy-ID branch.
   - Move current algorithm assertions to structured-strategy tests.
   - Preserve tool-safe, sequential compaction, failure, restore, and runtime next-request scenarios.
   - Prove exact construction mapping for parent agent ID, store/runner, active budget, current maxItemChars, diagnostics, and private 3/20 structured retrieval limits.
   - Add invalid-output cases for missing/changed head, orphan/incomplete/duplicate/blank tool protocol, role/payload mismatch, and input-instance aliasing; assert no replace/clear/completed.
   - Prove current strategy and restore use the shared projector while generic executor/manager do not import it.
   - Add representative old-v4-extra-field read/new-write contraction coverage.
   - Prove fixed built-in identity/parent fallback/missing-definition failure and absence of old setting/bootstrap/UI/runtime reads.
   - Cover catalog loading/empty/error/retry/unknown-ID and existing read invalidation, preserved universal controls, localization, and accessibility.
   - Cover effective selection for absent, blank, explicit valid, explicit unknown, and absent-with-test-second-registration; assert loading/unrelated save does not persist the default.
   - Cover the real node-window journey and simple saves: opening/focusing separate node windows, changed-key-only calls, full success, first-key failure with no later call, and later-key same-node failure with no remaining call, visible error, remaining dirty values, and no whole-card success.
   - Delete/replace Compaction rebind-save tests and messages. Do not remove unrelated generic/mobile binding tests without their own usage audit.
14. **Run all affected package builds/focused suites.**
   - `autobyteus-ts` build/tests.
   - `autobyteus-server-ts` build/tests affected by catalog/fixed runner/settings changes.
   - `autobyteus-web` focused component/store tests and applicable typecheck/build.
   - Broader API/E2E engineer determines final executable coverage/setup.

At no step should both old and new production paths coexist as fallback. Temporary compile breakage inside one implementation change is acceptable; committed target state is clean-cut.

## Key Tradeoffs

### Same-type strategy result vs execution-details wrapper

The design chooses the truthful domain API: `WorkingContext -> WorkingContext`. Optional counts and child-agent metadata stay diagnostic/off-spine. This avoids making every future strategy produce current-algorithm metrics or a proposal wrapper.

### Registry identity plus product selection now

An interface alone would keep the executor replaceable but leave global selection and enumeration unusable. The design therefore adds stable `id`/`name`, a global definition/factory registry, an environment-backed resolver, server-settings persistence, a read-only bound-server catalog, and the existing Compaction-card selector now. A future registration appears through the same catalog without frontend option branching.

### Global selection vs per-agent selection

Strategy alternatives are system-level experiments intended to converge on one preferred implementation, not capabilities users should configure for every agent. A process-wide setting avoids agent-definition/schema/UI churn and applies to already-running agents on their next compaction. Resolution therefore occurs per pending operation rather than at agent creation.

### Fixed built-in worker vs arbitrary compactor-agent selection

The current algorithm requires a worker that follows its exact structured-JSON contract. Allowing every visible agent to replace that worker turns strategy internals into unsafe global configuration. The design keeps the normal child-agent runtime mechanism and parent launch fallback but fixes the identity to `autobyteus-memory-compactor`. Future cost/model controls, if required, should be designed as explicit settings rather than arbitrary agent substitution.

### Tight registry metadata vs generic future configuration schema

Future strategies may use no agent, one agent, teams, files, or other mechanisms. A `configurationKind` or generic dynamic form today would be a mostly speculative shared structure. The registry/catalog therefore stays `{id,name}`; a future strategy with real settings adds a bounded product surface without changing execution or selection architecture.

### Effective selection read vs default metadata in the catalog

Available options and the normalized selection are different subjects. Putting `isDefault` or `isSelected` on catalog entries would duplicate runtime policy and still represent an explicit unknown value poorly. A separate scalar read through `ServerSettingsService` can call the exact core normalizer used at runtime, so absent/blank, explicit valid, and explicit unknown values have one authoritative meaning while catalog entries remain tight.

### Existing per-key save vs Compaction-specific patch/session API

The existing server mutation already owns validation and persistence for one setting, and the desktop Compaction surface stays inside one node-specific window. A new batch transaction or client/revision session would broaden ownership to solve a journey the product does not have. The selected design reuses the existing one-key store action, sequences changed valid fields in the card, stops on the first same-node failure, and lets authoritative reload plus dirty comparison show what remains unsaved. It claims neither rollback nor atomicity.

### Rename runtime context vs keep snapshot terminology

The design renames the runtime subject to `WorkingContext` and keeps “snapshot” only in persistence/restore names. This creates bounded cross-package churn but removes ongoing conceptual ambiguity.

### Remove redundant timestamp with epoch

`lastCompactionTs` is also unconsumed and would keep lifecycle metadata on the same runtime subject after epoch removal. Removing both yields a tight message-context value. Existing activity events remain the truthful operation history.

### Preserve current durable ordering

A full transactional redesign would conflict with the deliberately structural scope. The current strategy continues to own current memory/prune behavior, with residual crash risk documented rather than hidden.

## Risks

- Message copying may accidentally lose tool payload prototypes, native tool-call context, or provenance metadata; targeted clone/round-trip tests are mandatory.
- Strategy identity/configuration can drift if display name is used as a key or explicit unknown IDs silently fall back; ID/name validation and exact-resolution tests are mandatory.
- A registry can become a service locator if it reads settings or executes compaction; dependency-direction/source review must enforce registration/lookup-only ownership and resolver-only construction.
- Registry/catalog metadata can drift if the frontend hard-codes options or uses display names as IDs; query/store/component tests must prove bound-server list mapping.
- The persisted setting may be absent/blank while runtime has an effective default. The effective read must call the shared core normalizer; a frontend default or first-option guess would diverge when registrations change.
- A node binding can change while catalog/settings requests are in flight; stale responses must not overwrite the newly bound node's card state.
- The desktop card must not acquire responsibility for hypothetical same-window node switching during sequential writes. Another desktop node is opened in its own window; generic/mobile binding behavior remains a separate owner.
- Unknown persisted explicit strategy IDs must not be displayed or rewritten as the default; the card needs an explicit unavailable-ID recovery state.
- Removing arbitrary compactor selection may leave an old `.env` key visible as a custom Advanced setting. It is acceptable only if source/runtime tests prove it is inert.
- Fixed built-in lookup must preserve parent runtime/model fallback and normal run cleanup; otherwise UI simplification would cause a behavioral regression.
- Existing multiple setting mutations are not transactional. A later same-node failure cannot roll back an earlier success; the card must stop, keep the error and failed/unsent dirty values visible, and avoid a false all-saved state without a patch-result protocol.
- Reading the global setting only at agent creation would leave existing agents on stale strategies; operation-time live-update coverage is mandatory.
- Moving the complete algorithm may reorder store/prune/retrieve/rebuild steps and change output; deterministic equivalence tests are mandatory.
- Omitting parent agent identity or policy-derived prompt item limits during strategy construction would change child-run lineage and prompt bounds despite a compiling context-to-context API; exact construction tests are mandatory.
- An overly weak validator would permit false successful installation, while an overly semantic validator would recreate a generic constraints/evaluator boundary. Keep runtime enforcement to structural/head/tool/detachment facts and make quality/budget/provider behavior explicit tests.
- Deep copying must preserve `Message`, media arrays, metadata/provenance, `ToolCallPayload`, `ToolResultPayload`, tool arguments/results, and provider-native call context without shared mutable references.
- Shared projection can become accidental universal policy if executor/manager or unrelated future strategies import it; source dependency tests/review must keep its consumer set bounded to current strategy and restore.
- Removing block/raw-trace files may expose an undocumented external package consumer. Repository production search found none; the clean-cut policy rejects compatibility retention.
- Optional detailed compaction status fields may need current-strategy-specific reporter wiring. Do not solve this by changing the strategy return type.
- Existing non-transactional durable-memory/prune ordering remains a residual failure risk.
- Renaming the runtime type affects the server memory writer; the complete ticket affects core, server, and web builds/tests.

## Guidance For Implementation

- Follow the interface literally: read-only `id`, read-only `name`, and one `compact(WorkingContext): Promise<WorkingContext>` method. Do not add a second argument, generic options/constraints DTO, result wrapper, port, host, or provider abstraction.
- Implement the registry now with registration `{ id, name, create }`, exact-ID `get`, and id/name `list`; do not let it read environment/defaults or invoke compaction.
- Register only `structured-json` / `Structured JSON` in production. Use a test-only second global registration to prove extension and live selection.
- Expose registry `list()` through the bounded GraphQL catalog and binding-aware web catalog store. Keep entries id/name only. Expose the runtime-effective selected ID separately through ServerSettingsService/GraphQL using the shared core normalizer; do not hard-code frontend options/defaults or expose factories/dependencies/config schemas.
- Use `AUTOBYTEUS_COMPACTION_STRATEGY` as the only selection. Resolve it for each pending operation; do not add a strategy field to AgentConfig/agent definitions/run config or an ID/default branch to AgentFactory.
- Keep registry/ID/environment branches out of PendingCompactionExecutor and MemoryManager; the executor asks `WorkingContextCompactionStrategyResolver` and never silently falls back for an explicit unknown ID.
- Register/validate/persist the key through existing ServerSettingsService/AppConfig behavior; add only the subject-specific effective-ID read. In web code, retain `ServerSettingsStore.updateServerSetting` as the one-key mutation/reload authority; do not add a Compaction-specific patch action or parallel backend settings store.
- Remove `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` from predefined/runtime/bootstrap/UI behavior. A stale value is ignored, not migrated or read as fallback.
- Resolve only `autobyteus-memory-compactor` in the server compaction runner path, preserving explicit launch config/parent runtime-model fallback and truthful missing-definition failure.
- Refactor `CompactionConfigCard` to strategy-first catalog selection plus the server-reported effective-ID baseline and existing universal fields. Do not fetch `AgentDefinitionStore`, hard-code `structured-json`, call Apollo directly, or add revision/session state. Sequence the existing store action only for changed valid fields and implement the UI/read/simple-save states in the UI/UX supplement.
- Keep registry/catalog metadata at `{id,name}`. Do not add `configurationKind`, generic field schemas, frontend component IDs, or placeholder settings for imagined strategies.
- Do not implement future direct/team strategies or placeholder files.
- Do not put the strategy back into `MemoryManager` under a different property name.
- Ensure `WorkingContext` constructor/append/replace/copy/message exposure clones mutable nested message/media/metadata/provenance/tool/provider-native structures; a copied array with shared `Message` objects is insufficient for AC-PMCS-001/003/021. Adapt latest tool-call provenance enrichment to controlled `replaceMessage` before persistence.
- Bind the construction context exactly at LlmPhase: `agentId`, manager store, existing config runner, active input budget, policy `maxItemChars`, diagnostics. Map `agentId` to summarizer `parentAgentId`; do not put selection in AgentConfig or pass construction data to `compact`.
- Keep current structured JSON schema, episodic/semantic construction, private retrieval limits `3`/`20`, prompt-memory formatting, and raw-trace behavior unchanged unless a mechanical signature change is required.
- Use the shared `CompactedMemoryContextProjector` from both current strategy and restore fallback. Do not keep a restore import of a strategy-private rebuilder and do not expose the projector to generic executor/manager.
- Treat `MessageCompactionPlan` and related units as private current-strategy structures; do not export them as the universal contract.
- Remove dead code and tests rather than adding deprecation aliases.
- Keep persisted snapshot schema version 4 if its remaining required contract is unchanged; old extra keys are tolerated, not migrated.
- Preserve success ordering: strategy returns -> output validator accepts -> manager replacement persists -> pending request clear -> completed event.
- Preserve failure ordering: strategy missing/unknown/construction error/throw or validator rejection -> no manager replacement -> no success clear/completed event -> failure event/error. A validation error identifies its stable invariant code.
- Do not use request-time protocol repair as validation of strategy output; invalid output must never be installed.
- Do not modify skill-improvement code.
- Before implementation handoff, source review should confirm the authoritative boundary rule: executor depends on resolver, strategy, and manager—never on environment/registry details or their internals; the card depends on catalog/ServerSettingsStore—not agent definitions, default policy, clients, binding revisions, or runtime internals; Compaction writes reuse the existing one-key action and stop on first error.
