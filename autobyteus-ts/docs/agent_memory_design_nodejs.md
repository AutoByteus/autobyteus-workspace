# Autobyteus Agent Memory Design (Node.js/TypeScript)

**Status:** Active
**Date:** 2026-01-30

## 1. Purpose

This document defines the **foundational memory module** for Autobyteus agents.
It captures the key decisions and intuitions discussed so far and provides an
implementation-oriented design that is **domain-agnostic** (coding, writing,
multi-agent coordination).

The goal is to make **memory the core** of the agent, while treating the LLM as
an execution component that consumes prompts built from memory.

---

## 2. Current State (TypeScript)

Legacy trace storage in `AgentRuntimeState.conversation_history` has been removed.
LLM calls are memory‑centric, and providers no longer own history.

---

## 3. Design Principles

1. **Memory is the source of truth.** LLMs should be stateless callers.
2. **Event-driven, not always-on.** Memory runs on lifecycle triggers.
3. **Human-like tiers as a model, operations as the engine.**
4. **Domain-agnostic core.** Upper layers can add artifact or workflow memory.
5. **Predictable compaction.** Never silently drop context.
6. **File-first persistence.** Memory should be stored on disk by default.

---

## 4. Memory Types (Minimal Core)

The memory kernel exposes three generic types:

- **RAW_TRACE**: raw user/assistant/tool events
- **EPISODIC**: summarized blocks of traces
- **SEMANTIC**: stable facts, preferences, constraints, decisions

Artifact memory (files, code structure, specs) is **out of scope** for the core
and can be layered above.

**Derived view (not a stored type)**

- **TOOL_INTERACTION**: a paired view that links a tool call with its result
  using `tool_call_id`. This is for human-friendly inspection and summaries,
  while the underlying working context snapshot remains event-based.

---

## 5. Core Operations (Memory Kernel)

The memory system is defined by its implemented operations:

- **ingest(event)**: store trace as RAW_TRACE and append to the Working Context Snapshot
- **compact(turn_ids)**: summarize old traces into EPISODIC + SEMANTIC and prune RAW_TRACE
- **retrieve(max_episodic, max_semantic)**: return a MemoryBundle for snapshot building
- **build_snapshot(system_prompt, bundle, plan/frontier)**: produce a Compaction Snapshot message list with typed semantic sections plus `[RAW_FRONTIER]`
- **resetWorkingContextSnapshot(snapshot)**: reset Working Context Snapshot to the snapshot baseline

---

## 6. Data Model

**RAW_TRACE (RawTraceItem)**

- `id`, `ts`, `turn_id`, `seq`, `trace_type`, `content`, `source_event`
- Optional: `media`, `tool_name`, `tool_call_id`, `tool_args`, `tool_result`, `tool_error`,
  `correlation_id`, `tags`, `tool_result_ref`

**EPISODIC (EpisodicItem)**

- `id`, `ts`, `turn_ids`, `summary`, `tags`, `salience`

**SEMANTIC (SemanticItem)**

- `id`, `ts`, `category`, `fact`, optional `reference`, `tags`, `salience`
- `category` enum: `critical_issue | unresolved_work | user_preference | durable_fact | important_artifact`

**ToolInteraction (derived view)**

- `tool_call_id`
- `turn_id`
- `tool_name`
- `arguments`
- `result`
- `error`
- `status` (`PENDING | SUCCESS | ERROR`)

---

## 7. Memory Store Interface

**MemoryStore**

- `add(items)`
- `list(type, limit)`

**Default backend**: file-backed store (JSONL). The file store also provides
segmented raw-trace archive helpers plus compacted-memory manifest helpers
(`readCompactedMemoryManifest`, `writeCompactedMemoryManifest`) used by
compaction and startup/restore schema-gate reset behavior.

`RunMemoryFileStore` is the shared low-level direct-run-directory facade. It owns
canonical active file paths, raw-trace appends, complete-corpus reads (complete
archive segments plus active records), semantic replacement, manifest IO, native
compaction prune/archive entrypoints, provider-boundary rotation entrypoints, and
working-context snapshot serialization without requiring callers to instantiate
`MemoryManager`. Native `FileMemoryStore` delegates its common file operations to
this facade, and `autobyteus-server-ts` uses the same facade for storage-only
Codex/Claude run and team-member memory recording.

`RawTraceArchiveManager` is the only owner of segmented archive internals:
`raw_traces_archive_manifest.json`, immutable files under `raw_traces_archive/`,
pending/complete segment state, deterministic segment filenames, and idempotent
same-boundary retry behavior. The old monolithic `raw_traces_archive.jsonl` file
is intentionally not a current compatibility read/write target.

### 7.1 File-Backed Store Layout (Default)

Memory is persisted per agent as append-only JSONL files for convenience and
inspection:

**Base directory selection**

- Default: `<cwd>/memory`
- Override via `AUTOBYTEUS_MEMORY_DIR`

```
memory/
  agents/
    <agent_id_or_run_id>/
      raw_traces.jsonl
      raw_traces_archive_manifest.json  # segmented archive manifest
      raw_traces_archive/               # immutable complete/pending segment files
      episodic.jsonl
      semantic.jsonl
      compacted_memory_manifest.json
      working_context_snapshot.json
  agent_teams/
    <team_run_id>/
      <member_run_id>/
        raw_traces.jsonl
        working_context_snapshot.json
```

---

## 7.2 Server-Side External Runtime Recording

`autobyteus-server-ts` records Codex and Claude runtime output into the same file
shape as native memory, but that path is intentionally **storage-only**:

- accepted user messages are captured after `AgentRun.postUserMessage(...)` is
  accepted;
- assistant, reasoning, and tool lifecycle records are captured from normalized
  `AgentRunEvent`s;
- `raw_traces.jsonl` and `working_context_snapshot.json` are written through
  `RunMemoryFileStore` / `RawTraceItem` / `WorkingContextSnapshot` primitives;
- native AutoByteus runs still use `MemoryManager` directly and are skipped by
  the server recorder to avoid duplicate traces.

External-runtime recording does not retrieve memory for Codex/Claude, inject
recorded traces into their prompts, create a runtime-specific memory manager, or
run semantic/episodic compaction in their execution path. Provider/session
compaction boundaries may only append storage-only provenance markers and rotate
settled active raw traces before an eligible marker into shared archive segments.
This preserves active plus complete archive segments as the full raw-trace corpus.
There is no external-runtime semantic compaction, trace-content rewrite,
compression, total-retention policy, or snapshot-windowing behavior.

## 8. Triggering and Lifecycle

The memory module is **event-driven**. It is triggered by:

### Ingest
- **Primary user ingest:** `LLMUserMessageReadyEvent` (processed input)
- **Tool call intent:** `PendingToolInvocationEvent` (LLM decision to act)
- `LLMCompleteResponseReceivedEvent`
- `ToolResultEvent`

### Consolidation / Extraction
- When input prompt exceeds token budget (post-response usage)

