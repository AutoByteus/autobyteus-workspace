# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

The current branch already has the right high-level timing for compaction but the wrong execution boundary and the wrong structural unit.

Current path:
`Completed LLM leg -> LLMUserMessageReadyEventHandler -> memoryManager.requestCompaction() -> LLMRequestAssembler.prepareRequest() -> Compactor.selectCompactionWindow() by whole turn IDs -> optional summarizer -> snapshot rebuild -> next LLM leg`

Current strengths:
- post-response trigger timing already matches the approved product behavior;
- provider-reported usage is already the primary trigger source;
- the system prompt is already kept as a dedicated system message during snapshot rebuild;
- the runtime already has episodic/semantic storage, snapshot persistence, and lifecycle event plumbing;
- the compaction settings card, status event type, detailed budget logs, and local-provider timeout hardening seams already exist on this branch.

Current design gaps:
- `LLMRequestAssembler` directly coordinates compaction internals (`policy`, `compactor`, `retriever`, `snapshot builder`, `flag clearing`) instead of calling one authoritative execution boundary.
- `Compactor.selectCompactionWindow()` still chooses whole `turnId`s and excludes `rawTailTurns` (default `4`).
- tool continuations stay on the same active `turnId`, so one long-running tool-heavy turn can accumulate most of the prompt while remaining entirely protected from compaction.
- `MemoryIngestInputProcessor` currently skips `SenderType.TOOL` input, so same-turn continuation cycles do not create any planner-visible boundary trace in the raw-trace stream.
- when compaction is required but `selectCompactionWindow()` returns nothing, the assembler currently clears the pending flag and emits `completed/skipped`, which is misleading and unsafe.
- historical large tool results are still rendered largely as raw stringified payloads when they remain in the raw tail.
- persisted working snapshots still rebuild from a whole-turn raw tail, so the snapshot schema must move with the new frontier model.
- the compaction prompt/response contract still asks for a generic `episodic_summary` plus a flat `semantic_facts` bag with model-generated `confidence`, which encourages mixed low-priority memory output.
- model-generated `confidence` is currently parsed and stored but is not used by retrieval or snapshot rendering, so it adds payload noise without runtime value.
- retrieved semantic memory is still rendered as one flat `[MEMORY:SEMANTIC]` section, so critical issues and unresolved work are not structurally prioritized over lower-value facts in the rebuilt prompt.
- already-persisted flat semantic memory from earlier successful runs has no explicit schema gate yet, so old `semantic.jsonl` entries would silently survive unless the redesign names an explicit rejection/reset path.

The target design must therefore preserve the good parts of the current runtime while replacing these specific weaknesses:
1. replace whole-turn compaction with same-turn block-based compaction;
2. replace fixed `last N turns` preservation with a minimal unresolved frontier;
3. replace `skipped success` with explicit blocked/failure behavior;
4. replace direct assembler coordination with one compaction execution boundary;
5. preserve the main system prompt unchanged;
6. keep the trigger post-response and usage-driven;
7. keep LM Studio/Ollama timeout hardening and typed operator controls in scope.
8. replace flat semantic-memory output with typed prioritized compacted-memory categories;
9. remove unused model-confidence output and add deterministic quality filtering/ranking.
10. add an explicit clean-cut rejection/reset path for already-persisted flat semantic memory.

## Intended Change

Introduce a production compaction subsystem centered on a new authoritative execution boundary, `PendingCompactionExecutor`, inside `autobyteus-ts/src/memory/compaction`.

The new subsystem keeps post-response triggering exactly where it is today, but changes what happens before the next dispatch:

