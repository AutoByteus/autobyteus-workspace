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

- **ingest(event)**: store trace as `RAW_TRACE` and append the same
  LLM-facing event to the Working Context Snapshot.
- **compact working context**: select budget-eligible settled message units from
  the Working Context Snapshot, summarize those units into EPISODIC + SEMANTIC
  memory, and archive only the raw traces referenced by the compacted units.
- **retrieve(max_episodic, max_semantic)**: return a MemoryBundle for snapshot
  rebuilding.
- **rebuild working context snapshot**: produce a natural message list from the
  system prompt, compacted-memory message, and retained recent/protected
  working-context messages. Runtime compaction does not render raw trace text
  back into the LLM prompt.
- **resetWorkingContextSnapshot(snapshot)**: reset Working Context Snapshot to
  the rebuilt baseline.

---

## 6. Data Model

**RAW_TRACE (RawTraceItem)**

- `id`, `ts`, `turn_id`, `seq`, `trace_type`, `content`, `source_event`
- Optional: `media`, `tool_name`, `tool_call_id`, `tool_args`, `tool_result`, `tool_error`,
  `correlation_id`

**EPISODIC (EpisodicItem)**

- `id`, `ts`, `turn_ids`, `summary`, `salience`
**SEMANTIC (SemanticItem)**

- `id`, `ts`, `category`, `fact`, `salience`
- Agent-based compactor output is facts-only and does not ask the model to generate free-form metadata.
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
raw-trace rotation helpers plus compacted-memory manifest helpers
(`readCompactedMemoryManifest`, `writeCompactedMemoryManifest`) used by
compaction and startup/restore schema-gate reset behavior.

`RunMemoryFileStore` is the shared low-level direct-run-directory facade. It owns
canonical active file paths, raw-trace appends, complete-corpus reads (complete
rotated segments plus active records), semantic replacement, manifest IO, native
compaction prune/archive entrypoints, provider-boundary rotation entrypoints, and
working-context snapshot serialization without requiring callers to instantiate
`MemoryManager`. Native `FileMemoryStore` delegates its common file operations to
this facade, and `autobyteus-server-ts` uses the same facade for storage-only
Codex/Claude run and team-member memory recording.

`RawTraceArchiveManager` is the only owner of raw-trace rotation internals:
`raw_traces_manifest.json`, immutable direct run-directory segment files named
`raw_traces_<zero-padded-index>.jsonl` (for example
`raw_traces_000001.jsonl`), pending/complete segment state, and idempotent
same-boundary retry behavior. Boundary identity stays in the manifest
`boundary_key`; readers prefer the new manifest and open manifest `file_name`
values verbatim. The prior `raw_traces_archive_manifest.json` plus
`raw_traces_archive/` layout is data-read/migration fallback only when no new
manifest exists, and startup migration `20260617_raw_trace_rotation_layout`
converts old complete entries to the direct layout before decommissioning old
authoritative files. The old monolithic `raw_traces_archive.jsonl` file is
intentionally not a current compatibility read/write target.

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
      raw_traces_manifest.json          # rotated raw-trace manifest
      raw_traces_000001.jsonl           # immutable complete/pending rotated segment files
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
- **Tool call intent:** parsed assistant tool calls inside `LlmPhase`
- `CompleteResponse` ingestion for normal assistant responses
- `ToolResultEvent` batches accepted by `ToolResultContinuationBuilder`

### Consolidation / Extraction
- When provider-reported post-response prompt usage crosses the compaction
  threshold.
- For a no-tool assistant response, `LlmPhase` appends the assistant message,
  requests compaction, and executes compaction immediately in the same LLM
  lifecycle.
- For a tool-call response, `LlmPhase` appends the assistant tool-call message
  and records a pending compaction request; tool execution and tool-result
  ingestion happen first, then the next same-turn tool continuation request runs
  compaction before provider dispatch.

### Retrieval (every LLM call)
Before sending a user or tool-continuation request to the LLM,
`LLMRequestAssembler` ensures the system prompt is present, executes any pending
compaction, and renders the current **Working Context Snapshot** through the
provider prompt renderer.

---

## 9. Prompt Assembly (Working Context Snapshot + Compaction Snapshot)

The memory layer maintains a **Working Context Snapshot**: a generic, append-only
message list that grows between compaction boundaries. This is what the LLM
receives on each call.

When compaction runs, memory compacts selected settled working-context message
units and **resets** the Working Context Snapshot to a rebuilt natural baseline.

### Working Context Snapshot (per-epoch)
The working context snapshot is a list of generic messages that includes:

1. System prompt (bootstrapped by memory)
2. Prior user / assistant messages retained since the last compaction
3. Structured tool call intents and tool results
4. Current user input, or same-turn tool continuation history

### Compaction Snapshot (handoff baseline)
The snapshot is a compact replacement for the working context snapshot base:

1. System prompt (existing system message, or the current system prompt)
2. One natural compacted-memory message built from retrieved EPISODIC + SEMANTIC
   memory when that bundle is non-empty
3. Retained recent/protected working-context messages selected by the
   message-window planner

After compaction, new turns append to this rebuilt message list. The preserved
suffix is based on working-context message units and token budget, not a fixed
number of turns and not raw trace rendering. A trailing tool protocol group is
protected so native provider tool-call/result continuity remains intact.

### Prompt Renderer (provider adaptation)
LLMs consume provider-specific payloads, so the generic working context snapshot
is rendered by a **Prompt Renderer** per provider (OpenAI, Anthropic, etc.). This
keeps the memory layer canonical and makes LLMs stateless executors.

**Note:** system prompts are configured on the LLM instance during bootstrap.
Memory now also ensures the system prompt exists in the working context snapshot
so the provider call remains stateless.

---

## 10. Compaction and Token Budget

Compaction is triggered by **token pressure** using **exact post-response usage**.
The runtime does not interrupt an in-flight stream to compact mid-response.

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

- `LlmPhase` evaluates provider-reported `prompt_tokens` after every completed
  response and calls `MemoryManager.requestCompaction(activeTurnId)` when the
  threshold is crossed.
- If the response does **not** emit tool calls, `LlmPhase` executes
  `PendingCompactionExecutor.executeIfRequired(...)` immediately after the
  assistant response is appended to memory.
- If the response emits tool calls, compaction remains pending until accepted
  tool results are ingested. `LLMRequestAssembler.prepareToolContinuationRequest(...)`
  then executes pending compaction before rendering the same-turn continuation.
- Normal user requests still execute any leftover pending compaction before
  appending the next user message.

Compaction policy:

- Plan over ordered Working Context Snapshot messages, not ordered raw traces.
- Build message units for system, compacted-memory, normal natural messages, and
  tool protocol groups.
- Compact only budget-eligible settled units; retain a recent natural suffix and
  always protect the trailing tool protocol group when present.