### Retrieval (every LLM call)
Before sending a user message to the LLM, memory prepares a **Working Context Snapshot**
for the current compaction epoch. If compaction is triggered, memory builds a
**Compaction Snapshot** and resets the working context snapshot to that snapshot before the call.

---

## 9. Prompt Assembly (Working Context Snapshot + Compaction Snapshot)

The memory layer maintains a **Working Context Snapshot**: a generic, append-only
message list that grows between compaction boundaries. This is what the LLM
receives on each call.

When compaction triggers, memory builds a **Compaction Snapshot** (a compact,
curated baseline) and **resets** the Working Context Snapshot to that snapshot.

### Working Context Snapshot (per-epoch)
The working context snapshot is a list of generic messages that includes:

1. System prompt (bootstrapped)
2. Prior user / assistant messages (since last compaction)
3. Tool call intents and tool results (as messages or structured entries)
4. Current user input

### Compaction Snapshot (handoff baseline)
The snapshot is a compact replacement for the working context snapshot base:

1. System prompt (bootstrapped)
2. Memory bundle (episodic + semantic)
3. Formatted `RAW_FRONTIER` blocks selected by the deterministic planner

After compaction, the working context snapshot is reset to this snapshot, then new turns
append again. The preserved suffix is block-based rather than a fixed N-turn tail: at least
one frontier block stays raw so unresolved or live context is carried into the next request.

### Prompt Renderer (provider adaptation)
LLMs consume provider-specific payloads, so the generic working context snapshot is rendered
by a **Prompt Renderer** per provider (OpenAI, Anthropic, etc.). This keeps the
memory layer canonical and makes LLMs stateless executors.

**Note (TypeScript today):** system prompts are configured on the LLM instance
during bootstrap. In memory-centric mode, the system prompt can be injected
directly into the working context snapshot to make the LLM fully stateless.

---

## 10. Compaction and Token Budget

Compaction is triggered by **token pressure** using **exact post-response usage**
and evaluated **before the next LLM leg**. The runtime does not interrupt an
in-flight stream to compact mid-response.

**Inputs**

- effective context capacity:
  - `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`, else
  - `LLMModel.activeContextTokens`, else
  - `LLMModel.maxContextTokens`
- reserved output headroom:
  - `min(LLMConfig.maxTokens, LLMModel.maxOutputTokens)` when both exist, with
    whichever value is available used as the fallback
- provider input ceiling: `LLMModel.maxInputTokens` when exposed by the provider
- safety margin:
  - `LLMConfig.safetyMarginTokens`, else
  - `LLMModel.defaultSafetyMarginTokens`, else
  - `CompactionPolicy.safetyMarginTokens` (`256` by default)
- compaction ratio:
  - `LLMConfig.compactionRatio`, else
  - `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`, else
  - `LLMModel.defaultCompactionRatio`, else
  - `CompactionPolicy.triggerRatio` (`0.8` by default)

**Budget**

- `context_derived_input_cap = effective_context_capacity - reserved_output_tokens`
- `effective_input_capacity = min(context_derived_input_cap, provider_input_cap)`
  when both exist
- `input_budget = effective_input_capacity - safety_margin`
- `trigger_threshold_tokens = compaction_ratio * input_budget`

**Trigger (post-response)**

- If the **last response** reports `prompt_tokens > input_budget`, mark
  compaction required and rebuild the working context snapshot **before the next call**
  via Compaction Snapshot.
- Early trigger: `prompt_tokens > compaction_ratio * input_budget`
- If a threshold-crossing response already emitted tool calls, those tool calls
  are still allowed to run; compaction executes before the next LLM continuation leg.

Compaction policy:

- Build deterministic `InteractionBlock`s rooted by `user` and persisted
  `tool_continuation` boundary traces.
- Compact only settled eligible blocks; keep frontier blocks raw.
- If there is a trailing incomplete suffix, that suffix remains frontier.
  Otherwise the planner keeps the active turn's last block raw, and bootstrap
  fallback with no active turn conservatively keeps the final block raw.
- When raw frontier lines are rendered into the snapshot, each line is bounded
  by `CompactionPolicy.maxItemChars` (default `2000`).

---

## 10.1 Production Compaction Pipeline

Compaction is the **first priority** of the memory system because it keeps the
Working Context Snapshot bounded and useful.

### Compaction Outputs

Compaction produces **structured memory artifacts** and a new working context snapshot base:

1. **EPISODIC summary** of eligible settled interaction blocks
2. **Typed SEMANTIC entries** extracted into critical issues, unresolved work, user preferences, durable facts, and important artifacts
3. **`RAW_FRONTIER` blocks** preserved as the unsettled or live suffix
4. **Eligible RAW_TRACE entries pruned/archived by trace ID**
5. **Compaction Snapshot** (new base for the Working Context Snapshot)

### Compaction Flow (LLM-driven)

1. Default `AgentFactory` runtime composition wires a production
   `LLMCompactionSummarizer`; no separate public compaction agent is used.
2. `PendingCompactionExecutor` runs before the next provider dispatch whenever
   `memoryManager.compactionRequired` is set.
3. `CompactionWindowPlanner` reads ordered `RAW_TRACE` and builds
   `InteractionBlock`s:
   - `user` and `tool_continuation` traces start blocks
   - subsequent assistant/tool_call/tool_result traces stay inside that block
   - orphaned suffix traces become `recovery` blocks
4. Frontier resolution is deterministic:
   - any trailing incomplete suffix remains frontier
   - otherwise the last block for the active turn remains frontier
   - bootstrap fallback with `activeTurnId = null` conservatively keeps the
     final block frontier
5. Eligible settled blocks receive tool-result digests for summarization;
   frontier blocks intentionally keep full raw traces.