- `LLMUserMessageReadyEventHandler` still captures provider usage and only marks compaction required.
- `MemoryIngestInputProcessor` stops fully skipping TOOL-originated continuation input and instead persists one lightweight `tool_continuation` boundary trace per same-turn continuation cycle.
- `LLMRequestAssembler` stops orchestrating compaction internals directly and delegates pending compaction execution to `PendingCompactionExecutor`.
- `PendingCompactionExecutor` asks a new `CompactionWindowPlanner` to build same-turn-safe `InteractionBlock`s from raw traces, using both `user` and `tool_continuation` boundary traces as planner-visible cycle boundaries.
- The planner marks only the unresolved suffix as the raw frontier and returns all earlier settled blocks as eligible, even when they belong to the current long-running turn.
- Large historical tool results inside eligible blocks are converted to deterministic short digests before they are sent to the summarizer or re-rendered into rebuilt memory.
- `LLMCompactionSummarizer` keeps one internal LLM request as the default production path, but its prompt/response contract changes from flat `semantic_facts` to typed compacted-memory categories (`critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, `important_artifacts`) plus one episodic summary.
- `CompactionResponseParser` and a new `CompactionResultNormalizer` deterministically parse, deduplicate, filter, cap, and prioritize the LLM output so low-value transient operational facts do not dominate persisted memory.
- `Compactor` persists episodic memory plus typed semantic-memory items with category, optional reference, and deterministic salience, prunes archived raw traces by raw-trace ID, and hands the frontier back to `CompactionSnapshotBuilder`.
- `Retriever` and `CompactionSnapshotBuilder` stop treating compacted semantic memory as a flat list; they retrieve and render compacted memory in category-priority order so critical issues and unresolved work appear before lower-priority durable facts or artifact references.
- `CompactionSnapshotBuilder` rebuilds the working context as:
  `system prompt (unchanged) + prioritized compacted memory + unresolved raw frontier`
- `WorkingContextSnapshotBootstrapper` invokes a new `CompactedMemorySchemaGate` before snapshot validation/restoration. When old flat semantic memory is detected, the gate rejects that persisted semantic data, clears `semantic.jsonl`, writes the current compacted-memory manifest version, and invalidates the old snapshot so retrieval/rendering cannot silently keep using legacy semantic noise.
- If compaction is required but the planner cannot produce any eligible settled block, the executor emits an explicit blocked/failure outcome and throws `CompactionPreparationError`; the run does not continue as if compaction had succeeded.
- Optional repair/refinement passes remain a future extension behind `LLMCompactionSummarizer`; callers above that boundary still see one default compaction execution path.

In parallel, the existing operator and transport work stays aligned with this design:
- keep typed settings for ratio/model/effective-context override/detailed logs;
- keep compaction lifecycle events for the frontend;
- keep detailed math in logs;
- keep LM Studio and Ollama long-idle transport timeout hardening.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

Additional task-local terminology:
- `InteractionBlock`: one contiguous, semantically coherent historical segment built from raw traces. Examples: a plain user/assistant exchange, or an assistant/tool-call/tool-result/assistant cycle.
- `Settled block`: a block whose output has already been consumed by later runtime progress and is now eligible for compaction.
- `Frontier block`: the unresolved suffix that must remain raw for correctness on the next LLM leg.
- `Tool result digest`: a deterministic short rendering of an old large tool result used for compaction input and rebuilt prompt context, while the full raw payload remains in raw-trace/archive storage.
- `Continuation boundary trace`: a lightweight raw trace with `traceType = tool_continuation` emitted once per TOOL-origin same-turn continuation cycle so the planner can split one long-running turn into multiple blocks without duplicating full tool-result content.
- `Compacted memory category`: the explicit semantic class assigned to one persisted compacted-memory entry. This redesign uses at least `critical_issue`, `unresolved_work`, `durable_fact`, `user_preference`, and `important_artifact`.
- `Compacted memory entry`: one normalized persisted semantic-memory record consisting of category, human-readable fact text, optional reference, tags, and deterministic salience.
- `Compacted memory manifest`: the small persisted metadata record that declares which compacted-memory schema version is currently stored on disk for episodic/semantic memory.
- `Legacy flat semantic memory`: pre-redesign semantic entries persisted without category/reference shape and with model-generated confidence. These entries are rejection/reset input only, not a supported runtime retrieval format.

## Deterministic Block / Frontier Contract

This section is the locked structural contract for the redesign. It removes ambiguity from the planner and bootstrap behavior.

### Ordered Raw-Trace Source

- The planner shall consume raw traces in one stable chronological order supplied by `MemoryManager` / the store layer.
- That order is the append order already preserved by the current memory-store implementations, with per-turn `seq` remaining monotonic inside one turn.
- The planner shall not reconstruct order from `turnId` counts or `rawTailTurns`.

### Block-Building Rules

1. Boundary trace types are `user` and `tool_continuation`; every such boundary trace starts a new `InteractionBlock`.
2. `tool_continuation` is emitted by `MemoryIngestInputProcessor` when TOOL-originated same-turn continuation input enters the pipeline. The boundary trace uses the same `turnId` as the active turn, receives the next `seq` in that turn, persists only lightweight continuation metadata, and must not duplicate the full aggregated tool-result payload already represented by `tool_result` traces.
3. A block contains that opening boundary trace plus every following non-boundary trace until the next boundary trace or end-of-list.
4. If the raw trace list begins with a non-boundary trace, the planner creates one leading `recovery` block from that trace sequence. A recovery block is never auto-eligible for compaction and is always treated as frontier.
5. `tool_call` and `tool_result` traces belong only to the current open block. Matching is block-local and uses `toolCallId`.
6. A `tool_result` without a usable `toolCallId`, or with a `toolCallId` that does not match a `tool_call` in the same block, marks that block malformed/incomplete.
7. Each block records at least: `blockId`, `turnId`, ordered `traceIds`, opening trace ID, closing trace ID, `blockKind`, `hasAssistantTrace`, `toolCallIds`, `matchedToolCallIds`, `hasMalformedToolTrace`, and digest-ready historical render data.

### Structural Completeness Rules

A block is structurally complete only when all of the following are true:
- it is not a `recovery` block;
- it has an opening boundary trace (`user` or `tool_continuation`);
- it contains at least one non-boundary trace after that opening boundary trace;
- if it contains `tool_call` traces, every call ID in the block has a matching `tool_result` in the same block;
- it has no malformed/orphan `tool_result` trace.

Examples:
- `user -> assistant` = structurally complete
- `user` only = incomplete
- `user -> assistant -> tool_call -> tool_result` (all matched) = structurally complete
- `user -> assistant -> tool_call` (missing result) = incomplete
- `tool_continuation -> assistant -> tool_call -> tool_result` = structurally complete
- leading `assistant/tool_result` without a preceding boundary trace = `recovery` block = incomplete

### Settled vs Frontier Rules

1. If any trailing block is structurally incomplete, frontier starts at the earliest block in that trailing incomplete suffix and includes every block after it.
2. Otherwise, if `activeTurnId` is known, the frontier is the last block whose `turnId` equals `activeTurnId`.
3. Otherwise, when `activeTurnId` is absent, the frontier is the final block in the trace list as a conservative restart/bootstrap fallback.
4. Every block before the frontier start is `settled` and eligible for compaction.
5. Every block at or after the frontier start is `frontier` and must remain raw in the rebuilt snapshot.

This gives one explicit answer for partial tool batches: an unmatched tool batch makes its block incomplete, which forces frontier to begin at that block.

### Bootstrap / Restart Rule

The design intentionally does **not** add persisted frontier metadata in this ticket. Instead it locks one conservative restart order:

1. `WorkingContextSnapshotBootstrapper` resolves the stores.
2. `WorkingContextSnapshotBootstrapper` invokes `CompactedMemorySchemaGate.ensureCurrentSchema(...)` **before any snapshot validation or restore**.
3. If the schema gate detected a mismatch and cleared stale semantic memory, the bootstrapper invalidates the persisted snapshot and rebuilds through `CompactionWindowPlanner` with `activeTurnId = null`.
4. If no schema reset occurred, the bootstrapper may validate the persisted snapshot. When that validation succeeds, it restores the snapshot directly and does not re-plan blocks.
5. If the snapshot is missing or stale after the schema gate step, the bootstrapper rebuilds through `CompactionWindowPlanner` with `activeTurnId = null`.
6. In that rebuild mode, the planner must apply rule (3) above: keep the final block as frontier even if every block is structurally complete.

This makes restart behavior explicit and safe with the metadata the current runtime actually persists today: the semantic schema gate always runs first, and snapshot reuse is only allowed afterward when no schema-reset action invalidated it.

### Historical Tool-Result Digestion Rule

- Only traces inside `settled` blocks are eligible for deterministic tool-result digestion.
- Frontier blocks never use the digested representation as their authoritative prompt form; they stay raw enough for correctness.
- Full raw tool results remain in raw-trace/archive storage even when a digest is used for compaction input or rebuilt snapshot rendering.

## Typed Memory Quality Contract

### LLM Output Schema

The compaction summarizer prompt/response contract shall be tightened to this shape:

```json
{
  "episodic_summary": "string",
  "critical_issues": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],
  "unresolved_work": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],
  "durable_facts": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],
  "user_preferences": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }],
  "important_artifacts": [{ "fact": "string", "reference": "optional string", "tags": ["string"] }]
}
```

Rules:
- model-generated `confidence` is removed from the contract;
- categories are explicit so the runtime can distinguish durable/project state from actionable issues and preferences;
- `reference` is optional and is used only when the compacted entry should point back to a file/artifact/path that remains useful after compaction.

### Deterministic Normalization / Filtering Rules

A new `CompactionResultNormalizer` shall run after JSON parsing and before persistence. It owns these rules:

1. normalize every category array into a common internal entry shape (`category`, `fact`, `reference`, `tags`);
2. deduplicate by normalized fact text across all categories, keeping the highest-priority category when the same fact appears multiple times;
3. clamp per-category item counts with explicit deterministic limits rather than letting one category dominate the result;
4. drop or demote known low-value transient operational observations (for example process-count noise, generic branch cleanliness chatter, or generic doc inventory/status clutter) unless they are clearly phrased as a critical issue or unresolved work item;
5. assign deterministic `salience` from category priority rather than model self-confidence.

### Persistence / Retrieval / Snapshot Priority Rules

- Persist compacted semantic memory with explicit `category`, optional `reference`, and deterministic `salience`.
- `SemanticItem.confidence` is removed from the target design; `salience` becomes an internal deterministic priority score rather than an LLM-produced field.
- `Retriever` shall rank semantic entries by `salience` first and recency second instead of pure append-order recency.
- `CompactionSnapshotBuilder` shall render compacted memory in this order:
  1. episodic summary
  2. critical issues
  3. unresolved work
  4. user preferences
  5. durable facts
  6. important artifacts
  7. unresolved raw frontier
- The unresolved frontier remains raw and outside this priority shaping.

### One-Pass Default / Future Extension

- The default production path stays one internal LLM compaction request.
- A second pass is not required to reach the approved production target in this ticket because the main weakness is schema/normalization quality, not the mere fact that only one LLM call is used.
- Future optional repair/refinement passes may be introduced later only behind the `LLMCompactionSummarizer` boundary so upstream callers do not gain a second orchestration path.

## Persisted Semantic-Memory Schema-Rejection Contract

### Explicit Reset Decision

The redesign chooses a **clean-cut reject-and-reset path** for persisted flat semantic memory rather than hidden backward-compat parsing, one-time migration heuristics, or silently leaving old `semantic.jsonl` entries in place.

Why this is the chosen path:
- the clarified engineering policy is current-schema-only persisted data;
- the old flat semantic files already exist on disk in real runs, but they are not canonical inputs for the new typed runtime path;
- the new retrieval/snapshot path is category-aware and should not guess at old shapes during normal reads;
- the typed redesign is specifically meant to remove flat noisy semantic memory, so leaving old files in place would undermine the refinement.

### Schema Gate

- Introduce `COMPACTED_MEMORY_SCHEMA_VERSION = 2` for the typed semantic-memory redesign.
- Persist a `compacted_memory_manifest.json` file beside `episodic.jsonl` / `semantic.jsonl` containing at least `schema_version` and `last_reset_ts`.
- `SemanticItem.fromDict(...)` becomes typed-only and requires the new category/reference/salience shape; it does not default old flat entries into the new runtime path.

### Startup / Bootstrap Schema-Gate Flow

`WorkingContextSnapshotBootstrapper` becomes the authoritative startup owner for the schema gate:

1. resolve the store + snapshot store as today;
2. invoke `CompactedMemorySchemaGate.ensureCurrentSchema(...)` before validating/restoring any persisted snapshot;
3. if the manifest is current, continue normally;
4. if the manifest is missing or stale and stale flat semantic memory exists, reject it in one clean cut:
   - do **not** read legacy semantic records through `SemanticItem.fromDict(...)` or any migration helper;
   - clear `semantic.jsonl` from active persisted state;
   - write the current compacted-memory manifest version;
   - invalidate the persisted working-context snapshot so the next restore path cannot reuse stale semantic-derived prompt state;
5. after a schema-reset action, rebuild from current canonical sources if they are available (current raw traces, current episodic memory, current system prompt); otherwise start clean with no restored compacted semantic memory.
6. if the manifest is missing/stale but no legacy semantic data exists, write the current manifest version and continue without any compatibility path.

### Ownership / Failure Rules

- `CompactedMemorySchemaGate` owns schema mismatch detection, semantic-store rejection/reset, and manifest version writing.
- `FileMemoryStore` owns manifest file IO plus clearing/truncating stale semantic files from active persisted state.
- `WorkingContextSnapshotBootstrapper` owns when the schema gate runs and ensures stale snapshots are not restored afterward.
- `Retriever` and `CompactionSnapshotBuilder` never read old flat semantic entries; they only see current typed semantic items or an empty semantic store after the schema gate passes.
- If the schema gate cannot complete the reset, it must fail closed: do not restore the stale snapshot and do not let old flat semantic entries flow into retrieval via fallback parsing.

## Validation Matrix For Planner / Persistence / Quality Contracts

| Case | Ordered Raw Trace Shape | Expected Eligible / Frontier Outcome | Validation Owner |
| --- | --- | --- | --- |
| VM-001 | `user -> assistant`, followed later by a new `user` block | first block settled, later block frontier as appropriate | new `tests/unit/memory/compaction-window-planner.test.ts` |
| VM-002 | `user -> assistant -> tool_call(s) -> tool_result(s) -> tool_continuation -> assistant -> tool_call(s) -> tool_result(s)` inside one `turnId` | planner produces two distinct blocks inside the same turn; the earlier cycle can become settled while the later cycle remains frontier as appropriate | new `tests/unit/memory/compaction-window-planner.test.ts` |
| VM-003 | `user` only | block is frontier/incomplete | new `tests/unit/memory/compaction-window-planner.test.ts` |
| VM-004 | `user -> assistant -> tool_call(s)` with missing result(s) | block is frontier/incomplete; later blocks also frontier | new `tests/unit/memory/compaction-window-planner.test.ts` |
| VM-005 | leading non-`user` raw traces | recovery block stays frontier and ineligible | new `tests/unit/memory/compaction-window-planner.test.ts` |
| VM-006 | snapshot rebuild with stale schema and `activeTurnId = null` | final block remains frontier conservatively | updated `tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` |
| VM-007 | prune selected raw trace IDs from one turn while keeping other trace IDs from the same turn | only selected trace IDs removed; retained trace IDs remain; archive receives removed trace IDs | updated `tests/unit/memory/file-store.test.ts` |
| VM-008 | end-to-end long single turn with multiple `tool_continuation` cycles and a live frontier | persisted `tool_continuation` traces split the turn into multiple blocks, earlier same-turn cycles compact, frontier remains raw, no `completed/skipped` false success | updated `tests/integration/agent/runtime/agent-runtime-compaction.test.ts` |
| VM-009 | TOOL-origin continuation input through `MemoryIngestInputProcessor` | lightweight `tool_continuation` trace is persisted without duplicating full tool-result payload | updated `tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts` |
| VM-010 | compaction response with mixed `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts` | parser + normalizer preserve typed categories and output one normalized entry stream with deterministic salience | new `tests/unit/memory/compaction-result-normalizer.test.ts` |
| VM-011 | compaction response containing low-value operational noise such as process-count/runtime chatter or generic doc-status clutter | deterministic filter drops or demotes low-value entries unless they are recast as critical/unresolved | new `tests/unit/memory/compaction-result-normalizer.test.ts` |
| VM-012 | retrieved compacted memory with mixed categories plus raw frontier | snapshot renders category-priority sections (critical issues, unresolved work, preferences, durable facts, artifacts) before frontier | updated `tests/unit/memory/compaction-snapshot-builder.test.ts` |
| VM-013 | normal successful compaction response that already satisfies the schema | one-pass summarization succeeds with no repair/refinement pass required | updated `tests/integration/agent/runtime/agent-runtime-compaction.test.ts` |
| VM-014 | startup with pre-existing flat `semantic.jsonl`, missing/stale compacted-memory manifest, and an old snapshot | schema gate clears stale semantic memory, writes manifest v2, invalidates the snapshot, and forces rebuild/start-clean instead of restoring stale flat semantic memory | new `tests/unit/memory/compacted-memory-schema-gate.test.ts` plus updated `tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` |
| VM-015 | startup with stale flat semantic memory but no usable canonical rebuild inputs | schema gate clears stale semantic memory, invalidates the snapshot, and the runtime starts clean rather than attempting migration heuristics | new `tests/unit/memory/compacted-memory-schema-gate.test.ts` |

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Completed LLM leg with token usage | Next LLM dispatch after optional compaction | `PendingCompactionExecutor` for execution, `LLMUserMessageReadyEventHandler` for trigger | Main product behavior: request, execute, and continue with compacted memory |
| DS-002 | Return-Event | Runtime compaction status/log emission | Frontend status banner / operator logs | `CompactionRuntimeReporter` | Makes compaction visible and debuggable without a live numbers dashboard |
| DS-003 | Primary End-to-End | Settings UI edit | Runtime settings resolution on later requests | `ServerSettingsService` on persistence, `CompactionRuntimeSettingsResolver` on runtime use | User needs live operator control for ratio/model/override/logs |
| DS-004 | Primary End-to-End | LM Studio/Ollama request construction | Long-running local provider stream stays connected | Provider adapter + local transport helper | Keeps local providers alive past the default five-minute idle cutoff |
| DS-005 | Bounded Local | Raw traces in memory store plus persisted continuation-boundary traces | `CompactionPlan` with settled blocks + frontier blocks | `CompactionWindowPlanner` | This is the structural fix for the current whole-turn failure mode |
| DS-006 | Bounded Local | Pending compaction execution | Updated snapshot + cleared or retained compaction gate | `PendingCompactionExecutor` | Encapsulates the local cycle that is currently spread across the assembler |
| DS-007 | Bounded Local | Agent restore/bootstrap with persisted memory | Current typed semantic memory or cleared semantic store + invalidated/rebuilt snapshot or clean start | `WorkingContextSnapshotBootstrapper` | Prevents stale flat semantic memory from silently surviving after the typed redesign |

## Primary Execution Spine(s)

- `Completed LLM leg -> LLMUserMessageReadyEventHandler -> MemoryManager.requestCompaction -> LLMRequestAssembler -> PendingCompactionExecutor -> CompactionWindowPlanner -> Compactor -> LLMCompactionSummarizer -> CompactionResponseParser -> CompactionResultNormalizer -> MemoryManager.resetWorkingContextSnapshot -> next LLM dispatch`
- `CompactionConfigCard -> ServerSettingsStore -> GraphQL mutation -> ServerSettingsService/AppConfig -> process.env -> CompactionRuntimeSettingsResolver -> runtime trigger/execution`
- `LMStudioLLM/OllamaLLM -> local long-running transport helper -> provider SDK/client -> local model server`
- `Agent restore/bootstrap -> WorkingContextSnapshotBootstrapper -> CompactedMemorySchemaGate -> FileMemoryStore semantic clear + manifest write -> snapshot rebuild/restore or clean start`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After a completed LLM leg reports usage above threshold, the handler only marks compaction required. Before the next dispatch, the assembler delegates the entire compaction cycle to `PendingCompactionExecutor`, which plans settled vs frontier blocks, summarizes eligible history, normalizes the result into typed prioritized memory, rebuilds the snapshot, and only then returns control for the next provider call. | `LLMUserMessageReadyEventHandler`, `MemoryManager`, `LLMRequestAssembler`, `PendingCompactionExecutor`, `CompactionWindowPlanner`, `Compactor`, `LLMCompactionSummarizer`, `CompactionResultNormalizer` | `PendingCompactionExecutor` for the execution portion | budget evaluation, reporting, snapshot serialization, settings resolution |
| DS-002 | Compaction request/start/completion/failure flow out through one reporter and existing notifier/stream infrastructure so the frontend can show lifecycle state and the logs can retain the detailed budget math and execution context. | `CompactionRuntimeReporter`, `AgentExternalEventNotifier`, server converter, web handler | `CompactionRuntimeReporter` | stream-event mapping, frontend status rendering |
| DS-003 | The user edits typed compaction controls in the settings UI; the server persists them through existing env-backed settings; later runtime operations resolve those settings live with no restart. | `CompactionConfigCard`, `ServerSettingsStore`, `ServerSettingsService`, `CompactionRuntimeSettingsResolver` | `ServerSettingsService` on persistence | UI validation, settings descriptions |
| DS-004 | Local-provider adapters construct clients/fetch layers with a long-running transport policy so prompt-processing gaps no longer cause client disconnects around five minutes. | `LMStudioLLM`, `OpenAICompatibleLLM`, `OllamaLLM`, local transport helper | Provider adapter boundary | OpenAI SDK timeout policy, Undici dispatcher policy |
| DS-005 | Raw traces are transformed into a sequence of contiguous interaction blocks using explicit `user` and `tool_continuation` boundary traces. The planner marks the unresolved suffix as frontier and exposes all earlier settled blocks as compactable, even within the same active turn. | `CompactionWindowPlanner`, `InteractionBlockBuilder`, `ToolResultDigestBuilder` | `CompactionWindowPlanner` | continuation-boundary ingestion |
| DS-006 | Pending compaction execution is a bounded local cycle: resolve settings, plan blocks, emit status, compact or fail, rebuild snapshot, and either clear or preserve the pending gate. | `PendingCompactionExecutor`, `CompactionRuntimeReporter`, `Compactor`, `MemoryManager` | `PendingCompactionExecutor` | none |
| DS-007 | At startup/restore time, the bootstrapper checks the compacted-memory manifest, rejects any old flat semantic memory on schema mismatch, invalidates stale snapshots, and only then allows retrieval/snapshot restore to continue or start clean. | `WorkingContextSnapshotBootstrapper`, `CompactedMemorySchemaGate`, `FileMemoryStore` | `WorkingContextSnapshotBootstrapper` | manifest IO, schema mismatch reset |

## Spine Actors / Main-Line Nodes

- `LLMUserMessageReadyEventHandler`
- `MemoryManager`
- `LLMRequestAssembler`
- `PendingCompactionExecutor`
- `CompactionWindowPlanner`
- `Compactor`
- `LLMCompactionSummarizer`
- `CompactionResultNormalizer`
- `ServerSettingsService`
- `LMStudioLLM` / `OllamaLLM`

## Ownership Map

- `LLMUserMessageReadyEventHandler` owns post-response usage capture, budget evaluation, and the decision to mark compaction pending.
- `MemoryManager` owns raw-trace persistence, compaction-required state, working-context snapshot mutation, retrieval access, and snapshot persistence.
- `LLMRequestAssembler` owns pre-dispatch request assembly, but not the internal compaction cycle.
- `PendingCompactionExecutor` owns the full pending-compaction execution cycle before dispatch.
- `CompactionWindowPlanner` owns structural selection: block building, settled/frontier partition, and historical tool-result digestion inputs.
- `Compactor` owns persistence-side compaction execution: summarizer invocation, episodic/semantic writes, and raw-trace prune/archive.
- `LLMCompactionSummarizer` owns the single internal LLM summarization request.
- `CompactionResultNormalizer` owns deterministic post-parse compaction-quality shaping: category normalization, dedupe, low-value filtering, reference retention, and salience assignment.
- `CompactionRuntimeReporter` owns compaction lifecycle/status emission plus detailed log records.
- `CompactedMemorySchemaGate` owns current-schema-only rejection/reset of persisted flat semantic memory on schema mismatch.
- `WorkingContextSnapshotBootstrapper` owns when semantic-memory schema reset is enforced during restore/startup and prevents stale snapshots from being reused afterward.
- `ServerSettingsService` owns persistence of operator-visible compaction settings.
- `LMStudioLLM` / `OllamaLLM` own provider-specific local-transport hardening at the provider boundary.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CompactionConfigCard.vue` | `ServerSettingsService` + runtime resolver | Typed UI for a few compaction settings | runtime compaction policy logic |
| `LLMRequestAssembler` (for compaction execution only) | `PendingCompactionExecutor` | Pre-dispatch assembly still needs one call site | internal planning/summarization/prune details |
| `LMStudioLLM` | `OpenAICompatibleLLM` + local transport helper | Provider-specific construction boundary | cross-provider transport policy stored elsewhere |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `CompactionPolicy.rawTailTurns` and whole-turn raw-tail logic | Whole-turn preservation is the root design flaw for long-running turns | `CompactionWindowPlanner` frontier selection | In This Change | Remove from policy, planner, bootstrap, and logs |
| `Compactor.selectCompactionWindow()` returning turn IDs | Turn-based selection cannot compact same-turn settled history | block-based `CompactionPlan` | In This Change | `Compactor` moves from turn IDs to block/trace selection |
| `LLMRequestAssembler` direct coordination of compactor/retriever/snapshot builder | Violates authoritative boundary and spreads compaction logic | `PendingCompactionExecutor` | In This Change | assembler becomes a caller, not the internal coordinator |
| `completed/skipped` success path when no eligible selection exists | Unsafe and misleading | explicit blocked failure path | In This Change | pending gate remains set after failure |
| `CompactionSnapshotRecentTurnFormatter` / `RECENT TURNS` semantics | “recent turns” no longer matches the real frontier model | frontier formatter and `[ACTIVE FRONTIER]` rendering | In This Change | clean rename/remove legacy naming |
| `compacted_turn_count` payload semantics | Counts are no longer about turns | `compacted_block_count` / `selected_block_count` payload fields | In This Change | update TS/server/web types/tests together |

