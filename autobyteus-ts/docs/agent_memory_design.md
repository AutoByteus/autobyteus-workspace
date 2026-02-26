# Autobyteus Agent Memory Design

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

## 2. Current State (Node.js/TypeScript)

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
- **build_snapshot(system_prompt, bundle, raw_tail)**: produce a Compaction Snapshot message list
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

- `id`, `ts`, `fact`, `tags`, `confidence`, `salience`

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
raw-trace archive helpers (`list_raw_trace_dicts`, `read_archive_raw_traces`,
`prune_raw_traces`) used by compaction.

### 7.1 File-Backed Store Layout (Default)

Memory is persisted per agent as append-only JSONL files for convenience and
inspection:

**Base directory selection**

- Default: `<cwd>/memory`
- Override via `AUTOBYTEUS_MEMORY_DIR`

```
memory/
  agents/
    <agent_id>/
      raw_traces.jsonl
      raw_traces_archive.jsonl  # append-only archive (optional)
      episodic.jsonl
      semantic.jsonl
```

---

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
3. Short RAW_TRACE tail (last few turns)

After compaction, the working context snapshot is reset to this snapshot, then new turns
append again.

### Prompt Renderer (provider adaptation)
LLMs consume provider-specific payloads, so the generic working context snapshot is rendered
by a **Prompt Renderer** per provider (OpenAI, Anthropic, etc.). This keeps the
memory layer canonical and makes LLMs stateless executors.

**Note (Node.js today):** system prompts are configured on the LLM instance
during bootstrap. In memory-centric mode, the system prompt can be injected
directly into the working context snapshot to make the LLM fully stateless.

---

## 10. Compaction and Token Budget

Compaction is triggered by **token pressure** using **exact post-response usage**
and configured per model.

**Inputs**

- `max_context_tokens` (model-level, token-based)
- `max_output_tokens` (LLM config)
- `safety_margin` (configurable)
- `compaction_ratio` (model default, overrideable)

**Implementation note:** context size is token-based and should live on `LLMModel`
(`max_context_tokens`). `LLMConfig.token_limit` is only a temporary placeholder
until the model registry carries explicit context size.
**Current default (temporary):** when model metadata is missing, we use
`max_context_tokens=200000` to keep the system unblocked until per-model
values are set.

**Budget**

- `input_budget = max_context_tokens - max_output_tokens - safety_margin`

**Trigger (post-response)**

- If the **last response** reports `prompt_tokens > input_budget`, mark
  compaction required and rebuild the working context snapshot **before the next call**
  via Compaction Snapshot.
- Early trigger: `prompt_tokens > compaction_ratio * input_budget`

Compaction policy:

- Keep last 4-6 raw turns
- Summarize older RAW_TRACE into EPISODIC
- Extract SEMANTIC facts from EPISODIC

---

## 10.1 Compaction Pipeline (Primary Priority)

Compaction is the **first priority** of the memory system because it keeps the
Working Context Snapshot bounded and useful.

### Trigger Conditions

- **Token pressure**: last LLM response reports prompt tokens exceeding input budget

### Compaction Outputs

Compaction produces **structured memory artifacts** and a new working context snapshot base:

1. **EPISODIC summary** (compressed narrative of older RAW_TRACE)
2. **SEMANTIC facts** (stable preferences/decisions/constraints)
3. **RAW_TRACE tail** preserved (last N turns)
4. **Pruned RAW_TRACE** (oldest traces removed)
5. **Compaction Snapshot** (new base for the Working Context Snapshot)

### Compaction Flow (LLM-driven)

1. Select compaction window (oldest RAW_TRACE beyond tail).
2. Call summarizer with the selected traces.
3. Store EPISODIC summary + SEMANTIC facts from the result.
4. Prune RAW_TRACE outside tail.

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
- `turn_id`: stable ID for the turn (see Turn Aggregation)
- `seq`: integer ordering within the turn
- `trace_type`: enum (`user`, `assistant`, `tool_call`, `tool_result`)
- `content`: text payload (may be empty for tool events)
- `source_event`: originating event name