6. Resolve the compaction model from
   `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, otherwise reuse the active run
   model, then fall back to the configured runtime model if needed.
7. Execute one internal LLM call with a built-in compaction prompt that asks
   for JSON-only output:
   - `episodic_summary`
   - `critical_issues[]`
   - `unresolved_work[]`
   - `durable_facts[]`
   - `user_preferences[]`
   - `important_artifacts[]`
8. Parse and validate the structured response, then run deterministic
   normalization (dedupe, low-value filtering, category caps, reference
   cleanup, and salience assignment) before persisting EPISODIC + SEMANTIC
   items.
9. `MemoryStore.pruneRawTracesById(plan.eligibleTraceIds, true)` archives and
   removes only the compacted raw traces.
10. Rebuild the working-context snapshot baseline from:
    - system prompt
    - retrieved episodic/semantic bundle
    - formatted `[RAW_FRONTIER]` lines
11. Reset the working-context snapshot to that baseline, clear the
    pending-compaction flag, and emit completed status. Failures stop before the
    next LLM dispatch and leave targeted raw traces intact.

### Planner / Frontier / Store Rules

- `InteractionBlockKind` is `user`, `tool_continuation`, or `recovery`.
- A block is structurally complete only when it is not a recovery block, has
  more than one trace, contains no malformed tool trace, and every tool call in
  the block has a matching tool result.
- `CompactionPlan.eligibleTraceIds` and `frontierTraceIds` are explicit, so
  pruning and snapshot rendering do not have to rediscover the same window.
- Raw frontier rendering is intentionally block-based (`[RAW_FRONTIER]`) rather
  than a flat “last 4 turns” tail.
- Raw-trace prune/archive ownership lives in the `MemoryStore` boundary, not in
  `MemoryManager` or higher runtime handlers.

### Runtime Settings Surface

| Setting | Purpose | Default / Behavior |
| --- | --- | --- |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Overrides the post-response trigger ratio used for subsequent budget checks. | Defaults to `0.8`; parsed as a positive decimal and clamped to `<= 1`. |
| `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` | Selects a dedicated internal compaction model. | Blank falls back to the active run model. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Lowers the effective context ceiling for safer budgeting (for example when a provider fails before its advertised maximum). | Blank disables the override; positive values are floored to an integer token ceiling. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Enables verbose compaction diagnostics. | Disabled by default; truthy values such as `1`, `true`, `yes`, `on` enable detailed logs. |

### Snapshot Cache / Schema-3 Bootstrap

- `WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION` remains `3`.
- `COMPACTED_MEMORY_SCHEMA_VERSION` is now `2` for persisted semantic-memory +
  manifest state.
- `WorkingContextSnapshotBootstrapper` runs
  `CompactedMemorySchemaGate.ensureCurrentSchema(...)` before any snapshot
  validation or restore attempt.
- If persisted semantic records fail current-schema validation, the schema gate
  clears stale `semantic.jsonl`, writes manifest v2 reset metadata, invalidates
  the cached working-context snapshot, and forces bootstrap to rebuild from
  canonical sources or start clean.
- If semantic memory is already current-schema but the manifest is missing or
  stale, the gate backfills the current manifest without forcing a reset.
- Direct snapshot restore now happens only when the schema gate did not reset
  and the cached payload validates against schema `3`.
- Missing or stale payloads rebuild through `CompactionWindowPlanner.plan(...,
  null)` plus `CompactionSnapshotBuilder`, so bootstrap uses the same frontier
  rules as live compaction.
- The rebuild path keeps the final block raw conservatively when there is no
  active turn, instead of retaining a multi-schema compatibility layer.

### Local Provider Runtime Notes

- Large compaction prompts can leave a local runtime in prompt-processing for
  minutes before any response body data is emitted.
- `LMStudioLLM` and `OllamaLLM` therefore use the shared
  `local-long-running-fetch` transport so the local HTTP stack does not apply
  the default idle body/header timeouts during those waits.
- `LMStudioLLM` also raises the separate OpenAI SDK request timeout to a high
  finite value (`24h`) because the SDK default is shorter and `timeout: 0` is
  not a safe disable path there.
- This hardening is intentionally limited to LM Studio and Ollama. Cloud/API
  providers keep their normal SDK transport behavior unless reviewed separately.
- If a local runtime still fails before its advertised context window, lower
  `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` to the practical ceiling instead
  of expecting a new user-facing timeout setting.

### Failure Handling and Observability

- Runtime lifecycle events are emitted for:
  - `requested`
  - `started`
  - `completed`
  - `failed`
- Basic lifecycle logs are always emitted. With
  `AUTOBYTEUS_COMPACTION_DEBUG_LOGS=true`, the runtime also logs detailed budget
  evaluation, execution context, and result-summary records.
- On compaction failure:
  - the active turn resolves through a recoverable error completion
  - targeted raw traces are **not** pruned or archived
  - `memoryManager.compactionRequired` remains set so later dispatches stay gated
    until compaction succeeds
  - the same failure state is propagated through the server/web streaming pipeline
    for UI visibility

---

## 10.1A Accumulation Phase (Raw Trace Capture)

Before compaction, the system is in an **accumulation phase** where it captures
processed traces as RAW_TRACE. This ensures memory is the canonical record of
what actually reaches the LLM.

**Primary capture points**

- `LLMUserMessageReadyEvent` (processed user input)
- `PendingToolInvocationEvent` (tool intent)
- `ToolResultEvent` (tool outcome)
- `LLMCompleteResponseReceivedEvent` (assistant response)

**Preferred mechanism**

Use **processors** where possible to ingest traces and keep handlers clean:

- Input processor (runs last): capture processed user input
- Tool result processor: capture tool outcomes

Assistant responses are ingested in `LLMUserMessageReadyEventHandler` after the
LLM stream completes (no separate response processor yet).

This keeps accumulation consistent and centralizes memory ingestion.

### Suggested processor classes and ordering

**Input pipeline**

- `MemoryIngestInputProcessor`
  - `get_order() = 900` (runs after all user input processors)

**Tool result pipeline**

- `MemoryIngestToolResultProcessor`
  - `get_order() = 900` (runs after formatting/cleanup processors)

Ordering rationale: use a high order so memory captures **final, processed**
content that matches what the LLM sees or what the agent outputs.

---

### RAW_TRACE JSONL schema (active file, turn-tagged)

Each line is a JSON object with a small, consistent core schema. Optional fields
are present only when relevant.

**Required fields**

- `id`: unique ID
- `ts`: epoch seconds (float)
- `turn_id`: stable ID for the user-origin turn
- `seq`: integer ordering within the turn
- `trace_type`: enum (`user`, `assistant`, `tool_call`, `tool_result`, `tool_continuation`)
- `content`: text payload (may be empty for tool events)
- `source_event`: originating event name

**Optional fields**

- `media`: `{ "images": [...], "audio": [...], "video": [...] }`
- `tool_name`
- `tool_call_id`
- `tool_args`
- `tool_result`
- `tool_error`
- `tool_result_ref`
- `correlation_id`
- `tags`

**Example: user trace**

```
{"id":"rt_001","ts":1738100000.12,"turn_id":"turn_0001","seq":1,"trace_type":"user","content":"Please refactor the parser.","source_event":"LLMUserMessageReadyEvent","media":{"images":[],"audio":[],"video":[]},"tags":["processed"]}
```

**Example: tool continuation boundary**

```
{"id":"rt_005_tool_continuation","ts":1738100004.10,"turn_id":"turn_0001","seq":5,"trace_type":"tool_continuation","content":"Tool continuation","source_event":"ToolContinuationInput","tags":["boundary"]}
```

**Example: tool result**

```
{"id":"rt_003","ts":1738100003.11,"turn_id":"turn_0001","seq":3,"trace_type":"tool_result","content":"","source_event":"ToolResultEvent","tool_name":"list_directory","tool_call_id":"call_1","tool_result":["app.ts","parser.ts"]}
```

**Example: assistant response**

```
{"id":"rt_004","ts":1738100005.90,"turn_id":"turn_0001","seq":4,"trace_type":"assistant","content":"I will refactor the parser next.","source_event":"LLMCompleteResponseReceivedEvent","tags":["final"]}
```

---

### Turn / Boundary Aggregation (Compaction Unit)

Raw traces are stored line-by-line, but compaction plans them into
**interaction blocks**.

**Turn definition**

- One processed non-tool user message still creates one `turn_id`.
- `turn_id` is generated at `LLMUserMessageReadyEvent` time.
- Tool call intents and tool results inherit the `turn_id` stored on the
  `ToolInvocation`, even if the result arrives later.
- TOOL-origin continuation input does **not** mint a new turn; it reuses the
  active `turn_id` and writes a lightweight `tool_continuation` boundary trace.

**Interaction-block rules**

- `user` and `tool_continuation` traces start new blocks.
- Following assistant/tool_call/tool_result traces stay inside that block until
  the next boundary trace.
- If non-boundary traces appear before any boundary trace, the planner creates a
  `recovery` block and never treats it as a settled compaction block.

**Compaction behavior**

- Compaction consumes eligible settled blocks, **not** whole turns.
- The same `turn_id` can therefore produce multiple blocks when tool
  continuation cycles occur.
- The unresolved frontier remains raw; bootstrap fallback with no active turn
  conservatively keeps the final block raw.

---

### Accumulation-to-Compaction Flow (Diagram)

```
UserMessageReceivedEvent
   │
   ▼
