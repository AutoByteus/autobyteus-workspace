# Requirements Doc

## Status

`Reconciled after Code Review Round 7 / ready for architecture re-review` — the user-approved context-to-context, process-global strategy architecture, server-effective selection read, registry-backed Compaction card, and fixed built-in worker remain unchanged. CR-PMCS-009 corrects one over-designed desktop save premise: a desktop node has its own node-bound window, and the Compaction card reuses the existing simple per-key server-setting flow rather than adding Compaction-specific binding-revision fencing. Implementation and all downstream gate evidence remain superseded until this revised package passes architecture review.

## Goal / Problem Statement

Refactor the existing AutoByteus semantic memory-compaction implementation behind one clean working-context transformation boundary:

```text
current WorkingContext
    -> WorkingContextCompactionStrategy.compact(...)
    -> next WorkingContext
    -> MemoryManager replaces the current WorkingContext
```

This ticket does not add another compression algorithm. It moves the one currently shipped structured-JSON algorithm into the correct ownership shape and completes the global registration/resolution seam now. After this refactor, a future strategy must be addable by implementing the context-to-context contract and registering its stable identity; selecting it globally must not require another refactor of the compaction trigger, pending-request execution, working-context owner, agent configuration, agent factory API, or next-LLM rendering path.

The refactor must remove the unused working-context `epochId` rather than promoting it into the strategy contract or installation protocol. Strategy-specific planning, including prefix/suffix selection and oversized tool-result condensation, remains inside the current concrete strategy.

The global extension seam must be usable end to end in the existing Server Settings -> Basics -> Compaction card. The card presents registry-provided strategy names and persists their stable IDs. It does not expose the current strategy's internal worker as a generic agent selector. `Structured JSON` always invokes the built-in `autobyteus-memory-compactor`; another arbitrary agent definition is not a valid substitute or fallback.

## Investigation Findings

- Current runtime state already has a `WorkingContextSnapshot` class, but it mixes ordered messages with unused `epochId` and `lastCompactionTs` metadata. `epochId` increments only on `reset()`, not on append, and no runtime code uses it to reject stale work.
- `MemoryManager` owns the live working context, appends messages, persists it, and resets it after compaction. It also currently holds a concrete `Compactor`, which unnecessarily couples context ownership to one compression implementation.
- The present compaction algorithm is fragmented across `PendingCompactionExecutor`, `WorkingContextMessageWindowPlanner`, `WorkingContextCompactor`, `Compactor`, `Retriever`, and `WorkingContextSnapshotRebuilder`. The executor selects the current strategy's prefix/suffix before it calls the object named `WorkingContextCompactor`, so another strategy could not choose a different whole-context transformation without changing the executor.
- The production path uses `Compactor.compactWorkingContext(...)`. The separate `Compactor.compact(CompactionPlan)` raw-trace/block path and its `CompactionWindowPlanner` family are referenced only by tests/exports, not by production callers.
- The current algorithm asks one configured compaction agent for structured JSON containing one episodic summary and categorized semantic facts, persists those memory items, retrieves a bounded bundle, constructs one compacted-memory user message, and appends the retained suffix.
- Normal tool-call flow defers compaction until tool execution finishes and terminal tool results have been ingested. The pending compaction then runs before the next LLM request is rendered.
- `PendingCompactionExecutor` receives the active model input budget and feeds it into the current window planner. That budget influences current-strategy suffix planning; it is not a universal prefix/suffix rule.
- The compaction lifecycle is awaited inside request assembly/LLM phase. The next LLM request renders the replacement context only after successful replacement.
- Existing repository registries are kept as indexed lookup infrastructure rather than orchestration owners. The compaction design needs the same narrow rule: registration/enumeration by stable ID, while runtime composition owns selection and `PendingCompactionExecutor` owns execution lifecycle.
- Existing server settings use `ServerSettingsService -> AppConfig.set(...) -> process.env + persisted .env`; `AUTOBYTEUS_STREAM_PARSER` and default media-model settings demonstrate global behavior that is not placed on individual `AgentConfig` values.
- `CompactionRuntimeSettingsResolver` already reads compaction environment variables at execution time. Extending that global settings path allows an updated strategy selection to apply to subsequent compactions across already-created agents instead of freezing a choice when each agent is constructed.
- The existing `CompactionConfigCard.vue` does not expose `AUTOBYTEUS_COMPACTION_STRATEGY`. It instead fetches the complete visible agent-definition catalog and offers every definition as a `Compactor agent`, including unrelated agents with no structured-compaction compatibility marker.
- The existing server GraphQL settings query returns only key/value/description/editability metadata. It does not expose registry strategy identity/name metadata, so the frontend cannot truthfully discover future registrations without a bounded catalog query.
- The built-in `autobyteus-memory-compactor` definition contains the required structured-JSON instructions, has no tools or skills, and has no default launch configuration; its runtime/model therefore inherit from the parent run through the existing compaction runner. The bootstrap currently writes its ID to `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` only to support the generic selector.
- `CompactionAgentSettingsResolver` currently loads whichever agent definition ID that global setting names. This lets an unrelated or instruction-incompatible definition become the current strategy's worker and leaks an implementation dependency outside the `StructuredJsonCompactionStrategy` boundary.
- Current construction is more specific than runner/store/budget alone: `AgentFactory` passes the runtime agent ID as `parentAgentId` and `CompactionPolicy.maxItemChars` to `AgentCompactionSummarizer`; `LlmPhase` passes retrieval limits `maxEpisodic: 3` and `maxSemantic: 20` to the current executor. The target composition boundary must preserve each value without adding compact options or per-agent strategy selection.
- Current restore fallback imports `WorkingContextSnapshotRebuilder` from the compaction folder. The rebuilt durable episodic/semantic projection is therefore a real shared concern between current structured compaction and restore, not a private generic-strategy mechanism.
- Representative local data contains 415 `working_context_snapshot.json` files totaling 82,625,679 bytes. All contain `epoch_id`, `last_compaction_ts`, and `messages`; 212 use current schema version 4. The current version-4 validator requires only `schema_version`, `agent_id`, and a message array and tolerates extra fields.
- Current `ServerSettingsService.getAvailableSettings()` omits predefined settings whose configured value is absent or blank, while runtime normalization defaults that same state to `structured-json`. Registry catalog entries intentionally contain only `{ id, name }`, so the card needs a separate server-owned read of the normalized effective selected ID rather than a frontend default or first-option guess.
- Desktop node settings run inside a node-specific Electron window. `openNodeWindow(nodeId)` focuses or creates that node's window; `20.windowNodeBootstrap.client.ts` initializes its node context once; the Compaction surface has no production action that rebinds that same desktop window while saving.
- The only production caller of `WindowNodeContextStore.bindNodeContext(...)` outside the context store is the distinct mobile-session flow. Generic/mobile binding safeguards are not Compaction-card requirements and are not removed by this ticket.
- The existing simple web path already updates one setting through `ServerSettingsStore.updateServerSetting(...) -> GraphQL -> ServerSettingsService -> AppConfig`. A several-field card save may call that method sequentially; because the backend setting API is non-transactional, a same-node later-key failure can follow earlier successful writes and must not be presented as whole-card success.