## Return Or Event Spine(s) (If Applicable)

`PendingCompactionExecutor / LLMUserMessageReadyEventHandler -> CompactionRuntimeReporter -> AgentExternalEventNotifier -> AutoByteusStreamEventConverter -> Agent run stream -> web agentStatusHandler -> AgentEventMonitor`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `PendingCompactionExecutor`
  - Spine: `pending flag -> settings resolve -> plan blocks -> blocked? fail : started -> compact -> rebuild snapshot -> clear or preserve gate -> report result`
  - Why it matters: this is the internal cycle that must become authoritative instead of staying split across the assembler.

- Parent owner: `CompactionWindowPlanner`
  - Spine: `raw traces -> interaction blocks -> settled/frontier partition -> digest historical large tool results -> CompactionPlan`
  - Why it matters: this is the heart of the long-turn-safe design; if this remains turn-based, the ticket fails.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Budget evaluation | DS-001 | `LLMUserMessageReadyEventHandler` | Resolve effective context/input budget and threshold result from provider usage | Trigger timing stays post-response and usage-driven | Would blur structural compaction with budget math |
| Runtime settings resolution | DS-001, DS-003 | handler, executor, summarizer | Read env-backed ratio/model/override/log toggles | Keep runtime behavior live-configurable | Would entangle UI/persistence with runtime logic |
| Compaction reporter | DS-002, DS-006 | handler + executor | Emit lifecycle events and detailed logs | Visibility and operator debugging | Would pollute planning/compaction owners with stream plumbing |
| Tool result digestion | DS-005 | planner | Produce compact historical renderings of large tool outputs | Prevent large old payloads from dominating prompt context | If mixed into summarizer only, prompt bloat remains too high before compaction |
| Compaction result normalization | DS-001 | `LLMCompactionSummarizer` / `Compactor` | Turn parsed LLM output into typed prioritized compacted memory | Prevent flat/noisy fact bags from reaching persistence and snapshots | If omitted, compaction stays mechanically correct but weak in quality |
| Snapshot serializer/bootstrapper | DS-001, DS-006 | `MemoryManager` | Persist and restore rebuilt working context | Avoid rebuilding every startup and invalidate old schemas cleanly | If put on main execution line, state persistence leaks everywhere |
| Compacted-memory schema gate | DS-007 | `WorkingContextSnapshotBootstrapper` | Detect schema mismatch and clear stale flat semantic memory before restore | Prevent typed redesign from being undermined by persisted legacy semantic noise | If mixed into retrieval, hidden compatibility logic leaks into steady-state runtime |
| Local transport helper | DS-004 | provider adapters | Construct long-running local HTTP behavior | Eliminate five-minute idle cutoff for LM Studio/Ollama | If spread across callers, provider behavior becomes inconsistent |
| Typed settings UI | DS-003 | settings service/store | User-friendly control surface | User requested typed controls instead of raw key/value editing | If pushed into runtime, runtime would own UI concerns |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Raw-trace persistence and working snapshot mutation | `src/memory/memory-manager.ts` | Extend | Already owns trace ingest, snapshot reset, retrieval, and pending flag | N/A |
| TOOL-origin continuation boundary creation | existing `MemoryIngestInputProcessor` | Extend | Existing input-ingest boundary is the cleanest owner for emitting one lightweight planner boundary trace without duplicating tool-result payloads | N/A |
| Summarizer LLM call | `src/memory/compaction/llm-compaction-summarizer.ts` | Extend | Real production summarizer already exists on this branch and should remain the LLM boundary | N/A |
| Post-parse quality shaping | parser + compactor split today | Create New (`CompactionResultNormalizer`) | Deterministic filtering/prioritization is a distinct concern from raw JSON parsing or persistence | Existing parser should stay schema-focused and compactor should stay persistence-focused |
| Persisted semantic-memory schema gate | bootstrap + file store split today | Create New (`CompactedMemorySchemaGate`) | Current-schema-only rejection/reset is a distinct restore-time concern | `SemanticItem` should stay typed-only and retrieval should not absorb legacy parsing |
| Structural long-turn-safe selection | current `Compactor` | Create New (`CompactionWindowPlanner`) | Current `Compactor` is a persistence/execution owner, not a structural planner | Existing compactor should not absorb selection/planner logic and become a blob |
| Pending pre-dispatch compaction cycle | current assembler + memory manager split | Create New (`PendingCompactionExecutor`) | Current logic is fragmented and violates boundary clarity | Neither assembler nor compactor alone is the right authoritative owner |
| Lifecycle events/logs | existing reporter + notifier pipeline | Extend | Existing event plumbing already supports compaction status | N/A |
| Local-provider timeout behavior | provider adapters + client creation | Extend + add helper | Adapters are the right boundary; helper prevents duplication | A generic cross-provider transport owner would be too broad |
| Typed compaction settings UI | existing server settings UI/store | Extend | CompactionConfigCard already exists and should remain the typed surface | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | block planning, digestion, pending execution, summarization prompt/parse, deterministic quality normalization, persistence-side compaction | DS-001, DS-005, DS-006 | executor, planner, compactor, summarizer | Extend | Becomes the authoritative compaction subsystem |
| `autobyteus-ts/src/memory` | raw-trace models, snapshot state, bootstrap, retrieval, store prune APIs | DS-001, DS-006 | `MemoryManager` | Extend | Removes whole-turn tail assumptions |
| `autobyteus-ts/src/memory/store` | memory-store abstraction and file-backed prune/archive behavior | DS-001, DS-006 | `MemoryManager`, `Compactor` | Extend | Must move prune/archive from turn IDs to raw-trace IDs explicitly |
| `autobyteus-ts/src/memory/restore` | snapshot restore plus compacted-memory schema gating/reset | DS-007 | bootstrapper, semantic schema gate | Extend | Restore-time schema reset belongs with bootstrap, not normal retrieval |
| `autobyteus-ts/src/agent` | post-response trigger, request assembly, runtime reporting, error conversion | DS-001, DS-002 | handler, assembler | Extend | Assembler becomes thinner |
| `autobyteus-ts/src/llm/api` | provider client construction, timeout hardening | DS-004 | LM Studio/Ollama adapters | Extend | Provider-specific only |
| `autobyteus-server-ts` settings/events | settings persistence and event normalization | DS-002, DS-003 | server settings service, run event converter | Extend | Mostly type/mapping alignment |
| `autobyteus-web` settings/monitoring | typed control surface and simple lifecycle status | DS-002, DS-003 | settings card, status handler, monitor | Extend | Detailed numbers stay out of UI |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/memory/compaction/pending-compaction-executor.ts` | memory/compaction | `PendingCompactionExecutor` | authoritative pre-dispatch execution cycle | One owner for one bounded local spine | Yes |
| `src/memory/compaction/compaction-window-planner.ts` | memory/compaction | `CompactionWindowPlanner` | settled/frontier plan creation | One coherent structural responsibility | Yes |
| `src/memory/compaction/interaction-block-builder.ts` | memory/compaction | planner support | raw trace -> ordered blocks | Pure transformation support for planner | Yes |
| `src/memory/compaction/tool-result-digest-builder.ts` | memory/compaction | planner support | deterministic shortening of old tool results | Distinct concern from block building | Yes |
| `src/memory/compaction/compaction-plan.ts` | memory/compaction | shared structure | plan/block frontier model | Shared across planner, executor, compactor, snapshot builder | N/A |
| `src/memory/compaction/compactor.ts` | memory/compaction | `Compactor` | summarize/persist/prune based on selected blocks | Keeps execution-side persistence together | Yes |
| `src/memory/compaction/compaction-prompt-builder.ts` | memory/compaction | summarizer support | build summarizer prompt from eligible blocks/digests using typed memory-category instructions | Pure LLM request shape | Yes |
| `src/memory/compaction/compaction-response-parser.ts` | memory/compaction | summarizer support | parse typed JSON category output | Keeps schema parsing distinct from deterministic filtering | Yes |
| `src/memory/compaction/compaction-result-normalizer.ts` | memory/compaction | quality support | dedupe, filter, categorize, and prioritize compacted memory entries | Distinct deterministic quality step | Yes |
| `src/memory/restore/compacted-memory-schema-gate.ts` | memory/restore | schema gate support | clear stale flat semantic memory and persist current manifest on schema mismatch | Keeps reset logic out of steady-state retrieval code | Yes |
| `src/memory/compaction/frontier-formatter.ts` | memory/compaction | snapshot support | render unresolved raw frontier | Replaces recent-turn/whole-turn naming | Yes |
| `src/memory/compaction-snapshot-builder.ts` | memory | snapshot builder | rebuild system prompt + prioritized compacted memory + frontier | Existing snapshot owner stays in place | Yes |
| `src/memory/memory-manager.ts` | memory | `MemoryManager` | trace accessors, snapshot reset, prune-by-trace-id, pending flag | Central state boundary | Yes |
| `src/memory/store/base-store.ts` | memory/store | `MemoryStore` | store abstraction for raw-trace-ID prune/archive | Explicit persistence seam must move with the redesign | No |
| `src/memory/store/file-store.ts` | memory/store | `FileMemoryStore` | concrete JSONL prune/archive by raw-trace ID | Concrete persistence owner for current production store | No |
| `src/agent/llm-request-assembler.ts` | agent | `LLMRequestAssembler` | delegate pending compaction then append new user message | Keeps request assembly singular | Yes |
| `src/agent/compaction/compaction-runtime-reporter.ts` | agent/compaction | reporter | lifecycle payloads/log records | Runtime reporting stays out of planner/compactor | Yes |
| `src/llm/api/local-long-running-transport.ts` | llm/api | local transport helper | Undici/fetch policy for local providers | Shared helper for LM Studio/Ollama only | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| same-turn compaction selection data | `src/memory/compaction/compaction-plan.ts` | memory/compaction | planner, executor, compactor, snapshot builder all need one plan shape | Yes | Yes | a kitchen-sink runtime state dump |
| ordered block representation | `src/memory/compaction/interaction-block.ts` | memory/compaction | block builder, digester, prompt builder, formatter need one shape | Yes | Yes | parallel turn + block identity structure |
| short historical tool-result rendering | `src/memory/compaction/tool-result-digest.ts` | memory/compaction | planner, prompt builder, and formatter need one digest contract | Yes | Yes | generic “tool summary” blob with mixed live/frontier semantics |
| compaction status payload | existing reporter payload types in TS/server/web | agent/compaction + stream protocol | TS/server/web must share one block-based event contract | Yes | Yes | dual turn-count and block-count payload fields |
| typed compacted-memory entry | `src/memory/models/semantic-item.ts` | memory | persistence, retrieval, and snapshot rendering all need one category/reference/salience shape | Yes | Yes | a flat fact blob with unused confidence |
| compacted-memory manifest | `src/memory/store` metadata helper or store-owned type | memory/store | bootstrapper and store need one schema-version record shape | Yes | Yes | implicit schema assumptions spread across restore/retrieval |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `InteractionBlock` | Yes | Yes | Medium | keep only block identity, ordered trace IDs, lifecycle state, and digested render inputs; do not duplicate full snapshot messages inside it |
| `CompactionPlan` | Yes | Yes | Low | represent `eligibleBlocks`, `frontierBlocks`, `eligibleTraceIds`, `frontierTraceIds`, and counts only; no raw-tail-turn fallback fields |
| `ToolResultDigest` | Yes | Yes | Medium | keep status/summary/key facts/reference only; do not preserve full payload alongside digest |
| `CompactionStatusPayload` | Yes | Yes | Medium | rename from turn-count semantics to block-count semantics everywhere in one cut |
| `SemanticItem` (target shape) | Yes | Yes | Medium | remove model confidence, add explicit category/reference, and use salience only for deterministic runtime priority |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | memory/compaction | `PendingCompactionExecutor` | `executeIfRequired()` local cycle including blocked/failure handling, snapshot rebuild, and status emission orchestration | One authoritative boundary replaces assembler-side fragmentation | `CompactionPlan`, reporter payload types |
| `autobyteus-ts/src/memory/compaction/interaction-block.ts` | memory/compaction | shared structure | block identity/state/render fields | Shared semantic core for block-based compaction | N/A |
| `autobyteus-ts/src/memory/compaction/interaction-block-builder.ts` | memory/compaction | planner support | convert ordered raw traces into contiguous blocks | Keeps selection preprocessing isolated | `InteractionBlock` |
| `autobyteus-ts/src/memory/compaction/tool-result-digest.ts` | memory/compaction | shared structure | compact historical tool-result rendering | Reusable across prompt and frontier rendering | N/A |
| `autobyteus-ts/src/memory/compaction/tool-result-digest-builder.ts` | memory/compaction | planner support | build deterministic digests for settled historical tool results | Distinct from LLM summarization | `ToolResultDigest` |
| `autobyteus-ts/src/memory/compaction/compaction-plan.ts` | memory/compaction | shared structure | selected-vs-frontier plan contract | Central reusable contract for the subsystem | `InteractionBlock` |
| `autobyteus-ts/src/memory/compaction/compaction-window-planner.ts` | memory/compaction | `CompactionWindowPlanner` | determine eligible blocks and frontier blocks from raw traces | Governing structural planner | `InteractionBlock`, `CompactionPlan`, `ToolResultDigest` |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | memory/compaction | `Compactor` | summarize eligible blocks, persist compacted memory, prune raw traces by trace ID | Keeps storage-side compaction execution cohesive | `CompactionPlan` |
| `autobyteus-ts/src/memory/compaction/compaction-prompt-builder.ts` | memory/compaction | summarizer support | compaction prompt using block/digest renderings and typed category instructions | One LLM request-shape owner | `InteractionBlock`, `ToolResultDigest` |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | memory/compaction | summarizer support | parse typed category JSON into raw compaction-result data | Keeps schema parsing separate from deterministic filtering | `CompactionResult` |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | memory/compaction | quality support | normalize parsed compaction output into typed prioritized entries, dedupe/filter noise, assign salience | One deterministic quality boundary instead of scattering heuristics across parser/persistence/snapshot code | `CompactionResult`, `SemanticItem` |
| `autobyteus-ts/src/memory/compaction/frontier-formatter.ts` | memory/compaction | snapshot support | render unresolved frontier blocks for rebuilt snapshot | Clean replacement for recent-turn formatting | `InteractionBlock`, `ToolResultDigest` |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | memory | snapshot builder | rebuild snapshot from system prompt + prioritized retrieved memory + formatted frontier blocks | Existing snapshot owner remains authoritative | `CompactionPlan` output, typed semantic memory |
| `autobyteus-ts/src/memory/memory-manager.ts` | memory | `MemoryManager` | expose ordered raw traces, prune by raw-trace ID, reset snapshot, persist schema v3 snapshots, manage pending gate | Central memory-state owner | `CompactionPlan` indirectly |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | memory | shared memory model | persist one typed compacted-memory entry with category/reference/salience and no model confidence | Keeps compacted semantic memory semantically tight across persistence/retrieval/rendering | N/A |
| `autobyteus-ts/src/memory/retrieval/retriever.ts` | memory/retrieval | retrieval owner | retrieve and rank typed compacted memory by deterministic salience/category priority plus recency | Prevents recency-only retrieval from crowding out critical issues | `SemanticItem` |
| `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts` | memory/restore | schema gate owner | current-schema-only rejection/reset of stale semantic memory plus compacted-memory manifest enforcement | Keeps legacy compatibility out of steady-state retrieval/rendering | `SemanticItem` |
| `autobyteus-ts/src/memory/store/base-store.ts` | memory/store | `MemoryStore` | declare `pruneRawTracesById(traceIdsToRemove, archive)` and ordered raw-trace access as the persistence contract | Abstract persistence seam must explicitly own trace-ID pruning | N/A |
| `autobyteus-ts/src/memory/store/file-store.ts` | memory/store | `FileMemoryStore` | implement exact raw-trace-ID prune/archive semantics over JSONL storage | Current concrete store must own the new seam explicitly | N/A |
| `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | agent | `MemoryIngestInputProcessor` | persist `tool_continuation` boundary traces for TOOL-origin same-turn continuation input without duplicating tool-result payloads | Existing input-ingest owner should create the planner boundary | `InteractionBlock` boundary contract |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | agent | `LLMRequestAssembler` | call executor then append current request input and render payload | Cleaner assembly-only role | executor result contract |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | agent | trigger owner | request pending compaction and emit request-side status | Keeps timing unchanged | reporter payload types |
| `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts` | agent/compaction | reporter | logs + status events with block-based fields and blocked error path | One outward reporting boundary | shared status payload types |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | memory | serializer | schema v3 validation/serialization after frontier model change | Snapshot invalidation is part of the design cut | N/A |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | memory/restore | bootstrapper | rebuild frontier-based snapshot when no valid persisted snapshot exists | Keeps startup behavior aligned with new compaction model | planner/frontier formatting |
| `autobyteus-ts/src/llm/api/local-long-running-transport.ts` | llm/api | helper | shared long-idle-disabled transport policy for local providers | Prevent duplication across providers | N/A |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | llm/api | provider adapter | LM Studio/OpenAI-compatible client construction with long-running transport + high finite SDK timeout where applicable | Correct provider boundary for transport policy | helper |
| `autobyteus-ts/src/llm/api/ollama-llm.ts` | llm/api | provider adapter | inject custom fetch using long-running transport helper | Correct provider boundary for transport policy | helper |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | server settings | `ServerSettingsService` | keep compaction setting keys/descriptions registered | Existing persistence boundary | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` and related run-event message types | server event mapping | converter | carry block-based compaction payload fields through unchanged | Existing normalized event boundary | shared payload contract |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | web settings | UI card | typed surface for ratio/model/override/log toggle | Already the correct typed operator entrypoint | settings store |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` + protocol types | web streaming | status handler | display simple compaction lifecycle state using block-based payload fields | Existing event-driven status boundary | shared payload contract |