UserInputMessageEventHandler
   │   (input processors run here)
   └─► MemoryIngestInputProcessor (order 900)
   │      ├─► MemoryManager.ingestUserMessage(...)
   │      └─► MemoryManager.ingestToolContinuationBoundary(...) for TOOL-origin continuation input
   ▼
LLMUserMessageReadyEvent
   ▼
LLMUserMessageReadyEventHandler
   ├─► LLMRequestAssembler.prepareRequest(...)
   │      └─► PendingCompactionExecutor.executeIfRequired(...)
   │            ├─► CompactionWindowPlanner.plan(...)
   │            ├─► Compactor.compact(...)
   │            ├─► FileMemoryStore.pruneRawTracesById(...)
   │            └─► CompactionSnapshotBuilder.build(...)
   ├─► LLM.streamMessages(Working Context Snapshot)
   ├─► PendingToolInvocationEvent
   └─► MemoryManager.ingestAssistantResponse(...)

ToolResultEvent
   └─► ToolResultEventHandler
         └─► MemoryIngestToolResultProcessor (order 900)
               └─► MemoryManager.ingestToolResult(...)

MemoryManager
   ├─► RAW_TRACE accumulation (+ tool_continuation boundaries)
   ├─► Working Context Snapshot persistence (schema 3)
   └─► pending-compaction flag / snapshot reset
```

---

## 10.2 Proposed Code Structure (Compaction-Focused)

```text
src/memory/
├── index.ts
├── models/
│   ├── memory-types.ts
│   ├── raw-trace-item.ts
│   ├── episodic-item.ts
│   ├── semantic-item.ts
│   └── tool-interaction.ts
├── store/
│   ├── base-store.ts                    # MemoryStore interface incl. pruneRawTracesById
│   ├── compacted-memory-manifest.ts     # Schema-versioned manifest for semantic-memory state
│   ├── file-store.ts                    # Default file-backed store (JSONL + archive + manifest)
│   └── working-context-snapshot-store.ts
├── restore/
│   ├── compacted-memory-schema-gate.ts
│   └── working-context-snapshot-bootstrapper.ts
├── compaction/
│   ├── compaction-plan.ts
│   ├── compaction-prompt-builder.ts
│   ├── compaction-response-parser.ts
│   ├── compaction-result.ts
│   ├── compaction-result-normalizer.ts
│   ├── compaction-runtime-settings.ts
│   ├── compaction-window-planner.ts
│   ├── compactor.ts
│   ├── frontier-formatter.ts
│   ├── interaction-block.ts
│   ├── interaction-block-builder.ts
│   ├── llm-compaction-summarizer.ts
│   ├── pending-compaction-executor.ts
│   ├── summarizer.ts
│   ├── tool-result-digest.ts
│   └── tool-result-digest-builder.ts
├── compaction-snapshot-builder.ts       # Builds compact snapshot baseline from bundle + RAW_FRONTIER
├── compaction-snapshot-recent-turn-formatter.ts
├── tool-interaction-builder.ts
├── turn-tracker.ts
├── working-context-snapshot.ts
├── working-context-snapshot-serializer.ts
└── memory-manager.ts

src/agent/
├── llm-request-assembler.ts             # memory + renderer + pending-compaction orchestration
├── handlers/llm-user-message-ready-event-handler.ts
└── input-processor/memory-ingest-input-processor.ts
```

### Responsibility Map

- **MemoryManager**: receives events, persists user/tool/assistant traces,
  records `tool_continuation` boundaries, exposes ordered raw traces, and owns
  working-context snapshot reset/persistence.
- **PendingCompactionExecutor**: runs the pre-dispatch compaction sequence,
  resolves runtime settings/model selection, and converts failures into a clean
  pre-dispatch error boundary.
- **CompactionWindowPlanner**: builds `InteractionBlock`s, decides
  eligible-vs-frontier ownership, and emits explicit trace-id selections.
- **Compactor**: asks the summarizer for episodic/typed-semantic output
  and commits it before delegating prune/archive to the store.
- **CompactionResultNormalizer**: owns typed semantic-entry cleanup, dedupe,
  low-value filtering, per-category caps, and deterministic salience
  assignment before persistence.
- **MemoryStore / FileMemoryStore**: own raw-trace append order,
  prune/archive-by-trace-id semantics, semantic reset helpers, and
  compacted-memory manifest reads/writes.
- **CompactedMemorySchemaGate**: owns current-schema enforcement, destructive
  reset-on-mismatch behavior for persisted semantic memory, manifest-v2 reset
  metadata writes, and cached-snapshot invalidation triggers.
- **WorkingContextSnapshotBootstrapper / Serializer**: own gate-first startup
  restore decisions, schema-3 cache validation, and planner-driven rebuild
  fallback.
- **FrontierFormatter / CompactionSnapshotBuilder**: render `[RAW_FRONTIER]`
  lines plus category-priority semantic sections into the compact snapshot
  baseline.
- **CompactionPolicy**: defines trigger ratio, safety margin, and rendered line
  limits (`maxItemChars`) rather than a fixed raw-tail size.
- **ToolInteractionBuilder**: derives human-friendly tool interaction views from
  stored raw traces.

## 11. Integration Points (Autobyteus)

**Suggested integration**

- Add `MemoryManager` to `AgentRuntimeState`
- Keep ingest processors (user/tool/assistant) to append to Working Context Snapshot
- Add a pre-LLM hook to request a working context snapshot render + compaction check
- Route tool results and messages into memory ingest

**Migration path**

1. **Hybrid epoch mode**: append to LLM history until compaction, then reset
   from Compaction Snapshot.
2. **Memory-centric mode**: LLM history becomes stateless; memory owns working context snapshot.
3. **Full core mode**: all history and context sourced from memory store.

---

## 12. Open Questions

- Should memory be per-agent only, or allow shared/team scope?
- How should future semantic categories evolve if the typed compaction schema expands beyond the current five buckets?
- Should compaction be LLM-based or rule-based in MVP?

---

## 13. Memory-Centric Architecture (LLM as a Service)

In memory-centric mode, the LLM does **not** own history. Memory is the source
of truth and the LLM is invoked with a **Working Context Snapshot** built from memory
state (and reset from Compaction Snapshot when needed).

```
User/Event
   │
   ▼