Evidence and exact paths are recorded in `investigation-notes.md`.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md` | Stable context-to-context meaning, global-vs-agent selection boundary, safe-point rules, current prefix/suffix examples, and framework-versus-strategy invariant enforcement | REQ-PMCS-001–003, REQ-PMCS-006–007, REQ-PMCS-013, REQ-PMCS-019–020, REQ-PMCS-023, REQ-PMCS-025–030 | AC-PMCS-001–004, AC-PMCS-016–017, AC-PMCS-019–029 | User-approved; CR-PMCS-009 reconciled | Clarifies the invariant domain outcome. Prefix/suffix, episodic/semantic behavior, and built-in worker use are current-strategy details; selection is global and does not enter WorkingContext or agent configuration. |
| `tickets/in-progress/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md` | Strategy API, stable identity/name, registry, global environment setting/resolver, exact current construction, fixed built-in current worker, pre-install validation, shared projection, selection, dependency, and extension rules | REQ-PMCS-001, REQ-PMCS-004–005, REQ-PMCS-008, REQ-PMCS-010, REQ-PMCS-017–030 | AC-PMCS-001, AC-PMCS-005, AC-PMCS-009, AC-PMCS-013–024, AC-PMCS-027–029 | User-approved; CR-PMCS-009 reconciled | Defines the complete replaceable, registry-discoverable, globally selectable boundary and current strategy's ownership of its fixed built-in Memory Compactor. |
| `tickets/in-progress/pluggable-memory-compaction-strategies/compaction-strategy-settings-ui-ux-spec.md` | Strategy-first Compaction card, universal fields, effective-selection/default semantics, loading/empty/error/unknown-ID states, simple same-node save behavior, accessibility, and removal of the generic agent selector | REQ-PMCS-017, REQ-PMCS-019–021, REQ-PMCS-025–030 | AC-PMCS-013, AC-PMCS-015–017, AC-PMCS-023–029 | User-approved; CR-PMCS-009 reconciled | Defines the user-visible product behavior and registry-backed discovery journey in the real one-window/one-node desktop lifecycle. It extends rather than replaces the authoritative requirements and design. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor` + `Cleanup`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` + `File Placement Or Responsibility Drift` + `Duplicated Policy Or Coordination` + `Legacy Or Compatibility Pressure`.
- Refactor posture: `Likely Needed`.
- Evidence basis: the current executor performs the structured strategy's window planning and post-compression rebuilding; `MemoryManager` owns a concrete `Compactor`; `WorkingContextCompactor` does not return a working context; a second production-unused raw-trace compaction API remains exported/tested; and the Compaction card exposes an arbitrary agent selector while omitting the strategy identity that actually governs compaction.
- Requirement or scope impact: this ticket must change ownership and API shape while preserving the one current algorithm and continuation behavior, complete registry-backed global selection in the frontend, and remove both obsolete compaction paths and the generic compactor-agent selection path.

## Recommendations

1. Replace the runtime `WorkingContextSnapshot` value with one tight `WorkingContext` domain object whose subject is the ordered logical messages. Keep snapshot serialization/store names only for persisted snapshot concerns.
2. Define exactly one strategy method: `compact(workingContext: WorkingContext): Promise<WorkingContext>`.
3. Make the current structured-JSON implementation the only concrete strategy. Move its window planner, budget provider, summarizer, episodic/semantic update, retrieval, compacted-message construction, and retained-suffix reconstruction behind it.
4. Keep `PendingCompactionExecutor` responsible for pending-request lifecycle and invocation only. It must not know prefix, suffix, episodic, semantic, condenser, or JSON-result structures.
5. Keep `MemoryManager` responsible for the live working context, persistence, and replacement only. Remove its concrete `compactor` property.
6. Add a narrow global `WorkingContextCompactionStrategyRegistry` of identified/named strategy registrations now. It registers, resolves, and lists strategy definitions; each registration constructs its strategy from execution-scoped dependencies without leaking those dependencies into `compact(...)`.
7. Add one global setting, `AUTOBYTEUS_COMPACTION_STRATEGY`, defaulting to `structured-json`. Resolve it through the existing compaction runtime-settings path for each pending compaction, so a settings update applies globally to subsequent operations.
8. Keep `AgentConfig` free of strategy ID/selection fields. Keep `AgentFactory` free of default/ID/registry selection policy; its public API and per-agent configuration shape do not change.
9. Register the global setting with `ServerSettingsService` so the existing settings persistence path updates both `.env` and `process.env`. Validate IDs against registry metadata. Expose the same registry `id`/`name` enumeration through a bounded read-only GraphQL catalog query.
10. Validate every returned context at the framework boundary before `MemoryManager` replacement. Keep mechanically enforceable invariants in one `WorkingContextCompactionOutputValidator`; keep semantic sufficiency and budget quality strategy-owned/test-enforced rather than creating a generic constraints DTO.
11. Allocate durable episodic/semantic prompt projection to one narrow `CompactedMemoryContextProjector` shared by `StructuredJsonCompactionStrategy` and restore; do not expose it to generic pending execution or future strategies.
12. Remove the unused epoch and other unconsumed working-context generation metadata rather than creating concurrency machinery without a concurrent mutation path.
13. Remove the production-unused block/raw-trace compaction branch and its test-only support files/exports.
14. Update the existing Compaction card so strategy is the first field, options come from the opened node window's server registry catalog, and trigger ratio/context override/detailed logs retain their existing semantics. Cover loading, empty, catalog-error, unknown-current-ID, validation, same-node save/error, responsive, localization, and accessibility states.
15. Remove `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` as a predefined/runtime selection, remove the card's agent-definition dependency and selector, and make the server compaction runner resolve only the built-in `autobyteus-memory-compactor`. A missing/invalid built-in definition fails truthfully; there is no arbitrary-agent fallback.
16. Add one subject-specific server read for the normalized effective selected strategy ID. It must call the same core normalizer/default used by runtime, return an explicit unknown ID unchanged for truthful unavailable-state rendering, and remain separate from the tight `{ id, name }` catalog.
17. Reuse `ServerSettingsStore.updateServerSetting(...)` for each deliberately changed valid field in deterministic order. Stop after the first same-node mutation failure, keep the server error visible, leave failed/unsent fields dirty, never report whole-card success after only partial persistence, and add no Compaction-specific revision/session/result API.

## Scope Classification

`Large`

Rationale: the structural refactor spans `autobyteus-ts` memory/runtime composition, `autobyteus-server-ts` strategy catalog/settings/built-in-runner composition, and `autobyteus-web` settings UI/state/localization. It adds no second compression algorithm, per-agent selection, generic dynamic strategy form, or new durable-memory schema, but it now completes the global extension seam from registry through server discovery and frontend selection while cleanly removing the arbitrary compactor-agent path.

## In-Scope Use Cases

- **UC-PMCS-001:** A normal agent run reaches the compaction threshold, runs the existing structured-JSON compaction behavior, replaces its working context, and continues with the next LLM request.
- **UC-PMCS-002:** A completed tool call/result group remains protocol-valid across compaction, and compaction still waits until the tool result is available.
- **UC-PMCS-003:** A failed or unavailable current strategy leaves the current working context installed and exposes the existing failure lifecycle.
- **UC-PMCS-004:** The global resolver constructs the currently selected strategy from operation/runtime dependencies without storing it inside `MemoryManager` or adding selection to `AgentConfig`/`AgentFactory`.
- **UC-PMCS-005:** A test strategy can transform a `WorkingContext` into another `WorkingContext` without requiring the executor or manager to understand its planning algorithm.
- **UC-PMCS-006:** Existing current-schema working-context snapshot files load after epoch/generation metadata removal without migration.
- **UC-PMCS-007:** Pending execution reads the global strategy ID, resolves the registered strategy, and uses it without an algorithm-specific branch in the executor or manager.
- **UC-PMCS-008:** A test-only second strategy can be registered and selected globally by ID to prove that a later production strategy requires implementation and registration rather than another compaction-architecture refactor.
- **UC-PMCS-009:** Updating the global server setting changes the strategy used by subsequent compactions across already-created agents without changing or recreating their `AgentConfig`.
- **UC-PMCS-010:** A selected strategy returns an invalid context; framework validation rejects it before installation, preserves the live context and pending request, and reports failure with the violated invariant.
- **UC-PMCS-011:** Current structured compaction and restore fallback use one shared durable episodic/semantic-to-working-context projector without making that projector part of the universal strategy API.
- **UC-PMCS-012:** A user opens the bound server's Compaction card, sees the registry-provided current strategy name plus the existing universal controls, changes the global strategy ID, and subsequent compactions use it without agent recreation.
- **UC-PMCS-013:** The current `Structured JSON` strategy invokes the fixed built-in Memory Compactor with parent runtime/model inheritance and offers no arbitrary agent-definition selection or fallback.
- **UC-PMCS-014:** A catalog load failure or obsolete explicit strategy ID is shown truthfully and can be retried/recovered without silently writing or displaying the default as active.
- **UC-PMCS-015:** On an absent or blank strategy setting, the card shows the server-reported runtime-effective `Structured JSON` selection as clean without persisting it merely because the card loaded or an unrelated universal field was saved.
- **UC-PMCS-016:** A user opens one desktop window already bound to the intended node, edits several valid Compaction settings, and saves them through the existing per-key setting flow. Full success shows authoritative values for that same node; if a later key fails after an earlier key succeeded, the card shows the same-node error, does not claim whole-card success, and leaves failed or unsent values dirty. Opening another node uses that node's separate window rather than rebinding this save surface.

## Out of Scope

- Implementing a second strategy, including direct compacted-memory or multi-agent worktrace strategies.
- Per-agent, per-team, or per-run compaction-strategy selection.
- A generic dynamic strategy-settings schema, plugin marketplace, or strategy-specific form framework. Future strategies with genuinely distinct user settings add deliberately designed bounded surfaces.
- Selecting an arbitrary compactor agent or a separate compaction runtime/model. The current strategy owns the built-in Memory Compactor and inherits the parent run's runtime/model under the existing launch fallback.
- Changing the current compaction agent's structured JSON response schema.
- Redesigning episodic or semantic memory identity, lifecycle, selection, or physical persistence.
- Changing the existing prefix/suffix algorithm, recent-suffix policy, tool-result condenser, retrieval limits, or prompt-memory rendering content except where a mechanical adaptation is required by the new boundary.
- Introducing a generic constraints/options DTO, replacement-proposal DTO, provider host, execution port, or plugin marketplace.
- Skill improvement, procedural memory, or the skill improver.
- A broader crash-consistent memory transaction redesign. Current persistence ordering is preserved unless a bounded change is strictly required to complete the structural refactor; residual durability risk must remain explicit.
- Provider-native compaction behavior for Codex/Claude backends; this ticket concerns AutoByteus semantic working-context compaction.

## Functional Requirements

- **REQ-PMCS-001 — Clean strategy API:** The replaceable strategy boundary shall expose stable identity metadata and `compact(workingContext: WorkingContext): Promise<WorkingContext>`. The execution method shall not expose a generic constraints bag, `MemoryUpdate`, or `WorkingContextReplacementProposal` as its public result.
- **REQ-PMCS-002 — Tight working-context subject:** The runtime `WorkingContext` shall represent the ordered logical messages used to prepare the next LLM request. Strategy-internal generations, checkpoints, episodic/semantic files, and operation state shall not be fields on this domain object.
- **REQ-PMCS-003 — Detached transformation:** The strategy shall receive a detached working-context value and return a distinct `WorkingContext` instance. `WorkingContext` construction, append, copy, and message exposure shall deep-copy mutable message, media, metadata/provenance, tool-payload, tool-argument/result, and provider-native context structures so distinct instances cannot share mutable nested state. The strategy shall not mutate the live context owned by `MemoryManager` while compression is running.
- **REQ-PMCS-004 — One current strategy:** This ticket shall implement and register only the existing structured-JSON behavior as one concrete `WorkingContextCompactionStrategy`. No alternate production algorithm shall be registered or exposed.
- **REQ-PMCS-005 — Current-strategy encapsulation:** Prefix/suffix planning, input-budget interpretation, complete tool-unit handling, oversized tool-result condensation, invocation of the fixed built-in Memory Compactor, structured JSON generation/parsing, episodic/semantic updates, retrieval-limit choice, and use of the shared durable-memory projector shall be owned behind the current strategy boundary rather than by `PendingCompactionExecutor`, `MemoryManager`, or generic frontend configuration. Only the narrow durable episodic/semantic-to-context projection implementation is shared with restore; it is not a universal strategy dependency.
- **REQ-PMCS-006 — Tool-safe execution:** Compaction shall continue to run only after normal tool execution has produced and ingested matching terminal results. Before installation, framework validation shall reject any replacement containing an orphan tool result, an incomplete retained call/result group, blank call IDs, duplicate call IDs within one assistant tool-call batch, duplicate results within a group, or a role/payload mismatch.
- **REQ-PMCS-007 — Working-context replacement owner:** `MemoryManager` shall remain the authoritative owner of the live working context and its persisted snapshot. It shall expose clear read/capture and replace operations, but shall not construct, select, or execute a compaction strategy.
- **REQ-PMCS-008 — Global runtime strategy resolution:** The pending-compaction path shall resolve the global configured/default strategy through the registry at operation time and construct it from the bounded active-runtime inputs required to preserve current behavior. Callers above that boundary shall not depend on both the strategy boundary and the current strategy's planner/summarizer/projection internals.
- **REQ-PMCS-009 — Preserve current behavior:** For equivalent input and deterministic compaction-agent output, the refactored current strategy shall preserve current episodic/semantic writes, compacted-memory rendering, retained suffix, raw-trace archival behavior, compaction request clearing on success, and next-request continuation behavior.
- **REQ-PMCS-010 — Future extension seam:** A future strategy shall be addable by implementing the same context-to-context interface and registering its stable identity plus construction callback. The global settings key, registry API, current pending executor, `MemoryManager` replacement API, agent configuration/factory public API, and next-request rendering path shall not require algorithm-specific branches or another structural refactor.
- **REQ-PMCS-011 — Remove unused epoch/generation state:** `epochId`/`epoch_id` shall be removed from the runtime working-context object, serialized output, and tests. Investigation found no behavioral consumer. `lastCompactionTs`/`last_compaction_ts` shall also be removed because it is likewise unconsumed and would otherwise keep non-context lifecycle metadata on the compacted subject.
- **REQ-PMCS-012 — Clean-cut legacy removal:** The production-unused `Compactor.compact(CompactionPlan)` block/raw-trace path, its inheritance wrapper, test-only planners/builders/digests/prompts, obsolete exports, and compatibility aliases shall be removed when no production reference remains.
- **REQ-PMCS-013 — Failure semantics:** If no current strategy is configured, construction fails, the strategy throws, or returned-output validation fails, `MemoryManager` shall retain the original working context, the pending request shall remain uncleared, the compaction operation shall report failure, and a false completed state shall not be emitted. Validation failures shall identify the violated invariant. If the existing manager/store replacement call itself throws, the request still shall not be cleared and completed shall not be emitted; transactional rollback of that existing write boundary remains outside this structural ticket.
- **REQ-PMCS-014 — Persisted snapshot direct use:** Current schema-version-4 snapshot files containing obsolete extra epoch/timestamp fields shall remain readable through the normal version-agnostic reader. No migration or dual runtime reader shall be added.
- **REQ-PMCS-015 — Compaction lifecycle continuity:** Existing requested/started/completed/failed operation identity and user-visible lifecycle behavior shall remain. Strategy-specific diagnostic counts/agent metadata must remain off the context-to-context return contract.
- **REQ-PMCS-016 — Skill boundary:** Skill-improvement and procedural-memory behavior shall remain unchanged.
- **REQ-PMCS-017 — Stable strategy identity:** Every registered strategy shall expose a non-empty stable `id` used for global configuration/resolution and a non-empty user-facing `name` used by the current registry-backed settings UI. The current strategy identity shall be `structured-json` / `Structured JSON`. Display text shall not be used as the lookup key.
- **REQ-PMCS-018 — Narrow registry ownership:** `WorkingContextCompactionStrategyRegistry` shall own duplicate-safe registration, lookup by stable ID, and deterministic identity/name enumeration. Registrations may expose construction callbacks, but the registry shall not choose defaults, inspect working contexts, invoke compaction, manage fallback, or own pending-operation lifecycle.
- **REQ-PMCS-019 — Global selection ownership:** `AUTOBYTEUS_COMPACTION_STRATEGY` shall be the single strategy selection for the process/server, with absent/blank value defaulting to `structured-json`. A global strategy resolver shall read it for each pending operation, perform exact registry lookup, and return the strategy. An unknown explicit ID shall fail that compaction without silent fallback or working-context replacement.
- **REQ-PMCS-020 — No per-agent selection:** `AgentConfig`, serialized agent definitions, run configuration, team/member configuration, and agent-creation UI shall gain no compaction-strategy ID/name field. `AgentFactory` shall gain no strategy-selection/default policy and no strategy-specific ID branch; only the existing compactor construction removed by this refactor may be mechanically unwired.
- **REQ-PMCS-021 — Server-settings integration:** `ServerSettingsService` shall register `AUTOBYTEUS_COMPACTION_STRATEGY` as a predefined editable global setting, validate normalized values against registered strategy IDs, and use the existing `AppConfig.set` path so an update persists to `.env` and immediately updates `process.env` for subsequent compactions. The frontend shall continue using the existing setting mutation rather than introduce per-agent or parallel configuration persistence.
- **REQ-PMCS-022 — Exact bounded construction:** `WorkingContextCompactionStrategyConstructionContext` shall contain only `agentId`, `memoryStore`, existing `compactionAgentRunner`, active `inputBudgetTokens`, current `maxItemChars`, and the compaction diagnostics boundary. `LlmPhase` shall obtain them from the current `AgentContext`/`MemoryManager`/resolved budget and pass them per pending operation. The structured registration shall map `agentId` to the summarizer's `parentAgentId`, pass `maxItemChars` unchanged, and keep current retrieval limits `3` episodic / `20` semantic as named private constants of `StructuredJsonCompactionStrategy`. The context shall not become a service locator, compact-method options object, or strategy selection field.
- **REQ-PMCS-023 — Pre-install output validation:** `PendingCompactionExecutor` shall keep a stable validation baseline, pass a second detached copy to the strategy, and run `WorkingContextCompactionOutputValidator` after `strategy.compact(strategyInput)` and before `MemoryManager.replaceWorkingContext(next)`. The validator shall runtime-enforce `next !== strategyInput`, unchanged leading system/head messages relative to the baseline, valid message roles/payload shapes, and complete non-orphaned native tool protocol. Semantic continuation sufficiency, compression quality, active-budget boundedness, and provider-specific render quality remain strategy-owned and test-enforced because the framework cannot prove them generically. No constraints DTO or result wrapper shall be introduced.
- **REQ-PMCS-024 — Shared compacted-memory projection:** One `CompactedMemoryContextProjector` in a shared memory projection boundary shall own bounded episodic/semantic retrieval plus construction of the synthetic compacted-memory user message and complete head/continuation `WorkingContext`. It shall serve `StructuredJsonCompactionStrategy` and restore fallback only. `PendingCompactionExecutor`, `MemoryManager`, and unrelated future strategies shall not depend on it.
- **REQ-PMCS-025 — Registry-backed strategy catalog:** The server shall expose one read-only working-context-compaction strategy catalog derived directly from `WorkingContextCompactionStrategyRegistry.list()`. Each entry contains only stable `id` and user-facing `name`; no factory, construction dependency, agent definition, or strategy-internal setting is exposed. The catalog is bound to the queried server node, preserves deterministic registry order, and is the only available-option authority for the Compaction card.
- **REQ-PMCS-026 — Fixed built-in current worker:** `StructuredJsonCompactionStrategy` shall invoke only the built-in agent definition `autobyteus-memory-compactor` through the existing server compaction-run mechanism. `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, its predefined setting metadata/getter/bootstrap default, arbitrary-definition resolver behavior, and the Compaction card's agent selector/catalog dependency shall be removed. The built-in definition's blank launch config shall continue to inherit the parent run's runtime/model. A missing/invalid built-in definition shall fail the compaction without fallback to another agent. A stale environment value for the removed key is inert and shall not be read by normal runtime code.
- **REQ-PMCS-027 — Strategy-first Compaction card:** The existing Compaction card shall present the registry-backed `Compaction strategy` selector first, followed by the existing trigger ratio, effective context override, and detailed-log controls. It shall load catalog/settings from the server to which the current desktop window is already bound, persist only changed valid settings through the existing server-setting update, never write a guessed/default strategy while catalog authority is unavailable, never hard-code names as IDs, never fetch the agent-definition catalog, and implement the loading, empty, error/retry, unknown-current-ID, invalid-input, dirty, saving, same-node save-failure, responsive, localization, keyboard, and accessible-name behavior defined in `compaction-strategy-settings-ui-ux-spec.md`.
- **REQ-PMCS-028 — No predicted generic strategy forms:** Strategy registration/catalog metadata shall remain the tight `{ id, name }` identity subject. This ticket shall not add `configurationKind`, a generic settings schema, UI component IDs, mostly-optional configuration DTOs, or strategy-specific fields to the universal strategy/registry contract. A future configurable strategy may add a bounded product surface without changing the context-to-context execution, registry identity, global strategy setting, pending executor, or `MemoryManager` boundaries.
- **REQ-PMCS-029 — Server-owned effective selection read:** `ServerSettingsService` shall expose a subject-specific read of the normalized runtime-effective working-context compaction strategy ID, and GraphQL shall expose it as `getEffectiveWorkingContextCompactionStrategyId: String!`. This read shall call the same core `normalizeWorkingContextCompactionStrategyId` function used by runtime: absent or blank becomes `structured-json`; an explicit value, including an unknown historical/environment value, remains that normalized explicit ID. It shall not derive the default from registry order, add default/selection fields to catalog entries, or write a setting. The Compaction card shall use this effective ID as its selection and dirty-state baseline; missing/blank persisted configuration is clean and shall not be written on load or while saving only unrelated controls.
- **REQ-PMCS-030 — Simple node-window settings save:** The authoritative desktop journey is `open the node's own window -> edit Compaction settings -> save -> use that node`. The card shall reuse `ServerSettingsStore.updateServerSetting(key, value)` and the existing `ServerSettingsService/AppConfig` per-key authority for deliberately changed valid values; its save path shall not consume generic `settingsBindingRevision` or add `expectedBindingRevision`, `updateSettingsForBinding`, `BoundServerSettingsPatchResult`, captured-client fencing, or previous-node/rebind presentation. Changed keys may be sent sequentially in deterministic order. On the first mutation failure, remaining keys are not sent, the same-node server error remains visible, successfully persisted earlier fields are not described as rolled back, failed/unsent fields remain dirty, and whole-card success is not shown. Existing generic binding-aware reads and mobile binding infrastructure are unchanged and outside this Compaction save contract.