**Optional fields**

- `media`: `{ "images": [...], "audio": [...], "video": [...] }`
- `tool_name`
- `tool_args`
- `tool_result`
- `tool_error`
- `correlation_id`
- `tags`

**Example: user trace**

```
{"id":"rt_001","ts":1738100000.12,"turn_id":"turn_0001","seq":1,"trace_type":"user","content":"Please refactor the parser.","source_event":"LLMUserMessageReadyEvent","media":{"images":[],"audio":[],"video":[]},"tags":["processed"]}
```

**Example: tool call intent**

```
{"id":"rt_002","ts":1738100002.45,"turn_id":"turn_0001","seq":2,"trace_type":"tool_call","content":"","source_event":"PendingToolInvocationEvent","tool_name":"list_directory","tool_args":{"path":"src"}}
```

**Example: tool result**

```
{"id":"rt_003","ts":1738100003.11,"turn_id":"turn_0001","seq":3,"trace_type":"tool_result","content":"","source_event":"ToolResultEvent","tool_name":"list_directory","tool_result":["app.ts","parser.ts"]}
```

**Example: assistant response**

```
{"id":"rt_004","ts":1738100005.90,"turn_id":"turn_0001","seq":4,"trace_type":"assistant","content":"I will refactor the parser next.","source_event":"LLMCompleteResponseReceivedEvent","tags":["final"]}
```

---

### Turn Aggregation (Compaction Unit)

Raw traces are stored line-by-line, but **compaction groups them by turn**.
This makes summaries easier and more faithful to the interaction flow.

**Turn definition (simple)**

- One **user message = one turn**.
- A turn starts at `LLMUserMessageReadyEvent`.
- A turn ends when the **next** `LLMUserMessageReadyEvent` arrives.

**Turn ID assignment**

- `turn_id` is generated at the start of each turn.
- All trace entries produced from that user input (tool call intents, tool
  results, assistant response) share the same `turn_id`.

**Tool linkage (important)**

- Tool invocations store the `turn_id` at creation time.
- Tool results inherit the `turn_id` from the invocation, even if they arrive
  after the next user message.

**Compaction behavior**

- Compaction consumes **whole turns** (all trace entries with the same
  `turn_id`) rather than splitting a turn across summaries.
- The raw tail is defined in **turns** (e.g., keep the last 4 turns).
- The **current turn** is excluded from the raw tail to avoid duplicating the
  user's active input in the snapshot.

---

### Accumulation-to-Compaction Flow (Diagram)

```
UserMessageReceivedEvent
   │
   ▼
UserInputMessageEventHandler
   │   (input processors run here)
   └─► MemoryIngestInputProcessor (order 900)
   │
   ▼
LLMUserMessageReadyEvent
   │
   ▼
LLMUserMessageReadyEventHandler
   │
   ├─► LLM.streamMessages(Working Context Snapshot)
   │
   ├─► PendingToolInvocationEvent
   │      └─► ToolInvocationRequestEventHandler
   │
   └─► MemoryManager.ingest_assistant_response(...)

ToolResultEvent
   └─► ToolResultEventHandler
         └─► MemoryIngestToolResultProcessor (order 900)

MemoryManager
   ├─► Accumulation (RAW_TRACE)
   └─► Compaction (EPISODIC + SEMANTIC + prune)
```

---

## 10.2 Proposed Code Structure (Compaction-Focused)

