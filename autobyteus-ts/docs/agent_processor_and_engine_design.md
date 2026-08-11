# Autobyteus Agent Framework: Engine, Tools, and Processor Design

**Date:** 2025-12-29
**Status:** Living Document

## 1. Introduction

The **Autobyteus Agent Framework** is built on a highly modular, event-driven architecture designed to support complex, stateful agents. At its core, the framework separates the **Engine** (execution runtime) from the **Processors** (logic units) and **Tools** (capabilities). This separation allows for granular control over the agent's lifecycle, from input processing to tool execution and response generation.

This document details the design and implementation of these three pillars.
For the current single-agent turn runner and interrupt model, see
[Agent Runtime Loop and Native Interrupt](agent_runtime_loop_and_interrupt.md).

---

## 2. Core Engine Architecture

The engine provides the runtime environment for agents. It is strictly **event-driven**, ensuring that all actions—whether internal state changes or external side effects—are the result of discrete events processing.

### 2.1. Event-Driven Runtime

Each agent runs within its own isolated environment, characterized by:

- **Serialized Agent Loop (Actor Mailbox)**: Each agent (and AgentTeam/Workflow) runs a serialized async loop with a mailbox, preserving ordering guarantees without per-agent OS threads.
- **Shared Node.js Event Loop**: Agent loops execute on the shared Node.js event loop. `worker_threads` are optional for CPU-bound workloads or hard isolation.
- **Status Management**: The engine maintains a state machine (e.g., `IDLE`, `PROCESSING`, `AWAITING_INPUT`). Status updates are derived from events and emitted by the `StatusManager`.

### 2.2. Event Processing Pipeline

The flow of execution follows a standard pipeline:

1.  **Submission**: Events (e.g., `UserMessageReceivedEvent`) are submitted to the runtime safely from any async context (or worker thread if used).
2.  **Queueing**: External events are routed to specific input queues based on their type (e.g., user messages, inter-agent messages, approvals, internal signals). Tool results stay inside the active `AgentTurnRunner`/`ToolPhase` path rather than re-entering the worker as independent user-flow events.
3.  **Turn scheduling**: `AgentWorker` starts one `AgentTurn` for an external
    user/inter-agent trigger and delegates the finite LLM/tool loop to
    `AgentTurnRunner`.
4.  **Phase execution**: The runner invokes typed pipelines and phase services
    (`AgentInputPipeline`, `LlmPhase`, `ToolPhase`,
    `ToolResultPipeline`, `LLMResponsePipeline`) rather than routing normal
    LLM/tool/continuation control through legacy handlers.

---

## 3. Processor Architecture

Processors are the "functional units" of the agent. They intercept data at specific points in the lifecycle to modify state, transform content, or trigger side effects.

### 3.1. The Processor Pattern

All processors share a common architectural pattern:

- **Base Classes**: Each type has an abstract base class (e.g., `BaseLLMResponseProcessor`) defining its contract.
- **Explicit Registration**: Processors are registered through registries (e.g., `registerSystemPromptProcessors()`), keeping ordering deterministic in Node.js/TypeScript.
- **Configuration (`ProcessorOption`)**: Processors are enabled/disabled via `ProcessorOption` objects, which define their name and whether they are `mandatory`.
- **Ordering**: Processors of the same type run in a specific sequence defined by their `get_order()` method.

### 3.2. Types of Processors

#### A. Input Processors (`src/agent/input-processor`)

- **Role**: Intercept and modify the `AgentInputUserMessage` before it is converted into a prompt for the LLM.
- **Use Cases**:
  - Content sanitization or PII redaction.
  - Appending context or instructions dynamically.
  - Expanding macros or shortcuts in user input.

#### B. System Prompt Processors (`src/agent/system-prompt-processor`)

- **Role**: Dynamically construct or modify non-tool system-prompt content sent
  to the LLM. The built-in `AvailableSkillsProcessor` is one current example.
- **Tool boundary**: System prompt processors must not encode tool definitions,
  invocation examples, or a model-authored tool syntax. `LlmPhase` sends tools
  only through provider-native request schemas.
- **Execution Timing (Important)**: System prompt processors run **once during bootstrapping** in `SystemPromptProcessingStep`. They are **not** invoked before every LLM call.

#### C. LLM Response Processors (`src/agent/llm-response-processor`)

- **Role**: Optional post-processing of the `CompleteResponse` received from the LLM.
- **Tool Note**: Provider adapters normalize structured tool deltas during
  `LlmPhase` streaming. `LlmStreamingResponseHandler` creates
  invocations from those native deltas. LLM response processors do not parse
  assistant text into tools.

#### D. Tool Invocation Preprocessors (`src/agent/tool-invocation-preprocessor`)

- **Role**: Intercept a `ToolInvocation` _after_ the LLM has requested it but _before_ it is executed.
- **Use Cases**:
  - **Validation**: Checking if arguments match the schema or constraints.
  - **Approval**: Pausing execution to ask for human confirmation (Human-in-the-loop).
  - **Rewriting**: modifying arguments on the fly (e.g., resolving relative paths).

#### E. Tool Execution Result Processors (`src/agent/tool-execution-result-processor`)

- **Role**: Process the output returned by a tool.
- **Use Cases**:
  - **Formatting**: converting raw JSON or large text into a summary for the LLM.
  - **Artifact Extraction**: Saving images or files generated by the tool to a separate storage and replacing them with a link in the conversation history.