## Acceptance Criteria

- **AC-PMCS-001:** A test registration supplying `id`, `name`, a construction callback, and a strategy implementing `compact(WorkingContext): Promise<WorkingContext>` can be selected globally, receives the complete detached current context, returns a replacement, and causes the next assembled LLM request to use that replacement.
- **AC-PMCS-002:** The current structured-JSON strategy, given deterministic compaction-agent output, produces the same logical result as today: stable system/head messages, one derived compacted-memory user message, and the retained recent/tool-safe suffix.
- **AC-PMCS-003:** A tool-calling scenario proves the order `tool call -> tool execution -> result ingestion -> compaction -> next LLM render` and proves matching call/result messages are retained or removed only as a complete unit under the unchanged current algorithm.
- **AC-PMCS-004:** Two sequential current-strategy compactions replace the prior compacted-memory projection rather than accumulating multiple synthetic memory messages, while later context remains available for continuation.
- **AC-PMCS-005:** `PendingCompactionExecutor` and `MemoryManager` compile and test without importing the concrete strategy's window planner, message-unit plan, JSON result, episodic/semantic, retriever, or rebuilder types.
- **AC-PMCS-006:** When the strategy throws, the exact pre-compaction working-context messages remain installed, the pending request is not falsely completed/cleared, and a failed lifecycle event is emitted.
- **AC-PMCS-007:** Runtime and serialized output contain no `epochId`, `epoch_id`, `lastCompactionTs`, or `last_compaction_ts`; tests no longer assert generation increments.
- **AC-PMCS-008:** Representative schema-version-4 snapshot payloads that contain obsolete `epoch_id` and `last_compaction_ts` still validate and restore their messages, and the next normal write omits those fields without migration.
- **AC-PMCS-009:** Source search and package exports show no remaining production `Compactor.compact(CompactionPlan)` path or compatibility alias; tests for the removed dead path are removed rather than rewritten to preserve it.
- **AC-PMCS-010:** Existing episodic, semantic, raw-trace, compacted-memory manifest, and compaction-agent JSON shapes remain directly usable and unchanged.
- **AC-PMCS-011:** Existing compaction status projections continue to receive correct operation identity and requested/started/completed/failed phases; optional strategy diagnostics do not alter the strategy return type.
- **AC-PMCS-012:** Skill-improvement source and durable skill behavior are unchanged.
- **AC-PMCS-013:** Global registry enumeration contains exactly one production strategy, `{ id: "structured-json", name: "Structured JSON" }`, and registry lookup resolves that exact registration by ID; duplicate IDs and blank identity fields are rejected deterministically.
- **AC-PMCS-014:** With `AUTOBYTEUS_COMPACTION_STRATEGY` set to a test-only second registered ID, the normal pending-execution path uses that strategy without modifying `PendingCompactionExecutor`, `MemoryManager`, `WorkingContext`, `AgentConfig`, `AgentFactory` selection logic, or request assembly; the next rendered request uses its returned context.
- **AC-PMCS-015:** An unknown explicit global strategy ID fails with the unknown ID identified and does not silently select `structured-json`; an absent/blank value selects `structured-json`; a missing/invalid built-in Memory Compactor remains a truthful current-strategy failure with no arbitrary-agent fallback.
- **AC-PMCS-016:** Source/API tests prove `AgentConfig.copy()`, agent-definition/run configuration, and agent creation accept no compaction-strategy selection field, and source review finds no strategy-ID/default branch in `AgentFactory`.
- **AC-PMCS-017:** Updating `AUTOBYTEUS_COMPACTION_STRATEGY` through `ServerSettingsService` validates the registered ID, writes it to the configured `.env`, updates `process.env`, and causes the next pending compaction of an already-created agent to resolve the new global ID without agent recreation.
- **AC-PMCS-018:** A deterministic current-strategy equivalence test proves operation-time construction supplies the current agent ID as compaction-task `parentAgentId`, the active `MemoryStore`, existing runner, resolved input budget, `CompactionPolicy.maxItemChars`, and diagnostics; structured projection retrieves exactly `3` episodic and `20` semantic items by its named private constants.
- **AC-PMCS-019:** When a test strategy returns a context that omits, reorders, or changes a required leading system/head message, pre-install validation reports the head invariant, does not call `MemoryManager.replaceWorkingContext`, leaves the exact live context and pending request in place, emits failed, and never emits completed.
- **AC-PMCS-020:** When a test strategy returns an orphan tool result, an incomplete retained tool group, a blank call ID, duplicate call IDs within one assistant tool-call batch, duplicate results within a group, or a role/payload mismatch, pre-install validation identifies the tool-protocol invariant and produces the same no-replacement/no-clear/failed-only outcome.
- **AC-PMCS-021:** When a test strategy returns its input `WorkingContext` instance, pre-install validation rejects the aliased output. Clone/round-trip tests prove distinct contexts share no mutable message, media, metadata/provenance, tool payload, arguments/results, or provider-native context objects; mutating a `buildMessages()` result does not mutate the context. A focused manager-ingestion test proves the existing latest tool-call provenance enrichment is persisted through the new controlled `replaceMessage` operation.
- **AC-PMCS-022:** Source and focused restore/current-strategy tests prove both `StructuredJsonCompactionStrategy` and `WorkingContextSnapshotBootstrapper` use the shared `CompactedMemoryContextProjector`; restore does not import a structured-strategy-private rebuilder, and generic executor/manager code does not import the projector.
- **AC-PMCS-023:** The bound server GraphQL catalog returns exactly the production registry enumeration `{ id: "structured-json", name: "Structured JSON" }`; the Compaction card renders the returned `name`, persists the returned `id`, and a test-only second registration appears through the same query/card option mapping without a frontend hard-coded strategy branch.
- **AC-PMCS-024:** The Compaction card contains no compactor-agent selector, selected-agent launch summary, missing-agent warning, or agent-definition catalog fetch. Source search shows no normal runtime read of `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; setting that stale environment key to an unrelated agent does not change the fixed built-in definition used by `Structured JSON`.
- **AC-PMCS-025:** Frontend coverage proves registry loading/empty/error-retry states, an explicit unknown configured-ID warning with no silent default display/write, changed-key-only persistence (including safe universal-field save while catalog is unavailable), same-node save failure with no false clean/success state, and existing binding-aware read invalidation discarding stale catalog/settings responses. The read behavior does not create a Compaction-specific rebind-save state or test.
- **AC-PMCS-026:** Frontend coverage proves the Compaction card orders strategy before trigger/context/log controls; preserves ratio conversion, positive context override, and detailed-log semantics; validates invalid inputs; localizes new/removed labels in English and Simplified Chinese; and gives the icon save control an accessible name and busy/disabled state.
- **AC-PMCS-027:** Server runner/settings/bootstrap coverage proves the current strategy always resolves `autobyteus-memory-compactor`, preserves its parent runtime/model fallback, fails truthfully if that built-in definition is unavailable/invalid, registers no predefined compactor-agent setting/default, and never falls back to another visible agent definition.
- **AC-PMCS-028:** Server/API/frontend coverage proves the effective-selection read and card baseline for five cases: absent key -> `structured-json` and clean; blank key -> `structured-json` and clean; explicit registered ID -> that ID and clean; explicit unknown ID -> that exact ID with unavailable warning and no silent fallback; and absent key with a test-only second registration -> `structured-json`, not the first/other catalog entry. Loading the card or saving only another changed universal setting does not persist the default strategy ID.
- **AC-PMCS-029:** Frontend component/store coverage proves the real desktop journey: each node opens or focuses its own window; the Compaction card calls the existing `updateServerSetting` only for changed valid keys in deterministic order; full success leaves the card clean with authoritative same-node values; a first-key failure sends no later key; and a later-key failure after an earlier success shows the server error, sends no remaining key, leaves failed/unsent values dirty, and never shows whole-card success. Source and test search show no Compaction-save use of binding revision, patch-result type, revision parameter/state, rebind/previous-node branch, or dedicated rebind localization/test, while unrelated generic/mobile binding-aware reads and safeguards remain untouched.

## Constraints / Dependencies

- Authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`.
- Task branch: `codex/pluggable-memory-compaction-strategies`.
- Refreshed base and expected finalization target: `origin/personal` / `personal`; current design base `fdb370d4`.
- Preserve the existing normal agent/tool model, compaction agent runner, provider renderers, and built-in Memory Compactor skill behavior.
- The Compaction card remains a global server-settings surface in the desktop window already bound to the current node. It does not become an agent-creation surface or a node-switching surface.
- The public strategy execution method remains context-to-context; stable `id`/`name` metadata is read-only. Construction callbacks receive only runtime construction dependencies and do not change the universal compact method into a constraints/options API.
- `AUTOBYTEUS_COMPACTION_STRATEGY` is process-global and is read for each pending operation; it is not copied into agent/run/team persistence.
- Reuse `ServerSettingsService`/`AppConfig`; `AppConfig.set` already updates the process environment and `.env` file.
- Reuse the core `normalizeWorkingContextCompactionStrategyId` function for both runtime resolution and the server effective-selection read; do not duplicate `structured-json` default policy in GraphQL or web code.
- Reuse the existing `ServerSettingsStore.updateServerSetting`, `ServerSettingsService`, and `AppConfig` path. Do not add a Compaction-specific batch/patch API or claim atomic multi-key persistence. Do not remove or redesign generic/mobile `WindowNodeContextStore` safeguards in this ticket.
- The user approved the revised frontend/fixed-built-in direction and the completed updated package on 2026-07-14. Architecture re-review is authorized; earlier gate results remain superseded.