```
src/memory/
├── index.ts
├── models/
│   ├── memory-types.ts
│   ├── raw-trace-item.ts
│   ├── episodic-item.ts
│   ├── semantic-item.ts
│   └── tool-interaction.ts
├── store/
│   ├── base-store.ts             # MemoryStore interface
│   ├── file-store.ts             # Default file-backed store (JSONL)
├── working-context-snapshot.ts          # Generic, append-only messages per epoch
├── compaction-snapshot-builder.ts# Builds compact working context snapshot baseline
├── compaction/
│   ├── compaction-result.ts
│   ├── compactor.ts              # orchestration of compaction flow
│   └── summarizer.ts             # LLM-based summarization interface
├── policies/
│   └── compaction-policy.ts      # thresholds + tail sizes
├── retrieval/
│   ├── memory-bundle.ts
│   └── retriever.ts              # bundle creation
├── tool-interaction-builder.ts
├── turn-tracker.ts
└── memory-manager.ts             # event-driven entry point

src/agent/
├── llm-request-assembler.ts      # NEW: memory + renderer + token budget orchestration
```

### Responsibility Map

- **MemoryManager**: receives events, manages Working Context Snapshot, and flags compaction.
- **Compactor**: runs compaction flow, writes EPISODIC/SEMANTIC items, prunes RAW_TRACE.
- **Summarizer**: produces episodic summary + semantic facts from raw traces.
- **Retriever**: loads episodic/semantic items into a MemoryBundle.
- **CompactionSnapshotBuilder**: formats the snapshot baseline messages.
- **ToolInteractionBuilder**: derives tool interaction views from raw traces.
- **CompactionPolicy**: defines trigger ratio and raw tail size.


---

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
- What should be the default salience scoring policy?
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
    request_compaction()
```

**Suggested early trigger**

```
if prompt_tokens > 0.8 * input_budget:
    request_compaction()