## Ownership Boundaries

The main authoritative boundaries are:

1. `PendingCompactionExecutor`
   - authoritative for whether and how pending compaction executes before dispatch;
   - encapsulates planning, blocked/failure decision, compactor invocation, snapshot rebuild, and pending-flag clearing/preservation.

2. `CompactionWindowPlanner`
   - authoritative for what is eligible vs frontier;
   - no other caller may re-derive the frontier using whole-turn or `last N turns` shortcuts.

3. `MemoryManager`
   - authoritative for raw trace access, snapshot reset/persistence, retrieval access, and pending compaction state;
   - planner and executor must not reach around it to mutate working-context snapshot state directly through store internals.

4. `CompactionRuntimeReporter`
   - authoritative for compaction lifecycle/status emission;
   - compactor/planner/summarizer must not emit ad hoc UI-facing events on their own.

5. `CompactionResultNormalizer`
   - authoritative for deterministic compacted-memory quality shaping after raw JSON parsing;
   - parser, compactor, retriever, and snapshot builder must not each invent their own competing noise-filter or priority rules.

6. `CompactedMemorySchemaGate`
   - authoritative for current-schema-only rejection/reset of persisted flat semantic memory on schema mismatch;
   - `SemanticItem`, `Retriever`, and `CompactionSnapshotBuilder` must not add hidden legacy parsing/defaulting or migration logic to compensate for old on-disk data.