- Archive raw traces only through provenance carried on compacted messages; raw
  traces remain the audit/store substrate, not the LLM-facing compaction source.
- Rebuild the snapshot through `WorkingContextSnapshotRebuilder` so the next LLM
  request contains natural compacted memory plus retained messages.

---

## 10.1 Production Compaction Pipeline

Compaction is the **first priority** of the memory system because it keeps the
Working Context Snapshot bounded and useful.

### Compaction Outputs

Compaction produces **structured memory artifacts** and a new working context snapshot base:

1. **EPISODIC summary** of eligible settled working-context message units
2. **Typed SEMANTIC entries** extracted into critical issues, unresolved work,
   user preferences, durable facts, and important artifacts
3. **Retained working-context suffix** that stays as provider-renderable
   structured messages
4. **Eligible RAW_TRACE entries archived by provenance-derived trace ID**
5. **Rebuilt Working Context Snapshot** (new base for future provider payloads)

### Compaction Flow (Agent-driven)

1. Default server-backed `AgentFactory` runtime composition injects a
   `CompactionAgentRunner`; `AgentCompactionSummarizer` delegates selected
   settled working-context units to the configured visible compactor agent.
2. `PendingCompactionExecutor` runs whenever `memoryManager.compactionRequired`
   is set and the current lifecycle point is allowed to compact (immediate
   no-tool post-response, pre-tool-continuation dispatch, or pre-next-user
   dispatch).
3. `WorkingContextMessageWindowPlanner` reads `memoryManager.getWorkingContextMessages()`
   and builds message units:
   - system units are carried as head messages;
   - prior compacted-memory units are not summarized again;
   - normal natural messages are budgeted as compactable/retained candidates;
   - a trailing tool protocol group is protected as the live provider suffix.
4. `MessageBudgetStrategy` calculates recent-suffix and compaction target budgets
   from the effective input budget. The planner retains a recent natural suffix
   and selects an older compactable prefix.
5. `WorkingContextCompactor.compactWorkingContext(...)` asks the summarizer to
   summarize selected message units. `AgentCompactionSummarizer` renders a
   natural context-refresh task with `[CONVERSATION_HISTORY_TO_SUMMARIZE]`,
   preserving useful conversation facts while omitting low-level bookkeeping.
6. Resolve the configured compactor agent from
   `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; server startup syncs/overwrites
   the product-managed `autobyteus-memory-compactor` built-in from the bundled
   template and selects it when the setting is blank. Blank or invalid selected
   runtime/model fields inherit from the triggering parent run's effective
   runtime/model; compaction fails if the selected definition is missing or a
   required runtime/model field is absent from both sources.
7. Create a normal visible compactor agent run, post one compaction task, collect
   the final JSON-only assistant output, terminate the run, and leave the run in
   history for inspection. The required result shape remains:
   - `episodic_summary`
   - `critical_issues[]`
   - `unresolved_work[]`
   - `durable_facts[]`
   - `user_preferences[]`
   - `important_artifacts[]`
   Semantic array entries are facts-only objects: `{ "fact": "..." }`.
8. Parse and validate the structured response, then run deterministic
   normalization (dedupe, low-value filtering, category caps, fact cleanup, and
   salience assignment) before persisting EPISODIC + SEMANTIC items.
9. `MemoryStore.pruneRawTracesById(plan.rawTraceIdsToArchive, true)` archives
   only the raw traces referenced by compacted message provenance.
10. `WorkingContextSnapshotRebuilder` rebuilds the snapshot from:
    - system prompt / existing system head messages;
    - retrieved episodic/semantic bundle rendered as one natural compacted-memory
      message when available;
    - retained non-system working-context messages.
11. Reset the working-context snapshot to that baseline, clear the
    pending-compaction flag, and emit completed status. Failures stop before the
    next applicable LLM dispatch and leave targeted raw traces intact.

### Planner / Store Rules

- `WorkingContextMessageUnit` kinds are `system`, `compacted_memory`, `normal`,
  and `tool_protocol_group`.
- Tool-call assistant messages and matching tool-result messages stay together as
  a protocol group and are protected when they form the live suffix.
- The retained suffix is budget/minimum based rather than a fixed raw-tail size.
- Raw-trace prune/archive ownership lives in the `MemoryStore` boundary, not in
  `MemoryManager` or higher runtime handlers.
- The older `CompactionWindowPlanner` and `Compactor.compact(plan)` APIs remain
  exported for legacy raw-trace block tests/compatibility, but the live runtime
  compaction path uses `WorkingContextMessageWindowPlanner` and
  `compactWorkingContext(...)`.

### Runtime Settings Surface

| Setting | Purpose | Default / Behavior |
| --- | --- | --- |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Overrides the post-response trigger ratio used for subsequent budget checks. | Defaults to `0.8`; parsed as a positive decimal and clamped to `<= 1`. |
| `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | Selects the memory compactor agent definition. The selected agent's normal default launch config can explicitly override runtime/model and provide model config. | Server startup syncs/overwrites the built-in `autobyteus-memory-compactor` from the bundled template and selects it when blank. Blank or invalid runtime/model fields on the selected/default agent inherit from the running parent agent; required compaction fails clearly only when no selected definition exists or a required field is absent from both sources. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Lowers the effective context ceiling for safer budgeting (for example when a provider fails before its advertised maximum). | Blank disables the override; positive values are floored to an integer token ceiling. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Enables verbose compaction diagnostics. | Disabled by default; truthy values such as `1`, `true`, `yes`, `on` enable detailed logs. |

### Compactor Prompt Ownership

The selected compactor agent's `agent.md` owns stable behavior: category meanings, preservation/drop rules, JSON-only discipline, and manual-test guidance. The synced `autobyteus-memory-compactor` is intentionally written so a user can run it as a normal visible agent, paste conversation/history content, and inspect the compaction behavior.