## Persisted Data Outcome

- Stored subject / location: per-agent `working_context_snapshot.json` under `/Users/normy/.autobyteus/server-data/memory/agents/<agent-id>/`; unchanged episodic, semantic, raw-trace, and compacted-memory files in the same agent memory roots; server `.env` may contain the now-obsolete `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` key.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve every serialized message and existing memory file. Obsolete `epoch_id` and `last_compaction_ts` keys may remain in older files until the next ordinary snapshot write replaces the payload. A stale compactor-agent environment key is directly usable as an ignored custom configuration extra: no normal runtime reads it, it provides no compatibility path, and an operator may delete it from Advanced settings without migration.
- Unacceptable data loss or corruption: loss/reordering of working-context messages, split tool protocol, loss of current structured memory, or failure to restore current schema-version-4 snapshots.
- Relevant availability, maintenance-window, or rollout constraints: none; normal reads tolerate the stored superset and normal writes contract the payload in place.
- Related requirement and acceptance-criteria IDs: REQ-PMCS-009, REQ-PMCS-011, REQ-PMCS-014, REQ-PMCS-026; AC-PMCS-007, AC-PMCS-008, AC-PMCS-010, AC-PMCS-024, AC-PMCS-027.

## Assumptions

- Compaction remains awaited in the single agent-turn/request-assembly lifecycle; this ticket does not introduce concurrent live-context mutation during one compaction call.
- The current structured-JSON algorithm remains product behavior even though it becomes one replaceable implementation.
- The compaction-agent input budget can be resolved through the concrete strategy's construction/dependency boundary without adding it to the universal strategy method.
- The active LLM boundary can supply the current runtime `agentId`, `MemoryStore`, existing compaction runner, active input budget, current `CompactionPolicy.maxItemChars`, and diagnostics without changing `AgentConfig` or `AgentFactory` public APIs.
- Existing optional diagnostic fields can remain off-spine; preserving lifecycle identity and truthful phase is mandatory.
- The built-in Memory Compactor remains a normal built-in agent definition and its blank launch configuration continues to inherit runtime/model from the parent run; only its free-selection setting/UI is removed.