7. Provider adapters (`OpenAICompatibleLLM`, `OllamaLLM`)
   - authoritative for provider-specific transport policy;
   - callers above the adapter should not construct provider SDK clients directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PendingCompactionExecutor` | planner, compactor invocation, snapshot rebuild, blocked/failure gate | `LLMRequestAssembler` | assembler directly calling planner + compactor + snapshot builder + flag clearing | expand executor result contract instead of reintroducing direct calls |
| `CompactionWindowPlanner` | block builder, historical tool-result digestion, frontier resolution | executor, bootstrapper | compactor or snapshot builder independently re-deriving frontier from raw turns | add needed fields to `CompactionPlan` |
| `MemoryManager` | raw trace storage, prune APIs, snapshot mutation/persistence | executor, handler, bootstrapper | planner/compactor mutating snapshot store or raw store internals directly | add focused `MemoryManager` accessors/mutators |
| `CompactionResultNormalizer` | category normalization, low-value filtering, salience assignment | summarizer, compactor, retriever, snapshot builder | parser storing raw model categories directly or snapshot builder inventing ad hoc priority rules | expand normalized result contract rather than duplicating heuristics |
| `CompactedMemorySchemaGate` | schema mismatch detection, manifest version enforcement, semantic-file clear/reset | bootstrapper, store | retriever or `SemanticItem.fromDict` quietly defaulting old flat records into the typed path | keep schema reset explicit and startup-owned |
| `MemoryIngestInputProcessor` | TOOL-origin continuation-boundary trace creation | `UserInputMessageEventHandler` and input pipeline | planner deriving same-turn cycle boundaries solely from implicit assistant/tool patterns | strengthen processor API rather than pushing boundary inference into the planner |
| provider adapters | SDK client construction, transport config | `LLMFactory` and callers above it | runtime code manually constructing OpenAI/Ollama clients | expose needed adapter constructor options/helper injection |
| `ServerSettingsService` | env-backed setting persistence and descriptions | GraphQL/settings callers | runtime code writing `.env`/config directly | add explicit setting registration and store actions |

## Dependency Rules

- `LLMUserMessageReadyEventHandler` may depend on token-budget helpers, `MemoryManager.requestCompaction()`, and `CompactionRuntimeReporter`; it must not perform compaction planning or snapshot rebuild.
- `MemoryIngestInputProcessor` may depend on `MemoryManager` to persist `tool_continuation` boundary traces; it must not duplicate full aggregated tool-result payloads into raw traces.
- `LLMRequestAssembler` may depend on `PendingCompactionExecutor` and `MemoryManager`; it must not depend on `CompactionWindowPlanner`, `Compactor`, `Retriever`, or snapshot formatter directly.
- `PendingCompactionExecutor` may depend on `MemoryManager`, `CompactionWindowPlanner`, `Compactor`, `CompactionSnapshotBuilder`, `CompactionRuntimeReporter`, and runtime settings resolver.
- `CompactionWindowPlanner` may depend on raw-trace/block/digest structures only; it must not call the LLM or emit runtime events.
- `Compactor` may depend on `Summarizer`, `CompactionResultNormalizer`, and `MemoryStore`/`MemoryManager` persistence seams; it must not own frontier selection logic.
- `CompactionSnapshotBuilder` must consume the planner/executor-provided frontier representation; it must not query raw traces by turn count.
- `Retriever` and `CompactionSnapshotBuilder` may depend on typed semantic-memory category/salience metadata; they must not resurrect model-confidence semantics or legacy flat semantic fallback parsing.
- `WorkingContextSnapshotBootstrapper` may depend on `CompactedMemorySchemaGate` and store manifest accessors; it must not restore stale snapshots before the semantic schema gate runs.
- TS/server/web compaction event types must move together in one cut to block-based payload semantics.
- LM Studio/Ollama timeout hardening must remain provider-local; no global fetch policy change for all providers.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryManager.requestCompaction()` / `clearCompactionRequest()` | pending compaction gate | mark or clear pending state | none | trigger owner remains post-response handler |
| `PendingCompactionExecutor.executeIfRequired({ turnId, systemPrompt, activeModelIdentifier })` | pending pre-dispatch compaction | run blocked-or-compact decision and snapshot update | current turn ID + system prompt + active model identifier | authoritative execution boundary |
| `CompactionWindowPlanner.plan(rawTraces, activeTurnId?)` | structural compaction plan | produce eligible/frontier blocks and trace IDs | ordered raw traces + optional active turn ID | no turn-count fallback |
| `Compactor.compact(plan)` | persistence-side compaction | summarize selected blocks, persist memory, prune raw traces | `CompactionPlan` | no turn-ID-only input |
| `CompactionPromptBuilder.buildMessages(blocks)` | summarizer prompt | render eligible history for internal LLM call | selected block list | consumes digests for large historical results |
| `CompactionResponseParser.parse(text)` | parser | parse typed JSON compaction output | raw summarizer text | no persistence/retrieval heuristics inside parser |
| `CompactionResultNormalizer.normalize(result)` | quality normalizer | dedupe/filter/prioritize typed compacted-memory entries | parsed compaction result | assigns deterministic salience and category caps |
| `MemoryManager.pruneRawTracesById(traceIds, archive)` | raw-trace persistence | remove compacted raw traces by trace identity through the store seam | raw trace IDs | replaces turn-ID prune assumption |
| `CompactedMemorySchemaGate.ensureCurrentSchema(store, snapshotStore)` | startup schema gate | reject/clear old flat semantic memory and invalidate stale snapshots | store + snapshot-store handles | explicit current-schema-only path for persisted semantic data |
| `MemoryStore.readCompactedMemoryManifest()` / `writeCompactedMemoryManifest(...)` | compacted-memory metadata persistence | schema version gate for semantic memory | none / manifest payload | no hidden implicit version detection in retrieval |
| `MemoryStore.clearSemanticItems()` | semantic-memory persistence | clear stale semantic store in one clean cut on schema mismatch | none | avoids append-only survival of old flat entries |
| `MemoryStore.pruneRawTracesById(traceIdsToRemove, archive)` | persistence abstraction | exact raw-trace prune/archive contract | set of raw trace IDs | implemented by `FileMemoryStore` on this branch |
| compaction status payload | runtime-to-frontend status | lifecycle visibility | `phase`, `selected_block_count?`, `compacted_block_count?`, `raw_trace_count?`, `semantic_fact_count?`, `compaction_model_identifier?`, `error_message?` | remove turn-count naming |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `PendingCompactionExecutor.executeIfRequired(...)` | Yes | Yes | Low | keep all pre-dispatch compaction work behind this one method |
| `CompactionWindowPlanner.plan(...)` | Yes | Yes | Low | keep plan shape explicit and block-based |
| `Compactor.compact(plan)` | Yes | Yes | Low | reject any fallback turn-ID overload |
| compaction status payload | Yes | Yes | Medium | rename fields from turn counts to block counts in one cut |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| pending compaction execution owner | `PendingCompactionExecutor` | Yes | Low | keep `Executor` because it owns a bounded execution cycle, not generic coordination |
| structural selector | `CompactionWindowPlanner` | Yes | Low | “planner” is appropriate because it returns a compaction plan |
| historical segment | `InteractionBlock` | Yes | Low | clearer than “tail turn” or generic “segment” alone |
| unresolved preserved suffix | `Frontier` / `frontier block` | Yes | Low | use consistently in code and UI/log wording |
| deterministic quality shaper | `CompactionResultNormalizer` | Yes | Low | explicit about its responsibility; avoid vague `postProcessor` naming |