Automated compaction still includes the current exact required final JSON shape in every task envelope under `[REQUIRED_FINAL_JSON_SHAPE]` before `[CONVERSATION_HISTORY_TO_SUMMARIZE]`. That shape is owned by memory compaction/parser code, not solely by editable agent instructions, so custom selected compactor agents cannot silently become the only parser-compatibility source. The compactor-facing semantic entries are facts-only: the model returns `fact` objects inside the typed category arrays and does not generate free-form metadata. App-data edits to the product-managed `autobyteus-memory-compactor` id are overwritten by built-in-agent startup sync; operators who want custom compactor behavior should select a separate user/package-managed agent definition through `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.

### Snapshot Cache / Schema-4 Bootstrap

- `WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION` is `4`.
- `COMPACTED_MEMORY_SCHEMA_VERSION` remains the current persisted semantic-memory
  + manifest schema version.
- `WorkingContextSnapshotBootstrapper` runs
  `CompactedMemorySchemaGate.ensureCurrentSchema(...)` before any snapshot
  validation or restore attempt.
- If persisted semantic records fail current-schema validation, the schema gate
  clears stale `semantic.jsonl`, writes reset metadata, invalidates the cached
  working-context snapshot, and forces bootstrap to rebuild from canonical
  sources or start clean.
- If semantic memory is already current-schema but the manifest is missing or
  stale, the gate backfills the current manifest without forcing a reset.
- Direct snapshot restore now happens only when the schema gate did not reset
  and the cached payload validates against schema `4`.
- Missing or stale payloads rebuild through `WorkingContextRecoveryProjector`
  plus `WorkingContextSnapshotRebuilder`: the projector turns the latest raw
  traces into natural recovery messages and the rebuilder prepends system prompt
  plus compacted memory. Bootstrap must not recreate raw frontier prompt text or
  preserve stale renderer-specific labels from old snapshots.

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
processed traces as `RAW_TRACE` and simultaneously appends canonical messages to
the Working Context Snapshot. Raw traces are the durable audit/provenance corpus;
the Working Context Snapshot is the provider-facing source used for prompt
rendering and compaction planning.

**Primary capture points**

- `LLMUserMessageReadyEvent` (processed user input)
- Assistant tool-call payloads parsed by `LlmPhase`
- Accepted `ToolResultEvent` batches from `ToolResultContinuationBuilder`
- Final assistant `CompleteResponse` values from `LlmPhase`

**Preferred mechanism**

Use **processors** where possible to ingest traces and keep handlers clean:

- Input processor (runs last): capture processed user input
- Tool result processor: capture tool outcomes when a non-native path supplies
  processed tool events

Assistant responses and native tool-call payloads are ingested by `LlmPhase` so
structured provider tool payloads remain paired with their Working Context
Snapshot messages.

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
- `correlation_id`

**Example: user trace**

```
{"id":"rt_001","ts":1738100000.12,"turn_id":"turn_0001","seq":1,"trace_type":"user","content":"Please refactor the parser.","source_event":"LLMUserMessageReadyEvent","media":{"images":[],"audio":[],"video":[]}}
```

**Example: tool continuation boundary**

```
{"id":"rt_005_tool_continuation","ts":1738100004.10,"turn_id":"turn_0001","seq":5,"trace_type":"tool_continuation","content":"Native API tool continuation","source_event":"ToolContinuationReadyEvent"}
```

Legacy text-parser continuations may use `source_event: "ToolContinuationInput"` for the same trace type.

**Example: tool result**

```
{"id":"rt_003","ts":1738100003.11,"turn_id":"turn_0001","seq":3,"trace_type":"tool_result","content":"","source_event":"ToolResultEvent","tool_name":"list_directory","tool_call_id":"call_1","tool_result":["app.ts","parser.ts"]}
```

**Example: assistant response**

```
{"id":"rt_004","ts":1738100005.90,"turn_id":"turn_0001","seq":4,"trace_type":"assistant","content":"I will refactor the parser next.","source_event":"LLMCompleteResponseReceivedEvent"}
```

---

### Turn / Boundary Aggregation (Compaction Unit)

Raw traces remain line-by-line audit records. Runtime compaction plans over
**Working Context Snapshot message units** instead:

**Turn definition**

- One processed non-tool user message still creates one `turn_id`.
- `turn_id` is generated when `AgentRuntimeState.startActiveTurn()` calls
  `MemoryManager.startTurn()` at outer turn start.
- Tool call intents and tool results inherit the active `turn_id`, even if the
  result arrives later.
- Tool continuation does **not** mint a new turn; it reuses the active `turn_id`.
  Native `api_tool_call` mode keeps the provider continuation as tool history;
  legacy text-parser modes may represent the continuation as TOOL-origin input.

**Working-context unit rules**

- System messages form head units and are never summarized.
- Existing compacted-memory messages are not summarized again.
- Natural user/assistant messages form normal candidate units.
- Assistant tool-call messages and their result messages form protocol groups;
  a trailing protocol group is protected so provider-native continuation remains
  valid.

**Compaction behavior**

- Compaction consumes eligible settled message units, **not** whole turns.
- The same `turn_id` can therefore include compacted older messages and retained
  current tool protocol messages.
- Bootstrap fallback from invalid/missing snapshots projects recent raw traces
  into natural recovery messages; it does not rebuild raw trace text as prompt
  sections.

---

### Accumulation-to-Compaction Flow (Diagram)

```
UserMessageReceivedEvent
   │
   ▼
AgentTurnRunner / AgentInputPipeline
   │   (input processors run here)
   └─► MemoryIngestInputProcessor (order 900)
   │      └─► MemoryManager.ingestUserMessage(...)
   ▼
LLMUserMessageReadyEvent
   ▼
AgentTurnRunner / LlmPhase
   ├─► LLMRequestAssembler.prepareRequest(...)
   │      └─► PendingCompactionExecutor.executeIfRequired(...) if already pending
   │            ├─► WorkingContextMessageWindowPlanner.plan(...)
   │            ├─► WorkingContextCompactor.compactWorkingContext(...)
   │            ├─► MemoryStore.pruneRawTracesById(...)
   │            └─► WorkingContextSnapshotRebuilder.rebuild(...)
   ├─► LLM.streamMessages(Working Context Snapshot)
   ├─► MemoryManager.ingestAssistantToolResponse(...) or ingestAssistantResponse(...)
   ├─► evaluateLlmPhaseCompaction(...)
   └─► if no tool calls and compactionRequired:
          PendingCompactionExecutor.executeIfRequired(...) immediately

Native api_tool_call tool-result continuation:
ToolPhase / AgentRuntimeState ─► validate active batch/invocation/turn
   └─► ToolResultContinuationBuilder.ingestToolResults(...)
   └─► ToolContinuationReadyEvent ─► AgentTurnRunner / LlmPhase
         └─► LLMRequestAssembler.prepareToolContinuationRequest(...)
               └─► PendingCompactionExecutor.executeIfRequired(...) before dispatch