MemoryManager (ingest)
   │
   ├─► Compactor (if compaction_required)
   │      └─► Summarizer (LLM)
   │
   ├─► Working Context Snapshot (append or reset)
   │      └─► Compaction Snapshot (if needed)
   │
   └─► Prompt Renderer (provider payload)
           │
           ▼
        LLM Invoke
           │
           ▼
MemoryManager (ingest response)
```

Key idea: **the LLM is a stateless generator**, and memory constructs the
prompt each call.

---

## 14. Trigger Implementation (Compaction)

Compaction is triggered **after an LLM response** based on **exact usage** and
is executed **before the next LLM call**.

**Token budget check (post-response)**

```
input_budget = max_context_tokens - max_output_tokens - safety_margin
if prompt_tokens > input_budget:
    requestCompaction()
```

**Suggested early trigger**

```
if prompt_tokens > 0.8 * input_budget:
    requestCompaction()
```

### Where the trigger lives

- **LLMUserMessageReadyEventHandler** (post-response):
  1. Receives `TokenUsage` from the provider (exact prompt tokens)
  2. Evaluates the compaction policy
  3. Sets `MemoryManager.compaction_required = True`

- **LLMRequestAssembler.prepareRequest(...)** (pre-next-call):
  1. Checks `compaction_required`
  2. Runs compaction + snapshot reset when requested
  3. Appends the new user/tool input to the working context snapshot
  4. Renders provider payload

This keeps compaction centralized **without token estimation** and avoids
provider-specific counting logic in the request path.

---

## 15. Refactor Fit: Current Autobyteus Event Flow

### 15.1 Where LLM is triggered today

- `UserMessageReceivedEvent`
  - `UserInputMessageEventHandler` creates `LLMUserMessageReadyEvent`
- `LLMUserMessageReadyEventHandler` calls:
- `context.state.llmInstance.streamMessages(...)` with assembled messages

Legacy `conversation_history` has been removed. LLM providers are stateless.

### 15.2 Minimal integration (legacy path — removed)

Earlier plans kept `BaseLLM.messages` between compactions for cache reuse.
This path has been removed in favor of fully stateless LLM execution.

### 15.3 Memory-centric integration (recommended)

Refactor the LLM call site to delegate prompt construction to memory:

```
UserMessageReceivedEvent
  └─► UserInputMessageEventHandler
        └─► LLMUserMessageReadyEvent (processed input)
              └─► MemoryManager.ingestUserMessage(...)
                    └─► LLMUserMessageReadyEventHandler
                          ├─► LLMRequestAssembler.prepareRequest(processed_user)
                          ├─► LLM.streamMessages(messages, rendered_payload)
                          └─► MemoryManager.ingestAssistantResponse(...)
```

Key changes:

- Add `memory_manager` to `AgentRuntimeState`
- Ingest **processed** user input (LLMUserMessageReadyEvent), plus tool intent,
  tool results, and assistant response events
- Build or reset Working Context Snapshot before every LLM call (via assembler)
- Keep LLM stateless (no internal history ownership)

### 15.4 Refactor targets (files)

Primary touch points:

- `src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `src/agent/handlers/user-input-message-event-handler.ts`
- `src/agent/handlers/tool-result-event-handler.ts`
- `src/agent/handlers/tool-invocation-request-event-handler.ts`
- `src/agent/context/agent-runtime-state.ts`

### 15.5 LLM API adjustment (implemented)

LLM providers now accept explicit message lists via:

- `streamMessages(messages: Message[], kwargs?: Record<string, unknown>)`

This keeps memory as the single source of truth and removes hidden prompt
mutation.

### 15.6 Model-driven compaction defaults

Set compaction defaults on the model registry so each model can define its
own context budget behavior. Allow per-agent overrides in config.

**Model defaults (LLMModel)**

- `max_context_tokens`
- `default_compaction_ratio` (e.g., 0.8)
- `default_safety_margin_tokens`

**Config overrides (LLMConfig)**

- `compaction_ratio` (optional override)
- `safety_margin_tokens` (optional override)
- `max_tokens` (output budget)

---

## 15.7 Refactoring Plan (Clean, Stateless LLM)

This refactor removes LLM-owned history and makes memory the only source of
truth. The LLM layer becomes a **stateless executor** that accepts explicit
messages and renders provider payloads via Prompt Renderers.

### Phase A — New LLM API (stateless)

**Goal:** LLMs accept explicit message lists; no `self.messages` usage.

- Add to `BaseLLM`:
  - `streamMessages(messages: Message[], kwargs?: Record<string, unknown>)`
  - `sendMessages(messages: Message[], kwargs?: Record<string, unknown>)`
- Remove reliance on `addUserMessage` / `addAssistantMessage` in call flow.
- Remove `LLMUserMessage` from core execution paths. (Input processors can
  still build `LLMUserMessage`, but the LLM layer should not depend on it.)

**Files**

- `src/llm/base.ts`
- Provider implementations:
  - `src/llm/api/openai-responses-llm.ts`
  - `src/llm/api/openai-compatible-llm.ts`
  - `src/llm/api/anthropic-llm.ts`
  - `src/llm/api/gemini-llm.ts`
  - `src/llm/api/ollama-llm.ts`
  - others as needed

**Tests**

- Update LLM unit tests to pass explicit `messages` lists.
- Add tests that `BaseLLM` does not mutate internal history.

---

### Phase A.1 — Tool-aware Message Model (clean semantics)

**Goal:** Tool calls and tool results are first-class messages, not text hacks.

- Extend `MessageRole` with `TOOL`.
- Add **tool payload types** and attach them to messages:
  - `ToolCallPayload` (assistant-emitted tool calls)
  - `ToolResultPayload` (tool execution results)
- `Message` carries `toolPayload: ToolPayload | null` instead of many tool
  fields.

**Where used**

- Working Context Snapshot appends tool call intents and tool results as structured
  messages.
- Prompt Renderers map tool messages to provider-specific formats.

**Tests**

- Message construction with tool metadata
- Renderer output contains correct tool fields

#### Tool Message Schema (generic)

**Assistant tool-call message**

```
const message: Message = {
  role: MessageRole.ASSISTANT,
  content: null,
  toolPayload: {
    toolCalls: [{ id: 'call_abc123', name: 'list_directory', arguments: { path: 'src' } }]
  }
};
```

**Tool result message**