## Applied Patterns (If Any)

- `Factory`: existing `AgentFactory` and `LLMFactory` remain the creation boundaries; the design extends them rather than introducing service-locator-style global construction.
- `Bounded local execution spine`: `PendingCompactionExecutor` owns the pre-dispatch compaction cycle.
- `Adapter`: LM Studio/OpenAI-compatible and Ollama adapters own provider-specific transport hardening.
- `Repository/persistence boundary`: existing memory store remains a persistence boundary; compaction continues to persist through it rather than bypassing it.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/` | Folder | compaction subsystem | planner, executor, summarizer, digests, shared block/plan types | All long-turn-safe compaction mechanics belong together | unrelated agent status/UI code |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | File | `PendingCompactionExecutor` | authoritative pending-compaction cycle | Core governing owner of the new design | raw provider client code |
| `autobyteus-ts/src/memory/compaction/interaction-block.ts` | File | shared structure | block model | Shared compaction structure | runtime event emission |
| `autobyteus-ts/src/memory/compaction/interaction-block-builder.ts` | File | planner support | raw traces to blocks | structural helper kept close to planner | persistence mutation |
| `autobyteus-ts/src/memory/compaction/tool-result-digest.ts` | File | shared structure | digest model | shared by planner/prompt/formatter | full raw payload storage logic |
| `autobyteus-ts/src/memory/compaction/tool-result-digest-builder.ts` | File | planner support | deterministic shortening of old tool results | belongs with planning, not provider tools | LLM-based summarization |
| `autobyteus-ts/src/memory/compaction/compaction-plan.ts` | File | shared structure | eligible/frontier plan | planner/executor/compactor contract | ad hoc logging code |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | File | `Compactor` | summarize + persist + prune | storage-side execution owner | frontier selection |
| `autobyteus-ts/src/memory/compaction/compaction-prompt-builder.ts` | File | summarizer support | build internal summarizer prompt with typed category instructions | LLM request formatting belongs with summarizer | snapshot rebuild logic |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | File | summarizer support | parse typed category JSON from the compaction model | schema parsing belongs near the summarizer boundary | persistence heuristics |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | File | quality support | dedupe/filter/prioritize parsed compaction output and assign deterministic salience | quality rules need one owner | raw provider client code |
| `autobyteus-ts/src/memory/compaction/frontier-formatter.ts` | File | snapshot support | render unresolved frontier blocks | replaces recent-turn formatter cleanly | turn-based selection |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | File | snapshot builder | build final system+prioritized-memory+frontier messages | snapshot assembly belongs in memory | compaction planning |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | `MemoryManager` | trace/snapshot state boundary | existing central owner | ad hoc compaction planning |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | File | shared memory model | typed compacted-memory persistence shape with category/reference/salience | one semantic-memory model for persistence/retrieval/rendering | model-generated confidence |
| `autobyteus-ts/src/memory/retrieval/retriever.ts` | File | retrieval owner | rank and return prioritized compacted semantic memory | retrieval must reflect quality priorities, not pure recency | ad hoc UI rendering |
| `autobyteus-ts/src/memory/store/base-store.ts` | File | `MemoryStore` | abstract ordered-raw-trace and prune-by-trace-ID store contract | persistence seam must be explicit at the abstract boundary | turn-based prune helpers |
| `autobyteus-ts/src/memory/store/file-store.ts` | File | `FileMemoryStore` | JSONL-backed exact prune/archive by raw trace ID | concrete production store for the current runtime | turn-based prune-by-turn implementation |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | File | bootstrapper | schema-aware rebuild from compacted memory + frontier | startup path must match new snapshot model | whole-turn tail fallback |
| `autobyteus-ts/src/memory/restore/compacted-memory-schema-gate.ts` | File | schema gate owner | enforce compacted-memory schema version and clear stale flat semantic memory on startup | current-schema-only reset must stay explicit and out of retrieval | hidden legacy parsing/defaulting or migration heuristics |
| `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | File | `MemoryIngestInputProcessor` | emit lightweight `tool_continuation` boundary traces for TOOL-origin same-turn continuation input | existing input-ingest boundary is the cleanest owner for this raw-trace change | full duplicated aggregated tool-result content |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | File | assembler | prepare request and call executor | correct pre-dispatch runtime owner | direct compactor/policy coordination |
| `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts` | File | reporter | logs + status events | existing event-facing runtime location | compaction planning |
| `autobyteus-ts/src/llm/api/local-long-running-transport.ts` | File | provider helper | local-provider transport policy | shared by LM Studio and Ollama only | cloud-provider-specific branching |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | File | provider adapter | LM Studio/OpenAI-compatible timeout behavior | correct SDK boundary | compaction logic |
| `autobyteus-ts/src/llm/api/ollama-llm.ts` | File | provider adapter | Ollama custom fetch injection | correct provider boundary | compaction logic |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | server settings | persist compaction env-backed settings | existing authoritative settings boundary | runtime compaction logic |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | File | typed UI card | operator controls | existing user-facing configuration surface | detailed runtime math dashboard |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | File | status handler | simple compaction lifecycle state | existing frontend event owner | raw log math rendering |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Main-Line Domain-Control | Yes | Low | compaction planner/executor/summarizer all belong to the same subsystem |
| `autobyteus-ts/src/agent/compaction` | Off-Spine Concern | Yes | Low | runtime reporter/error translation stay separated from memory planning |
| `autobyteus-ts/src/llm/api` | Transport | Yes | Low | provider-specific timeout hardening stays at the provider boundary |
| `autobyteus-web/components/settings` | Off-Spine Concern | Yes | Low | typed operator controls remain UI-only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Same-turn compaction | Turn `0002` contains: initial `user` -> assistant/tool cycle -> `tool_continuation` boundary -> assistant/tool cycle -> `tool_continuation` boundary -> current unresolved cycle. Planner emits multiple blocks from those explicit boundary traces, compacts the earlier settled cycles, and keeps only the last cycle raw. | “Keep last 4 turns raw,” which keeps all of turn `0002` raw because it is still the active turn. | This is the core fix for the failure observed in live logs. |
| Historical tool result digestion | Old `run_tests` result becomes: `run_tests -> 3 failures (auth.spec.ts, cart.spec.ts, exit code 1)` plus existing reference/archive, while the full raw log stays in raw-trace/archive storage. | Re-stringify the full 20k-line test log into every compaction prompt and rebuilt snapshot. | Shows how large historical tool outputs stop dominating prompt size. |
| Blocked no-eligible outcome | If planner finds only one unresolved frontier block and zero settled blocks while compaction is required, executor emits `failed`/blocked status, preserves pending gate, and raises `CompactionPreparationError`. | Clear pending flag, emit `completed/skipped`, and continue until provider throws `Context size has been exceeded`. | Prevents the exact misleading success path that the user observed. |
| Typed prioritized memory | A compaction result stores: `critical_issue: Pinia getter reads undefined products.value`, `unresolved_work: revise design spec v3 for price-storage pattern`, `user_preference: auto-approved demo features`, and `important_artifact: design-spec.md ref=/.../design-spec.md`. Snapshot renders these sections before lower-priority durable facts. | One flat semantic list where process noise, branch chatter, and critical bugs all appear with equal weight. | Shows how the quality redesign improves the usefulness of compacted memory for the next LLM leg. |
| Persisted semantic schema mismatch | On restore, stale flat `semantic.jsonl` plus an old snapshot causes the schema gate to clear stale semantic memory, invalidate the snapshot, and rebuild from current raw traces/episodic memory if available; otherwise the runtime starts clean with no compatibility parsing. | Let old flat `semantic.jsonl` survive or heuristically migrate it into the new typed path. | Shows the explicit clean-cut current-schema-only policy for already-persisted semantic memory. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep both whole-turn and block-based selection paths | Easier incremental patch | Rejected | remove whole-turn/raw-tail logic and switch planner/compactor/bootstrapper to block-based plan only |
| Keep `completed/skipped` as a benign success state | Lower implementation churn | Rejected | use explicit blocked/failure path and preserve pending gate |
| Keep `compacted_turn_count` payload fields while changing semantics to blocks | Avoid touching frontend/server types | Rejected | rename to block-based payload fields in one cut across TS/server/web/tests |
| Persist new frontier metadata just to avoid a conservative bootstrap fallback | Avoid planning ambiguity on restart | Rejected | use the explicit last-block frontier fallback when `activeTurnId` is absent in this ticket |
| Derive same-turn continuation blocks only from implicit assistant/tool patterns with no new raw-trace boundary | Avoid touching input ingestion | Rejected | emit explicit lightweight `tool_continuation` boundary traces through `MemoryIngestInputProcessor` instead |
| Preserve old snapshot schema and interpret it as frontier-based | Avoid rebuild on schema mismatch | Rejected | bump schema version and force snapshot rebuild from current raw traces + compacted memory |
| Keep flat `semantic_facts` plus model-generated `confidence` as the long-term compaction contract | Avoid changing parser/store/snapshot code | Rejected | switch to typed categories, remove confidence, and use deterministic salience instead |
| Make a two-pass repair/refinement pipeline the default compaction path now | Potentially higher memory quality | Rejected | keep one-pass default and preserve a future extension seam behind `LLMCompactionSummarizer` |
| Keep reading or heuristically migrating old flat `semantic.jsonl` entries through hidden fallback logic | Avoid startup reset work or preserve more history | Rejected | enforce explicit schema gate + clear stale semantic memory + rebuild/start clean; do not let old flat entries silently survive |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