MemoryManager
   ├─► RAW_TRACE accumulation (+ provenance for archiving)
   ├─► Working Context Snapshot persistence (schema 4)
   └─► pending-compaction request / snapshot reset
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
│   ├── working-context-recovery-projector.ts
│   └── working-context-snapshot-bootstrapper.ts
├── compaction/
│   ├── agent-compaction-summarizer.ts
│   ├── compaction-agent-runner.ts
│   ├── compacted-memory-message-builder.ts
│   ├── compaction-plan.ts               # legacy raw-trace planner API shape
│   ├── compaction-response-parser.ts
│   ├── compaction-result.ts
│   ├── compaction-result-normalizer.ts
│   ├── compaction-runtime-settings.ts
│   ├── compaction-task-prompt-builder.ts # legacy block prompt contract
│   ├── compaction-window-planner.ts      # legacy raw-trace block planner
│   ├── compactor.ts                      # bridges legacy compact(...) and working-context compaction
│   ├── interaction-block.ts
│   ├── interaction-block-builder.ts
│   ├── message-budget-strategy.ts
│   ├── pending-compaction-executor.ts
│   ├── summarizer.ts
│   ├── tool-result-digest.ts
│   ├── tool-result-digest-builder.ts
│   ├── working-context-compaction-prompt-builder.ts
│   ├── working-context-compactor.ts
│   ├── working-context-message-unit.ts
│   ├── working-context-message-unit-builder.ts
│   ├── working-context-message-window-planner.ts
│   └── working-context-snapshot-rebuilder.ts
├── compaction-snapshot-builder.ts       # natural compacted-memory baseline for compatibility/bootstrap use
├── compaction-snapshot-recent-turn-formatter.ts
├── message-provenance.ts
├── raw-trace-ingestion.ts
├── tool-interaction-builder.ts
├── turn-tracker.ts
├── working-context-snapshot.ts
├── working-context-snapshot-serializer.ts
└── memory-manager.ts

src/agent/
├── llm-request-assembler.ts             # memory + renderer + pending-compaction orchestration
├── loop/llm-phase.ts                    # post-response compaction timing
├── loop/tool-result-continuation-builder.ts
└── input-processor/memory-ingest-input-processor.ts
```

### Responsibility Map

- **MemoryManager**: receives events, persists user/tool/assistant traces,
  appends canonical working-context messages, records provenance metadata, and
  owns working-context snapshot reset/persistence.
- **LlmPhase**: evaluates post-response token usage, requests compaction, runs
  immediate no-tool compaction, and defers tool-call compaction until tool
  results are ingested.
- **LLMRequestAssembler**: ensures system prompt presence, runs pending
  compaction before provider dispatch, appends normal user input only for normal
  user requests, and renders provider payloads.
- **PendingCompactionExecutor**: runs the working-context compaction sequence,
  resolves runtime settings/model selection, reports lifecycle status, and
  converts failures into a clean pre-dispatch error boundary.
- **WorkingContextMessageWindowPlanner**: groups provider-facing messages into
  units, protects live tool protocol suffixes, chooses a budgeted retained
  suffix, and selects compactable older units.
- **WorkingContextCompactor / Compactor**: asks the summarizer for episodic /
  typed-semantic output from message units, persists normalized memory, and
  delegates raw-trace prune/archive to the store using provenance.
- **CompactionResultNormalizer**: owns typed semantic-entry cleanup, dedupe,
  low-value filtering, per-category caps, and deterministic salience assignment
  before persistence.
- **MemoryStore / FileMemoryStore**: own raw-trace append order,
  prune/archive-by-trace-id semantics, semantic reset helpers, and
  compacted-memory manifest reads/writes.
- **CompactedMemorySchemaGate**: owns current-schema enforcement, destructive
  reset-on-mismatch behavior for persisted semantic memory, reset metadata
  writes, and cached-snapshot invalidation triggers.
- **WorkingContextSnapshotBootstrapper / Serializer**: own gate-first startup
  restore decisions, schema-4 cache validation, and natural recovery rebuild
  fallback.
- **WorkingContextRecoveryProjector**: projects recent raw traces into natural
  recovery messages only when no valid working-context snapshot exists.
- **WorkingContextSnapshotRebuilder / CompactedMemoryMessageBuilder**: rebuild
  the compacted-memory baseline and retained message suffix for provider
  rendering.
- **CompactionPolicy**: defines trigger ratio, safety margin, and rendered line
  limits (`maxItemChars`) rather than a fixed raw-tail size.
- **ToolInteractionBuilder**: derives human-friendly tool interaction views from
  stored raw traces.

## 11. Integration Points (Autobyteus)

**Implemented integration shape**

- Server startup runs the unified `BuiltInAgentBootstrapper` before normal
  agent-run use: it syncs/overwrites registry-defined internal built-in agent
  files from bundled templates, leaves non-built-in local agents and package
  roots untouched, refreshes the agent-definition cache, and selects
  `autobyteus-memory-compactor` only when `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`
  is blank and the definition resolves.
- Agent runtime composition creates `MemoryManager` with an optional
  `CompactionAgentRunner` supplied by server-backed `AgentFactory` wiring.
- Ingest processors and `LlmPhase` append canonical provider-facing messages to
  the Working Context Snapshot.
- `LlmPhase` owns post-response compaction timing: immediate after no-tool
  threshold crossings, deferred until same-turn tool continuation after
  tool-call threshold crossings.
- `LLMRequestAssembler` runs pending compaction before provider dispatch and
  renders the current Working Context Snapshot.
- Tool results and messages flow into memory ingest; compaction summarization
  delegates through the selected visible compactor agent instead of a direct
  model call.

**Migration path**

1. **Hybrid epoch mode**: append to LLM history until compaction, then reset
   from Compaction Snapshot. (Historical only.)
2. **Memory-centric mode**: LLM history becomes stateless; memory owns working context snapshot.
3. **Full core mode**: all history and context sourced from memory store.

---

## 12. Open Questions

- Should memory be per-agent only, or allow shared/team scope?
- How should future semantic categories evolve if the typed compaction schema expands beyond the current five buckets?

---

## 13. Memory-Centric Architecture (LLM as a Service)

In memory-centric mode, the LLM does **not** own history. Memory is the source
of truth and the LLM is invoked with a **Working Context Snapshot** built from
memory state and reset by working-context compaction when needed.

```
User/Event
   │
   ▼
MemoryManager (ingest + provenance)
   │
   ├─► Working Context Snapshot (append or reset)
   │      └─► WorkingContextMessageWindowPlanner (if compaction required)
   │             └─► AgentCompactionSummarizer / visible compactor-agent run
   │                    └─► WorkingContextSnapshotRebuilder
   │
   └─► Prompt Renderer (provider payload)
           │
           ▼
        LLM Invoke
           │
           ▼