```
const toolResult: Message = {
  role: MessageRole.TOOL,
  toolPayload: {
    toolCallId: 'call_abc123',
    toolName: 'list_directory',
    toolResult: ['app.ts', 'parser.ts'],
    toolError: null
  }
};
```

#### Message Fields (extended)

```
type Message = {
  role: MessageRole;
  content: string | null;
  reasoningContent?: string | null;
  imageUrls: string[];
  audioUrls: string[];
  videoUrls: string[];
  toolPayload: ToolPayload | null;
};
```

```
type ToolCallSpec = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};
```

```
type ToolCallPayload = {
  toolCalls: ToolCallSpec[];
};
type ToolResultPayload = {
  toolCallId: string;
  toolName: string;
  toolResult: unknown;
  toolError: string | null;
};
type ToolPayload = ToolCallPayload | ToolResultPayload;
```

#### Renderer Mapping (examples)

**OpenAI Chat Completions**

- Assistant tool-call:
  - `role: "assistant"`
  - `tool_calls: [{"id", "type": "function", "function": {"name", "arguments"}}]`
- Tool result:
  - `role: "tool"`
  - `tool_call_id: ...`
  - `content: <serialized tool_result or tool_error>`

**OpenAI Responses API**

- Assistant tool-call:
  - `{"type": "tool_call", "id": ..., "name": ..., "arguments": ...}`
- Tool result:
  - `{"type": "tool", "tool_call_id": ..., "output": ...}`

---

### Phase B — Prompt Renderers

**Goal:** Provider payload formatting is separated from LLM execution.

- Add `src/llm/prompt-renderers/base-prompt-renderer.ts`
- Add provider renderers:
  - `openai-responses-renderer.ts`
  - `openai-chat-renderer.ts`
  - later: `anthropic-prompt-renderer.ts`, `gemini-prompt-renderer.ts`
- LLM implementations call renderer to produce API payloads.
  - `tools` schema remains a kwarg passed into the LLM call.
  - Renderers decide how to encode tool schemas for providers that support native tools.

**Tests**

- Renderer tests: deterministic formatting + stable ordering.
- Round-trip tests: messages → payload contains expected fields.

---

### Phase C — Memory owns working context snapshot

**Goal:** Memory produces the working context snapshot used by LLM.

- Add `src/memory/working-context-snapshot.ts`
- Add `src/memory/compaction-snapshot-builder.ts`
- Update `MemoryManager` to:
- append to Working Context Snapshot on each ingest
  - build Compaction Snapshot on compaction
  - reset working context snapshot to snapshot at compaction boundary
- expose Working Context Snapshot accessors (messages + metadata)

**Tool events (structured)**

- Append **assistant tool_call** messages when the model requests tools.
- Append **tool result** messages with `role=TOOL` when tool execution finishes.
- When tool execution returns control to the model, the TOOL-origin continuation
  input reuses the active turn and persists a lightweight
  `tool_continuation` boundary trace before the next LLM leg.

**Agent integration**

- `LLMUserMessageReadyEventHandler` calls
  `LLMRequestAssembler.prepareRequest(...)`, which runs `PendingCompactionExecutor`
  before passing messages to the LLM.

**Tests**

- Working context snapshot append ordering
- Snapshot reset behavior
- Compaction boundary resets working context snapshot

---

### Phase D — Extensions (stateless-safe)

**Goal:** Extensions operate on explicit inputs, not LLM-owned history.

- Update `LLMExtension` interface:
  - `beforeInvoke(messages: Message[], renderedPayload: unknown, kwargs?: Record<string, unknown>)`
  - `afterInvoke(messages: Message[], response: CompleteResponse, kwargs?: Record<string, unknown>)`
- Update `TokenUsageTrackingExtension`:
  - Count input tokens from provided messages
  - Override with provider usage if available
  - Remove `on_user_message_added`/`on_assistant_message_added`

### Streaming & Tool Parsing (compatibility)

- Streaming parser continues to detect tool calls (XML / JSON / API-native).
- After parsing tool calls, append an assistant message with `tool_calls`
  metadata to the Working Context Snapshot.
- Tool results are appended as `MessageRole.TOOL` messages.
- TOOL-origin continuation input reuses the active turn and persists a lightweight `tool_continuation` boundary trace before the next LLM leg.

---

## 16. Runtime Simulation (End-to-End Call Stack)

This section simulates **real call stacks** (debug-trace style) for common
flows to validate the new file structure and data flow.

### 16.1 Simple user → assistant (no tools)

**Scenario**  
User asks a question; no tool calls are emitted.

**Call stack (debug-trace style)**

```
LLMUserMessageReadyEventHandler.handle(...)
  at src/agent/handlers/llm-user-message-ready-event-handler.ts
  └─► LLMRequestAssembler.prepareRequest(...)
        at src/agent/llm-request-assembler.ts
        ├─► PendingCompactionExecutor.executeIfRequired(...)
        │     at src/memory/compaction/pending-compaction-executor.ts
        │     └─► (no compaction when flag is clear)
        ├─► WorkingContextSnapshot.buildMessages()
        │     at src/memory/working-context-snapshot.ts
        ├─► PromptRenderer.render(...)
        │     at src/llm/prompt-renderers/openai-responses-renderer.ts
        └─► append current user message to working context snapshot
  └─► LLM.streamMessages(messages, tools?)
        at src/llm/base.ts
        └─► Provider call
  └─► MemoryManager.ingestAssistantResponse(...)
        at src/memory/memory-manager.ts
        └─► WorkingContextSnapshot.appendAssistant(...)
              at src/memory/working-context-snapshot.ts
```

**Gap check**  
Requires stateless LLM API + prompt renderer.

---

### 16.2 User → tool call → tool result → assistant

**Scenario**  
LLM emits one or more tool calls; tools run; results return; LLM continues.

**Call stack (debug-trace style)**

```
LLMUserMessageReadyEventHandler.handle(...)
  at src/agent/handlers/llm-user-message-ready-event-handler.ts
  └─► LLMRequestAssembler.prepareRequest(...)
        at src/agent/llm-request-assembler.ts
  └─► LLM.streamMessages(messages, tools)
        at src/llm/base.ts
        └─► Streaming parser detects tool call(s)
              at src/agent/streaming/*
              └─► MemoryManager.ingestToolIntent(...)
                    at src/memory/memory-manager.ts
                    └─► WorkingContextSnapshot.appendToolCalls(...)
                          at src/memory/working-context-snapshot.ts
              └─► PendingToolInvocationEvent
                    at src/agent/events/agent-events.ts
                    └─► ToolInvocationRequestEventHandler.handle(...)
                          at src/agent/handlers/tool-invocation-request-event-handler.ts
                          └─► ToolResultEvent
                                at src/agent/events/agent-events.ts
                                └─► MemoryIngestToolResultProcessor.process(...)
                                      at src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts
                                      └─► MemoryManager.ingestToolResult(...)
                                            at src/memory/memory-manager.ts
                                            └─► WorkingContextSnapshot.appendToolResult(...)
                                                  at src/memory/working-context-snapshot.ts
                                └─► TOOL-origin continuation input arrives on the same turn
                                      └─► MemoryIngestInputProcessor persists `tool_continuation`
                                            before the next LLM leg
```