`Web typed settings/status -> Server settings + event normalization -> TS agent runtime -> Memory compaction subsystem -> Provider adapters`

This layering is explanatory only; authority still lives in the boundaries named above.

## Migration / Refactor Sequence

1. **Introduce shared block/digest/plan structures**
   - add `InteractionBlock`, `ToolResultDigest`, and `CompactionPlan` files.

2. **Introduce structural planning**
   - add `InteractionBlockBuilder`, `ToolResultDigestBuilder`, and `CompactionWindowPlanner`.
   - change `MemoryIngestInputProcessor` so TOOL-origin same-turn continuation input persists lightweight `tool_continuation` boundary traces instead of fully skipping TOOL-origin input in the raw-trace stream.
   - switch compaction selection from turn IDs to block/trace-based planning.

3. **Introduce typed memory-quality contract**
   - revise `LLMCompactionSummarizer`, `CompactionPromptBuilder`, and `CompactionResponseParser` to use typed compacted-memory categories and remove model-confidence output.
   - add `CompactionResultNormalizer` for deterministic dedupe/filtering/salience assignment.
   - extend `SemanticItem`, `Retriever`, and `CompactionSnapshotBuilder` so compacted memory is persisted/retrieved/rendered in priority-aware category order.

4. **Add persisted semantic-memory schema gate**
   - add compacted-memory manifest versioning in the store layer.
   - add `CompactedMemorySchemaGate` and invoke it from `WorkingContextSnapshotBootstrapper` before snapshot restore.
   - clear stale flat semantic files on schema mismatch, invalidate stale snapshots, and rebuild from current canonical sources if available or otherwise start clean.