## Risks / Open Questions

- The current strategy mutates durable episodic/semantic/raw-trace state before the outer working-context replacement completes. A complete crash-consistent transaction redesign is intentionally outside this structural ticket and remains a known residual durability risk.
- `WorkingContext` detachment must clone enough message/tool payload structure that a strategy cannot mutate the manager's live messages through shared object references.
- Strategy-specific diagnostic counts currently travel through a result object. The design must preserve needed observability through the existing reporter/logging concern without weakening the context-to-context return type.
- Global selection is snapshotted when each pending operation resolves its strategy; a settings update affects the next operation and must not swap an already-executing strategy mid-call.
- Registry discovery, effective strategy selection, and generic server settings are distinct server-owned read subjects. The Compaction card must coordinate them for the same bound node without duplicating strategy metadata, default policy, or agent definitions.
- Multiple per-key settings updates remain non-transactional. If a later same-node write fails, earlier successful values remain persisted; the card must show the error, leave failed/unsent values dirty, and avoid whole-card success without inventing a binding-session protocol.
- The generic Advanced server-settings surface may display an old `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` value as an inert deletable custom key after predefined metadata is removed. No current compaction behavior may read it.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Use Cases |
| --- | --- |
| REQ-PMCS-001, REQ-PMCS-002, REQ-PMCS-003, REQ-PMCS-007 | UC-PMCS-001, UC-PMCS-005 |
| REQ-PMCS-004, REQ-PMCS-005, REQ-PMCS-008, REQ-PMCS-010 | UC-PMCS-004, UC-PMCS-005, UC-PMCS-007, UC-PMCS-008, UC-PMCS-009 |
| REQ-PMCS-006, REQ-PMCS-009 | UC-PMCS-001, UC-PMCS-002 |
| REQ-PMCS-011, REQ-PMCS-014 | UC-PMCS-006 |
| REQ-PMCS-012 | UC-PMCS-004, UC-PMCS-005 |
| REQ-PMCS-013, REQ-PMCS-015 | UC-PMCS-003 |
| REQ-PMCS-016 | All (explicit non-impact boundary) |
| REQ-PMCS-017, REQ-PMCS-018, REQ-PMCS-019 | UC-PMCS-004, UC-PMCS-007, UC-PMCS-008 |
| REQ-PMCS-020, REQ-PMCS-021 | UC-PMCS-004, UC-PMCS-007, UC-PMCS-009 |
| REQ-PMCS-022 | UC-PMCS-001, UC-PMCS-004 |
| REQ-PMCS-023 | UC-PMCS-003, UC-PMCS-005, UC-PMCS-010 |
| REQ-PMCS-024 | UC-PMCS-001, UC-PMCS-006, UC-PMCS-011 |
| REQ-PMCS-025, REQ-PMCS-027 | UC-PMCS-012, UC-PMCS-014 |
| REQ-PMCS-026 | UC-PMCS-001, UC-PMCS-003, UC-PMCS-013 |
| REQ-PMCS-028 | UC-PMCS-005, UC-PMCS-008, UC-PMCS-012 |
| REQ-PMCS-029 | UC-PMCS-012, UC-PMCS-014, UC-PMCS-015 |
| REQ-PMCS-030 | UC-PMCS-012, UC-PMCS-016 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-PMCS-001, AC-PMCS-005 | Minimal replaceable interface and authoritative-boundary enforcement |
| AC-PMCS-002, AC-PMCS-004, AC-PMCS-010 | Behavior preservation for the current structured-JSON strategy |
| AC-PMCS-003 | Tool-safe execution ordering and atomic protocol units |
| AC-PMCS-006, AC-PMCS-011 | Truthful failure/lifecycle behavior |
| AC-PMCS-007, AC-PMCS-008 | Epoch/timestamp removal and direct persisted-data use |
| AC-PMCS-009 | Clean-cut removal of the dead compaction path |
| AC-PMCS-012 | Skill-improvement non-impact |
| AC-PMCS-013, AC-PMCS-014, AC-PMCS-015 | Strategy identity, registry enumeration/global resolution, future-strategy readiness, defaulting, and truthful invalid-selection behavior |
| AC-PMCS-016, AC-PMCS-017 | No per-agent configuration and existing global server-settings persistence/live-update behavior |
| AC-PMCS-018 | Exact current-strategy construction and retrieval-limit equivalence |
| AC-PMCS-019, AC-PMCS-020, AC-PMCS-021 | Framework-owned pre-install rejection of invalid head, tool protocol, and aliased output |
| AC-PMCS-022 | Shared compacted-memory projection ownership across current strategy and restore |
| AC-PMCS-023 | Registry-backed server discovery and frontend ID/name mapping |
| AC-PMCS-024, AC-PMCS-027 | Generic compactor-agent selection removal and fixed built-in worker behavior |
| AC-PMCS-025, AC-PMCS-026 | Compaction-card journeys, failure recovery, preserved universal controls, localization, and accessibility |
| AC-PMCS-028 | Runtime-effective selected-ID read and persisted-versus-effective clean/dirty semantics |
| AC-PMCS-029 | Real separate-window desktop journey, existing per-key save reuse, and truthful same-node failure/partial persistence |

## Approval Status

The user-approved product direction remains unchanged. Code Review Round 7 identified CR-PMCS-009 as a reviewer-amplified Requirement Gap: the earlier ARCH-PMCS-006 reconciliation invented a same-window desktop rebinding journey. This package keeps the server-owned effective-selection read, removes the unsupported Compaction-specific save fence, makes the actual one-window/one-node desktop journey authoritative, and is ready for architecture re-review without another product decision.