**Gap check**  
Requires structured tool messages + renderer support for tool roles.

---

### 16.3 Compaction boundary (token pressure)

**Scenario**  
Previous LLM response reports prompt tokens above budget; compaction is executed
before the next LLM call.

**Call stack (debug-trace style)**

```
LLMUserMessageReadyEventHandler.handle(...)
  at src/agent/handlers/llm-user-message-ready-event-handler.ts
  └─► LLMRequestAssembler.prepareRequest(...)
        at src/agent/llm-request-assembler.ts
        ├─► PendingCompactionExecutor.executeIfRequired(...)
        │     at src/memory/compaction/pending-compaction-executor.ts
        │     ├─► CompactionWindowPlanner.plan(...)
        │     │     at src/memory/compaction/compaction-window-planner.ts
        │     ├─► Compactor.compact(plan)
        │     │     at src/memory/compaction/compactor.ts
        │     │     └─► Summarizer.summarize(plan.eligibleBlocks)
        │     │           at src/memory/compaction/summarizer.ts
        │     ├─► FileMemoryStore.pruneRawTracesById(plan.eligibleTraceIds)
        │     │     at src/memory/store/file-store.ts
        │     ├─► CompactionSnapshotBuilder.build(...)
        │     │     at src/memory/compaction-snapshot-builder.ts
        │     └─► WorkingContextSnapshot.reset(snapshot)
        │           at src/memory/working-context-snapshot.ts
        └─► PromptRenderer.render(messages)
              at src/llm/prompt-renderers/openai-responses-renderer.ts
  └─► LLM.streamMessages(compacted working context snapshot)
```

**Gap check**  
Requires deterministic snapshot formatting + model token budget fields.

---

### 16.4 Validation Method (recommended)

Use this “debug-trace simulation” as a review checklist:

- Each step has an explicit owner (file + class).
- No hidden mutation of LLM history.
- Tool calls/results are structured messages.
- Compaction resets working context snapshot and changes the next prompt.

**Tests**

- Extension hook coverage for new signatures
- Token usage tracking with explicit messages

---

### Phase E — Token Budget & Model Defaults

**Goal:** Use model-level token budgets for compaction thresholds.

- Add to `LLMModel`:
  - `max_context_tokens`
  - `default_compaction_ratio`
  - `default_safety_margin_tokens`
- Add to `LLMConfig` overrides:
  - `compaction_ratio`
  - `safety_margin_tokens`

**Tests**

- Model default usage
- Config overrides behavior

---

### Phase F — Cleanup / Removal

**Goal:** Remove legacy history code.

- `BaseLLM.messages` usage in providers has been removed.
- Remove `LLMUserMessage` path from core execution.
- Legacy `conversation_history` removal completed.

**Tests**

- Ensure no history is stored inside LLM
- Ensure memory is the only working context snapshot source

---

## 16. File Responsibilities (Implemented)

### Core

- `src/memory/memory-manager.ts`
  - Event-driven entry point
  - Persists user/tool/assistant traces and `tool_continuation` boundaries
  - Exposes ordered raw traces and forwards prune-by-id to the store

- `src/agent/llm-request-assembler.ts`
  - Ensures the system prompt is present
  - Runs `PendingCompactionExecutor` before appending the next user message
  - Returns final messages/rendered payload for LLM execution

- `src/memory/working-context-snapshot.ts`
  - Append/reset/build message list per compaction epoch

- `src/memory/working-context-snapshot-serializer.ts`
  - Serializes snapshot payloads with schema `3`
  - Validates current-schema-only cache payloads

- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
  - Uses valid cached snapshots when present
  - Rebuilds stale or missing caches through planner + snapshot builder

### Storage

- `src/memory/store/base-store.ts`
  - Store interface (`add`, `list`, `listRawTracesOrdered`, `pruneRawTracesById`)

- `src/memory/store/file-store.ts`
  - Default JSONL-backed persistence
  - Owns raw-trace archive + prune-by-trace-id helpers

### Compaction

- `src/memory/compaction/pending-compaction-executor.ts`
  - Pre-dispatch compaction sequencing and runtime status reporting

- `src/memory/compaction/compaction-window-planner.ts`
  - Deterministic eligible/frontier planning from ordered raw traces

- `src/memory/compaction/interaction-block*.ts`
  - Shared block model and block construction logic

- `src/memory/compaction/frontier-formatter.ts`
  - Formats raw frontier blocks for the snapshot baseline

- `src/memory/compaction/compactor.ts`
  - Summarizes eligible blocks, stores outputs, and requests prune/archive by ID

- `src/memory/compaction/llm-compaction-summarizer.ts`
  - Production internal LLM-backed summarizer owner

- `src/memory/compaction/compaction-prompt-builder.ts`
  - Builds the internal JSON-only compaction prompt

- `src/memory/compaction/compaction-response-parser.ts`
  - Parses and validates summarizer output

- `src/memory/policies/compaction-policy.ts`
  - Trigger ratio, rendered line cap, and safety margin defaults

### Retrieval / Snapshot

- `src/memory/retrieval/memory-bundle.ts`
  - Container for episodic + semantic

- `src/memory/retrieval/retriever.ts`
  - Loads bundle for snapshot building

- `src/memory/compaction-snapshot-builder.ts`
  - Builds the Compaction Snapshot from bundle + `[RAW_FRONTIER]`

- `src/memory/tool-interaction-builder.ts`
  - Derives tool interaction views from `RAW_TRACE`

### Ingest Processors

- `src/agent/input-processor/memory-ingest-input-processor.ts`
  - Captures processed user input
  - Persists `tool_continuation` boundaries for TOOL-origin continuation cycles

- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - Captures tool results as `RAW_TRACE` entries

## 17. Data Flow Summary (Memory-Centric)