5. **Introduce authoritative pending execution boundary**
   - add `PendingCompactionExecutor`.
   - move compaction execution, blocked handling, snapshot rebuild, and flag clearing/preservation out of `LLMRequestAssembler`.

6. **Rework persistence-side compaction**
   - modify `Compactor` to compact selected blocks / raw trace IDs and prune by raw-trace ID rather than by turn ID.
   - modify `MemoryManager` and store seams to support ordered raw-trace access and prune-by-trace-id.

7. **Rebuild snapshot around frontier blocks**
   - replace recent-turn formatting with frontier formatting.
   - remove `rawTailTurns` from policy/bootstrap paths.
   - bump `WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION` and force rebuild of old snapshots.

8. **Update runtime reporting and failure semantics**
   - replace turn-based status payload fields with block-based ones.
   - replace skipped-success path with blocked failure path that preserves pending compaction.

9. **Align server/web event typing**
   - update server event mapping and web protocol/status handler/tests to the renamed compaction payload fields and blocked message.

10. **Keep settings and timeout hardening aligned**
   - retain the existing typed settings card and setting keys.
   - complete provider-local long-running transport helper use in LM Studio and Ollama adapters.

11. **Validation pass**
   - add deterministic runtime tests for long single-turn same-turn compaction, blocked-no-eligible behavior, historical tool-result digestion, system-prompt preservation, schema rebuild, the explicit planner/frontier matrix, and local-provider timeout construction.

12. **Remove obsolete whole-turn artifacts**
   - delete or rename files/constants/tests that still encode `rawTailTurns`, `selected_turn_count`, `compacted_turn_count`, or “recent turns” semantics in the compaction path.

## Key Tradeoffs

- **Planner complexity vs correctness**: block-based planning is more complex than turn-count tail protection, but the live failures show that the simpler rule is not product-correct.
- **Deterministic digest first, LLM summary second**: historical tool-result digestion is intentionally deterministic and local before the LLM summarizer sees the data. This adds implementation work but keeps compaction prompts smaller and more predictable.
- **Schema bump vs silent stale snapshots**: forcing snapshot rebuild on schema mismatch costs a rebuild once, but avoids silently carrying old whole-turn-tail assumptions forward.
- **Clean-cut payload rename vs compatibility shim**: renaming turn-count fields to block-count fields forces TS/server/web edits together, but avoids keeping incorrect semantics alive.
- **Internal tuning knobs stay internal**: only ratio/model/override/log toggle stay user-facing. Frontier sizing and digest heuristics remain internal so the subsystem can evolve without confusing users.
- **One-pass default vs multi-pass quality**: one pass remains the default because the current weakness is schema/prioritization quality rather than insufficient LLM pass count; a second pass would add latency/cost/failure surface before the first-pass contract is even well-shaped.

## Risks

- Incorrect block-boundary detection could either over-compact needed context or preserve too much raw history.
- Deterministic tool-result digestion may miss some future-relevant detail; this risk is reduced by applying it only to settled historical tool results and by keeping full raw payloads in raw-trace/archive storage.
- Deterministic low-value filtering could over-prune if the first rule set is too aggressive; this is mitigated by keeping the filter rule set explicit, validation-driven, and biased toward preserving critical/unresolved categories.
- Clearing stale flat semantic memory on schema mismatch can discard some historical semantic value; this is an accepted tradeoff under the current-schema-only policy, and it is bounded by rebuilding from current canonical raw traces/episodic memory when available.
- Provider usage can still be missing on some streams; this ticket still relies primarily on provider-reported usage for triggering.
- Live LM Studio + Qwen3.5 reasoning behavior remains a validation limitation on the current `/v1/chat/completions` path even after the compaction redesign.
- Timeout hardening is designed at the client boundary; if a lower transport/proxy layer still kills the connection, that becomes a separate investigation loop.

## Guidance For Implementation

- Keep the post-response trigger exactly where it is; do not drift into mid-stream interruption work.
- Add `PendingCompactionExecutor` first and make `LLMRequestAssembler` call it before any message append/rendering.
- Remove `rawTailTurns` from the compaction path instead of trying to support both turn-based and block-based selection.
- Make `CompactionWindowPlanner` the only owner of eligible/frontier selection and feed its `CompactionPlan` into both `Compactor` and `CompactionSnapshotBuilder`.
- Keep the main system prompt untouched and always rebuild it as the leading system message.
- Historical large tool results should be shortened deterministically for settled blocks only; the unresolved frontier must remain raw enough for correctness.
- Replace `selected_turn_count` / `compacted_turn_count` with block-based fields end-to-end in TS, server, web, and tests.
- Treat `compaction required + no eligible block` as a hard blocked/failure outcome that preserves the pending gate.
- Bump snapshot schema version and use rebuild-on-mismatch rather than compatibility parsing.
- Validation should prove the exact live failure mode is fixed: one long tool-heavy turn must compact earlier settled same-turn history instead of skipping and later overflowing.
- Validation must also prove the conservative restart rule, the exact raw-trace-ID prune/archive seam at the store layer, and the new `tool_continuation` boundary-trace behavior in the input-ingest path.
- Remove model-generated confidence from the compaction contract instead of letting an unused field continue to consume prompt/output budget.
- Make typed memory categories and deterministic quality normalization the next priority; the live run showed the subsystem is mechanically working, so the improvement target is memory usefulness rather than another orchestration rewrite.
- Keep one-pass summarization as the default implementation until the typed schema + normalization path proves insufficient; any later repair/refinement pass must stay behind `LLMCompactionSummarizer`.
- Do not let `SemanticItem`, `Retriever`, or `CompactionSnapshotBuilder` quietly grow legacy fallback parsing or migration logic for old flat semantic files; route all persisted-data schema-mismatch handling through the explicit schema gate.