```

### Where the trigger lives

- **LLMUserMessageReadyEventHandler** (post-response):
  1. Receives `TokenUsage` from the provider (exact prompt tokens)
  2. Evaluates the compaction policy
  3. Sets `MemoryManager.compaction_required = True`

- **LLMRequestAssembler.prepare_request(...)** (pre-next-call):
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
              └─► MemoryManager.ingest_user_message(...)
                    └─► LLMUserMessageReadyEventHandler
                          ├─► LLMRequestAssembler.prepare_request(processed_user)
                          ├─► LLM.streamMessages(messages, rendered_payload)
                          └─► MemoryManager.ingest_assistant_response(...)
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
  - `src/llm/api/claude-llm.ts`
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
  - later: `claude-renderer.ts`, `gemini-renderer.ts`
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
- When all tools complete, append a short **user continuation** message
  (e.g., “All tools finished. Continue.”) to trigger the next turn.

**Agent integration**

- `LLMUserMessageReadyEventHandler` calls
  `LLMRequestAssembler.prepare_request(...)` and passes messages to LLM.

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
- The next turn is triggered by a short user continuation message.

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
  └─► LLMRequestAssembler.prepare_request(...)
        at src/agent/llm-request-assembler.ts
        ├─► WorkingContextSnapshot.build_messages()
        │     at src/memory/working-context-snapshot.ts
        ├─► PromptRenderer.render(...)
        │     at src/llm/prompt-renderers/openai-responses-renderer.ts
        └─► (no compaction)
  └─► LLM.streamMessages(messages, tools?)
        at src/llm/base.ts
        └─► Provider call
              at src/llm/api/openai-responses-llm.ts
  └─► MemoryManager.ingest_assistant_response(...)
        at src/memory/memory-manager.ts
        └─► WorkingContextSnapshot.append_assistant(...)
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
  └─► LLMRequestAssembler.prepare_request(...)
        at src/agent/llm-request-assembler.ts
  └─► LLM.streamMessages(messages, tools)
        at src/llm/base.ts
        └─► Streaming parser detects tool call(s)
              at src/agent/streaming/*
              └─► MemoryManager.ingest_tool_intent(...)
                    at src/memory/memory-manager.ts
                    └─► WorkingContextSnapshot.append_tool_calls(...)
                          at src/memory/working-context-snapshot.ts
              └─► PendingToolInvocationEvent
                    at src/agent/events/agent-events.ts
                    └─► ToolInvocationRequestEventHandler.handle(...)
                          at src/agent/handlers/tool-invocation-request-event-handler.ts
                          └─► ToolResultEvent
                                at src/agent/events/agent-events.ts
                                └─► MemoryIngestToolResultProcessor.process(...)
                                      at src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts
                                      └─► MemoryManager.ingest_tool_result(...)
                                            at src/memory/memory-manager.ts
                                            └─► WorkingContextSnapshot.append_tool_result(...)
                                                  at src/memory/working-context-snapshot.ts
                                └─► ToolResultEventHandler.handle(...)
                                      at src/agent/handlers/tool-result-event-handler.ts
                                      └─► enqueue UserMessageReceivedEvent
                                            (continuation: "All tools finished. Continue.")
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
  └─► LLMRequestAssembler.prepare_request(...)
        at src/agent/llm-request-assembler.ts
        ├─► Compactor.compact(...)
        │     at src/memory/compaction/compactor.ts
        │     └─► Summarizer.summarize(...)
        │           at src/memory/compaction/summarizer.ts
        ├─► CompactionSnapshotBuilder.build(...)
        │     at src/memory/compaction-snapshot-builder.ts
        ├─► WorkingContextSnapshot.reset(snapshot)
        │     at src/memory/working-context-snapshot.ts
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
  - Ingests traces and manages the Working Context Snapshot
  - Flags compaction requests

- `src/agent/llm-request-assembler.ts`
  - Combines Memory + Prompt Renderer + Token Budget
  - Applies compaction defaults using model budgets
  - Returns final messages/payload for LLM execution

- `src/agent/token-budget.ts`
  - Resolves model/config token budgets
  - Applies compaction defaults to the policy

- `src/memory/models/*`
  - `memory-types.ts`, `raw-trace-item.ts`, `episodic-item.ts`, `semantic-item.ts`, `tool-interaction.ts`

- `src/memory/working-context-snapshot.ts`
  - Append/reset/build message list per compaction epoch

- `src/memory/turn-tracker.ts`
  - Generates `turn_id` per user input

- `src/memory/compaction-snapshot-builder.ts`
  - Builds the Compaction Snapshot from bundle + raw tail

- `src/memory/tool-interaction-builder.ts`
  - Derives tool interaction views from RAW_TRACE

### Storage

- `src/memory/store/base-store.ts`
  - Store interface (`add`, `list`)

- `src/memory/store/file-store.ts`
  - Default JSONL-backed persistence
  - Supports raw trace archive + pruning helpers

### Compaction

- `src/memory/compaction/compactor.ts`
  - Selects window, calls summarizer, stores outputs

- `src/memory/compaction/compaction-result.ts`
  - Data model for summarizer output

- `src/memory/compaction/summarizer.ts`
  - Summarizer interface (returns episodic + semantic)

- `src/memory/policies/compaction-policy.ts`
  - Thresholds, tail sizes, trigger ratios

### Retrieval

- `src/memory/retrieval/memory-bundle.ts`
  - Container for episodic + semantic

- `src/memory/retrieval/retriever.ts`
  - Loads bundle for snapshot building

### Token Usage (post-response)

- `src/llm/token-counter/*`
  - Provider-specific token counters (tracking/analytics)
  - Compaction decisions use provider usage when available

### Prompt Rendering (LLM)

- `src/llm/prompt-renderers/*`
  - Renders generic messages into provider-specific payloads

### Ingest Processors

- `src/agent/input-processor/memory-ingest-input-processor.ts`
  - Captures processed user input and assigns `turn_id`

- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - Captures tool results as RAW_TRACE entries

---

## 17. Data Flow Summary (Memory-Centric)

```
UserMessageReceivedEvent
  └─► UserInputMessageEventHandler
        └─► Input processors
        └─► MemoryIngestInputProcessor (order 900)
              └─► MemoryManager.ingest_user_message(...)
        └─► LLMUserMessageReadyEvent

LLMUserMessageReadyEventHandler
  ├─► request = LLMRequestAssembler.prepare_request(processed_user_input)
  │     ├─► Prompt Renderer (provider payload)
  │     └─► Compaction check (token budget)
  │           └─► Compactor.compact(...)
  │                 └─► Summarizer
  ├─► LLM.streamMessages(request.messages, rendered_payload)
  ├─► Parse tool invocations
  │     ├─► MemoryManager.ingest_tool_intent(...)
  │     └─► PendingToolInvocationEvent
  └─► MemoryManager.ingest_assistant_response(...)

ToolResultEventHandler
  └─► Tool result processors
        └─► MemoryIngestToolResultProcessor (order 900)
              └─► MemoryManager.ingest(tool_result)

Memory Store (file-backed)
  ├─► RAW_TRACE (short tail)
  ├─► EPISODIC (summaries)
  └─► SEMANTIC (facts/preferences/decisions)
```

---

## 18. Core Interfaces (Method Signatures)

### MemoryManager

```
startTurn(): string
ingestUserMessage(llmUserMessage, turnId, sourceEvent): void
ingestToolIntent(toolInvocation, turnId?: string): void
ingestToolResult(toolResultEvent, turnId?: string): void
ingestAssistantResponse(completeResponse, turnId, sourceEvent): void
requestCompaction(): void
clearCompactionRequest(): void
getRawTail(tailTurns: number, excludeTurnId?: string): RawTraceItem[]
getWorkingContextMessages(): Message[]
resetWorkingContextSnapshot(snapshotMessages: Message[]): void
getToolInteractions(turnId?: string): ToolInteraction[]
```

### LLMRequestAssembler

```
prepareRequest(processedUserInput, currentTurnId?: string, systemPrompt?: string): RequestPackage
renderPayload(messages: Message[]): ProviderPayload
```

### Compactor

```
compact(turnIds: string[]): CompactionResult
selectCompactionWindow(): string[]
getTracesForTurns(turnIds: string[]): RawTraceItem[]
```

### Summarizer

```
summarize(turns: RawTraceItem[]): CompactionResult
```

### Retriever

```
retrieve(maxEpisodic: number, maxSemantic: number): MemoryBundle
```

---

## 19. Compaction Snapshot Assembly Rules

The Compaction Snapshot is used only at the **compaction boundary** to reset
the Working Context Snapshot.

### Ordering

1. System prompt
2. Memory bundle (episodic + semantic)
3. Raw tail (last N turns)

### Limits (defaults)

- `raw_tail_turns = 4`
- `max_episodic_items = 3`
- `max_semantic_items = 20`

### Formatting (recommended, deterministic)

```
[MEMORY:EPISODIC]
1) ...
2) ...

[MEMORY:SEMANTIC]
- ...
- ...

[RECENT TURNS]
Turn 12:
  User: ...
  Assistant: ...
  Tool call: ...
  Tool result: ...
```

### Token Budget

- Compaction is triggered by provider-reported `prompt_tokens` **after** a response.
- When compaction is requested, the next request rebuilds the snapshot before calling the LLM.

---

## 20. Turn ID Assignment

Turns are created when a processed user message is ready.

**Where to generate**

- Create a `TurnTracker` (or store on `MemoryManager`)
- Persist current `turn_id` in `AgentRuntimeState` for tool linking

**Strategy**

- `turn_id = turn_<counter:04d>` per agent
- Increment when `LLMUserMessageReadyEvent` fires

**Linking tool events**

- Tool call intents and tool results inherit the **turn_id** stored on the
  `ToolInvocation`.
- Even if tool results arrive after the next user message, they keep the
  original `turn_id`.

---

## 21. JSONL Schemas (EPISODIC / SEMANTIC)

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
  "fact": "Use vitest with pnpm exec vitest --run.",
  "tags": ["preference","testing"],
  "confidence": 0.8,
  "salience": 0.9
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