```
UserMessageReceivedEvent
  └─► UserInputMessageEventHandler
        └─► Input processors
        └─► MemoryIngestInputProcessor (order 900)
              ├─► MemoryManager.ingestUserMessage(...)
              └─► MemoryManager.ingestToolContinuationBoundary(...) for TOOL sender
        └─► LLMUserMessageReadyEvent

LLMUserMessageReadyEventHandler
  ├─► request = LLMRequestAssembler.prepareRequest(...)
  │     ├─► PendingCompactionExecutor.executeIfRequired(...)
  │     │     ├─► CompactionWindowPlanner.plan(listRawTracesOrdered(), activeTurnId)
  │     │     ├─► Compactor.compact(plan)
  │     │     │     ├─► Summarizer.summarize(plan.eligibleBlocks)
  │     │     │     └─► MemoryStore.pruneRawTracesById(plan.eligibleTraceIds)
  │     │     └─► CompactionSnapshotBuilder.build(systemPrompt, bundle, plan)
  │     ├─► MemoryManager.workingContextSnapshot.appendMessage(userMessage)
  │     └─► Prompt Renderer.render(messages)
  ├─► LLM.streamMessages(request.messages, request.renderedPayload)
  ├─► MemoryManager.ingestToolIntents(...)
  ├─► PendingToolInvocationEvent
  └─► MemoryManager.ingestAssistantResponse(...)

ToolResultEventHandler
  └─► Tool result processors
        └─► MemoryIngestToolResultProcessor (order 900)
              └─► MemoryManager.ingestToolResult(...)

WorkingContextSnapshotBootstrapper
  ├─► use cache only if schema `3` validates
  └─► otherwise rebuild through planner + snapshot builder with `activeTurnId = null`

Memory Store (file-backed)
  ├─► RAW_TRACE (ordered traces + tool_continuation boundaries)
  ├─► RAW_TRACE archive (eligible trace IDs pruned out of active file)
  ├─► EPISODIC (summaries)
  └─► SEMANTIC (facts/preferences/decisions)
```

## 18. Core Interfaces (Method Signatures)

### MemoryManager

```
startTurn(): string
ingestUserMessage(llmUserMessage, turnId: string, sourceEvent): void
ingestToolContinuationBoundary(turnId: string, sourceEvent: string, content?): void
ingestToolIntent(toolInvocation, turnId?: string): void
ingestToolIntents(toolInvocations, turnId?: string): void
ingestToolResult(toolResultEvent, turnId?: string): void
ingestAssistantResponse(completeResponse, turnId: string, sourceEvent, options?): void
requestCompaction(): void
clearCompactionRequest(): void
listRawTracesOrdered(limit?: number): RawTraceItem[]
pruneRawTracesById(traceIds: Iterable<string>, archive?: boolean): void
getWorkingContextMessages(): Message[]
resetWorkingContextSnapshot(snapshotMessages: Iterable<Message>): void
getToolInteractions(turnId?: string): ToolInteraction[]
```

### LLMRequestAssembler

```
prepareRequest(processedUserInput, currentTurnId?: string | null, systemPrompt?: string | null, activeModelIdentifier?: string | null): Promise<RequestPackage>
renderPayload(messages: Message[]): Promise<ProviderPayload>
```

### PendingCompactionExecutor

```
executeIfRequired({ turnId?: string | null, systemPrompt: string, activeModelIdentifier?: string | null }): Promise<boolean>
```

### CompactionWindowPlanner

```
plan(rawTraces: RawTraceItem[], activeTurnId?: string | null): CompactionPlan
```

### Compactor

```
compact(plan: CompactionPlan): Promise<CompactionExecutionOutcome | null>
```

### Summarizer

```
summarize(blocks: InteractionBlock[]): Promise<CompactionResult>
```

### MemoryStore

```
add(items: Iterable<MemoryItem>): void
list(memoryType: MemoryType, limit?: number): MemoryItem[]
listRawTracesOrdered(limit?: number): RawTraceItem[]
pruneRawTracesById(traceIds: Iterable<string>, archive?: boolean): void
```

### WorkingContextSnapshotBootstrapper

```
bootstrap(memoryManager: MemoryManager, systemPrompt: string, options: WorkingContextSnapshotBootstrapOptions): void
```

## 19. Compaction Snapshot Assembly Rules

The Compaction Snapshot is used only at the **compaction boundary** to reset
the Working Context Snapshot.

### Ordering

1. System prompt
2. Memory bundle (episodic + semantic)
3. `[RAW_FRONTIER]` block rendering

### Limits (defaults)

- At least one frontier block stays raw
- `max_episodic_items = 3`
- `max_semantic_items = 20`
- `max_item_chars = 2000` (via `CompactionPolicy.maxItemChars`)

### Formatting (recommended, deterministic)

```
[MEMORY:EPISODIC]
1) ...
2) ...

[MEMORY:SEMANTIC]
- ...
- ...

[RAW_FRONTIER]
[BLOCK block_0002] turn=turn_0012 kind=tool_continuation
(turn_0012:5) TOOL_CONTINUATION: Tool continuation
(turn_0012:6) ASSISTANT: ...
(turn_0012:7) TOOL_CALL: write_file {"path":"notes.md"}
```

### Token Budget

- Compaction is triggered by provider-reported `prompt_tokens` **after** a response.
- When compaction is requested, the next request rebuilds the snapshot before calling the LLM.
- The compacted portion is chosen by the planner/frontier rules, not by a fixed
  raw-tail-turn count.

## 20. Turn ID Assignment

Turns are created when a processed non-tool user message is ready.

**Where to generate**

- Create a `TurnTracker` (or store on `MemoryManager`)
- Persist current `turn_id` in `AgentRuntimeState` for tool linking

**Strategy**

- `turn_id = turn_<counter:04d>` per agent
- Increment when `LLMUserMessageReadyEvent` fires
- TOOL-origin continuation input keeps the current `turn_id`; it does not create
  a new turn and instead writes a `tool_continuation` boundary trace for
  compaction planning

**Linking tool events**

- Tool call intents and tool results inherit the **turn_id** stored on the
  `ToolInvocation`.
- Even if tool results arrive after the next user message, they keep the
  original `turn_id`.

## 21. Persistence Schemas (EPISODIC / SEMANTIC / MANIFEST)

### EPISODIC (episodic.jsonl)

```
{
  "id": "ep_0001",
  "ts": 1738100500.0,
  "turn_ids": ["turn_0001","turn_0002"],
  "summary": "...",
  "tags": ["project", "decision"],
  "salience": 0.7
}
```

### SEMANTIC (semantic.jsonl)

```
{
  "id": "sem_0001",
  "ts": 1738100501.0,
  "category": "user_preference",
  "fact": "Use vitest with pnpm exec vitest --run.",
  "tags": ["preference","testing"],
  "salience": 300
}
```

### COMPACTED MEMORY MANIFEST (compacted_memory_manifest.json)

```
{
  "schema_version": 2,
  "last_reset_ts": 1738100501123
}
```

---

## 22. Design Decisions (Locked Defaults)

These decisions are required to keep data flow consistent and avoid ambiguity:

1. **Turn ID propagation**  
   - `turn_id` is assigned at `LLMUserMessageReadyEvent`.  
   - It is stored on `ToolInvocation` metadata and propagated to `ToolResultEvent`.

2. **Assistant response ingestion point**  
   - Ingest assistant output directly in `LLMUserMessageReadyEventHandler`.  
   - Do not rely on optional LLM response processors.

3. **Raw trace pruning strategy**  
   - Use atomic file rewrite (write new JSONL → replace old file).  
   - Avoid tombstones in the active raw file.

4. **Token budget source**  
   - Add `max_context_tokens` to `LLMModel` metadata.  
   - Use provider-reported `prompt_tokens` (post-response) to trigger compaction.