LlmPhase evaluates usage and MemoryManager ingests response/tool payloads
```

Key idea: **the LLM is a stateless generator**, and memory constructs the
prompt each call. Compaction summarization follows the same boundary: memory
asks the configured visible compactor agent to produce structured JSON instead
of selecting a hidden/direct compaction model itself.

---

## 14. Trigger Implementation (Compaction)

Compaction is triggered **after an LLM response** based on **exact usage**. The
execution point depends on whether the response emitted tools.

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

- **LlmPhase** (post-response):
  1. Receives `TokenUsage` from the provider (exact prompt tokens)
  2. Evaluates the compaction policy
  3. Calls `MemoryManager.requestCompaction(activeTurnId)` and emits a
     `requested` lifecycle status when the threshold is crossed
  4. Executes compaction immediately when there are no tool calls
  5. Leaves compaction pending when tool calls exist so tool results can be
     ingested before the next continuation prompt is built

- **LLMRequestAssembler.prepareRequest(...) / prepareToolContinuationRequest(...)**:
  1. Ensures the system prompt is present in memory
  2. Runs `PendingCompactionExecutor.executeIfRequired(...)` when a pending
     request exists
  3. Appends the new user message only for normal user requests
  4. Renders provider payload from the Working Context Snapshot

This keeps compaction centralized **without token estimation** and avoids
provider-specific counting logic in the request path.

---

## 15. Refactor Fit: Current Autobyteus Event Flow

### 15.1 Where LLM is triggered today

- `UserMessageReceivedEvent`
  - `AgentTurnRunner / AgentInputPipeline` creates `LLMUserMessageReadyEvent`
- `LlmPhase` calls:
- `context.state.llmInstance.streamMessages(...)` with assembled messages

Legacy `conversation_history` has been removed. LLM providers are stateless.

### 15.2 Minimal integration (legacy path — removed)

Earlier plans kept `BaseLLM.messages` between compactions for cache reuse.
This path has been removed in favor of fully stateless LLM execution.

### 15.3 Memory-centric integration (implemented)

The LLM call site delegates prompt construction to memory:

```
UserMessageReceivedEvent
  └─► AgentTurnRunner / AgentInputPipeline
        └─► LLMUserMessageReadyEvent (processed input)
              └─► MemoryManager.ingestUserMessage(...)
                    └─► AgentTurnRunner / LlmPhase
                          ├─► LLMRequestAssembler.prepareRequest(processedUser)
                          ├─► LLM.streamMessages(messages, renderedPayload, ...)
                          ├─► MemoryManager.ingestAssistantToolResponse(...)
                          │     or MemoryManager.ingestAssistantResponse(...)
                          └─► evaluateLlmPhaseCompaction(...)