---

## 4. Tooling Subsystem

The tooling subsystem bridges provider-native structured calls and actual code
execution. Assistant text is output only and is never an invocation transport.

### 4.1. Definition and Registry

- **`ToolDefinition`**: The canonical source of truth for a tool, containing its name, description, and schema (arguments structure).
- **`ToolRegistry`**: Stores all available definitions.

### 4.2. Provider-Native Schemas

`ToolSchemaProvider` converts registered definitions to the provider's native
request schema. Anthropic and Gemini have dedicated native schema formatters;
the other supported tool-capable paths use the OpenAI-compatible function-tool
envelope. `LlmPhase` builds these schemas only when tools exist, attaches them
to the provider request, and configures one `LlmStreamingResponseHandler` with
the matching explicit tool-call gate. A no-tool turn builds and sends no schema.

The runtime does not inject a tool manifest or usage examples into the system
prompt. Providers without a normalized native tool channel remain ordinary
content/media providers rather than receiving a text fallback.

### 4.3. Native Streaming and Invocation

Provider adapters normalize native SDK events into `ToolCallDelta` records.
`LlmStreamingResponseHandler` tracks parallel calls when its tool-call gate is
enabled, emits normalized
`SegmentEvent`s, and creates each `ToolInvocation` from the final accumulated
native argument JSON. Assistant text, including XML/JSON/sentinel or
`[TOOL_CALL]`-looking content, remains a text segment and creates no invocation.

`write_file` and `edit_file` additionally project decoded file content into
specialized live segments. That projection is presentation-only; final native
JSON remains the execution authority.

## 5. Integration Flow: A Life of a Request

1.  **User Input**: User sends "List files in src".
2.  **Engine**: Enqueues `UserMessageReceivedEvent`.
3.  **Input Processor**: Runs (no changes).
4.  **System Prompt Processor (Bootstrap)**: Non-tool prompt processors run once.
5.  **LLM Call**: `LlmPhase` uses `ToolSchemaProvider` to build the native schema
    for `list_directory`, supplies it through the provider `tools` field, and
    enables native deltas on the unified stream handler.
6.  **LLM Response**: The provider emits a structured native call with
    `list_directory` and `{ "path": "src" }` arguments.
7.  **Native Handler**: Provider deltas are normalized; the handler closes the
    visible tool segment and publishes one `ToolInvocation`. `AgentTurnRunner`
    applies pending-invocation status projections before `ToolPhase` executes it.
8.  **Preprocessor**: Checks if `list_directory` is allowed (e.g., within sandbox).
9.  **Execution**: Tool runs, returns list of files.
10. **Result Processor**: Formats the file list.
11. **Context Update**: After the processed batch is complete,
    `AgentTurnRunner` calls `MemoryManager.ingestToolResults(...)` once in native
    call order.
12. **Continuation**: `ToolContinuationInputBuilder` builds a semantic/context
    carrier. `AgentInputPipeline` returns `llmUserMessage: null` when no media
    carrier is required; otherwise it returns the required user/media message.
13. **Loop**: `LlmPhase` uses the same `LLMRequestAssembler.prepareRequest(...)`
    path for either value and generates the final answer or another native call.

---

## 6. Lifecycle Events vs. Pipeline Processors (Clarifying the Boundaries)

Autobyteus exposes **two** extensibility mechanisms that often occur near the same moments:

- **Pipeline processors** (Input, System Prompt, LLM Response, Tool Pre/Post, Tool Result) are invoked by **the owning turn phases, pipelines, or lifecycle handlers**.
- **Lifecycle processors** (`src/agent/lifecycle/`) are invoked by **status transitions** inside `AgentStatusManager`.

### Lifecycle Event Enum (`src/agent/lifecycle/events.ts`)

The `LifecycleEvent` enum defines user-facing hook points:

| Lifecycle Event       | Triggered When                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| `AGENT_READY`         | After bootstrap completes, agent enters `IDLE`                              |
| `BEFORE_LLM_CALL`     | Status transitions to `AWAITING_LLM_RESPONSE`                               |
| `AFTER_LLM_RESPONSE`  | Status transitions from `AWAITING_LLM_RESPONSE` to `ANALYZING_LLM_RESPONSE` |
| `BEFORE_TOOL_EXECUTE` | Status transitions to `EXECUTING_TOOL`                                      |
| `AFTER_TOOL_EXECUTE`  | Status transitions from `EXECUTING_TOOL`                                    |
| `AGENT_SHUTTING_DOWN` | Status transitions to `SHUTTING_DOWN`                                       |

### Ordering Summary (Implemented Behavior)

1. System prompt processors run **once at bootstrap** (not before each LLM call).
2. `BEFORE_LLM_CALL` lifecycle processors run when entering `AWAITING_LLM_RESPONSE`, before the LLM request is sent.
3. `AFTER_LLM_RESPONSE` lifecycle processors run when entering `ANALYZING_LLM_RESPONSE`, before LLM response processors run.
4. `BEFORE_TOOL_EXECUTE` lifecycle processors run before `ToolPhase` invokes tools.
5. `AFTER_TOOL_EXECUTE` lifecycle processors run before tool result processors run.

### Key Module Locations

- **Lifecycle processors**: `src/agent/lifecycle/`
- **Status derivation**: `src/agent/status/status-deriver.ts`
- **Lifecycle execution**: `src/agent/status/manager.ts`