```

Key changes:

- `AgentRuntimeState` owns a `MemoryManager`.
- Ingest **processed** user input, assistant tool payloads, tool results, and
  assistant responses into both raw trace storage and Working Context Snapshot.
- Build or reset Working Context Snapshot before every LLM call via
  `LLMRequestAssembler` and `PendingCompactionExecutor`.
- Trigger compaction from post-response token usage; no-tool threshold crossings
  compact immediately, while tool-call threshold crossings compact before the
  same-turn tool continuation.
- Keep LLM stateless (no internal history ownership).

### 15.4 Refactor targets (files)

Primary touch points:

- `src/agent/loop/llm-phase.ts`
- `src/agent/llm-request-assembler.ts`
- `src/agent/loop/tool-result-continuation-builder.ts`
- `src/agent/input-processor/memory-ingest-input-processor.ts`
- `src/agent/context/agent-runtime-state.ts`
- `src/memory/memory-manager.ts`
- `src/memory/compaction/*`
- `src/memory/restore/*`

### 15.5 LLM API adjustment (implemented)

LLM providers now accept explicit message lists via:

- `streamMessages(messages: Message[], renderedPayload?: unknown, kwargs?: Record<string, unknown>)`

This keeps memory as the single source of truth and removes hidden prompt
mutation.

### 15.6 Token-budget compaction defaults

Use model registry defaults and per-agent config overrides to decide **when**
the parent run should compact based on context budget behavior. These settings
do not choose the compaction summarization model. The selected compactor
agent's default launch config can explicitly override runtime/model and provide
model config through `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; blank
runtime/model fields inherit from the running parent agent.

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
  - `streamMessages(messages: Message[], renderedPayload?: unknown, kwargs?: Record<string, unknown>)`
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
  content: 'I will inspect the workspace.',
  // Optional provider-returned assistant reasoning. Kept internal until the
  // selected provider renderer decides whether it is valid on the wire.
  reasoning_content: 'Need the current directory before answering.',
  tool_payload: new ToolCallPayload([
    { id: 'call_abc123', name: 'list_directory', arguments: { path: 'src' } }
  ])
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
  reasoning_content?: string | null;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];
  tool_payload: ToolPayload | null;
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

- Assistant tool-call continuation:
  - when `nativeToolCallContext.responseOutputItems` is present, the
    `OpenAIResponsesRenderer` replays the captured `response.output` sequence
    exactly once so provider-required `reasoning` items stay before their
    matching `function_call` items;
  - replay preserves provider item metadata such as `id`, `status`, `summary`,
    and `reasoning.encrypted_content`, while the final normalized
    `ToolCallSpec` remains authoritative for the function-call `call_id`,
    `name`, and `arguments`;
  - when no captured OpenAI Responses output sequence exists, the renderer falls
    back to rendering normalized `function_call` items.
- Tool result:
  - `{"type": "function_call_output", "call_id": ..., "output": ...}`

**Other native provider APIs**

- Gemini: model `functionCall` parts and user `functionResponse` parts.
- Anthropic: assistant `tool_use` blocks and immediately-following user
  `tool_result` blocks.
- Mistral: assistant `tool_calls` and `role: "tool"` result messages with
  `tool_call_id`, `name`, and string `content`.
- Ollama: assistant `tool_calls` and `role: "tool"` result messages with
  `tool_name`.

Native renderers sort result replay by the prior assistant `ToolCallSpec[]`
order, not by completion order. Providers that require a single result turn for
a batch, such as Gemini and Anthropic, coalesce adjacent matching
`ToolResultPayload`s into one provider-valid user result turn. Legacy
`[TOOL_CALL]` / `[TOOL_RESULT]` text rendering is isolated to non-native
`xml`, `json`, and `sentinel` tool-call formats.

`reasoning_content` is preserved provider-neutrally in working context for both
normal assistant messages and assistant `ToolCallPayload` messages. Renderer
selection decides whether it is provider-visible: generic `OpenAIChatRenderer`
omits it, while `DeepSeekChatRenderer` replays it on assistant messages for
DeepSeek thinking-mode continuation. OpenAI Responses reasoning replay is
provider-native instead: it comes from captured `response.output` reasoning items
on `ToolCallSpec.nativeToolCallContext`, not from the generic
`Message.reasoning_content` field.

---

### Phase B — Prompt Renderers

**Goal:** Provider payload formatting is separated from LLM execution.

- Add `src/llm/prompt-renderers/base-prompt-renderer.ts`
- Add provider renderers:
  - `openai-responses-renderer.ts`
  - `openai-chat-renderer.ts`
  - `anthropic-prompt-renderer.ts`
  - `gemini-prompt-renderer.ts`
  - `mistral-prompt-renderer.ts`
  - `ollama-prompt-renderer.ts`
  - explicit `*-text-tool-history-renderer.ts` variants for non-native parser modes.
- LLM implementations call renderer to produce API payloads.
  - `tools` schema remains a kwarg passed into the LLM call.
  - `provider-tool-history-renderer-selection.ts` chooses native renderers only
    for `api_tool_call`; non-native parser modes keep text history.
  - Streaming converters may preserve provider-native metadata on
    `ToolCallSpec.nativeToolCallContext`, but normalized id/name/arguments remain
    authoritative when renderers replay history. For OpenAI Responses, the
    captured completed `response.output` item sequence is the authoritative
    provider order for prior reasoning/function-call replay; renderers normalize
    only the matching function-call identity, name, and final arguments.

**Tests**

- Renderer tests: deterministic formatting + stable ordering.
- Round-trip tests: messages → payload contains expected fields.
- Provider API payload tests: final SDK request parameters contain native tool
  history and no legacy aggregate tool-result text.

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
- When tool execution returns control to the model, continuation reuses the
  active turn and persists a lightweight `tool_continuation` boundary trace
  before the next LLM leg. Native `api_tool_call` mode uses an internal
  `ToolContinuationReadyEvent` and renders existing structured tool messages;
  legacy text-parser modes use the aggregate `SenderType.TOOL` continuation
  input.

**Agent integration**

- `LlmPhase` calls
  `LLMRequestAssembler.prepareRequest(...)` or
  `LLMRequestAssembler.prepareToolContinuationRequest(...)`, which runs `PendingCompactionExecutor`
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
  metadata to the Working Context Snapshot, carrying accumulated assistant
  `content` and `reasoning_content` when the provider streamed them.
- Tool results are appended as `MessageRole.TOOL` messages.
- Tool continuation reuses the active turn and persists a lightweight
  `tool_continuation` boundary trace before the next LLM leg. Native
  `api_tool_call` continuation uses `ToolContinuationReadyEvent`; legacy text
  modes use TOOL-origin aggregate input.

---

## 16. Runtime Simulation (End-to-End Call Stack)

This section simulates **real call stacks** (debug-trace style) for common
flows to validate the new file structure and data flow.

### 16.1 Simple user → assistant (no tools)

**Scenario**
User asks a question; no tool calls are emitted.

**Call stack (debug-trace style)**

```
LlmPhase.run(...)
  at src/agent/loop/llm-phase.ts
  └─► LLMRequestAssembler.prepareRequest(...)
        at src/agent/llm-request-assembler.ts
        ├─► PendingCompactionExecutor.executeIfRequired(...)
        │     at src/memory/compaction/pending-compaction-executor.ts
        │     └─► (no compaction when flag is clear)
        ├─► append current user message to WorkingContextSnapshot
        │     at src/memory/memory-manager.ts
        ├─► WorkingContextSnapshot.buildMessages()
        │     at src/memory/working-context-snapshot.ts
        └─► PromptRenderer.render(...)
              at src/llm/prompt-renderers/*
  └─► LLM.streamMessages(messages, renderedPayload, ...)
        at src/llm/base.ts
        └─► Provider call
  └─► MemoryManager.ingestAssistantResponse(...)
        at src/memory/memory-manager.ts
        └─► WorkingContextSnapshot.appendAssistant(...)
  └─► evaluateLlmPhaseCompaction(...)
        at src/agent/loop/llm-phase-compaction.ts
        └─► if required and no tools: PendingCompactionExecutor.executeIfRequired(...)
```

**Gap check**
Requires stateless LLM API + prompt renderer.

---

### 16.2 User → tool call → tool result → assistant

**Scenario**
LLM emits one or more tool calls; tools run; results return; LLM continues.

**Call stack (debug-trace style)**

```
LlmPhase.run(...)
  at src/agent/loop/llm-phase.ts
  └─► LLMRequestAssembler.prepareRequest(...)
        at src/agent/llm-request-assembler.ts
  └─► LLM.streamMessages(messages, renderedPayload, tools)
        at src/llm/base.ts
        └─► Streaming parser detects tool call(s)
              at src/agent/streaming/*
              └─► MemoryManager.ingestAssistantToolResponse(...)
                    at src/memory/memory-manager.ts
                    └─► WorkingContextSnapshot.appendToolCalls(...)
              └─► evaluateLlmPhaseCompaction(...)
                    └─► request pending compaction when threshold is crossed
              └─► PendingToolInvocationEvent
                    at src/agent/events/agent-events.ts
                    └─► ToolPhase.executeInvocation(...)
                          at src/agent/loop/tool-phase.ts
                          └─► ToolResultEvent
                                └─► ToolResultContinuationBuilder.build(...)
                                      ├─► MemoryManager.ingestToolResults(...)
                                      │     └─► WorkingContextSnapshot.appendToolResult(...)
                                      └─► ToolContinuationReadyEvent
                                            └─► LLMRequestAssembler.prepareToolContinuationRequest(...)
                                                  └─► PendingCompactionExecutor.executeIfRequired(...)
```

**Gap check**
Requires structured tool messages + renderer support for tool roles.

---

### 16.3 Compaction boundary (token pressure)

**Scenario**
Previous LLM response reports prompt tokens above budget; compaction executes
immediately for a no-tool response or before the same-turn tool continuation for
a tool-call response.

**Call stack (debug-trace style)**

```
PendingCompactionExecutor.executeIfRequired(...)
  at src/memory/compaction/pending-compaction-executor.ts
  ├─► WorkingContextMessageWindowPlanner.plan(...)
  │     at src/memory/compaction/working-context-message-window-planner.ts
  │     ├─► WorkingContextMessageUnitBuilder.build(...)
  │     ├─► MessageBudgetStrategy.calculate(...)
  │     └─► select compactable units + retained/protected suffix
  ├─► Compactor.compactWorkingContext(plan)
  │     at src/memory/compaction/working-context-compactor.ts
  │     └─► Summarizer.summarizeMessageUnits(plan.compactableUnits)
  │           at src/memory/compaction/summarizer.ts
  ├─► MemoryStore.pruneRawTracesById(plan.rawTraceIdsToArchive, true)
  ├─► WorkingContextSnapshotRebuilder.rebuild(...)
  │     at src/memory/compaction/working-context-snapshot-rebuilder.ts
  └─► MemoryManager.resetWorkingContextSnapshot(snapshotMessages)
        at src/memory/memory-manager.ts
```

**Gap check**
Requires deterministic message-unit planning + model token budget fields.

---

### 16.4 Validation Method (recommended)

Use this “debug-trace simulation” as a review checklist:

- Each step has an explicit owner (file + class).
- No hidden mutation of LLM history.
- Tool calls/results are structured messages.
- Compaction resets working context snapshot and changes the next prompt.
- Raw traces are archived by provenance only; they are not rendered as the live
  compaction suffix.

**Tests**

- Extension hook coverage for new signatures
- Token usage tracking with explicit messages

---

### Phase E — Token Budget & Parent Model Defaults

**Goal:** Use parent-run model-level token budgets for compaction thresholds
without reintroducing direct-model compaction summarization.

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
  - Appends provider-facing working-context messages with memory provenance
  - Owns direct working-context snapshot append/reset authority

- `src/agent/llm-request-assembler.ts`
  - Ensures the system prompt is present
  - Runs `PendingCompactionExecutor` before normal user or tool-continuation
    provider dispatch when compaction is pending
  - Appends the new user message for normal user input only
  - Returns final messages/rendered payload for LLM execution

- `src/agent/loop/llm-phase.ts`
  - Owns post-response compaction timing
  - Runs immediate compaction after no-tool threshold crossings
  - Defers tool-call threshold crossings until tool results have been ingested

- `src/memory/working-context-snapshot.ts`
  - Append/reset/build message list per compaction epoch

- `src/memory/working-context-snapshot-serializer.ts`
  - Serializes snapshot payloads with schema `4`
  - Validates current-schema-only cache payloads

- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
  - Uses valid cached snapshots when present
  - Rebuilds stale or missing caches through natural recovery projection plus
    compacted-memory snapshot rebuild

- `src/memory/restore/working-context-recovery-projector.ts`
  - Converts recent raw traces into natural recovery messages only for bootstrap
    fallback

### Storage

- `src/memory/store/base-store.ts`
  - Store interface (`add`, `list`, `listRawTracesOrdered`, `pruneRawTracesById`)

- `src/memory/store/file-store.ts`
  - Default JSONL-backed persistence
  - Owns raw-trace archive + prune-by-trace-id helpers

### Compaction

- `src/memory/compaction/pending-compaction-executor.ts`
  - Compaction sequencing and runtime status reporting

- `src/memory/compaction/working-context-message-window-planner.ts`
  - Deterministic message-unit planning from provider-facing working-context
    messages

- `src/memory/compaction/working-context-message-unit-builder.ts`
  - Builds normal/system/compacted-memory/tool-protocol units

- `src/memory/compaction/message-budget-strategy.ts`
  - Estimates unit costs and splits compacted-vs-retained budgets

- `src/memory/compaction/working-context-compactor.ts`
  - Summarizes compactable message units, stores outputs, and archives
    provenance-linked raw traces

- `src/memory/compaction/compactor.ts`
  - Compatibility subclass that keeps the legacy `compact(plan)` path while
    supporting working-context compaction

- `src/memory/compaction/agent-compaction-summarizer.ts`
  - Builds a compaction task, delegates to the configured compactor-agent runner,
    and parses the returned JSON output

- `src/memory/compaction/compaction-agent-runner.ts`
  - Defines the boundary between memory compaction and server/runtime-specific
    visible compactor-agent execution

- `src/memory/compaction/working-context-compaction-prompt-builder.ts`
  - Builds the JSON-only compactor-agent context-summary task prompt from
    compactable working-context message units

- `src/memory/compaction/compaction-task-prompt-builder.ts`
  - Retained legacy block prompt builder for raw-trace block compatibility

- `src/memory/compaction/compaction-response-parser.ts`
  - Parses and validates summarizer output

- `src/memory/policies/compaction-policy.ts`
  - Trigger ratio, rendered line cap, and safety margin defaults

### Server Runtime Adapter / Default Agent Setup

- `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts`
  - Syncs registry-defined internal built-in agent definitions into the
    configured agents directory, overwrites their `agent.md` and
    `agent-config.json` from bundled templates, leaves non-built-in local agents
    and package roots untouched, refreshes the definition cache, and initializes
    the compactor setting only when it is blank and the definition resolves
    successfully.

- `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/`
  - Product-managed built-in compactor template. `agent-config.json`
    intentionally keeps `defaultLaunchConfig: null`; by default it inherits
    runtime/model from the running parent agent, while operators can still
    configure explicit runtime/model overrides by selecting a separate
    user/package-managed compactor definition through the normal agent editor and
    `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.

- `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts`
  - Resolves `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` to the selected normal
    `AgentDefinition.defaultLaunchConfig`, applies selected explicit
    runtime/model values over the parent fallback context, and fails actionably
    when a selected definition is missing or a required runtime/model field is
    absent from both sources.

- `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts`
  - Creates the visible normal compactor run, posts one task, collects output,
    records run activity, and terminates the run without adding compaction
    branches to backend bootstrap/session/thread internals.

- `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts`
  - Normalizes backend run events into the final text output consumed by the
    core compaction response parser.

### Retrieval / Snapshot

- `src/memory/retrieval/memory-bundle.ts`
  - Container for episodic + semantic

- `src/memory/retrieval/retriever.ts`
  - Loads bundle for snapshot rebuilding

- `src/memory/compaction-snapshot-builder.ts`
  - Builds a natural system + compacted-memory snapshot baseline for
    compatibility/bootstrap paths; it never renders raw trace text into the LLM
    prompt.

- `src/memory/compaction/working-context-snapshot-rebuilder.ts`
  - Builds the live runtime snapshot from system head, compacted memory, and
    retained working-context messages.

- `src/memory/tool-interaction-builder.ts`
  - Derives tool interaction views from `RAW_TRACE`

### Ingest Processors

- `src/agent/input-processor/memory-ingest-input-processor.ts`
  - Captures processed user input
  - Persists legacy `tool_continuation` boundaries for TOOL-origin continuation cycles

- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - Captures tool results as `RAW_TRACE` entries when that pipeline path is used

## 17. Data Flow Summary (Memory-Centric)

```
UserMessageReceivedEvent
  └─► AgentTurnRunner / AgentInputPipeline
        └─► Input processors
        └─► MemoryIngestInputProcessor (order 900)
              └─► MemoryManager.ingestUserMessage(...)
        └─► LLMUserMessageReadyEvent

AgentTurnRunner / LlmPhase
  ├─► request = LLMRequestAssembler.prepareRequest(...) or prepareToolContinuationRequest(...)
  │     ├─► PendingCompactionExecutor.executeIfRequired(...)
  │     │     ├─► WorkingContextMessageWindowPlanner.plan(getWorkingContextMessages())
  │     │     ├─► Compactor.compactWorkingContext(plan)
  │     │     │     ├─► Summarizer.summarizeMessageUnits(plan.compactableUnits)
  │     │     │     └─► MemoryStore.pruneRawTracesById(plan.rawTraceIdsToArchive)
  │     │     └─► WorkingContextSnapshotRebuilder.rebuild(...)
  │     ├─► append user message only for normal user input
  │     └─► Prompt Renderer.render(messages)
  ├─► LLM.streamMessages(request.messages, request.renderedPayload)
  ├─► MemoryManager.ingestAssistantToolResponse(...) when tool calls are parsed
  ├─► MemoryManager.ingestAssistantResponse(...) when no tool calls are parsed
  ├─► evaluateLlmPhaseCompaction(...)
  └─► immediate no-tool compaction if threshold crossed

ToolPhase / ToolResultContinuationBuilder
  └─► validate active batch/invocation/turn identity
  └─► MemoryManager.ingestToolResults(...)
  └─► ToolContinuationReadyEvent with tool-history-only metadata
        └─► AgentTurnRunner / LlmPhase
              └─► LLMRequestAssembler.prepareToolContinuationRequest(...)
                    └─► pending compaction executes before provider dispatch

WorkingContextSnapshotBootstrapper
  ├─► use cache only if schema `4` validates
  └─► otherwise rebuild through WorkingContextRecoveryProjector +
      WorkingContextSnapshotRebuilder

Memory Store (file-backed)
  ├─► RAW_TRACE (ordered traces + tool_continuation boundaries)
  ├─► RAW_TRACE archive (eligible provenance trace IDs pruned out of active file)
  ├─► EPISODIC (summaries)
  └─► SEMANTIC (facts/preferences/decisions)
```

## 18. Core Interfaces (Method Signatures)

### MemoryManager

```
startTurn(): string
ingestUserMessage(llmUserMessage, turnId: string, sourceEvent): void
ingestToolContinuationBoundary(turnId: string, sourceEvent: string, content?): void
ensureWorkingContextSystemMessage(content: string, options?): boolean
appendWorkingContextUserMessage(message: Message, options?): void
appendWorkingContextAssistantMessage(message: Message, turnId: string, options?): void
ingestToolIntent(toolInvocation, turnId?: string, options?): void
ingestToolIntents(toolInvocations, turnId?: string, options?): void
ingestAssistantToolResponse(completeResponse, toolInvocations, turnId: string, sourceEvent): void
ingestToolResult(toolResultEvent, turnId?: string): void
ingestToolResults(toolResultEvents, turnId?: string, options?): void
ingestAssistantResponse(completeResponse, turnId: string, sourceEvent, options?): void
requestCompaction(requestedTurnId?: string | null): CompactionOperationId
clearCompactionRequest(): void
requirePendingCompactionRequest(): PendingCompactionRequest
listRawTracesOrdered(limit?: number): RawTraceItem[]
pruneRawTracesById(traceIds: Iterable<string>, archive?: boolean): void
getWorkingContextMessages(): Message[]
resetWorkingContextSnapshot(snapshotMessages: Iterable<Message>, lastCompactionTs?: number | null): void
getToolInteractions(turnId?: string): ToolInteraction[]
```

### LLMRequestAssembler

```
prepareRequest(processedUserInput, currentTurnId?: string | null, systemPrompt?: string | null): Promise<RequestPackage>
prepareToolContinuationRequest(currentTurnId?: string | null, systemPrompt?: string | null): Promise<RequestPackage>
renderPayload(messages: Message[]): Promise<ProviderPayload>
```

### PendingCompactionExecutor

```
executeIfRequired({ turnId?: string | null, systemPrompt: string, inputBudgetTokens?: number | null }): Promise<boolean>
```

### WorkingContextMessageWindowPlanner

```
plan({ messages: Message[], inputBudgetTokens?: number | null, minRecentNaturalUnits?: number }): MessageCompactionPlan
```

### WorkingContextCompactor / Compactor

```
compactWorkingContext(plan: MessageCompactionPlan): Promise<WorkingContextCompactionExecutionOutcome | null>
compact(plan: CompactionPlan): Promise<CompactionExecutionOutcome | null> // legacy raw-trace block path
```

### Summarizer

```
summarize(blocks: InteractionBlock[]): Promise<CompactionResult>
summarizeMessageUnits(units: WorkingContextMessageUnit[]): Promise<CompactionResult>
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

The Compaction Snapshot is used at the **compaction boundary** to reset the
Working Context Snapshot. Runtime compaction assembles it from provider-facing
messages, not from raw trace text.

### Ordering

1. System prompt / existing system head message
2. Natural compacted-memory message built from the retrieved EPISODIC + SEMANTIC
   bundle, when non-empty
3. Retained recent/protected working-context messages selected by the planner

### Limits (defaults)

- Retain a recent natural suffix; default minimum is four recent natural units
  when possible.
- Protect a trailing tool protocol group so native provider continuation remains
  valid.
- `max_episodic_items = 3`
- `max_semantic_items = 20`
- `max_item_chars = 2000` (via `CompactionPolicy.maxItemChars`) for compactor
  task transcript and recovery projection line clamps

### Formatting (recommended, deterministic)

Compacted memory is rendered as a natural message, for example:

```
Here is the relevant compacted memory for this agent:

Recent progress:
1. ...
2. ...

Important facts and preferences:
- ...
```

Retained user/assistant/tool messages stay as structured `Message` objects and
are rendered only by the provider prompt renderer.

### Token Budget

- Compaction is triggered by provider-reported `prompt_tokens` **after** a response.
- A no-tool threshold crossing compacts immediately after the assistant response
  is appended.
- A tool-call threshold crossing compacts after tool results are ingested and
  before the same-turn continuation request is rendered.
- The compacted portion is chosen by working-context message units and budget,
  not by a fixed raw-tail-turn count.

## 20. Turn ID Assignment

Turns are created when a processed non-tool user message is ready.

**Where to generate**

- Create a `TurnTracker` (or store on `MemoryManager`)
- Persist current `turn_id` in `AgentRuntimeState` for tool linking

**Strategy**

- `turn_id = turn_<counter:04d>` per agent
- Increment when `LLMUserMessageReadyEvent` fires
- Tool continuation keeps the current `turn_id`; it does not create a new turn
  and instead writes a `tool_continuation` boundary trace for compaction
  planning. Native `api_tool_call` continuation uses `ToolContinuationReadyEvent`
  without provider-visible aggregate user input; legacy text-parser continuation
  uses `SenderType.TOOL` aggregate input.

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
  "salience": 300
}
```

### COMPACTED MEMORY MANIFEST (compacted_memory_manifest.json)

```
{
  "schema_version": 3,
  "last_reset_ts": 1738100501123
}
```

---

## 22. Design Decisions (Locked Defaults)

These decisions are required to keep data flow consistent and avoid ambiguity:

1. **Turn ID propagation**
   - `turn_id` is assigned by `AgentRuntimeState.startActiveTurn()` at outer turn start.
   - It is stored on `ToolInvocation` metadata and propagated to `ToolResultEvent`.

2. **Assistant response ingestion point**
   - Ingest assistant output directly in `LlmPhase` / `AgentTurnRunner`.
   - Do not rely on optional LLM response processors.

3. **Raw trace pruning strategy**
   - Use atomic file rewrite (write new JSONL → replace old file).
   - Avoid tombstones in the active raw file.

4. **Token budget source**
   - Add `max_context_tokens` to `LLMModel` metadata.
   - Use provider-reported `prompt_tokens` (post-response) to trigger compaction.
